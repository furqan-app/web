import type { PlanQuantity } from "@/app/constants/plans";
import type { SurahResult } from "@/app/types";
import { toLocaleNumeral } from "@/app/utils/i18n";

/**
 * Extracts numeric quantity from raw number or ADR 0038 { unit, amount } object.
 * Safely guards null and undefined.
 */
export const quantityAmount = (
  q: PlanQuantity | null | undefined,
  fallback: number
): number => {
  if (q == null) return fallback;
  if (typeof q === "number") return q;
  if (typeof q === "object" && typeof q.amount === "number") return q.amount;
  return fallback;
};

/**
 * Derives pace summary string (e.g. "5 صفحة/يوم" or "10 آية/يوم") adhering to trackUnits.
 */
export const getPlanPaceSummary = (
  pace: number,
  unit: string | undefined,
  locale: string,
  t: (key: string, defaultValue?: string) => string
): string => {
  const paceNum = toLocaleNumeral(pace, locale);
  const unitLabel =
    unit === "verse"
      ? t("plans.versesPerDay", "verses/day")
      : t("plans.pagesPerDay", "pages/day");
  return `${paceNum} ${unitLabel}`;
};

/**
 * Aggregates pending and total daily tasks across all active plans.
 */
export const computeTodayTaskCounts = (
  todayData?: Array<{ assignments: Array<{ completed: boolean }> }> | null
) => {
  const todayRows = (todayData ?? []).flatMap((p) => p.assignments);
  const totalTasks = todayRows.length;
  const pendingTasks = todayRows.filter((a) => !a.completed).length;
  return { totalTasks, pendingTasks };
};

/**
 * Parses a "surah:ayah" verse key (e.g. "4:12") into numeric components.
 */
export const parseVerseKey = (
  key: string
): { surah: number; ayah: number } | null => {
  const parts = key.split(":");
  if (parts.length !== 2) return null;
  const surah = Number(parts[0]);
  const ayah = Number(parts[1]);
  if (!Number.isFinite(surah) || !Number.isFinite(ayah) || surah < 1 || ayah < 1) {
    return null;
  }
  return { surah, ayah };
};

/**
 * Localizes digits of a raw "surah:ayah" key (e.g. "4:12" -> "٤:١٢" in Arabic).
 */
export const formatRawVerseKey = (key: string, locale: string): string => {
  const parsed = parseVerseKey(key);
  if (!parsed) return key;
  return `${toLocaleNumeral(parsed.surah, locale)}:${toLocaleNumeral(parsed.ayah, locale)}`;
};

/**
 * Formats a verse-unit range with surah name and localized numerals:
 * - Same surah: "{surahName} {startAyah}–{endAyah}" (e.g. "النساء ١–١٢" / "An-Nisa 1–12")
 * - Cross surah: "{surahNameA} {ayahA} – {surahNameB} {ayahB}" (e.g. "النساء ١٧٦ – المائدة ٣")
 * - Single ayah: "{surahName} {ayah}" (e.g. "النساء ١" / "An-Nisa 1")
 *
 * Falls back to localized raw digits "{startKey}–{endKey}" while chapters are loading/unavailable.
 */
export const formatVerseRange = (
  startKey: string,
  endKey: string,
  locale: string,
  chapters?: SurahResult[]
): string => {
  const startParsed = parseVerseKey(startKey);
  const endParsed = parseVerseKey(endKey);

  const fallback = () => {
    const s = formatRawVerseKey(startKey, locale);
    const e = formatRawVerseKey(endKey, locale);
    return startKey === endKey ? s : `${s}–${e}`;
  };

  if (!startParsed || !endParsed || !chapters || chapters.length === 0) {
    return fallback();
  }

  const startChapter = chapters.find((c) => c.id === startParsed.surah);
  const endChapter = chapters.find((c) => c.id === endParsed.surah);

  if (!startChapter || !endChapter) {
    return fallback();
  }

  const surahName = (c: SurahResult) =>
    locale === "ar" ? c.name_arabic : c.name_simple;
  const startName = surahName(startChapter);
  const endName = surahName(endChapter);

  // 1. Single ayah
  if (startKey === endKey) {
    return `${startName} ${toLocaleNumeral(startParsed.ayah, locale)}`;
  }

  // 2. Same surah
  if (startParsed.surah === endParsed.surah) {
    return `${startName} ${toLocaleNumeral(startParsed.ayah, locale)}–${toLocaleNumeral(endParsed.ayah, locale)}`;
  }

  // 3. Cross surah
  return `${startName} ${toLocaleNumeral(startParsed.ayah, locale)} – ${endName} ${toLocaleNumeral(endParsed.ayah, locale)}`;
};
