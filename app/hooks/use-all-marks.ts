import { useQuery } from "@tanstack/react-query";
import { getAllMarks } from "../server/actions/getAllMarks";
import { getQueryClient } from "../utils/queryClient";

export const useAllMarks = () => {
  const queryClient = getQueryClient();
  // Nested under the shared "/marks" prefix (see useMarks) so a reload from
  // either hook invalidates both this list and any per-page cache.
  const queryKey = ["/marks", "all"];

  const query = useQuery({
    queryKey,
    queryFn: getAllMarks,
    // See use-marks.ts for why staleTime: Infinity + default refetchOnMount
    // (rather than refetchOnMount: false) is required for cross-hook
    // invalidation to actually refetch on the next mount.
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["/marks"] });

  return { ...query, reload };
};
