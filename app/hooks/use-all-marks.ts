import { useInfiniteQuery } from "@tanstack/react-query";
import { getAllMarks } from "../server/actions/getAllMarks";
import { getQueryClient } from "../utils/queryClient";

export const useAllMarks = (category: string) => {
  const queryClient = getQueryClient();
  // Nested under the shared "/marks" prefix (see useMarks) so a reload from
  // either hook invalidates both this list and any per-page cache. Category
  // is part of the key so switching tabs is its own cached infinite query.
  const queryKey = ["/marks", "all", category];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => getAllMarks({ category, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // See use-marks.ts for why staleTime: Infinity + default refetchOnMount
    // (rather than refetchOnMount: false) is required for cross-hook
    // invalidation to actually refetch on the next mount. For an infinite
    // query, invalidation re-walks every already-loaded page in order,
    // recomputing each page's cursor from the freshly-fetched previous page.
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["/marks"] });

  return { ...query, reload };
};
