const axios = require("axios");

const BASE_URL = "https://api.qurancdn.com/api/qdc/verses/by_page/";
const TOTAL_PAGES = 604;
const LINES_PER_PAGE = 15;
const RETRIES = 3;

/**
 * Mushaf editions whose word placement is seeded into `mushaf_word_layouts`.
 *
 * A mushaf is a typeset book — a committee fixes where every word sits for that
 * specific print edition — so an edition owns its COMPLETE placement: page AND
 * line. Editions disagree on page boundaries, not only on line breaks. There is
 * no base edition here; every entry is fetched and validated the same way. See
 * ADR 0033.
 *
 * `DEFAULT_MUSHAF_ID` is the edition the reader opens by default, and the one
 * `Word.page_number` / `Word.line_number` mirror for mark canonicalization.
 */
const DEFAULT_MUSHAF_ID = 2;
const TAJWEED_MUSHAF_ID = 19;
const LAYOUT_MUSHAF_IDS = [DEFAULT_MUSHAF_ID, TAJWEED_MUSHAF_ID];

/**
 * Which `Word` column holds each edition's glyph string.
 *
 * Every page has its own font file with its own local codepoint space, so a glyph
 * string is only meaningful alongside the matching font AND the matching page
 * composition. Pairing a glyph field with another edition's font does not fail —
 * it silently draws a different word. This table is the build-time half of that
 * pairing; `app/utils/mushaf-editions.ts` holds the render-time half and must
 * agree with it. See ADR 0033.
 */
const GLYPH_FIELD_BY_MUSHAF = {
  [DEFAULT_MUSHAF_ID]: "code_v1",
  [TAJWEED_MUSHAF_ID]: "code_v2",
};

async function fetchPage(page, mushafId) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await axios.get(`${BASE_URL}${page}`, {
        params: {
          words: "true",
          per_page: "all",
          word_fields: "line_number,page_number",
          mushaf: String(mushafId),
          filter_page_words: "true",
        },
      });
      if (res.status === 200) return res.data;
      lastErr = new Error(`status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Failed to fetch page ${page} (mushaf=${mushafId}) after ${RETRIES} attempts: ${lastErr.message}`
  );
}

/**
 * Rejects a layout that cannot be a real printed mushaf.
 *
 * This check exists because deleting its predecessor is what shipped the Trello
 * #155 defect. The original seeder validated page-by-page, correctly failed on
 * verse 5:77 (mushaf 2's page 121 vs mushaf 19's page 120), and the response was
 * to drop the check and aggregate line numbers globally — discarding page
 * assignment entirely. That suppressed the signal that the schema was
 * mismodelled, and 36 pages went on to render words from two different editions
 * spliced together (292 words drawing another word's glyph, 50 drawing nothing).
 *
 * If this throws, the model is wrong. Do not loosen it to make a seed pass.
 */
function validateLayout(mushafId, rows) {
  const byPage = new Map();
  for (const row of rows) {
    if (!byPage.has(row.page_number)) byPage.set(row.page_number, []);
    byPage.get(row.page_number).push(row);
  }

  for (const [page, pageRows] of byPage) {
    const lines = pageRows.map((r) => r.line_number);

    const outOfRange = lines.filter((l) => l < 1 || l > LINES_PER_PAGE);
    if (outOfRange.length > 0) {
      throw new Error(
        `mushaf=${mushafId} page ${page}: line_number out of 1–${LINES_PER_PAGE} range (${outOfRange.slice(0, 5).join(", ")})`
      );
    }

    const distinct = new Set(lines);
    if (distinct.size > LINES_PER_PAGE) {
      throw new Error(
        `mushaf=${mushafId} page ${page}: ${distinct.size} distinct lines, max ${LINES_PER_PAGE}`
      );
    }

    // Words arrive in document order, so line numbers must never decrease
    // within a page. A decrease means words from another edition's page leaked
    // in — the exact shape of the #155 defect.
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] < lines[i - 1]) {
        throw new Error(
          `mushaf=${mushafId} page ${page}: line_number decreases mid-page ` +
            `(${lines[i - 1]} → ${lines[i]} at word_id ${pageRows[i].word_id}) — ` +
            `page composition is not in document order`
        );
      }
    }
  }

  return byPage.size;
}

/**
 * The default edition's placement, taken from the words already seeded.
 *
 * `verses-words.js` fetches with `mushaf: "2"`, so `Word.page_number` /
 * `Word.line_number` already ARE the default edition's placement — refetching it
 * would be 604 redundant QDC requests for data in hand. It still goes through
 * the same `validateLayout` as every fetched edition: uniform validation is what
 * matters, not a uniform transport.
 *
 * `versePages` likewise comes from the seeded verses' own `page_number`.
 */
function layoutFromSeededWords(mushafId, words) {
  const rows = words.map((w) => ({
    mushaf_id: mushafId,
    word_id: w.id,
    page_number: w.page_number,
    line_number: w.line_number,
  }));

  const pageCount = validateLayout(mushafId, rows);
  if (pageCount !== TOTAL_PAGES) {
    throw new Error(
      `mushaf=${mushafId}: covered ${pageCount} pages, expected ${TOTAL_PAGES}`
    );
  }

  return rows;
}

/**
 * Fetches one edition's full word placement across its own 604 pages.
 *
 * Returns `{ rows, versePages }` — `rows` are `mushaf_word_layouts` records
 * (`mushaf_id`, `word_id`, `page_number`, `line_number`), and `versePages` maps
 * `verse_key → page_number` for that edition, which `derivePageMetadata` needs
 * to build per-edition page summaries.
 *
 * Words are matched by QDC word `id`, which is stable across mushaf params.
 * `expectedWordIds` is every word id already seeded from the default edition;
 * any id missing from this edition's scan is a hard failure, because a word with
 * no placement in an edition cannot be rendered in it at all.
 */
async function fetchMushafLayout(mushafId, expectedWordIds, onPage) {
  const rows = [];
  const versePages = new Map();
  const seen = new Set();

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const data = await fetchPage(page, mushafId);

    for (const verse of data.verses) {
      versePages.set(verse.verse_key, page);
      for (const word of verse.words) {
        if (seen.has(word.id)) {
          throw new Error(
            `mushaf=${mushafId}: word id ${word.id} appears on more than one page`
          );
        }
        seen.add(word.id);
        rows.push({
          mushaf_id: mushafId,
          word_id: word.id,
          page_number: page,
          line_number: word.line_number,
        });
      }
    }

    if (onPage) onPage(page);
  }

  const missing = [...expectedWordIds].filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(
      `mushaf=${mushafId}: ${missing.length} seeded word(s) have no placement in ` +
        `this edition's 604-page layout — a word with no placement cannot be ` +
        `rendered. First few: ${missing.slice(0, 20).join(", ")}`
    );
  }

  const pageCount = validateLayout(mushafId, rows);
  if (pageCount !== TOTAL_PAGES) {
    throw new Error(
      `mushaf=${mushafId}: covered ${pageCount} pages, expected ${TOTAL_PAGES}`
    );
  }

  return { rows, versePages };
}

module.exports = {
  fetchMushafLayout,
  layoutFromSeededWords,
  LAYOUT_MUSHAF_IDS,
  GLYPH_FIELD_BY_MUSHAF,
  DEFAULT_MUSHAF_ID,
  TAJWEED_MUSHAF_ID,
  TOTAL_PAGES,
};
