#!/usr/bin/env node
/**
 * DB-free static Quran index generator.
 *
 * Fetches chapter, verse/word, and mushaf-layout data directly from the public
 * Quran.com QDC APIs in memory, validates edition layouts and completeness,
 * derives all static JSON artifacts under `public/quran/`, verifies byte-for-byte
 * parity against committed files when requested (`--verify-existing`), and writes
 * outputs via two-phase atomic swap with rollback.
 *
 * Zero Prisma or database imports/dependencies.
 */

const fs = require("fs");
const path = require("path");

const QDC_BASE = "https://api.qurancdn.com/api/qdc";
const TOTAL_PAGES = 604;
const TOTAL_CHAPTERS = 114;
const TOTAL_VERSES = 6236;
const TOTAL_RUBS = 240;
const LINES_PER_PAGE = 15;
const DEFAULT_TIMEOUT_MS = 30000;

// Keep ADR 0066 mushaf roles distinct: `DEFAULT_MUSHAF_ID` is only the reader
// reference, whereas `SEEDED_WORDS_MUSHAF_ID` (`2`) feeds canonical Word/Verse
// page numbers and the seeded-edition layout shortcut.
const DEFAULT_MUSHAF_ID = 1;
const QCF_V2_MUSHAF_ID = 1;
const TAJWEED_MUSHAF_ID = 19;
const SEEDED_WORDS_MUSHAF_ID = 2;
const LAYOUT_MUSHAF_IDS = [
  QCF_V2_MUSHAF_ID,
  SEEDED_WORDS_MUSHAF_ID,
  TAJWEED_MUSHAF_ID,
];

const PAGE_METADATA_ID_OFFSET = {
  [SEEDED_WORDS_MUSHAF_ID]: 0,
  [TAJWEED_MUSHAF_ID]: 604,
  [QCF_V2_MUSHAF_ID]: 1208,
};
const GLYPH_FIELD_BY_MUSHAF = {
  [QCF_V2_MUSHAF_ID]: "code_v2",
  [SEEDED_WORDS_MUSHAF_ID]: "code_v1",
  [TAJWEED_MUSHAF_ID]: "code_v2",
};
const HIZB_POSITION_MAP = {
  0: "hizb",
  1: "hizb-quarter",
  2: "hizb-half",
  3: "hizb-three-quarters",
};
const DEFAULT_CONCURRENCY = 12;
const ALL_TARGETS = [
  "chapters",
  "juz-starts",
  "search-index",
  "pages",
  "verse-pages",
  "page-bounds",
  "rubs",
  "verses",
  "words",
];
const VERSE_WORDS_PARAMS = {
  words: "true",
  per_page: "all",
  fields: "text_uthmani,chapter_id,hizb_number,text_imlaei_simple",
  reciter: "7",
  word_fields:
    "verse_key,verse_id,page_number,location,text_uthmani,code_v1,code_v2,qpc_uthmani_hafs",
  mushaf: String(SEEDED_WORDS_MUSHAF_ID),
  filter_page_words: "true",
};

/**
 * Sleep helper used for HTTP retry backoff.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch JSON from `url` with bounded retries, per-request timeout, and linear backoff.
 * @param {string} url
 * @param {{ retries?: number, fetchImpl?: typeof fetch, backoffMs?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<any>}
 */
async function fetchJsonWithRetry(url, opts = {}) {
  const {
    retries = 3,
    fetchImpl = fetch,
    backoffMs = 1000,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts;
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fetchOpts =
        timeoutMs > 0 ? { signal: AbortSignal.timeout(timeoutMs) } : undefined;
      const res = await fetchImpl(url, fetchOpts);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(backoffMs * attempt);
      }
    }
  }
  throw lastError;
}

/**
 * Run `worker` over `items` with bounded concurrency, preserving item order.
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

/**
 * Fetch and validate all 114 chapters from QDC.
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, expectedChapters?: number | null }} [opts]
 * @returns {Promise<Array<object>>}
 */
async function fetchChaptersFromQdc(opts = {}) {
  const { expectedChapters = TOTAL_CHAPTERS, ...fetchOpts } = opts;
  const url = `${QDC_BASE}/chapters?language=en`;
  const data = await fetchJsonWithRetry(url, fetchOpts);
  if (!data || !Array.isArray(data.chapters) || data.chapters.length === 0) {
    throw new Error("QDC /chapters response missing non-empty `chapters` array");
  }
  if (expectedChapters !== null && data.chapters.length !== expectedChapters) {
    throw new Error(
      `Expected ${expectedChapters} chapters from QDC, got ${data.chapters.length}`
    );
  }
  return data.chapters
    .map((c) => ({
      id: c.id,
      chapter_number: c.id,
      bismillah_pre: Boolean(c.bismillah_pre),
      revelation_order: c.revelation_order,
      revelation_place: c.revelation_place,
      name_complex: c.name_complex,
      name_arabic: c.name_arabic,
      name_simple: c.name_simple,
      verses_count: c.verses_count,
      pages: Array.isArray(c.pages) ? `${c.pages[0]}-${c.pages[1]}` : c.pages,
      translated_name: c.translated_name?.name || c.name_simple,
    }))
    .sort((a, b) => a.id - b.id);
}

/**
 * Rewrite QDC word `audio_url` trailing number to match its `position` ordinal
 * (ADR 0009 Addendum 2026-07-15).
 * @param {string} audioUrl
 * @param {number} position
 * @returns {string}
 */
function correctAudioUrl(audioUrl, position) {
  return audioUrl.replace(/\d+(\.mp3)$/, `${String(position).padStart(3, "0")}$1`);
}

/**
 * Normalize QDC word `audio_url` using `correctAudioUrl(word.audio_url, word.position)`.
 * Preserves null/missing URLs on pause/end glyphs or silent tokens.
 * @param {{ char_type_name: string, audio_url?: string | null, position: number }} word
 * @returns {string | null}
 */
function normalizeAudioUrl(word) {
  if (word.char_type_name !== "word" || !word.audio_url) {
    return word.audio_url ?? null;
  }
  return correctAudioUrl(word.audio_url, word.position);
}

/**
 * Fetch all canonical verses, words (`SEEDED_WORDS_MUSHAF_ID`), and default layouts across 604 pages.
 * @param {{ concurrency?: number, totalPages?: number, fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<{ verses: Array<object>, words: Array<object>, defaultLayouts: Array<object> }>}
 */
async function fetchVersesAndWordsFromQdc(opts = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    totalPages = TOTAL_PAGES,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const qs = new URLSearchParams(VERSE_WORDS_PARAMS).toString();

  const pagePayloads = await mapWithConcurrency(
    pageNumbers,
    concurrency,
    (page) =>
      fetchJsonWithRetry(`${QDC_BASE}/verses/by_page/${page}?${qs}`, {
        fetchImpl,
        timeoutMs,
      })
  );

  const verseById = new Map();
  const wordById = new Map();
  const seenWordIds = new Set();
  const defaultLayouts = [];

  for (let idx = 0; idx < pagePayloads.length; idx++) {
    const page = pageNumbers[idx];
    const payload = pagePayloads[idx];
    for (const v of payload.verses || []) {
      if (!verseById.has(v.id)) {
        verseById.set(v.id, {
          id: v.id,
          verse_number: v.verse_number,
          verse_key: v.verse_key,
          chapter_id: v.chapter_id,
          page_number: v.page_number,
          juz_number: v.juz_number,
          hizb_number: v.hizb_number,
          rub_el_hizb_number: v.rub_el_hizb_number,
          text_uthmani: v.text_uthmani,
          text_imlaei_simple: v.text_imlaei_simple,
        });
      }

      for (const w of v.words || []) {
        if (seenWordIds.has(w.id)) {
          throw new Error(
            `mushaf=${SEEDED_WORDS_MUSHAF_ID}: word id ${w.id} appears on more than one page`
          );
        }
        seenWordIds.add(w.id);

        wordById.set(w.id, {
          id: w.id,
          position: w.position,
          verse_id: w.verse_id,
          verse_key: w.verse_key,
          location: w.location,
          text_uthmani: w.text_uthmani,
          qpc_uthmani_hafs: w.qpc_uthmani_hafs,
          code_v1: w.code_v1 ?? null,
          code_v2: w.code_v2 ?? null,
          audio_url: normalizeAudioUrl(w),
          char_type_name: w.char_type_name,
          page_number: w.page_number ?? page,
          line_number: w.line_number,
        });

        defaultLayouts.push({
          word_id: w.id,
          page_number: page,
          line_number: w.line_number,
        });
      }
    }
  }

  const verses = Array.from(verseById.values()).sort((a, b) => a.id - b.id);
  const words = Array.from(wordById.values()).sort(
    (a, b) => a.verse_id - b.verse_id || a.position - b.position
  );

  if (totalPages === TOTAL_PAGES && verses.length !== TOTAL_VERSES) {
    throw new Error(
      `Expected ${TOTAL_VERSES} verses from QDC, got ${verses.length}`
    );
  }

  validateLayouts(
    SEEDED_WORDS_MUSHAF_ID,
    defaultLayouts,
    wordById.size,
    totalPages
  );
  return { verses, words, defaultLayouts };
}

/**
 * Validate layout rows cover all pages cleanly, lines stay within 1..15,
 * distinct lines per page <= 15, line_number never decreases mid-page (#155 guard),
 * and word counts match.
 * @param {number} mushafId
 * @param {Array<{ word_id: number, page_number: number, line_number: number }>} rows
 * @param {number} expectedWordCount
 * @param {number} [totalPages]
 */
function validateLayouts(
  mushafId,
  rows,
  expectedWordCount,
  totalPages = TOTAL_PAGES
) {
  const byPage = new Map();
  for (const row of rows) {
    if (
      !Number.isInteger(row.page_number) ||
      row.page_number < 1 ||
      row.page_number > totalPages
    ) {
      throw new Error(
        `Invalid page_number ${row.page_number} for mushaf ${mushafId}`
      );
    }
    if (!byPage.has(row.page_number)) {
      byPage.set(row.page_number, []);
    }
    byPage.get(row.page_number).push(row);
  }

  for (const [page, pageRows] of byPage.entries()) {
    const lines = pageRows.map((r) => r.line_number);
    const invalidLines = lines.filter(
      (l) => !Number.isInteger(l) || l < 1 || l > LINES_PER_PAGE
    );
    if (invalidLines.length > 0) {
      throw new Error(
        `mushaf=${mushafId} page ${page}: line_number out of 1–${LINES_PER_PAGE} range (${invalidLines.slice(0, 5).join(", ")})`
      );
    }

    const distinct = new Set(lines);
    if (distinct.size > LINES_PER_PAGE) {
      throw new Error(
        `mushaf=${mushafId} page ${page}: ${distinct.size} distinct lines, max ${LINES_PER_PAGE}`
      );
    }

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] < lines[i - 1]) {
        throw new Error(
          `mushaf=${mushafId} page ${page}: line_number decreases mid-page ` +
            `(${lines[i - 1]} -> ${lines[i]} at word_id ${pageRows[i].word_id})`
        );
      }
    }
  }

  if (byPage.size !== totalPages) {
    throw new Error(
      `Expected ${totalPages} pages for mushaf ${mushafId}, got ${byPage.size}`
    );
  }
  if (rows.length !== expectedWordCount) {
    throw new Error(
      `Expected ${expectedWordCount} placement words for mushaf ${mushafId}, got ${rows.length}`
    );
  }
}

/**
 * Fetch placement layout rows `(word_id, page_number, line_number)` for one mushaf edition,
 * asserting exact word-id set parity and page/line ordering invariants.
 * @param {number} mushafId
 * @param {Set<number> | number} expectedWordIdsOrCount
 * @param {{ concurrency?: number, totalPages?: number, fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<Array<{ word_id: number, page_number: number, line_number: number }>>}
 */
async function fetchMushafLayoutFromQdc(
  mushafId,
  expectedWordIdsOrCount,
  opts = {}
) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    totalPages = TOTAL_PAGES,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const qs = new URLSearchParams({
    words: "true",
    per_page: "all",
    mushaf: String(mushafId),
    filter_page_words: "true",
    word_fields: "line_number,page_number",
  }).toString();

  const pagePayloads = await mapWithConcurrency(
    pageNumbers,
    concurrency,
    (page) =>
      fetchJsonWithRetry(`${QDC_BASE}/verses/by_page/${page}?${qs}`, {
        fetchImpl,
        timeoutMs,
      })
  );

  const rows = [];
  const seen = new Set();
  for (let idx = 0; idx < pagePayloads.length; idx++) {
    const page = pageNumbers[idx];
    const payload = pagePayloads[idx];
    for (const v of payload.verses || []) {
      for (const w of v.words || []) {
        if (seen.has(w.id)) {
          throw new Error(
            `mushaf=${mushafId}: word id ${w.id} appears on more than one page`
          );
        }
        seen.add(w.id);
        rows.push({
          word_id: w.id,
          page_number: page,
          line_number: w.line_number,
        });
      }
    }
  }

  let expectedWordCount = expectedWordIdsOrCount;
  if (expectedWordIdsOrCount instanceof Set) {
    const missing = [];
    for (const id of expectedWordIdsOrCount) {
      if (!seen.has(id)) missing.push(id);
    }
    if (missing.length > 0) {
      throw new Error(
        `mushaf=${mushafId}: ${missing.length} seeded word(s) missing placement. First few: ${missing.slice(0, 20).join(", ")}`
      );
    }
    const unexpected = [];
    for (const id of seen) {
      if (!expectedWordIdsOrCount.has(id)) unexpected.push(id);
    }
    if (unexpected.length > 0) {
      throw new Error(
        `mushaf=${mushafId}: ${unexpected.length} unexpected word(s) not in seeded canon. First few: ${unexpected.slice(0, 20).join(", ")}`
      );
    }
    expectedWordCount = expectedWordIdsOrCount.size;
  }

  validateLayouts(mushafId, rows, expectedWordCount, totalPages);
  return rows;
}

/**
 * Derive all 240 rub-el-hizb records and their contiguous chapter verse mappings.
 * Uses integer verse IDs for `verse_mapping_start` / `verse_mapping_end` to match
 * the Prisma `Rub` schema and `RubWithVerses`.
 * @param {Array<object>} versesSorted
 * @returns {Array<{
 *   id: number,
 *   rub_number: number,
 *   verse_mapping_start: number,
 *   verse_mapping_end: number,
 *   verses_count: number,
 *   start_verse_id: number,
 *   end_verse_id: number,
 *   mappings: Array<{ id: number, rub_number: number, chapter_number: number, start_verse: number, end_verse: number }>
 * }>}
 */
function deriveRubsFromVerses(versesSorted) {
  const groups = new Map();
  for (const v of versesSorted) {
    const rubNum = v.rub_el_hizb_number;
    if (!groups.has(rubNum)) {
      groups.set(rubNum, []);
    }
    groups.get(rubNum).push(v);
  }

  const rubNumbers = Array.from(groups.keys()).sort((a, b) => a - b);
  let nextMappingId = 1;
  const rubs = [];

  for (const rubNum of rubNumbers) {
    const groupVerses = groups.get(rubNum);
    const first = groupVerses[0];
    const last = groupVerses[groupVerses.length - 1];

    const byChapter = new Map();
    for (const v of groupVerses) {
      if (!byChapter.has(v.chapter_id)) {
        byChapter.set(v.chapter_id, {
          start_verse: v.verse_number,
          end_verse: v.verse_number,
        });
      } else {
        const entry = byChapter.get(v.chapter_id);
        entry.start_verse = Math.min(entry.start_verse, v.verse_number);
        entry.end_verse = Math.max(entry.end_verse, v.verse_number);
      }
    }

    const chapterNumbers = Array.from(byChapter.keys()).sort((a, b) => a - b);
    const mappings = chapterNumbers.map((chapterNum) => {
      const span = byChapter.get(chapterNum);
      return {
        id: nextMappingId++,
        rub_number: rubNum,
        chapter_number: chapterNum,
        start_verse: span.start_verse,
        end_verse: span.end_verse,
      };
    });

    rubs.push({
      id: rubNum,
      rub_number: rubNum,
      verse_mapping_start: first.id,
      verse_mapping_end: last.id,
      verses_count: groupVerses.length,
      start_verse_id: first.id,
      end_verse_id: last.id,
      mappings,
    });
  }

  if (versesSorted.length === TOTAL_VERSES && rubs.length !== TOTAL_RUBS) {
    throw new Error(`Expected ${TOTAL_RUBS} rubs, got ${rubs.length}`);
  }

  return rubs;
}

/**
 * Derive page metadata (`surah_id`, `page_surahs`, `juz_number`, `hizb_number`, `hizb_position`)
 * for a single mushaf page from its ordered words.
 * @param {{
 *   mushafId: number,
 *   page: number,
 *   pageWords: Array<{ word: object, verse: object, chapter: object }>,
 *   rubStartPageByRubNum: Map<number, number>
 * }} input
 * @returns {object}
 */
function deriveSinglePageMetadata({
  mushafId,
  page,
  pageWords,
  rubStartPageByRubNum,
}) {
  const seenSurahs = [];
  const surahSet = new Set();
  let startingSurah = null;

  for (const { verse } of pageWords) {
    if (!surahSet.has(verse.chapter_id)) {
      surahSet.add(verse.chapter_id);
      seenSurahs.push(verse.chapter_id);
    }
    if (startingSurah === null && verse.verse_number === 1) {
      startingSurah = verse.chapter_id;
    }
  }

  const primarySurahId = startingSurah ?? seenSurahs[0];
  const lastVerse = pageWords[pageWords.length - 1].verse;

  let hizbPosition = null;
  for (const [rubNum, startPage] of rubStartPageByRubNum.entries()) {
    if (startPage === page) {
      hizbPosition = HIZB_POSITION_MAP[(rubNum - 1) % 4];
      break;
    }
  }

  const primaryChapter = pageWords.find(
    ({ verse }) => verse.chapter_id === primarySurahId
  ).chapter;

  return {
    id: (PAGE_METADATA_ID_OFFSET[mushafId] ?? 0) + page,
    mushaf_id: mushafId,
    page_number: page,
    surah_id: primarySurahId,
    page_surahs: seenSurahs.join("-"),
    juz_number: lastVerse.juz_number,
    hizb_number: lastVerse.hizb_number,
    hizb_position: hizbPosition,
    chapter: primaryChapter,
  };
}

/**
 * Determine which targets are requested by CLI/caller options.
 * @param {string | string[] | undefined} only
 * @returns {Set<string>}
 */
function resolveTargetSet(only) {
  if (!only || only === "all") {
    return new Set(ALL_TARGETS);
  }
  const rawList = Array.isArray(only) ? only : String(only).split(",");
  const normalized = rawList.map((s) => s.trim()).filter(Boolean);
  if (normalized.includes("all")) {
    return new Set(ALL_TARGETS);
  }

  const result = new Set();
  for (const t of normalized) {
    if (!ALL_TARGETS.includes(t)) {
      throw new Error(
        `Unknown --only target "${t}". Valid targets: all, ${ALL_TARGETS.join(", ")}`
      );
    }
    result.add(t);
    if (t === "pages") {
      // Historically `generate:quran-json` wrote both `pages/` and `verse-pages/`.
      result.add("verse-pages");
    }
  }
  return result;
}

/**
 * Build `chapters.json` serialized content.
 * @param {Array<object>} chapters
 * @returns {string}
 */
function buildChaptersJson(chapters) {
  const out = [...chapters]
    .sort((a, b) => a.id - b.id)
    .map((c) => ({
      id: c.id,
      name_arabic: c.name_arabic,
      name_simple: c.name_simple,
      verses_count: c.verses_count,
      revelation_place: c.revelation_place,
      pages: c.pages,
    }));
  return JSON.stringify(out);
}

/**
 * Build `juz-starts.json` serialized content (no trailing newline to match committed bytes).
 * @param {Array<object>} versesSorted
 * @returns {string}
 */
function buildJuzStartsJson(versesSorted) {
  const byJuz = new Map();
  for (const v of versesSorted) {
    if (!byJuz.has(v.juz_number)) {
      byJuz.set(v.juz_number, {
        juz: v.juz_number,
        verse_key: v.verse_key,
        defaultPage: v.page_number,
      });
    }
  }
  const juzStarts = Array.from(byJuz.values()).sort((a, b) => a.juz - b.juz);
  return JSON.stringify(juzStarts);
}

/**
 * Build `search-index.json` serialized content.
 * @param {Array<object>} versesSorted
 * @param {Map<number, Array<object>>} wordsByVerseId
 * @returns {string}
 */
function buildSearchIndexJson(versesSorted, wordsByVerseId) {
  const searchIndex = versesSorted.map((v) => {
    const vWords = wordsByVerseId.get(v.id) || [];
    return {
      k: v.verse_key,
      t: v.text_imlaei_simple,
      d: vWords.map((w) => w.qpc_uthmani_hafs).join(" "),
      c: v.chapter_id,
    };
  });
  return JSON.stringify(searchIndex);
}

/**
 * Build `verses.json` serialized content.
 * @param {Array<object>} versesSorted
 * @param {Map<number, Array<object>>} wordsByVerseId
 * @returns {string}
 */
function buildVersesJson(versesSorted, wordsByVerseId) {
  const versesMap = {};
  for (const v of versesSorted) {
    const vWords = wordsByVerseId.get(v.id) || [];
    versesMap[v.verse_key] = {
      id: v.id,
      verse_number: v.verse_number,
      chapter_id: v.chapter_id,
      page_number: v.page_number,
      juz_number: v.juz_number,
      hizb_number: v.hizb_number,
      rub_el_hizb_number: v.rub_el_hizb_number,
      text_uthmani: v.text_uthmani,
      words_uthmani_hafs: vWords
        .filter((w) => w.char_type_name === "word")
        .map((w) => w.qpc_uthmani_hafs)
        .join(" "),
    };
  }
  return JSON.stringify(versesMap);
}

/**
 * Build `words.json` serialized content (`word.location` -> `{ u, h }` for word tokens).
 * @param {Array<object>} wordsSorted
 * @returns {string}
 */
function buildWordsJson(wordsSorted) {
  const wordsMap = {};
  for (const w of wordsSorted) {
    if (w.char_type_name === "word") {
      wordsMap[w.location] = {
        u: w.text_uthmani,
        h: w.qpc_uthmani_hafs,
      };
    }
  }
  return JSON.stringify(wordsMap);
}

/**
 * Build `rubs.json` serialized content (`RubWithVerses`-compatible array).
 * @param {Array<object>} rubs
 * @param {Map<number, object>} verseById
 * @param {Map<number, Array<object>>} wordsByVerseId
 * @returns {string}
 */
function buildRubsJson(rubs, verseById, wordsByVerseId) {
  const rubsJson = rubs.map((rub) => {
    const startVerse = verseById.get(rub.start_verse_id);
    const endVerse = verseById.get(rub.end_verse_id);
    const startWords = wordsByVerseId.get(rub.start_verse_id) || [];
    return {
      id: rub.id,
      rub_number: rub.rub_number,
      verse_mapping_start: rub.verse_mapping_start,
      verse_mapping_end: rub.verse_mapping_end,
      verses_count: rub.verses_count,
      rubVerseMappings: rub.mappings,
      startVerse: {
        verse_key: startVerse.verse_key,
        page_number: startVerse.page_number,
        Word: startWords.map((w) => ({
          qpc_uthmani_hafs: w.qpc_uthmani_hafs,
          char_type_name: w.char_type_name,
        })),
      },
      endVerse: {
        verse_key: endVerse.verse_key,
        chapter_id: endVerse.chapter_id,
        page_number: endVerse.page_number,
      },
    };
  });
  return JSON.stringify(rubsJson);
}

/**
 * Build edition-scoped artifacts (`verse-pages/{id}.json`, `page-bounds/{id}.json`,
 * `pages/{id}/{page}.json`) for a single mushaf edition into `artifacts`.
 * @param {{
 *   mushafId: number,
 *   layoutRows: Array<{ word_id: number, page_number: number, line_number: number }>,
 *   wordById: Map<number, object>,
 *   verseById: Map<number, object>,
 *   chapterById: Map<number, object>,
 *   rubs: Array<object>,
 *   targets: Set<string>,
 *   artifacts: Map<string, string>
 * }} input
 */
function buildEditionArtifacts({
  mushafId,
  layoutRows,
  wordById,
  verseById,
  chapterById,
  rubs,
  targets,
  artifacts,
}) {
  const glyphField = GLYPH_FIELD_BY_MUSHAF[mushafId] || "code_v1";
  const rows = [...layoutRows]
    .map((row) => {
      const word = wordById.get(row.word_id);
      const verse = verseById.get(word.verse_id);
      const chapter = chapterById.get(verse.chapter_id);
      return { row, word, verse, chapter };
    })
    .sort(
      (a, b) =>
        a.word.verse_id - b.word.verse_id || a.word.position - b.word.position
    );

  const verseToPage = {};
  const byPage = new Map();
  for (const entry of rows) {
    const page = entry.row.page_number;
    if (verseToPage[entry.word.verse_key] === undefined) {
      verseToPage[entry.word.verse_key] = page;
    }
    if (!byPage.has(page)) {
      byPage.set(page, []);
    }
    byPage.get(page).push(entry);
  }

  if (targets.has("verse-pages")) {
    artifacts.set(
      `verse-pages/${mushafId}.json`,
      JSON.stringify(verseToPage)
    );
  }

  const rubStartPageByRubNum = new Map();
  if (targets.has("pages")) {
    for (const rub of rubs) {
      const startVerse = verseById.get(rub.start_verse_id);
      const startPage = startVerse ? verseToPage[startVerse.verse_key] : undefined;
      if (startPage !== undefined) {
        rubStartPageByRubNum.set(rub.rub_number, startPage);
      }
    }
  }

  const pageBounds = {};
  const sortedPages = Array.from(byPage.keys()).sort((a, b) => a - b);

  for (const page of sortedPages) {
    const pageEntries = byPage.get(page);

    if (targets.has("page-bounds")) {
      const versesOnPage = [];
      const seenKeys = new Set();
      for (const { verse } of pageEntries) {
        if (!seenKeys.has(verse.verse_key)) {
          seenKeys.add(verse.verse_key);
          versesOnPage.push(verse.verse_key);
        }
      }
      const lastEntry = pageEntries[pageEntries.length - 1];
      pageBounds[String(page)] = {
        firstVerseKey: versesOnPage[0],
        lastVerseKey: versesOnPage[versesOnPage.length - 1],
        lastChapterId: lastEntry.verse.chapter_id,
        verses: versesOnPage,
      };
    }

    if (targets.has("pages")) {
      const lines = {};
      const sortedForLines = [...pageEntries].sort(
        (a, b) =>
          a.row.line_number - b.row.line_number ||
          a.word.verse_id - b.word.verse_id ||
          a.word.position - b.word.position
      );
      for (const { row, word, verse, chapter } of sortedForLines) {
        const lineKey = String(row.line_number);
        if (!lines[lineKey]) {
          lines[lineKey] = [];
        }
        lines[lineKey].push({
          audio_url: word.audio_url,
          verse_key: word.verse_key,
          location: word.location,
          qpc_uthmani_hafs: word.qpc_uthmani_hafs,
          char_type_name: word.char_type_name,
          page_number: word.page_number,
          verse: {
            verse_key: verse.verse_key,
            page_number: verse.page_number,
            chapter: {
              verses_count: chapter.verses_count,
            },
          },
          glyph: word[glyphField] ?? word.code_v1 ?? word.text_uthmani,
          line_number: row.line_number,
        });
      }

      const pageMetadata = deriveSinglePageMetadata({
        mushafId,
        page,
        pageWords: pageEntries,
        rubStartPageByRubNum,
      });

      artifacts.set(
        `pages/${mushafId}/${page}.json`,
        JSON.stringify({ lines, pageMetadata })
      );
    }
  }

  if (targets.has("page-bounds")) {
    artifacts.set(
      `page-bounds/${mushafId}.json`,
      JSON.stringify(pageBounds)
    );
  }
}

/**
 * Pure artifact builder: converts normalized QDC datasets into a Map of
 * `<relativePath under public/quran/> -> JSON string`.
 * @param {{
 *   chapters?: Array<object>,
 *   verses?: Array<object>,
 *   words?: Array<object>,
 *   layoutsByMushaf?: Record<number, Array<{ word_id: number, page_number: number, line_number: number }>>,
 *   targets?: Set<string>
 * }} data
 * @returns {Map<string, string>}
 */
function buildStaticArtifacts({
  chapters = [],
  verses = [],
  words = [],
  layoutsByMushaf = {},
  targets = new Set(ALL_TARGETS),
}) {
  const artifacts = new Map();
  const versesSorted = [...verses].sort((a, b) => a.id - b.id);
  const wordsSorted = [...words].sort(
    (a, b) => a.verse_id - b.verse_id || a.position - b.position
  );

  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const verseById = new Map(versesSorted.map((v) => [v.id, v]));
  const wordById = new Map(wordsSorted.map((w) => [w.id, w]));

  const wordsByVerseId = new Map();
  for (const w of wordsSorted) {
    if (!wordsByVerseId.has(w.verse_id)) {
      wordsByVerseId.set(w.verse_id, []);
    }
    wordsByVerseId.get(w.verse_id).push(w);
  }

  if (targets.has("chapters")) {
    artifacts.set("chapters.json", buildChaptersJson(chapters));
  }
  if (targets.has("juz-starts")) {
    artifacts.set("juz-starts.json", buildJuzStartsJson(versesSorted));
  }
  if (targets.has("search-index")) {
    artifacts.set(
      "search-index.json",
      buildSearchIndexJson(versesSorted, wordsByVerseId)
    );
  }
  if (targets.has("verses")) {
    artifacts.set("verses.json", buildVersesJson(versesSorted, wordsByVerseId));
  }
  if (targets.has("words")) {
    artifacts.set("words.json", buildWordsJson(wordsSorted));
  }

  const rubs =
    targets.has("rubs") || targets.has("pages")
      ? deriveRubsFromVerses(versesSorted)
      : [];

  if (targets.has("rubs")) {
    artifacts.set("rubs.json", buildRubsJson(rubs, verseById, wordsByVerseId));
  }

  if (
    targets.has("pages") ||
    targets.has("verse-pages") ||
    targets.has("page-bounds")
  ) {
    const mushafIds = Object.keys(layoutsByMushaf)
      .map(Number)
      .sort((a, b) => a - b);

    for (const mushafId of mushafIds) {
      buildEditionArtifacts({
        mushafId,
        layoutRows: layoutsByMushaf[mushafId] || [],
        wordById,
        verseById,
        chapterById,
        rubs,
        targets,
        artifacts,
      });
    }
  }

  return artifacts;
}

/**
 * Determine whether a relative path under `public/quran/` belongs to the
 * previously committed static index set (which must stay byte-for-byte identical).
 * @param {string} relPath
 * @returns {boolean}
 */
function isExistingArtifactPath(relPath) {
  return (
    relPath === "chapters.json" ||
    relPath === "juz-starts.json" ||
    relPath === "search-index.json" ||
    relPath.startsWith("verse-pages/") ||
    relPath.startsWith("pages/")
  );
}

/**
 * Verify all existing artifacts in `outputDir` match the generated bytes exactly.
 * Does not mutate any file. Throws with detailed mismatch info on any diff/missing file.
 * @param {Map<string, string>} artifacts
 * @param {string} outputDir
 * @returns {{ verifiedCount: number, newFiles: Map<string, string> }}
 */
function verifyExistingArtifacts(artifacts, outputDir) {
  const mismatches = [];
  const missing = [];
  const newFiles = new Map();
  let verifiedCount = 0;

  for (const [relPath, content] of artifacts.entries()) {
    const fullPath = path.join(outputDir, relPath);
    if (isExistingArtifactPath(relPath)) {
      if (!fs.existsSync(fullPath)) {
        missing.push(relPath);
        continue;
      }
      const onDisk = fs.readFileSync(fullPath);
      const expected = Buffer.from(content, "utf8");
      if (Buffer.compare(onDisk, expected) !== 0) {
        mismatches.push(
          `${relPath} (disk=${onDisk.length}B, generated=${expected.length}B)`
        );
        continue;
      }
      verifiedCount++;
    } else {
      newFiles.set(relPath, content);
    }
  }

  if (missing.length > 0 || mismatches.length > 0) {
    const parts = [];
    if (missing.length > 0) {
      parts.push(
        `Missing existing files (${missing.length}): ${missing.slice(0, 10).join(", ")}`
      );
    }
    if (mismatches.length > 0) {
      parts.push(
        `Byte mismatches (${mismatches.length}): ${mismatches.slice(0, 10).join(", ")}`
      );
    }
    throw new Error(`--verify-existing failed: ${parts.join("; ")}`);
  }

  return { verifiedCount, newFiles };
}

/**
 * Two-phase atomic batch writer:
 * 1) Stage all `.tmp-*` files before touching any destination.
 * 2) Rename staged files into place while tracking pre-existing backups so any
 *    mid-batch failure rolls back already-swapped destinations and removes temps.
 * @param {Map<string, string>} artifacts
 * @param {string} outputDir
 * @param {Partial<typeof fs>} [fsOps]
 * @returns {number}
 */
function writeArtifactsAtomically(artifacts, outputDir, fsOps = fs) {
  const ops = { ...fs, ...fsOps };
  const staged = [];
  const backups = new Map();
  const newlyCreatedDests = [];
  let counter = 0;

  try {
    for (const [relPath, content] of artifacts.entries()) {
      const destPath = path.join(outputDir, relPath);
      ops.mkdirSync(path.dirname(destPath), { recursive: true });
      const tmpPath = `${destPath}.tmp-${process.pid}-${counter++}`;
      ops.writeFileSync(tmpPath, content, "utf8");
      staged.push({ tmpPath, destPath });
    }

    for (const { tmpPath, destPath } of staged) {
      if (ops.existsSync(destPath)) {
        if (!backups.has(destPath)) {
          backups.set(destPath, ops.readFileSync(destPath));
        }
      } else {
        newlyCreatedDests.push(destPath);
      }
      ops.renameSync(tmpPath, destPath);
    }
    return artifacts.size;
  } catch (err) {
    for (const [destPath, prevBytes] of backups.entries()) {
      try {
        ops.writeFileSync(destPath, prevBytes);
      } catch {
        // Best-effort rollback of previously replaced destinations.
      }
    }
    for (const createdPath of newlyCreatedDests) {
      try {
        ops.unlinkSync(createdPath);
      } catch {
        // Best-effort removal of newly created destinations.
      }
    }
    throw err;
  } finally {
    for (const { tmpPath } of staged) {
      try {
        if (ops.existsSync(tmpPath)) {
          ops.unlinkSync(tmpPath);
        }
      } catch {
        // Ignore cleanup failure for already-removed temp files.
      }
    }
  }
}

/**
 * Parse CLI arguments (`--only=<target>`, `--verify-existing`, `--concurrency=<n>`).
 * @param {string[]} argv
 * @returns {{ only: string, verifyExisting: boolean, concurrency: number }}
 */
function parseCliArgs(argv) {
  let only = "all";
  let verifyExisting = false;
  let concurrency = DEFAULT_CONCURRENCY;

  for (const arg of argv) {
    if (arg.startsWith("--only=")) {
      only = arg.slice("--only=".length);
    } else if (arg === "--verify-existing") {
      verifyExisting = true;
    } else if (arg.startsWith("--concurrency=")) {
      const parsed = Number(arg.slice("--concurrency=".length));
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`Invalid --concurrency value: ${arg}`);
      }
      concurrency = parsed;
    }
  }

  return { only, verifyExisting, concurrency };
}

/**
 * End-to-end static index generator runner.
 * @param {{
 *   only?: string | string[],
 *   verifyExisting?: boolean,
 *   concurrency?: number,
 *   totalPages?: number,
 *   outputDir?: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number
 * }} [options]
 */
async function runGenerator(options = {}) {
  const {
    only = "all",
    verifyExisting = false,
    concurrency = DEFAULT_CONCURRENCY,
    totalPages = TOTAL_PAGES,
    outputDir = path.join(process.cwd(), "public/quran"),
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const targets = resolveTargetSet(only);
  const needChapters = targets.has("chapters") || targets.has("pages");
  const needVersesAndWords =
    targets.has("juz-starts") ||
    targets.has("search-index") ||
    targets.has("pages") ||
    targets.has("verse-pages") ||
    targets.has("page-bounds") ||
    targets.has("rubs") ||
    targets.has("verses") ||
    targets.has("words");
  const needLayouts =
    targets.has("pages") ||
    targets.has("verse-pages") ||
    targets.has("page-bounds");

  const startTime = Date.now();
  console.log(
    `Generating static Quran indexes (targets=${Array.from(targets).join(",")}, verifyExisting=${verifyExisting})...`
  );

  const expectedChapters = totalPages === TOTAL_PAGES ? TOTAL_CHAPTERS : null;
  const chapters = needChapters
    ? await fetchChaptersFromQdc({ fetchImpl, timeoutMs, expectedChapters })
    : [];

  let verses = [];
  let words = [];
  const layoutsByMushaf = {};

  if (needVersesAndWords) {
    const fetched = await fetchVersesAndWordsFromQdc({
      concurrency,
      totalPages,
      fetchImpl,
      timeoutMs,
    });
    verses = fetched.verses;
    words = fetched.words;

    if (needLayouts) {
      layoutsByMushaf[SEEDED_WORDS_MUSHAF_ID] = fetched.defaultLayouts;
      const expectedWordIds = new Set(words.map((w) => w.id));
      const otherMushafs = LAYOUT_MUSHAF_IDS.filter(
        (id) => id !== SEEDED_WORDS_MUSHAF_ID
      );
      for (const mushafId of otherMushafs) {
        layoutsByMushaf[mushafId] = await fetchMushafLayoutFromQdc(
          mushafId,
          expectedWordIds,
          { concurrency, totalPages, fetchImpl, timeoutMs }
        );
      }
    }
  }

  const artifacts = buildStaticArtifacts({
    chapters,
    verses,
    words,
    layoutsByMushaf,
    targets,
  });

  if (verifyExisting) {
    const { verifiedCount, newFiles } = verifyExistingArtifacts(
      artifacts,
      outputDir
    );
    const writtenCount = writeArtifactsAtomically(newFiles, outputDir);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `Verified ${verifiedCount} existing files byte-for-byte; wrote ${writtenCount} new files in ${elapsedSec}s.`
    );
    return { verifiedCount, writtenCount, totalArtifacts: artifacts.size };
  }

  const writtenCount = writeArtifactsAtomically(artifacts, outputDir);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Generated ${writtenCount} static files in ${elapsedSec}s.`);
  return { verifiedCount: 0, writtenCount, totalArtifacts: artifacts.size };
}

if (require.main === module) {
  const args = parseCliArgs(process.argv.slice(2));
  runGenerator(args).catch((err) => {
    console.error("Failed to generate static Quran indexes:", err);
    process.exit(1);
  });
}

module.exports = {
  ALL_TARGETS,
  DEFAULT_MUSHAF_ID,
  GLYPH_FIELD_BY_MUSHAF,
  HIZB_POSITION_MAP,
  LAYOUT_MUSHAF_IDS,
  LINES_PER_PAGE,
  PAGE_METADATA_ID_OFFSET,
  QCF_V2_MUSHAF_ID,
  SEEDED_WORDS_MUSHAF_ID,
  TAJWEED_MUSHAF_ID,
  TOTAL_CHAPTERS,
  TOTAL_PAGES,
  TOTAL_RUBS,
  TOTAL_VERSES,
  buildChaptersJson,
  buildEditionArtifacts,
  buildJuzStartsJson,
  buildRubsJson,
  buildSearchIndexJson,
  buildStaticArtifacts,
  buildVersesJson,
  buildWordsJson,
  correctAudioUrl,
  deriveRubsFromVerses,
  deriveSinglePageMetadata,
  fetchChaptersFromQdc,
  fetchJsonWithRetry,
  fetchMushafLayoutFromQdc,
  fetchVersesAndWordsFromQdc,
  isExistingArtifactPath,
  mapWithConcurrency,
  normalizeAudioUrl,
  parseCliArgs,
  resolveTargetSet,
  runGenerator,
  validateLayouts,
  verifyExistingArtifacts,
  writeArtifactsAtomically,
};
