"use client";

// import { AnimatePresence, motion } from "framer-motion";

import BismillahSVG from "@/app/bismillah.svg";
import { CHAPTERS_WITHOUT_BISMILLAH } from "@constants/surah";
import { FONT_V1 } from "@constants/font";
import { Word } from "@types";
import { useSearchParams } from "next/navigation";

type LineProps = {
  line: string;
  words: Array<Word>;
  fontLoaded: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tailwindFontUtility = [
  "md:text-[3.4vh]",
  "md:text-[3.6vh]",
  "md:text-[3.8vh]",
  "md:text-[4vh]",
  "md:text-[4.2vh]",
  "md:text-[4.4vh]",
  "md:text-[4.6vh]",
  "md:text-[4.8vh]",
  "md:text-[5vh]",
  "md:text-[5.2vh]",
  "md:text-[5.4vh]",
  "md:text-[5.6vh]",
  "md:text-[5.8vh]",
  "md:text-[6vh]",
  "md:text-[6.2vh]",
  "md:text-[6.4vh]",
  "md:text-[6.6vh]",
];

export const QuranLine = ({ line, words, fontLoaded }: LineProps) => {
  const [surahId, verseNumber, wordNumber] = words[0].location
    .split(":")
    .map(Number);
  const shouldRenderSurahHeader = verseNumber === 1 && wordNumber === 1;

  const searchParams = useSearchParams();
  const highlightedVerseKey = searchParams.get('highlight');

  const shouldHighlight = (word: Word) => {
    return highlightedVerseKey === word.verse_key;
  };

  return (
    <>
      {shouldRenderSurahHeader ? (
        <div className="text-center">
          <h1
            className="text-3xl text-black dark:text-white"
            translate="no"
            style={{ fontFamily: "var(--surah-names)" }}
          >
            {`${surahId}`.padStart(3, "0")}
          </h1>
          <div className="flex justify-center text-black dark:text-white">
            {!CHAPTERS_WITHOUT_BISMILLAH.includes(`${surahId}`) ? (
              <div className="mb-4">
                <BismillahSVG />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        className={`text-white flex flex-row-reverse mb-4 ${
          [1, 2].includes(words[0].page_number) || fontLoaded
            ? "justify-center"
            : "justify-between"
        } `}
      >
        {words.map((word) => (
          <span
            key={line + "" + word.id}
            data-verse-key={word.verse_key}
            className={` leading-none 
              text-[4.4vw] 
              md:text-[${FONT_V1.getWordFontSizeByScale(8)}vh] 
              text-black dark:text-white hover:text-sky-600 dark:hover:indigo-sky-300 cursor-pointer
              ${shouldHighlight(word) ? "bg-yellow-200/60 dark:bg-yellow-500/30 dark:text-white" : ""}
              `}
          >
            {fontLoaded ? (
              <span>{word.code_v1}</span>
            ) : (
              <span>{word.qpc_uthmani_hafs}</span>
            )}

            {/* {fontLoaded ? (
              <AnimatePresence>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {word.code_v1}
                </motion.span>
              </AnimatePresence>
            ) : (
              <AnimatePresence>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {word.qpc_uthmani_hafs}
                </motion.span>
              </AnimatePresence>
            )} */}
          </span>
        ))}
      </div>
    </>
  );
};

