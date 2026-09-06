import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import SearchResultsPage from "@/app/components/search/SearchResultsPage";
import { Locale } from "@/app/types/config";

// Grant-scoped search: same view, but mounted under the [grant] layout guard
// (session + viewer check) so useReaderBasePath() resolves verse/surah links
// inside the granted mushaf instead of dropping the viewer into their own
// (ADR 0012).
export default function GrantSearchPage({
  params: { locale },
}: {
  params: { locale: Locale; grant: string };
}) {
  setRequestLocale(locale);

  return (
    <Suspense>
      <SearchResultsPage />
    </Suspense>
  );
}
