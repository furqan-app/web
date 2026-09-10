import { describe, expect, it } from "vitest";
import type { SurahResult } from "@/app/types";
import {
  calculateVerseOrdinal,
  computeCadenceEstimate,
  computeRangeTotalUnits,
  dayCountInclusive,
  verseOrdinalToSurahAyah,
} from "./custom-wird-estimate";

const MOCK_CHAPTERS: SurahResult[] = [
  {
    id: 1,
    name_arabic: "الفاتحة",
    name_simple: "Al-Fatihah",
    verses_count: 7,
    revelation_place: "makkah",
    pages: "1-1",
  },
  {
    id: 2,
    name_arabic: "البقرة",
    name_simple: "Al-Baqarah",
    verses_count: 286,
    revelation_place: "madinah",
    pages: "2-49",
  },
  {
    id: 3,
    name_arabic: "آل عمران",
    name_simple: "Ali 'Imran",
    verses_count: 200,
    revelation_place: "madinah",
    pages: "50-76",
  },
  {
    id: 18,
    name_arabic: "الكهف",
    name_simple: "Al-Kahf",
    verses_count: 110,
    revelation_place: "makkah",
    pages: "293-304",
  },
];

describe("Custom Wird Estimate Helper (custom-wird-estimate.ts)", () => {
  describe("Pace Cadence Calculations", () => {
    it("computes 604 pages at 5 pages/day -> 121 days", () => {
      const result = computeCadenceEstimate({
        totalUnits: 604,
        unit: "page",
        cadenceType: "pace",
        pacePeriod: "day",
        paceAmount: 5,
        startDate: "2026-09-09",
      });

      expect(result.type).toBe("days");
      expect(result.numericValue).toBe(121);
      expect(result.unit).toBe("page");
      expect(result.textKey).toBe("plans.custom.estimate.days");
    });

    it("computes 604 pages at 14 pages/week (2 pages/day) -> 302 days", () => {
      const result = computeCadenceEstimate({
        totalUnits: 604,
        unit: "page",
        cadenceType: "pace",
        pacePeriod: "week",
        paceAmount: 14,
        startDate: "2026-09-09",
      });

      expect(result.type).toBe("days");
      expect(result.numericValue).toBe(302);
      expect(result.unit).toBe("page");
    });

    it("computes 10 verses at 2 verses/day -> 5 days", () => {
      const result = computeCadenceEstimate({
        totalUnits: 10,
        unit: "verse",
        cadenceType: "pace",
        pacePeriod: "day",
        paceAmount: 2,
        startDate: "2026-09-09",
      });

      expect(result.type).toBe("days");
      expect(result.numericValue).toBe(5);
      expect(result.unit).toBe("verse");
    });
  });

  describe("Deadline Cadence Calculations", () => {
    it("computes 30 pages within 10 days -> 3 pages/day", () => {
      const result = computeCadenceEstimate({
        totalUnits: 30,
        unit: "page",
        cadenceType: "deadline",
        startDate: "2026-09-01",
        endDate: "2026-09-10", // 10 days inclusive
        repetitions: 1,
      });

      expect(result.type).toBe("pace");
      expect(result.numericValue).toBe(3);
      expect(result.unit).toBe("page");
      expect(result.textKey).toBe("plans.custom.estimate.pace");
    });

    it("computes 604 pages within 30 days with K=1 -> 21 pages/day", () => {
      const result = computeCadenceEstimate({
        totalUnits: 604,
        unit: "page",
        cadenceType: "deadline",
        startDate: "2026-09-01",
        endDate: "2026-09-30", // 30 days inclusive
        repetitions: 1,
      });

      expect(result.type).toBe("pace");
      expect(result.numericValue).toBe(21); // ceil(604 / 30) = 21
    });

    it("computes 604 pages within 30 days with K=3 -> 61 pages/day", () => {
      const result = computeCadenceEstimate({
        totalUnits: 604,
        unit: "page",
        cadenceType: "deadline",
        startDate: "2026-09-01",
        endDate: "2026-09-30", // 30 days inclusive
        repetitions: 3,
      });

      expect(result.type).toBe("pace");
      expect(result.numericValue).toBe(61); // ceil(1812 / 30) = 61
    });

    it("handles dynamic re-adjustment with past/today date offsets safely", () => {
      // End date equals start date (same day) -> 1 day
      const sameDay = computeCadenceEstimate({
        totalUnits: 10,
        unit: "page",
        cadenceType: "deadline",
        startDate: "2026-09-09",
        endDate: "2026-09-09",
        repetitions: 1,
      });
      expect(sameDay.numericValue).toBe(10);

      // End date in past relative to start date -> clamped to 1 day minimum
      const pastDay = computeCadenceEstimate({
        totalUnits: 15,
        unit: "page",
        cadenceType: "deadline",
        startDate: "2026-09-09",
        endDate: "2026-09-05",
        repetitions: 1,
      });
      expect(pastDay.numericValue).toBe(15);
    });
  });

  describe("Range Total Units Calculation", () => {
    it("resolves mushaf mode to 604 pages", () => {
      const result = computeRangeTotalUnits("mushaf", {});
      expect(result).toEqual({ totalUnits: 604, unit: "page" });
    });

    it("resolves page mode accurately", () => {
      const result = computeRangeTotalUnits("page", { startPage: 1, endPage: 20 });
      expect(result).toEqual({ totalUnits: 20, unit: "page" });

      const single = computeRangeTotalUnits("page", { startPage: 50, endPage: 50 });
      expect(single).toEqual({ totalUnits: 1, unit: "page" });
    });

    it("resolves juz mode using static juz boundaries", () => {
      // Juz 1: pages 1 to 21 -> 21 pages
      const juz1 = computeRangeTotalUnits("juz", { startJuz: 1, endJuz: 1 });
      expect(juz1).toEqual({ totalUnits: 21, unit: "page" });

      // Juz 30: pages 582 to 604 -> 23 pages
      const juz30 = computeRangeTotalUnits("juz", { startJuz: 30, endJuz: 30 });
      expect(juz30).toEqual({ totalUnits: 23, unit: "page" });

      // All 30 juz: pages 1 to 604 -> 604 pages
      const allJuz = computeRangeTotalUnits("juz", { startJuz: 1, endJuz: 30 });
      expect(allJuz).toEqual({ totalUnits: 604, unit: "page" });
    });

    it("resolves surah mode using chapters metadata", () => {
      // Surah 1: pages 1-1 -> 1 page
      const s1 = computeRangeTotalUnits("surah", { startSurah: 1, endSurah: 1 }, MOCK_CHAPTERS);
      expect(s1).toEqual({ totalUnits: 1, unit: "page" });

      // Surah 2: pages 2-49 -> 48 pages
      const s2 = computeRangeTotalUnits("surah", { startSurah: 2, endSurah: 2 }, MOCK_CHAPTERS);
      expect(s2).toEqual({ totalUnits: 48, unit: "page" });
    });

    it("handles surah mode safely when chapters array is empty", () => {
      const result = computeRangeTotalUnits("surah", { startSurah: 1, endSurah: 1 }, []);
      expect(result.totalUnits).toBeGreaterThanOrEqual(1);
      expect(result.unit).toBe("page");
    });

    it("resolves verse mode using explicit verseCount or start/end verse", () => {
      const explicit = computeRangeTotalUnits("verse", { verseCount: 25 });
      expect(explicit).toEqual({ totalUnits: 25, unit: "verse" });

      // Surah 1 verse 1 to Surah 1 verse 7 -> 7 verses
      const fatihah = computeRangeTotalUnits(
        "verse",
        {
          startVerse: { surah: 1, ayah: 1 },
          endVerse: { surah: 1, ayah: 7 },
        },
        MOCK_CHAPTERS
      );
      expect(fatihah).toEqual({ totalUnits: 7, unit: "verse" });
    });
  });

  describe("Verse Ordinal Helpers", () => {
    it("correctly converts between surah:ayah and global verse ordinals", () => {
      expect(calculateVerseOrdinal(1, 1, MOCK_CHAPTERS)).toBe(1);
      expect(calculateVerseOrdinal(1, 7, MOCK_CHAPTERS)).toBe(7);
      expect(calculateVerseOrdinal(2, 1, MOCK_CHAPTERS)).toBe(8);
      expect(calculateVerseOrdinal(2, 286, MOCK_CHAPTERS)).toBe(293);

      expect(verseOrdinalToSurahAyah(1, MOCK_CHAPTERS)).toEqual({ surah: 1, ayah: 1 });
      expect(verseOrdinalToSurahAyah(7, MOCK_CHAPTERS)).toEqual({ surah: 1, ayah: 7 });
      expect(verseOrdinalToSurahAyah(8, MOCK_CHAPTERS)).toEqual({ surah: 2, ayah: 1 });
      expect(verseOrdinalToSurahAyah(293, MOCK_CHAPTERS)).toEqual({ surah: 2, ayah: 286 });
    });

    it("computes inclusive day count correctly", () => {
      expect(dayCountInclusive("2026-09-01", "2026-09-01")).toBe(1);
      expect(dayCountInclusive("2026-09-01", "2026-09-10")).toBe(10);
      expect(dayCountInclusive("2026-09-01", "2026-09-30")).toBe(30);
    });
  });
});
