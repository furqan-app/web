import Link from "next/link";

import { QuranSafha } from "@/app/components/QuranSafha";
import { fetchPageAPI, fetchPageInfoAPI } from "@/app/hooks/use-quran-page";
import { getLocale } from "next-intl/server";
import { getLanguageDirection } from "@/app/utils/i18n";
import Sidebar from "@/app/components/nav/Sidebar";

// statically generate all pages in build time
export async function generateStaticParams() {
  return Array.from({ length: 604 }, (_, i) => ({
    params: { id: String(i + 1) },
  }));
}

type QuranPageByIdProps = {
  params: { id: string };
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
  const path = isRTL === isNext
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
  params: { id: pageId },
}: QuranPageByIdProps) => {
  const locale = await getLocale();
  const lines = await fetchPageAPI(Number(pageId));
  const pageInfo = await fetchPageInfoAPI(Number(pageId));
  
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
    <div className="flex h-[calc(100vh-3.5rem)]">
      <Sidebar />
      <div className="bg:white dark:bg-black w-full min-h-[calc(100vh-3.5rem)] flex justify-center gap-5">
        <div className="flex items-center">
          <NavigationButton
            href={`/${locale}/pages/${getNavigationHref(false)}`}
            isRTL={isRTL}
            isNext={false}
          />
        </div>
        <div className="">
          <QuranSafha page={+pageId} lines={lines}/>
        </div>
        <div className="flex items-center">
          <NavigationButton
            href={`/${locale}/pages/${getNavigationHref(true)}`}
            isRTL={isRTL}
            isNext={true}
          />
        </div>
      </div>
    </div>
  );
};

export default QuranPageById;
