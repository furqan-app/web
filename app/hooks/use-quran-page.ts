import { useQuery } from "@tanstack/react-query";
import type { PageWords } from "./get-page-words";

// Same shape `getPageWords()` returns — the static per-page JSON in
// public/quran/pages/ is generated from it (scripts/quran-json/generate.js).
export type PageData = PageWords;

// Content is immutable, so the pager fetches the pre-generated static JSON
// (public/quran/pages/{n}.json) instead of the DB-backed API route — no runtime
// query, CDN/service-worker cacheable, works offline. See ADR 0028.
export const fetchPageAPI = async (page: number): Promise<PageData> => {
  return fetch(`/quran/pages/${page}.json`).then((response) => response.json());
};

export const usePage = (page: number) => {
  return useQuery({
    queryKey: ["page", page],
    queryFn: () => fetchPageAPI(page),
    staleTime: Infinity,
  });
};
