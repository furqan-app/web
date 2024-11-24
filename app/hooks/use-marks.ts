import { useQuery } from "@tanstack/react-query";
import { getPageMarks } from "../server/actions/getPageMarks";
import { getQueryClient } from "../utils/queryClient";

export const useMarks = (page: number) => {
  const queryClient = getQueryClient();
  const query = useQuery({
    queryKey: ["/marks", page],
    queryFn: () => getPageMarks(page),
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  const reload = () =>
    queryClient.invalidateQueries({
      queryKey: ["/marks", page],
    });

  return { ...query, reload };
};

