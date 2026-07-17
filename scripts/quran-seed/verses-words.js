const axios = require("axios");

const BASE_URL = "https://api.qurancdn.com/api/qdc/verses/by_page/";
const PARAMS = {
  words: "true",
  per_page: "all",
  fields: "text_uthmani,chapter_id,hizb_number,text_imlaei_simple",
  reciter: "7",
  word_fields:
    "verse_key,verse_id,page_number,location,text_uthmani,code_v1,code_v2,qpc_uthmani_hafs",
  mushaf: "2",
  filter_page_words: "true",
};
const TOTAL_PAGES = 604;
const RETRIES = 3;

// QDC's audio_url file number counts Rub-el-hizb/waqf marks it fuses into an
// adjacent word's text_uthmani as their own audio track, so it silently drifts
// ahead of `position` in verses containing one. `position` is already the
// correct sequential real-word ordinal per verse, so force the file number to
// match it. See ADR 0009 Addendum (2026-07-15).
function correctAudioUrl(audioUrl, position) {
  return audioUrl.replace(/\d+(\.mp3)$/, `${String(position).padStart(3, "0")}$1`);
}

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
  throw new Error(`Failed to fetch page ${page} after ${RETRIES} attempts: ${lastErr.message}`);
}

/**
 * Fetches the given pages from QDC (all 604 by default) and flattens them into
 * `verses` + `words` rows (word translation/transliteration are intentionally
 * dropped — not in the Prisma Word model). Fails hard (throws) on a page that
 * won't load, so a partial seed is never silently produced; re-run to retry.
 * `onPage(page)` reports progress. `pages` lets callers (e.g. the e2e fixture
 * generator) fetch a small subset instead of the full book.
 */
async function fetchVersesAndWords(onPage, pages) {
  const verses = [];
  const words = [];
  const pageList = pages ?? Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  for (const page of pageList) {
    const data = await fetchPage(page);
    for (const verse of data.verses) {
      verses.push({
        id: verse.id,
        verse_number: verse.verse_number,
        verse_key: verse.verse_key,
        hizb_number: verse.hizb_number,
        rub_el_hizb_number: verse.rub_el_hizb_number,
        ruku_number: verse.ruku_number,
        manzil_number: verse.manzil_number,
        sajdah_number: verse.sajdah_number,
        text_uthmani: verse.text_uthmani,
        chapter_id: verse.chapter_id,
        text_imlaei_simple: verse.text_imlaei_simple,
        page_number: verse.page_number,
        juz_number: verse.juz_number,
      });
      for (const word of verse.words) {
        words.push({
          id: word.id,
          position: word.position,
          audio_url:
            word.char_type_name === "word" && word.audio_url
              ? correctAudioUrl(word.audio_url, word.position)
              : word.audio_url,
          verse_key: word.verse_key,
          verse_id: word.verse_id,
          location: word.location,
          text_uthmani: word.text_uthmani,
          code_v1: word.code_v1,
          code_v2: word.code_v2,
          qpc_uthmani_hafs: word.qpc_uthmani_hafs,
          char_type_name: word.char_type_name,
          page_number: word.page_number,
          line_number: word.line_number,
          text: word.text,
        });
      }
    }
    if (onPage) onPage(page);
  }

  return { verses, words };
}

module.exports = { fetchVersesAndWords, TOTAL_PAGES };
