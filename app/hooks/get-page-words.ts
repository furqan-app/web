import {
  getStaticPageWords,
  type StaticPageData,
} from "@/app/lib/quran/static-data";
import { DEFAULT_MUSHAF_ID } from "@/app/utils/mushaf-editions";

export type PageWords = StaticPageData;

/**
 * A page of one mushaf edition, read directly from `public/quran/pages/{mushafId}/{page}.json`.
 *
 * Each static page JSON carries pre-resolved per-edition `lines` (ordered in
 * document order with resolved `glyph`) and `pageMetadata` (ADR 0033), generated
 * by `scripts/quran-static/generate.js` without querying a Quran database.
 */
export const getPageWords = async (
  page: number,
  mushafId: number = DEFAULT_MUSHAF_ID,
): Promise<PageWords> => {
  return getStaticPageWords(page, mushafId);
};
