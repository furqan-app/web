import { quranPrisma } from "@/app/utils/db";
import { RubWithVerses } from "@/app/types/prisma";

export const getRubs = async (): Promise<RubWithVerses[]> => {
  return quranPrisma.rub.findMany({
    include: {
      rubVerseMappings: { orderBy: [{ chapter_number: "asc" }, { start_verse: "asc" }] },
      startVerse: {
        select: {
          // page_number is the DEFAULT edition's page, kept as the SSR fallback.
          // The active edition's page is resolved client-side from verse_key via
          // useVersePages (ADR 0033).
          verse_key: true,
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
