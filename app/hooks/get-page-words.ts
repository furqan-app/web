import { quranPrisma } from "@/app/utils/db";
import { groupBy } from "@/app/utils/groupBy";
import { PageMetadataWithChapter, WordWithLayouts } from "@/app/types/prisma";

// Mushafs with divergent line groupings stored in word_mushaf_layouts.
// Word.line_number (mushaf=2) is the canonical default; entries here override
// it per-mushaf when the client switches tajweed mode (ADR 0023 Addendum 6).
export const LAYOUT_MUSHAF_IDS = [19];

export type PageWords = {
  lines: Record<string, Array<WordWithLayouts>>;
  pageMetadata: PageMetadataWithChapter;
};

export const getPageWords = async (page: number): Promise<PageWords> => {
  const [words, pageMetadata] = await Promise.all([
    quranPrisma.word.findMany({
      include: {
        verse: {
          include: { chapter: true },
        },
        mushafLayouts: {
          where: { mushaf_id: { in: LAYOUT_MUSHAF_IDS } },
        },
      },
      where: {
        page_number: page,
      },
      orderBy: [{ verse_id: "asc" }, { position: "asc" }],
    }),
    quranPrisma.pageMetadata.findUniqueOrThrow({
      where: { page_number: page },
      include: { chapter: true },
    }),
  ]);

  const wordsWithLayouts: Array<WordWithLayouts> = words.map(
    ({ mushafLayouts, ...word }) => ({
      ...word,
      layouts: Object.fromEntries(
        mushafLayouts.map((l) => [l.mushaf_id, l.line_number]),
      ),
    }),
  );

  return { lines: groupBy(wordsWithLayouts, "line_number"), pageMetadata };
};
