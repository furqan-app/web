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
import { AndroidBackExitGuard } from "@/app/components/reader/AndroidBackExitGuard";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import { useIsLgUp } from "@/app/hooks/use-is-lg-up";
import { useIsomorphicLayoutEffect } from "@/app/hooks/use-isomorphic-layout-effect";
import { useIsTablet } from "@/app/hooks/use-is-tablet";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { storage } from "@/app/utils/storage";
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
  forceDouble?: boolean;
  onNavigate: (targetPage: number) => void;
};

const Panel = memo(function Panel({
  anchor,
  isRTL,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
  forceDouble,
  onNavigate,
}: PanelProps) {
  const { rightPage, leftPage } = getPagePair(anchor);
  const rightQuery = usePage(rightPage);
  const leftQuery = usePage(leftPage);
  const rightData = rightQuery.data;
  const leftData = leftQuery.data;
  // isPaused: React Query's default networkMode skips the fetch entirely
  // while offline rather than erroring, so isError alone would miss the
  // common case. isError still covers a genuine failure while online (e.g. a
  // 404). Either way, with no data and no reason to expect one is coming, the
  // card shows a notice instead of an indefinite skeleton (ADR 0014 Addendum 3).
  const rightUnavailable = !rightData && (rightQuery.isPaused || rightQuery.isError);
  const leftUnavailable = !leftData && (leftQuery.isPaused || leftQuery.isError);
  const { singleStepNav, pairStepNav } = computeSpreadNav(anchor, isRTL, basePath);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="fq-reader-panel w-full shrink-0">
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
              unavailableOffline: rightUnavailable,
            }}
            leftPage={{
              pageId: leftPage,
              lines: leftData?.lines ?? null,
              pageMetadata: leftData?.pageMetadata ?? null,
              unavailableOffline: leftUnavailable,
            }}
            isRTL={isRTL}
            locale={locale}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            singleStepNav={singleStepNav}
            pairStepNav={pairStepNav}
            forceDouble={forceDouble}
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
  forceDouble?: boolean;
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
  forceDouble = false,
}: Props) {
  const queryClient = useQueryClient();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { view } = useQuranSafhaView();
  const isLgUp = useIsLgUp();
  const isTablet = useIsTablet();
  const { toggleOverlay } = useNavOverlay();
  const { mushafId, edition } = useQuranMushaf();
  const { setJumpTo } = useReaderNavigation();

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

  // Tablet is intentionally always a facing-page reader; desktop keeps the
  // stored single/double preference and mobile remains one page at a time.
  // When forceDouble is true (e.g. Reader Lab), force double mode.
  const isDouble = forceDouble || isTablet || (view === "double" && isLgUp);
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
  // The in-flight animated commit, so new input can TAKE OVER from it rather than
  // be dropped (Trello #153, ADR 0028 Addendum 2026-08-11). `animateCommit`'s slide
  // used to finish on an unstored `setTimeout`, which nothing could cancel — the
  // reason input during the window had to be discarded. Holding the id plus its
  // target makes the turn settleable on demand.
  const inFlight = useRef<{
    timer: ReturnType<typeof setTimeout>;
    target: number;
  } | null>(null);

  // Land an in-flight turn immediately, then let the caller proceed as if nothing
  // were in flight. It SETTLES rather than aborts: the user already committed to
  // that turn past the threshold, so dropping it would lose a page they asked for.
  // Safe to call from an event handler — `commitTo`'s `flushSync` is a top-level
  // flush here, not nested inside another one.
  const settleInFlight = () => {
    const pending = inFlight.current;
    if (!pending) return;
    inFlight.current = null;
    clearTimeout(pending.timer);
    commitTo(pending.target);
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
        return;
      }
      strip.style.transition = "none";
      flushSync(() => setAnchor(target));
      strip.style.transform = "translateX(-100%)";
      isCommitting.current = false;
    },
    [basePath],
  );

  // Jump straight to a page with no strip animation — used when the mushaf
  // edition changes and the same verse now lives on a different page.
  const jumpTo = useCallback(
    (target: number) => {
      // An edition switch relocates the reader by verse, so a page step still in
      // flight is meaningless — CANCEL it (do not settle it), or its timer would
      // fire 300ms later and overwrite the re-anchor, URL included.
      const pending = inFlight.current;
      if (pending) {
        inFlight.current = null;
        clearTimeout(pending.timer);
        isCommitting.current = false;
      }
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
      // Handle stored so new input can settle this turn early instead of being
      // dropped, and so jumpTo/unmount can cancel it outright.
      inFlight.current = {
        target,
        timer: setTimeout(() => {
          inFlight.current = null;
          commitTo(target);
        }, EXIT_MS),
      };
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
        // Deliberately does NOT take over an in-flight turn the way user input
        // does: follow is automatic, and truncating a turn the reader started
        // would have playback fighting the finger. It converges — the next
        // recitedPage/anchor change re-checks.
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
    // Land the in-flight turn, then RE-ENTER through the ref rather than falling
    // through. This closure's `nextAnchor`/`prevAnchor` (and `animateCommit`) are
    // pre-settle and would resolve to the wrong page — but `commitTo`'s `flushSync`
    // re-renders synchronously, so by the time settleInFlight returns, navRef.current
    // is a fresh closure with the settled anchors. It cannot recurse: the fresh call
    // sees inFlight cleared.
    if (inFlight.current) {
      settleInFlight();
      navRef.current(targetPage);
      return;
    }
    // Arrow hrefs are locale-visual; map the destination to the physical next/prev
    // slot. A click never animates (animate=false) — no drag to continue.
    if (targetPage === nextAnchor) animateCommit(true, false);
    else if (targetPage === prevAnchor) animateCommit(false, false);
    else commitTo(targetPage);
  };
  const onArrowNavigate = useCallback((targetPage: number) => navRef.current(targetPage), []);

  // Direction-based stepping for the keyboard, with the same settle-then-re-enter
  // handoff as navRef (and for the same staleness reason).
  const stepRef = useRef<(goNext: boolean) => void>(() => {});
  stepRef.current = (goNext: boolean) => {
    if (inFlight.current) {
      settleInFlight();
      stepRef.current(goNext);
      return;
    }
    animateCommit(goNext, false);
  };

  // Cancel an in-flight turn on unmount. Its timer would otherwise fire after
  // teardown and run `history.replaceState`, rewriting the URL of whatever route
  // the user navigated to — possible only now that the handle is stored.
  useEffect(() => {
    return () => {
      const pending = inFlight.current;
      if (!pending) return;
      inFlight.current = null;
      clearTimeout(pending.timer);
    };
  }, []);

  // Publishes jumpTo into ReaderNavigationContext so a Link that would
  // otherwise trigger a full navigation (SurahListItem, RubList,
  // ContinueReadingLink) can move this already-mounted pager client-side
  // instead — no network round trip, works offline for any precached page.
  // Cleared on unmount so those callers fall back to normal navigation once no
  // pager is mounted (ADR 0014 Addendum 3).
  useEffect(() => {
    // setJumpTo already wraps its argument in the () => fn form required to
    // store a function in useState (see ReaderNavigationContext) — wrapping
    // it again here would store a function that RETURNS jumpTo instead of
    // one that calls it, silently breaking every jumpTo() call site.
    setJumpTo(jumpTo);
    return () => setJumpTo(null);
  }, [jumpTo, setJumpTo]);

  // Self-correction for the offline navigation fallback (ADR 0014 Addendum 3):
  // when the service worker's setCatchHandler serves the precached page-1
  // document in place of a failed navigation, the SSR props describe page 1
  // but the address bar still names whatever page (or route) was actually
  // requested. Reader-path requests (`{basePath}/{id}`) correct to that id;
  // anything else (a failed `/` or `/{locale}` cold launch) falls back to the
  // last-read page, which defaults to 1 when nothing is known yet. A real
  // online navigation already has a matching pathname, so this is a no-op
  // there — mount-only, so it never fights a normal swipe/commit afterward.
  //
  // The locale prefix is stripped from BOTH sides before matching: this effect
  // also runs on a remount triggered by a locale change, where the URL still
  // names the old locale while `basePath` already names the new one. Comparing
  // them raw discarded a perfectly good page id and fell through to the
  // last-read branch (#288). Everything after the locale is compared exactly,
  // so the grant reader's longer `/mushaf/{grant}/pages` base still matches
  // only itself.
  //
  // `lastReadPage` is read from storage rather than LastReadPageContext: a
  // locale change remounts the provider, so the context reads back its
  // hydration default of 1 at exactly this moment. Safe as a one-shot read
  // because this runs once on mount and needs the value now, not live (unlike
  // the always-mounted nav link).
  //
  // A LAYOUT effect, deliberately (ADR 0042). As a plain useEffect this ran
  // after paint, so page 1's words were on screen before the jump — the
  // "brief page-1 flash" ADR 0014 Addendum 3 had accepted as a trade-off.
  // jumpTo is fully synchronous (it calls setAnchor directly), so re-anchoring
  // here lands in the same frame and page 1 never reaches the screen; the
  // requested page shows the loading spread ADR 0034 already requires for an
  // uncached page. Do not revert this to useEffect.
  useIsomorphicLayoutEffect(() => {
    const stripLocale = (p: string) => p.replace(/^\/[a-z]{2}(?=\/|$)/, "");
    const pathname = stripLocale(window.location.pathname);
    const base = stripLocale(basePath);
    const isReaderPath = pathname.startsWith(`${base}/`);
    const match = isReaderPath ? pathname.slice(base.length + 1).match(/^(\d+)$/) : null;
    const requestedPage = match ? Number(match[1]) : (storage.get("lastReadPage") ?? 1);
    if (requestedPage !== initialPage && requestedPage >= 1 && requestedPage <= TOTAL_PAGES) {
      jumpTo(requestedPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Takes over an in-flight turn rather than being dropped (#153); stepRef
      // settles it and re-enters with fresh anchors.
      stepRef.current(e.key === "ArrowLeft");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // stepRef is a ref — stable, and always holds the latest impl.
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    // A gesture arriving mid-turn TAKES OVER: land the in-flight turn immediately,
    // then drag from the page it landed on. Settling (not aborting) keeps the turn
    // the user already committed to past the threshold. Everything after this runs
    // exactly as it would with nothing in flight — which is why onTouchMove and
    // onTouchEnd need no commit-awareness at all.
    settleInFlight();
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
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
    if (!stripRef.current) return;
    // See globals.css's `.fq-dragging` rule (ADR 0023 Addendum 8) — suppresses
    // the word hover filter/transform for the duration of the drag.
    stripRef.current.classList.add("fq-dragging");
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

    const strip = stripRef.current;
    if (!strip) return;
    strip.classList.remove("fq-dragging");

    if (Math.abs(deltaX) < COMMIT_THRESHOLD) {
      strip.style.transition = `transform ${SNAP_BACK_MS}ms ${EASE_OUT}`;
      strip.style.transform = "translateX(-100%)";
      snapClearTimer.current = setTimeout(() => {
        strip.style.transition = "";
      }, SNAP_BACK_MS);
      return;
    }

    // Quran is always RTL: swipe right = next page, swipe left = previous.
    animateCommit(deltaX > 0);
  };

  // A browser-cancelled touch (system back-gesture, scroll takeover, multi-touch)
  // never reaches onTouchEnd. Without this, isDragging stays stuck true and wedges
  // both followTo and the Stage B lookahead for the rest of the session — a
  // pre-existing gap, fixed here because it is one line of state to reset.
  const onTouchCancel = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    const wasDragging = isDragging.current;
    isDragging.current = false;
    const strip = stripRef.current;
    if (strip) strip.classList.remove("fq-dragging");
    if (wasDragging && !isCommitting.current && strip) {
      strip.style.transition = `transform ${SNAP_BACK_MS}ms ${EASE_OUT}`;
      strip.style.transform = "translateX(-100%)";
      snapClearTimer.current = setTimeout(() => {
        strip.style.transition = "";
      }, SNAP_BACK_MS);
    }
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
      <AndroidBackExitGuard active={!grantId} />
      <link
        rel="preload"
        href={edition.fontUrl(pageNumber)}
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      {/* fq-reader-pager-viewport: marker only. On the mobile/tablet breakpoints
          globals.css makes this box `position: fixed; inset: 0`, so the reader's
          height comes from the initial containing block and never from a viewport
          unit — in the installed PWA those units go stale across the fullscreen
          transition and leave the reader taller than the screen (ADR 0044). */}
      <div
        className="fq-reader-pager-viewport w-full overflow-hidden"
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
            forceDouble={forceDouble}
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
            forceDouble={forceDouble}
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
            forceDouble={forceDouble}
            onNavigate={onArrowNavigate}
          />
        </div>
      </div>
    </>
  );
}
