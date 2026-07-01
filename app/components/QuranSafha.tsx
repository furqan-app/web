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
  const [verseDisplayText, setVerseDisplayText] = useState<string | undefined>(
    undefined,
  );

  const wordClicked = (
    e: React.MouseEvent<HTMLDivElement>,
    word: WordWithVerse,
  ) => {
    if (word.char_type_name === "word") {
      setSelectedForMark(word);
      setVerseDisplayText(undefined);
    } else if (word.char_type_name === "end") {
      const allWords = Object.values(lines).flat();
      const displayWords = allWords
        .filter(
          (w) => w.verse_key === word.verse_key && w.char_type_name === "word",
        )
        .map((w) => w.qpc_uthmani_hafs);

      const displayText =
        displayWords.length > 20
          ? `${displayWords.slice(0, 20).join(" ")} ...`
          : displayWords.join(" ");

      setSelectedForMark(word.verse);
      setVerseDisplayText(displayText);
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
          verseDisplayText={verseDisplayText}
        />
      ) : null}
      {!session.data?.user && selectedForMark ? (
        <SignInModal isOpen={true} close={closeMarkModal} />
      ) : null}
      <div className="fq-full-safha flex justify-center">
        <div className="relative rounded-[20px] border border-border bg-card overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]">
          {/* Inner decorative accent frame */}
          <div className="absolute inset-[10px] rounded-xl border border-primary/20 pointer-events-none z-10" />
          {/* Corner star ornaments */}
          <div className="absolute top-[7px] left-[7px] w-[18px] h-[18px] text-primary opacity-60 z-20 pointer-events-none">
            <svg viewBox="0 0 18 18" fill="currentColor"><path d="M9 1L10.5 7L17 8.5L10.5 10L9 17L7.5 10L1 8.5L7.5 7Z"/></svg>
          </div>
          <div className="absolute top-[7px] right-[7px] w-[18px] h-[18px] text-primary opacity-60 z-20 pointer-events-none">
            <svg viewBox="0 0 18 18" fill="currentColor"><path d="M9 1L10.5 7L17 8.5L10.5 10L9 17L7.5 10L1 8.5L7.5 7Z"/></svg>
          </div>
          <div className="absolute bottom-[7px] left-[7px] w-[18px] h-[18px] text-primary opacity-60 z-20 pointer-events-none">
            <svg viewBox="0 0 18 18" fill="currentColor"><path d="M9 1L10.5 7L17 8.5L10.5 10L9 17L7.5 10L1 8.5L7.5 7Z"/></svg>
          </div>
          <div className="absolute bottom-[7px] right-[7px] w-[18px] h-[18px] text-primary opacity-60 z-20 pointer-events-none">
            <svg viewBox="0 0 18 18" fill="currentColor"><path d="M9 1L10.5 7L17 8.5L10.5 10L9 17L7.5 10L1 8.5L7.5 7Z"/></svg>
          </div>
          {/* Content */}
          <div className="relative z-0 px-7 py-6">
            {/* Header: 3-column — juz | ◆ surah ◆ | hizb */}
            <div dir="rtl" className="grid grid-cols-3 items-center pb-2 mb-4 border-b border-border">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{juz}</span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
                <span className="text-sm font-bold text-foreground">{surahName}</span>
                <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground text-end">{hizb ?? ""}</span>
            </div>
            {/* Quran text */}
            <div
              className={`fq-quran-safha text-[4.4vw] md:text-[${FONT_V1.getWordFontSizeByScale(
                quranFontScale,
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
            {/* Footer */}
            <div className="flex items-center justify-center gap-2 mt-4 pt-2 border-t border-border text-muted-foreground text-sm">
              <span className="text-primary opacity-70 text-[10px]">◆</span>
              <span>{page}</span>
              <span className="text-primary opacity-70 text-[10px]">◆</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

