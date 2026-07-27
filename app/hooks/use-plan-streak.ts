import { useQuery } from "@tanstack/react-query";
import { getLocalDateString, getPlanStreak } from "../server/actions/plans";

/**
 * Current streak + rolling 7-day week strip, derived from every active
 * enrollment (see docs/plans/daily-awrad-ui.md's Companion Redesign
 * section). Same query shape as useTodayAssignments — date-keyed, no
 * background refetch.
 */
export const usePlanStreak = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const date = getLocalDateString();
  const queryKey = ["/plans", "streak", date];

  return useQuery({
    queryKey,
    queryFn: () => getPlanStreak(date),
    enabled,
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });
};
