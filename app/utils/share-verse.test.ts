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

  it("maxLength: leaves the payload unbounded when it already fits", () => {
    const bounded = formatVerseSharePayload({
      ...BASE,
      surahName: "Al-Fatihah",
      locale: "en",
      maxLength: 280,
      continueReadingLabel: "Continue reading",
    });
    const unbounded = formatVerseSharePayload({
      ...BASE,
      surahName: "Al-Fatihah",
      locale: "en",
    });
    expect(bounded).toBe(unbounded);
  });

  it("maxLength: truncates a long verse at a word boundary, never mid-word", () => {
    const longVerse =
      "Alif Laam Meem Saad Kaaf Haa Yaa Ain Saad word after word after word to overflow the budget comfortably past any reasonable X limit for testing purposes only";
    const result = formatVerseSharePayload({
      verseText: longVerse,
      surahName: "Al-Baqarah",
      ayahNum: 282,
      locale: "en",
      maxLength: 100,
      continueReadingLabel: "Continue reading",
    });
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).toContain("…");
    expect(result).toContain("Continue reading");
    // the truncated fragment (between ﴿ and …) must end on a full word, not mid-word
    const fragment = result.slice(result.indexOf("﴿ ") + 2, result.indexOf("…"));
    expect(longVerse.startsWith(fragment.trimEnd())).toBe(true);
    expect(longVerse[fragment.trimEnd().length]).toBe(" ");
  });

  it("maxLength: drops the verse text entirely when no word boundary fits the budget", () => {
    const result = formatVerseSharePayload({
      verseText: "Supercalifragilisticexpialidocious",
      surahName: "Al-Baqarah",
      ayahNum: 282,
      locale: "en",
      maxLength: 40,
      continueReadingLabel: "Continue reading",
    });
    expect(result).not.toContain("﴿");
    expect(result).toContain("Continue reading");
  });
});
