import { Prisma } from "@/app/generated/quran-client";

export type WordWithVerse = Prisma.WordGetPayload<{ include: { verse: { include: { chapter: true } } } }>;

// WordWithVerse plus per-mushaf line-number overrides (mushaf_id → line_number).
// Only mushafs with divergent line groupings are present (see LAYOUT_MUSHAF_IDS
// in get-page-words.ts). Word.line_number (mushaf=2) is always the fallback.
export type WordWithLayouts = WordWithVerse & { layouts: Record<number, number> };

export type PageMetadataWithChapter = Prisma.PageMetadataGetPayload<{
  include: { chapter: true };
}>;

export type RubWithVerses = Prisma.RubGetPayload<{
  include: {
    rubVerseMappings: true;
    startVerse: {
      select: {
        page_number: true;
        Word: { select: { qpc_uthmani_hafs: true; char_type_name: true } };
      };
    };
    endVerse: { select: { page_number: true } };
  };
}>;
