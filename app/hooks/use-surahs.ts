import { useQuery } from "@tanstack/react-query";
import { Surah } from "@/app/types";

const getSurahs = async (language: string): Promise<Surah[]> => {
    const data = await fetch(
        `https://api.qurancdn.com/api/qdc/chapters?language=${language}`
    ).then((res) => res.json());
    return data.chapters;
};

export const useSurahs = (language: string) => {
    return useQuery({
        queryKey: ["surahs", language],
        queryFn: () => getSurahs(language),
        staleTime: Infinity,
    });
};
