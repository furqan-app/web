"use client";

import { useEffect } from "react";
import { useRecitation } from "@/app/contexts/RecitationContext";

type Props = {
  firstVerseKey: string | null;
  pageNumber: number;
};

export function RecitationPageSync({ firstVerseKey, pageNumber }: Props) {
  const { setPageFirstVerseKey, setCurrentPageNumber } = useRecitation();

  useEffect(() => {
    setPageFirstVerseKey(firstVerseKey);
    return () => setPageFirstVerseKey(null);
  }, [firstVerseKey, setPageFirstVerseKey]);

  useEffect(() => {
    setCurrentPageNumber(pageNumber);
    return () => setCurrentPageNumber(null);
  }, [pageNumber, setCurrentPageNumber]);

  return null;
}
