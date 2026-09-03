import { TafsirEdition, VerseTafsir } from "@/app/types/tafsir";
import { TafsirProvider, TafsirProviderError } from "@/app/lib/tafsir/provider";
import { normalizeVerseKey } from "@/app/utils/tafsir-formatter";
import { getTafsirEdition } from "@/app/constants/tafsir";
import { readCachedVerseTafsir } from "@/app/lib/tafsir/offline-cache";

const QDC_BASE_URL = "https://api.qurancdn.com/api/qdc";

// Whole-surah download URL (ADR 0060). `per_page=300` > 286 (the largest surah),
// so every response is a single page — no pagination loop.
export function byChapterTafsirUrl(tafsirId: number, chapter: number): string {
  return `${QDC_BASE_URL}/tafsirs/${tafsirId}/by_chapter/${chapter}?per_page=300`;
}

const isAbortError = (err: unknown): boolean =>
  (err as Error | undefined)?.name === "AbortError";

// Offline, `fetch` can still hang (a lying `navigator.onLine`, a captive
// portal): race it against a short timeout so the cached blob is consulted
// promptly. The timeout does NOT abort the fetch — it just stops waiting — so a
// timed-out request is never re-surfaced as a cancellation.
const OFFLINE_FETCH_TIMEOUT_MS = 2000;
const TIMED_OUT = Symbol("timed-out");

interface QdcTafsirItem {
  resource_id: number;
  resource_name?: string | null;
  language_id?: number;
  slug?: string;
  translated_name?: { name: string; language_name: string } | null;
  text?: string | null;
}

interface QdcTafsirResponse {
  tafsir?: QdcTafsirItem | null;
}

interface QdcResourceTafsir {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name?: { name: string; language_name: string } | null;
}

interface QdcResourcesResponse {
  tafsirs?: QdcResourceTafsir[];
}

const RTL_LANGUAGES = new Set(["arabic", "urdu", "persian", "kurdish", "hebrew", "ar", "ur", "fa"]);

async function getTafsir(
  tafsirId: number,
  verseKey: string,
  signal?: AbortSignal,
): Promise<VerseTafsir | null> {
  const normalizedKey = normalizeVerseKey(verseKey);
  if (!normalizedKey) {
    throw new TafsirProviderError(`Invalid verse key: "${verseKey}"`, 400);
  }

  const url = `${QDC_BASE_URL}/tafsirs/${tafsirId}/by_ayah/${normalizedKey}`;

  // Read a downloaded edition's cached surah blob for this verse.
  // - VerseTafsir / null → return it (null = "no commentary for this verse", the
  //   existing empty state, NOT an error).
  // - undefined → blob absent: rethrow `original` so the UI shows its retry state;
  //   the Offline Tafsir sheet's open-time validation then heals the registry.
  const fallback = async (original: unknown): Promise<VerseTafsir | null> => {
    const cached = await readCachedVerseTafsir(tafsirId, normalizedKey);
    if (cached === undefined) throw original;
    return cached;
  };

  // Only race the timeout when the browser reports itself offline. Online — even
  // with a downloaded edition — a normal fetch runs to completion so live
  // commentary always wins over the (possibly stale) blob; the `NetworkOnly` SW
  // rule already spares it defaultCache's 10s cross-origin timeout (ADR 0060).
  const raceTimeout = typeof navigator !== "undefined" && navigator.onLine === false;

  let res: Response;
  try {
    const attempt = fetch(url, { signal });
    const outcome = raceTimeout
      ? await Promise.race([
          attempt,
          new Promise<typeof TIMED_OUT>((resolve) =>
            setTimeout(() => resolve(TIMED_OUT), OFFLINE_FETCH_TIMEOUT_MS),
          ),
        ])
      : await attempt;
    if (outcome === TIMED_OUT) {
      // Let the real fetch settle unobserved; serve from cache now.
      void attempt.catch(() => {});
      return fallback(
        new TafsirProviderError(
          `Tafsir fetch for ${normalizedKey} (edition ${tafsirId}) timed out offline`,
          0,
        ),
      );
    }
    res = outcome;
  } catch (err) {
    if (isAbortError(err)) throw err; // real cancellation — never a cache read
    return fallback(err);
  }

  if (res.status === 404) {
    return null;
  }

  // QDC returns 503 (not 404) for a verse with no commentary record, and any
  // transient 5xx on a flaky link would otherwise fail a fully-downloaded
  // edition (ADR 0060).
  if (res.status >= 500) {
    return fallback(
      new TafsirProviderError(
        `Failed to fetch tafsir for ${normalizedKey} (edition ${tafsirId}): ${res.status}`,
        res.status,
      ),
    );
  }

  if (!res.ok) {
    throw new TafsirProviderError(
      `Failed to fetch tafsir for ${normalizedKey} (edition ${tafsirId}): ${res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as QdcTafsirResponse;
  if (!data?.tafsir) {
    return null;
  }

  const resId = data.tafsir.resource_id ?? tafsirId;
  const knownEdition = getTafsirEdition(resId);

  return {
    tafsirId: resId,
    verseKey: normalizedKey,
    resourceName: data.tafsir.resource_name ?? knownEdition?.name ?? data.tafsir.translated_name?.name ?? "",
    text: data.tafsir.text ?? "",
    languageName: knownEdition?.languageName ?? data.tafsir.translated_name?.language_name,
  };
}

async function getEditions(language = "ar", signal?: AbortSignal): Promise<TafsirEdition[]> {
  const url = `${QDC_BASE_URL}/resources/tafsirs?language=${encodeURIComponent(language)}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new TafsirProviderError(
      `Failed to fetch tafsir editions: ${res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as QdcResourcesResponse;
  const tafsirs = data.tafsirs ?? [];

  return tafsirs.map((t) => {
    const langLower = t.language_name.toLowerCase();
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      authorName: t.author_name,
      languageName: t.language_name,
      translatedName: t.translated_name?.name ?? t.name,
      direction: RTL_LANGUAGES.has(langLower) ? "rtl" : "ltr",
    };
  });
}

export const qdcTafsirProvider: TafsirProvider = {
  getTafsir,
  getEditions,
};
