import { prisma } from "@/app/utils/db";
import { groupBy } from "@/app/utils/groupBy";
import { PageMetadataWithChapter, WordWithVerse } from "@/app/types/prisma";

export type PageWords = {
  lines: Record<string, Array<WordWithVerse>>;
  pageMetadata: PageMetadataWithChapter;
};

export const getPageWords = async (page: number): Promise<PageWords> => {
  const [words, pageMetadata] = await Promise.all([
    prisma.word.findMany({
      include: {
        verse: {
          include: { chapter: true },
        },
      },
      where: {
        page_number: page,
      },
      orderBy: [{ verse_id: "asc" }, { position: "asc" }],
    }),
    prisma.pageMetadata.findUniqueOrThrow({
      where: { page_number: page },
      include: { chapter: true },
    }),
  ]);

  return { lines: groupBy(words, "line_number"), pageMetadata };
};
