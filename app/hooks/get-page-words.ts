import { prisma } from "@/app/utils/db";
import { groupBy } from "@/app/utils/groupBy";
import { WordWithVerse } from "@/app/types/prisma";

export const getPageWords = async (
  page: number
): Promise<Record<string, Array<WordWithVerse>>> => {
  const words = await prisma.word.findMany({
    include: {
      verse: {
        include: { chapter: true },
      },
    },
    where: {
      page_number: page,
    },
    orderBy: [
      { verse_id: "asc" },
      { position: "asc" },
    ],
  });

  return groupBy(words, "line_number");
};
