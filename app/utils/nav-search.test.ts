import { describe, expect, it } from "vitest";
import {
  foldDigits,
  jumpRows,
  juzStartPage,
  pageOfVerseKey,
  parseAyahNumber,
  parseNavQuery,
  rangeHint,
  rubMatchesQuery,
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

const rub = (rub_number: number, chapter_number: number) =>
  ({
    id: rub_number,
    rub_number,
    rubVerseMappings: [{ chapter_number }],
  }) as Parameters<typeof rubMatchesQuery>[0];

describe("foldDigits", () => {
  it("folds Eastern Arabic and Extended digits to ASCII", () => {
    expect(foldDigits("٥")).toBe("5");
    expect(foldDigits("۳۰")).toBe("30");
    expect(foldDigits("جزء ٣٠")).toBe("جزء 30");
    expect(foldDigits("abc123")).toBe("abc123");
  });
});

describe("parseNavQuery", () => {
  it("parses bare digits", () => {
    expect(parseNavQuery("67")).toEqual({ text: "67", number: 67, prefix: null });
    expect(parseNavQuery(" ٥ ")).toEqual({ text: "5", number: 5, prefix: null });
  });

  it("parses juz prefixes in both locales", () => {
    expect(parseNavQuery("juz 5")).toEqual({ text: "juz 5", number: 5, prefix: "juz" });
    expect(parseNavQuery("JUZ5")).toEqual({ text: "JUZ5", number: 5, prefix: "juz" });
    expect(parseNavQuery("جزء ٣٠")).toEqual({ text: "جزء 30", number: 30, prefix: "juz" });
  });

  it("parses page prefixes in both locales", () => {
    expect(parseNavQuery("page 562")).toEqual({ text: "page 562", number: 562, prefix: "page" });
    expect(parseNavQuery("صفحة ٥٦٢")).toEqual({ text: "صفحة 562", number: 562, prefix: "page" });
  });

  it("parses hizb and rub prefixes in both locales (sidebar grammar)", () => {
    expect(parseNavQuery("hizb 12")).toEqual({ text: "hizb 12", number: 12, prefix: "hizb" });
    expect(parseNavQuery("حزب ١٢")).toEqual({ text: "حزب 12", number: 12, prefix: "hizb" });
    expect(parseNavQuery("rub 200")).toEqual({ text: "rub 200", number: 200, prefix: "rub" });
    expect(parseNavQuery("ربع ٢٠٠")).toEqual({ text: "ربع 200", number: 200, prefix: "rub" });
  });

  it("treats prefix without a number as text", () => {
    expect(parseNavQuery("juz")).toEqual({ text: "juz", number: null, prefix: null });
    expect(parseNavQuery("page abc")).toEqual({ text: "page abc", number: null, prefix: null });
  });

  it("returns an empty parse for blank input", () => {
    expect(parseNavQuery("   ")).toEqual({ text: "", number: null, prefix: null });
  });
});

describe("surahMatchesQuery", () => {
  const mulk = surah(67, "Al-Mulk", "الملك");
  const anam = surah(6, "Al-An'am", "الأنعام");

  it("matches names case-insensitively", () => {
    expect(surahMatchesQuery(mulk, parseNavQuery("mulk"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("MULK"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("kahf"))).toBe(false);
  });

  it("matches Arabic names with hamza folding on both sides", () => {
    // Data has أ; the typed query uses bare ا — the documented overlay mismatch.
    expect(surahMatchesQuery(anam, parseNavQuery("الانعام"))).toBe(true);
    expect(surahMatchesQuery(anam, parseNavQuery("الأنعام"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("الملك"))).toBe(true);
  });

  it("matches exact surah numbers on bare digits only", () => {
    expect(surahMatchesQuery(mulk, parseNavQuery("67"))).toBe(true);
    expect(surahMatchesQuery(mulk, parseNavQuery("6"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("200"))).toBe(false);
  });

  it("never matches cards on prefixed queries", () => {
    expect(surahMatchesQuery(surah(5, "Al-Ma'idah", "المائدة"), parseNavQuery("juz 5"))).toBe(false);
    expect(surahMatchesQuery(mulk, parseNavQuery("page 67"))).toBe(false);
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

  it("omits out-of-range bare intents silently", () => {
    expect(jumpRows(parseNavQuery("700"))).toEqual([]);
    expect(jumpRows(parseNavQuery("0"))).toEqual([]);
  });

  it("prefixed queries yield exactly their own row", () => {
    expect(jumpRows(parseNavQuery("juz ٣٠"))).toEqual([{ kind: "juz", n: 30 }]);
    expect(jumpRows(parseNavQuery("page 604"))).toEqual([{ kind: "page", n: 604 }]);
    expect(jumpRows(parseNavQuery("juz 31"))).toEqual([]);
  });

  it("text queries yield no rows", () => {
    expect(jumpRows(parseNavQuery("mulk"))).toEqual([]);
  });
});

describe("rangeHint", () => {
  it("hints only for out-of-range prefixed queries", () => {
    expect(rangeHint(parseNavQuery("page 999"))).toBe("page");
    expect(rangeHint(parseNavQuery("juz 31"))).toBe("juz");
    expect(rangeHint(parseNavQuery("page 604"))).toBe(null);
    expect(rangeHint(parseNavQuery("999"))).toBe(null);
    expect(rangeHint(parseNavQuery("mulk"))).toBe(null);
  });

  it("never hints for sidebar-only prefixes (home regression guard)", () => {
    expect(rangeHint(parseNavQuery("hizb 99"))).toBe(null);
    expect(rangeHint(parseNavQuery("rub 999"))).toBe(null);
    expect(jumpRows(parseNavQuery("hizb 3"))).toEqual([]);
    expect(jumpRows(parseNavQuery("rub 3"))).toEqual([]);
  });
});

describe("rubMatchesQuery (sidebar rubs tab)", () => {
  const surahs = new Map([
    [19, surah(19, "Maryam", "مريم")],
    [2, surah(2, "Al-Baqarah", "البقرة")],
  ]);
  // rub 17 = first rub of juz 3; rub 9 = first rub of hizb 3
  const r17 = rub(17, 2);
  const r9 = rub(9, 2);
  const r3 = rub(3, 1);
  const maryamRub = rub(65, 19);

  it("bare number is the union of juz/hizb/rub", () => {
    const p = parseNavQuery("3");
    expect(rubMatchesQuery(r17, p, surahs)).toBe(true); // juz 3
    expect(rubMatchesQuery(r9, p, surahs)).toBe(true); // hizb 3
    expect(rubMatchesQuery(r3, p, surahs)).toBe(true); // rub 3
    expect(rubMatchesQuery(maryamRub, p, surahs)).toBe(false);
  });

  it("prefixes scope to one division", () => {
    expect(rubMatchesQuery(r17, parseNavQuery("جزء ٣"), surahs)).toBe(true);
    expect(rubMatchesQuery(r9, parseNavQuery("جزء ٣"), surahs)).toBe(false);
    expect(rubMatchesQuery(r9, parseNavQuery("حزب ٣"), surahs)).toBe(true);
    expect(rubMatchesQuery(r3, parseNavQuery("ربع ٣"), surahs)).toBe(true);
    expect(rubMatchesQuery(r3, parseNavQuery("حزب ٣"), surahs)).toBe(false);
  });

  it("page prefix matches no rubs (not a rub division)", () => {
    expect(rubMatchesQuery(r3, parseNavQuery("page 3"), surahs)).toBe(false);
  });

  it("text matches the associated surah name, hamza-folded", () => {
    expect(rubMatchesQuery(maryamRub, parseNavQuery("مريم"), surahs)).toBe(true);
    expect(rubMatchesQuery(maryamRub, parseNavQuery("maryam"), surahs)).toBe(true);
    expect(rubMatchesQuery(r17, parseNavQuery("البقرة"), surahs)).toBe(true);
    expect(rubMatchesQuery(r17, parseNavQuery("kahf"), surahs)).toBe(false);
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

describe("parseAyahNumber (ayah picker input)", () => {
  it("accepts ASCII and Arabic-Indic whole numbers", () => {
    expect(parseAyahNumber("255")).toBe(255);
    expect(parseAyahNumber("٢٥٥")).toBe(255);
    expect(parseAyahNumber(" 7 ")).toBe(7);
  });

  it("rejects non-numeric and partial input", () => {
    expect(parseAyahNumber("abc")).toBe(null);
    expect(parseAyahNumber("12a")).toBe(null);
    expect(parseAyahNumber("2:255")).toBe(null);
    expect(parseAyahNumber("")).toBe(null);
  });
});
