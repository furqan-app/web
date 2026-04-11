import { useQuery } from "@tanstack/react-query";
import { PageMetadataWithChapter, WordWithVerse } from "../types/prisma";

export type PageData = {
  lines: Record<string, Array<WordWithVerse>>;
  pageMetadata: PageMetadataWithChapter;
};

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
