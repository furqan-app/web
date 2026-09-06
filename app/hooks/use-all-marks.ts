"use client";

import { useSyncExternalStore, useMemo, useState, useEffect } from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  type LocalMark,
} from "@/app/lib/marks/store";
import { getSortKey, MARKS_PAGE_LIMIT } from "@/app/constants/marks";

export interface UseAllMarksOptions {
  pageSize?: number;
}

export interface UseAllMarksResult {
  marks: LocalMark[];
  totalCount: number;
  hasMore: boolean;
  loadMore: () => void;
  isLoading: boolean;
}

/**
 * Pure function: filters out deleted marks, filters by category, and sorts
 * in natural Quran order via getSortKey.
 */
export function filterAndSortMarks(
  rawMarks: Record<string, LocalMark>,
  category: string
): LocalMark[] {
  const list: LocalMark[] = [];
  for (const key in rawMarks) {
    const mark = rawMarks[key];
    if (!mark || mark.deleted) continue;
    if (category && category !== "all" && mark.category !== category) {
      continue;
    }
    list.push(mark);
  }

  list.sort((a, b) => {
    const [aSurah, aVerse, aWord] = getSortKey(a);
    const [bSurah, bVerse, bWord] = getSortKey(b);
    return aSurah - bSurah || aVerse - bVerse || (aWord - bWord || 0);
  });

  return list;
}

/**
 * Reads user marks from the local store (ADR 0061 / #551), applies client-side
 * sorting in Quran reading order (via getSortKey), and provides progressive windowing
 * for smooth rendering over large sets.
 */
export const useAllMarks = (
  category: string,
  options?: UseAllMarksOptions
): UseAllMarksResult => {
  const pageSize = options?.pageSize ?? MARKS_PAGE_LIMIT;
  const [limit, setLimit] = useState(pageSize);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset window limit when category filter changes
  useEffect(() => {
    setLimit(pageSize);
  }, [category, pageSize]);

  const rawMarks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const sortedMarks = useMemo(
    () => filterAndSortMarks(rawMarks, category),
    [rawMarks, category]
  );

  const totalCount = sortedMarks.length;
  const visibleMarks = useMemo(
    () => sortedMarks.slice(0, limit),
    [sortedMarks, limit]
  );
  const hasMore = limit < totalCount;

  const loadMore = () => {
    setLimit((prev) => Math.min(prev + pageSize, totalCount));
  };

  // Window scroll listener: expands the window when scrolling near the bottom
  useEffect(() => {
    if (!hasMore || typeof window === "undefined") return;

    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 400) {
        setLimit((prev) => Math.min(prev + pageSize, totalCount));
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMore, pageSize, totalCount]);

  return {
    marks: visibleMarks,
    totalCount,
    hasMore,
    loadMore,
    isLoading: !isMounted,
  };
};
