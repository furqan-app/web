import { notFound } from "next/navigation";
import { getPageWords } from "@/app/hooks/get-page-words";
import { getPagePair } from "@/app/utils/quran-pages";
import { Locale } from "@/app/types/config";
import { ReaderPager } from "@/app/components/reader/ReaderPager";
import { ReaderLabShell } from "@/app/components/reader-lab/ReaderLabShell";

type ReaderLabPageProps = {
  pageId: string;
  locale: Locale;
};

// Isolated server data boundary for the Nocturnal Reader Lab experiment.
// Reuses the production data pipeline and pair calculation without duplicating
// Qur'an formatting logic.
export const ReaderLabPage = async ({
  pageId,
  locale,
}: ReaderLabPageProps) => {
  const pageNumber = Number(pageId);
  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    notFound();
  }

  const { rightPage: rightPageId, leftPage: leftPageId } = getPagePair(pageNumber);

  // Independent initial page data fetch via Promise.all
  const [initialRightData, initialLeftData] = await Promise.all([
    getPageWords(rightPageId),
    getPageWords(leftPageId),
  ]);

  return (
    <ReaderLabShell initialPage={pageNumber}>
      <ReaderPager
        initialPage={pageNumber}
        rightPageId={rightPageId}
        leftPageId={leftPageId}
        initialRightData={initialRightData}
        initialLeftData={initialLeftData}
        locale={locale}
        basePath={`/${locale}/reader-lab`}
        forceDouble={true}
      />
    </ReaderLabShell>
  );
};
