"use client";

import { MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { highlight } from "../utils/highlight";
import { WordWithVerse } from "../types/prisma";

export type QuranWordProps = {
  word: WordWithVerse;
  marks: Array<{ name: string; value: string }>;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithVerse) => void;
};

export const QuranWord = ({ word, marks, onWordClicked }: QuranWordProps) => {
  const searchParams = useSearchParams();
  const highlightedVerseKey = highlight.getHighlightedVerseKey(searchParams);
  const highlightType = highlight.getHighlightType(searchParams);

  const highlightColorForMark = marks.find(
    (action) => action.name === "color"
  )?.value;

  const highlightClassForWord = highlight.getHighlightClass(
    highlight.shouldHighlight(word, highlightedVerseKey) ||
      !!highlightColorForMark,
    highlightColorForMark
      ? `${highlightColorForMark as "red" | "green" | "blue"}-mark`
      : highlightType
  );

  return (
    <div
      onClick={(e) => onWordClicked(e, word)}
      className={` group relative leading-none text-black dark:text-white hover:text-yellow-500 dark:hover:text-yellow-400 cursor-pointer
      ${highlightClassForWord}
    `}
    >
      <span>{word.code_v1}</span>
    </div>
  );
};

