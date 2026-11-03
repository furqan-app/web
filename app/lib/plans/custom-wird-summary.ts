/**
 * Pure helper module to construct human-readable, natural-language summary
 * sentences for Qur'an reading plans / awrad.
 *
 * Examples (Arabic):
 * - "قراءة المصحف كاملاً بمعدل ١٠ صفحات يومياً (ختمة مستمرة تتكرر تلقائياً)"
 * - "قراءة سورة الملك كاملة كل يوم"
 * - "قراءة سورة الكهف كاملة كل يوم الجمعة"
 * - "حفظ سورة النساء كاملة بمعدل صفحة يومياً (يستغرق حوالي ٢٩ يوماً)"
 */

import type { CustomWirdDefinition, PlanActivity, PlanUnit } from "@/app/constants/plans";
import type { SurahResult } from "@/app/types";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { formatVerseRange } from "./ui-helpers";
import { verseOrdinalToSurahAyah } from "./custom-wird-estimate";

export type CustomWirdSummaryInput = {
  activity: PlanActivity;
  unit: PlanUnit;
  rangeMode: "mushaf" | "surah" | "juz" | "page" | "verse";
  range: {
    startPage?: number;
    endPage?: number;
    startJuz?: number;
    endJuz?: number;
    startSurah?: number;
    endSurah?: number;
    startVerse?: { surah: number; ayah: number };
    endVerse?: { surah: number; ayah: number };
    rangeStart?: number;
    rangeEnd?: number;
  };
  cadence: {
    type: "pace" | "deadline" | "weekly" | "daily";
    amount?: number;
    pacePeriod?: "day" | "week";
    unitsPerDay?: number;
    repeat?: boolean;
    endDate?: string;
    weekday?: number;
    repetitions?: number;
  };
  estimatedDays?: number;
  locale: string;
  chapters?: SurahResult[];
};

export const getActivityLabel = (activity: PlanActivity, locale: string): string => {
  if (locale === "ar") {
    switch (activity) {
      case "read":
        return "قراءة";
      case "listen":
        return "الاستماع إلى";
      case "memorize":
        return "حفظ";
      case "review":
        return "مراجعة";
    }
  }
  switch (activity) {
    case "read":
      return "Reading";
    case "listen":
      return "Listening to";
    case "memorize":
      return "Memorizing";
    case "review":
      return "Reviewing";
  }
};

export const getRangeLabel = (
  rangeMode: "mushaf" | "surah" | "juz" | "page" | "verse",
  range: CustomWirdSummaryInput["range"],
  locale: string,
  chapters?: SurahResult[]
): string => {
  const isAr = locale === "ar";
  if (rangeMode === "mushaf") {
    const startP = range.startPage ?? 1;
    if (startP > 1) {
      const pStr = toLocaleNumeral(startP, locale);
      return isAr
        ? `المصحف بدءاً من صفحة ${pStr}`
        : `the Qur'an starting from page ${pStr}`;
    }
    return isAr ? "المصحف كاملاً" : "the whole Qur'an";
  }

  if (rangeMode === "surah") {
    const startS =
      range.startSurah ??
      (range.rangeStart && range.rangeStart <= 114 ? range.rangeStart : 1);
    const endS = range.endSurah ?? startS;
    const startChapter = chapters?.find((c) => c.id === startS);
    const startName = startChapter?.name_arabic ?? `${startS}`;
    const startNameEn = startChapter?.name_simple ?? `${startS}`;

    if (startS === endS) {
      return isAr ? `سورة ${startName} كاملة` : `all of Surah ${startNameEn}`;
    }
    const endChapter = chapters?.find((c) => c.id === endS);
    const endName = endChapter?.name_arabic ?? `${endS}`;
    const endNameEn = endChapter?.name_simple ?? `${endS}`;
    return isAr
      ? `من سورة ${startName} إلى سورة ${endName}`
      : `from Surah ${startNameEn} to Surah ${endNameEn}`;
  }

  if (rangeMode === "juz") {
    const startJ = range.startJuz ?? 1;
    const endJ = range.endJuz ?? startJ;
    if (startJ === endJ) {
      const jStr = toLocaleNumeral(startJ, locale);
      return isAr ? `الجزء ${jStr}` : `Juz ${jStr}`;
    }
    const sStr = toLocaleNumeral(startJ, locale);
    const eStr = toLocaleNumeral(endJ, locale);
    return isAr
      ? `من الجزء ${sStr} إلى الجزء ${eStr}`
      : `from Juz ${sStr} to Juz ${eStr}`;
  }

  if (rangeMode === "page") {
    const startP = range.startPage ?? range.rangeStart ?? 1;
    const endP = range.endPage ?? range.rangeEnd ?? startP;
    if (startP === 1 && endP === 604) {
      return isAr ? "المصحف كاملاً" : "the whole Qur'an";
    }
    if (startP === endP) {
      const pStr = toLocaleNumeral(startP, locale);
      return isAr ? `الصفحة ${pStr}` : `page ${pStr}`;
    }
    const sStr = toLocaleNumeral(startP, locale);
    const eStr = toLocaleNumeral(endP, locale);
    return isAr
      ? `من صفحة ${sStr} إلى صفحة ${eStr}`
      : `pages ${sStr} to ${eStr}`;
  }

  if (rangeMode === "verse") {
    if (range.startVerse && range.endVerse) {
      const startKey = `${range.startVerse.surah}:${range.startVerse.ayah}`;
      const endKey = `${range.endVerse.surah}:${range.endVerse.ayah}`;
      return formatVerseRange(startKey, endKey, locale, chapters);
    }
    if (range.rangeStart && range.rangeEnd && chapters && chapters.length > 0) {
      const startV = verseOrdinalToSurahAyah(range.rangeStart, chapters);
      const endV = verseOrdinalToSurahAyah(range.rangeEnd, chapters);
      const startKey = `${startV.surah}:${startV.ayah}`;
      const endKey = `${endV.surah}:${endV.ayah}`;
      return formatVerseRange(startKey, endKey, locale, chapters);
    }
    return isAr ? "الآيات المحددة" : "selected verses";
  }

  return "";
};

const AR_WEEKDAYS_INDEFINITE: Record<number, string> = {
  0: "أحد",
  1: "اثنين",
  2: "ثلاثاء",
  3: "أربعاء",
  4: "خميس",
  5: "جمعة",
  6: "سبت",
};

export const getCadenceLabel = (
  cadence: CustomWirdSummaryInput["cadence"],
  unit: PlanUnit,
  locale: string
): string => {
  const isAr = locale === "ar";
  if (cadence.type === "daily") {
    return isAr ? "كل يوم" : "daily";
  }

  if (cadence.type === "weekly") {
    const weekday = cadence.weekday ?? 5; // default Friday
    if (isAr) {
      const dayName = AR_WEEKDAYS_INDEFINITE[weekday] ?? "جمعة";
      return `كل يوم ${dayName}`;
    }
    const dayName = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
      new Date(Date.UTC(2026, 0, 4 + weekday))
    );
    return `every ${dayName}`;
  }

  if (cadence.type === "pace") {
    const isWeek =
      cadence.pacePeriod === "week" ||
      (cadence.pacePeriod === undefined &&
        cadence.unitsPerDay !== undefined &&
        cadence.unitsPerDay !== 0.5 &&
        !Number.isInteger(cadence.unitsPerDay) &&
        Math.abs(Math.round(cadence.unitsPerDay * 7) - cadence.unitsPerDay * 7) < 0.01);

    const amount =
      cadence.amount ??
      (cadence.unitsPerDay === 0.5
        ? 0.5
        : cadence.unitsPerDay
          ? Math.round(cadence.unitsPerDay * (isWeek ? 7 : 1))
          : 1);
    const amountStr = toLocaleNumeral(amount, locale);

    if (isAr) {
      if (unit === "page") {
        if (!isWeek) {
          if (amount === 0.5) return "بمعدل نصف صفحة يومياً";
          if (amount === 1) return "بمعدل صفحة يومياً";
          if (amount === 2) return "بمعدل صفحتين يومياً";
          if (amount >= 3 && amount <= 10)
            return `بمعدل ${amountStr} صفحات يومياً`;
          return `بمعدل ${amountStr} صفحة يومياً`;
        } else {
          if (amount === 1) return "بمعدل صفحة أسبوعياً";
          if (amount === 2) return "بمعدل صفحتين أسبوعياً";
          if (amount >= 3 && amount <= 10)
            return `بمعدل ${amountStr} صفحات أسبوعياً`;
          return `بمعدل ${amountStr} صفحة أسبوعياً`;
        }
      } else {
        if (amount === 1) return "بمعدل آية يومياً";
        if (amount === 2) return "بمعدل آيتين يومياً";
        if (amount >= 3 && amount <= 10) return `بمعدل ${amountStr} آيات يومياً`;
        return `بمعدل ${amountStr} آية يومياً`;
      }
    } else {
      if (unit === "page" && amount === 0.5 && !isWeek) {
        return "at half a page/day";
      }
      const u =
        unit === "page"
          ? amount === 1
            ? "page"
            : "pages"
          : amount === 1
            ? "verse"
            : "verses";
      const period = isWeek ? "week" : "day";
      return `at ${amountStr} ${u}/${period}`;
    }
  }

  if (cadence.type === "deadline") {
    if (!cadence.endDate) return "";
    const dateLocale = isAr ? "ar-u-nu-arab" : locale;
    const dateObj = new Date(`${cadence.endDate}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return isAr ? `حتى ${formattedDate}` : `until ${formattedDate}`;
  }

  return "";
};

export const getTailNote = (
  cadence: CustomWirdSummaryInput["cadence"],
  rangeMode: "mushaf" | "surah" | "juz" | "page" | "verse",
  estimatedDays?: number,
  locale: string = "ar"
): string | null => {
  const isAr = locale === "ar";

  if (cadence.type === "pace") {
    if (rangeMode === "mushaf" && cadence.repeat === true) {
      return isAr ? "ختمة مستمرة تتكرر تلقائياً" : "continuous repeating khatma";
    }
    if (rangeMode === "mushaf" && cadence.repeat === false) {
      if (estimatedDays && estimatedDays > 1) {
        const daysStr = toLocaleNumeral(estimatedDays, locale);
        if (isAr) {
          const daysWord =
            estimatedDays >= 3 && estimatedDays <= 10 ? "أيام" : "يوماً";
          return `ختمة لمرة واحدة تستغرق حوالي ${daysStr} ${daysWord}`;
        }
        return `one-time khatma, approx. ${daysStr} days`;
      }
      return isAr ? "ختمة لمرة واحدة" : "one-time khatma";
    }
    if (estimatedDays && estimatedDays > 0) {
      const daysStr = toLocaleNumeral(estimatedDays, locale);
      if (isAr) {
        if (estimatedDays === 1) return "يستغرق يوماً واحداً";
        if (estimatedDays === 2) return "يستغرق يومين";
        if (estimatedDays >= 3 && estimatedDays <= 10)
          return `يستغرق حوالي ${daysStr} أيام`;
        return `يستغرق حوالي ${daysStr} يوماً`;
      }
      return `approx. ${daysStr} ${estimatedDays === 1 ? "day" : "days"}`;
    }
  }

  if (cadence.type === "deadline") {
    const reps = cadence.repetitions ?? 1;
    if (reps > 1) {
      const repsStr = toLocaleNumeral(reps, locale);
      if (isAr) {
        if (reps === 2) return "تكرار مرتين";
        if (reps >= 3 && reps <= 10) return `تكرار ${repsStr} مرات`;
        return `تكرار ${repsStr} مرة`;
      }
      return `repeated ${repsStr} times`;
    }
  }

  return null;
};

/**
 * Computes a full natural-language sentence describing the wird.
 */
export const computeCustomWirdSummarySentence = (
  input: CustomWirdSummaryInput
): string => {
  const {
    activity,
    unit,
    rangeMode,
    range,
    cadence,
    estimatedDays,
    locale,
    chapters,
  } = input;
  const act = getActivityLabel(activity, locale);
  const rng = getRangeLabel(rangeMode, range, locale, chapters);
  const cdc = getCadenceLabel(cadence, unit, locale);
  const tail = getTailNote(cadence, rangeMode, estimatedDays, locale);

  let sentence = `${act} ${rng} ${cdc}`.trim();
  if (tail) {
    sentence += ` (${tail})`;
  }
  return sentence;
};

/**
 * Derives a summary sentence for an already persisted CustomWirdDefinition.
 */
export const formatCustomWirdDefinitionSummary = (
  definition: CustomWirdDefinition,
  locale: string,
  chapters?: SurahResult[]
): string => {
  const isMushaf =
    definition.unit === "page" &&
    definition.rangeStart === 1 &&
    definition.rangeEnd === 604;
  const rangeMode = isMushaf ? "mushaf" : definition.unit === "verse" ? "verse" : "page";

  const totalUnits = Math.max(1, definition.rangeEnd - definition.rangeStart + 1);
  let estimatedDays: number | undefined;

  if (definition.cadence.type === "pace") {
    const unitsPerDay = definition.cadence.unitsPerDay > 0 ? definition.cadence.unitsPerDay : 1;
    estimatedDays = Math.ceil(totalUnits / unitsPerDay);
  }

  return computeCustomWirdSummarySentence({
    activity: definition.activity,
    unit: definition.unit,
    rangeMode,
    range: {
      rangeStart: definition.rangeStart,
      rangeEnd: definition.rangeEnd,
      startPage: definition.unit === "page" ? definition.rangeStart : undefined,
      endPage: definition.unit === "page" ? definition.rangeEnd : undefined,
    },
    cadence: definition.cadence,
    estimatedDays,
    locale,
    chapters,
  });
};

/**
 * Auto-suggests a concise, natural name for a wird based on activity and target range.
 * Examples:
 * - read + mushaf -> "ختمة القراءة"
 * - memorize + mushaf -> "ختمة الحفظ"
 * - read + Surah Al-Mulk -> "قراءة سورة الملك"
 * - memorize + Surah An-Nisa -> "حفظ سورة النساء"
 * - review + Juz 30 -> "مراجعة الجزء ٣٠"
 */
export const suggestWirdName = (params: {
  activity: PlanActivity;
  rangeMode: "mushaf" | "surah" | "juz" | "page" | "verse";
  startSurah?: number;
  endSurah?: number;
  startJuz?: number;
  endJuz?: number;
  startPage?: number;
  endPage?: number;
  locale: string;
  chapters?: SurahResult[];
}): string => {
  const isAr = params.locale === "ar";
  const {
    activity,
    rangeMode,
    startSurah,
    endSurah,
    startJuz,
    endJuz,
    startPage,
    endPage,
    chapters,
  } = params;

  if (rangeMode === "mushaf") {
    if (isAr) {
      switch (activity) {
        case "read":
          return "ختمة القراءة";
        case "listen":
          return "ختمة الاستماع";
        case "memorize":
          return "ختمة الحفظ";
        case "review":
          return "ختمة المراجعة";
      }
    } else {
      switch (activity) {
        case "read":
          return "Reading Khatma";
        case "listen":
          return "Listening Khatma";
        case "memorize":
          return "Memorization Khatma";
        case "review":
          return "Review Khatma";
      }
    }
  }

  const actPrefix = isAr
    ? activity === "read"
      ? "قراءة"
      : activity === "listen"
        ? "استماع"
        : activity === "memorize"
          ? "حفظ"
          : "مراجعة"
    : activity === "read"
      ? "Reading"
      : activity === "listen"
        ? "Listening to"
        : activity === "memorize"
          ? "Memorizing"
          : "Reviewing";

  if (rangeMode === "surah") {
    const sId = startSurah ?? 1;
    const eId = endSurah ?? sId;
    const startChapter = chapters?.find((c) => c.id === sId);
    const startName = isAr
      ? startChapter?.name_arabic ?? `${sId}`
      : startChapter?.name_simple ?? `${sId}`;

    if (sId === eId) {
      return isAr
        ? `${actPrefix} سورة ${startName}`
        : `${actPrefix} Surah ${startName}`;
    }
    const endChapter = chapters?.find((c) => c.id === eId);
    const endName = isAr
      ? endChapter?.name_arabic ?? `${eId}`
      : endChapter?.name_simple ?? `${eId}`;
    return isAr
      ? `${actPrefix} من ${startName} إلى ${endName}`
      : `${actPrefix} Surah ${startName} to ${endName}`;
  }

  if (rangeMode === "juz") {
    const sJuz = startJuz ?? 1;
    const eJuz = endJuz ?? sJuz;
    const sStr = toLocaleNumeral(sJuz, params.locale);
    const eStr = toLocaleNumeral(eJuz, params.locale);
    if (sJuz === eJuz) {
      return isAr ? `${actPrefix} الجزء ${sStr}` : `${actPrefix} Juz ${sStr}`;
    }
    return isAr
      ? `${actPrefix} من الجزء ${sStr} إلى ${eStr}`
      : `${actPrefix} Juz ${sStr} to ${eStr}`;
  }

  if (rangeMode === "page") {
    const sP = startPage ?? 1;
    const eP = endPage ?? sP;
    const sStr = toLocaleNumeral(sP, params.locale);
    const eStr = toLocaleNumeral(eP, params.locale);
    if (sP === 1 && eP === 604) {
      return isAr ? "ختمة المصحف" : "Whole Quran Khatma";
    }
    if (sP === eP) {
      return isAr ? `${actPrefix} صفحة ${sStr}` : `${actPrefix} Page ${sStr}`;
    }
    return isAr
      ? `${actPrefix} صفحات ${sStr}–${eStr}`
      : `${actPrefix} Pages ${sStr}–${eStr}`;
  }

  return isAr ? `ورد ${actPrefix}` : `${actPrefix} Wird`;
};
