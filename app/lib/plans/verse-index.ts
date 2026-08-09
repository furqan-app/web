/**
 * Verse-ordinal ↔ page-number resolution for verse-unit plan enrollments
 * (ADR 0037). Pure, synchronous, zero DB calls — built entirely from the
 * already-committed static Quran assets (public/quran/chapters.json,
 * public/quran/verse-pages/2.json — mushaf 2, DEFAULT_MUSHAF_ID), read once
 * and cached at module scope, same convention as app/hooks/get-surahs.ts.
 *
 * A "verse ordinal" is a global 1-based position across the whole Quran in
 * reading order (surah 1 verse 1 = 1, …, surah 114 verse 6 = 6236). It has no
 * relation to any DB row id — it's computed here from chapters.json's
 * verses_count, which is itself ordered by surah number.
 */

import fs from "fs";
import path from "path";

export const MUSHAF_FIRST_VERSE = 1;
export const MUSHAF_LAST_VERSE = 6236;

const CHAPTERS_FILE = path.join(process.cwd(), "public/quran/chapters.json");
const VERSE_PAGES_FILE = path.join(process.cwd(), "public/quran/verse-pages/2.json");

type ChapterMeta = { id: number; verses_count: number };

type VerseIndex = {
  /** 1-based; index 0 unused. */
  ordinalToPage: Int32Array;
  ordinalToVerseKey: string[];
  pageFirstOrdinal: Map<number, number>;
  pageLastOrdinal: Map<number, number>;
};

let cached: VerseIndex | null = null;

const buildIndex = (): VerseIndex => {
  const chapters = JSON.parse(fs.readFileSync(CHAPTERS_FILE, "utf-8")) as ChapterMeta[];
  const versePages = JSON.parse(fs.readFileSync(VERSE_PAGES_FILE, "utf-8")) as Record<
    string,
    number
  >;

  const ordinalToPage = new Int32Array(MUSHAF_LAST_VERSE + 1);
  const ordinalToVerseKey: string[] = new Array(MUSHAF_LAST_VERSE + 1);
  const pageFirstOrdinal = new Map<number, number>();
  const pageLastOrdinal = new Map<number, number>();

  let ordinal = 0;
  for (const chapter of chapters) {
    for (let ayah = 1; ayah <= chapter.verses_count; ayah++) {
      ordinal += 1;
      const verseKey = `${chapter.id}:${ayah}`;
      const page = versePages[verseKey];
      if (!Number.isInteger(page)) {
        throw new Error(`verse-index: no page for ${verseKey} in ${VERSE_PAGES_FILE}`);
      }
      ordinalToPage[ordinal] = page;
      ordinalToVerseKey[ordinal] = verseKey;
      if (!pageFirstOrdinal.has(page)) pageFirstOrdinal.set(page, ordinal);
      pageLastOrdinal.set(page, ordinal); // ordinals ascend, so last write is the max
    }
  }

  if (ordinal !== MUSHAF_LAST_VERSE) {
    throw new Error(
      `verse-index: chapters.json verses_count sums to ${ordinal}, expected ${MUSHAF_LAST_VERSE}`
    );
  }

  return { ordinalToPage, ordinalToVerseKey, pageFirstOrdinal, pageLastOrdinal };
};

const index = (): VerseIndex => {
  if (!cached) cached = buildIndex();
  return cached;
};

const assertOrdinal = (ordinal: number) => {
  if (!Number.isInteger(ordinal) || ordinal < MUSHAF_FIRST_VERSE || ordinal > MUSHAF_LAST_VERSE) {
    throw new Error(`verse-index: ordinal ${ordinal} out of range`);
  }
};

/** The mushaf page a global verse ordinal falls on. */
export const pageOfVerse = (ordinal: number): number => {
  assertOrdinal(ordinal);
  return index().ordinalToPage[ordinal];
};

/** "surah:ayah" for a global verse ordinal — display only. */
export const verseKeyOfOrdinal = (ordinal: number): string => {
  assertOrdinal(ordinal);
  return index().ordinalToVerseKey[ordinal];
};

/** The global verse ordinal of a page's first verse. */
export const pageFirstVerseOrdinal = (page: number): number => {
  const ordinal = index().pageFirstOrdinal.get(page);
  if (ordinal === undefined) throw new Error(`verse-index: unknown page ${page}`);
  return ordinal;
};

/** The global verse ordinal of a page's last verse. */
export const pageLastVerseOrdinal = (page: number): number => {
  const ordinal = index().pageLastOrdinal.get(page);
  if (ordinal === undefined) throw new Error(`verse-index: unknown page ${page}`);
  return ordinal;
};

/** How many verses are on a given page. */
export const pageVerseCount = (page: number): number =>
  pageLastVerseOrdinal(page) - pageFirstVerseOrdinal(page) + 1;
