import { useQuery } from "@tanstack/react-query";
import { getPageMarks } from "../server/actions/getPageMarks";
import { getQueryClient } from "../utils/queryClient";

export const useMarks = (page: number, grantId?: string) => {
  const queryClient = getQueryClient();
  // grantId is part of the key so a viewed mushaf's marks never collide with
  // the viewer's own cache for the same page.
  const queryKey = ["/marks", page, grantId ?? "self"];

  const query = useQuery({
    queryKey,
    queryFn: () => getPageMarks(page, grantId),
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
