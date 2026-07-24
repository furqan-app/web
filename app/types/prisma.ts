import { Prisma } from "@/app/generated/quran-client";

// Each page word carries only the slim nested-verse fields the reader + MarkModal
// actually read — verse-level mark target (verse_key, page_number) and end-of-surah
// banner detection (chapter.verses_count). The full nested verse+chapter (two
// @db.Text full-verse texts + every chapter field) was dropped here: it was
// serialized once per word (~1,478×/page → a 2.27 MB RSC payload) yet unused — the
// verse-mark title comes from the caller's `verseDisplayText`, not verse.text_uthmani.
// See ADR 0028 (payload slimming).
export type WordWithVerse = Prisma.WordGetPayload<{
  include: {
    verse: {
      select: {
        verse_key: true;
        page_number: true;
        chapter: { select: { verses_count: true } };
      };
    };
  };
}>;

// The slim nested-verse shape a page word carries — also the shape passed to
// MarkModal for a verse-level mark (replaces the full Prisma `Verse`).
export type VerseForMark = WordWithVerse["verse"];

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
