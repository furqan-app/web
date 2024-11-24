import { useQuery } from "@tanstack/react-query";
import { WordWithVerse } from "../types/prisma";
import { Verse } from "../types";

export const fetchPageAPI = async (
  page: number
): Promise<Record<string, Array<WordWithVerse>>> => {
  return fetch(
    `http://localhost:3000/api/quran/pages/${page}`
  ).then((response) => response.json());

};

export const fetchPageInfoAPI = async (
  page: number
): Promise<Verse> => {
  const response = await fetch(`http://localhost:3000/api/quran/pages/${page}/info`);
  return response.json();
};

export const usePage = (page: number) => {
  return useQuery({
    queryKey: ["page", page],
    queryFn: () => fetchPageAPI(page),
    staleTime: Infinity,
  });
};


export const usePageInfo = (page: number) => {
  return useQuery({
    queryKey: ["pageInfo", page],
    queryFn: () => fetchPageInfoAPI(page),
    staleTime: Infinity,
  });
};