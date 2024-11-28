import { useQuery } from "@tanstack/react-query";

export const getRubs = async () => {
  const response = await fetch("/api/quran/rubs");
  return response.json();
};

export const useRubs = () => {
  return useQuery({
    queryKey: ["rubs"],
    queryFn: getRubs,
    staleTime: Infinity,
  });
};
