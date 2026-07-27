import { getPageWords } from "@/app/hooks/get-page-words";
import { getPagePair } from "@/app/utils/quran-pages";
import { Locale } from "@/app/types/config";
import { ReaderPager } from "@/app/components/reader/ReaderPager";

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

// SSR entry for the reader (ADR 0028). Statically generated per page for deep
// links / SEO / first paint, it fetches only the CURRENT pair's words (sequential
// per ADR 0013) and hands off to the persistent client `ReaderPager`, which owns
// all subsequent navigation client-side (no router.push, no per-swipe remount).
// The old five-panel carousel (~10 pages fetched + mounted per view) is gone.
export const ReaderPage = async ({
  pageId,
  locale,
  basePath,
  grantId,
  viewingOwnerName,
}: ReaderPageProps) => {
  const pageNumber = Number(pageId);
  const { rightPage: rightPageId, leftPage: leftPageId } = getPagePair(pageNumber);

  // Sequential (not Promise.all) so a static-build worker stays within the DB
  // connection limit (ADR 0013).
  const initialRightData = await getPageWords(rightPageId);
  const initialLeftData = await getPageWords(leftPageId);

  return (
    <ReaderPager
      initialPage={pageNumber}
      rightPageId={rightPageId}
      leftPageId={leftPageId}
      initialRightData={initialRightData}
      initialLeftData={initialLeftData}
      locale={locale}
      basePath={basePath}
      grantId={grantId}
      viewingOwnerName={viewingOwnerName}
    />
  );
};
