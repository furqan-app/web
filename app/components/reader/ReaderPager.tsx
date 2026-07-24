"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Locale } from "@/app/types/config";
import { PageWords } from "@/app/hooks/get-page-words";
import { usePage, fetchPageAPI } from "@/app/hooks/use-quran-page";
import { getPagePair } from "@/app/utils/quran-pages";
import { getLanguageDirection } from "@/app/utils/i18n";
import { getFirstVerseKeyOfPage } from "@/app/utils/recitation";
import { QuranSpread } from "@/app/components/reader/QuranSpread";
import { FontFaceInjector } from "@/app/components/reader/FontFaceInjector";
import { RecitationPageSync } from "@/app/components/reader/RecitationPageSync";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import { useIsLgUp } from "@/app/hooks/use-is-lg-up";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";

const TOTAL_PAGES = 604;
const TOTAL_PAIRS = TOTAL_PAGES / 2;

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const COMMIT_THRESHOLD = 80; // px
const SNAP_BACK_MS = 200;
const EXIT_MS = 300; // book-like reveal slide

type NavHrefs = { prevHref: string; nextHref: string };

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
// shifts don't re-render. Shows a blank placeholder until its (prefetched) data
// arrives — the reveal during a drag then paints the real neighbor.
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
          {rightData && leftData ? (
            <QuranSpread
              currentPageId={anchor}
              rightPage={{ pageId: rightPage, ...rightData }}
              leftPage={{ pageId: leftPage, ...leftData }}
              isRTL={isRTL}
              locale={locale}
              grantId={grantId}
              viewingOwnerName={viewingOwnerName}
              singleStepNav={singleStepNav}
              pairStepNav={pairStepNav}
              onNavigate={onNavigate}
            />
          ) : (
            <div className="min-h-[calc(100dvh-5.5rem)] w-full" />
          )}
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

  // Seed the SSR pair once, before children (usePage) render, so the initial page
  // paints synchronously from cache with no fetch/skeleton.
  const seededRef = useRef(false);
  if (!seededRef.current) {
    queryClient.setQueryData(["page", rightPageId], initialRightData);
    queryClient.setQueryData(["page", leftPageId], initialLeftData);
    seededRef.current = true;
  }

  const [anchor, setAnchor] = useState(initialPage);

  const pageNumber = anchor;
  const { rightPage: curRightId, leftPage: curLeftId } = getPagePair(pageNumber);
  const nextPageNum = pageNumber === TOTAL_PAGES ? 1 : pageNumber + 1;
  const prevPageNum = pageNumber === 1 ? TOTAL_PAGES : pageNumber - 1;
  const nextPairPageNum = curLeftId === TOTAL_PAGES ? 1 : curLeftId + 1;
  const prevPairPageNum = curRightId === 1 ? TOTAL_PAGES - 1 : curRightId - 2;

  const isDouble = view === "double" && isLgUp;
  const nextAnchor = isDouble ? nextPairPageNum : nextPageNum;
  const prevAnchor = isDouble ? prevPairPageNum : prevPageNum;

  // Seed cache reads for the current pair so firstVerseKey is available.
  const rightData = usePage(curRightId).data;
  const leftData = usePage(curLeftId).data;

  // Warm the neighbor panels so a swipe reveals real content, not a placeholder.
  useEffect(() => {
    const warm = (p: number) => {
      const { rightPage, leftPage } = getPagePair(p);
      [rightPage, leftPage].forEach((page) =>
        queryClient.prefetchQuery({
          queryKey: ["page", page],
          queryFn: () => fetchPageAPI(page),
          staleTime: Infinity,
        }),
      );
    };
    warm(nextAnchor);
    warm(prevAnchor);
    // anchor + view drive nextAnchor/prevAnchor above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, nextAnchor, prevAnchor, queryClient]);

  const stripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const snapClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCommitting = useRef(false);

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

  // Animate the strip to the neighbor slot, then swap the anchor. Shared by swipe
  // commit and the in-spread arrows.
  const animateCommit = useCallback(
    (goNext: boolean) => {
      const strip = stripRef.current;
      const target = goNext ? nextAnchor : prevAnchor;
      isCommitting.current = true;
      if (!strip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

  // Kept identity-stable so memo'd Panels don't re-render (and therefore aren't
  // torn down) when the keyed window shifts — the load-bearing piece of the
  // no-flicker recenter. A ref holds the latest impl (fresh nextAnchor/prevAnchor).
  const navRef = useRef<(targetPage: number) => void>(() => {});
  navRef.current = (targetPage: number) => {
    if (isCommitting.current) return;
    // Arrow hrefs are locale-visual; map the destination to the physical next/prev
    // slot so the slide direction matches. Any other target just swaps instantly.
    if (targetPage === nextAnchor) animateCommit(true);
    else if (targetPage === prevAnchor) animateCommit(false);
    else commitTo(targetPage);
  };
  const onArrowNavigate = useCallback((targetPage: number) => navRef.current(targetPage), []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (isCommitting.current) return;
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

  const currentPageWords = pageNumber === curRightId ? rightData : leftData;
  const firstVerseKey = currentPageWords
    ? getFirstVerseKeyOfPage(currentPageWords.lines)
    : null;

  // @font-face for every page in the window so a revealed neighbor never flashes.
  const allPageIds = useMemo(() => {
    const ids = new Set<number>();
    [pageNumber, nextAnchor, prevAnchor].forEach((a) => {
      const { rightPage, leftPage } = getPagePair(a);
      ids.add(rightPage);
      ids.add(leftPage);
    });
    return Array.from(ids);
  }, [pageNumber, nextAnchor, prevAnchor]);

  return (
    <>
      <FontFaceInjector pageIds={allPageIds} />
      <RecitationPageSync firstVerseKey={firstVerseKey} />
      <link
        rel="preload"
        href={`/fonts/v1/ttf/p${pageNumber}.ttf`}
        as="font"
        type="font/ttf"
        crossOrigin="anonymous"
      />
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
