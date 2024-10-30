"use client";

import { memo } from "react";
import { usePage } from "../hooks/use-quran-page";
import { QuranSafha } from "./QuranSafha";

type Props = {
  page: number;
};

const QuranPage = memo(function QuranPage({ page }: Props) {
  console.log("Mounted Vertical scrolling QuranPage number", page);
  const { data: lines, isPending, error } = usePage(page);

  if (error) return <div>Cannot load page</div>;
  if (!lines)
    return (
      <div className="flex h-full justify-center items-center border">
        Loading...
      </div>
    );

  return <QuranSafha page={page} lines={lines} fontLoaded={!isPending} />;
});

export default QuranPage;

