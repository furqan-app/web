"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { Verse } from "@/app/generated/quran-client";
import { QuranLine } from "@components/QuranLine";
import { useMarks } from "@hooks/use-marks";
import { FONT_V1 } from "@constants/font";
import { useQuranFontScale } from "@contexts/QuranFontScaleContext";
import { useQuranTajweed } from "@contexts/QuranTajweedContext";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { getPageFontFamily } from "@utils/quran-font-map";
import { getColorMarkMeta, getNoteMarkMeta } from "@utils/marks";
import { groupBy } from "@utils/groupBy";
import BismillahSVG from "@/app/bismillah.svg";
import { CHAPTERS_WITHOUT_BISMILLAH } from "@constants/surah";
import { VERSE_SNIPPET_WORD_LIMIT } from "@constants/marks";
import { MarkModal } from "./MarkModal";
import { SignInModal } from "./SignInModal";
import { ViewingChip } from "./reader/ViewingChip";
import { PageMetadataWithChapter, WordWithLayouts } from "../types/prisma";

const SurahBannerLine = ({ surahId }: { surahId: number }) => (
  <div
    className="leading-none text-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}
  >
    <span
      translate="no"
      style={{ fontFamily: "var(--surah-names)", fontSize: "1em", lineHeight: 1 }}
    >
      {`${surahId}`.padStart(3, "0")}
    </span>
  </div>
);

const BismillahLine = () => (
  <div
    className="leading-none flex justify-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}
  >
    <BismillahSVG style={{ height: "1em", width: "auto" }} />
  </div>
);

type QuranSafhaProps = {
  page: number;
  lines: Record<string, Array<WordWithLayouts>>;
  pageMetadata: PageMetadataWithChapter;
  locale: string;
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
  // Marks this card as part of a spread so it gets the `fq-compensate-*` class:
  // globals.css then reserves a physical ~9px margin (same side as stackPeekSide)
  // for the stack layers' protrusion at md+, and removes it only when the spread
  // actually shows both pages (lg + data-safha-view="double") — so single-page
  // display keeps both nav arrows equidistant while double view stays symmetric.
  // Standalone QuranSafha (QuranPage) leaves this false → no margin. See ADR 0013
  // Addenda 4 & 7.
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
  locale,
  grantId,
  viewingOwnerName,
  stackPeekSide = "left",
  compensateStackGap = false,
}: QuranSafhaProps) => {
  const session = useSession();
  const t = useTranslations();
  const { data: marks } = useMarks(page, grantId);
  const { quranFontScale } = useQuranFontScale();
  const { tajweedMode } = useQuranTajweed();

  const [selectedForMark, setSelectedForMark] = useState<
    WordWithLayouts | Verse | null
  >(null);
  const [verseDisplayText, setVerseDisplayText] = useState<string | undefined>(
    undefined,
  );

  const wordClicked = (
    e: React.MouseEvent<HTMLDivElement>,
    word: WordWithLayouts,
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
        displayWords.length > VERSE_SNIPPET_WORD_LIMIT
          ? `${displayWords.slice(0, VERSE_SNIPPET_WORD_LIMIT).join(" ")} ...`
          : displayWords.join(" ");

      setSelectedForMark(word.verse);
      setVerseDisplayText(displayText);
    }
  };

  const closeMarkModal = () => {
    setSelectedForMark(null);
  };

  const getCurrentColorMeta = (markFor: WordWithLayouts | Verse) => {
    const markedId = "location" in markFor ? markFor.location : markFor.verse_key;
    return getColorMarkMeta(marks?.[markedId] ?? []);
  };

  const getCurrentNoteMeta = (markFor: WordWithLayouts | Verse) => {
    const markedId = "location" in markFor ? markFor.location : markFor.verse_key;
    return getNoteMarkMeta(marks?.[markedId] ?? []);
  };

  const hizbDefaults: Record<string, string> = {
    hizb: "الحزب",
    "hizb-quarter": "ربع الحزب",
    "hizb-half": "نصف الحزب",
    "hizb-three-quarters": "ثلاث أرباع الحزب",
  };
  const surahGlyph = `${pageMetadata.chapter.chapter_number}`.padStart(3, "0");
  const juz = `${t("juz", "الجزء")} ${toLocaleNumeral(pageMetadata.juz_number, locale)}`;
  const hizb = pageMetadata.hizb_position
    ? `${t(pageMetadata.hizb_position, hizbDefaults[pageMetadata.hizb_position])} ${toLocaleNumeral(pageMetadata.hizb_number, locale)}`
    : null;

  // In Tajweed mode, re-group by mushaf=19's line_number instead of the
  // default (mushaf=2) grouping already computed server-side in `lines` —
  // the two mushafs break lines differently (ADR 0023 Addendum 6). Every
  // line-keyed computation below (banner/bismillah gap-detection, line
  // rendering) reads from whichever grouping is active.
  const activeLines = tajweedMode
    ? groupBy(Object.values(lines).flat(), (w) => w.layouts[19] ?? w.line_number)
    : lines;

  // lineKeys must be sorted numerically; Object.keys() order is not guaranteed.
  const lineKeys = Object.keys(activeLines).sort((a, b) => Number(a) - Number(b));

  type RenderItem =
    | { type: "words"; slot: number; lineKey: string; suppressSurahId?: number }
    | { type: "surahBanner"; slot: number; surahId: number }
    | { type: "bismillah"; slot: number };

  // Find consecutive runs of slot numbers (1–15) absent from lineKeys — each run
  // is a banner/bismillah group in the printed mushaf layout.
  const occupiedSet = new Set(lineKeys.map(Number));
  const missing = Array.from({ length: 15 }, (_, i) => i + 1).filter(
    (n) => !occupiedSet.has(n),
  );
  const gapGroups: Array<{ start: number; end: number; size: number }> = [];
  for (const slot of missing) {
    const last = gapGroups[gapGroups.length - 1];
    if (last && last.end === slot - 1) {
      last.end = slot;
      last.size++;
    } else {
      gapGroups.push({ start: slot, end: slot, size: 1 });
    }
  }

  const renderItems: RenderItem[] = lineKeys.map((k) => ({
    type: "words" as const,
    slot: Number(k),
    lineKey: k,
  }));

  for (const gap of gapGroups) {
    const lineAfterKey = lineKeys.find((k) => Number(k) > gap.end);
    const lineBeforeKey = [...lineKeys]
      .reverse()
      .find((k) => Number(k) < gap.start);

    if (lineAfterKey) {
      const firstWord = activeLines[lineAfterKey][0];
      const [surahIdStr, verseNumStr, wordNumStr] = firstWord.location.split(":");
      if (verseNumStr === "1" && wordNumStr === "1") {
        const surahId = Number(surahIdStr);
        const hasBismillah = !CHAPTERS_WITHOUT_BISMILLAH.includes(surahIdStr);
        if (gap.size >= 2 || !hasBismillah) {
          renderItems.push({ type: "surahBanner", slot: gap.start, surahId });
        }
        if (hasBismillah) {
          renderItems.push({
            type: "bismillah",
            slot: gap.size >= 2 ? gap.start + 1 : gap.start,
          });
        }
        const wordItem = renderItems.find(
          (item) => item.type === "words" && item.lineKey === lineAfterKey,
        );
        if (wordItem && wordItem.type === "words") {
          wordItem.suppressSurahId = surahId;
        }
      }
    } else if (lineBeforeKey) {
      const wordsOnLine = activeLines[lineBeforeKey];
      const lastWord = wordsOnLine[wordsOnLine.length - 1];
      const [surahIdStr, verseNumStr] = lastWord.verse_key.split(":");
      const surahId = Number(surahIdStr);
      const versesCount = lastWord.verse.chapter.verses_count;
      if (Number(verseNumStr) === versesCount && surahId < 114) {
        renderItems.push({ type: "surahBanner", slot: gap.start, surahId: surahId + 1 });
      }
    }
  }

  renderItems.sort((a, b) => a.slot - b.slot);

  return (
    <>
      {session?.data?.user && selectedForMark ? (
        (() => {
          const colorMeta = getCurrentColorMeta(
            selectedForMark as WordWithLayouts | Verse,
          );
          const noteMeta = getCurrentNoteMeta(
            selectedForMark as WordWithLayouts | Verse,
          );
          return (
            <MarkModal
              isOpen={true}
              close={closeMarkModal}
              markFor={selectedForMark as WordWithLayouts | Verse}
              verseDisplayText={verseDisplayText}
              currentColor={colorMeta?.value}
              colorAuthorName={colorMeta && !colorMeta.isOwn ? colorMeta.authorName : null}
              currentNote={noteMeta?.value}
              noteAuthorName={noteMeta && !noteMeta.isOwn ? noteMeta.authorName : null}
              grantId={grantId}
            />
          );
        })()
      ) : null}
      {!session.data?.user && selectedForMark ? (
        <SignInModal isOpen={true} close={closeMarkModal} />
      ) : null}
      <div className="fq-full-safha flex justify-center w-full md:w-auto md:h-full">
        <div
          className={`relative w-full md:w-auto h-[calc(100dvh-5.5rem)] md:h-full ${compensateStackGap ? (stackPeekSide === "right" ? "fq-compensate-r" : "fq-compensate-l") : ""}`}
        >
          {/* Stacked "pages underneath" layers — peek toward the outer (spine-away)
              edge; also doubles as a left-page/right-page indicator in single view.
              border-muted-foreground/30 for real contrast in every theme
              (border-border was too close in lightness to bg-card in light/gold).
              bg-card dark:bg-muted: white fill in light/gold, existing muted fill
              kept in dark (already approved). */}
          <div
            className={`hidden md:block absolute inset-0 translate-y-1 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none ${stackPeekSide === "right" ? "translate-x-2" : "-translate-x-2"}`}
          />
          <div
            className={`hidden md:block absolute inset-0 translate-y-0.5 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none ${stackPeekSide === "right" ? "translate-x-1" : "-translate-x-1"}`}
          />
          <div className="relative rounded-none md:bg-card overflow-hidden md:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] w-full md:w-auto h-full md:h-full">
            {/* Content. The three `--fq-*-base` vars mirror the single-view vh
                sizing so the double-view width cap (the `[data-safha-view="double"]
                .fq-spread` rule in globals.css, ADR 0013 Addenda 3 & 4) can `min()`
                against them without a var self-reference. Single view ignores them. */}
            <div
              className="fq-content relative z-0 px-3 py-3 md:px-7 md:py-5 flex flex-col h-full"
              style={{
                "--fq-line-gap": `max(${FONT_V1.minLineGapPx()}px,${FONT_V1.getLineGapVh(quranFontScale)}vh)`,
                "--fq-heading-h": `max(${FONT_V1.minHeadingBlockPx()}px,${FONT_V1.getHeadingBlockVh(quranFontScale)}vh)`,
                "--fq-word-base": FONT_V1.getWordFontSizeCss(quranFontScale),
                "--fq-line-gap-base": `max(${FONT_V1.minLineGapPx()}px,${FONT_V1.getLineGapVh(quranFontScale)}vh)`,
                "--fq-heading-base": `max(${FONT_V1.minHeadingBlockPx()}px,${FONT_V1.getHeadingBlockVh(quranFontScale)}vh)`,
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
                className={`fq-quran-safha ${tajweedMode ? "fq-tajweed" : ""} ${page <= 2 ? "fq-safha-center" : ""} md:text-[${FONT_V1.getWordFontSizeCss(quranFontScale)}]`}
                style={{
                  fontFamily: getPageFontFamily(page, tajweedMode),
                }}
              >
                <Suspense fallback={null}>
                  {renderItems.map((item) => {
                    if (item.type === "surahBanner") {
                      return (
                        <SurahBannerLine
                          key={`banner-${item.slot}`}
                          surahId={item.surahId}
                        />
                      );
                    }
                    if (item.type === "bismillah") {
                      return <BismillahLine key={`bismillah-${item.slot}`} />;
                    }
                    return (
                      <QuranLine
                        key={item.lineKey}
                        onWordClicked={wordClicked}
                        words={activeLines[item.lineKey]}
                        marks={marks ?? {}}
                        suppressInlineHeaderForSurahId={item.suppressSurahId}
                      />
                    );
                  })}
                </Suspense>
              </div>
              {/* Footer */}
              <div
                className="shrink-0 flex items-center justify-center gap-2 pt-2 border-t border-border text-muted-foreground text-sm"
                style={{ marginTop: "var(--fq-line-gap)" }}
              >
                <span className="text-primary opacity-70 text-[10px]">◆</span>
                <span>{toLocaleNumeral(page, locale)}</span>
                <span className="text-primary opacity-70 text-[10px]">◆</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

