import { useQuery } from "@tanstack/react-query";
import type { PageWords } from "./get-page-words";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
import { getMushafEdition } from "@/app/utils/mushaf-editions";

// Same shape `getPageWords()` returns — the static per-page JSON in
// public/quran/pages/{mushafId}/ is generated from it
// (scripts/quran-json/generate.js).
export type PageData = PageWords;

// Content is immutable, so the pager fetches the pre-generated static JSON
// instead of hitting a runtime query — CDN/service-worker cacheable, works
// offline. See ADR 0028. The path is per mushaf edition: page N of one edition
// holds different words than page N of another, so the edition is part of both
// the URL and the cache key (ADR 0033).
export const fetchPageAPI = async (
  page: number,
  mushafId: number,
): Promise<PageData> => {
  const url = getMushafEdition(mushafId).pageJsonUrl(page);
  return fetch(url).then((response) => response.json());
};

export const pageQueryKey = (page: number, mushafId: number) => [
  "page",
  mushafId,
  page,
];

export const usePage = (page: number) => {
  const { mushafId } = useQuranMushaf();
  return useQuery({
    queryKey: pageQueryKey(page, mushafId),
    queryFn: () => fetchPageAPI(page, mushafId),
    staleTime: Infinity,
  });
};
