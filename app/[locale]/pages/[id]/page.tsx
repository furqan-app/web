import { setRequestLocale } from "next-intl/server";

import { ReaderPage } from "@/app/components/reader/ReaderPage";
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

  return (
    <ReaderPage pageId={pageId} locale={locale} basePath={`/${locale}/pages`} />
  );
};

export default QuranPageById;
