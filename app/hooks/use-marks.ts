import { useQuery } from "@tanstack/react-query";
import { getPageMarks, PageMark } from "../server/actions/getPageMarks";
import { getQueryClient } from "../utils/queryClient";

/**
 * Marks for one or more pages, keyed by `marked_id`.
 *
 * Takes a LIST of pages because `Mark.page_number` is always the DEFAULT
 * edition's page (a stable canonical key — marks must not move when the reader
 * switches edition), while the reader may be displaying another edition whose
 * page N spans two default-edition pages. On the 36 pages where the editions
 * disagree, fetching only the displayed page number would hide some of the marks
 * actually on screen. See ADR 0033.
 *
 * Results are merged into one `marked_id` map, so extra marks from a neighbouring
 * page are harmless — lookups are by word location / verse key, never by page.
 */
export const useMarks = (pages: number[], grantId?: string) => {
  const queryClient = getQueryClient();
  // Sorted so the key is stable regardless of the order pages were discovered.
  const pageKey = Array.from(new Set(pages)).sort((a, b) => a - b);
  // grantId is part of the key so a viewed mushaf's marks never collide with
  // the viewer's own cache for the same pages.
  const queryKey = ["/marks", pageKey.join(","), grantId ?? "self"];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const results = await Promise.all(
        pageKey.map((page) => getPageMarks(page, grantId)),
      );
      return Object.assign({}, ...results) as Record<string, PageMark>;
    },
    enabled: pageKey.length > 0,
    // Never go stale on its own — only an explicit reload()/invalidateQueries
    // call (elsewhere) should trigger a refetch. Combined with the default
    // refetchOnMount: true, this means mounting after an invalidation (e.g.
    // navigating here after adding a mark elsewhere) DOES refetch, while an
    // ordinary re-navigation with no mutation in between does not.
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  // Invalidate the whole "/marks" prefix, not just this page's key, so an
  // add/remove here also refreshes any other page's cache and the all-marks
  // list (/marks) — and vice versa, see useAllMarks.
  const reload = () => queryClient.invalidateQueries({ queryKey: ["/marks"] });

  return { ...query, reload };
};
