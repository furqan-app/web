import { useQuery } from "@tanstack/react-query";
import { getAllMarks } from "../server/actions/getAllMarks";
import { getQueryClient } from "../utils/queryClient";

export const useAllMarks = () => {
  const queryClient = getQueryClient();
  const queryKey = ["/marks/all"];

  const query = useQuery({
    queryKey,
    queryFn: getAllMarks,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey });

  return { ...query, reload };
};
