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
import { getColorMarkMeta } from "@utils/marks";
import { MarkModal } from "./MarkModal";
import { SignInModal } from "./SignInModal";
import { ViewingChip } from "./reader/ViewingChip";
import { PageMetadataWithChapter, WordWithVerse } from "../types/prisma";

type QuranSafhaProps = {
  page: number;
  lines: Record<string, Array<WordWithVerse>>;
  pageMetadata: PageMetadataWithChapter;
  // When set, this safha shows/edits another user's mushaf via an access grant
  // (see ADR 0012). Undefined = the viewer's own mushaf.
  grantId?: string;
  // Owner of the mushaf being viewed via a grant — drives the in-header viewing
  // indicator. Null/undefined = own mushaf, no indicator.
  viewingOwnerName?: string | null;
  // Which side the "stacked pages underneath" decoration peeks toward — also
  // doubles as a left-page/right-page indicator even in single-page view.
  // See ADR 0013 addendum.
  stackPeekSide?: "left" | "right";
  // When true, adds an invisible margin on the same side as stackPeekSide to
  // reserve space for the stack layers' ~9px protrusion, so both nav arrows sit
  // equally far from the card. Only needed in single-page view — double view is
  // already symmetric (each card's stack peeks toward its own outer edge).
  // See ADR 0013 addendum.
  compensateStackGap?: boolean;
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

export const QuranSafha = ({
  page,
  lines,
  pageMetadata,
  grantId,
  viewingOwnerName,
  stackPeekSide = "left",
  compensateStackGap = false,
}: QuranSafhaProps) => {
  const session = useSession();
  const t = useTranslations();
  const { data: marks } = useMarks(page, grantId);
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

  const getCurrentColorMeta = (markFor: WordWithVerse | Verse) => {
    const markedId = "location" in markFor ? markFor.location : markFor.verse_key;
    return getColorMarkMeta(marks?.[markedId] ?? []);
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
        (() => {
          const meta = getCurrentColorMeta(
            selectedForMark as WordWithVerse | Verse,
          );
          return (
            <MarkModal
              isOpen={true}
              close={closeMarkModal}
              markFor={selectedForMark as WordWithVerse | Verse}
              verseDisplayText={verseDisplayText}
              currentColor={meta?.value}
              markedByName={meta && !meta.isOwn ? meta.authorName : null}
              grantId={grantId}
            />
          );
        })()
      ) : null}
      {!session.data?.user && selectedForMark ? (
        <SignInModal isOpen={true} close={closeMarkModal} />
      ) : null}
      <div className="fq-full-safha flex justify-center w-full md:w-auto">
        <div
          className={`relative w-full md:w-auto h-[calc(100dvh-5.5rem)] md:h-auto ${compensateStackGap ? (stackPeekSide === "right" ? "md:mr-[9px]" : "md:ml-[9px]") : ""}`}
        >
          {/* Stacked "pages underneath" layers — peek toward the outer (spine-away)
              edge; also doubles as a left-page/right-page indicator in single view.
              border-muted-foreground/30 for real contrast in every theme
              (border-border was too close in lightness to bg-card in light/gold).
              bg-card dark:bg-muted: white fill in light/gold, existing muted fill
              kept in dark (already approved). */}
          <div
            className={`hidden md:block absolute inset-0 translate-y-1 rounded-none bg-card dark:bg-muted border border-muted-foreground/10 opacity-100 pointer-events-none ${stackPeekSide === "right" ? "translate-x-2" : "-translate-x-2"}`}
          />
          <div
            className={`hidden md:block absolute inset-0 translate-y-0.5 rounded-none bg-card dark:bg-muted border border-muted-foreground/10 opacity-100 pointer-events-none ${stackPeekSide === "right" ? "translate-x-1" : "-translate-x-1"}`}
          />
          <div className="relative rounded-none md:bg-card overflow-hidden md:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] w-full md:w-auto h-full md:h-auto">
            {/* Content */}
          <div
            className="fq-content relative z-0 px-3 py-3 md:px-7 md:py-5 flex flex-col h-full md:block md:h-auto"
            style={{
              "--fq-line-gap": `max(${FONT_V1.minLineGapPx()}px,${FONT_V1.getLineGapVh(quranFontScale)}vh)`,
              "--fq-heading-h": `max(${FONT_V1.minHeadingBlockPx()}px,${FONT_V1.getHeadingBlockVh(quranFontScale)}vh)`,
            } as React.CSSProperties}
          >
            {/* Header: 3-column — juz | ◆ surah ◆ | hizb */}
            <div
              dir="rtl"
              className="shrink-0 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-cols-3 items-center pb-2 border-b border-border"
              style={{ marginBottom: "var(--fq-line-gap)" }}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {grantId ? (
                  <ViewingChip ownerName={viewingOwnerName} />
                ) : null}
                <span className="min-w-0 truncate text-[10px] font-bold tracking-normal md:tracking-widest text-muted-foreground">
                  {juz}
                </span>
              </span>
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
              <span className="whitespace-nowrap text-[10px] font-bold tracking-normal md:tracking-widest text-muted-foreground text-end">{hizb ?? ""}</span>
            </div>
            {/* Quran text */}
            <div
              className={`fq-quran-safha ${page <= 2 ? "fq-safha-center" : ""} md:text-[${FONT_V1.getWordFontSizeCss(quranFontScale)}]`}
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
              className="shrink-0 flex items-center justify-center gap-2 pt-2 border-t border-border text-muted-foreground text-sm"
              style={{ marginTop: "var(--fq-line-gap)" }}
            >
              <span className="text-primary opacity-70 text-[10px]">◆</span>
              <span>{page}</span>
              <span className="text-primary opacity-70 text-[10px]">◆</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

