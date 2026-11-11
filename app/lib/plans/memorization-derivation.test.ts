import { describe, expect, it } from "vitest";
import {
  buildMemorizationMap,
  getSurahPageList,
  deriveSurahMemorization,
  deriveGlobalMemorizationStats,
  type UserMemorizationRecord,
} from "./memorization-derivation";

describe("memorization-derivation", () => {
  it("buildMemorizationMap indexes records by chapter_id and page_number", () => {
    const records: UserMemorizationRecord[] = [
      { chapter_id: 112, page_number: 604, status: "mastered" },
      { chapter_id: 1, page_number: 1, status: "needs_review" },
    ];
    const map = buildMemorizationMap(records);
    expect(map[112][604]).toBe("mastered");
    expect(map[1][1]).toBe("needs_review");
    expect(map[113]).toBeUndefined();
  });

  it("getSurahPageList returns correct page sequences", () => {
    expect(getSurahPageList(1)).toEqual([1]);
    expect(getSurahPageList(112)).toEqual([604]);
    const baqarahPages = getSurahPageList(2);
    expect(baqarahPages.length).toBe(48);
    expect(baqarahPages[0]).toBe(2);
    expect(baqarahPages[baqarahPages.length - 1]).toBe(49);
  });

  it("Case 1: Al-Ikhlas (surah 112) independence on shared page 604", () => {
    const map = buildMemorizationMap([
      { chapter_id: 112, page_number: 604, status: "mastered" },
    ]);
    const ikhlas = deriveSurahMemorization(112, map[112]);
    expect(ikhlas.status).toBe("mastered");
    expect(ikhlas.totalPages).toBe(1);
    expect(ikhlas.masteredPages).toBe(1);
    expect(ikhlas.memorizedPercentage).toBe(100);
    expect(ikhlas.liquidFillPercentage).toBe(100);

    // Al-Falaq (113) and An-Nas (114) share page 604, but are unmemorized
    const falaq = deriveSurahMemorization(113, map[113]);
    expect(falaq.status).toBe("unmemorized");
    expect(falaq.memorizedPages).toBe(0);

    const nas = deriveSurahMemorization(114, map[114]);
    expect(nas.status).toBe("unmemorized");
    expect(nas.memorizedPages).toBe(0);
  });

  it("Case 2: Al-Baqarah (48 pages) partial memorization", () => {
    // Mark first 24 pages (2 to 25) as mastered
    const records: UserMemorizationRecord[] = [];
    for (let p = 2; p <= 25; p++) {
      records.push({ chapter_id: 2, page_number: p, status: "mastered" });
    }
    const map = buildMemorizationMap(records);
    const baqarah = deriveSurahMemorization(2, map[2]);

    expect(baqarah.status).toBe("partial");
    expect(baqarah.totalPages).toBe(48);
    expect(baqarah.masteredPages).toBe(24);
    expect(baqarah.needsReviewPages).toBe(0);
    expect(baqarah.memorizedPercentage).toBe(50);
    expect(baqarah.liquidFillPercentage).toBe(50);
  });

  it("Case 3: Maryam (8 pages) mixed retention", () => {
    // 6 mastered (305–310) + 2 needs_review (311–312)
    const records: UserMemorizationRecord[] = [
      { chapter_id: 19, page_number: 305, status: "mastered" },
      { chapter_id: 19, page_number: 306, status: "mastered" },
      { chapter_id: 19, page_number: 307, status: "mastered" },
      { chapter_id: 19, page_number: 308, status: "mastered" },
      { chapter_id: 19, page_number: 309, status: "mastered" },
      { chapter_id: 19, page_number: 310, status: "mastered" },
      { chapter_id: 19, page_number: 311, status: "needs_review" },
      { chapter_id: 19, page_number: 312, status: "needs_review" },
    ];
    const map = buildMemorizationMap(records);
    const maryam = deriveSurahMemorization(19, map[19]);

    expect(maryam.status).toBe("partial");
    expect(maryam.totalPages).toBe(8);
    expect(maryam.masteredPages).toBe(6);
    expect(maryam.needsReviewPages).toBe(2);
    expect(maryam.memorizedPages).toBe(8);
    expect(maryam.memorizedPercentage).toBe(100);
    expect(maryam.masteredPercentage).toBe(75);
    expect(maryam.needsReviewPercentage).toBe(25);
  });

  it("Case 4: Solid needs_review when all pages are needs_review", () => {
    // Al-Kahf (pages 293–304 = 12 pages)
    const records: UserMemorizationRecord[] = [];
    for (let p = 293; p <= 304; p++) {
      records.push({ chapter_id: 18, page_number: p, status: "needs_review" });
    }
    const map = buildMemorizationMap(records);
    const kahf = deriveSurahMemorization(18, map[18]);

    expect(kahf.status).toBe("needs_review");
    expect(kahf.totalPages).toBe(12);
    expect(kahf.needsReviewPages).toBe(12);
    expect(kahf.masteredPages).toBe(0);
    expect(kahf.memorizedPercentage).toBe(100);
  });

  it("deriveGlobalMemorizationStats calculates aggregate metrics across 114 surahs", () => {
    const records: UserMemorizationRecord[] = [
      { chapter_id: 1, page_number: 1, status: "mastered" },
      { chapter_id: 112, page_number: 604, status: "mastered" },
      { chapter_id: 113, page_number: 604, status: "needs_review" },
    ];
    const map = buildMemorizationMap(records);
    const stats = deriveGlobalMemorizationStats(map);

    // Physical pages: page 1 and page 604 -> exactly 2 unique physical pages
    // Mutually exclusive: page 1 is purely mastered; page 604 has needs_review so it takes precedence.
    expect(stats.totalPagesMemorized).toBe(2);
    expect(stats.totalMasteredPages).toBe(1); // page 1 purely mastered
    expect(stats.totalNeedsReviewPages).toBe(1); // page 604 needs review
    expect(stats.totalMasteredPages + stats.totalNeedsReviewPages).toBe(stats.totalPagesMemorized);
    expect(stats.masteredSurahsCount).toBe(2); // Surah 1 and Surah 112
    expect(stats.needsReviewSurahsCount).toBe(1); // Surah 113
    expect(stats.unmemorizedSurahsCount).toBe(111);
  });
});
