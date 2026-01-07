"use client";

import { usePageFont } from "@hooks/use-page-font";
import { QuranLine } from "@components/QuranLine";
import { FONT_V1 } from "../constants/font";
import { useQuranFontScale } from "../contexts/QuranFontScaleContext";
import { MarkModal } from "./MarkModal";
import { useState } from "react";
import { useMarks } from "../hooks/use-marks";
import { Verse } from "@prisma/client";
import { useSession } from "next-auth/react";
import { SignInModal } from "./SignInModal";
import { WordWithVerse } from "../types/prisma";
import { useSurahs } from "../hooks/use-surahs";
import { useLocale } from "next-intl";
import useTranslations from "@hooks/use-translations";

type QuranSafhaProps = {
  page: number;
  lines: Record<string, Array<WordWithVerse>>;
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

export const QuranSafha = ({ page, lines }: QuranSafhaProps) => {
  const locale = useLocale();
  const session = useSession();
  const t = useTranslations();
  const { data: marks } = useMarks(page);
  const { data: surahs } = useSurahs();
  const { isPending } = usePageFont(page);
  const { quranFontScale } = useQuranFontScale();

  const [selectedForMark, setSelectedForMark] = useState<
    WordWithVerse | Verse | null
  >(null);

  const wordClicked = (
    e: React.MouseEvent<HTMLDivElement>,
    word: WordWithVerse
  ) => {
    if (word.char_type_name === "word") {
      setSelectedForMark(word);
    } else if (word.char_type_name === "end") {
      setSelectedForMark(word.verse);
    }
  };

  const closeMarkModal = () => {
    setSelectedForMark(null);
  };

  const getPageInfo = () => {
    const lastLineNumber = Math.max(...Object.keys(lines).map(Number));
    const lastLine = lines[lastLineNumber];
    const lastWordWithVerse = [...lastLine].reverse().find((word) => word.verse);

    if (!lastWordWithVerse?.verse) {
      return null;
    }

    const { verse } = lastWordWithVerse;

    let firstSurahIdOnPageId: number | null = null;

    for (const lineValue of Object.values(lines)) {
      const [lineSurahId, verseNumber, wordNumber] = lineValue[0].location
        .split(":")
        .map(Number);

      if (verseNumber === 1 && wordNumber === 1) {
        firstSurahIdOnPageId = lineSurahId;
        break;
      }
    }

    const surah = surahs?.find((s) => s.id === (firstSurahIdOnPageId ?? verse.chapter_id));

    if (!surah) {
      return null;
    }

    /*
     * Calculate hizb position (0-3)
     * Examples:
     * hizb_number = 1, rub_el_hizb_number = 1  => hizbPosition = 3
     * hizb_number = 1, rub_el_hizb_number = 2  => hizbPosition = 2
     * hizb_number = 1, rub_el_hizb_number = 3  => hizbPosition = 1
     * hizb_number = 1, rub_el_hizb_number = 4  => hizbPosition = 0
     *
     * hizb_number = 35, rub_el_hizb_number = 141  => hizbPosition = 3
     * hizb_number = 35, rub_el_hizb_number = 142  => hizbPosition = 2
     * hizb_number = 35, rub_el_hizb_number = 143  => hizbPosition = 1
     * hizb_number = 35, rub_el_hizb_number = 144  => hizbPosition = 0
     */
    const hizbPosition = verse.hizb_number * 4 - verse.rub_el_hizb_number;
    let hizbText;
    switch (hizbPosition) {
      case 3:
        hizbText = t("hizb", "الحزب");
        break;
      case 2:
        hizbText = t("hizb-quarter", "ربع الحزب");
        break;
      case 1:
        hizbText = t("hizb-half", "نصف الحزب");
        break;
      case 0:
        hizbText = t("hizb-three-quarters", "ثلاث أرباع الحزب");
        break;
    }

    return {
      surahName: t("surah", "سورة") + " " + (locale === "ar" ? surah?.name_arabic : surah?.name_simple),
      juz: t("juz", "الجزء") + " " + verse.juz_number,
      hizb: hizbText + " " + verse.hizb_number,
    };
  };

  const pageInfo = getPageInfo();

  return (
    <>
      {session?.data?.user && selectedForMark ? (
        <MarkModal
          isOpen={true}
          close={closeMarkModal}
          markFor={selectedForMark as WordWithVerse | Verse}
        />
      ) : null}
      {!session.data?.user && selectedForMark ? (
        <SignInModal isOpen={true} close={closeMarkModal} />
      ) : null}
      <div className="fq-full-safha flex justify-center">
        <div className="w-fit py-6 border-b border-b-gray-500">
          <div className="flex w-full justify-between">
            <div className="text-black dark:text-white">
              {pageInfo?.surahName}
            </div>
            <div className="text-black dark:text-white">
              {pageInfo?.juz}, {pageInfo?.hizb}
            </div>
          </div>
          <div
            className={`fq-quran-safha mt-4 text-[4.4vw] md:text-[${FONT_V1.getWordFontSizeByScale(
              quranFontScale
            )}vh]`}
            style={{
              fontFamily: isPending ? "var(--uthmanic)" : `v1-p${page}`,
            }}
          >
            {Object.keys(lines).map((line) => (
              <QuranLine
                onWordClicked={wordClicked}
                key={line}
                words={lines[line]}
                fontLoaded={!isPending}
                marks={marks ? marks : {}}
              />
            ))}
          </div>
          <div className="text-black dark:text-white flex justify-center mt-4">
            {page}
          </div>
        </div>
      </div>
    </>
  );
};
