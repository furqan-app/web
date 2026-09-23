import { useQuery } from "@tanstack/react-query";
import { getLocalDateString, getPlanDashboard } from "../server/actions/plans";

/**
 * Progress dashboard data (per-activity streaks, totals, 365-day heatmap),
 * derived from user plans and progress logs (ADR 0030, #599). Same query
 * shape as usePlanStreak — date-keyed, no background refetch.
 */
export const usePlanDashboard = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const date = getLocalDateString();
  const queryKey = ["/plans", "dashboard", date];

  return useQuery({
    queryKey,
    queryFn: () => getPlanDashboard(date),
    enabled,
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });
};
