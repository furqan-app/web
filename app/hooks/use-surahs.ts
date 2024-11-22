import { useQuery } from "@tanstack/react-query";
import { Surah } from "@/app/types";

const getSurahs = async (): Promise<Surah[]> => {
    const response = await fetch(`/api/quran/surahs`);
    return response.json();
};

export const useSurahs = () => {
    return useQuery({
        queryKey: ["surahs"],
        queryFn: getSurahs,
        staleTime: Infinity,
    });
};
