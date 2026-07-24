import { useMutation, useQuery } from "@tanstack/react-query";
import {
  checkOffTrack,
  getLocalDateString,
  getTodayAssignments,
} from "../server/actions/plans";
import { getQueryClient } from "../utils/queryClient";

/**
 * Derived assignments for every active enrollment on the browser's local
 * date (local-midnight day boundary, ADR 0028). The date is part of the
 * query key so a session left open across midnight fetches the new day.
 */
export const useTodayAssignments = () => {
  const queryClient = getQueryClient();
  const date = getLocalDateString();
  const queryKey = ["/plans", "today", date];

  const query = useQuery({
    queryKey,
    queryFn: () => getTodayAssignments(date),
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
