"use client";

import { MouseEvent, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { highlight } from "../utils/highlight";
import { getColorMark } from "../utils/marks";
import { WordWithVerse } from "../types/prisma";
import { useRecitation } from "@/app/contexts/RecitationContext";

export type QuranWordProps = {
  word: WordWithVerse;
  marks: Array<{ name: string; value: string }>;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithVerse) => void;
};

export const QuranWord = ({ word, marks, onWordClicked }: QuranWordProps) => {
  const searchParams = useSearchParams();
  const { registerWordRef } = useRecitation();
  // Stable per word.location so re-renders (e.g. searchParams changes) don't
  // needlessly unregister/re-register this word's DOM ref every time.
  const wordRefCallback = useCallback(
    (el: HTMLDivElement | null) => registerWordRef(word.location, el),
    [registerWordRef, word.location],
  );
  const highlightedVerseKey = highlight.getHighlightedVerseKey(searchParams);
  const highlightType = highlight.getHighlightType(searchParams);

  const highlightColorForMark = getColorMark(marks);

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
      className={` group relative leading-none text-black dark:text-white hover:text-yellow-500 dark:hover:text-yellow-400 cursor-pointer
      ${highlightClassForWord}
    `}
    >
      <span>{word.code_v1}</span>
    </div>
  );
};

