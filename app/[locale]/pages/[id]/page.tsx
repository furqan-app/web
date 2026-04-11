import Link from "next/link";
import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";

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
  // For RTL: isNext goes left, !isNext goes right
  // For LTR: isNext goes right, !isNext goes left
  const showLeft = isRTL ? isNext : !isNext;
  const Icon = showLeft ? ArrowLeftCircle : ArrowRightCircle;

  return (
    <Link href={href} className="text-foreground hover:opacity-70 transition-opacity">
      <Icon className="size-7" />
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
      <div className="bg:white dark:bg-black w-full min-h-[calc(100vh-3.5rem)] flex justify-center gap-5">
        <div className="flex items-center">
          <NavigationButton
            href={`/${locale}/pages/${getNavigationHref(false)}`}
            isRTL={isRTL}
            isNext={false}
          />
        </div>
        <div className="">
          <QuranSafha page={+pageId} lines={lines} pageMetadata={pageMetadata} />
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
