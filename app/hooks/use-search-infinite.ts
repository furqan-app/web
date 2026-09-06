import { useInfiniteQuery } from "@tanstack/react-query";
import { SearchPage, VerseResult } from "../types";
import { isSearchQueryValid } from "../constants/search";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
import { useVersePages } from "@hooks/use-verse-pages";
import {
  isSearchOffline,
  searchVersesOffline,
  searchVersesOnline,
} from "@hooks/use-search";

// Chunk size for one infinite-scroll page of verse results. Within
// MAX_VERSE_TAKE (50): each row eager-loads its full Word[] array, so an
// uncapped chunk blocks the main thread as it lands (decisions/search.md).
export const SEARCH_RESULTS_PAGE_TAKE = 20;

const EMPTY_VERSES: SearchPage<VerseResult> = { results: [], total: 0 };

export const useSearchInfiniteVerses = (
  query: string,
  take = SEARCH_RESULTS_PAGE_TAKE,
) => {
  const { mushafId } = useQuranMushaf();
  // Shared React Query cache (staleTime: Infinity, networkMode: "always") —
  // one ~73 KB fetch per edition, SW-cached, resolves offline. The query below
  // gates on it because the online path remaps every page_number through the
  // active edition's map (ADR 0033).
  const versePages = useVersePages();

  return useInfiniteQuery({
    queryKey: ["search-verses-infinite", query, take, mushafId],
    initialPageParam: 0,
    queryFn: async ({
      pageParam,
    }): Promise<SearchPage<VerseResult>> => {
      if (!query.trim()) return EMPTY_VERSES;
      const skip = pageParam * take;

      const online = await searchVersesOnline(query, take, skip);
      if (online) {
        const pages = versePages.data ?? {};
        return {
          total: online.total,
          results: online.results.map((verse) => ({
            ...verse,
            // The API returns Verse.page_number (default-edition mirror) —
            // links must land on the active edition's page (ADR 0033).
            page_number: pages[verse.verse_key] ?? verse.page_number,
          })),
        };
      }
      // Online but the API errored (searchVersesOnline swallows !ok to null):
      // surface the error state rather than rendering a 500 as "no results".
      // Genuine offline / fetch rejection falls through to the local index.
      if (!isSearchOffline()) {
        throw new Error(`Search request failed (status != 2xx) for query of length ${query.trim().length}.`);
      }
      return searchVersesOffline(query, take, skip, mushafId);
    },
    getNextPageParam: (lastPage, allPages) =>
      allPages.length * take < lastPage.total ? allPages.length : undefined,
    enabled: isSearchQueryValid(query) && !!versePages.data,
    // Quran content is immutable — never refetch on remount, and run even
    // while offline (the fallback reads SW-cached JSON).
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: "always",
  });
};
