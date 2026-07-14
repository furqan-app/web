"use client";

import { useEffect } from "react";
import { useRecitation } from "@/app/contexts/RecitationContext";

type Props = {
  firstVerseKey: string | null;
};

export function RecitationPageSync({ firstVerseKey }: Props) {
  const { setPageFirstVerseKey } = useRecitation();

  useEffect(() => {
    setPageFirstVerseKey(firstVerseKey);
    return () => setPageFirstVerseKey(null);
  }, [firstVerseKey, setPageFirstVerseKey]);

  return null;
}
