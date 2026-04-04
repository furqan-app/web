import { SurahResult } from "@/app/types";
import { prisma } from "@/app/utils/db";

export const getSurahs = async (): Promise<SurahResult[]> => {
    return prisma.chapter.findMany({
        select: {
            id: true,
            name_arabic: true,
            name_simple: true,
            verses_count: true,
            revelation_place: true,
            pages: true
        },
        orderBy: { id: 'asc' }
    });
};
