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
  grantId,
  viewingOwnerName,
  singleStepNav,
  pairStepNav,
}: QuranSpreadProps) => {
  const { view } = useQuranSafhaView();
  const isLgUp = useIsLgUp();
  const isSpreadActive = view === "double" && isLgUp;
  const nav = isSpreadActive ? pairStepNav : singleStepNav;

  const hideRight = !isSpreadActive && rightPage.pageId !== currentPageId;
  const hideLeft = !isSpreadActive && leftPage.pageId !== currentPageId;

  return (
    <div className="flex-1 min-w-0 flex justify-center items-center">
      <NavigationArrow href={nav.prevHref} isRTL={isRTL} isNext={false} />
      {/* gap-0: the two cards' spine-adjacent edges touch directly, matching a
          closed book — see ADR 0013 addendum. Each card's own stacked "pages
          underneath" layers peek toward its outer (spine-away) edge via
          stackPeekSide, never bridging the seam. */}
      <div dir="rtl" className="flex items-stretch gap-0">
        <div className={hideRight ? "hidden" : undefined}>
          <QuranSafha
            page={rightPage.pageId}
            lines={rightPage.lines}
            pageMetadata={rightPage.pageMetadata}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            stackPeekSide="right"
            compensateStackGap={!isSpreadActive}
          />
        </div>
        <div className={hideLeft ? "hidden" : undefined}>
          <QuranSafha
            page={leftPage.pageId}
            lines={leftPage.lines}
            pageMetadata={leftPage.pageMetadata}
            grantId={grantId}
            viewingOwnerName={viewingOwnerName}
            stackPeekSide="left"
            compensateStackGap={!isSpreadActive}
          />
        </div>
      </div>
      <NavigationArrow href={nav.nextHref} isRTL={isRTL} isNext={true} />
    </div>
  );
};
