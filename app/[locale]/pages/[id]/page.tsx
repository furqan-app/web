import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { QuranSafha } from "@/app/components/QuranSafha";
import { getPageWords } from "@/app/hooks/get-page-words";
import { setRequestLocale } from "next-intl/server";
import { getLanguageDirection } from "@/app/utils/i18n";
import { Locale } from "@/app/types/config";

// statically generate all pages in build time
export async function generateStaticParams() {
  return Array.from({ length: 604 }, (_, i) => ({
    id: String(i + 1),
  }));
}

type QuranPageByIdProps = {
  params: { id: string; locale: Locale };
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
      className="flex items-center justify-center shrink-0 text-primary/60 hover:text-primary transition-colors"
    >
      <Icon className="w-6 h-6 md:w-8 md:h-8" strokeWidth={1.6} />
    </Link>
  );
};

const QuranPageById = async ({
  params: { id: pageId, locale },
}: QuranPageByIdProps) => {
  setRequestLocale(locale);

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
      <div className="bg-background w-full min-h-[calc(100vh-3.5rem)] flex justify-center items-center py-4 ps-10 pe-6 md:ps-14 md:pe-10 gap-3 md:gap-8">
        <div className="flex-1 min-w-0 flex justify-center">
          <NavigationArrow
            href={`/${locale}/pages/${getNavigationHref(false)}`}
            isRTL={isRTL}
            isNext={false}
          />
          <QuranSafha
            page={+pageId}
            lines={lines}
            pageMetadata={pageMetadata}
          />
          <NavigationArrow
            href={`/${locale}/pages/${getNavigationHref(true)}`}
            isRTL={isRTL}
            isNext={true}
          />
        </div>
      </div>
    </>
  );
};

export default QuranPageById;

