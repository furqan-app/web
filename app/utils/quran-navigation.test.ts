import { describe, expect, it } from "vitest";
import {
  getNextAyahKey,
  getPreviousAyahKey,
  getSurahMeta,
  getSurahVerseCount,
  SURAHS_META,
} from "./quran-navigation";

describe("quran-navigation", () => {
  describe("SURAHS_META & counts", () => {
    it("contains all 114 surahs", () => {
      expect(SURAHS_META.length).toBe(114);
      expect(SURAHS_META[0].nameArabic).toBe("الفاتحة");
      expect(SURAHS_META[113].nameArabic).toBe("الناس");
    });

    it("returns correct verse counts for individual surahs", () => {
      expect(getSurahVerseCount(1)).toBe(7); // Al-Fatihah
      expect(getSurahVerseCount(2)).toBe(286); // Al-Baqarah
      expect(getSurahVerseCount(3)).toBe(200); // Ali 'Imran
      expect(getSurahVerseCount(112)).toBe(4); // Al-Ikhlas
      expect(getSurahVerseCount(114)).toBe(6); // An-Nas
      expect(getSurahVerseCount(0)).toBe(0);
      expect(getSurahVerseCount(115)).toBe(0);
    });

    it("returns correct surah meta", () => {
      const fatihah = getSurahMeta(1);
      expect(fatihah).toEqual({
        id: 1,
        nameArabic: "الفاتحة",
        nameSimple: "Al-Fatihah",
        versesCount: 7,
      });

      expect(getSurahMeta(0)).toBeUndefined();
      expect(getSurahMeta(115)).toBeUndefined();
    });
  });

  describe("getPreviousAyahKey", () => {
    it("returns null at the beginning of the Quran (1:1)", () => {
      expect(getPreviousAyahKey("1:1")).toBeNull();
      expect(getPreviousAyahKey("001:001")).toBeNull();
    });

    it("steps backward within the same surah", () => {
      expect(getPreviousAyahKey("1:2")).toBe("1:1");
      expect(getPreviousAyahKey("2:15")).toBe("2:14");
      expect(getPreviousAyahKey("114:6")).toBe("114:5");
    });

    it("crosses surah boundary backwards to the last ayah of the previous surah", () => {
      // 2:1 -> 1:7 (Al-Fatihah has 7 verses)
      expect(getPreviousAyahKey("2:1")).toBe("1:7");
      // 3:1 -> 2:286 (Al-Baqarah has 286 verses)
      expect(getPreviousAyahKey("3:1")).toBe("2:286");
      // 114:1 -> 113:5 (Al-Falaq has 5 verses)
      expect(getPreviousAyahKey("114:1")).toBe("113:5");
    });

    it("handles null, undefined, or invalid strings gracefully", () => {
      expect(getPreviousAyahKey(null)).toBeNull();
      expect(getPreviousAyahKey(undefined)).toBeNull();
      expect(getPreviousAyahKey("")).toBeNull();
      expect(getPreviousAyahKey("abc")).toBeNull();
      expect(getPreviousAyahKey("999:999")).toBeNull();
    });
  });

  describe("getNextAyahKey", () => {
    it("returns null at the end of the Quran (114:6)", () => {
      expect(getNextAyahKey("114:6")).toBeNull();
      expect(getNextAyahKey("114:006")).toBeNull();
    });

    it("steps forward within the same surah", () => {
      expect(getNextAyahKey("1:1")).toBe("1:2");
      expect(getNextAyahKey("2:285")).toBe("2:286");
      expect(getNextAyahKey("114:5")).toBe("114:6");
    });

    it("crosses surah boundary forwards to the first ayah of the next surah", () => {
      // 1:7 -> 2:1
      expect(getNextAyahKey("1:7")).toBe("2:1");
      // 2:286 -> 3:1
      expect(getNextAyahKey("2:286")).toBe("3:1");
      // 113:5 -> 114:1
      expect(getNextAyahKey("113:5")).toBe("114:1");
    });

    it("handles null, undefined, or invalid strings gracefully", () => {
      expect(getNextAyahKey(null)).toBeNull();
      expect(getNextAyahKey(undefined)).toBeNull();
      expect(getNextAyahKey("")).toBeNull();
      expect(getNextAyahKey("invalid")).toBeNull();
      expect(getNextAyahKey("999:999")).toBeNull();
    });
  });
});
