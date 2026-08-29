import { describe, expect, it } from "vitest";
import { MARK_CATEGORIES } from "@/app/constants/marks";
import { getSurahMeta, normalizeVerseKey } from "@/app/utils/quran-navigation";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import {
  RotateCcw,
  Copy,
  Type,
  AudioWaveform,
  Link as LinkIcon,
  Bookmark,
} from "lucide-react";

describe("MarkModal & MarkerColorPicker Design Architecture", () => {
  describe("MARK_CATEGORIES distinct icon catalog", () => {
    it("contains all 6 required mark categories", () => {
      expect(MARK_CATEGORIES.length).toBe(6);
      expect(MARK_CATEGORIES.map((c) => c.key)).toEqual([
        "forgetting",
        "similar",
        "tashkeel-error",
        "tajweed-error",
        "linking",
        "other",
      ]);
    });

    it("assigns distinct semantic Lucide icons per category", () => {
      const categoryMap = Object.fromEntries(
        MARK_CATEGORIES.map((c) => [c.key, c.icon]),
      );

      expect(categoryMap["forgetting"]).toBe(RotateCcw);
      expect(categoryMap["similar"]).toBe(Copy);
      expect(categoryMap["tashkeel-error"]).toBe(Type);
      expect(categoryMap["tajweed-error"]).toBe(AudioWaveform);
      expect(categoryMap["linking"]).toBe(LinkIcon);
      expect(categoryMap["other"]).toBe(Bookmark);
    });

    it("provides badge background and text tokens for all categories", () => {
      MARK_CATEGORIES.forEach((category) => {
        expect(category.badgeBg).toBeTruthy();
        expect(category.badgeText).toBeTruthy();
        expect(category.chip).toBeTruthy();
        expect(category.labelKey).toContain("markModal.");
      });
    });
  });

  describe("Header Context & Verse Key Resolution", () => {
    it("correctly resolves Surah metadata and localized Ayah number", () => {
      const verseKey = "4:10";
      const normalized = normalizeVerseKey(verseKey) ?? "1:1";
      const [surahStr, ayahStr] = normalized.split(":");
      const surahNum = parseInt(surahStr, 10);
      const ayahNum = parseInt(ayahStr, 10);

      const meta = getSurahMeta(surahNum);
      expect(meta?.nameArabic).toBe("النساء");
      expect(meta?.nameSimple).toBe("An-Nisa");

      const ayahArabic = toLocaleNumeral(ayahNum, "ar");
      expect(ayahArabic).toBe("١٠");

      const ayahEnglish = toLocaleNumeral(ayahNum, "en");
      expect(ayahEnglish).toBe("10");
    });
  });

  describe("Locale Direction for Form Placeholders", () => {
    it("resolves RTL for Arabic and LTR for English", () => {
      expect(getLanguageDirection("ar")).toBe("rtl");
      expect(getLanguageDirection("en")).toBe("ltr");
    });
  });
});
