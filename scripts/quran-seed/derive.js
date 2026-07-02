const HIZB_POSITION_MAP = {
  3: "hizb",
  2: "hizb-quarter",
  1: "hizb-half",
  0: "hizb-three-quarters",
};

/** Verses sorted by id (natural mushaf order) — the basis for every derivation. */
function byId(verses) {
  return [...verses].sort((a, b) => a.id - b.id);
}

/**
 * `rubs` rows. `rub_el_hizb_number` is a GLOBAL rub index (1–240, ADR 0009), so
 * group by it directly; verse_mapping_start/end are the min/max verse **id**.
 */
function deriveRubs(verses) {
  const map = new Map(); // rub -> { start, end, count }
  for (const v of byId(verses)) {
    const r = v.rub_el_hizb_number;
    const cur = map.get(r);
    if (!cur) map.set(r, { start: v.id, end: v.id, count: 1 });
    else {
      cur.end = v.id;
      cur.count += 1;
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rub_number, { start, end, count }]) => ({
      rub_number,
      verse_mapping_start: start,
      verse_mapping_end: end,
      verses_count: count,
    }));
}

/**
 * `rub_verse_mappings` rows: one per (rub, chapter) segment, with start/end
 * verse **numbers** (within the chapter).
 */
function deriveRubVerseMappings(verses) {
  const map = new Map(); // `${rub}:${chapter}` -> { rub, chapter, start, end }
  for (const v of byId(verses)) {
    const key = `${v.rub_el_hizb_number}:${v.chapter_id}`;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        rub: v.rub_el_hizb_number,
        chapter: v.chapter_id,
        start: v.verse_number,
        end: v.verse_number,
      });
    } else {
      cur.end = v.verse_number;
    }
  }
  return [...map.values()]
    .sort((a, b) => a.rub - b.rub || a.chapter - b.chapter)
    .map(({ rub, chapter, start, end }) => ({
      rub_number: rub,
      chapter_number: chapter,
      start_verse: start,
      end_verse: end,
    }));
}

/**
 * `page_metadata` rows — per-page surah/juz/hizb summary. Ports the existing
 * populate-page-metadata logic; `hizb_position` is null on pages that don't
 * start a new rub.
 */
function derivePageMetadata(verses) {
  const pages = new Map(); // page_number -> verse[]
  for (const v of byId(verses)) {
    if (!pages.has(v.page_number)) pages.set(v.page_number, []);
    pages.get(v.page_number).push(v);
  }

  const rows = [];
  let prevPageLastRub = 0;
  const ordered = [...pages.entries()].sort((a, b) => a[0] - b[0]);
  for (const [pageNum, pageVerses] of ordered) {
    const lastVerse = pageVerses[pageVerses.length - 1];
    const chapterIds = [...new Set(pageVerses.map((v) => v.chapter_id))];
    const surahId =
      pageVerses.find((v) => v.verse_number === 1)?.chapter_id ??
      pageVerses[0].chapter_id;
    const pageSurahs = chapterIds.join("-");

    const startRub = pageVerses[0].rub_el_hizb_number;
    let newRubVerse;
    if (startRub !== prevPageLastRub) {
      newRubVerse = pageVerses[0];
    } else {
      newRubVerse =
        pageVerses.find((v) => v.rub_el_hizb_number !== startRub) ?? null;
    }

    let hizbPosition = null;
    let hizbNumber = lastVerse.hizb_number;
    if (newRubVerse) {
      const value =
        newRubVerse.hizb_number * 4 - newRubVerse.rub_el_hizb_number;
      hizbPosition = HIZB_POSITION_MAP[value] ?? null;
      hizbNumber = newRubVerse.hizb_number;
    }
    prevPageLastRub = lastVerse.rub_el_hizb_number;

    rows.push({
      page_number: pageNum,
      surah_id: surahId,
      page_surahs: pageSurahs,
      juz_number: lastVerse.juz_number,
      hizb_number: hizbNumber,
      hizb_position: hizbPosition,
    });
  }
  return rows;
}

module.exports = { deriveRubs, deriveRubVerseMappings, derivePageMetadata };
