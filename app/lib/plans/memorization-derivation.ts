import { SURAH_PAGE_BOUNDS } from "@/app/constants/surah-page-bounds";

export type MemorizationStatus = "mastered" | "needs_review";

export type SurahDisplayStatus = "mastered" | "needs_review" | "partial" | "unmemorized";

export type UserMemorizationRecord = {
  chapter_id: number;
  page_number: number;
  status: MemorizationStatus;
};

export type MemorizationMap = Record<number, Record<number, MemorizationStatus>>;

export type SurahMemorizationDerived = {
  chapterId: number;
  status: SurahDisplayStatus;
  totalPages: number;
  masteredPages: number;
  needsReviewPages: number;
  memorizedPages: number;
  memorizedPercentage: number;
  masteredPercentage: number;
  needsReviewPercentage: number;
  liquidFillPercentage: number;
};

export type GlobalMemorizationStats = {
  totalPagesMemorized: number; // unique physical pages (1–604)
  totalMasteredPages: number;
  totalNeedsReviewPages: number;
  completionPercentage: number; // 0 to 100
  masteredSurahsCount: number;
  needsReviewSurahsCount: number;
  partialSurahsCount: number;
  unmemorizedSurahsCount: number;
};

/**
 * Converts a flat array of database memorization records into an indexed map:
 * { [chapter_id]: { [page_number]: "mastered" | "needs_review" } }
 */
export function buildMemorizationMap(records: UserMemorizationRecord[]): MemorizationMap {
  const map: MemorizationMap = {};
  for (const record of records) {
    if (!map[record.chapter_id]) {
      map[record.chapter_id] = {};
    }
    map[record.chapter_id][record.page_number] = record.status;
  }
  return map;
}

/**
 * Returns an array of physical page numbers [startPage, ..., endPage] for a given surah.
 */
export function getSurahPageList(chapterId: number): number[] {
  const bounds = SURAH_PAGE_BOUNDS[chapterId];
  if (!bounds) return [];
  const pages: number[] = [];
  for (let p = bounds.startPage; p <= bounds.endPage; p++) {
    pages.push(p);
  }
  return pages;
}

/**
 * Derives the memorization status and liquid metrics for a single surah.
 */
export function deriveSurahMemorization(
  chapterId: number,
  surahRecordsMap?: Record<number, MemorizationStatus>
): SurahMemorizationDerived {
  const bounds = SURAH_PAGE_BOUNDS[chapterId];
  if (!bounds) {
    return {
      chapterId,
      status: "unmemorized",
      totalPages: 0,
      masteredPages: 0,
      needsReviewPages: 0,
      memorizedPages: 0,
      memorizedPercentage: 0,
      masteredPercentage: 0,
      needsReviewPercentage: 0,
      liquidFillPercentage: 0,
    };
  }

  const totalPages = bounds.totalPages;
  let masteredPages = 0;
  let needsReviewPages = 0;

  for (let p = bounds.startPage; p <= bounds.endPage; p++) {
    const status = surahRecordsMap?.[p];
    if (status === "mastered") {
      masteredPages++;
    } else if (status === "needs_review") {
      needsReviewPages++;
    }
  }

  const memorizedPages = masteredPages + needsReviewPages;
  const memorizedPercentage = totalPages > 0 ? Math.round((memorizedPages / totalPages) * 100) : 0;
  const masteredPercentage = totalPages > 0 ? Math.round((masteredPages / totalPages) * 100) : 0;
  const needsReviewPercentage = totalPages > 0 ? Math.round((needsReviewPages / totalPages) * 100) : 0;

  let status: SurahDisplayStatus = "unmemorized";
  if (memorizedPages === 0) {
    status = "unmemorized";
  } else if (masteredPages === totalPages) {
    status = "mastered";
  } else if (needsReviewPages === totalPages) {
    status = "needs_review";
  } else {
    status = "partial";
  }

  return {
    chapterId,
    status,
    totalPages,
    masteredPages,
    needsReviewPages,
    memorizedPages,
    memorizedPercentage,
    masteredPercentage,
    needsReviewPercentage,
    liquidFillPercentage: memorizedPercentage,
  };
}

/**
 * Derives aggregate stats across all 114 surahs.
 */
export function deriveGlobalMemorizationStats(
  memorizationMap: MemorizationMap
): GlobalMemorizationStats {
  const uniqueMasteredPages = new Set<number>();
  const uniqueNeedsReviewPages = new Set<number>();
  const allMemorizedPages = new Set<number>();

  let masteredSurahsCount = 0;
  let needsReviewSurahsCount = 0;
  let partialSurahsCount = 0;
  let unmemorizedSurahsCount = 0;

  for (let id = 1; id <= 114; id++) {
    const surahMap = memorizationMap[id];
    const derived = deriveSurahMemorization(id, surahMap);

    if (derived.status === "mastered") {
      masteredSurahsCount++;
    } else if (derived.status === "needs_review") {
      needsReviewSurahsCount++;
    } else if (derived.status === "partial") {
      partialSurahsCount++;
    } else {
      unmemorizedSurahsCount++;
    }

    if (surahMap) {
      for (const [pageStr, status] of Object.entries(surahMap)) {
        const page = Number(pageStr);
        allMemorizedPages.add(page);
        if (status === "mastered") {
          uniqueMasteredPages.add(page);
        } else if (status === "needs_review") {
          uniqueNeedsReviewPages.add(page);
        }
      }
    }
  }

  // Mutually exclusive physical page assignment:
  // If any surah on a physical page needs review, the physical page is categorized as needs_review.
  // Only if all marked surahs on that physical page are mastered does it count as mastered.
  let finalMasteredPagesCount = 0;
  uniqueMasteredPages.forEach((page) => {
    if (!uniqueNeedsReviewPages.has(page)) {
      finalMasteredPagesCount++;
    }
  });
  const finalNeedsReviewPagesCount = uniqueNeedsReviewPages.size;
  const totalPagesMemorized = allMemorizedPages.size;
  const completionPercentage = Math.round((totalPagesMemorized / 604) * 100);

  return {
    totalPagesMemorized,
    totalMasteredPages: finalMasteredPagesCount,
    totalNeedsReviewPages: finalNeedsReviewPagesCount,
    completionPercentage,
    masteredSurahsCount,
    needsReviewSurahsCount,
    partialSurahsCount,
    unmemorizedSurahsCount,
  };
}
