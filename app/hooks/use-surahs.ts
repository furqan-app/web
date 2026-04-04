import { useQuery } from "@tanstack/react-query";

export const useSurahs = () => {
    return useQuery({
        queryKey: ["surahs"],
        queryFn: () => fetch('/api/quran/surahs').then(res => res.json()),
        staleTime: Infinity,
    });
};
