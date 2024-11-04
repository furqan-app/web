import { useQuery } from "@tanstack/react-query";

export type VerseResult = {
  verse_key: string;
  text_imlaei_simple: string;
  text_uthmani: string;
  page_number: number;
  chapter_name: string;
};

export type ChapterResult = {
  id: number;
  name_arabic: string;
  name_simple: string;
  verses_count: number;
  pages: string;
};

const searchVerses = async (query: string): Promise<VerseResult[]> => {
  if (!query.trim()) return [];
  const response = await fetch(`/api/search/verses?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.results;
};

const searchChapters = async (query: string): Promise<ChapterResult[]> => {
  if (!query.trim()) return [];
  const response = await fetch(`/api/search/chapters?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.results;
};

export const useSearch = (query: string) => {
  const verses = useQuery({
    queryKey: ["search-verses", query],
    queryFn: () => searchVerses(query),
    enabled: query.length > 0,
  });

  const chapters = useQuery({
    queryKey: ["search-chapters", query],
    queryFn: () => searchChapters(query),
    enabled: query.length > 0,
  });

  return {
    verses,
    chapters,
    isLoading: verses.isLoading || chapters.isLoading,
  };
};