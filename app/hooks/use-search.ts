import { useQuery } from "@tanstack/react-query";
import { SurahResult, VerseResult } from "../types";
import { isSearchQueryValid } from "../constants/search";

const searchVerses = async (query: string): Promise<VerseResult[]> => {
  if (!query.trim()) return [];
  const response = await fetch(`/api/search/verses?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.results;
};

const searchChapters = async (query: string): Promise<SurahResult[]> => {
  if (!query.trim()) return [];
  const response = await fetch(`/api/search/chapters?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.results;
};

export const useSearch = (query: string) => {
  const verses = useQuery({
    queryKey: ["search-verses", query],
    queryFn: () => searchVerses(query),
    enabled: isSearchQueryValid(query),
  });

  const chapters = useQuery({
    queryKey: ["search-chapters", query],
    queryFn: () => searchChapters(query),
    enabled: isSearchQueryValid(query),
  });

  return {
    verses,
    chapters,
    isLoading: verses.isLoading || chapters.isLoading,
  };
};