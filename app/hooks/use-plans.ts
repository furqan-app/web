import { useMutation, useQuery } from "@tanstack/react-query";
import {
  enrollInPlan,
  getMyPlans,
  updatePlanStatus,
} from "../server/actions/plans";
import { getQueryClient } from "../utils/queryClient";

/**
 * The caller's plan enrollments. Shares the "/plans" query-key prefix with
 * useTodayAssignments so any mutation invalidates both (same pattern as the
 * "/marks" prefix in useMarks/useAllMarks).
 */
export const usePlans = () => {
  const queryClient = getQueryClient();
  const queryKey = ["/plans", "list"];

  const query = useQuery({
    queryKey,
    queryFn: getMyPlans,
    // See use-marks.ts: staleTime Infinity + default refetchOnMount means an
    // invalidation-then-mount refetches while plain re-navigation does not.
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["/plans"] });

  const enroll = useMutation({
    mutationFn: enrollInPlan,
    onSuccess: reload,
  });

  const setStatus = useMutation({
    mutationFn: updatePlanStatus,
    onSuccess: reload,
  });

  return { ...query, reload, enroll, setStatus };
};
