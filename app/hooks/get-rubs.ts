import { prisma } from "@/app/utils/db";
import { RubWithVerses } from "@/app/types/prisma";

export const getRubs = async (): Promise<RubWithVerses[]> => {
  return prisma.rub.findMany({
    include: {
      rubVerseMappings: true,
      startVerse: {
        select: {
          page_number: true,
          Word: {
            select: {
              qpc_uthmani_hafs: true,
              char_type_name: true,
            },
            orderBy: { position: "asc" },
          },
        },
      },
      endVerse: {
        select: {
          page_number: true,
        },
      },
    },
    orderBy: {
      rub_number: "asc",
    },
  });
};
