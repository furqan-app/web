import { VerseTafsir } from "@/app/types/tafsir";
import { getTafsirEdition } from "@/app/constants/tafsir";
import { ensureCachedBytes } from "@/app/lib/offline/ensure-cached-bytes";
import {
  TAFSIR_DOWNLOAD_CACHE_NAME,
  TAFSIR_TOTAL_CHAPTERS,
  tafsirChapterCachePrefix,
  tafsirChapterCacheUrl,
} from "@/app/constants/offline";

/**
 * The only module that touches the `tafsir-download-v{N}` Cache (ADR 0060) —
 * write, list, delete, and single-verse read. Each surah's raw
 * `by_chapter?per_page=300` response is kept under a synthetic same-origin key;
 * `qdcTafsirProvider.getTafsir` reads a verse back out when the network path
 * fails. No service worker involved. `{ ignoreVary: true }` on every match so a
 * QDC `Vary` header can never turn a stored blob into a phantom miss.
 */

interface QdcByChapterRecord {
  verse_key: string;
  text?: string | null;
}
interface QdcByChapterBody {
  tafsirs?: QdcByChapterRecord[];
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(TAFSIR_DOWNLOAD_CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Fetch (via `fetcher`) and store one surah unless it is already cached,
 * returning its stored byte size. Skips the network on a resume.
 */
export async function cacheChapterBytes(
  editionId: number,
  chapter: number,
  fetcher: (url: string) => Promise<Response>,
): Promise<number> {
  const cache = await openCache();
  if (!cache) throw new Error("Cache Storage unavailable");
  return ensureCachedBytes(cache, tafsirChapterCacheUrl(editionId, chapter), {
    ignoreVary: true,
    fetcher,
  });
}

/** The chapter numbers (1–114) currently cached for an edition. */
export async function listCachedChapters(editionId: number): Promise<number[]> {
  const cache = await openCache();
  if (!cache) return [];
  const prefix = tafsirChapterCachePrefix(editionId);
  const found: number[] = [];
  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith(prefix)) continue;
    const n = Number(pathname.slice(prefix.length));
    if (Number.isInteger(n) && n >= 1 && n <= TAFSIR_TOTAL_CHAPTERS) found.push(n);
  }
  return found;
}

/** Remove every cached surah for an edition. */
export async function deleteCachedEdition(editionId: number): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  const prefix = tafsirChapterCachePrefix(editionId);
  const stale = (await cache.keys()).filter((request) =>
    new URL(request.url).pathname.startsWith(prefix),
  );
  await Promise.all(stale.map((request) => cache.delete(request)));
}

/**
 * Read one verse's commentary from a downloaded edition.
 * - `VerseTafsir` — found.
 * - `null` — the surah blob is present but has no record for this verse (some
 *   editions omit uncommented verses; this is the empty state, not an error).
 * - `undefined` — the surah blob is absent (caller should rethrow its original
 *   network error; the sheet-open validation will then heal the registry).
 */
export async function readCachedVerseTafsir(
  editionId: number,
  normalizedKey: string,
): Promise<VerseTafsir | null | undefined> {
  const cache = await openCache();
  if (!cache) return undefined;

  const chapter = Number(normalizedKey.split(":")[0]);
  if (!Number.isInteger(chapter)) return undefined;

  const cached = await cache.match(tafsirChapterCacheUrl(editionId, chapter), {
    ignoreVary: true,
  });
  if (!cached) return undefined;

  let body: QdcByChapterBody;
  try {
    body = (await cached.json()) as QdcByChapterBody;
  } catch {
    return undefined;
  }

  const hit = body.tafsirs?.find((record) => record.verse_key === normalizedKey);
  if (!hit) return null;

  const edition = getTafsirEdition(editionId);
  return {
    tafsirId: editionId,
    verseKey: normalizedKey,
    resourceName: edition?.name ?? "",
    text: hit.text ?? "",
    languageName: edition?.languageName,
  };
}
