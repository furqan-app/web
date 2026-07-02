"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Verse } from "@/app/generated/quran-client";
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
  "md:text-[max(24px,3.1vh)]",
  "md:text-[max(24px,3.3vh)]",
  "md:text-[max(24px,3.5vh)]",
  "md:text-[max(24px,3.7vh)]",
  "md:text-[max(24px,3.9vh)]",
  "md:text-[max(24px,4.1vh)]",
  "md:text-[max(24px,4.3vh)]",
  "md:text-[max(24px,4.5vh)]",
  "md:text-[max(24px,4.7vh)]",
  "md:text-[max(24px,4.9vh)]",
];

export const QuranSafha = ({ page, lines, pageMetadata }: QuranSafhaProps) => {
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
  const surahGlyph = `${pageMetadata.chapter.chapter_number}`.padStart(3, "0");
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
          <div
            className="relative z-0 px-7 py-5"
            style={{
              "--fq-line-gap": `max(${FONT_V1.minLineGapPx()}px,${FONT_V1.getLineGapVh(quranFontScale)}vh)`,
              "--fq-heading-h": `max(${FONT_V1.minHeadingBlockPx()}px,${FONT_V1.getHeadingBlockVh(quranFontScale)}vh)`,
            } as React.CSSProperties}
          >
            {/* Header: 3-column — juz | ◆ surah ◆ | hizb */}
            <div
              dir="rtl"
              className="grid grid-cols-3 items-center pb-2 border-b border-border"
              style={{ marginBottom: "var(--fq-line-gap)" }}
            >
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{juz}</span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
                <span
                  translate="no"
                  style={{ fontFamily: "var(--surah-names)", fontSize: "1.1rem", lineHeight: 1 }}
                >
                  {surahGlyph}
                </span>
                <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground text-end">{hizb ?? ""}</span>
            </div>
            {/* Quran text */}
            <div
              className={`fq-quran-safha text-[4.4vw] md:text-[${FONT_V1.getWordFontSizeCss(
                quranFontScale,
              )}]`}
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
            <div
              className="flex items-center justify-center gap-2 pt-2 border-t border-border text-muted-foreground text-sm"
              style={{ marginTop: "var(--fq-line-gap)" }}
            >
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

