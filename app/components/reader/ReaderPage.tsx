import { getPageWords } from "@/app/hooks/get-page-words";
import { getLanguageDirection } from "@/app/utils/i18n";
import { getPagePair } from "@/app/utils/quran-pages";
import { getFirstVerseKeyOfPage } from "@/app/utils/recitation";
import { Locale } from "@/app/types/config";
import { QuranSwipeNav } from "@/app/components/QuranSwipeNav";
import { QuranSpread } from "@/app/components/reader/QuranSpread";
import { FontFaceInjector } from "@/app/components/reader/FontFaceInjector";
import { RecitationPageSync } from "@/app/components/reader/RecitationPageSync";

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

type NavHrefs = { prevHref: string; nextHref: string };

// Locale-aware nav hrefs for the in-spread arrows (single-step + pair-step),
// computed for any anchor page. Extracted so each of the three carousel panels
// (prev / current / next) can render correct arrows. Page-order swipe hrefs are
// computed separately below (locale-independent) — see fix-mobile-swipe-direction.md.
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

  // rightPageId (odd, right-hand member) = pairIndex * 2 - 1, so pairIndex is derivable.
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

type PanelParams = {
  anchorPage: number;
  locale: Locale;
  basePath: string;
  isRTL: boolean;
  grantId?: string;
  viewingOwnerName?: string | null;
  // Neighbor panels (prev/next) get `fq-carousel-side`: hidden everywhere except
  // the tablet double-view CSS scope, so mobile/desktop never render or download
  // them (and their page-fonts don't fetch). The current panel omits it.
  sideClass?: string;
};

// Builds one carousel panel (a full-width reader spread). Awaits its two pages'
// words itself so callers can invoke it SEQUENTIALLY (ADR 0013 — a static-build
// worker must not exceed the DB connection limit by fetching pairs concurrently).
const buildPanel = async ({
  anchorPage,
  locale,
  basePath,
  isRTL,
  grantId,
  viewingOwnerName,
  sideClass,
}: PanelParams) => {
  const { rightPage: rightPageId, leftPage: leftPageId } = getPagePair(anchorPage);
  const rightPageWords = await getPageWords(rightPageId);
  const leftPageWords = await getPageWords(leftPageId);
  const { singleStepNav, pairStepNav } = computeSpreadNav(anchorPage, isRTL, basePath);

  const node = (
    // Restore the locale direction on the panel: the carousel strip forces dir="ltr"
    // (so flex panel order + translateX geometry stay stable across locales — see
    // QuranSwipeNav), so each panel must re-establish rtl/ltr for its own content.
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`fq-carousel-panel w-full shrink-0${sideClass ? ` ${sideClass}` : ""}`}
    >
      <div className="fq-reader-outer bg-background w-full min-h-[calc(100dvh-3.5rem)] pb-4 flex flex-col items-center justify-start md:justify-center px-0">
        <div className="fq-reader-spread-container w-full flex justify-center items-start md:items-center px-0 md:ps-14 md:pe-10 gap-0 md:gap-8">
          <QuranSpread
            currentPageId={anchorPage}
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
    </div>
  );

  return {
    node,
    pageIds: [rightPageId, leftPageId] as const,
    rightPageId,
    rightPageWords,
    leftPageWords,
  };
};

export const ReaderPage = async ({
  pageId,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
}: ReaderPageProps) => {
  const pageNumber = Number(pageId);
  const { rightPage: rightPageId, leftPage: leftPageId } = getPagePair(pageNumber);
  const isRTL = getLanguageDirection(locale) === "rtl";

  // Page-order swipe hrefs (locale-independent physical direction). The pair-step
  // lands on the neighbor pair's right (odd) page. These double as the anchor
  // pages for the neighbor carousel panels. Wrap at the ends.
  const nextPageNum = pageNumber === TOTAL_PAGES ? 1 : pageNumber + 1;
  const prevPageNum = pageNumber === 1 ? TOTAL_PAGES : pageNumber - 1;
  const nextPairPageNum = leftPageId === TOTAL_PAGES ? 1 : leftPageId + 1;
  const prevPairPageNum = rightPageId === 1 ? TOTAL_PAGES - 1 : rightPageId - 2;

  // Three panels for the tablet double-view carousel. SEQUENTIAL (not Promise.all)
  // so peak concurrent DB connections per static-build worker stay bounded (ADR 0013).
  // Neighbors are CSS-hidden off tablet, so mobile/desktop pay only the (build-time)
  // fetch + serialized HTML, never client rendering or font downloads.
  const currentPanel = await buildPanel({
    anchorPage: pageNumber,
    locale,
    basePath,
    isRTL,
    grantId,
    viewingOwnerName,
  });
  const nextPanel = await buildPanel({
    anchorPage: nextPairPageNum,
    locale,
    basePath,
    isRTL,
    grantId,
    viewingOwnerName,
    sideClass: "fq-carousel-side",
  });
  const prevPanel = await buildPanel({
    anchorPage: prevPairPageNum,
    locale,
    basePath,
    isRTL,
    grantId,
    viewingOwnerName,
    sideClass: "fq-carousel-side",
  });

  // The currently-displayed page's first verse — where the header "listen" button
  // starts from. pageNumber is whichever current-pair member was requested.
  const currentPageWords =
    pageNumber === currentPanel.rightPageId
      ? currentPanel.rightPageWords
      : currentPanel.leftPageWords;
  const firstVerseKey = getFirstVerseKeyOfPage(currentPageWords.lines);

  // @font-face for all six pages across the three panels so a neighbor is painted
  // before it can be reached on a fast swipe; hidden neighbors never fetch (font-
  // display:block loads only when a glyph is rendered). Only the current page is
  // <link rel=preload>-ed — neighbors load lazily when the tablet scope reveals them.
  const allPageIds = Array.from(
    new Set<number>([...currentPanel.pageIds, ...nextPanel.pageIds, ...prevPanel.pageIds]),
  );

  return (
    <>
      {/* FontFaceInjector must be a "use client" component — see ADR 0020.
          Inline <style> in a Server Component is hoisted differently by the
          Next.js RSC pipeline on client vs SSR, causing hydration mismatches. */}
      <FontFaceInjector pageIds={allPageIds} />
      <RecitationPageSync firstVerseKey={firstVerseKey} />
      <link
        rel="preload"
        href={`/fonts/v1/ttf/p${pageId}.ttf`}
        as="font"
        type="font/ttf"
        crossOrigin="anonymous"
      />
      <QuranSwipeNav
        singleStep={{
          prevHref: `${basePath}/${prevPageNum}`,
          nextHref: `${basePath}/${nextPageNum}`,
        }}
        pairStep={{
          prevHref: `${basePath}/${prevPairPageNum}`,
          nextHref: `${basePath}/${nextPairPageNum}`,
        }}
        prevPanel={prevPanel.node}
        currentPanel={currentPanel.node}
        nextPanel={nextPanel.node}
      />
    </>
  );
};
