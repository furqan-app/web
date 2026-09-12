/**
 * Pure client-side estimate helper mirroring engine.ts rules for display-only
 * pace and deadline preview lines in custom wird forms (#610, ADR 0067).
 *
 * All estimates are strictly DISPLAY-ONLY and never persisted to the server.
 */

import type { SurahResult } from "@/app/types";
import juzStarts from "@/public/quran/juz-starts.json";

export type CustomWirdFormMode = "mushaf" | "surah" | "juz" | "page" | "verse";
export type CustomCadenceType = "pace" | "deadline";

export type EstimateResult = {
  type: "days" | "pace";
  numericValue: number;
  estimatedDays?: number;
  unit: "page" | "verse";
  textKey: string;
};

/**
 * Static page offsets for each of the 30 juz (mushaf page bounds).
 * Derived from canonical public/quran/juz-starts.json.
 */
export const JUZ_START_PAGES: Record<number, number> = Object.fromEntries(
  juzStarts.map((entry) => [entry.juz, entry.defaultPage])
);

/**
 * Inclusive calendar day count between two "YYYY-MM-DD" dates, matching engine.ts.
 */
export const dayCountInclusive = (from: string, to: string): number => {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.floor(ms / 86_400_000) + 1;
};

/**
 * Computes 1-based global verse ordinal (1..6236) from surah (1..114) and ayah.
 */
export const calculateVerseOrdinal = (
  surah: number,
  ayah: number,
  chapters: SurahResult[]
): number => {
  let count = 0;
  for (let s = 1; s < surah && s <= chapters.length; s++) {
    count += chapters[s - 1]?.verses_count ?? 0;
  }
  return count + ayah;
};

/**
 * Converts a 1-based global verse ordinal (1..6236) back to { surah, ayah }.
 */
export const verseOrdinalToSurahAyah = (
  ordinal: number,
  chapters: SurahResult[]
): { surah: number; ayah: number } => {
  let remaining = ordinal;
  for (let s = 1; s <= chapters.length; s++) {
    const vCount = chapters[s - 1]?.verses_count ?? 0;
    if (remaining <= vCount) {
      return { surah: s, ayah: remaining };
    }
    remaining -= vCount;
  }
  return { surah: chapters.length || 1, ayah: remaining || 1 };
};

/**
 * Computes total units (pages or verses) spanned by the current range selection.
 */
export const computeRangeTotalUnits = (
  mode: CustomWirdFormMode,
  params: {
    startPage?: number;
    endPage?: number;
    startJuz?: number;
    endJuz?: number;
    startSurah?: number;
    endSurah?: number;
    verseCount?: number;
    startVerse?: { surah: number; ayah: number };
    endVerse?: { surah: number; ayah: number };
  },
  chapters: SurahResult[] = []
): { totalUnits: number; unit: "page" | "verse" } => {
  if (mode === "mushaf") {
    return { totalUnits: 604, unit: "page" };
  }
  if (mode === "page") {
    const s = params.startPage ?? 1;
    const e = params.endPage ?? s;
    return { totalUnits: Math.max(1, e - s + 1), unit: "page" };
  }
  if (mode === "juz") {
    const s = params.startJuz ?? 1;
    const e = params.endJuz ?? s;
    const startPage = JUZ_START_PAGES[s] ?? 1;
    const endPage =
      e === 30 ? 604 : JUZ_START_PAGES[e + 1] ? JUZ_START_PAGES[e + 1] - 1 : 604;
    return { totalUnits: Math.max(1, endPage - startPage + 1), unit: "page" };
  }
  if (mode === "surah") {
    const s = params.startSurah ?? 1;
    const e = params.endSurah ?? s;
    const startPage = Number(chapters[s - 1]?.pages?.split("-")?.[0] ?? 1) || 1;
    const endPage = Number(chapters[e - 1]?.pages?.split("-")?.[1] ?? startPage) || startPage;
    return { totalUnits: Math.max(1, endPage - startPage + 1), unit: "page" };
  }
  // Verse mode
  if (params.verseCount !== undefined) {
    return { totalUnits: Math.max(1, params.verseCount), unit: "verse" };
  }
  if (params.startVerse && params.endVerse && chapters.length > 0) {
    const startOrd = calculateVerseOrdinal(
      params.startVerse.surah,
      params.startVerse.ayah,
      chapters
    );
    const endOrd = calculateVerseOrdinal(
      params.endVerse.surah,
      params.endVerse.ayah,
      chapters
    );
    return { totalUnits: Math.max(1, endOrd - startOrd + 1), unit: "verse" };
  }
  return { totalUnits: 1, unit: "verse" };
};

/**
 * Computes the live preview estimate matching engine.ts rules.
 */
export const computeCadenceEstimate = ({
  totalUnits,
  unit,
  cadenceType,
  pacePeriod = "day",
  paceAmount = 1,
  startDate,
  endDate,
  repetitions = 1,
}: {
  totalUnits: number;
  unit: "page" | "verse";
  cadenceType: "pace" | "deadline";
  pacePeriod?: "day" | "week";
  paceAmount?: number;
  startDate: string;
  endDate?: string;
  repetitions?: number;
}): EstimateResult => {
  if (cadenceType === "pace") {
    const amount = paceAmount > 0 ? paceAmount : 1;
    const unitsPerDay = pacePeriod === "week" ? amount / 7 : amount;
    const estimatedDays = Math.ceil(totalUnits / unitsPerDay);
    return {
      type: "days",
      numericValue: estimatedDays,
      unit,
      textKey: "plans.custom.estimate.days",
    };
  }

  // Deadline cadence
  const days = Math.max(1, dayCountInclusive(startDate, endDate ?? startDate));
  const effectiveReps = Math.max(1, repetitions);
  const totalItems = totalUnits * effectiveReps;
  const dailyPace = Math.ceil(totalItems / days);
  const estimatedDays = Math.ceil(totalItems / dailyPace);

  // Only worth announcing "finishes early" when the deadline actually gives more
  // than 1 day to work with — when the deadline itself is today/overdue (days <= 1),
  // dailyPace already equals the true remaining content and must stay visible, not
  // be replaced by a generic "1 day" message that would hide how much is due right now.
  if (estimatedDays === 1 && days > 1) {
    return {
      type: "days",
      numericValue: 1,
      unit,
      textKey: "plans.custom.estimate.days",
    };
  }

  return {
    type: "pace",
    numericValue: dailyPace,
    estimatedDays,
    unit,
    textKey: estimatedDays < days ? "plans.custom.estimate.paceWithDays" : "plans.custom.estimate.pace",
  };
};
