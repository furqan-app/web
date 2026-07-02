import { SurahResult } from "@/app/types";
import { quranPrisma } from "@/app/utils/db";

export const getSurahs = async (): Promise<SurahResult[]> => {
    return quranPrisma.chapter.findMany({
        select: {
            id: true,
            name_arabic: true,
            name_simple: true,
            translated_name: true,
            verses_count: true,
            revelation_place: true,
            pages: true
        },
        orderBy: { id: 'asc' }
    });
};
