import { useQuery } from "@tanstack/react-query";
import { SearchPage, SurahResult, VerseResult } from "../types";
import { isSearchQueryValid } from "../constants/search";
import { normalizeArabicQuery, normalizeDigits } from "../utils/arabic-search";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
import { fetchVersePages, VersePages } from "@hooks/use-verse-pages";

const EMPTY_VERSES: SearchPage<VerseResult> = { results: [], total: 0 };
const EMPTY_CHAPTERS: SearchPage<SurahResult> = { results: [], total: 0 };

// One row of public/quran/search-index.json — MUST stay in sync with
// scripts/quran-search-index/generate.js (see ADR 0062).
export type SearchIndexRow = { k: string; t: string; d: string; c: number };

const isSearchIndex = (value: unknown): value is SearchIndexRow[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (r) =>
      typeof r.k === "string" &&
      typeof r.t === "string" &&
      typeof r.d === "string" &&
      typeof r.c === "number",
  );

// Module-level promise caches: the index (~2.2 MB raw) and chapters load once per
// session, on search intent only — never on layout mount (ADR 0049). Served from the
// SW precache when offline, so these fetches succeed with no connection.
let indexPromise: Promise<SearchIndexRow[]> | null = null;
const loadSearchIndex = (): Promise<SearchIndexRow[]> => {
  if (!indexPromise) {
    indexPromise = fetch("/quran/search-index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`search-index ${r.status}`))))
      .then((parsed: unknown) => {
        if (!isSearchIndex(parsed)) {
          throw new Error("search-index.json shape mismatch — regenerate with npm run generate:quran-search-index.");
        }
        return parsed;
      })
      .catch(() => {
        // Index absent (never precached) — drop the memo so a later online
        // session retries, and resolve empty so the UI shows no-results, never a throw.
        indexPromise = null;
        return [] as SearchIndexRow[];
      });
  }
  return indexPromise;
};

let chaptersPromise: Promise<SurahResult[]> | null = null;
const loadChaptersJson = (): Promise<SurahResult[]> => {
  if (!chaptersPromise) {
    chaptersPromise = fetch("/quran/chapters.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`chapters ${r.status}`))))
      .catch(() => {
        chaptersPromise = null;
        return [] as SurahResult[];
      });
  }
  return chaptersPromise;
};

export const isSearchOffline = () =>
  typeof navigator !== "undefined" && !navigator.onLine;

const isOffline = isSearchOffline;

export const searchVersesOnline = async (
  query: string,
  take: number,
  skip: number,
): Promise<SearchPage<VerseResult> | null> => {
  if (isOffline()) return null;
  try {
    const response = await fetch(
      `/api/search/verses?q=${encodeURIComponent(query)}&take=${take}&skip=${skip}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.data as SearchPage<VerseResult>;
  } catch {
    // Network rejection (offline mid-typing, captive portal) → local index below.
    return null;
  }
};

export type OfflineVerseMatches = {
  rows: SearchIndexRow[];
  total: number;
  names: Map<number, SurahResult>;
  versePages: VersePages;
};

// Memoized per normalized query + edition: the full-results page walks these
// matches chunk by chunk, and re-filtering all 6,236 rows per chunk would
// repeat the same scan on every scroll step. The overlay's single-shot call
// below reuses the same memo — identical results, no behavior change.
const offlineMatchesCache = new Map<string, Promise<OfflineVerseMatches>>();

export const getOfflineVerseMatches = (
  query: string,
  mushafId: number,
): Promise<OfflineVerseMatches> => {
  const key = `${mushafId}:${normalizeArabicQuery(query)}`;
  let cached = offlineMatchesCache.get(key);
  if (!cached) {
    cached = (async (): Promise<OfflineVerseMatches> => {
      const [index, chapters, versePages] = await Promise.all([
        loadSearchIndex(),
        loadChaptersJson(),
        // Active edition's map (ADR 0033) — SW-cached, resolves offline. The
        // index carries no page number by design, so links always land on the
        // right page for the edition being read.
        fetchVersePages(mushafId).catch((): VersePages => ({})),
      ]);
      const normalized = normalizeArabicQuery(query);
      const rows = index.filter((row) => row.t.includes(normalized));
      return {
        rows,
        total: rows.length,
        names: new Map(chapters.map((c) => [c.id, c])),
        versePages,
      };
    })();
    offlineMatchesCache.set(key, cached);
    // Bounded LRU: a long-lived tab issues many distinct queries; without a
    // cap this memo grows for the session lifetime. Map preserves insertion
    // order, so the first key is the oldest.
    if (offlineMatchesCache.size > 20) {
      const oldest = offlineMatchesCache.keys().next();
      if (!oldest.done) offlineMatchesCache.delete(oldest.value);
    }
  }
  return cached;
};

export const searchVersesOffline = async (
  query: string,
  take: number,
  skip: number,
  mushafId: number,
): Promise<SearchPage<VerseResult>> => {
  const { rows, total, names, versePages } = await getOfflineVerseMatches(
    query,
    mushafId,
  );
  const results = rows.slice(skip, skip + take).map((row) => ({
    verse_key: row.k,
    text_imlaei_simple: row.t,
    display_uthmani: row.d,
    page_number: versePages[row.k] ?? 1,
    chapter: {
      name_arabic: names.get(row.c)?.name_arabic ?? "",
      name_simple: names.get(row.c)?.name_simple ?? "",
    },
    Word: [],
  }));
  return { results, total };
};

export const searchChaptersOnline = async (query: string): Promise<SearchPage<SurahResult> | null> => {
  if (isOffline()) return null;
  try {
    const response = await fetch(`/api/search/chapters?q=${encodeURIComponent(query)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data as SearchPage<SurahResult>;
  } catch {
    return null;
  }
};

export const searchChaptersOffline = async (query: string): Promise<SearchPage<SurahResult>> => {
  // Mirrors the API route's matching (strict contains + numeric-id) over the
  // precached chapters.json. name_simple is Latin, so its compare folds case to
  // match the DB's case-insensitive collation; name_arabic stays strict.
  const trimmed = query.trim();
  const normalized = normalizeDigits(trimmed);
  const numericId = /^\d+$/.test(normalized) ? parseInt(normalized, 10) : null;
  const isIdInRange = numericId !== null && numericId >= 1 && numericId <= 114;
  const lowered = trimmed.toLowerCase();
  const chapters = await loadChaptersJson();
  const filtered = chapters.filter(
    (c) =>
      (isIdInRange && c.id === numericId) ||
      c.name_arabic.includes(trimmed) ||
      c.name_simple.toLowerCase().includes(lowered),
  );
  return { results: filtered.slice(0, 10), total: filtered.length };
};

export const useSearch = (query: string, take = 10, skip = 0) => {
  const { mushafId } = useQuranMushaf();

  const verses = useQuery({
    queryKey: ["search-verses", query, take, skip],
    queryFn: async (): Promise<SearchPage<VerseResult>> => {
      if (!query.trim()) return EMPTY_VERSES;
      return (
        (await searchVersesOnline(query, take, skip)) ??
        searchVersesOffline(query, take, skip, mushafId)
      );
    },
    enabled: isSearchQueryValid(query),
    // Default networkMode ("online") pauses queries while navigator.onLine is
    // false — new queries would sit pending forever and only previously-fetched
    // keys would show cached data. Same rationale as useVersePages: the offline
    // fallback reads SW-cached immutable JSON, so run even while offline.
    networkMode: "always",
  });

  const chapters = useSearchChapters(query);

  return {
    verses,
    chapters,
    isLoading: verses.isLoading || chapters.isLoading,
  };
};

// Chapters-only query for the full-results page, which pages verses
// separately via useSearchInfiniteVerses. Same fetchers and gates as the
// chapters half of useSearch above — extracted, not forked.
export const useSearchChapters = (query: string) =>
  useQuery({
    queryKey: ["search-chapters", query],
    queryFn: async (): Promise<SearchPage<SurahResult>> => {
      if (!query.trim()) return EMPTY_CHAPTERS;
      return (await searchChaptersOnline(query)) ?? searchChaptersOffline(query);
    },
    enabled: isSearchQueryValid(query),
    // The chapters fallback reads precached JSON — run even while offline.
    networkMode: "always",
  });
