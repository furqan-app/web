import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import SearchResultsPage from "@/app/components/search/SearchResultsPage";
import { Locale } from "@/app/types/config";

export default function SearchPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  // useSearchParams() inside the view requires a Suspense boundary for
  // static rendering — the initial ?q= is seeded client-side, so this route
  // stays fully static.
  return (
    <Suspense>
      <SearchResultsPage />
    </Suspense>
  );
}
