import { describe, expect, it } from "vitest";
import { formatVerseSharePayload } from "./share-verse";

const BASE = {
  verseText: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
  surahName: "الفاتحة",
  ayahNum: 1,
};

describe("formatVerseSharePayload", () => {
  it("wraps verse text in Quranic brackets", () => {
    const result = formatVerseSharePayload({ ...BASE, locale: "ar" });
    expect(result).toContain(`﴿ ${BASE.verseText} ﴾`);
  });

  it("Arabic locale: surahPrefix = سورة, Eastern Arabic numerals", () => {
    const result = formatVerseSharePayload({ ...BASE, locale: "ar" });
    expect(result).toContain("\nسورة الفاتحة: ١");
  });

  it("English locale: surahPrefix = Surah, Western numerals", () => {
    const result = formatVerseSharePayload({
      ...BASE,
      surahName: "Al-Fatihah",
      locale: "en",
    });
    expect(result).toContain("\nSurah Al-Fatihah: 1");
  });

  it("full payload structure matches expected format", () => {
    const result = formatVerseSharePayload({
      ...BASE,
      surahName: "Al-Fatihah",
      locale: "en",
    });
    expect(result).toBe(`﴿ ${BASE.verseText} ﴾\nSurah Al-Fatihah: 1`);
  });

  it("sends the full verse text even for a very long verse (no cap)", () => {
    const longVerse = "word ".repeat(300).trim();
    const result = formatVerseSharePayload({
      verseText: longVerse,
      surahName: "Al-Baqarah",
      ayahNum: 282,
      locale: "en",
    });
    expect(result).toContain(longVerse);
    expect(result).not.toContain("…");
  });
});
