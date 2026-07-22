"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Verse } from "@/app/generated/quran-client";
import { QuranLine } from "@components/QuranLine";
import { useMarks } from "@hooks/use-marks";
import { FONT_V1 } from "@constants/font";
import { useQuranFontScale } from "@contexts/QuranFontScaleContext";
import { useQuranTajweed } from "@contexts/QuranTajweedContext";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { getPageFontFamily } from "@utils/quran-font-map";
import { getMarkMeta } from "@utils/marks";
import { groupBy } from "@utils/groupBy";
import BismillahSVG from "@/app/bismillah.svg";
import SurahFrameSVG from "@/app/surah-frame.svg";
import { CHAPTERS_WITHOUT_BISMILLAH } from "@constants/surah";
import { VERSE_SNIPPET_WORD_LIMIT } from "@constants/marks";
import { MarkModal } from "./MarkModal";
import { ViewingChip } from "./reader/ViewingChip";
import { PageMetadataWithChapter, WordWithLayouts } from "../types/prisma";
import { useIsTablet } from "@/app/hooks/use-is-tablet";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";

// Populated by QuranSafha when a page font finishes loading. Module-level so it
// survives navigation remounts — the new QuranSafha instance for the same page
// (or its carousel neighbor) can read the cached value synchronously during render.
const loadedFonts = new Set<string>();

// worst-case line-width/font-size ratio (p2, 2% margin); locks card minWidth
// to font scale so it's stable from first render, independent of font metrics
const QURAN_LINE_WIDTH_RATIO = 14.7;
// approximate lines per full Quran page; pages 1-2 (fq-safha-center) are shorter
const SKELETON_LINE_COUNT = 15;
const SKELETON_LINE_COUNT_SHORT = 7;

const SurahBannerLine = ({ surahId }: { surahId: number }) => (
  <div
    className="leading-none relative w-full"
    style={{ marginBottom: "var(--fq-line-gap)", color: "hsl(var(--card))" }}
  >
    <SurahFrameSVG style={{ display: "block", width: "100%", height: "1em" }} />
    <span
      className="absolute inset-0 flex items-center justify-center text-black dark:text-white"
      translate="no"
      style={{ fontFamily: "var(--surah-names)", fontSize: "0.85em", lineHeight: 1 }}
    >
      {`${surahId}`.padStart(3, "0")}
    </span>
  </div>
);

const BismillahLine = () => (
  <div
    className="fq-bismillah leading-none relative flex justify-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)", height: "1em" }}
  >
    <BismillahSVG style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", height: "1.2em", width: "auto" }} />
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
  const t = useTranslations();
  const { data: marks } = useMarks(page, grantId);
  const { quranFontScale } = useQuranFontScale();
  const { tajweedMode } = useQuranTajweed();
  const isTablet = useIsTablet();
  const { isOverlayMode } = useNavOverlay();

  const [selectedForMark, setSelectedForMark] = useState<
    WordWithLayouts | Verse | null
  >(null);
  const [verseDisplayText, setVerseDisplayText] = useState<string | undefined>(
    undefined,
  );

  // Prevent garbled system-font fallback: show skeleton until the page-specific
  // font is ready. `font-display: block` keeps text invisible during download, so
  // the skeleton overlays the hidden text elements — nothing garbled underneath.
  // See docs/plans/fix-quran-page-font-loading.md.
  const pageFontFamily = getPageFontFamily(page, tajweedMode);
  const fontSpec = `1px "${pageFontFamily}"`;
  // Lazy initializer reads loadedFonts (module-level) synchronously during render.
  // Hydration-safe: loadedFonts is always empty on the first page load because
  // useEffect (which populates it) has not run yet — both server and client start
  // false, no Suspense boundary mismatch. On swipe navigation (client-only remount),
  // the carousel neighbor's useEffect has already added its fontSpec to loadedFonts,
  // so the new QuranSafha instance starts fontReady=true immediately — no skeleton flash.
  const [fontReady, setFontReady] = useState(() => loadedFonts.has(fontSpec));
  useEffect(() => {
    if (loadedFonts.has(fontSpec)) {
      setFontReady(true);
      return;
    }
    setFontReady(false);
    document.fonts.load(fontSpec).then(() => {
      loadedFonts.add(fontSpec);
      setFontReady(true);
    });
  }, [fontSpec]);

  // Stable across marks re-renders (lines only changes on page navigation, not marks load),
  // so React.memo(QuranWord) can bail out for words whose category hasn't changed.
  const wordClicked = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      word: WordWithLayouts,
    ) => {
      // Prevent the click from bubbling to QuranSwipeNav's overlay-toggle handler.
      e.stopPropagation();
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
    },
    [lines],
  );

  // Long-press handler for overlay mode (mobile + tablet): same logic as
  // wordClicked but no stopPropagation — that's handled in QuranWord via
  // e.preventDefault() on the touchend, which suppresses the synthetic click.
  const wordLongPressed = useCallback(
    (word: WordWithLayouts) => {
      if (word.char_type_name === "word") {
        setSelectedForMark(word);
        setVerseDisplayText(undefined);
      } else if (word.char_type_name === "end") {
        const allWords = Object.values(lines).flat();
        const displayWords = allWords
          .filter(
            (w) =>
              w.verse_key === word.verse_key && w.char_type_name === "word",
          )
          .map((w) => w.qpc_uthmani_hafs);
        const displayText =
          displayWords.length > VERSE_SNIPPET_WORD_LIMIT
            ? `${displayWords.slice(0, VERSE_SNIPPET_WORD_LIMIT).join(" ")} ...`
            : displayWords.join(" ");
        setSelectedForMark(word.verse);
        setVerseDisplayText(displayText);
      }
    },
    [lines],
  );

  const closeMarkModal = () => {
    setSelectedForMark(null);
  };

  const getCurrentMarkMeta = (markFor: WordWithLayouts | Verse) => {
    const markedId = "location" in markFor ? markFor.location : markFor.verse_key;
    return getMarkMeta(marks?.[markedId]);
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
      {selectedForMark ? (
        (() => {
          const markMeta = getCurrentMarkMeta(
            selectedForMark as WordWithLayouts | Verse,
          );
          return (
            <MarkModal
              isOpen={true}
              close={closeMarkModal}
              markFor={selectedForMark as WordWithLayouts | Verse}
              verseDisplayText={verseDisplayText}
              currentCategory={markMeta?.category}
              currentComment={markMeta?.comment ?? undefined}
              authorName={markMeta && !markMeta.isOwn ? markMeta.authorName : null}
              grantId={grantId}
            />
          );
        })()
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
          {/* Deeper paper-stack layers — tablet reader only (`fq-stack-tablet` is
              display:none everywhere else). Rendered before the base two so they
              paint underneath; progressively more offset + fainter for a soft fan.
              On tablet globals.css recolours all four to thin low-contrast paper
              edges. Desktop is unchanged (only the two base `md:block` layers). */}
          <div
            className={`fq-stack-layer fq-stack-tablet absolute inset-0 translate-y-[7px] rounded-none bg-card dark:bg-muted border border-muted-foreground/30 pointer-events-none ${stackPeekSide === "right" ? "translate-x-[14px]" : "-translate-x-[14px]"}`}
            style={{ opacity: 0.4 }}
          />
          <div
            className={`fq-stack-layer fq-stack-tablet absolute inset-0 translate-y-[5px] rounded-none bg-card dark:bg-muted border border-muted-foreground/30 pointer-events-none ${stackPeekSide === "right" ? "translate-x-[11px]" : "-translate-x-[11px]"}`}
            style={{ opacity: 0.6 }}
          />
          <div
            className={`fq-stack-layer absolute inset-0 translate-y-1 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none block ${stackPeekSide === "right" ? "translate-x-2" : "-translate-x-2"}`}
          />
          <div
            className={`fq-stack-layer absolute inset-0 translate-y-0.5 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none block ${stackPeekSide === "right" ? "translate-x-1" : "-translate-x-1"}`}
          />
          {/* min(100vw,...) caps the formula on narrow viewports so the card never
              overflows on mobile; on desktop it locks the width to the font-scale
              formula (font-size * worst-case-ratio + md:px-7 padding) so the card
              is stable from first render — not driven by font metrics. */}
          <div
            className={`fq-safha-card relative rounded-none overflow-hidden w-full h-full ${isTablet ? "bg-card" : "md:bg-card md:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] md:w-auto md:h-full"}`}
            style={isTablet ? undefined : { minWidth: `min(100vw, calc(${FONT_V1.getWordFontSizeCss(quranFontScale)} * ${QURAN_LINE_WIDTH_RATIO} + 3.5rem))` }}
          >
            {/* Content. The three `--fq-*-base` vars mirror the single-view vh
                sizing so the double-view width cap (the `[data-safha-view="double"]
                .fq-spread` rule in globals.css, ADR 0013 Addenda 3 & 4) can `min()`
                against them without a var self-reference. Single view ignores them. */}
            <div
              className={`fq-content relative z-0 py-1 flex flex-col h-full ${isTablet ? "" : "md:px-7 md:py-5"}`}
              style={{
                "--fq-word-base": FONT_V1.getWordFontSizeCss(quranFontScale),
                "--fq-line-gap-base": `max(${FONT_V1.minLineGapPx()}px,${FONT_V1.getLineGapVh(quranFontScale)}vh)`,
                "--fq-heading-base": `max(${FONT_V1.minHeadingBlockPx()}px,${FONT_V1.getHeadingBlockVh(quranFontScale)}vh)`,
              } as React.CSSProperties}
            >
              {/* Header: 3-column — juz | ◆ surah ◆ | hizb */}
              <div
                dir="rtl"
                className="fq-safha-header shrink-0 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-cols-3 items-center py-3 px-6"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {grantId ? (
                    <ViewingChip ownerName={viewingOwnerName} />
                  ) : null}
                  <span className="fq-safha-meta min-w-0 truncate text-[10px] font-bold tracking-normal md:tracking-widest text-muted-foreground">
                    {juz}
                  </span>
                </span>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="fq-ornament inline-block rotate-45 text-[6px] text-primary">◆</span>
                  <span
                    className="fq-safha-surah-glyph"
                    translate="no"
                    style={{ fontFamily: "var(--surah-names)", lineHeight: 1 }}
                  >
                    {surahGlyph}
                  </span>
                  <span className="fq-ornament inline-block rotate-45 text-[6px] text-primary">◆</span>
                </div>
                <span className="fq-safha-meta whitespace-nowrap text-[10px] font-bold tracking-normal md:tracking-widest text-muted-foreground text-end">{hizb ?? ""}</span>
              </div>
              {/* Quran text */}
              {/* visibility:hidden keeps the text in the DOM (preserving intrinsic
                  width for the md:w-auto card) while the skeleton overlay covers it.
                  The overlay uses visibility:visible to escape the parent's hidden
                  state — CSS visibility is overridable on children. */}
              <div
                className={`fq-quran-safha relative md:flex md:flex-col md:items-center ${tajweedMode ? "fq-tajweed" : ""} ${page <= 2 ? "fq-safha-center" : ""} md:text-[${FONT_V1.getWordFontSizeCss(quranFontScale)}]`}
                style={{
                  fontFamily: pageFontFamily,
                  ...(fontReady ? {} : { visibility: "hidden" as const }),
                }}
              >
                {!fontReady && (
                  <div
                    className={`absolute inset-0 flex flex-col ${page <= 2 ? "justify-center gap-[0.55em]" : "fq-skeleton-lines justify-between"} ${tajweedMode ? "pt-[1em] md:pt-[0.5em]" : "pt-[0.5em]"} pb-[0.5em]`}
                    style={{ visibility: "visible" }}
                  >
                    {Array.from({ length: page <= 2 ? SKELETON_LINE_COUNT_SHORT : SKELETON_LINE_COUNT }, (_, i) => (
                      <div key={i} className="h-[1em] w-full rounded-sm bg-muted/60 animate-pulse" />
                    ))}
                  </div>
                )}
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
                        onWordLongPressed={wordLongPressed}
                        isOverlayMode={isOverlayMode}
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
                className="fq-safha-footer shrink-0 flex items-center justify-center gap-2 text-muted-foreground text-sm"
              >
                <span className="fq-ornament text-primary opacity-70 text-[10px]">◆</span>
                <span>{toLocaleNumeral(page, locale)}</span>
                <span className="fq-ornament text-primary opacity-70 text-[10px]">◆</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
