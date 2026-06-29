"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { Verse } from "@prisma/client";
import { QuranLine } from "@components/QuranLine";
import { useMarks } from "@hooks/use-marks";
import { FONT_V1 } from "@constants/font";
import { useQuranFontScale } from "@contexts/QuranFontScaleContext";
import useTranslations from "@hooks/use-translations";
import { getPageFontFamily } from "@utils/quran-font-map";
import { MarkModal } from "./MarkModal";
import { SignInModal } from "./SignInModal";
import { PageMetadataWithChapter, WordWithVerse } from "../types/prisma";

type QuranSafhaProps = {
  page: number;
  lines: Record<string, Array<WordWithVerse>>;
  pageMetadata: PageMetadataWithChapter;
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

export const QuranSafha = ({ page, lines, pageMetadata }: QuranSafhaProps) => {
  const locale = useLocale();
  const session = useSession();
  const t = useTranslations();
  const { data: marks } = useMarks(page);
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

  const hizbDefaults: Record<string, string> = {
    hizb: "الحزب",
    "hizb-quarter": "ربع الحزب",
    "hizb-half": "نصف الحزب",
    "hizb-three-quarters": "ثلاث أرباع الحزب",
  };
  const surahName = `${t("surah", "سورة")} ${locale === "ar" ? pageMetadata.chapter.name_arabic : pageMetadata.chapter.name_simple}`;
  const juz = `${t("juz", "الجزء")} ${pageMetadata.juz_number}`;
  const hizb = pageMetadata.hizb_position
    ? `${t(pageMetadata.hizb_position, hizbDefaults[pageMetadata.hizb_position])} ${pageMetadata.hizb_number}`
    : null;

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
        <div className="w-fit py-8">
          <div className="flex w-full justify-between">
            <div className="text-foreground">
              {surahName}
            </div>
            <div className="text-foreground">
              {juz}{hizb ? `, ${hizb}` : ""}
            </div>
          </div>
          <div
            className={`fq-quran-safha mt-4 text-[4.4vw] md:text-[${FONT_V1.getWordFontSizeByScale(
              quranFontScale
            )}vh]`}
            style={{
              fontFamily: getPageFontFamily(page),
            }}
          >
            {Object.keys(lines).map((line) => (
              <QuranLine
                onWordClicked={wordClicked}
                key={line}
                words={lines[line]}
                marks={marks ? marks : {}}
              />
            ))}
          </div>
          <div className="text-foreground flex justify-center mt-4">
            {page}
          </div>
        </div>
      </div>
    </>
  );
};

