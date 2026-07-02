const axios = require("axios");

const CHAPTERS_URL = "https://api.qurancdn.com/api/qdc/chapters?language=en";

/**
 * Fetches surah metadata from the QDC API and maps it to `chapters` rows.
 * Contracts (ADR 0009): `pages` arrives as [start,end] → "start-end" string;
 * `translated_name` is an object → take `.name`; `chapter_number` = `id`.
 */
async function fetchChapters() {
  const { data } = await axios.get(CHAPTERS_URL);
  return data.chapters.map((c) => ({
    id: c.id,
    chapter_number: c.id,
    bismillah_pre: Boolean(c.bismillah_pre),
    revelation_order: c.revelation_order,
    revelation_place: c.revelation_place,
    name_complex: c.name_complex,
    name_arabic: c.name_arabic,
    name_simple: c.name_simple,
    verses_count: c.verses_count,
    pages: Array.isArray(c.pages) ? c.pages.join("-") : String(c.pages),
    translated_name: c.translated_name?.name ?? "",
  }));
}

module.exports = { fetchChapters };
