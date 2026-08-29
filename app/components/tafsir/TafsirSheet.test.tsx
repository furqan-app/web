import { describe, expect, it, vi } from "vitest";
import {
  parseTafsirSegments,
  formatTafsirHtml,
  formatVerseSnippet,
  normalizeVerseKey,
} from "@/app/utils/tafsir-formatter";
import {
  getNextAyahKey,
  getPreviousAyahKey,
  getSurahMeta,
  getSurahVerseCount,
} from "@/app/utils/quran-navigation";
import { TAFSIR_EDITIONS, DEFAULT_TAFSIR_ID, getTafsirEdition } from "@/app/constants/tafsir";

// Mock next-intl hooks for testing
vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    if (params) {
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        key
      );
    }
    return key;
  },
}));

describe("Tafsir Component & Navigation Architecture", () => {
  describe("Tafsir Editions Catalog", () => {
    it("provides the 6 primary Arabic tafsir editions", () => {
      expect(TAFSIR_EDITIONS.length).toBe(6);
      expect(TAFSIR_EDITIONS.map((e) => e.id)).toEqual([16, 91, 14, 94, 15, 90]);
    });

    it("has Al-Muyassar (16) as default tafsir id", () => {
      expect(DEFAULT_TAFSIR_ID).toBe(16);
      const defaultEdition = getTafsirEdition(DEFAULT_TAFSIR_ID);
      expect(defaultEdition?.name).toBe("التفسير الميسر");
      expect(defaultEdition?.authorName).toBe("مجمع الملك فهد لطباعة المصحف الشريف");
    });

    it("retrieves each edition correctly by id", () => {
      expect(getTafsirEdition(91)?.name).toContain("السعدي");
      expect(getTafsirEdition(14)?.name).toContain("ابن كثير");
      expect(getTafsirEdition(94)?.name).toContain("البغوي");
      expect(getTafsirEdition(15)?.name).toContain("الطبري");
      expect(getTafsirEdition(90)?.name).toContain("القرطبي");
      expect(getTafsirEdition(999)).toBeUndefined();
    });
  });

  describe("Verse Key Normalization & Snippet Formatting", () => {
    it("normalizes verse keys with boundary validation", () => {
      expect(normalizeVerseKey("1:1")).toBe("1:1");
      expect(normalizeVerseKey("002:005")).toBe("2:5");
      expect(normalizeVerseKey(" 3 : 16 ")).toBe("3:16");
      expect(normalizeVerseKey("114:6")).toBe("114:6");
      expect(normalizeVerseKey("invalid")).toBeNull();
      expect(normalizeVerseKey("1:8")).toBeNull(); // Al-Fatihah only has 7 verses
      expect(normalizeVerseKey("115:1")).toBeNull(); // Only 114 surahs
    });

    it("formats verse snippets with authentic Uthmanic brackets", () => {
      expect(formatVerseSnippet("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 7)).toBe(
        "﴿بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ﴾"
      );
      expect(
        formatVerseSnippet(
          "الم ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ",
          4
        )
      ).toBe("﴿الم ذَٰلِكَ الْكِتَابُ لَا…﴾");
      expect(formatVerseSnippet(null)).toBeNull();
    });
  });

  describe("Ayah Stepper Navigation Across Boundaries", () => {
    it("handles first ayah of Quran (1:1)", () => {
      expect(getPreviousAyahKey("1:1")).toBeNull();
      expect(getNextAyahKey("1:1")).toBe("1:2");
    });

    it("handles middle ayahs within a surah", () => {
      expect(getPreviousAyahKey("2:150")).toBe("2:149");
      expect(getNextAyahKey("2:150")).toBe("2:151");
    });

    it("handles surah boundaries: Al-Fatihah to Al-Baqarah", () => {
      // 1:7 is last ayah of Al-Fatihah
      expect(getNextAyahKey("1:7")).toBe("2:1");
      // 2:1 stepping back lands on 1:7
      expect(getPreviousAyahKey("2:1")).toBe("1:7");
    });

    it("handles surah boundaries: Al-Baqarah to Ali 'Imran", () => {
      // 2:286 is last ayah of Al-Baqarah
      expect(getNextAyahKey("2:286")).toBe("3:1");
      // 3:1 stepping back lands on 2:286
      expect(getPreviousAyahKey("3:1")).toBe("2:286");
    });

    it("handles last ayah of Quran (114:6)", () => {
      expect(getNextAyahKey("114:6")).toBeNull();
      expect(getPreviousAyahKey("114:6")).toBe("114:5");
    });
  });

  describe("Surah Metadata & Verse Counts", () => {
    it("retrieves accurate surah names and counts for header rendering", () => {
      const fatihah = getSurahMeta(1);
      expect(fatihah?.nameArabic).toBe("الفاتحة");
      expect(fatihah?.versesCount).toBe(7);

      const baqarah = getSurahMeta(2);
      expect(baqarah?.nameArabic).toBe("البقرة");
      expect(baqarah?.versesCount).toBe(286);

      const nas = getSurahMeta(114);
      expect(nas?.nameArabic).toBe("الناس");
      expect(nas?.versesCount).toBe(6);

      expect(getSurahVerseCount(1)).toBe(7);
      expect(getSurahVerseCount(114)).toBe(6);
      expect(getSurahVerseCount(999)).toBe(0);
    });
  });

  describe("Tafsir Content & Quote Typography", () => {
    it("parses and structures Quranic quotes with authentic Uthmanic brackets", () => {
      const input = `قال تعالى: <span class="arabic qpc-hafs green">{ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ }</span> وهو الحي القيوم.`;
      const segments = parseTafsirSegments(input);

      expect(segments).toEqual([
        { type: "text", text: "قال تعالى: " },
        { type: "quran", text: "﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ﴾" },
        { type: "text", text: " وهو الحي القيوم." },
      ]);
    });

    it("formats HTML output with font-uthmanic class and dir=rtl", () => {
      const input = `<span class="green">(الْحَمْدُ لِلَّهِ)</span> الشكر لله وحده.`;
      const html = formatTafsirHtml(input);

      expect(html).toContain('class="font-uthmanic text-primary" dir="rtl"');
      expect(html).toContain("﴿الْحَمْدُ لِلَّهِ﴾");
      expect(html).toContain("الشكر لله وحده.");
    });
  });
});
