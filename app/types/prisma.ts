import { Prisma } from "@/app/generated/quran-client";

// Each page word carries only the slim fields the reader + MarkModal actually
// render: `qpc_uthmani_hafs` (mark snippet), `char_type_name`, `location` (React
// key + hit-testing), `audio_url` (word audio), `page_number`, and the slim nested
// verse (verse-level mark target + end-of-surah banner detection via
// `chapter.verses_count`). The full verse+chapter and the unused word text/index
// fields (`text_uthmani`, `text`, `id`, `position`, `verse_id`) were dropped: they
// were dead weight in the RSC payload + static JSON (ADR 0028). Keep in sync with
// the `select` in get-page-words.ts and scripts/quran-json/generate.js.
//
// `page_number` here is the DEFAULT edition's page — a stable canonical key for
// mark storage that must not shift when the reader switches edition. It is NOT
// the page this word is rendered on; that comes from the active edition's layout
// (ADR 0033). Never use it to drive rendering.
type WordBase = Prisma.WordGetPayload<{
  select: {
    audio_url: true;
    verse_key: true;
    location: true;
    qpc_uthmani_hafs: true;
    char_type_name: true;
    page_number: true;
    verse: {
      select: {
        verse_key: true;
        page_number: true;
        chapter: { select: { verses_count: true } };
      };
    };
  };
}>;

// A word as placed by one mushaf edition. `glyph` is that edition's glyph string
// (resolved from `code_v1`/`code_v2` at generation time) and `line_number` is its
// line in that edition. The two are inseparable: a glyph only renders correctly
// with its own edition's per-page font and page composition, and pairing them
// wrongly silently draws a different word rather than failing. Resolving the
// glyph field before it reaches the client is what removes that choice — and the
// bug class — from the render path entirely.
export type WordWithVerse = WordBase & {
  glyph: string;
  line_number: number;
};

// The slim nested-verse shape a page word carries — also the shape passed to
// MarkModal for a verse-level mark (replaces the full Prisma `Verse`).
export type VerseForMark = WordBase["verse"];

export type PageMetadataWithChapter = Prisma.MushafPageMetadataGetPayload<{
  include: { chapter: true };
}>;

export type RubWithVerses = Prisma.RubGetPayload<{
  include: {
    rubVerseMappings: true;
    startVerse: {
      select: {
        verse_key: true;
        page_number: true;
        Word: { select: { qpc_uthmani_hafs: true; char_type_name: true } };
      };
    };
    endVerse: { select: { page_number: true } };
  };
}>;
