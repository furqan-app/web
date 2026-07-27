"use client";

import { useEffect } from "react";
import { getPagePair } from "@/app/utils/quran-pages";
import { useReaderPage } from "@/app/contexts/ReaderPageContext";

type Props = {
  anchor: number;
  isDouble: boolean;
};

// Null-rendering effect leaf, mirroring RecitationPageSync: publishes the
// pager's currently-visible page(s) into ReaderPageContext and clears them
// on unmount, so leaving the reader doesn't strand a stale page for
// consumers like PlansWidget.
export function ReaderPageSync({ anchor, isDouble }: Props) {
  const { setVisiblePages } = useReaderPage();

  useEffect(() => {
    const { rightPage, leftPage } = getPagePair(anchor);
    setVisiblePages(isDouble ? [rightPage, leftPage] : [anchor]);
    return () => setVisiblePages(null);
  }, [anchor, isDouble, setVisiblePages]);

  return null;
}
