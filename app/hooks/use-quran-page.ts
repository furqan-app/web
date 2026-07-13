import { useQuery } from "@tanstack/react-query";
import type { PageWords } from "./get-page-words";

// Same shape the /api/quran/pages/[pageId] route returns (it wraps
// getPageWords server-side) — reusing the type here instead of a separate
// hand-declared one keeps the two from drifting apart.
export type PageData = PageWords;

export const fetchPageAPI = async (page: number): Promise<PageData> => {
  return fetch(`/api/quran/pages/${page}`).then((response) => response.json());
};

export const usePage = (page: number) => {
  return useQuery({
    queryKey: ["page", page],
    queryFn: () => fetchPageAPI(page),
    staleTime: Infinity,
  });
};
