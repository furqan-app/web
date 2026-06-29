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

const QuranPageById = async ({
  params: { id: pageId, locale },
}: QuranPageByIdProps) => {
  setRequestLocale(locale);

  const { lines, pageMetadata } = await getPageWords(Number(pageId));
  const isRTL = getLanguageDirection(locale) === "rtl";

  const getNavigationHref = (direction: "left" | "right") => {
    const isFirstPage = pageId === "1";
    const isLastPage = pageId === "604";

    // In RTL (Arabic): left = next page (higher number), right = previous page
    // In LTR: left = previous page, right = next page
    const isIncrement = isRTL ? direction === "left" : direction === "right";

    if (isIncrement) {
      return isLastPage ? "1" : String(Number(pageId) + 1);
    }
    return isFirstPage ? "604" : String(Number(pageId) - 1);
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

      <div className="flex justify-center items-start px-4 py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="relative bg-card border border-border rounded-2xl shadow-md px-20 w-full max-w-3xl">
          <QuranSafha page={+pageId} lines={lines} pageMetadata={pageMetadata} />

          {/* Left arrow */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <Link
              href={`/${locale}/pages/${getNavigationHref("left")}`}
              className="flex items-center justify-center w-11 h-11 rounded-full border border-line-2 bg-card text-muted-foreground hover:-translate-y-px transition-transform duration-[120ms]"
            >
              <ChevronLeft className="size-5" />
            </Link>
          </div>

          {/* Right arrow */}
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <Link
              href={`/${locale}/pages/${getNavigationHref("right")}`}
              className="flex items-center justify-center w-11 h-11 rounded-full border border-line-2 bg-card text-muted-foreground hover:-translate-y-px transition-transform duration-[120ms]"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuranPageById;
