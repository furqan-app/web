import { useQuery } from "@tanstack/react-query";
import { WordWithVerse } from "../types/prisma";

export const fetchPageAPI = async (
  page: number
): Promise<Record<string, Array<WordWithVerse>>> => {
  return fetch(
    `/api/quran/pages/${page}`
  ).then((response) => response.json());

};

export const usePage = (page: number) => {
  return useQuery({
    queryKey: ["page", page],
    queryFn: () => fetchPageAPI(page),
    staleTime: Infinity,
  });
};
