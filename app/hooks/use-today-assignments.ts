import { useMutation, useQuery } from "@tanstack/react-query";
import {
  checkOffTrack,
  getLocalDateString,
  getTodayAssignments,
} from "../server/actions/plans";
import { getQueryClient } from "../utils/queryClient";

/**
 * Derived assignments for every active enrollment on the browser's local
 * date (local-midnight day boundary, ADR 0030). The date is part of the
 * query key so a session left open across midnight fetches the new day.
 *
 * `enabled` (default true) lets callers gate the fetch on session presence —
 * e.g. the reader widget, which mounts on every reader route regardless of
 * auth state and would otherwise fire a guaranteed 401 per page view.
 */
export const useTodayAssignments = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const queryClient = getQueryClient();
  const date = getLocalDateString();
  const queryKey = ["/plans", "today", date];

  const query = useQuery({
    queryKey,
    queryFn: () => getTodayAssignments(date),
    enabled,
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["/plans"] });

  const checkOff = useMutation({
    mutationFn: (input: {
      planId: number;
      trackKey: string;
      rangeStart: number;
      rangeEnd: number;
    }) => checkOffTrack({ ...input, date }),
    onSuccess: reload,
  });

  return { ...query, date, reload, checkOff };
};
