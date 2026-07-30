import { quranPrisma } from "@/app/utils/db";
import { groupBy } from "@/app/utils/groupBy";
import { PageMetadataWithChapter, WordWithVerse } from "@/app/types/prisma";
import {
  DEFAULT_MUSHAF_ID,
  MUSHAF_EDITION_IDS,
} from "@/app/utils/mushaf-editions";

// Which `Word` column holds each edition's glyph string. Mirrors
// GLYPH_FIELD_BY_MUSHAF in scripts/quran-seed/mushaf-layout.js — the two must
// agree: that one feeds the static JSON the reader fetches, this one serves the
// DB-backed API route. See ADR 0033.
const GLYPH_FIELD: Record<number, "code_v1" | "code_v2"> = {
  2: "code_v1",
  19: "code_v2",
};

export type PageWords = {
  lines: Record<string, Array<WordWithVerse>>;
  pageMetadata: PageMetadataWithChapter;
};

/**
 * A page of one mushaf edition.
 *
 * Composition comes from `mushaf_word_layouts` — that edition's own page AND line
 * assignment. Never from `Word.page_number`/`Word.line_number`, which are only a
 * denormalized mirror of the default edition: composing a page from one edition
 * while taking line numbers from another splices two different printed books, and
 * because each page's font has its own local codepoint space that renders words
 * from the wrong page instead of failing (ADR 0033).
 *
 * Keep in sync with `scripts/quran-json/generate.js`, which produces the static
 * per-page JSON the reader actually fetches (ADR 0028).
 */
export const getPageWords = async (
  page: number,
  mushafId: number = DEFAULT_MUSHAF_ID,
): Promise<PageWords> => {
  const glyphField = GLYPH_FIELD[mushafId];
  if (!glyphField) {
    throw new Error(
      `getPageWords: mushaf ${mushafId} has no glyph field registered ` +
        `(known editions: ${MUSHAF_EDITION_IDS.join(", ")})`,
    );
  }

  const [layoutRows, pageMetadata] = await Promise.all([
    quranPrisma.mushafWordLayout.findMany({
      where: { mushaf_id: mushafId, page_number: page },
      select: {
        line_number: true,
        word: {
          // Slim word projection — MUST match generate.js and WordWithVerse.
          select: {
            audio_url: true,
            verse_key: true,
            location: true,
            [glyphField]: true,
            qpc_uthmani_hafs: true,
            char_type_name: true,
            page_number: true,
            verse: {
              select: {
                verse_key: true,
                page_number: true,
                chapter: { select: { verses_count: true } },
              },
            },
          },
        },
      },
      // Document order — what the surah-banner gap detection assumes.
      orderBy: [{ word: { verse_id: "asc" } }, { word: { position: "asc" } }],
    }),
    quranPrisma.mushafPageMetadata.findFirstOrThrow({
      where: { mushaf_id: mushafId, page_number: page },
      include: { chapter: true },
    }),
  ]);

  const words = layoutRows.map((row) => {
    const { [glyphField]: glyph, ...rest } = row.word as Record<string, unknown>;
    return {
      ...rest,
      glyph: glyph as string,
      line_number: row.line_number,
    } as WordWithVerse;
  });

  return { lines: groupBy(words, "line_number"), pageMetadata };
};
