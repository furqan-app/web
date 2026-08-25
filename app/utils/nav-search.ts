import { SurahResult } from "@types";
import { normalizeArabicQuery } from "@utils/arabic-search";

export const NAV_SEARCH = {
  surahCount: 114,
  juzCount: 30,
  lastPage: 604,
} as const;

// Eastern Arabic (U+0660–U+0669) and Extended Arabic-Indic (U+06F0–U+06F9)
// digits fold to ASCII so "٥" and "5" are the same query.
export const foldDigits = (s: string): string =>
  s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const code = d.charCodeAt(0);
    return String(code <= 0x0669 ? code - 0x0660 : code - 0x06f0);
  });

export type ParsedNavQuery = {
  // Folded, trimmed query — the text-matching subject.
  text: string;
  // Numeric value when the query is a bare number or a valid "juz/page <n>".
  number: number | null;
  prefix: "juz" | "page" | null;
};

const BARE_NUMBER = /^\d+$/;
const JUZ_PREFIX = /^(?:juz|جزء)\s*(\d+)$/i;
const PAGE_PREFIX = /^(?:page|صفحة)\s*(\d+)$/i;

export const parseNavQuery = (raw: string): ParsedNavQuery => {
  const text = foldDigits(raw.trim());
  if (!text) return { text, number: null, prefix: null };

  const juz = JUZ_PREFIX.exec(text);
  if (juz) return { text, number: parseInt(juz[1], 10), prefix: "juz" };
  const page = PAGE_PREFIX.exec(text);
  if (page) return { text, number: parseInt(page[1], 10), prefix: "page" };
  if (BARE_NUMBER.test(text)) {
    return { text, number: parseInt(text, 10), prefix: null };
  }
  return { text, number: null, prefix: null };
};

// Chapter names are NOT hamza-free (DECISIONS.md / ADR 0007), so unlike verse
// search the fold applies to BOTH sides at compare time. Client-side only —
// this deliberately diverges from the overlay's strict chapter `contains`.
const fold = (s: string): string => normalizeArabicQuery(s.toLowerCase());

const matchName = (name: string, foldedQuery: string): boolean =>
  fold(name).includes(fold(foldedQuery));

export const surahMatchesQuery = (surah: SurahResult, parsed: ParsedNavQuery): boolean => {
  if (parsed.prefix) return false;
  if (parsed.number !== null) return surah.id === parsed.number;
  return matchName(surah.name_arabic, parsed.text) || matchName(surah.name_simple, parsed.text);
};

export type NavJumpRow = { kind: "juz" | "page"; n: number };

// Bare digits surface every intent they could mean; prefixed queries surface
// exactly their own row. Out-of-range yields no row — callers show a hint.
export const jumpRows = (parsed: ParsedNavQuery): NavJumpRow[] => {
  if (parsed.number === null) return [];
  if (parsed.prefix === "juz") {
    return parsed.number >= 1 && parsed.number <= NAV_SEARCH.juzCount
      ? [{ kind: "juz", n: parsed.number }]
      : [];
  }
  if (parsed.prefix === "page") {
    return parsed.number >= 1 && parsed.number <= NAV_SEARCH.lastPage
      ? [{ kind: "page", n: parsed.number }]
      : [];
  }
  const rows: NavJumpRow[] = [];
  if (parsed.number >= 1 && parsed.number <= NAV_SEARCH.juzCount) rows.push({ kind: "juz", n: parsed.number });
  if (parsed.number >= 1 && parsed.number <= NAV_SEARCH.lastPage) rows.push({ kind: "page", n: parsed.number });
  return rows;
};

// Non-null only for an out-of-range prefixed query ("page 999") — rendered as
// an inline hint instead of a row.
export const rangeHint = (parsed: ParsedNavQuery): "juz" | "page" | null => {
  if (parsed.number === null || !parsed.prefix) return null;
  const max = parsed.prefix === "juz" ? NAV_SEARCH.juzCount : NAV_SEARCH.lastPage;
  return parsed.number >= 1 && parsed.number <= max ? null : parsed.prefix;
};

// The page a juz starts on: default-edition value until the active edition's
// verse-pages map loads (ADR 0033).
export const juzStartPage = (
  juzStarts: { juz: number; defaultPage: number }[] | undefined,
  n: number,
): number | null => juzStarts?.find((j) => j.juz === n)?.defaultPage ?? null;

export const pageOfVerseKey = (
  versePages: Record<string, number> | undefined,
  verseKey: string | undefined,
  fallback: number | null,
): number | null => (verseKey ? versePages?.[verseKey] ?? fallback : fallback);
