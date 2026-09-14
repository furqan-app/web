import { useMutation, useQuery } from "@tanstack/react-query";
import {
  enrollCustomPlan,
  enrollInPlan,
  getMyPlans,
  updateCustomPlan,
  updatePlanParams,
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

  const enrollCustom = useMutation({
    mutationFn: enrollCustomPlan,
    onSuccess: reload,
  });

  const setStatus = useMutation({
    mutationFn: updatePlanStatus,
    onSuccess: reload,
  });

  const updateParams = useMutation({
    mutationFn: updatePlanParams,
    onSuccess: reload,
  });

  const updateCustom = useMutation({
    mutationFn: updateCustomPlan,
    onSuccess: reload,
  });

  return { ...query, reload, enroll, enrollCustom, setStatus, updateParams, updateCustom };
};
