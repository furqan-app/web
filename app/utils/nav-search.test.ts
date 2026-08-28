import { describe, expect, it } from "vitest";
import {
  foldDigits,
  jumpRows,
  juzStartPage,
  pageOfVerseKey,
  parseNavQuery,
  rangeHint,
  surahMatchesQuery,
} from "./nav-search";

const surah = (id: number, name_simple: string, name_arabic: string) => ({
  id,
  name_simple,
  name_arabic,
  translated_name: name_simple,
  verses_count: 7,
  revelation_place: "makkah",
  pages: "1-1",
});

describe("foldDigits", () => {
  it("folds Eastern Arabic and Extended digits to ASCII", () => {
    expect(foldDigits("٥")).toBe("5");
    expect(foldDigits("۳۰")).toBe("30");
    expect(foldDigits("جزء ٣٠")).toBe("جزء 30");
    expect(foldDigits("abc123")).toBe("abc123");
  });

  it("folds all Eastern Arabic digits (٠-٩)", () => {
    expect(foldDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("folds all Extended Arabic-Indic digits (۰-۹)", () => {
    expect(foldDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });
});

describe("parseNavQuery", () => {
  it("parses bare digits", () => {
    expect(parseNavQuery("67")).toEqual({ text: "67", number: 67, prefix: null, barePrefix: null });
    expect(parseNavQuery(" ٥ ")).toEqual({ text: "5", number: 5, prefix: null, barePrefix: null });
    expect(parseNavQuery("0")).toEqual({ text: "0", number: 0, prefix: null, barePrefix: null });
  });

  it("parses juz prefixes in both locales, including definite articles", () => {
    expect(parseNavQuery("juz 5")).toEqual({ text: "juz 5", number: 5, prefix: "juz", barePrefix: null });
    expect(parseNavQuery("JUZ5")).toEqual({ text: "JUZ5", number: 5, prefix: "juz", barePrefix: null });
    expect(parseNavQuery("al-juz 20")).toEqual({ text: "al-juz 20", number: 20, prefix: "juz", barePrefix: null });
    expect(parseNavQuery("  juz   12  ")).toEqual({ text: "juz   12", number: 12, prefix: "juz", barePrefix: null });
    expect(parseNavQuery("جزء ٣٠")).toEqual({ text: "جزء 30", number: 30, prefix: "juz", barePrefix: null });
    expect(parseNavQuery("جزء۳۰")).toEqual({ text: "جزء30", number: 30, prefix: "juz", barePrefix: null });
    expect(parseNavQuery("الجزء 20")).toEqual({ text: "الجزء 20", number: 20, prefix: "juz", barePrefix: null });
    expect(parseNavQuery("الجزء٢٠")).toEqual({ text: "الجزء20", number: 20, prefix: "juz", barePrefix: null });
  });

  it("parses page prefixes in both locales, including definite articles", () => {
    expect(parseNavQuery("page 562")).toEqual({ text: "page 562", number: 562, prefix: "page", barePrefix: null });
    expect(parseNavQuery("PAGE 100")).toEqual({ text: "PAGE 100", number: 100, prefix: "page", barePrefix: null });
    expect(parseNavQuery("p 50")).toEqual({ text: "p 50", number: 50, prefix: "page", barePrefix: null });
    expect(parseNavQuery("صفحة ٥٦٢")).toEqual({ text: "صفحة 562", number: 562, prefix: "page", barePrefix: null });
    expect(parseNavQuery("صفحة٥٦٢")).toEqual({ text: "صفحة562", number: 562, prefix: "page", barePrefix: null });
    expect(parseNavQuery("الصفحة 200")).toEqual({ text: "الصفحة 200", number: 200, prefix: "page", barePrefix: null });
    expect(parseNavQuery("الصفحة٢٠٠")).toEqual({ text: "الصفحة200", number: 200, prefix: "page", barePrefix: null });
  });

  it("detects bare prefix keywords without a number", () => {
    expect(parseNavQuery("juz")).toEqual({ text: "juz", number: null, prefix: null, barePrefix: "juz" });
    expect(parseNavQuery("al-juz")).toEqual({ text: "al-juz", number: null, prefix: null, barePrefix: "juz" });
    expect(parseNavQuery("جزء")).toEqual({ text: "جزء", number: null, prefix: null, barePrefix: "juz" });
    expect(parseNavQuery("الجزء")).toEqual({ text: "الجزء", number: null, prefix: null, barePrefix: "juz" });
    expect(parseNavQuery("page")).toEqual({ text: "page", number: null, prefix: null, barePrefix: "page" });
    expect(parseNavQuery("p")).toEqual({ text: "p", number: null, prefix: null, barePrefix: "page" });
    expect(parseNavQuery("صفحة")).toEqual({ text: "صفحة", number: null, prefix: null, barePrefix: "page" });
    expect(parseNavQuery("الصفحة")).toEqual({ text: "الصفحة", number: null, prefix: null, barePrefix: "page" });
  });

  it("strips surah / سورة / السورة prefixes cleanly", () => {
    expect(parseNavQuery("surah 5")).toEqual({ text: "5", number: 5, prefix: null, barePrefix: null });
    expect(parseNavQuery("surah mulk")).toEqual({ text: "mulk", number: null, prefix: null, barePrefix: null });
    expect(parseNavQuery("سورة الكهف")).toEqual({ text: "الكهف", number: null, prefix: null, barePrefix: null });
    expect(parseNavQuery("سورة 18")).toEqual({ text: "18", number: 18, prefix: null, barePrefix: null });
    expect(parseNavQuery("السورة ١٨")).toEqual({ text: "18", number: 18, prefix: null, barePrefix: null });
  });

  it("treats non-prefix alphanumeric words as text", () => {
    expect(parseNavQuery("page abc")).toEqual({ text: "page abc", number: null, prefix: null, barePrefix: null });
    expect(parseNavQuery("ayah 12")).toEqual({ text: "ayah 12", number: null, prefix: null, barePrefix: null });
  });

  it("returns an empty parse for blank input", () => {
    expect(parseNavQuery("   ")).toEqual({ text: "", number: null, prefix: null, barePrefix: null });
  });
});

describe("surahMatchesQuery", () => {
  const mulk = surah(67, "Al-Mulk", "الملك");
  const anam = surah(6, "Al-An'am", "الأنعام");
  const kahf = surah(18, "Al-Kahf", "الكهف");
  const isra = surah(17, "Al-Isra", "الإسراء");
  const nas = surah(114, "An-Nas", "الناس");

  it("matches names case-insensitively", () => {
    expect(surahMatchesQuery(mulk, parseNavQuery("mulk"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("MULK"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("kahf"))).toBe(false);
  });

  it("matches names when prefixed with surah / سورة", () => {
    expect(surahMatchesQuery(kahf, parseNavQuery("سورة الكهف"))).toBe(true);
    expect(surahMatchesQuery(kahf, parseNavQuery("السورة 18"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("surah mulk"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("surah 67"))).toBe(true);
  });

  it("matches partial name substrings", () => {
    expect(surahMatchesQuery(mulk, parseNavQuery("ul"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("لك"))).toBe(true);
  });

  it("matches Arabic names with hamza folding on both sides", () => {
    // Data has أ; the typed query uses bare ا
    expect(surahMatchesQuery(anam, parseNavQuery("الانعام"))).toBe(true);
    expect(surahMatchesQuery(anam, parseNavQuery("الأنعام"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("الملك"))).toBe(true);
    // Data has إ; typed query uses bare ا
    expect(surahMatchesQuery(isra, parseNavQuery("الاسراء"))).toBe(true);
    expect(surahMatchesQuery(isra, parseNavQuery("الإسراء"))).toBe(true);
  });

  it("matches exact surah numbers on bare digits only", () => {
    expect(surahMatchesQuery(mulk, parseNavQuery("67"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("6"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("200"))).toBe(false);
    expect(surahMatchesQuery(nas, parseNavQuery("114"))).toBe(true);
    expect(surahMatchesQuery(nas, parseNavQuery("115"))).toBe(false);
  });

  it("matches exact surah numbers when typed in Eastern Arabic numerals", () => {
    expect(surahMatchesQuery(mulk, parseNavQuery("٦٧"))).toBe(true);
    expect(surahMatchesQuery(anam, parseNavQuery("٦"))).toBe(true);
  });

  it("never matches cards on prefixed or bare-prefix queries", () => {
    expect(surahMatchesQuery(surah(5, "Al-Ma'idah", "المائدة"), parseNavQuery("juz 5"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("page 67"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("صفحة ٦٧"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("جزء"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("الجزء"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("صفحة"))).toBe(false);
  });
});

describe("jumpRows", () => {
  it("bare digits surface every valid intent", () => {
    expect(jumpRows(parseNavQuery("5"))).toEqual([
      { kind: "juz", n: 5 },
      { kind: "page", n: 5 },
    ]);
    // Juz 67 does not exist — page row only.
    expect(jumpRows(parseNavQuery("67"))).toEqual([{ kind: "page", n: 67 }]);
  });

  it("handles boundary bare digits", () => {
    expect(jumpRows(parseNavQuery("1"))).toEqual([
      { kind: "juz", n: 1 },
      { kind: "page", n: 1 },
    ]);
    expect(jumpRows(parseNavQuery("30"))).toEqual([
      { kind: "juz", n: 30 },
      { kind: "page", n: 30 },
    ]);
    expect(jumpRows(parseNavQuery("31"))).toEqual([{ kind: "page", n: 31 }]);
    expect(jumpRows(parseNavQuery("604"))).toEqual([{ kind: "page", n: 604 }]);
  });

  it("omits out-of-range bare intents silently", () => {
    expect(jumpRows(parseNavQuery("605"))).toEqual([]);
    expect(jumpRows(parseNavQuery("700"))).toEqual([]);
    expect(jumpRows(parseNavQuery("0"))).toEqual([]);
  });

  it("prefixed queries yield exactly their own row", () => {
    expect(jumpRows(parseNavQuery("juz ٣٠"))).toEqual([{ kind: "juz", n: 30 }]);
    expect(jumpRows(parseNavQuery("page 604"))).toEqual([{ kind: "page", n: 604 }]);
    expect(jumpRows(parseNavQuery("juz 31"))).toEqual([]);
    expect(jumpRows(parseNavQuery("page 605"))).toEqual([]);
    expect(jumpRows(parseNavQuery("page 0"))).toEqual([]);
  });

  it("text queries yield no rows", () => {
    expect(jumpRows(parseNavQuery("mulk"))).toEqual([]);
  });
});

describe("rangeHint", () => {
  it("hints only for out-of-range prefixed queries", () => {
    expect(rangeHint(parseNavQuery("page 999"))).toBe("page");
    expect(rangeHint(parseNavQuery("page 605"))).toBe("page");
    expect(rangeHint(parseNavQuery("page 0"))).toBe("page");
    expect(rangeHint(parseNavQuery("juz 31"))).toBe("juz");
    expect(rangeHint(parseNavQuery("juz 0"))).toBe("juz");
    expect(rangeHint(parseNavQuery("page 604"))).toBe(null);
    expect(rangeHint(parseNavQuery("page 1"))).toBe(null);
    expect(rangeHint(parseNavQuery("juz 30"))).toBe(null);
    expect(rangeHint(parseNavQuery("juz 1"))).toBe(null);
    expect(rangeHint(parseNavQuery("999"))).toBe(null);
    expect(rangeHint(parseNavQuery("mulk"))).toBe(null);
  });
});

describe("juz start resolution", () => {
  const starts = [
    { juz: 1, verse_key: "1:1", defaultPage: 1 },
    { juz: 2, verse_key: "2:142", defaultPage: 22 },
  ];

  it("falls back to defaultPage until verse-pages loads", () => {
    expect(pageOfVerseKey(undefined, "2:142", 22)).toBe(22);
    expect(juzStartPage(starts, 2)).toBe(22);
    expect(juzStartPage(starts, 9)).toBe(null);
  });

  it("prefers the active edition's page once loaded (ADR 0033)", () => {
    expect(pageOfVerseKey({ "2:142": 23 }, "2:142", 22)).toBe(23);
    expect(pageOfVerseKey({}, "2:142", 22)).toBe(22);
  });
});
