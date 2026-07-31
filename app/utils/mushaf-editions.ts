// Mushaf edition registry — the render-time half of the edition contract.
//
// A mushaf is a typeset book: a committee fixes where every word sits for that
// specific print edition. An edition therefore owns its word placement (page AND
// line), its glyph data, and its per-page font files as ONE inseparable unit.
// Every page has its own font whose glyph codepoint space is local to that page,
// so pairing a glyph with another edition's font does not error — it silently
// draws a different word. That is why nothing here is individually selectable:
// callers pick an edition and receive the whole set.
//
// The build-time half lives in `scripts/quran-seed/mushaf-layout.js`
// (`GLYPH_FIELD_BY_MUSHAF`, `LAYOUT_MUSHAF_IDS`) and must agree with this file.
// The static page JSON already resolves the glyph field into a single `glyph`
// property per word, so the reader never chooses a glyph column at all.
//
// See ADR 0033.

export type MushafEdition = {
  id: number;
  /** Human label; also the key for the settings toggle copy. */
  name: string;
  /** CSS font-family for a given page of this edition. */
  fontFamily: (page: number) => string;
  /** URL of the per-page font file for this edition. */
  fontUrl: (page: number) => string;
  /** Static per-page content JSON for this edition. */
  pageJsonUrl: (page: number) => string;
  pagesCount: number;
  linesPerPage: number;
  /**
   * COLRv1 color-glyph fonts need CSS `@font-palette-values` (no FontFace-API
   * equivalent), so they take the keyed-`<style>` path in FontFaceInjector
   * instead of the immutable FontFace registry. See ADR 0029 and ADR 0023.
   */
  usesColorGlyphs: boolean;
};

export const DEFAULT_MUSHAF_ID = 2;
export const TAJWEED_MUSHAF_ID = 19;

export const MUSHAF_EDITIONS: Record<number, MushafEdition> = {
  [DEFAULT_MUSHAF_ID]: {
    id: DEFAULT_MUSHAF_ID,
    name: "QCF V1",
    fontFamily: (page) => `quran-p${page}`,
    fontUrl: (page) => `/fonts/v1/woff2/p${page}.woff2`,
    pageJsonUrl: (page) => `/quran/pages/${DEFAULT_MUSHAF_ID}/${page}.json`,
    pagesCount: 604,
    linesPerPage: 15,
    usesColorGlyphs: false,
  },
  [TAJWEED_MUSHAF_ID]: {
    id: TAJWEED_MUSHAF_ID,
    name: "QCF V4 Tajweed",
    fontFamily: (page) => `quran-p${page}-tajweed`,
    fontUrl: (page) => `/fonts/v4/colrv1/woff2/p${page}.woff2`,
    pageJsonUrl: (page) => `/quran/pages/${TAJWEED_MUSHAF_ID}/${page}.json`,
    pagesCount: 604,
    linesPerPage: 15,
    usesColorGlyphs: true,
  },
};

/** Every edition with seeded word placement, in display order. */
export const MUSHAF_EDITION_IDS = [DEFAULT_MUSHAF_ID, TAJWEED_MUSHAF_ID];

/**
 * Resolves an edition, falling back to the default for an unknown id rather than
 * throwing — the id can come from persisted `localStorage` written by an older
 * build, and an unreadable mushaf is a worse outcome than the default one.
 */
export const getMushafEdition = (mushafId: number): MushafEdition =>
  MUSHAF_EDITIONS[mushafId] ?? MUSHAF_EDITIONS[DEFAULT_MUSHAF_ID];

export const isTajweedEdition = (mushafId: number): boolean =>
  mushafId === TAJWEED_MUSHAF_ID;
