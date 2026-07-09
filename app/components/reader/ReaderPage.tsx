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
  // queries. Fetching pair members concurrently would double peak concurrent
  // connections per static-generation worker (4 vs the original 2), which can
  // exceed the DB's max_connections during a full 604-page build. (ADR 0013)
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
  // rightPageId is the odd (right-hand) member = pairIndex * 2 - 1, so the pair
  // index is derivable from it — no need to re-run the pairing formula here.
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

  const singleStepNav = {
    prevHref: `${basePath}/${getNavigationHref(false)}`,
    nextHref: `${basePath}/${getNavigationHref(true)}`,
  };
  const pairStepNav = {
    prevHref: `${basePath}/${getPairNavigationHref(false)}`,
    nextHref: `${basePath}/${getPairNavigationHref(true)}`,
  };

  // Plain page-order hrefs for swipe (locale-independent page order, see
  // fix-mobile-swipe-direction.md Addendum).
  const nextPageNum = pageNumber === TOTAL_PAGES ? 1 : pageNumber + 1;
  const prevPageNum = pageNumber === 1 ? TOTAL_PAGES : pageNumber - 1;

  return (
    <>
      {/* Inline @font-face for both pages in the pair. Only the current page's
          font gets <link rel="preload"> — the pair partner loads lazily. */}
      <style
        dangerouslySetInnerHTML={{
          __html: [rightPageId, leftPageId]
            .map(
              (id) => `
        @font-face {
          font-family: 'quran-p${id}';
          src: url('/fonts/v1/ttf/p${id}.ttf') format('truetype');
          font-display: block;
        }`
            )
            .join("\n"),
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
        prevHref={`${basePath}/${prevPageNum}`}
        nextHref={`${basePath}/${nextPageNum}`}
      >
        <div className="bg-background w-full min-h-[calc(100dvh-3.5rem)] py-4 flex flex-col items-center justify-start md:justify-center px-0 gap-2">
          <QuranSafhaViewToggle />
          <div className="w-full flex justify-center items-start md:items-center px-0 md:ps-14 md:pe-10 gap-0 md:gap-8">
            <QuranSpread
              currentPageId={pageNumber}
              rightPage={{ pageId: rightPageId, ...rightPageWords }}
              leftPage={{ pageId: leftPageId, ...leftPageWords }}
              isRTL={isRTL}
              locale={locale}
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
