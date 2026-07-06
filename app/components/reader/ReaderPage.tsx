import { getPageWords } from "@/app/hooks/get-page-words";
import { getLanguageDirection } from "@/app/utils/i18n";
import { getPagePair } from "@/app/utils/quran-pages";
import { Locale } from "@/app/types/config";
import { QuranSwipeNav } from "@/app/components/QuranSwipeNav";
import { QuranSafhaViewToggle } from "@/app/components/QuranSafhaViewToggle";
import { QuranSpread } from "@/app/components/reader/QuranSpread";

type ReaderPageProps = {
  pageId: string;
  locale: Locale;
  // Locale-prefixed reader base path, e.g. `/${locale}/pages` or
  // `/${locale}/mushaf/${grant}/pages`. All page-navigation hrefs derive from it.
  basePath: string;
  // When set, this reader shows/edits a granted mushaf (someone else's). See ADR 0012.
  grantId?: string;
  // Owner of the viewed mushaf — drives the in-header viewing indicator (grant reader only).
  viewingOwnerName?: string | null;
};

const TOTAL_PAGES = 604;
const TOTAL_PAIRS = TOTAL_PAGES / 2;

export const ReaderPage = async ({
  pageId,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
}: ReaderPageProps) => {
  const pageNumber = Number(pageId);
  const { rightPage: rightPageId, leftPage: leftPageId } = getPagePair(pageNumber);

  // Sequential, not Promise.all: each getPageWords already issues 2 concurrent
  // queries. Fetching both pair members concurrently would double peak
  // concurrent connections per static-generation worker (4 vs the original 2),
  // which can exceed the DB's max_connections during a full 604-page build.
  const rightPageWords = await getPageWords(rightPageId);
  const leftPageWords = await getPageWords(leftPageId);

  const isRTL = getLanguageDirection(locale) === "rtl";

  // Single-step nav (unchanged): steps one page at a time. Used whenever the
  // spread isn't active (single view, or forced-single below `lg`).
  const getNavigationHref = (isNext: boolean) => {
    const isFirstPage = pageId === "1";
    const isLastPage = pageId === String(TOTAL_PAGES);

    if ((isRTL && !isNext) || (!isRTL && isNext)) {
      return isFirstPage ? String(TOTAL_PAGES) : String(pageNumber - 1);
    }
    return isLastPage ? "1" : String(pageNumber + 1);
  };

  // Pair-step nav: steps a whole pair at a time, anchored to the neighbor
  // pair's odd (right-hand) page id. Used when the double-page spread is active.
  const pairIndex = Math.ceil(pageNumber / 2);
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

  const singleStepNav = {
    prevHref: `${basePath}/${getNavigationHref(false)}`,
    nextHref: `${basePath}/${getNavigationHref(true)}`,
  };
  const pairStepNav = {
    prevHref: `${basePath}/${getPairNavigationHref(false)}`,
    nextHref: `${basePath}/${getPairNavigationHref(true)}`,
  };

  // Plain page-order hrefs for swipe: the Quran's page order (1 → 604) is
  // fixed content, independent of UI locale — unlike getNavigationHref above,
  // which intentionally flips by isRTL to keep desktop arrow-click direction
  // matching the arrow's visual (RTL-flipped) position. Swipe gestures have
  // no visual arrow to match, so they must use the unflipped page order, and
  // stay page-by-page even in double-view (no arrow to anchor a pair-jump to).
  const nextPageId = pageId === String(TOTAL_PAGES) ? "1" : String(pageNumber + 1);
  const prevPageId = pageId === "1" ? String(TOTAL_PAGES) : String(pageNumber - 1);

  return (
    <>
      {/* Both pair members' fonts are always inlined so double view never
          needs an extra request. Only the current page's font is preloaded —
          the pair partner loads lazily (if at all) only once its card renders. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @font-face {
          font-family: 'quran-p${rightPageId}';
          src: url('/fonts/v1/ttf/p${rightPageId}.ttf') format('truetype');
          font-display: block;
        }
        @font-face {
          font-family: 'quran-p${leftPageId}';
          src: url('/fonts/v1/ttf/p${leftPageId}.ttf') format('truetype');
          font-display: block;
        }
      `,
        }}
      />
      <link
        rel="preload"
        href={`/fonts/v1/ttf/p${pageId}.ttf`}
        as="font"
        type="font/truetype"
        crossOrigin="anonymous"
      />
      <QuranSwipeNav
        prevHref={`${basePath}/${prevPageId}`}
        nextHref={`${basePath}/${nextPageId}`}
      >
        <div className="bg-background w-full flex flex-col items-center justify-start md:justify-center px-0 gap-2">
          <QuranSafhaViewToggle />
          <div className="w-full flex justify-center items-start md:items-center px-0 md:ps-14 md:pe-10 gap-0 md:gap-8">
            <QuranSpread
              currentPageId={pageNumber}
              rightPage={{ pageId: rightPageId, ...rightPageWords }}
              leftPage={{ pageId: leftPageId, ...leftPageWords }}
              isRTL={isRTL}
              grantId={grantId}
              viewingOwnerName={viewingOwnerName}
              singleStepNav={singleStepNav}
              pairStepNav={pairStepNav}
            />
          </div>
        </div>
      </QuranSwipeNav>
    </>
  );
};
