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
      // Slim word projection: only the fields the reader + MarkModal render. The
      // heavy unused fields (`text_uthmani`, `text`) and query-only fields (`id`,
      // `position`, `verse_id`) are dropped from the payload — they were dead weight
      // in the static per-page JSON (ADR 0028). Keep in sync with WordWithVerse in
      // app/types/prisma.ts and scripts/quran-json/generate.js. `orderBy` may still
      // reference `verse_id`/`position` even though they are not selected.
      select: {
        audio_url: true,
        verse_key: true,
        location: true,
        code_v1: true,
        code_v2: true,
        qpc_uthmani_hafs: true,
        char_type_name: true,
        page_number: true,
        line_number: true,
        verse: {
          select: {
            verse_key: true,
            page_number: true,
            chapter: { select: { verses_count: true } },
          },
        },
        mushafLayouts: {
          where: { mushaf_id: { in: LAYOUT_MUSHAF_IDS } },
          select: { mushaf_id: true, line_number: true },
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
