"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Locale } from "@/app/types/config";
import { PageWords } from "@/app/hooks/get-page-words";
import { usePage, fetchPageAPI, pageQueryKey } from "@/app/hooks/use-quran-page";
import { getPagePair } from "@/app/utils/quran-pages";
import { getLanguageDirection } from "@/app/utils/i18n";
import { getFirstVerseKeyOfPage } from "@/app/utils/recitation";
import { QuranSpread } from "@/app/components/reader/QuranSpread";
import { FontFaceInjector } from "@/app/components/reader/FontFaceInjector";
import { RecitationPageSync } from "@/app/components/reader/RecitationPageSync";
import { RecitationFollow } from "@/app/components/reader/RecitationFollow";
import { ReaderPageSync } from "@/app/components/reader/ReaderPageSync";
import { MushafSwitchSync } from "@/app/components/reader/MushafSwitchSync";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import { useIsLgUp } from "@/app/hooks/use-is-lg-up";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
import { DEFAULT_MUSHAF_ID } from "@/app/utils/mushaf-editions";
import { ensurePageFonts, pageFontsReady } from "@/app/utils/page-font-registry";

const TOTAL_PAGES = 604;
const TOTAL_PAIRS = TOTAL_PAGES / 2;

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const COMMIT_THRESHOLD = 80; // px
const SNAP_BACK_MS = 200;
const EXIT_MS = 300; // book-like reveal slide

type NavHrefs = { prevHref: string; nextHref: string };

// The physical next/prev anchor from `from`, in whatever unit the pager currently
// steps in — one page in single view, one facing pair in double view. Wraps at the
// ends exactly as the reader always has (page 1 <-> 604). Used both for the live
// window and for the Stage B lookahead, which needs to step twice.
const stepAnchor = (from: number, goNext: boolean, isDouble: boolean): number => {
  if (!isDouble) {
    if (goNext) return from === TOTAL_PAGES ? 1 : from + 1;
    return from === 1 ? TOTAL_PAGES : from - 1;
  }
  const { rightPage, leftPage } = getPagePair(from);
  if (goNext) return leftPage === TOTAL_PAGES ? 1 : leftPage + 1;
  return rightPage === 1 ? TOTAL_PAGES - 1 : rightPage - 2;
};

// Locale-aware in-spread arrow hrefs for any anchor page (kept for SSR/no-JS +
// middle-click; the pager intercepts plain clicks — see QuranSpread.onNavigate).
const computeSpreadNav = (
  anchorPage: number,
  isRTL: boolean,
  basePath: string,
): { singleStepNav: NavHrefs; pairStepNav: NavHrefs } => {
  const { rightPage: rightPageId } = getPagePair(anchorPage);
  const pageIdStr = String(anchorPage);

  const getNavigationHref = (isNext: boolean) => {
    const isFirstPage = pageIdStr === "1";
    const isLastPage = pageIdStr === String(TOTAL_PAGES);
    if ((isRTL && !isNext) || (!isRTL && isNext)) {
      return isFirstPage ? String(TOTAL_PAGES) : String(anchorPage - 1);
    }
    return isLastPage ? "1" : String(anchorPage + 1);
  };

  const pairIndex = (rightPageId + 1) / 2;
  const getPairNavigationHref = (isNext: boolean) => {
    const isFirstPair = pairIndex === 1;
    const isLastPair = pairIndex === TOTAL_PAIRS;
    const neighborIndex =
      (isRTL && !isNext) || (!isRTL && isNext)
        ? isFirstPair
          ? TOTAL_PAIRS
          : pairIndex - 1
        : isLastPair
          ? 1
          : pairIndex + 1;
    return String(neighborIndex * 2 - 1);
  };

  return {
    singleStepNav: {
      prevHref: `${basePath}/${getNavigationHref(false)}`,
      nextHref: `${basePath}/${getNavigationHref(true)}`,
    },
    pairStepNav: {
      prevHref: `${basePath}/${getPairNavigationHref(false)}`,
      nextHref: `${basePath}/${getPairNavigationHref(true)}`,
    },
  };
};

// One carousel panel: a full-width reader spread for `anchor`, client-fetched
// via usePage. Memoized so panels whose anchor is unchanged when the window
// shifts don't re-render. Renders the spread whether or not its data has arrived
// — until it does, the spread shows the card's loading state rather than an empty
// area, so a commit onto an uncached page is never a blank reader (ADR 0034).
type PanelProps = {
  anchor: number;
  isRTL: boolean;
  locale: Locale;
  basePath: string;
  grantId?: string;
  viewingOwnerName?: string | null;
  onNavigate: (targetPage: number) => void;
};

const Panel = memo(function Panel({
  anchor,
  isRTL,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
  onNavigate,
}: PanelProps) {
  const { rightPage, leftPage } = getPagePair(anchor);
  const rightData = usePage(rightPage).data;
  const leftData = usePage(leftPage).data;
  const { singleStepNav, pairStepNav } = computeSpreadNav(anchor, isRTL, basePath);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="w-full shrink-0">
      <div className="fq-reader-outer bg-background w-full min-h-[calc(100dvh-3.5rem)] pb-4 flex flex-col items-center justify-start md:justify-center px-0">
        <div className="fq-reader-spread-container w-full flex justify-center items-start md:items-center px-0 md:ps-14 md:pe-10 gap-0 md:gap-8">
          {/* Rendered whether or not the data has landed: the spread shows its
              own loading state from the page ids alone (ADR 0034). This panel used
              to render an empty <div> while its JSON was in flight, so on a slow
              connection a commit landed on a blank reader for as long as the fetch
              took — 350-425ms on 3G, chaining straight into the font wait behind
              it. Because the loading state is the real card and not a stand-in, the
              panel is exactly as tall loaded as unloaded, which is what keeps
              Trello #157 fixed: a placeholder taller than its content toggles the
              vertical scrollbar, and those 19px of layout width reflow the whole
              document and drag the strip's percentage-based translateX with them
              (docs/plans/fix-panel-placeholder-reflow.md). */}
          <QuranSpread
            currentPageId={anchor}
            rightPage={{
              pageId: rightPage,
              lines: rightData?.lines ?? null,
              pageMetadata: rightData?.pageMetadata ?? null,
            }}
            leftPage={{
              pageId: leftPage,
              lines: leftData?.lines ?? null,
              pageMetadata: leftData?.pageMetadata ?? null,
            }}
            isRTL={isRTL}
            locale={locale}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            singleStepNav={singleStepNav}
            pairStepNav={pairStepNav}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
});

type Props = {
  initialPage: number;
  rightPageId: number;
  leftPageId: number;
  initialRightData: PageWords;
  initialLeftData: PageWords;
  locale: Locale;
  basePath: string;
  grantId?: string;
  viewingOwnerName?: string | null;
};

// Persistent client pager (ADR 0028). Mounts once and swaps pages via local
// `anchor` state — never router.push, so the reader shell never remounts and a
// swipe never re-downloads a multi-page RSC payload. Renders a live 3-panel
// window [next][current][prev] resting at translateX(-100%) so the drag reveals
// the real, prefetched neighbor; on commit it slides to that neighbor, swaps the
// anchor, and silently re-centers (the classic carousel recenter).
export function ReaderPager({
  initialPage,
  rightPageId,
  leftPageId,
  initialRightData,
  initialLeftData,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
}: Props) {
  const queryClient = useQueryClient();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { view } = useQuranSafhaView();
  const isLgUp = useIsLgUp();
  const { toggleOverlay } = useNavOverlay();
  const { mushafId, edition } = useQuranMushaf();

  // Seed the SSR pair once, before children (usePage) render, so the initial page
  // paints synchronously from cache with no fetch/skeleton.
  // The server renders the default edition, so this seed is only valid for it —
  // seeding it under another edition's key would show that edition's font over
  // the default edition's word placement (ADR 0033).
  const seededRef = useRef(false);
  if (!seededRef.current && mushafId === DEFAULT_MUSHAF_ID) {
    queryClient.setQueryData(pageQueryKey(rightPageId, mushafId), initialRightData);
    queryClient.setQueryData(pageQueryKey(leftPageId, mushafId), initialLeftData);
    seededRef.current = true;
  }

  const [anchor, setAnchor] = useState(initialPage);

  const pageNumber = anchor;
  const { rightPage: curRightId, leftPage: curLeftId } = getPagePair(pageNumber);

  const isDouble = view === "double" && isLgUp;
  const nextAnchor = stepAnchor(pageNumber, true, isDouble);
  const prevAnchor = stepAnchor(pageNumber, false, isDouble);

  // Seed cache reads for the current pair so firstVerseKey is available.
  const rightData = usePage(curRightId).data;
  const leftData = usePage(curLeftId).data;

  const stripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const snapClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCommitting = useRef(false);
  // Which way the reader is moving, so the Stage B lookahead warms the page they
  // are heading toward rather than the one behind them. Forward by default —
  // that is the reading direction, and it is what a fresh deep-link entry should
  // bet on. Only a neighbor-step commit updates it; a jump to an arbitrary page
  // (recitation follow, edition switch) leaves the last known direction alone.
  const lastDirection = useRef<"next" | "prev">("next");
  // Input that arrives while a commit is in flight (Trello #153, ADR 0028
  // Addendum 2026-08-11). Exactly ONE step is held, latest-intent-wins: a deeper
  // queue turns rapid swiping into page overshoot, which is harder to recover
  // from than coalescing. A step stores a DIRECTION, not a resolved page — the
  // in-flight commit moves the anchor, so a page captured now names the wrong
  // one by the time this drains. Only an arbitrary jump stores its target.
  const pendingNav = useRef<
    { kind: "step"; goNext: boolean } | { kind: "page"; target: number } | null
  >(null);
  // Reassigned every render so draining reads fresh nextAnchor/prevAnchor — the
  // same pattern navRef uses below.
  const drainRef = useRef<() => void>(() => {});
  // A gesture that BEGAN while a commit was in flight stays transform-free for its
  // whole life, even after that commit lands mid-drag. Without this latch the next
  // move event after the hand-off writes `translateX(-100% + deltaX)` with the
  // finger's full accumulated travel — a visible teleport of ≥ COMMIT_THRESHOLD px.
  const gestureIsQueueOnly = useRef(false);

  // Apply a queued step once the commit that blocked it has landed. Deferred to a
  // microtask, never inline: `commitTo` runs inside `flushSync`, which flushes
  // passive effects synchronously, so an inline follow-up would see
  // `isCommitting` still true, be guarded out, and never retry — the same trap
  // `followTo` documents below. The microtask runs after that flush unwinds, so
  // the anchor has settled and the fresh-anchor closure in `drainRef` resolves the
  // right target.
  const scheduleDrain = () => {
    if (pendingNav.current) queueMicrotask(() => drainRef.current());
  };

  // The single choke point for queueing, so latest-intent-wins (and the one-deep
  // cap) is enforced in one place rather than emerging from three call sites — the
  // shape that let this bug diverge across inputs in the first place.
  const enqueueStep = (goNext: boolean) => {
    pendingNav.current = { kind: "step", goNext };
  };
  const enqueuePage = (target: number) => {
    pendingNav.current = { kind: "page", target };
  };

  // Swap the anchor and re-center atomically. The panel revealed during the drag
  // (an outer slot) and the panel that must sit at the -100% rest slot are
  // different DOM subtrees, so the content swap and the transform reset MUST land
  // in the same paint — otherwise a frame paints the pre-reset transform over the
  // freshly-swapped content (a one-frame flash of the wrong page). `flushSync`
  // forces React to apply the new content synchronously; setting the transform
  // right after, still in the same task, guarantees a single seamless paint. A
  // useLayoutEffect reset is NOT reliable here — React 18 can yield to a paint
  // before it runs (see docs/plans/fix-safha-swipe-flicker.md).
  const commitTo = useCallback(
    (target: number) => {
      window.history.replaceState(null, "", `${basePath}/${target}`);
      const strip = stripRef.current;
      if (!strip) {
        setAnchor(target);
        isCommitting.current = false;
        scheduleDrain();
        return;
      }
      strip.style.transition = "none";
      flushSync(() => setAnchor(target));
      strip.style.transform = "translateX(-100%)";
      isCommitting.current = false;
      scheduleDrain();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scheduleDrain reads
    // only refs, so it is safe to omit; including it would churn commitTo's
    // identity every render, and Panel memo stability depends on it (ADR 0028).
    [basePath],
  );

  // Jump straight to a page with no strip animation — used when the mushaf
  // edition changes and the same verse now lives on a different page.
  const jumpTo = useCallback(
    (target: number) => {
      // An edition switch relocates the reader by verse, so a queued page step
      // from before the switch is meaningless — drop it rather than replay it.
      pendingNav.current = null;
      window.history.replaceState(null, "", `${basePath}/${target}`);
      const strip = stripRef.current;
      if (strip) strip.style.transition = "none";
      setAnchor(target);
      if (strip) strip.style.transform = "translateX(-100%)";
    },
    [basePath],
  );

  // Resolve the physical next/prev neighbor and commit to it. Shared by swipe, the
  // in-spread arrows, and the keyboard — target resolution lives here only.
  //
  // `animate` gates the slide on INPUT SOURCE, not breakpoint: the slide exists to
  // continue a drag's live transform from wherever the finger released, so only a
  // swipe passes true. A click or keypress has no transform in flight, so replaying
  // the gesture's release animation reads as a phantom swipe — and per ui-motion,
  // frequent and keyboard-initiated actions should feel instant. Those callers pass
  // false and fall into the same commitTo branch prefers-reduced-motion takes.
  // Deliberately not gated on isLgUp: the arrows render from md, so a breakpoint
  // gate would leave tablet arrow-taps sliding and would kill the swipe animation
  // on a touch laptop (see docs/plans/arrow-controls-desktop.md, Addendum 1).
  const animateCommit = useCallback(
    (goNext: boolean, animate = true) => {
      const strip = stripRef.current;
      const target = goNext ? nextAnchor : prevAnchor;
      isCommitting.current = true;
      lastDirection.current = goNext ? "next" : "prev";
      if (!animate || !strip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        commitTo(target);
        return;
      }
      strip.style.transition = `transform ${EXIT_MS}ms ${EASE_OUT}`;
      // next lives in the left slot (reveal by dragging right → toward 0%);
      // prev in the right slot (toward -200%).
      strip.style.transform = `translateX(${goNext ? "0%" : "-200%"})`;
      window.setTimeout(() => commitTo(target), EXIT_MS);
    },
    [nextAnchor, prevAnchor, commitTo],
  );

  // Follow target for <RecitationFollow>. The recitation subscription lives in that
  // leaf so this pager never re-renders on a recited-word tick; the leaf calls this
  // stable callback when the recited page leaves the visible window.
  //
  // Deferred to a microtask, NOT run inline: the leaf's follow effect can fire
  // synchronously INSIDE commitTo's `flushSync` (which flushes passive effects), at
  // which point `isCommitting` is still true (it clears on the next line) and a
  // direct commitTo would nest one flushSync inside another. A microtask runs after
  // the outer flush unwinds, so the guards read final state and the commit is a
  // clean top-level flush. Skipped mid drag/commit so it never yanks the page from
  // under the finger; the next recitedPage/anchor change re-checks. commitTo
  // converges — once the recited page is visible the leaf stops calling this.
  const followTo = useCallback(
    (target: number) => {
      queueMicrotask(() => {
        // Clear BEFORE the guards: playback owns the window while following, so a
        // queued manual step is stale either way. Clearing after the guard missed
        // the case where a queue is most likely to exist — follow guarded out
        // mid-commit — leaving the stale turn to drain and be snapped back.
        pendingNav.current = null;
        if (isDragging.current || isCommitting.current) return;
        commitTo(target);
      });
    },
    [commitTo],
  );

  // Kept identity-stable so memo'd Panels don't re-render (and therefore aren't
  // torn down) when the keyed window shifts — the load-bearing piece of the
  // no-flicker recenter. A ref holds the latest impl (fresh nextAnchor/prevAnchor).
  const navRef = useRef<(targetPage: number) => void>(() => {});
  navRef.current = (targetPage: number) => {
    if (isCommitting.current) {
      // Queue a neighbour step as a DIRECTION (the landing commit moves the
      // anchor); an arbitrary jump keeps its absolute target.
      if (targetPage === nextAnchor) enqueueStep(true);
      else if (targetPage === prevAnchor) enqueueStep(false);
      else enqueuePage(targetPage);
      return;
    }
    // Arrow hrefs are locale-visual; map the destination to the physical next/prev
    // slot. A click never animates (animate=false) — no drag to continue.
    if (targetPage === nextAnchor) animateCommit(true, false);
    else if (targetPage === prevAnchor) animateCommit(false, false);
    else commitTo(targetPage);
  };

  // Drains the one queued step. Reassigned each render so it closes over the
  // anchors as they are AFTER the commit that queued it. Catch-up turns commit
  // instantly (`animate=false`): an animated one would reopen a fresh 300ms
  // window and cap throughput, and `ui-motion` puts repeated high-frequency
  // actions at no animation at all.
  drainRef.current = () => {
    const pending = pendingNav.current;
    if (!pending) return;
    // A drag or commit started since this was queued, so now is the wrong moment.
    // LEAVE it queued rather than clearing first: dropping here would silently
    // destroy the gesture, which is the very bug #153 is about — a sub-threshold
    // release by the newer drag is not a supersede, and clearing first made that
    // sequence yield zero turns. onTouchEnd re-schedules the drain.
    if (isDragging.current || isCommitting.current) return;
    pendingNav.current = null;
    if (pending.kind === "page") commitTo(pending.target);
    else animateCommit(pending.goNext, false);
  };
  const onArrowNavigate = useCallback((targetPage: number) => navRef.current(targetPage), []);

  // Drop any queued step on unmount so a microtask already scheduled by a landing
  // commit cannot commit on a torn-down pager — the drain reads pendingNav first
  // and returns when it is null. Scoped to the queue only: animateCommit's own
  // EXIT_MS timer is still uncancelled and can fire post-unmount, a pre-existing
  // gap this does not address.
  useEffect(() => {
    return () => {
      pendingNav.current = null;
    };
  }, []);

  // Physical ArrowLeft/ArrowRight keys commit the same page step as the click
  // arrows, instantly (animate=false). Direction is locale-independent: tracing
  // computeSpreadNav + NavigationArrow's showLeft logic shows the physical-left
  // click arrow always resolves to the forward step and physical-right to the
  // backward step, in both ar and en — the Quran's page order is fixed regardless
  // of UI language, so no isRTL branch is needed here (see
  // docs/plans/arrow-controls-desktop.md).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // OS key-repeat: a held key must flip exactly one page. The 300ms slide used
      // to rate-limit repeats via isCommitting; an instant commit clears that flag
      // synchronously, so without this guard a held key would flip at the repeat
      // rate (~30/s), each one a flushSync + replaceState + two prefetches.
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (isCommitting.current) {
        pendingNav.current = { kind: "step", goNext: e.key === "ArrowLeft" };
        return;
      }
      animateCommit(e.key === "ArrowLeft", false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [animateCommit]);

  const onTouchStart = (e: React.TouchEvent) => {
    // Record the start ALWAYS, even mid-commit. Returning before this write was
    // the #153 bug: with touchStartX left null, onTouchMove and onTouchEnd both
    // bailed on their own null checks and the whole gesture was discarded.
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    // Latch for the whole gesture, not just while isCommitting is true: the commit
    // can land mid-drag, and without this the next move event writes the finger's
    // full travel as a transform in one jump.
    gestureIsQueueOnly.current = isCommitting.current;
    // Everything below touches the strip, which the in-flight slide owns.
    if (isCommitting.current) return;
    if (snapClearTimer.current) {
      clearTimeout(snapClearTimer.current);
      snapClearTimer.current = null;
    }
    if (stripRef.current) stripRef.current.style.transition = "none";
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (!isDragging.current && Math.abs(deltaX) <= Math.abs(deltaY)) return;
    isDragging.current = true;
    // Track the gesture but leave the transform alone — the in-flight transition
    // owns it, and a gesture that started during a commit stays transform-free even
    // after that commit lands. The release still registers via the queue.
    if (gestureIsQueueOnly.current || isCommitting.current) return;
    if (!stripRef.current) return;
    stripRef.current.style.transition = "none";
    // Anchored to the -100% rest so the neighbor already sitting beside the
    // current panel is revealed as the finger moves.
    stripRef.current.style.transform = `translateX(calc(-100% + ${deltaX}px))`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (!isDragging.current) return;
    isDragging.current = false;
    const wasQueueOnly = gestureIsQueueOnly.current;
    gestureIsQueueOnly.current = false;

    // This gesture never transformed the strip, so there is nothing to snap back.
    // Record the intent (one deep, latest wins) and let the landing commit apply
    // it. A sub-threshold release queues nothing, but must still re-schedule the
    // drain: an earlier step may be sitting queued because this drag was in
    // progress when its commit landed, and nothing else would pick it up.
    if (wasQueueOnly || isCommitting.current) {
      if (Math.abs(deltaX) >= COMMIT_THRESHOLD) enqueueStep(deltaX > 0);
      if (!isCommitting.current) scheduleDrain();
      return;
    }

    const strip = stripRef.current;
    if (!strip) return;

    if (Math.abs(deltaX) < COMMIT_THRESHOLD) {
      strip.style.transition = `transform ${SNAP_BACK_MS}ms ${EASE_OUT}`;
      strip.style.transform = "translateX(-100%)";
      snapClearTimer.current = setTimeout(() => {
        strip.style.transition = "";
      }, SNAP_BACK_MS);
      // Same reasoning as above — a declined drain may still be waiting.
      scheduleDrain();
      return;
    }

    // Quran is always RTL: swipe right = next page, swipe left = previous.
    animateCommit(deltaX > 0);
  };

  // A browser-cancelled touch (system back-gesture, scroll takeover, multi-touch)
  // never reaches onTouchEnd. Without this, isDragging stays stuck true and wedges
  // three separate guards — the drain, followTo, and the Stage B lookahead — for the
  // rest of the session. Pre-existing gap, but letting a drag begin mid-commit
  // widens the window in which it can be entered.
  const onTouchCancel = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    const wasDragging = isDragging.current;
    isDragging.current = false;
    const wasQueueOnly = gestureIsQueueOnly.current;
    gestureIsQueueOnly.current = false;
    const strip = stripRef.current;
    if (wasDragging && !wasQueueOnly && !isCommitting.current && strip) {
      strip.style.transition = `transform ${SNAP_BACK_MS}ms ${EASE_OUT}`;
      strip.style.transform = "translateX(-100%)";
      snapClearTimer.current = setTimeout(() => {
        strip.style.transition = "";
      }, SNAP_BACK_MS);
    }
    if (!isCommitting.current) scheduleDrain();
  };

  const currentPageWords = pageNumber === curRightId ? rightData : leftData;
  const firstVerseKey = currentPageWords
    ? getFirstVerseKeyOfPage(currentPageWords.lines)
    : null;

  // @font-face for every page in the window so a revealed neighbor never flashes.
  // Pair-expanded — safe here because tajweed's keyed <style> elements are pure
  // CSS declaration (browsers never fetch an unrendered face).
  const allPageIds = useMemo(() => {
    const ids = new Set<number>();
    [pageNumber, nextAnchor, prevAnchor].forEach((a) => {
      const { rightPage, leftPage } = getPagePair(a);
      ids.add(rightPage);
      ids.add(leftPage);
    });
    return Array.from(ids);
  }, [pageNumber, nextAnchor, prevAnchor]);

  // Base-font registration (the immutable registry, ADR 0029) is eager —
  // face.load() downloads regardless of render state, unlike CSS @font-face. So
  // unlike allPageIds above, this must only include the spread partner when it's
  // actually visible (isDouble) — otherwise every single-page session (mobile,
  // forced-single below lg, or desktop/tablet with single manually toggled)
  // force-downloads an unused partner font on every swipe. See ADR 0029's
  // Addendum.
  const baseFontIds = useMemo(
    () => (isDouble ? allPageIds : [pageNumber, nextAnchor, prevAnchor]),
    [isDouble, allPageIds, pageNumber, nextAnchor, prevAnchor],
  );
  const baseFontIdsKey = baseFontIds.join(",");

  // Two prefetch stages, the second gated on the first (ADR 0034).
  //
  // Stage A warms the +/-1 window a drag can reveal — one turn of lead. That is
  // less than one turn costs: a double-view page turn moves ~167KB of font, about
  // 855ms on Fast 3G, so a reader turning pages every ~800ms outruns the link and
  // every commit lands on assets still in flight. Stage B buys the second turn of
  // lead by warming the page AFTER the window, in the direction of travel.
  //
  // It must not start until Stage A has actually landed. Both stages draw on the
  // same ~195KB/s; issued together, the page the reader is about to see finishes
  // later, not sooner. Waiting is what makes the lookahead free.
  useEffect(() => {
    let cancelled = false;

    const warmJson = (target: number) => {
      const { rightPage, leftPage } = getPagePair(target);
      return Promise.all(
        [rightPage, leftPage].map((page) =>
          queryClient.prefetchQuery({
            queryKey: pageQueryKey(page, mushafId),
            queryFn: () => fetchPageAPI(page, mushafId),
            staleTime: Infinity,
          }),
        ),
      );
    };

    const stageA = Promise.all([
      warmJson(nextAnchor),
      warmJson(prevAnchor),
      // The window's fonts are registered by FontFaceInjector, not here — this
      // only waits on the faces it created. Registration stays a single call site
      // (ADR 0029); child effects run before parent effects, so they exist by now.
      pageFontsReady(baseFontIds, edition),
    ]);

    stageA.then(() => {
      if (cancelled) return;
      // Mid-gesture the reader is watching a specific page arrive; leave the link
      // to it. The next commit re-runs this effect and picks the lookahead back up.
      if (isDragging.current || isCommitting.current) return;

      const goNext = lastDirection.current === "next";
      const target = stepAnchor(goNext ? nextAnchor : prevAnchor, goNext, isDouble);
      warmJson(target);

      // Same visibility scoping as baseFontIds: pair-expand only in double view,
      // or a single-page session eagerly downloads a partner font it will never
      // paint (ADR 0029's Addendum). Colour-glyph editions are skipped entirely —
      // their fonts load through FontFaceInjector's keyed <style> elements, which
      // only cover the live window, so there is no lookahead path for them.
      if (edition.usesColorGlyphs) return;
      const { rightPage, leftPage } = getPagePair(target);
      ensurePageFonts(isDouble ? [rightPage, leftPage] : [target], edition);
    });

    return () => {
      cancelled = true;
    };
    // baseFontIds is a new array each render; the joined key is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, nextAnchor, prevAnchor, isDouble, baseFontIdsKey, queryClient, mushafId, edition]);

  return (
    <>
      <FontFaceInjector pageIds={allPageIds} baseFontIds={baseFontIds} />
      <RecitationPageSync firstVerseKey={firstVerseKey} pageNumber={pageNumber} />
      <RecitationFollow anchor={pageNumber} isDouble={isDouble} onFollow={followTo} />
      <ReaderPageSync anchor={pageNumber} isDouble={isDouble} />
      <MushafSwitchSync
        anchor={pageNumber}
        firstVerseKey={firstVerseKey}
        onReanchor={jumpTo}
      />
      <link
        rel="preload"
        href={edition.fontUrl(pageNumber)}
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <div
        className="w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onClick={(e) => {
          if (!e.currentTarget.contains(e.target as Node)) return;
          toggleOverlay();
        }}
      >
        {/* Neutral strip class (NOT fq-carousel-strip, whose tablet scope forces a
            -100% offset). w-full = 1 viewport; the three shrink-0 panels overflow
            it, so translateX(-100%) = one page. dir="ltr" fixes the physical panel
            order [next][current][prev] across locales; each panel restores its
            own dir. Base transform inline so SSR/first paint is centered.

            key={anchor}: on commit React MOVES the revealed neighbor panel into
            the center slot (preserving its exact DOM) rather than re-rendering a
            different subtree into it — so the page you dragged in is pixel-for-pixel
            the page that rests. Only the new far-neighbor mounts (off-screen). This
            is what eliminates the recenter flicker. Requires memo'd Panels + a
            stable onNavigate so a moved panel truly doesn't re-render. */}
        <div
          ref={stripRef}
          dir="ltr"
          className="fq-reader-pager-strip relative flex w-full"
          style={{ transform: "translateX(-100%)" }}
        >
          <Panel
            key={nextAnchor}
            anchor={nextAnchor}
            isRTL={isRTL}
            locale={locale}
            basePath={basePath}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            onNavigate={onArrowNavigate}
          />
          <Panel
            key={pageNumber}
            anchor={pageNumber}
            isRTL={isRTL}
            locale={locale}
            basePath={basePath}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            onNavigate={onArrowNavigate}
          />
          <Panel
            key={prevAnchor}
            anchor={prevAnchor}
            isRTL={isRTL}
            locale={locale}
            basePath={basePath}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            onNavigate={onArrowNavigate}
          />
        </div>
      </div>
    </>
  );
}
