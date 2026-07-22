"use client";

import { memo, MouseEvent, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { highlight, HighlightType } from "../utils/highlight";
import { WordWithLayouts } from "../types/prisma";
import { MARK_CATEGORIES } from "../constants/marks";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useQuranTajweed } from "@/app/contexts/QuranTajweedContext";

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 10; // px — max movement before a press is treated as a swipe

export type QuranWordProps = {
  word: WordWithLayouts;
  // The memorization category key of this spot's mark, if any (ADR 0025). The
  // comment is not shown on the page — highlight only.
  category?: string;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithLayouts) => void;
  // Overlay mode (mobile + tablet reader): long press opens the mark modal;
  // a short tap bubbles to QuranSwipeNav for the nav toggle.
  isOverlayMode?: boolean;
  onWordLongPressed?: (word: WordWithLayouts) => void;
};

export const QuranWord = memo(function QuranWord({
  word,
  category,
  onWordClicked,
  isOverlayMode,
  onWordLongPressed,
}: QuranWordProps) {
  const searchParams = useSearchParams();
  const { registerWordRef } = useRecitation();
  const { tajweedMode } = useQuranTajweed();
  // Stable per word.location so re-renders (e.g. searchParams changes) don't
  // needlessly unregister/re-register this word's DOM ref every time.
  const wordRefCallback = useCallback(
    (el: HTMLDivElement | null) => registerWordRef(word.location, el),
    [registerWordRef, word.location],
  );
  const highlightedVerseKey = highlight.getHighlightedVerseKey(searchParams);
  const highlightType = highlight.getHighlightType(searchParams);

  // Unknown/legacy category (e.g. old "red"/"blue"/"green" rows) is not a known
  // category — falls through to no mark highlight, per ADR 0024.
  const isKnownCategory = MARK_CATEGORIES.some((c) => c.key === category);

  const highlightClassForWord = highlight.getHighlightClass(
    highlight.shouldHighlight(word, highlightedVerseKey) || isKnownCategory,
    isKnownCategory
      ? (`${category}-mark` as HighlightType)
      : highlightType
  );

  // Long-press tracking (overlay mode only — mobile + tablet reader).
  const pressStartTime = useRef<number | null>(null);
  const pressStartX = useRef<number>(0);
  const pressStartY = useRef<number>(0);

  return (
    <div
      ref={wordRefCallback}
      onClick={(e) => {
        // In overlay mode, a short tap should reach QuranSwipeNav (nav toggle).
        // Long presses are handled in onTouchEnd with e.preventDefault(), which
        // suppresses this click event — so this handler only fires on short taps.
        if (isOverlayMode) return;
        onWordClicked(e, word);
      }}
      onTouchStart={isOverlayMode ? (e) => {
        pressStartTime.current = Date.now();
        pressStartX.current = e.touches[0].clientX;
        pressStartY.current = e.touches[0].clientY;
      } : undefined}
      onTouchEnd={isOverlayMode ? (e) => {
        if (pressStartTime.current === null) return;
        const elapsed = Date.now() - pressStartTime.current;
        const dx = e.changedTouches[0].clientX - pressStartX.current;
        const dy = e.changedTouches[0].clientY - pressStartY.current;
        const moved = Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_SLOP;
        pressStartTime.current = null;
        if (!moved && elapsed >= LONG_PRESS_MS) {
          e.preventDefault(); // suppress synthetic click → don't toggle nav
          onWordLongPressed?.(word);
        }
      } : undefined}
      className={` group relative leading-none text-black dark:text-white cursor-pointer select-none
      ${word.char_type_name === "end" ? "fq-ayah-end" : "fq-qword"}
      hover:scale-[1.06] hover:[filter:drop-shadow(1px_1px_0px_hsl(var(--foreground)/0.4))] transition-[filter,transform] duration-150
      ${highlightClassForWord}
    `}
    >
      <span>{tajweedMode ? word.code_v2 : word.code_v1}</span>
    </div>
  );
});
