import { describe, expect, it } from "vitest";
import {
  MUSHAF_FIRST_VERSE,
  MUSHAF_LAST_VERSE,
  pageFirstVerseOrdinal,
  pageLastVerseOrdinal,
  pageOfVerse,
  pageVerseCount,
  parseVerseOrdinal,
  verseKeyOfOrdinal,
  verseOrdinalOfKey,
} from "@/app/lib/plans/verse-index";

describe("verse-index", () => {
  it("total verse count matches the mushaf constant", () => {
    // pageOfVerse succeeding at both ends is proof the index covers 1..6236
    // without throwing (buildIndex asserts the sum internally too).
    expect(() => pageOfVerse(MUSHAF_FIRST_VERSE)).not.toThrow();
    expect(() => pageOfVerse(MUSHAF_LAST_VERSE)).not.toThrow();
  });

  it("verse 1 is 1:1 on page 1", () => {
    expect(verseKeyOfOrdinal(1)).toBe("1:1");
    expect(pageOfVerse(1)).toBe(1);
  });

  it("the last verse is 114:6 on page 604", () => {
    expect(verseKeyOfOrdinal(MUSHAF_LAST_VERSE)).toBe("114:6");
    expect(pageOfVerse(MUSHAF_LAST_VERSE)).toBe(604);
  });

  it("page 1 (Al-Fatiha) has 7 verses, ordinals 1-7", () => {
    expect(pageFirstVerseOrdinal(1)).toBe(1);
    expect(pageLastVerseOrdinal(1)).toBe(7);
    expect(pageVerseCount(1)).toBe(7);
  });

  it("round-trips: pageOfVerse(pageFirstVerseOrdinal(p)) === p for boundary pages", () => {
    for (const page of [1, 2, 300, 603, 604]) {
      expect(pageOfVerse(pageFirstVerseOrdinal(page))).toBe(page);
      expect(pageOfVerse(pageLastVerseOrdinal(page))).toBe(page);
    }
  });

  it("consecutive pages have contiguous verse ordinals", () => {
    expect(pageFirstVerseOrdinal(2)).toBe(pageLastVerseOrdinal(1) + 1);
  });

  it("throws on an out-of-range ordinal", () => {
    expect(() => pageOfVerse(0)).toThrow();
    expect(() => pageOfVerse(MUSHAF_LAST_VERSE + 1)).toThrow();
  });

  it("resolves verse keys to ordinals via verseOrdinalOfKey", () => {
    expect(verseOrdinalOfKey("1:1")).toBe(1);
    expect(verseOrdinalOfKey("1:7")).toBe(7);
    expect(verseOrdinalOfKey("2:1")).toBe(8);
    expect(verseOrdinalOfKey("2:255")).toBe(262);
    expect(verseOrdinalOfKey("114:6")).toBe(MUSHAF_LAST_VERSE);
    expect(verseOrdinalOfKey("999:1")).toBeNull();
    expect(verseOrdinalOfKey("invalid")).toBeNull();
  });

  it("parses both ordinals and keys via parseVerseOrdinal", () => {
    expect(parseVerseOrdinal(1)).toBe(1);
    expect(parseVerseOrdinal(6236)).toBe(6236);
    expect(parseVerseOrdinal(0)).toBeNull();
    expect(parseVerseOrdinal(6237)).toBeNull();
    expect(parseVerseOrdinal(" 2:255 ")).toBe(262);
    expect(parseVerseOrdinal("262")).toBe(262);
    expect(parseVerseOrdinal(" 262 ")).toBe(262);
    expect(parseVerseOrdinal("0")).toBeNull();
    expect(parseVerseOrdinal("6237")).toBeNull();
    expect(parseVerseOrdinal("999:1")).toBeNull();
    expect(parseVerseOrdinal(null)).toBeNull();
    expect(parseVerseOrdinal(undefined)).toBeNull();
  });
});
