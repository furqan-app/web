import Link from "next/link";

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

const NavigationButton = ({
  href,
  isRTL,
  isNext,
}: {
  href: string;
  isRTL: boolean;
  isNext: boolean;
}) => {
  const path =
    isRTL === isNext
      ? "m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      : "m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z";

  return (
    <Link href={href} className="text-dark dark:text-white">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </Link>
  );
};

const QuranPageById = async ({
  params: { id: pageId, locale },
}: QuranPageByIdProps) => {
  setRequestLocale(locale);

  const lines = await getPageWords(Number(pageId));
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
      <style>{`
        @font-face {
          font-family: 'quran-p${pageId}';
          src: url('/fonts/v1/ttf/p${pageId}.ttf') format('truetype');
          font-display: block;
        }
      `}</style>
      <link
        rel="preload"
        href={`/fonts/v1/ttf/p${pageId}.ttf`}
        as="font"
        type="font/truetype"
        crossOrigin="anonymous"
      />
      <div className="bg:white dark:bg-black w-full min-h-[calc(100vh-3.5rem)] flex justify-center gap-5">
        <div className="flex items-center">
          <NavigationButton
            href={`/${locale}/pages/${getNavigationHref(false)}`}
            isRTL={isRTL}
            isNext={false}
          />
        </div>
        <div className="">
          <QuranSafha page={+pageId} lines={lines} />
        </div>
        <div className="flex items-center">
          <NavigationButton
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

