"use client";

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
};

const NavigationArrow = ({
  href,
  isRTL,
  isNext,
}: {
  href: string;
  isRTL: boolean;
  isNext: boolean;
}) => {
  // Flex row order flips visually under RTL, so the browser always places
  // the first DOM child (isNext=false) at the row's main-start (right, in RTL).
  // The chevron shape follows that visual position, not the prev/next label.
  const showLeft = isRTL ? isNext : !isNext;
  const Icon = showLeft ? ChevronLeft : ChevronRight;

  return (
    <Link
      href={href}
      aria-label={isNext ? "Next page" : "Previous page"}
      className="hidden md:flex relative z-20 items-center justify-center shrink-0 text-primary/60 hover:text-primary transition-colors"
    >
      <Icon className="w-6 h-6 md:w-8 md:h-8" strokeWidth={1.6} />
    </Link>
  );
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
}: QuranSpreadProps) => {
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
      <NavigationArrow href={nav.prevHref} isRTL={isRTL} isNext={false} />
      {/* `.fq-spread` (static) scopes every CSS display/cap/margin gate to cards
          inside a spread, so the standalone QuranSafha in QuranPage is unaffected.
          gap-0: the two cards' spine-adjacent edges touch directly, matching a
          closed book — see ADR 0013 addendum. Each card's own stacked "pages
          underneath" layers peek toward its outer (spine-away) edge via
          stackPeekSide, never bridging the seam. */}
      <div className={`flex ${!isRTL ? "flex-row-reverse" : ""} items-stretch gap-0 fq-spread md:h-full`}>
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
      <NavigationArrow href={nav.nextHref} isRTL={isRTL} isNext={true} />
    </div>
  );
};
