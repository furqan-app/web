"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import { useIsLgUp } from "@/app/hooks/use-is-lg-up";
import { useIsTablet } from "@/app/hooks/use-is-tablet";

// Strong ease-out curve (ui-motion skill recommendation for entering/exiting elements).
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const COMMIT_THRESHOLD = 80; // px
const SNAP_BACK_MS = 200;
// Commit-slide duration. The tablet carousel uses a slower, book-like page turn;
// the mobile/desktop single-panel fly-off keeps its original 220ms. Both paths
// stay exactly as before outside the tablet carousel scope — see ADR 0027.
const CAROUSEL_EXIT_MS = 380;
const SINGLE_EXIT_MS = 220;
// Finger-to-strip travel ratio during a live drag, TABLET CAROUSEL ONLY. Native/
// standard carousels (e.g. Swiper's touchRatio) default to 1:1; we amplify to 1.5
// so the wide tablet spread reveals a meaningful chunk of the neighbor without a
// full-width drag. The mobile/desktop single-panel swipe stays 1:1 (ADR 0027).
// Applied to the visual transform ONLY — COMMIT_THRESHOLD stays on raw deltaX, so
// the commit still fires at the same finger travel.
const CAROUSEL_DRAG_GAIN = 1.5;

type NavHrefs = { prevHref: string; nextHref: string };

type Props = {
  // Both are page-order (physical swipe direction), NOT locale-flipped.
  singleStep: NavHrefs; // step one page — single view (mobile, or forced-single)
  pairStep: NavHrefs; // step a whole pair — double-page spread (lg+ double view)
  // The three carousel panels (physical order in the strip is [next][current][prev]).
  // prev/next carry `fq-carousel-side` (CSS-hidden off tablet double-view).
  prevPanel: React.ReactNode;
  currentPanel: React.ReactNode;
  nextPanel: React.ReactNode;
};

export function QuranSwipeNav({
  singleStep,
  pairStep,
  prevPanel,
  currentPanel,
  nextPanel,
}: Props) {
  const router = useRouter();
  const { toggleOverlay } = useNavOverlay();
  const { view } = useQuranSafhaView();
  const isLgUp = useIsLgUp();
  const isTablet = useIsTablet();

  // Pair-step hrefs whenever a double-page spread is showing (tablet AND desktop) —
  // otherwise a single-page step lands on the same spread. Mirrors QuranSpread.
  const { prevHref, nextHref } =
    view === "double" && isLgUp ? pairStep : singleStep;

  // The 3-panel carousel geometry runs ONLY on the tablet double-view spread — the
  // exact scope where CSS reveals the neighbor panels and rests the strip at -100%
  // (see globals.css). Desktop double (lg+ but wider than tablet) and mobile keep the
  // single-panel fly-off: their neighbors are display:none, so the strip holds only
  // the current panel at translateX(0). Matching the CSS scope (useIsTablet, 1024–1366)
  // is essential — using isLgUp here would desync the JS base offset from the CSS base
  // on desktop and slide the page off-screen. See ADR 0027.
  const carousel = view === "double" && isTablet;
  const baseTx = carousel ? "-100%" : "0px";
  // Drag amplification and commit duration are carousel-only tuning; the single-
  // panel path keeps its original 1:1 tracking and 220ms fly-off (ADR 0027).
  const dragGain = carousel ? CAROUSEL_DRAG_GAIN : 1;
  const exitMs = carousel ? CAROUSEL_EXIT_MS : SINGLE_EXIT_MS;

  const stripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const snapClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set once a commit is in flight (strip animating → router.push pending). Blocks
  // a fast second swipe from starting and firing a stale navigation before the
  // first one's route change lands and remounts this component.
  const isCommitting = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (isCommitting.current) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    // Clear any lingering snap-back cleanup so the next drag starts clean.
    if (snapClearTimer.current) {
      clearTimeout(snapClearTimer.current);
      snapClearTimer.current = null;
    }
    if (stripRef.current) {
      stripRef.current.style.transition = "none";
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Until the gesture is confirmed horizontal, let native scroll handle it.
    if (!isDragging.current && Math.abs(deltaX) <= Math.abs(deltaY)) return;
    isDragging.current = true;

    if (!stripRef.current) return;
    stripRef.current.style.transition = "none";
    // Drag is anchored to the mode's rest offset (0 single / -100% carousel) so a
    // partial drag reveals the neighbor panel already sitting beside the current one.
    // deltaX is amplified by dragGain (carousel only) so a short drag reveals more.
    stripRef.current.style.transform = `translateX(calc(${baseTx} + ${deltaX * dragGain}px))`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (!isDragging.current) return;
    isDragging.current = false;

    const strip = stripRef.current;
    if (!strip) return;

    if (Math.abs(deltaX) < COMMIT_THRESHOLD) {
      // Snap back to the rest offset, then drop the inline transform so the CSS base
      // governs again (keeps the rest state correct if view/breakpoint later changes).
      strip.style.transition = `transform ${SNAP_BACK_MS}ms ${EASE_OUT}`;
      strip.style.transform = `translateX(${baseTx})`;
      snapClearTimer.current = setTimeout(() => {
        strip.style.transition = "";
        strip.style.transform = "";
      }, SNAP_BACK_MS);
      return;
    }

    // Quran text is always Arabic/RTL regardless of UI locale, so the gesture
    // mapping is constant: swipe right = next page, swipe left = previous.
    const goNext = deltaX > 0;
    const href = goNext ? nextHref : prevHref;
    // Carousel: slide the real neighbor panel to center (0% next / -200% prev), THEN
    // navigate — the landed page renders that same spread centered, so no pop.
    // Single-panel: fly the current page fully off-screen (±100%) as before.
    const commitX = carousel
      ? goNext
        ? "0%"
        : "-200%"
      : goNext
        ? "100%"
        : "-100%";

    isCommitting.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    strip.style.transition = `transform ${exitMs}ms ${EASE_OUT}`;
    strip.style.transform = `translateX(${commitX})`;
    setTimeout(() => router.push(href), exitMs);
  };

  return (
    // Outer div: touch event boundary, clips the strip during drag.
    // onClick fires for taps that didn't land on Quran words (those call
    // stopPropagation in QuranSafha.wordClicked) — used to toggle the nav overlay on tablet.
    // Portal clicks (e.g. the mark modal) bubble through the React fiber tree but originate
    // outside this DOM subtree; contains() returns false for them so they're ignored.
    <div
      className="w-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) return;
        toggleOverlay();
      }}
    >
      {/* 3-panel strip. Off the tablet double-view scope the two `fq-carousel-side`
          panels are display:none, so only the current panel lays out (at translateX 0)
          and the single-panel swipe behaves exactly as before. In the tablet scope CSS
          reveals the neighbors and rests the strip at translateX(-100%).
          dir="ltr" is REQUIRED: flex row order follows `direction`, so under the ar
          locale (rtl) the panels would lay out right-to-left and translateX(-100%) would
          push the current panel off-screen (blank). Forcing ltr keeps the physical order
          [next][current][prev] and the transform geometry identical in both locales; each
          panel restores its own dir (see ReaderPage) so the Arabic content stays rtl. */}
      <div ref={stripRef} dir="ltr" className="fq-carousel-strip relative flex w-full">
        {nextPanel}
        {currentPanel}
        {prevPanel}
      </div>
    </div>
  );
}
