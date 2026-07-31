import { setRequestLocale } from "next-intl/server";

import { ReaderPage } from "@/app/components/reader/ReaderPage";
import { Locale } from "@/app/types/config";
import {
  MUSHAF_EDITIONS,
  MUSHAF_EDITION_IDS,
} from "@/app/utils/mushaf-editions";

// Bounds Hostinger CDN edge-cache poisoning to a 5-minute window instead of
// Next's default 1-year s-maxage (see ADR 0035).
export const revalidate = 300;

// statically generate all pages in build time. The route shell is
// edition-agnostic (content is fetched client-side per edition), so the range
// must cover the LONGEST edition — a shorter hardcoded value would silently
// leave a future edition's tail pages unroutable. See ADR 0033.
export async function generateStaticParams() {
  const maxPages = Math.max(
    ...MUSHAF_EDITION_IDS.map((id) => MUSHAF_EDITIONS[id].pagesCount),
  );
  return Array.from({ length: maxPages }, (_, i) => ({
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
