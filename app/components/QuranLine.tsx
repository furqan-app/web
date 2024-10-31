"use client";

// import { AnimatePresence, motion } from "framer-motion";

import BismillahSVG from "@/app/bismillah.svg";
import { CHAPTERS_WITHOUT_BISMILLAH } from "@constants/surah";
import { FONT_V1 } from "@constants/font";
import { Word } from "@types";

type LineProps = {
  line: string;
  words: Array<Word>;
  fontLoaded: boolean;
};

export const QuranLine = ({ line, words, fontLoaded }: LineProps) => {
  const [surahId, verseNumber, wordNumber] = words[0].location
    .split(":")
    .map(Number);
  const shouldRenderSurahHeader = verseNumber === 1 && wordNumber === 1;

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
              <BismillahSVG />
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        className={`text-white flex flex-row-reverse ${
          [1, 2].includes(words[0].page_number) || fontLoaded
            ? "justify-center"
            : "justify-between"
        } `}
      >
        {words.map((word) => (
          <span
            key={line + "" + word.id}
            className={`text-black dark:text-white hover:text-yellow-300 cursor-pointer`}
            style={{
              fontSize: fontLoaded
                ? `${FONT_V1.getWordFontSizeByScale(2)}vh`
                : "3vh",
            }}
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

