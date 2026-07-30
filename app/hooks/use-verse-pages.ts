import { useQuery } from "@tanstack/react-query";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";

export type VersePages = Record<string, number>;

// verse_key → page for one edition, generated per edition by
// scripts/quran-json/generate.js. A page number is meaningless without an
// edition, so anything resolving a page from a verse — rub/hizb navigation,
// keeping the reader on the same verse across an edition switch — has to go
// through the active edition's map (ADR 0033). ~73 KB, immutable, fetched once.
export const fetchVersePages = async (mushafId: number): Promise<VersePages> =>
  fetch(`/quran/verse-pages/${mushafId}.json`).then((r) => r.json());

export const useVersePages = () => {
  const { mushafId } = useQuranMushaf();
  return useQuery({
    queryKey: ["verse-pages", mushafId],
    queryFn: () => fetchVersePages(mushafId),
    staleTime: Infinity,
  });
};
