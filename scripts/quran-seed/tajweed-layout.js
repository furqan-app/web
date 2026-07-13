const axios = require("axios");

const BASE_URL = "https://api.qurancdn.com/api/qdc/verses/by_page/";
const PARAMS = {
  words: "true",
  per_page: "all",
  word_fields: "line_number",
  mushaf: "19",
  filter_page_words: "true",
};
const TAJWEED_MUSHAF_ID = 19;
const TOTAL_PAGES = 604;
const RETRIES = 3;

async function fetchPage(page) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await axios.get(`${BASE_URL}${page}`, { params: PARAMS });
      if (res.status === 200) return res.data;
      lastErr = new Error(`status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Failed to fetch page ${page} (mushaf=${TAJWEED_MUSHAF_ID}) after ${RETRIES} attempts: ${lastErr.message}`);
}

/**
 * Fetches `mushaf=19`'s line_number for every word across all 604 of its own
 * pages and returns `word_mushaf_layout` rows, matched by word `id` only.
 *
 * Word ids are stable across mushaf params, but which *page number* a word
 * falls on is not always: page/line boundaries can shift by mushaf (e.g. a
 * verse right at a page boundary lands on mushaf=2's page N but mushaf=19's
 * page N-1 or N+1 — confirmed live on page 120/121, verse 5:77). So this
 * aggregates word_id -> line_number globally across the full 604-page scan
 * rather than validating page-by-page — a word simply needs to turn up
 * *somewhere* in mushaf=19's own pagination, not on the same page number
 * mushaf=2 assigned it. `expectedWordIds` (every word id already seeded
 * under mushaf=2) is checked only after the full scan; any word id that
 * still doesn't resolve (should be rare-to-none) is logged and left out of
 * the returned rows — getPageWords' existing `?? word.line_number` fallback
 * covers it at render time rather than failing the whole seed. See ADR 0023
 * Addendum 6.
 */
async function fetchTajweedLayout(expectedWordIds, onPage) {
  const layoutByWordId = new Map();

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const data = await fetchPage(page);

    for (const verse of data.verses) {
      for (const word of verse.words) {
        layoutByWordId.set(word.id, word.line_number);
      }
    }

    if (onPage) onPage(page);
  }

  const missing = [...expectedWordIds].filter((id) => !layoutByWordId.has(id));
  if (missing.length > 0) {
    console.warn(
      `\n⚠ ${missing.length} word(s) have no mushaf=${TAJWEED_MUSHAF_ID} line data anywhere in its ` +
        `604-page layout (falling back to each word's existing line_number at render time): ` +
        `${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ", …" : ""}`
    );
  }

  const rows = [];
  for (const [word_id, line_number] of layoutByWordId) {
    if (expectedWordIds.has(word_id)) {
      rows.push({ word_id, mushaf_id: TAJWEED_MUSHAF_ID, line_number });
    }
  }

  return rows;
}

module.exports = { fetchTajweedLayout, TAJWEED_MUSHAF_ID };
