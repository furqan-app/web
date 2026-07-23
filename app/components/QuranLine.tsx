"use client";

import BismillahSVG from "@/app/bismillah.svg";
import { CHAPTERS_WITHOUT_BISMILLAH } from "@constants/surah";
import { useLocale } from "next-intl";
import { getLanguageDirection } from "../utils/i18n";
import { MouseEvent } from "react";
import { QuranWord } from "./QuranWord";
import { WordWithLayouts } from "../types/prisma";
import { useQuranTajweed } from "@/app/contexts/QuranTajweedContext";

type LineProps = {
  words: Array<WordWithLayouts>;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithLayouts) => void;
  onWordLongPressed?: (word: WordWithLayouts) => void;
  isOverlayMode?: boolean;
  // One mark per spot (ADR 0025), keyed by word `location` or verse `verse_key`.
  marks: Record<string, { category: string } | undefined>;
  // When set, QuranSafha has already rendered standalone banner/bismillah slots
  // for this surah — suppress the inline combined heading block for it.
  // Mid-page surahs (prop absent or non-matching) keep the existing inline block.
  suppressInlineHeaderForSurahId?: number;
};

export const QuranLine = ({ words, onWordClicked, onWordLongPressed, isOverlayMode, marks, suppressInlineHeaderForSurahId }: LineProps) => {
  const [surahId, verseNumber, wordNumber] = words[0].location
    .split(":")
    .map(Number);
  const shouldRenderSurahHeader = verseNumber === 1 && wordNumber === 1;
  const isBannerHandled = suppressInlineHeaderForSurahId === surahId;

  const locale = useLocale();
  const { tajweedMode } = useQuranTajweed();

  return (
    <>
      {shouldRenderSurahHeader && !isBannerHandled ? (
        <div className="text-center">
          <h1
            className="fq-inline-surah text-black dark:text-white"
            translate="no"
            style={{
              fontFamily: "var(--surah-names)",
              fontSize: "calc(var(--fq-heading-h) * 0.371)",
              lineHeight: 1,
            }}
          >
            {`${surahId}`.padStart(3, "0")}
          </h1>
          <div className="fq-bismillah flex justify-center text-black dark:text-white">
            {!CHAPTERS_WITHOUT_BISMILLAH.includes(`${surahId}`) ? (
              <div style={{ marginBottom: "var(--fq-line-gap)" }}>
                <BismillahSVG
                  style={{
                    height: "calc(var(--fq-heading-h) * 0.629 - var(--fq-line-gap))",
                    width: "auto",
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        className={`fq-safha-row text-white flex ${
          getLanguageDirection(locale) === "rtl"
            ? "flex-row"
            : "flex-row-reverse"
        } ${
          [1, 2].includes(words[0].page_number) || tajweedMode
            ? "justify-center"
            : ""
        } `}
        style={{ marginBottom: "var(--fq-line-gap)" }}
      >
        {words.map((word) => (
          <QuranWord
            key={word.location}
            onWordClicked={onWordClicked}
            onWordLongPressed={onWordLongPressed}
            isOverlayMode={isOverlayMode}
            word={word}
            // A word-level mark takes precedence over a verse-level one.
            category={(marks[word.location] ?? marks[word.verse_key])?.category}
          />
        ))}
      </div>
    </>
  );
};

