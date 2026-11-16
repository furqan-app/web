import { SURAH_PAGE_BOUNDS } from "@/app/constants/surah-page-bounds";
import type { MemorizationMap } from "@/app/lib/plans/memorization-derivation";

export type HeartPulseDirection = "ascending" | "descending";

export type HeartPulseTargetItem = {
  chapterId: number;
  pageNumber: number;
};

export type HeartPulseDiagnosis = {
  masteredPagesCount: number;
  slippingPagesCount: number;
  unmemorizedPagesCount: number;
  gapSurahsCount: number;
  unmemorizedSurahsCount: number;
  slippingQueue: HeartPulseTargetItem[];
  targetQueue: HeartPulseTargetItem[];
  slippingPages: number[];
  targetPages: number[];
};

/**
 * Diagnoses the reader's current heart memorization state and constructs
 * ordered target queues for new memorization/gap-closing and slipping review
 * based on the selected trajectory (ascending 114->1 or descending 2->114).
 */
export function diagnoseHeartMemorization(
  memorizationMap: MemorizationMap,
  direction: HeartPulseDirection = "ascending"
): HeartPulseDiagnosis {
  // 1. Order chapters based on direction
  const chapterOrder: number[] = [];
  if (direction === "ascending") {
    for (let c = 114; c >= 1; c--) chapterOrder.push(c);
  } else {
    // Descending: 2 to 114, followed by 1 (Al-Fatihah)
    for (let c = 2; c <= 114; c++) chapterOrder.push(c);
    chapterOrder.push(1);
  }

  // 2. Identify physical page coverage (mastered, needs_review, unmemorized)
  const uniqueMasteredPages = new Set<number>();
  const uniqueNeedsReviewPages = new Set<number>();
  const uniqueUnmemorizedPages = new Set<number>();
  const slippingQueue: HeartPulseTargetItem[] = [];

  for (const chapterId of chapterOrder) {
    const chapterMap = memorizationMap[chapterId] || {};
    const bounds = SURAH_PAGE_BOUNDS[chapterId];
    if (!bounds) continue;

    for (let p = bounds.startPage; p <= bounds.endPage; p++) {
      const st = chapterMap[p];
      if (st === "mastered") {
        uniqueMasteredPages.add(p);
      } else if (st === "needs_review") {
        uniqueNeedsReviewPages.add(p);
        slippingQueue.push({ chapterId, pageNumber: p });
      } else {
        uniqueUnmemorizedPages.add(p);
      }
    }
  }

  // Mutually exclusive physical page assignment:
  // A page is mastered only if every surah on that page is mastered (none needs_review or unmemorized).
  let masteredPagesCount = 0;
  uniqueMasteredPages.forEach((p) => {
    if (!uniqueNeedsReviewPages.has(p) && !uniqueUnmemorizedPages.has(p)) {
      masteredPagesCount++;
    }
  });
  const slippingPagesCount = uniqueNeedsReviewPages.size;
  const unmemorizedPagesCount = Math.max(0, 604 - masteredPagesCount - slippingPagesCount);

  const slippingPages = slippingQueue.map((item) => item.pageNumber);

  // 3. Build target queue for new memorization
  let gapSurahsCount = 0;
  let unmemorizedSurahsCount = 0;
  const targetQueue: HeartPulseTargetItem[] = [];

  for (const chapterId of chapterOrder) {
    const bounds = SURAH_PAGE_BOUNDS[chapterId];
    if (!bounds) continue;
    const chapterMap = memorizationMap[chapterId] || {};

    let masteredCount = 0;
    let needsReviewCount = 0;
    const unmemorizedPagesInSurah: number[] = [];

    for (let p = bounds.startPage; p <= bounds.endPage; p++) {
      const st = chapterMap[p];
      if (st === "mastered") {
        masteredCount++;
      } else if (st === "needs_review") {
        needsReviewCount++;
      } else {
        unmemorizedPagesInSurah.push(p);
      }
    }

    const memorizedCount = masteredCount + needsReviewCount;

    // Fully mastered surahs are skipped
    if (masteredCount === bounds.totalPages) {
      continue;
    }

    if (memorizedCount > 0 && memorizedCount < bounds.totalPages) {
      gapSurahsCount++;
    } else if (memorizedCount === 0) {
      unmemorizedSurahsCount++;
    }

    // Add unmemorized pages in natural surah reading order
    for (const p of unmemorizedPagesInSurah) {
      targetQueue.push({ chapterId, pageNumber: p });
    }
  }

  return {
    masteredPagesCount,
    slippingPagesCount,
    unmemorizedPagesCount,
    gapSurahsCount,
    unmemorizedSurahsCount,
    slippingQueue,
    targetQueue,
    slippingPages,
    targetPages: targetQueue.map((item) => item.pageNumber),
  };
}
