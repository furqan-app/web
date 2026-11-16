import { describe, expect, it } from "vitest";
import { diagnoseHeartMemorization } from "./heart-pulse-algorithm";
import type { MemorizationMap } from "./memorization-derivation";

describe("heart-pulse-algorithm", () => {
  it("diagnoses empty heart state in ascending order (An-Nas downwards)", () => {
    const emptyMap: MemorizationMap = {};
    const diagnosis = diagnoseHeartMemorization(emptyMap, "ascending");

    expect(diagnosis.masteredPagesCount).toBe(0);
    expect(diagnosis.slippingPagesCount).toBe(0);
    expect(diagnosis.unmemorizedPagesCount).toBe(604);
    expect(diagnosis.gapSurahsCount).toBe(0);
    expect(diagnosis.unmemorizedSurahsCount).toBe(114);
    expect(diagnosis.slippingQueue).toHaveLength(0);

    // Starts at Surah 114 (An-Nas) on page 604
    expect(diagnosis.targetQueue[0]).toEqual({
      chapterId: 114,
      pageNumber: 604,
    });
    // Followed by Surah 113 (Al-Falaq) on page 604
    expect(diagnosis.targetQueue[1]).toEqual({
      chapterId: 113,
      pageNumber: 604,
    });
    // Last item is Surah 1 (Al-Fatihah) on page 1
    const lastItem = diagnosis.targetQueue[diagnosis.targetQueue.length - 1];
    expect(lastItem).toEqual({
      chapterId: 1,
      pageNumber: 1,
    });
  });

  it("diagnoses empty heart state in descending order (Al-Baqarah downwards)", () => {
    const emptyMap: MemorizationMap = {};
    const diagnosis = diagnoseHeartMemorization(emptyMap, "descending");

    expect(diagnosis.slippingPagesCount).toBe(0);
    // Starts at Surah 2 (Al-Baqarah) on page 2
    expect(diagnosis.targetQueue[0]).toEqual({
      chapterId: 2,
      pageNumber: 2,
    });
    // Ends with Surah 1 (Al-Fatihah) on page 1
    const lastItem = diagnosis.targetQueue[diagnosis.targetQueue.length - 1];
    expect(lastItem).toEqual({
      chapterId: 1,
      pageNumber: 1,
    });
  });

  it("skips 100% mastered surahs and targets gap surahs first along the path", () => {
    const map: MemorizationMap = {
      // Surah 114 (An-Nas, 1 page 604) is 100% mastered
      114: { 604: "mastered" },
      // Surah 113 (Al-Falaq, 1 page 604) is 100% mastered
      113: { 604: "mastered" },
      // Surah 112 (Al-Ikhlas, 1 page 604) needs review
      112: { 604: "needs_review" },
      // Surah 111 (Al-Masad, 1 page 603) is unmemorized
    };

    const diagnosis = diagnoseHeartMemorization(map, "ascending");

    expect(diagnosis.slippingPagesCount).toBe(1);
    expect(diagnosis.masteredPagesCount).toBe(0);
    expect(diagnosis.unmemorizedPagesCount).toBe(603);
    expect(diagnosis.slippingPages).toEqual([604]);
    expect(diagnosis.slippingQueue).toEqual([{ chapterId: 112, pageNumber: 604 }]);

    // 114 and 113 are skipped for new memorization because they are mastered.
    // 112 has 0 unmemorized pages (it is in needs_review), so targetQueue moves to 111 (Al-Masad)
    expect(diagnosis.targetQueue[0]).toEqual({
      chapterId: 111,
      pageNumber: 603,
    });
  });

  it("correctly identifies gap surahs and schedules only unmemorized pages", () => {
    // Surah 67 (Al-Mulk, pages 562, 563, 564)
    // Page 562 is mastered, 563 is unmemorized, 564 is needs_review
    const map: MemorizationMap = {
      67: {
        562: "mastered",
        564: "needs_review",
      },
    };

    const diagnosis = diagnoseHeartMemorization(map, "ascending");
    expect(diagnosis.gapSurahsCount).toBe(1);

    // Slipping queue includes page 564
    expect(diagnosis.slippingQueue.some((q) => q.chapterId === 67 && q.pageNumber === 564)).toBe(true);

    // Target queue for Surah 67 contains ONLY the unmemorized page 563
    const mulkTargets = diagnosis.targetQueue.filter((q) => q.chapterId === 67);
    expect(mulkTargets).toEqual([{ chapterId: 67, pageNumber: 563 }]);
  });

  it("does not count a shared page as mastered when a sibling surah on it is unmemorized, and keeps slippingPages 1:1 with slippingQueue", () => {
    // Page 604 is shared by 112, 113, 114
    const map: MemorizationMap = {
      114: { 604: "mastered" },
      113: { 604: "needs_review" },
      // 112 is unmemorized on 604
    };

    const diagnosis = diagnoseHeartMemorization(map, "ascending");
    expect(diagnosis.masteredPagesCount).toBe(0);
    expect(diagnosis.slippingPagesCount).toBe(1);
    expect(diagnosis.unmemorizedPagesCount).toBe(603);
    expect(diagnosis.slippingPages).toEqual(diagnosis.slippingQueue.map((i) => i.pageNumber));
  });
});
