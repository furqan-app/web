import { prisma } from "@/app/utils/db";
import { RubWithVerses } from "@/app/types/prisma";

export const getRubs = async (): Promise<RubWithVerses[]> => {
  return prisma.rub.findMany({
    include: {
      rubVerseMappings: true,
      startVerse: {
        select: {
          text_uthmani: true,
          page_number: true,
        },
      },
      endVerse: {
        select: {
          text_uthmani: true,
          page_number: true,
        },
      },
    },
    orderBy: {
      rub_number: "asc",
    },
  });
};
