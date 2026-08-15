"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { QuranLine } from "@components/QuranLine";
import { useMarks } from "@hooks/use-marks";
import { DESKTOP_QURAN_FONT_SIZES } from "@constants/font";
import { useDesktopQuranFontSize } from "@contexts/DesktopQuranFontSizeContext";
import { useQuranMushaf } from "@contexts/QuranMushafContext";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { getMarkMeta } from "@utils/marks";
import BismillahSVG from "@/app/bismillah.svg";
import SurahFrameSVG from "@/app/surah-frame.svg";
import { CHAPTERS_WITHOUT_BISMILLAH } from "@constants/surah";
import { VERSE_SNIPPET_WORD_LIMIT } from "@constants/marks";
import { MarkModal } from "./MarkModal";
import { ViewingChip } from "./reader/ViewingChip";
import { PageMetadataWithChapter, VerseForMark, WordWithVerse } from "../types/prisma";
import { useIsTablet } from "@/app/hooks/use-is-tablet";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";

// worst-case line-width/font-size ratio (p2, 2% margin); locks card minWidth
// to font scale so it's stable from first render, independent of font metrics
const QURAN_LINE_WIDTH_RATIO = 14.7;
// Widest line/font-size ratio actually MEASURED across all 604 pages (range
// 14.13–14.42; page 580 is the worst). Distinct from QURAN_LINE_WIDTH_RATIO on
// purpose: that one is a padded FLOOR for the card's width and deliberately
// exceeds any real line, this one is where the ink genuinely ends. Used to size
// the surah frame so it matches the text block instead of overhanging it by
// ~15px. Do not "unify" the two — they answer different questions.
const QURAN_MAX_LINE_WIDTH_RATIO = 14.42;
// Slots per page, not lines of words: pages 1-2 render their surah banner,
// bismillah, and blank slots as slots of their own alongside the text lines.
// This count is load-bearing now that the bars can BE the card's content —
// they set its height while the page JSON is in flight, so an undercount makes
// the card grow when the real page lands. Measured against the real layout at
// desktop spread: 15 x 1em + 14 gaps reproduces the loaded card's height exactly.
const SKELETON_LINE_COUNT = 15;
// Stable keys for the bars, so switching between the in-flow and overlay shapes
// (see the render) doesn't remount them and restart the pulse animation.
const SKELETON_BARS = Array.from({ length: SKELETON_LINE_COUNT }, (_, i) => i);

// The frame art (KFGQPC glyph U+E000) is natively 8.11:1, far squatter than a
// line slot, so spanning the text column makes its INK taller than 1em while its
// LAYOUT slot stays 1em like every other line — the overflow is absolutely
// positioned into the inter-line gap, leaving the 15-slot budget and the
// equal-height spread untouched.
//
// height MUST stay `auto` so it follows the viewBox ratio and the art is never
// distorted.
//
// WIDTH is measured from the real rendered `.fq-safha-row` lines on this same
// page, not a fixed em ratio — the two fixed-ratio attempts before this one
// (QURAN_MAX_LINE_WIDTH_RATIO, then a percentage shrink of it) each got the
// relationship between the frame and the actual line width wrong in opposite
// directions (overhanging real lines, or under/over-clearing depending on that
// page's real line width, which varies 14.13–14.42em across the mushaf) because
// neither could see what a real line on THIS page actually rendered at, in THIS
// mode/breakpoint/edition. Measuring it directly is the only way the frame is
// guaranteed to look "like any other line" everywhere. Falls back to the old
// worst-case ratio only for SSR/first paint, before the effect can measure.
// See Addendum 11.
const SurahBannerLine = ({ surahId, fontReady }: { surahId: number; fontReady: boolean }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [lineWidth, setLineWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const safha = outerRef.current?.closest(".fq-quran-safha");
    if (!safha) return;
    const measure = () => {
      let max = 0;
      safha.querySelectorAll<HTMLElement>(".fq-safha-row").forEach((row) => {
        max = Math.max(max, row.getBoundingClientRect().width);
      });
      if (max > 0) setLineWidth(max);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(safha);
    // The container's width is fixed by the page card, but its individual rows
    // widen when the QPC font replaces fallback glyphs. Observe those boxes too;
    // observing only `safha` cannot see that metric change.
    safha.querySelectorAll<HTMLElement>(".fq-safha-row").forEach((row) => {
      ro.observe(row);
    });
    // A page's QPC font commonly finishes after this component mounts. The
    // safha box itself does not resize when its glyph metrics settle, so the
    // ResizeObserver alone preserves a stale system-font measurement and makes
    // the frame visibly narrower than the Quran rows. Re-measure on font-ready
    // events as well as physical safha resizes.
    const onFontsDone = () => measure();
    document.fonts.ready.then(onFontsDone).catch(() => {});
    document.fonts.addEventListener("loadingdone", onFontsDone);
    // `document.fonts` resolves before a browser necessarily commits the new
    // glyph metrics to layout. Two frames later is the first reliable point to
    // read the final row boxes on Chromium and WebKit.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    const delayedMeasure = window.setTimeout(measure, 150);
    return () => {
      ro.disconnect();
      document.fonts.removeEventListener("loadingdone", onFontsDone);
      cancelAnimationFrame(raf);
      window.clearTimeout(delayedMeasure);
    };
  }, [fontReady]);

  return (
    <div
      ref={outerRef}
      className="fq-surah-frame leading-none relative mx-auto"
      style={{
        // marginBottom matches every other row (`.fq-safha-row`'s own inline
        // margin) so spacing below stays identical to the normal rhythm — in
        // `.fq-spread`/mobile it's zeroed by the `> * { margin-bottom: 0
        // !important }` rule same as every other row, and the container's own
        // `gap`/`space-between` takes over from there, contributing one
        // --fq-line-gap between the frame and its neighbours either way.
        // marginTop ADDS a further 0.3em on top of that — nothing zeroes
        // margin-top, in any mode — because the frame's ink overflows its 1em
        // slot on both sides (below), which ate almost all of the single
        // --fq-line-gap and left the frame touching the tashkeel of the line
        // above it (Addendum 11).
        marginTop: "0.3em",
        marginBottom: "var(--fq-line-gap)",
        height: "1em",
        color: "var(--mushaf-ornament)",
        width:
          lineWidth != null
            ? `${lineWidth}px`
            : `calc(${QURAN_MAX_LINE_WIDTH_RATIO} * var(--fq-safha-font))`,
        maxWidth: "100%",
      }}
    >
      <SurahFrameSVG
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "block",
          width: "100%",
          height: "auto",
        }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center text-black dark:text-white"
        translate="no"
        style={{ fontFamily: "var(--surah-names)", fontSize: "0.9em", lineHeight: 1 }}
      >
        {`${surahId}`.padStart(3, "0")}
      </span>
    </div>
  );
};

const BismillahLine = () => (
  <div
    className="fq-bismillah leading-none relative flex justify-center text-black dark:text-white"
    style={{ marginTop: "var(--fq-surah-start-clearance)", marginBottom: "var(--fq-line-gap)", height: "1em" }}
  >
    <BismillahSVG style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", height: "1.2em", width: "auto" }} />
  </div>
);

// A real, empty line slot — used by the pages 1-2 fixed template (see
// buildOpeningPageRenderItems) so leftover space renders as actual 1em slots
// participating in the page's flex layout, not a CSS centering/gap trick.
const BlankLine = () => (
  <div className="leading-none" style={{ marginBottom: "var(--fq-line-gap)", height: "1em" }} />
);

// Stable empty reference for the not-yet-loaded case, so the `lines`-keyed memo
// and callbacks below don't see a new object on every render while the page's
// content JSON is still in flight.
const NO_LINES: Record<string, Array<WordWithVerse>> = {};

// Placeholder that reserves a header cell's line box while its value is unknown.
// The header is the card's ONLY content-dependent dimension — the text area is
// `flex: 1 1 0%` and the card's width is floored by the worst-case line-width
// formula — so leaving its cells empty would let the header grow when the page
// JSON lands, shrinking the text area and shifting every skeleton line under it.
// A cell's height is font-size x line-height regardless of which glyph or how
// many digits it holds, so one non-breaking space reserves exactly the filled
// height rather than an approximation of it. See ADR 0034.
const RESERVED_CELL = " ";

type QuranSafhaProps = {
  page: number;
  // Both null until this page's content JSON arrives. The card still renders in
  // that state, showing its loading skeleton, so a page turn never leaves an
  // empty reader on a slow connection (ADR 0034). Rendering the real card rather
  // than a stand-in placeholder is deliberate: a duplicate skeleton drifts out of
  // sync with the layout it imitates (docs/plans/fix-quran-page-font-loading.md,
  // Issue 3), and a placeholder of a different height toggles the scrollbar and
  // reflows the document (docs/plans/fix-panel-placeholder-reflow.md).
  lines: Record<string, Array<WordWithVerse>> | null;
  pageMetadata: PageMetadataWithChapter | null;
  // True when this page's content query has no data AND is paused (offline,
  // React Query's default networkMode skips the fetch entirely rather than
  // erroring) or errored outright. Without this the skeleton above renders
  // forever — there is no other signal that the page will never arrive
  // (ADR 0014 Addendum 3). False/undefined is indistinguishable from "still
  // loading, will resolve shortly", which is correct for every other caller.
  unavailableOffline?: boolean;
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
  lines: linesProp,
  pageMetadata,
  unavailableOffline = false,
  locale,
  grantId,
  viewingOwnerName,
  stackPeekSide = "left",
  compensateStackGap = false,
}: QuranSafhaProps) => {
  // Content still in flight: everything downstream degrades on its own — no line
  // keys means no render items, and useMarks is disabled on an empty page list —
  // so only the header and the skeleton trigger need to know about it.
  const hasContent = linesProp !== null && pageMetadata !== null;
  const lines = linesProp ?? NO_LINES;
  const t = useTranslations();
  // Marks are stored against the DEFAULT edition's page. This edition's page may
  // span two of them (36 pages disagree between editions), so collect the pages
  // actually represented on screen rather than assuming `page` (ADR 0033).
  const markPages = useMemo(
    () => Array.from(new Set(Object.values(lines).flat().map((w) => w.page_number))),
    [lines],
  );
  const { data: marks } = useMarks(markPages, grantId);
  const { desktopQuranFontSize } = useDesktopQuranFontSize();
  const { edition } = useQuranMushaf();
  const isTablet = useIsTablet();
  const { isOverlayMode } = useNavOverlay();

  const [selectedForMark, setSelectedForMark] = useState<
    WordWithVerse | VerseForMark | null
  >(null);
  const [verseDisplayText, setVerseDisplayText] = useState<string | undefined>(
    undefined,
  );

  // Prevent garbled system-font fallback: show skeleton until the page-specific
  // font is ready. `font-display: block` keeps text invisible during download, so
  // the skeleton overlays the hidden text elements — nothing garbled underneath.
  // See docs/plans/fix-quran-page-font-loading.md.
  const pageFontFamily = edition.fontFamily(page);
  const fontSpec = `1px "${pageFontFamily}"`;
  // `fontReady` is authoritative via document.fonts.check(): true ONLY when this
  // page's font is currently loaded and paint-ready. This is load-bearing for the
  // persistent pager (ADR 0028): FontFaceInjector keeps @font-face rules only for
  // the current window, so a page's font rule is removed when it leaves the window
  // and re-injected (re-downloaded) when it returns. A module-level "already loaded"
  // Set goes stale here — it reports ready while the re-injected font is still
  // downloading, so font-display:block renders the text invisible with NO skeleton:
  // a blank page. check() reports the true state, so the skeleton shows until the
  // glyphs can actually paint.
  //
  // Starts false so SSR and hydration match (no Suspense mismatch); the effect syncs
  // it on mount and on every `loadingdone`. The persistent pager doesn't remount
  // panels on swipe (it moves them), so a ready page never flashes back to skeleton.
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (!cancelled) setFontReady(document.fonts.check(fontSpec));
    };
    sync();
    if (!document.fonts.check(fontSpec)) {
      document.fonts.load(fontSpec).then(sync).catch(() => {});
    }
    document.fonts.addEventListener("loadingdone", sync);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", sync);
    };
  }, [fontSpec]);

  // One shimmer covers BOTH waits. Before ADR 0034 the overlay tracked the font
  // alone, so a page whose JSON had not arrived rendered an empty card — and if
  // its font happened to be ready, an empty card with no shimmer either. Content
  // and font resolve independently, so the loading state has to answer to both or
  // it leaves a hole whenever the faster one wins.
  const showSkeleton = !fontReady || !hasContent;

  // Shared selection logic for both click (non-overlay) and long-press (overlay).
  // Stable across marks re-renders (lines only changes on page navigation).
  const selectWord = useCallback(
    (word: WordWithVerse) => {
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

  // Prevent click from bubbling to the ReaderPager strip's overlay-toggle handler.
  const wordClicked = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, word: WordWithVerse) => {
      e.stopPropagation();
      selectWord(word);
    },
    [selectWord],
  );

  // Long-press handler for overlay mode (mobile + tablet): no stopPropagation —
  // e.preventDefault() on touchend in QuranWord suppresses the synthetic click.
  const wordLongPressed = useCallback(
    (word: WordWithVerse) => selectWord(word),
    [selectWord],
  );

  const closeMarkModal = () => {
    setSelectedForMark(null);
  };

  const getCurrentMarkMeta = (markFor: WordWithVerse | VerseForMark) => {
    const markedId = "location" in markFor ? markFor.location : markFor.verse_key;
    return getMarkMeta(marks?.[markedId]);
  };

  const hizbDefaults: Record<string, string> = {
    hizb: "الحزب",
    "hizb-quarter": "ربع الحزب",
    "hizb-half": "نصف الحزب",
    "hizb-three-quarters": "ثلاث أرباع الحزب",
  };
  // juz and the surah glyph fall back to a reserved cell rather than empty text:
  // both are tall enough to drive the header row's height (the glyph at its CSS
  // font-size, juz at 10px x the inherited 1.5 line-height), so an empty one
  // would shrink the header and shift the text block below it. hizb needs no
  // fallback — it is already legitimately empty on pages with no hizb position,
  // so the row height never depends on it.
  const surahGlyph = pageMetadata
    ? `${pageMetadata.chapter.chapter_number}`.padStart(3, "0")
    : RESERVED_CELL;
  const juz = pageMetadata
    ? `${t("juz", "الجزء")} ${toLocaleNumeral(pageMetadata.juz_number, locale)}`
    : RESERVED_CELL;
  const hizb = pageMetadata?.hizb_position
    ? `${t(pageMetadata.hizb_position, hizbDefaults[pageMetadata.hizb_position])} ${toLocaleNumeral(pageMetadata.hizb_number, locale)}`
    : null;

  // `lines` already arrives grouped by the ACTIVE edition's own line numbers —
  // composed from that edition's page assignment too (ADR 0033). There is no
  // client-side re-grouping: mixing one edition's page composition with another's
  // line numbers is exactly the defect this replaced, and it fails silently
  // because each page's font has its own local glyph codepoint space.
  //
  // lineKeys must be sorted numerically; Object.keys() order is not guaranteed.
  const lineKeys = Object.keys(lines).sort((a, b) => Number(a) - Number(b));

  type RenderItem =
    | { type: "words"; slot: number; lineKey: string; suppressSurahId?: number }
    | { type: "surahBanner"; slot: number; surahId: number }
    | { type: "bismillah"; slot: number }
    | { type: "blank"; slot: number };

  let renderItems: RenderItem[];

  if (page <= 2 && lineKeys.length > 0) {
    // Fixed 15-slot template — NOT gap-derived (Addendum 10, Trello #135,
    // supersedes the "no special-casing" claim for these two pages in
    // DECISIONS.md). Banner always at slot 4, bismillah always at slot 6 when
    // the surah has one (page 1's Bismillah is verse 1:1 text, already the
    // first content line — no separate slot), content re-sequenced to start
    // right after, blank real 1em slots filling the rest. Fixed regardless of
    // the real `line_number` gap size (8 on page 1, 9 on page 2) — both pages'
    // content-line counts happen to fit this same template.
    const firstSurahId = Number(lines[lineKeys[0]][0].location.split(":")[0]);
    const hasBismillah = !CHAPTERS_WITHOUT_BISMILLAH.includes(String(firstSurahId));
    const contentStartSlot = hasBismillah ? 7 : 6;
    renderItems = [
      { type: "blank", slot: 1 },
      { type: "blank", slot: 2 },
      { type: "blank", slot: 3 },
      { type: "surahBanner", slot: 4, surahId: firstSurahId },
      { type: "blank", slot: 5 },
      ...(hasBismillah ? [{ type: "bismillah" as const, slot: 6 }] : []),
      ...lineKeys.map((k, i) => ({
        type: "words" as const,
        slot: contentStartSlot + i,
        lineKey: k,
        ...(i === 0 ? { suppressSurahId: firstSurahId } : {}),
      })),
    ];
    for (let slot = contentStartSlot + lineKeys.length; slot <= 15; slot++) {
      renderItems.push({ type: "blank", slot });
    }
  } else {
    // Find consecutive runs of slot numbers (1–15) absent from lineKeys — each
    // run is a banner/bismillah group in the printed mushaf layout.
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

    renderItems = lineKeys.map((k) => ({
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
        const firstWord = lines[lineAfterKey][0];
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
        const wordsOnLine = lines[lineBeforeKey];
        const lastWord = wordsOnLine[wordsOnLine.length - 1];
        const [surahIdStr, verseNumStr] = lastWord.verse_key.split(":");
        const surahId = Number(surahIdStr);
        const versesCount = lastWord.verse.chapter.verses_count;
        if (Number(verseNumStr) === versesCount && surahId < 114) {
          renderItems.push({ type: "surahBanner", slot: gap.start, surahId: surahId + 1 });
        }
      }
    }
  }

  renderItems.sort((a, b) => a.slot - b.slot);

  return (
    <>
      {selectedForMark ? (
        (() => {
          const markMeta = getCurrentMarkMeta(
            selectedForMark as WordWithVerse | VerseForMark,
          );
          return (
            <MarkModal
              isOpen={true}
              close={closeMarkModal}
              markFor={selectedForMark as WordWithVerse | VerseForMark}
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
          // No height utility below `md`: the card is a stretched flex item of
          // `.fq-full-safha`, whose height chains up to the ICB-anchored reader
          // wrapper (ADR 0044). This used to carry an arbitrary height utility of
          // calc(100dvh - 5.5rem) — a viewport unit that goes stale across the
          // installed PWA's fullscreen transition. Deliberately spelled out rather
          // than written as a class token: Tailwind's extractor scans comments too,
          // so quoting the original token here re-emitted the unused utility into
          // the production bundle.
          className={`relative w-full md:w-auto md:h-full ${compensateStackGap ? (stackPeekSide === "right" ? "fq-compensate-r" : "fq-compensate-l") : ""}`}
        >
          {/* Stacked paper layers are hidden on mobile and paint behind the active
              card only at md+. They peek toward stackPeekSide (the outer edge).
              2 layers everywhere, plus a deeper pair revealed only on dark desktop
              (>=1367px) by .fq-stack-deep in globals.css — the 2-layer decision
              still holds at every narrower width. Earlier siblings paint furthest
              back, so the deep pair comes first and carries the largest offsets. */}
          <div
            className={`fq-stack-layer fq-stack-deep absolute inset-0 translate-y-2 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none hidden ${stackPeekSide === "right" ? "translate-x-4" : "-translate-x-4"}`}
          />
          <div
            className={`fq-stack-layer fq-stack-deep absolute inset-0 translate-y-1.5 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none hidden ${stackPeekSide === "right" ? "translate-x-3" : "-translate-x-3"}`}
          />
          <div
            className={`fq-stack-layer absolute inset-0 translate-y-1 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none hidden md:block ${stackPeekSide === "right" ? "translate-x-2" : "-translate-x-2"}`}
          />
          <div
            className={`fq-stack-layer absolute inset-0 translate-y-0.5 rounded-none bg-card dark:bg-muted border border-muted-foreground/30 opacity-100 pointer-events-none hidden md:block ${stackPeekSide === "right" ? "translate-x-1" : "-translate-x-1"}`}
          />
          {/* On desktop the card width and word ink share --fq-card-word. That keeps
              a 26/28/30px preference proportional rather than shrinking the text
              inside an old, oversized card. Tablet/mobile rules own their widths. */}
          <div
            className={`fq-safha-card relative rounded-none overflow-hidden w-full h-full ${isTablet ? "bg-card" : "md:bg-card md:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] md:w-auto md:h-full"}`}
            style={{ "--fq-desktop-word": `${DESKTOP_QURAN_FONT_SIZES[desktopQuranFontSize]}px` } as React.CSSProperties}
          >
            {/* All desktop metrics derive from this same resolved word size. */}
            <div
              className={`fq-content relative z-0 py-1 flex flex-col h-full ${isTablet ? "" : "md:px-7 md:py-5"}`}
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
              {/* visibility:hidden keeps the real text in the DOM (preserving the
                  intrinsic width AND height the md:w-auto, content-sized card is
                  built on — ADR 0013 Addendum 2) while the skeleton overlay covers
                  it. The overlay uses visibility:visible to escape the parent's
                  hidden state — CSS visibility is overridable on children. Nothing
                  is hidden when there is no text yet; the bars below are then the
                  card's only content and must stay visible. */}
              <div
                className={`fq-quran-safha relative md:flex md:flex-col md:items-center ${edition.usesColorGlyphs ? "fq-tajweed" : ""}`}
                style={{
                  fontFamily: pageFontFamily,
                  ...(hasContent && !fontReady ? { visibility: "hidden" as const } : {}),
                }}
              >
                {/* Two shapes, one look. With content mounted the bars overlay it,
                    absolutely positioned so they add no height of their own. With
                    NO content they ARE the content: rendered in flow as direct
                    children, they inherit this element's real flex distribution,
                    --fq-line-gap and padding, so 15 bars of 1em reproduce the
                    loaded page's height exactly (measured: identical to the px).
                    An overlay here instead would contribute zero height and, on the
                    content-sized desktop spread, collapse the whole card to its
                    header and footer — which is what shipped and had to be fixed. */}
                {/* Layered over the skeleton bars rather than replacing them —
                    the bars are what gives this no-content state its correct
                    height (see the comment above); this only adds a message on
                    top, same technique as the fontReady overlay. */}
                {!hasContent && unavailableOffline && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground text-center">
                      <WifiOff className="size-3.5 shrink-0" strokeWidth={1.8} />
                      {t(
                        "offline.notAvailableOffline",
                        "This page hasn't been downloaded yet — connect to the internet to read it.",
                      )}
                    </p>
                  </div>
                )}
                {showSkeleton &&
                  (hasContent ? (
                    <div
                      className={`absolute inset-0 flex flex-col fq-skeleton-lines justify-between ${edition.usesColorGlyphs ? "pt-[1em] md:pt-[0.5em]" : "pt-[0.5em]"} pb-[0.5em]`}
                      style={{ visibility: "visible" }}
                    >
                      {SKELETON_BARS.map((i) => (
                        <div key={i} className="h-[1em] w-full rounded-sm bg-muted/60 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    SKELETON_BARS.map((i) => (
                      <div
                        key={i}
                        className="h-[1em] shrink-0 rounded-sm bg-muted/60 animate-pulse"
                        // Width in em, NOT w-full. These bars are the card's only
                        // content while the JSON is in flight, and the card is
                        // shrink-to-fit (md:w-auto) — a percentage width does not
                        // contribute to intrinsic sizing, so the card resolved
                        // against available space instead (measured 785px against a
                        // real 523px, correcting a frame later, and publishing that
                        // over-wide value into --fq-spread-width, which is what made
                        // the recitation bar jump). A real mushaf line is
                        // QURAN_LINE_WIDTH_RATIO em wide by construction, so this
                        // reproduces it exactly. max-width keeps mobile honest, where
                        // the font can hit its 28px cap before the line fills the
                        // viewport. Inline style, not a Tailwind arbitrary value: the
                        // ratio is a JS constant and a dynamic class would need a
                        // literal safelist entry to exist at all (ADR 0005).
                        style={{ width: `${QURAN_LINE_WIDTH_RATIO}em`, maxWidth: "100%" }}
                      />
                    ))
                  ))}
                <Suspense fallback={null}>
                  {renderItems.map((item) => {
                    if (item.type === "surahBanner") {
                      return (
                        <SurahBannerLine
                          key={`banner-${item.slot}`}
                          surahId={item.surahId}
                          fontReady={fontReady}
                        />
                      );
                    }
                    if (item.type === "bismillah") {
                      return <BismillahLine key={`bismillah-${item.slot}`} />;
                    }
                    if (item.type === "blank") {
                      return <BlankLine key={`blank-${item.slot}`} />;
                    }
                    return (
                      <QuranLine
                        key={item.lineKey}
                        onWordClicked={wordClicked}
                        onWordLongPressed={wordLongPressed}
                        isOverlayMode={isOverlayMode}
                        words={lines[item.lineKey]}
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
