import { useQuery } from "@tanstack/react-query";

type SearchResult = {
  verse_key: string;
  text_imlaei_simple: string;
  text_uthmani: string;
  page_number: number;
  chapter_name: string;
};

const searchQuran = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return [];

  const response = await fetch(`/api/quran/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.results;
};

export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchQuran(query),
    enabled: query.length > 0,
  });
};