"use client";

import { MouseEvent, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { highlight, HighlightType } from "../utils/highlight";
import { WordWithLayouts } from "../types/prisma";
import { MARK_CATEGORIES } from "../constants/marks";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useQuranTajweed } from "@/app/contexts/QuranTajweedContext";

export type QuranWordProps = {
  word: WordWithLayouts;
  // The memorization category key of this spot's mark, if any (ADR 0025). The
  // comment is not shown on the page — highlight only.
  category?: string;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithLayouts) => void;
};

export const QuranWord = ({ word, category, onWordClicked }: QuranWordProps) => {
  const searchParams = useSearchParams();
  const { registerWordRef } = useRecitation();
  const { tajweedMode } = useQuranTajweed();
  // Stable per word.location so re-renders (e.g. searchParams changes) don't
  // needlessly unregister/re-register this word's DOM ref every time.
  const wordRefCallback = useCallback(
    (el: HTMLDivElement | null) => registerWordRef(word.location, el),
    [registerWordRef, word.location],
  );
  const highlightedVerseKey = highlight.getHighlightedVerseKey(searchParams);
  const highlightType = highlight.getHighlightType(searchParams);

  // Unknown/legacy category (e.g. old "red"/"blue"/"green" rows) is not a known
  // category — falls through to no mark highlight, per ADR 0024.
  const isKnownCategory = MARK_CATEGORIES.some((c) => c.key === category);

  const highlightClassForWord = highlight.getHighlightClass(
    highlight.shouldHighlight(word, highlightedVerseKey) || isKnownCategory,
    isKnownCategory
      ? (`${category}-mark` as HighlightType)
      : highlightType
  );

  return (
    <div
      ref={wordRefCallback}
      onClick={(e) => onWordClicked(e, word)}
      className={` group relative leading-none text-black dark:text-white cursor-pointer
      ${tajweedMode ? "hover:bg-primary/25" : "hover:text-yellow-500 dark:hover:text-yellow-400"}
      ${highlightClassForWord}
    `}
    >
      <span>{tajweedMode ? word.code_v2 : word.code_v1}</span>
    </div>
  );
};

