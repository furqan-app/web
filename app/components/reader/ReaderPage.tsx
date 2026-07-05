import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { QuranSafha } from "@/app/components/QuranSafha";
import { QuranSwipeNav } from "@/app/components/QuranSwipeNav";
import { getPageWords } from "@/app/hooks/get-page-words";
import { getLanguageDirection } from "@/app/utils/i18n";
import { Locale } from "@/app/types/config";

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
      className="hidden md:flex items-center justify-center shrink-0 text-primary/60 hover:text-primary transition-colors"
    >
      <Icon className="w-6 h-6 md:w-8 md:h-8" strokeWidth={1.6} />
    </Link>
  );
};

export const ReaderPage = async ({
  pageId,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
}: ReaderPageProps) => {
  const { lines, pageMetadata } = await getPageWords(Number(pageId));
  const isRTL = getLanguageDirection(locale) === "rtl";

  const getNavigationHref = (isNext: boolean) => {
    const isFirstPage = pageId === "1";
    const isLastPage = pageId === "604";

    if ((isRTL && !isNext) || (!isRTL && isNext)) {
      return isFirstPage ? "604" : String(Number(pageId) - 1);
    }
    return isLastPage ? "1" : String(Number(pageId) + 1);
  };

  // Plain page-order hrefs for swipe: the Quran's page order (1 → 604) is
  // fixed content, independent of UI locale — unlike getNavigationHref above,
  // which intentionally flips by isRTL to keep desktop arrow-click direction
  // matching the arrow's visual (RTL-flipped) position. Swipe gestures have
  // no visual arrow to match, so they must use the unflipped page order or
  // "swipe right" would go backward whenever the UI locale is "en".
  const nextPageId = pageId === "604" ? "1" : String(Number(pageId) + 1);
  const prevPageId = pageId === "1" ? "604" : String(Number(pageId) - 1);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @font-face {
          font-family: 'quran-p${pageId}';
          src: url('/fonts/v1/ttf/p${pageId}.ttf') format('truetype');
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
        <div className="bg-background w-full min-h-[calc(100dvh-3.5rem)] flex justify-center items-start md:items-center py-4 px-0 md:ps-14 md:pe-10 gap-0 md:gap-8">
          <div className="flex-1 min-w-0 flex justify-center items-center">
            <NavigationArrow
              href={`${basePath}/${getNavigationHref(false)}`}
              isRTL={isRTL}
              isNext={false}
            />
            <QuranSafha
              page={+pageId}
              lines={lines}
              pageMetadata={pageMetadata}
              grantId={grantId}
              viewingOwnerName={viewingOwnerName}
            />
            <NavigationArrow
              href={`${basePath}/${getNavigationHref(true)}`}
              isRTL={isRTL}
              isNext={true}
            />
          </div>
        </div>
      </QuranSwipeNav>
    </>
  );
};
