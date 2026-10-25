import { describe, expect, it } from "vitest";
import {
  computeCustomWirdSummarySentence,
  formatCustomWirdDefinitionSummary,
  suggestWirdName,
  type CustomWirdSummaryInput,
} from "./custom-wird-summary";
import type { SurahResult } from "@/app/types";

const mockChapters: SurahResult[] = [
  { id: 1, name_arabic: "الفاتحة", name_simple: "Al-Fatihah", verses_count: 7, pages: "1-1" } as SurahResult,
  { id: 2, name_arabic: "البقرة", name_simple: "Al-Baqarah", verses_count: 286, pages: "2-49" } as SurahResult,
  { id: 4, name_arabic: "النساء", name_simple: "An-Nisa", verses_count: 176, pages: "77-106" } as SurahResult,
  { id: 18, name_arabic: "الكهف", name_simple: "Al-Kahf", verses_count: 110, pages: "293-304" } as SurahResult,
  { id: 67, name_arabic: "الملك", name_simple: "Al-Mulk", verses_count: 30, pages: "562-564" } as SurahResult,
];

describe("custom-wird-summary", () => {
  describe("Arabic Sentences", () => {
    it("1. Whole mushaf reading with repeating pace", () => {
      const input: CustomWirdSummaryInput = {
        activity: "read",
        unit: "page",
        rangeMode: "mushaf",
        range: {},
        cadence: {
          type: "pace",
          amount: 10,
          repeat: true,
        },
        locale: "ar",
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe(
        "قراءة المصحف كاملاً بمعدل ١٠ صفحات يومياً (ختمة مستمرة تتكرر تلقائياً)"
      );
    });

    it("2. Single surah daily recurring reading", () => {
      const input: CustomWirdSummaryInput = {
        activity: "read",
        unit: "page",
        rangeMode: "surah",
        range: { startSurah: 67, endSurah: 67 },
        cadence: {
          type: "daily",
        },
        locale: "ar",
        chapters: mockChapters,
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe("قراءة سورة الملك كاملة كل يوم");
    });

    it("3. Single surah weekly Friday recurring reading", () => {
      const input: CustomWirdSummaryInput = {
        activity: "read",
        unit: "page",
        rangeMode: "surah",
        range: { startSurah: 18, endSurah: 18 },
        cadence: {
          type: "weekly",
          weekday: 5,
        },
        locale: "ar",
        chapters: mockChapters,
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe("قراءة سورة الكهف كاملة كل يوم جمعة");
    });

    it("3b. Single surah weekly Sunday revision (indefinite weekday without الـ)", () => {
      const input: CustomWirdSummaryInput = {
        activity: "review",
        unit: "page",
        rangeMode: "surah",
        range: { startSurah: 2, endSurah: 2 },
        cadence: {
          type: "weekly",
          weekday: 0,
        },
        locale: "ar",
        chapters: mockChapters,
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe("مراجعة سورة البقرة كاملة كل يوم أحد");
    });

    it("4. Memorizing a surah with 1 page/day pace and estimated duration", () => {
      const input: CustomWirdSummaryInput = {
        activity: "memorize",
        unit: "page",
        rangeMode: "surah",
        range: { startSurah: 4, endSurah: 4 },
        cadence: {
          type: "pace",
          amount: 1,
        },
        estimatedDays: 29,
        locale: "ar",
        chapters: mockChapters,
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe(
        "حفظ سورة النساء كاملة بمعدل صفحة يومياً (يستغرق حوالي ٢٩ يوماً)"
      );
    });

    it("5. Whole mushaf reading with non-repeating pace (one-time khatma)", () => {
      const input: CustomWirdSummaryInput = {
        activity: "read",
        unit: "page",
        rangeMode: "mushaf",
        range: {},
        cadence: {
          type: "pace",
          amount: 10,
          repeat: false,
        },
        estimatedDays: 61,
        locale: "ar",
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe(
        "قراءة المصحف كاملاً بمعدل ١٠ صفحات يومياً (ختمة لمرة واحدة تستغرق حوالي ٦١ يوماً)"
      );
    });

    it("6. Reviewing a juz with 2 pages/day pace", () => {
      const input: CustomWirdSummaryInput = {
        activity: "review",
        unit: "page",
        rangeMode: "juz",
        range: { startJuz: 30, endJuz: 30 },
        cadence: {
          type: "pace",
          amount: 2,
        },
        estimatedDays: 12,
        locale: "ar",
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe(
        "مراجعة الجزء ٣٠ بمعدل صفحتين يومياً (يستغرق حوالي ١٢ يوماً)"
      );
    });

    it("7. Listening to selected pages", () => {
      const input: CustomWirdSummaryInput = {
        activity: "listen",
        unit: "page",
        rangeMode: "page",
        range: { startPage: 1, endPage: 10 },
        cadence: {
          type: "pace",
          amount: 5,
        },
        estimatedDays: 2,
        locale: "ar",
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe(
        "الاستماع إلى من صفحة ١ إلى صفحة ١٠ بمعدل ٥ صفحات يومياً (يستغرق يومين)"
      );
    });
  });

  describe("English Sentences", () => {
    it("renders whole mushaf reading with repeating pace in English", () => {
      const input: CustomWirdSummaryInput = {
        activity: "read",
        unit: "page",
        rangeMode: "mushaf",
        range: {},
        cadence: {
          type: "pace",
          amount: 10,
          repeat: true,
        },
        locale: "en",
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe(
        "Reading the whole Qur'an at 10 pages/day (continuous repeating khatma)"
      );
    });

    it("renders single surah daily reading in English", () => {
      const input: CustomWirdSummaryInput = {
        activity: "read",
        unit: "page",
        rangeMode: "surah",
        range: { startSurah: 67, endSurah: 67 },
        cadence: {
          type: "daily",
        },
        locale: "en",
        chapters: mockChapters,
      };

      const result = computeCustomWirdSummarySentence(input);
      expect(result).toBe("Reading all of Surah Al-Mulk daily");
    });
  });

  describe("formatCustomWirdDefinitionSummary", () => {
    it("formats stored definition correctly", () => {
      const result = formatCustomWirdDefinitionSummary(
        {
          activity: "read",
          unit: "page",
          rangeStart: 1,
          rangeEnd: 604,
          cadence: {
            type: "pace",
            unitsPerDay: 5,
            repeat: true,
          },
        },
        "ar"
      );

      expect(result).toBe(
        "قراءة المصحف كاملاً بمعدل ٥ صفحات يومياً (ختمة مستمرة تتكرر تلقائياً)"
      );
    });
  });

  describe("suggestWirdName", () => {
    it("suggests khatma names for whole mushaf", () => {
      expect(
        suggestWirdName({
          activity: "read",
          rangeMode: "mushaf",
          locale: "ar",
        })
      ).toBe("ختمة القراءة");

      expect(
        suggestWirdName({
          activity: "memorize",
          rangeMode: "mushaf",
          locale: "ar",
        })
      ).toBe("ختمة الحفظ");

      expect(
        suggestWirdName({
          activity: "listen",
          rangeMode: "mushaf",
          locale: "ar",
        })
      ).toBe("ختمة الاستماع");

      expect(
        suggestWirdName({
          activity: "review",
          rangeMode: "mushaf",
          locale: "ar",
        })
      ).toBe("ختمة المراجعة");
    });

    it("suggests surah-based names", () => {
      expect(
        suggestWirdName({
          activity: "read",
          rangeMode: "surah",
          startSurah: 67,
          endSurah: 67,
          locale: "ar",
          chapters: mockChapters,
        })
      ).toBe("قراءة سورة الملك");

      expect(
        suggestWirdName({
          activity: "memorize",
          rangeMode: "surah",
          startSurah: 4,
          endSurah: 4,
          locale: "ar",
          chapters: mockChapters,
        })
      ).toBe("حفظ سورة النساء");
    });

    it("suggests juz-based names", () => {
      expect(
        suggestWirdName({
          activity: "review",
          rangeMode: "juz",
          startJuz: 30,
          endJuz: 30,
          locale: "ar",
        })
      ).toBe("مراجعة الجزء ٣٠");
    });

    it("suggests English names when locale is en", () => {
      expect(
        suggestWirdName({
          activity: "read",
          rangeMode: "mushaf",
          locale: "en",
        })
      ).toBe("Reading Khatma");

      expect(
        suggestWirdName({
          activity: "read",
          rangeMode: "surah",
          startSurah: 67,
          endSurah: 67,
          locale: "en",
          chapters: mockChapters,
        })
      ).toBe("Reading Surah Al-Mulk");
    });
  });
});
