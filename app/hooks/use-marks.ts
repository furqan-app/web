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
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey });

  return { ...query, reload };
};
