"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { QuranSafha } from "@/app/components/QuranSafha";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import { useIsLgUp } from "@/app/hooks/use-is-lg-up";
import { PageWords } from "@/app/hooks/get-page-words";

type NavHrefs = { prevHref: string; nextHref: string };

type PagePayload = PageWords & { pageId: number };

type QuranSpreadProps = {
  currentPageId: number;
  rightPage: PagePayload;
  leftPage: PagePayload;
  isRTL: boolean;
  locale: string;
  grantId?: string;
  viewingOwnerName?: string | null;
  singleStepNav: NavHrefs;
  pairStepNav: NavHrefs;
  // When provided (persistent pager), an arrow click swaps the page client-side
  // via this callback instead of navigating the <Link> (which would remount the
  // reader). The href is kept for SSR/no-JS + middle-click. See ADR 0028.
  onNavigate?: (targetPage: number) => void;
};

const NavigationArrow = ({
  href,
  isRTL,
  isNext,
  onNavigate,
}: {
  href: string;
  isRTL: boolean;
  isNext: boolean;
  onNavigate?: (targetPage: number) => void;
}) => {
  // Flex row order flips visually under RTL, so the browser always places
  // the first DOM child (isNext=false) at the row's main-start (right, in RTL).
  // The chevron shape follows that visual position, not the prev/next label.
  const showLeft = isRTL ? isNext : !isNext;
  const Icon = showLeft ? ChevronLeft : ChevronRight;

  return (
    <Link
      href={href}
      onClick={
        onNavigate
          ? (e) => {
              // Plain left-click → client-side swap; let modified clicks
              // (cmd/ctrl/middle → open in new tab) fall through to the <Link>.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onNavigate(Number(href.split("/").pop()));
            }
          : undefined
      }
      aria-label={isNext ? "Next page" : "Previous page"}
      className="fq-nav-arrow hidden md:flex relative z-20 items-center justify-center shrink-0 text-primary/60 hover:text-primary transition-colors"
    >
      <Icon className="w-6 h-6 md:w-8 md:h-8" strokeWidth={1.6} />
    </Link>
  );
};

// Publishes the spread's measured width and centre as CSS custom properties on
// <html>, so the floating recitation bar (>=1367px) can match the paper. The card
// is content-sized and tracks the font-scale control, so there is no CSS value to
// key off. Writes straight to the style attribute — never React state: the pager
// mounts three panels and re-rendering the reader tree on every resize tick is the
// same trap ADR 0028 documents for the recitation subscription. All three panels
// are the same width, so whichever writes last is correct, and a panel whose data
// lands late self-heals on its own observer firing.
const useSpreadMetrics = (ref: React.RefObject<HTMLDivElement>) => {
  // Layout effect, not useEffect: the bar falls back to `left: 50%` / a fixed
  // max-width until these land, so measuring after paint shows the bar at the
  // wrong width for one frame and then snaps (~186px at 1538px). Same
  // isomorphic guard the repo's use-is-tablet/use-is-mobile hooks use.
  const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let queued = false;
    const publish = () => {
      queued = false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const root = document.documentElement;
      // Width is identical across panels, so it is safe to write from any of
      // them. The centre is not: the pager parks its neighbours a full viewport
      // to either side, and an off-screen panel writing last would put the bar
      // off-axis — so that write is guarded, and only that one.
      root.style.setProperty("--fq-spread-width", `${rect.width}px`);
      const center = rect.left + rect.width / 2;
      if (center < 0 || center > window.innerWidth) return;
      root.style.setProperty("--fq-spread-center", `${center}px`);
    };

    // Coalesce to one measure per frame: three panels are mounted, each with its
    // own listener, so an un-throttled drag-resize would interleave three rect
    // reads with three root-style writes per tick.
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(publish);
    };

    publish();
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    // A window resize re-centres the spread WITHOUT changing its size, which the
    // ResizeObserver never sees — the centre would go stale and the bar would sit
    // off-axis. Measured: 9px off with the observer alone.
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [ref, useIsomorphicLayoutEffect]);
};

export const QuranSpread = ({
  currentPageId,
  rightPage,
  leftPage,
  isRTL,
  locale,
  grantId,
  viewingOwnerName,
  singleStepNav,
  pairStepNav,
  onNavigate,
}: QuranSpreadProps) => {
  const spreadRef = useRef<HTMLDivElement>(null);
  useSpreadMetrics(spreadRef);
  const { view } = useQuranSafhaView();
  const isLgUp = useIsLgUp();
  // useIsLgUp is used ONLY to pick the nav-arrow href (single-step vs pair-step).
  // The double-vs-single *display* is gated entirely by CSS (the pre-paint
  // `html[data-safha-view]` attribute + the `lg` media query on `.fq-spread`),
  // so it's correct at first paint on slow connections — no matchMedia in the
  // display path. See ADR 0013 Addendum 4. The arrow href's pre-hydration
  // staleness is invisible (same icon, only the target differs).
  const nav = view === "double" && isLgUp ? pairStepNav : singleStepNav;

  // The non-current pair member is the "partner": CSS hides it unless the spread
  // is actually showing (lg + data-safha-view="double"). Exactly one of the two
  // always equals currentPageId.
  const rightIsPartner = rightPage.pageId !== currentPageId;
  const leftIsPartner = leftPage.pageId !== currentPageId;

  return (
    <div className="flex-1 min-w-0 flex justify-center items-center md:h-full md:items-stretch">
      <NavigationArrow href={nav.prevHref} isRTL={isRTL} isNext={false} onNavigate={onNavigate} />
      {/* `.fq-spread` (static) scopes every CSS display/cap/margin gate to cards
          inside a spread, so the standalone QuranSafha in QuranPage is unaffected.
          gap-0: the two cards' spine-adjacent edges touch directly, matching a
          closed book — see ADR 0013 addendum. Each card's own stacked "pages
          underneath" layers peek toward its outer (spine-away) edge via
          stackPeekSide, never bridging the seam. */}
      <div
        ref={spreadRef}
        className={`flex ${!isRTL ? "flex-row-reverse" : ""} items-stretch gap-0 fq-spread md:h-full`}
      >
        <div className={rightIsPartner ? "fq-safha-partner" : undefined}>
          <QuranSafha
            page={rightPage.pageId}
            lines={rightPage.lines}
            pageMetadata={rightPage.pageMetadata}
            locale={locale}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            stackPeekSide="right"
            compensateStackGap
          />
        </div>
        <div className={leftIsPartner ? "fq-safha-partner" : undefined}>
          <QuranSafha
            page={leftPage.pageId}
            lines={leftPage.lines}
            pageMetadata={leftPage.pageMetadata}
            locale={locale}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            stackPeekSide="left"
            compensateStackGap
          />
        </div>
      </div>
      <NavigationArrow href={nav.nextHref} isRTL={isRTL} isNext={true} onNavigate={onNavigate} />
    </div>
  );
};
