"use client";

import { MouseEvent, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { highlight } from "../utils/highlight";
import { getColorMark, getNoteMark } from "../utils/marks";
import { WordWithLayouts } from "../types/prisma";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useQuranTajweed } from "@/app/contexts/QuranTajweedContext";

export type QuranWordProps = {
  word: WordWithLayouts;
  marks: Array<{ name: string; value: string }>;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithLayouts) => void;
};

export const QuranWord = ({ word, marks, onWordClicked }: QuranWordProps) => {
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

  const highlightColorForMark = getColorMark(marks);
  const hasNote = !!getNoteMark(marks);

  const highlightClassForWord = highlight.getHighlightClass(
    highlight.shouldHighlight(word, highlightedVerseKey) ||
      !!highlightColorForMark,
    highlightColorForMark
      ? `${highlightColorForMark as "red" | "green" | "blue"}-mark`
      : highlightType
  );

  return (
    <div
      ref={wordRefCallback}
      onClick={(e) => onWordClicked(e, word)}
      className={` group relative leading-none text-black dark:text-white cursor-pointer
      ${tajweedMode ? "hover:bg-primary/25" : "hover:text-yellow-500 dark:hover:text-yellow-400"}
      ${highlightClassForWord}
      ${hasNote ? "border-b-2 border-dotted border-primary" : ""}
    `}
    >
      <span>{tajweedMode ? word.code_v2 : word.code_v1}</span>
    </div>
  );
};

