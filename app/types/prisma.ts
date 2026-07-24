import { Prisma } from "@/app/generated/quran-client";

// Each page word carries only the slim fields the reader + MarkModal actually
// render: the glyph codes (`code_v1`/`code_v2`), `qpc_uthmani_hafs` (mark snippet),
// `char_type_name`, `location` (React key + hit-testing), `audio_url` (word audio),
// page/line numbers, and the slim nested verse (verse-level mark target + end-of-surah
// banner detection via `chapter.verses_count`). The full verse+chapter and the unused
// word text/index fields (`text_uthmani`, `text`, `id`, `position`, `verse_id`) were
// dropped: they were dead weight in the RSC payload + static JSON (ADR 0028). Keep in
// sync with the `select` in get-page-words.ts and scripts/quran-json/generate.js.
export type WordWithVerse = Prisma.WordGetPayload<{
  select: {
    audio_url: true;
    verse_key: true;
    location: true;
    code_v1: true;
    code_v2: true;
    qpc_uthmani_hafs: true;
    char_type_name: true;
    page_number: true;
    line_number: true;
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
