import { useQuery } from "@tanstack/react-query";
import { getPlanHistory } from "../server/actions/plans";

/**
 * A plan's progress log, most recent first — read-only, never recomputed
 * (ADR 0030: history reads what was actually done). `enabled` lets callers
 * fetch on demand (e.g. only once a "History" section is expanded).
 */
export const usePlanHistory = (planId: number, { enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: ["/plans", planId, "history"],
    queryFn: () => getPlanHistory(planId),
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
