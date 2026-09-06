"use client";

import { memo, MouseEvent, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { highlight, HighlightType } from "../utils/highlight";
import { WordWithVerse } from "../types/prisma";
import { MARK_CATEGORIES } from "../constants/marks";

const LONG_PRESS_MS = 400;
const LONG_PRESS_SLOP = 10; // px — max movement before a press is treated as a swipe

export type QuranWordProps = {
  word: WordWithVerse;
  // The memorization category key of this spot's mark, if any (ADR 0025). The
  // comment is not shown on the page — highlight only.
  category?: string;
  onWordClicked: (e: MouseEvent<HTMLDivElement>, word: WordWithVerse) => void;
  // Overlay mode (mobile + tablet reader): long press opens the mark modal;
  // a short tap bubbles to the ReaderPager strip for the nav toggle.
  isOverlayMode?: boolean;
  onWordLongPressed?: (word: WordWithVerse) => void;
};

export const QuranWord = memo(function QuranWord({
  word,
  category,
  onWordClicked,
  isOverlayMode,
  onWordLongPressed,
}: QuranWordProps) {
  const searchParams = useSearchParams();
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartX = useRef<number>(0);
  const pressStartY = useRef<number>(0);
  const didLongPress = useRef<boolean>(false);

  const clearLongPressTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  return (
    <div
      // Recitation's word-level highlight finds its targets by this attribute
      // (RecitationContext.setWordHighlightClass), so this component does not
      // consume RecitationContext at all — which is what keeps a context that
      // ticks per recited word from re-rendering the whole word tree (ADR 0021).
      data-fq-word={word.location}
      onClick={(e) => {
        // In overlay mode, a short tap should reach the ReaderPager strip (nav toggle).
        // Long presses suppress synthetic clicks via e.preventDefault() in onTouchEnd
        // and stop propagation here if a synthetic click still reaches onClick.
        if (isOverlayMode) {
          if (didLongPress.current) {
            e.stopPropagation();
            didLongPress.current = false;
          }
          return;
        }
        onWordClicked(e, word);
      }}
      onTouchStart={
        isOverlayMode
          ? (e) => {
              if (e.touches.length > 1) {
                clearLongPressTimer();
                return;
              }
              clearLongPressTimer();
              didLongPress.current = false;
              pressStartX.current = e.touches[0].clientX;
              pressStartY.current = e.touches[0].clientY;

              timerRef.current = setTimeout(() => {
                didLongPress.current = true;
                timerRef.current = null;
                if (
                  typeof navigator !== "undefined" &&
                  typeof navigator.vibrate === "function"
                ) {
                  try {
                    navigator.vibrate(15);
                  } catch {
                    // Ignore haptic vibration errors in restricted environments
                  }
                }
                onWordLongPressed?.(word);
              }, LONG_PRESS_MS);
            }
          : undefined
      }
      onTouchMove={
        isOverlayMode
          ? (e) => {
              if (timerRef.current === null) return;
              if (e.touches.length > 1) {
                clearLongPressTimer();
                return;
              }
              const dx = e.touches[0].clientX - pressStartX.current;
              const dy = e.touches[0].clientY - pressStartY.current;
              if (dx * dx + dy * dy > LONG_PRESS_SLOP * LONG_PRESS_SLOP) {
                clearLongPressTimer();
              }
            }
          : undefined
      }
      onTouchEnd={
        isOverlayMode
          ? (e) => {
              clearLongPressTimer();
              if (didLongPress.current) {
                e.preventDefault(); // suppress synthetic click → don't toggle nav
                // Keep flag briefly active so if a delayed synthetic click fires,
                // the onClick handler above catches and stopPropagation's it.
                setTimeout(() => {
                  didLongPress.current = false;
                }, 100);
              }
            }
          : undefined
      }
      onTouchCancel={
        isOverlayMode
          ? () => {
              clearLongPressTimer();
              didLongPress.current = false;
            }
          : undefined
      }
      className={`group relative leading-none text-black dark:text-white cursor-pointer select-none
      ${word.char_type_name === "end" ? "fq-ayah-end" : "fq-qword"}
      hover:scale-[1.06] hover:[filter:drop-shadow(1px_1px_0px_hsl(var(--foreground)/0.4))] transition-[filter,transform] duration-150
      ${highlightClassForWord}
    `}
    >
      <span>{word.glyph}</span>
    </div>
  );
});
