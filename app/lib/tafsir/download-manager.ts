import { TafsirEdition, TafsirDownloadItem } from "@/app/types/tafsir";
import { storage } from "@/app/utils/storage";
import { byChapterTafsirUrl } from "@/app/lib/tafsir/qdc-provider";
import {
  cacheChapterBytes,
  deleteCachedEdition,
  listCachedChapters,
} from "@/app/lib/tafsir/offline-cache";
import { TAFSIR_TOTAL_CHAPTERS } from "@/app/constants/offline";

/**
 * Module-singleton lifecycle for Offline Tafsir downloads (ADR 0060). It lives
 * outside React so an in-flight 114-surah download stays visible — and cannot be
 * double-started — after the Settings sheet (and its hooks) unmount and remount.
 * Both `useTafsirDownload` and `useTafsirDownloads` render from the one snapshot
 * here; there is no same-tab custom event because the singleton *is* the
 * coordination point. A `storage` listener (first subscriber only) picks up a
 * download or delete done in another tab.
 */

export type TafsirDownloadState =
  | "idle"
  | "downloading"
  | "downloaded"
  | "failed"
  | "quota-exceeded";

export interface TafsirDownloadSnapshot {
  downloads: TafsirDownloadItem[];
  /** Fully-cached edition ids (registry entry + live 114-chapter count). */
  verifiedIds: number[];
  editionStates: Record<number, TafsirDownloadState>;
  editionProgress: Record<number, number>;
}

const CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [400, 1500]; // between the 3 attempts

const runtimeState = new Map<number, TafsirDownloadState>();
const runtimeProgress = new Map<number, number>();
const verified = new Set<number>();

const listeners = new Set<() => void>();
let snapshot: TafsirDownloadSnapshot = emptySnapshot();

function emptySnapshot(): TafsirDownloadSnapshot {
  return { downloads: [], verifiedIds: [], editionStates: {}, editionProgress: {} };
}

const readRegistry = (): TafsirDownloadItem[] =>
  storage.get("tafsirDownloads") ?? [];

function rebuild() {
  snapshot = {
    downloads: readRegistry(),
    verifiedIds: Array.from(verified),
    editionStates: Object.fromEntries(runtimeState),
    editionProgress: Object.fromEntries(runtimeProgress),
  };
  listeners.forEach((listener) => listener());
}

function writeRegistry(items: TafsirDownloadItem[]) {
  storage.set("tafsirDownloads", items);
  rebuild();
}

const isQuotaError = (err: unknown): boolean =>
  err instanceof DOMException
    ? err.name === "QuotaExceededError"
    : (err as Error | undefined)?.name === "QuotaExceededError";

const isAbortError = (err: unknown): boolean =>
  (err as Error | undefined)?.name === "AbortError";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One surah's `by_chapter` response, retried against QDC's bursty rate limits. */
async function fetchChapterWithRetry(
  editionId: number,
  chapter: number,
  signal: AbortSignal,
): Promise<Response> {
  const url = byChapterTafsirUrl(editionId, chapter);
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return res;
      lastError = new Error(`by_chapter ${editionId}/${chapter}: HTTP ${res.status}`);
      await res.body?.cancel();
    } catch (err) {
      if (isAbortError(err)) throw err;
      lastError = err;
    }
    if (attempt < MAX_ATTEMPTS - 1) await sleep(RETRY_BACKOFF_MS[attempt]);
  }
  throw lastError;
}

/**
 * Recheck each downloaded edition's cache against a live 114-chapter count and
 * drop any that iOS has evicted under it. Runs on the first subscribe, on a
 * cross-tab `storage` change, and on demand from the sheet.
 */
export async function verifyAndHeal(): Promise<void> {
  const registry = readRegistry();
  verified.clear();
  if (registry.length === 0) {
    rebuild();
    return;
  }

  const checks = await Promise.all(
    registry.map(async (item) => ({
      id: item.editionId,
      ok:
        (await listCachedChapters(item.editionId)).length === TAFSIR_TOTAL_CHAPTERS,
    })),
  );

  const stale: number[] = [];
  for (const { id, ok } of checks) {
    if (ok) {
      verified.add(id);
    } else if (runtimeState.get(id) !== "downloading") {
      stale.push(id);
      runtimeState.set(id, "failed");
    }
  }

  if (stale.length > 0) {
    writeRegistry(registry.filter((item) => !stale.includes(item.editionId)));
  } else {
    rebuild();
  }
}

export async function downloadEdition(edition: TafsirEdition): Promise<void> {
  if (runtimeState.get(edition.id) === "downloading") return; // no double-start

  const controller = new AbortController();
  const chapters = Array.from({ length: TAFSIR_TOTAL_CHAPTERS }, (_, i) => i + 1);
  let cursor = 0;
  let done = 0;
  let totalBytes = 0;
  let firstError: unknown;

  runtimeState.set(edition.id, "downloading");
  runtimeProgress.set(edition.id, 0);
  rebuild();

  const worker = async () => {
    try {
      while (cursor < chapters.length) {
        if (controller.signal.aborted) return; // a sibling failed — stop quietly
        const chapter = chapters[cursor++];
        totalBytes += await cacheChapterBytes(edition.id, chapter, () =>
          fetchChapterWithRetry(edition.id, chapter, controller.signal),
        );
        done += 1;
        runtimeProgress.set(edition.id, done);
        rebuild();
      }
    } catch (err) {
      if (!isAbortError(err)) {
        firstError ??= err;
        controller.abort(); // stop the other workers
      }
      throw err;
    }
  };

  try {
    await Promise.allSettled(Array.from({ length: CONCURRENCY }, worker));
    if (firstError) throw firstError;

    const present = await listCachedChapters(edition.id);
    if (present.length !== TAFSIR_TOTAL_CHAPTERS) {
      throw new Error(`incomplete: ${present.length}/${TAFSIR_TOTAL_CHAPTERS}`);
    }

    verified.add(edition.id);
    writeRegistry([
      ...readRegistry().filter((item) => item.editionId !== edition.id),
      {
        editionId: edition.id,
        editionName: edition.name,
        sizeBytes: totalBytes,
        downloadedAt: Date.now(),
      },
    ]);
    runtimeState.set(edition.id, "downloaded");
  } catch (err) {
    runtimeState.set(edition.id, isQuotaError(err) ? "quota-exceeded" : "failed");
  } finally {
    runtimeProgress.delete(edition.id);
    rebuild();
  }
}

export async function deleteEdition(editionId: number): Promise<void> {
  await deleteCachedEdition(editionId);
  verified.delete(editionId);
  runtimeState.delete(editionId);
  runtimeProgress.delete(editionId);
  writeRegistry(readRegistry().filter((item) => item.editionId !== editionId));
}

const onStorageChange = () => {
  void verifyAndHeal();
};

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorageChange);
    }
    void verifyAndHeal();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageChange);
    }
  };
}

export function getSnapshot(): TafsirDownloadSnapshot {
  return snapshot;
}

const SERVER_SNAPSHOT = emptySnapshot();
export function getServerSnapshot(): TafsirDownloadSnapshot {
  return SERVER_SNAPSHOT;
}
