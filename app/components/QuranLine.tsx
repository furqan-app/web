"use client";

import BismillahSVG from "@/app/bismillah.svg";
import { CHAPTERS_WITHOUT_BISMILLAH } from "@constants/surah";
import { useLocale } from "next-intl";
import { getLanguageDirection } from "../utils/i18n";
import { MouseEvent, Suspense } from "react";
import { QuranWord } from "./QuranWord";
import { WordWithVerse } from "../types/prisma";

type LineProps = {
  words: Array<WordWithVerse>;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithVerse) => void;
  marks: Record<string, Array<{ name: string; value: string }>>;
};

export const QuranLine = ({ words, onWordClicked, marks }: LineProps) => {
  const [surahId, verseNumber, wordNumber] = words[0].location
    .split(":")
    .map(Number);
  const shouldRenderSurahHeader = verseNumber === 1 && wordNumber === 1;

  const locale = useLocale();

  return (
    <>
      {shouldRenderSurahHeader ? (
        <div className="text-center">
          <h1
            className="text-black dark:text-white"
            translate="no"
            style={{
              fontFamily: "var(--surah-names)",
              fontSize: "calc(var(--fq-heading-h) * 0.371)",
              lineHeight: 1,
            }}
          >
            {`${surahId}`.padStart(3, "0")}
          </h1>
          <div className="flex justify-center text-black dark:text-white">
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
        className={`text-white flex ${
          getLanguageDirection(locale) === "rtl"
            ? "flex-row"
            : "flex-row-reverse"
        } ${[1, 2].includes(words[0].page_number) ? "justify-center" : ""} `}
        style={{ marginBottom: "var(--fq-line-gap)" }}
      >
        {words.map((word) => (
          <Suspense key={word.location}>
            <QuranWord
              onWordClicked={onWordClicked}
              key={word.id}
              word={word}
              marks={[
                ...(marks[word.location] || []),
                ...(marks[word.verse_key] || []),
              ]}
            ></QuranWord>
          </Suspense>
        ))}
      </div>
    </>
  );
};

