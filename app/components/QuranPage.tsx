"use client";

import { memo } from "react";
import { useLocale } from "next-intl";
import { usePage } from "@hooks/use-quran-page";
import { QuranSafha } from "@components/QuranSafha";

type Props = {
  page: number;
};

const QuranPage = memo(function QuranPage({ page }: Props) {
  const locale = useLocale();
  const { data, error } = usePage(page);

  if (error) {
    return (
      <div className="flex h-full justify-center items-center">
        Cannot load page {page}
      </div>
    );
  }

  if (!data)
    return (
      <div className="flex h-full justify-center items-center">
        Loading page {page}...
      </div>
    );

  return <QuranSafha page={page} lines={data.lines} pageMetadata={data.pageMetadata} locale={locale} />;
});

export default QuranPage;

