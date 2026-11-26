import fs from "fs/promises";
import path from "path";
import type {
  PageMetadataWithChapter,
  RubWithVerses,
  WordWithVerse,
} from "@/app/types/prisma";
import {
  MUSHAF_EDITION_IDS,
  MUSHAF_EDITIONS,
  type MushafEdition,
} from "@/app/utils/mushaf-editions";

const QURAN_DIR = path.join(process.cwd(), "public/quran");

export const TOTAL_VERSES = 6236;
export const TOTAL_RUBS = 240;
export const RUBS_PER_HIZB = 4;
export const RUBS_PER_JUZ = 8;

export type StaticVerse = {
  id: number;
  verse_number: number;
  chapter_id: number;
  page_number: number;
  juz_number: number;
  hizb_number: number;
  rub_el_hizb_number: number;
  text_uthmani: string;
  words_uthmani_hafs: string;
};

export type StaticPageBounds = {
  firstVerseKey: string;
  lastVerseKey: string;
  lastChapterId: number;
  verses: string[];
};

export type StaticRub = RubWithVerses & {
  endVerse: {
    verse_key: string;
    chapter_id: number;
    page_number: number;
  };
};

export type StaticPageData = {
  lines: Record<string, Array<WordWithVerse>>;
  pageMetadata: PageMetadataWithChapter;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStaticRubArray(value: unknown): value is StaticRub[] {
  return (
    Array.isArray(value) &&
    value.length === TOTAL_RUBS &&
    value.every(
      (r, idx) =>
        isRecord(r) &&
        r.rub_number === idx + 1 &&
        isRecord(r.startVerse) &&
        typeof r.startVerse.verse_key === "string" &&
        typeof r.startVerse.page_number === "number" &&
        isRecord(r.endVerse) &&
        typeof r.endVerse.verse_key === "string" &&
        typeof r.endVerse.chapter_id === "number" &&
        typeof r.endVerse.page_number === "number" &&
        Array.isArray(r.rubVerseMappings),
    )
  );
}

function isStaticVersesMap(value: unknown): value is Record<string, StaticVerse> {
  return (
    isRecord(value) &&
    Object.keys(value).length === TOTAL_VERSES &&
    isRecord(value["1:1"]) &&
    typeof value["1:1"].words_uthmani_hafs === "string"
  );
}

function createEditionPageBoundsValidator(expectedPages: number) {
  return (value: unknown): value is Record<string, StaticPageBounds> =>
    isRecord(value) &&
    Object.keys(value).length === expectedPages &&
    isRecord(value["1"]) &&
    typeof value["1"].firstVerseKey === "string";
}

function isStaticVersePagesMap(value: unknown): value is Record<string, number> {
  return (
    isRecord(value) &&
    Object.keys(value).length === TOTAL_VERSES &&
    typeof value["1:1"] === "number"
  );
}

function createPageDataValidator(mushafId: number, page: number) {
  return (value: unknown): value is StaticPageData =>
    isRecord(value) &&
    isRecord(value.lines) &&
    isRecord(value.pageMetadata) &&
    value.pageMetadata.mushaf_id === mushafId &&
    value.pageMetadata.page_number === page;
}

function assertRegisteredEdition(mushafId: number, caller: string): MushafEdition {
  const edition = MUSHAF_EDITIONS[mushafId];
  if (!edition) {
    throw new Error(
      `${caller}: mushaf ${mushafId} is not registered ` +
        `(known editions: ${MUSHAF_EDITION_IDS.join(", ")})`,
    );
  }
  return edition;
}

async function readAndValidate<T>(
  filePath: string,
  validate: (value: unknown) => value is T,
): Promise<T> {
  let parsed: unknown;
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to read ${filePath} — run \`npm run generate:quran\` to regenerate it.`,
      { cause: err },
    );
  }

  if (!validate(parsed)) {
    throw new Error(
      `${filePath} does not match expected schema — regenerate it with \`npm run generate:quran\`.`,
    );
  }

  return parsed;
}

function createSingletonLoader<T>(
  fileName: string,
  validate: (value: unknown) => value is T,
): () => Promise<T> {
  let cachedPromise: Promise<T> | null = null;
  return () => {
    if (!cachedPromise) {
      cachedPromise = readAndValidate(
        path.join(QURAN_DIR, fileName),
        validate,
      ).catch((err) => {
        cachedPromise = null;
        throw err;
      });
    }
    return cachedPromise;
  };
}

function createEditionLoader<T>(
  dirName: string,
  getValidator: (edition: MushafEdition) => (value: unknown) => value is T,
  caller: string,
): (mushafId: number) => Promise<T> {
  const cache = new Map<number, Promise<T>>();
  return async (mushafId: number) => {
    const edition = assertRegisteredEdition(mushafId, caller);
    let cachedPromise = cache.get(mushafId);
    if (!cachedPromise) {
      cachedPromise = readAndValidate(
        path.join(QURAN_DIR, dirName, `${mushafId}.json`),
        getValidator(edition),
      ).catch((err) => {
        cache.delete(mushafId);
        throw err;
      });
      cache.set(mushafId, cachedPromise);
    }
    return cachedPromise;
  };
}

/** Load and module-cache all 240 rub-el-hizb records from `public/quran/rubs.json`. */
export const getStaticRubs = createSingletonLoader("rubs.json", isStaticRubArray);

/** Load and module-cache all 6,236 verses keyed by `verse_key` from `public/quran/verses.json`. */
export const getStaticVerses = createSingletonLoader("verses.json", isStaticVersesMap);

/** Load and module-cache per-edition page bounds from `public/quran/page-bounds/{mushafId}.json`. */
export const getStaticPageBounds = createEditionLoader(
  "page-bounds",
  (edition) => createEditionPageBoundsValidator(edition.pagesCount),
  "getStaticPageBounds",
);

/** Load and module-cache per-edition `verse_key -> page` mappings from `public/quran/verse-pages/{mushafId}.json`. */
export const getStaticVersePages = createEditionLoader(
  "verse-pages",
  () => isStaticVersePagesMap,
  "getStaticVersePages",
);

/**
 * Load a single mushaf page (`{ lines, pageMetadata }`) directly from disk without
 * caching, avoiding retaining 23 MB+ of per-edition pages in Node RAM across SSR/builds.
 */
export async function getStaticPageWords(
  page: number,
  mushafId: number,
): Promise<StaticPageData> {
  const edition = assertRegisteredEdition(mushafId, "getPageWords");
  if (!Number.isInteger(page) || page < 1 || page > edition.pagesCount) {
    throw new Error(`getPageWords: invalid page ${page} for mushaf ${mushafId}`);
  }

  return readAndValidate(
    path.join(QURAN_DIR, "pages", String(mushafId), `${page}.json`),
    createPageDataValidator(mushafId, page),
  );
}
