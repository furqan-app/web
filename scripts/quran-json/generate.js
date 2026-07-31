/**
 * Generates one immutable slim JSON per Mushaf page PER EDITION under
 * `public/quran/pages/{mushafId}/`, the content source for the persistent reader
 * pager (ADR 0028). Each file is the exact shape `getPageWords()` returns
 * ({ lines, pageMetadata }) so the client can fetch a static file instead of
 * hitting the DB-backed API route at runtime.
 *
 * Composition comes from `mushaf_word_layouts` — the edition's own page AND line
 * assignment — never from `Word.page_number`/`Word.line_number`, which are only a
 * default-edition mirror. Each file carries a single `glyph` field holding that
 * edition's glyph string, so the glyph can no longer be paired with the wrong
 * font: the pairing is resolved here, at generation time, and the reader has no
 * choice left to get wrong. See ADR 0033.
 *
 * The query MUST stay in sync with `app/hooks/get-page-words.ts`. Run manually
 * when the Quran data changes: `npm run generate:quran-json` (loads .env.local
 * via dotenv). Output is committed (immutable content), so dev and prod serve it
 * identically.
 */
const fs = require("fs");
const path = require("path");
const {
  requireQuranDatabaseUrl,
  targetLabel,
  createQuranClient,
} = require("../quran-seed/db-connection");
const {
  LAYOUT_MUSHAF_IDS,
  GLYPH_FIELD_BY_MUSHAF,
} = require("../quran-seed/mushaf-layout");

const TOTAL_PAGES = 604;
const OUT_ROOT = path.join(__dirname, "../../public/quran/pages");

// Mirror of app/utils/groupBy.ts (plain JS — this script can't import the TS module).
function groupBy(arr, key) {
  const grouped = {};
  for (const item of arr) {
    const k = String(typeof key === "function" ? key(item) : item[key]);
    (grouped[k] ||= []).push(item);
  }
  return grouped;
}

// Mirror of getPageWords() — keep in sync with app/hooks/get-page-words.ts.
async function getPageWords(prisma, mushafId, page) {
  const glyphField = GLYPH_FIELD_BY_MUSHAF[mushafId];
  if (!glyphField) {
    throw new Error(`No glyph field registered for mushaf ${mushafId}`);
  }

  const [layoutRows, pageMetadata] = await Promise.all([
    // Driven from the layout side: the edition decides which words are on this
    // page, in its own line order. Ordering is by the word's document position
    // (verse then position), which is what banner gap-detection assumes.
    prisma.mushafWordLayout.findMany({
      where: { mushaf_id: mushafId, page_number: page },
      select: {
        line_number: true,
        word: {
          select: {
            audio_url: true,
            verse_key: true,
            location: true,
            [glyphField]: true,
            qpc_uthmani_hafs: true,
            char_type_name: true,
            // The default edition's page — canonical key for mark storage, which
            // must not shift when the reader switches edition.
            page_number: true,
            verse: {
              select: {
                verse_key: true,
                page_number: true,
                chapter: { select: { verses_count: true } },
              },
            },
          },
        },
      },
      orderBy: [{ word: { verse_id: "asc" } }, { word: { position: "asc" } }],
    }),
    prisma.mushafPageMetadata.findFirstOrThrow({
      where: { mushaf_id: mushafId, page_number: page },
      include: { chapter: true },
    }),
  ]);

  const words = layoutRows.map(({ line_number, word }) => {
    const { [glyphField]: glyph, ...rest } = word;
    return { ...rest, glyph, line_number };
  });

  return { lines: groupBy(words, "line_number"), pageMetadata };
}

/**
 * verse_key → page for one edition. A verse's page is the page holding its FIRST
 * word: a verse can straddle a page break, and "where the verse starts" is what
 * navigation and edition-switching need to land on.
 */
async function prismaVersePages(prisma, mushafId) {
  const rows = await prisma.mushafWordLayout.findMany({
    where: { mushaf_id: mushafId },
    select: { page_number: true, word: { select: { verse_key: true } } },
    orderBy: [{ word: { verse_id: "asc" } }, { word: { position: "asc" } }],
  });

  const versePages = {};
  for (const row of rows) {
    // First occurrence wins — rows arrive in document order.
    if (versePages[row.word.verse_key] === undefined) {
      versePages[row.word.verse_key] = row.page_number;
    }
  }
  return versePages;
}

async function main() {
  const url = requireQuranDatabaseUrl();
  console.log(
    `Generating static page JSON from ${targetLabel(url)} → public/quran/pages/{mushafId}/`
  );
  const prisma = createQuranClient(url);

  try {
    for (const mushafId of LAYOUT_MUSHAF_IDS) {
      const outDir = path.join(OUT_ROOT, String(mushafId));
      fs.mkdirSync(outDir, { recursive: true });
      console.log(`\nmushaf ${mushafId} (glyph: ${GLYPH_FIELD_BY_MUSHAF[mushafId]})`);

      for (let page = 1; page <= TOTAL_PAGES; page++) {
        const data = await getPageWords(prisma, mushafId, page);
        if (Object.keys(data.lines).length === 0) {
          throw new Error(`mushaf ${mushafId} page ${page}: no words — layout not seeded?`);
        }
        fs.writeFileSync(path.join(outDir, `${page}.json`), JSON.stringify(data));
        if (page % 100 === 0 || page === TOTAL_PAGES) {
          console.log(`  ${page}/${TOTAL_PAGES}`);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  // verse_key → page, per edition. Small enough to ship whole (~6.2k entries)
  // and needed wherever a page number must be resolved from a verse rather than
  // assumed: rub/hizb navigation, and keeping the reader on the same verse when
  // the edition changes. A page number means nothing without an edition, so
  // there is one of these per edition (ADR 0033).
  const versePagesDir = path.join(OUT_ROOT, "../verse-pages");
  fs.mkdirSync(versePagesDir, { recursive: true });
  for (const mushafId of LAYOUT_MUSHAF_IDS) {
    const rows = await prismaVersePages(prisma, mushafId);
    fs.writeFileSync(
      path.join(versePagesDir, `${mushafId}.json`),
      JSON.stringify(rows),
    );
    console.log(
      `verse-pages/${mushafId}.json — ${Object.keys(rows).length} verses`,
    );
  }

  // Remove the old flat, edition-less files so nothing can silently keep reading
  // a pre-per-edition payload.
  const stale = fs
    .readdirSync(OUT_ROOT)
    .filter((f) => f.endsWith(".json"));
  for (const f of stale) fs.unlinkSync(path.join(OUT_ROOT, f));
  if (stale.length) console.log(`\nRemoved ${stale.length} stale edition-less page files.`);

  console.log(
    `Done — wrote ${LAYOUT_MUSHAF_IDS.length * TOTAL_PAGES} files across ` +
      `${LAYOUT_MUSHAF_IDS.length} editions.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
