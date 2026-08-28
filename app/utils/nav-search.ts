import { SurahResult } from "@types";
import { RubWithVerses } from "@/app/types/prisma";
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

export type NavPrefix = "juz" | "page" | "hizb" | "rub";

export type ParsedNavQuery = {
  // Folded, trimmed query — the text-matching subject.
  text: string;
  // Numeric value when the query is a bare number or a valid "juz/page <n>".
  number: number | null;
  prefix: NavPrefix | null;
  // Non-null when query is just a prefix keyword ("جزء", "الجزء", "page", "صفحة") without a number.
  barePrefix: "juz" | "page" | null;
};

const BARE_NUMBER = /^\d+$/;
const JUZ_PREFIX = /^(?:al-?juz|juz|الجزء|جزء)\s*(\d+)$/i;
const PAGE_PREFIX = /^(?:page|p|الصفحة|صفحة)\s*(\d+)$/i;
const HIZB_PREFIX = /^(?:hizb|حزب)\s*(\d+)$/i;
const RUB_PREFIX = /^(?:rub|ربع)\s*(\d+)$/i;
const SURAH_PREFIX = /^(?:surah|سورة|السورة)\s*(.+)$/i;
const BARE_JUZ = /^(?:al-?juz|juz|الجزء|جزء)$/i;
const BARE_PAGE = /^(?:page|p|الصفحة|صفحة)$/i;

export const parseNavQuery = (raw: string): ParsedNavQuery => {
  const text = foldDigits(raw.trim());
  if (!text) return { text, number: null, prefix: null, barePrefix: null };

  const juz = JUZ_PREFIX.exec(text);
  if (juz) return { text, number: parseInt(juz[1], 10), prefix: "juz", barePrefix: null };

  const page = PAGE_PREFIX.exec(text);
  if (page) return { text, number: parseInt(page[1], 10), prefix: "page", barePrefix: null };

  const hizb = HIZB_PREFIX.exec(text);
  if (hizb) return { text, number: parseInt(hizb[1], 10), prefix: "hizb", barePrefix: null };

  const rub = RUB_PREFIX.exec(text);
  if (rub) return { text, number: parseInt(rub[1], 10), prefix: "rub", barePrefix: null };

  if (BARE_JUZ.test(text)) {
    return { text, number: null, prefix: null, barePrefix: "juz" };
  }

  if (BARE_PAGE.test(text)) {
    return { text, number: null, prefix: null, barePrefix: "page" };
  }

  const surahMatch = SURAH_PREFIX.exec(text);
  if (surahMatch) {
    const stripped = surahMatch[1].trim();
    if (BARE_NUMBER.test(stripped)) {
      return { text: stripped, number: parseInt(stripped, 10), prefix: null, barePrefix: null };
    }
    return { text: stripped, number: null, prefix: null, barePrefix: null };
  }

  if (BARE_NUMBER.test(text)) {
    return { text, number: parseInt(text, 10), prefix: null, barePrefix: null };
  }
  return { text, number: null, prefix: null, barePrefix: null };
};

// Chapter names are NOT hamza-free (DECISIONS.md / ADR 0007), so unlike verse
// search the fold applies to BOTH sides at compare time. Client-side only —
// this deliberately diverges from the overlay's strict chapter `contains`.
const fold = (s: string): string => normalizeArabicQuery(s.toLowerCase());

// Name matching shared by the surah grid and the rubs filter (a rub "belongs
// to" the surah its first verse starts in).
export const matchesSurahName = (surah: SurahResult, text: string): boolean =>
  fold(surah.name_arabic).includes(fold(text)) || fold(surah.name_simple).includes(fold(text));

export const surahMatchesQuery = (surah: SurahResult, parsed: ParsedNavQuery): boolean => {
  if (parsed.prefix || parsed.barePrefix) return false;
  if (parsed.number !== null) return surah.id === parsed.number;
  return matchesSurahName(surah, parsed.text);
};

// Rubs tab of the sidebar (#362). Numeric matching is division arithmetic
// (240 rubs, 8/juz, 4/hizb); text matching goes through the associated surah.
export const rubMatchesQuery = (
  rub: RubWithVerses,
  parsed: ParsedNavQuery,
  surahsById: Map<number, SurahResult>,
): boolean => {
  if (parsed.number !== null) {
    const juz = parsed.prefix === null || parsed.prefix === "juz";
    const hizb = parsed.prefix === null || parsed.prefix === "hizb";
    const rubs = parsed.prefix === null || parsed.prefix === "rub";
    if (parsed.prefix === "page") return false;
    return (
      (juz && Math.ceil(rub.rub_number / 8) === parsed.number) ||
      (hizb && Math.ceil(rub.rub_number / 4) === parsed.number) ||
      (rubs && rub.rub_number === parsed.number)
    );
  }
  if (parsed.prefix) return false;
  const chapter = rub.rubVerseMappings[0]?.chapter_number;
  const surah = chapter !== undefined ? surahsById.get(chapter) : undefined;
  return surah ? matchesSurahName(surah, parsed.text) : false;
};

export type NavJumpRow = { kind: "juz" | "page"; n: number };

// Bare digits surface every intent they could mean; prefixed queries surface
// exactly their own row. Out-of-range yields no row — callers show a hint.
// hizb/rub prefixes are sidebar-only (#362) and produce no home jump rows.
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
  if (parsed.prefix) return [];
  const rows: NavJumpRow[] = [];
  if (parsed.number >= 1 && parsed.number <= NAV_SEARCH.juzCount) rows.push({ kind: "juz", n: parsed.number });
  if (parsed.number >= 1 && parsed.number <= NAV_SEARCH.lastPage) rows.push({ kind: "page", n: parsed.number });
  return rows;
};

// Non-null only for an out-of-range prefixed query ("page 999") — rendered as
// an inline hint instead of a row. Home-only: juz/page are the two intents the
// home surface knows about.
export const rangeHint = (parsed: ParsedNavQuery): "juz" | "page" | null => {
  if (parsed.number === null || (parsed.prefix !== "juz" && parsed.prefix !== "page")) return null;
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

// Ayah-picker input (#433): a whole number in ASCII or Arabic-Indic digits.
// Null for anything else — callers show the valid range and skip the jump.
export const parseAyahNumber = (raw: string): number | null => {
  const text = foldDigits(raw.trim());
  if (!/^\d+$/.test(text)) return null;
  return parseInt(text, 10);
};
