import { useQuery } from "@tanstack/react-query";
import { getAccessGrants } from "../server/actions/mushaf/accessGrants";
import { getQueryClient } from "../utils/queryClient";

export const ACCESS_GRANTS_KEY = ["/mushaf/grants"];

export const useAccessGrants = () => {
  const queryClient = getQueryClient();

  const query = useQuery({
    queryKey: ACCESS_GRANTS_KEY,
    queryFn: getAccessGrants,
    refetchOnWindowFocus: false,
  });

  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ACCESS_GRANTS_KEY });

  return { ...query, reload };
};
