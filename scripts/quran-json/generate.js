/**
 * Generates one immutable slim JSON per Mushaf page under `public/quran/pages/`,
 * the content source for the persistent reader pager (ADR 0028). Each file is the
 * exact shape `getPageWords()` returns ({ lines, pageMetadata }) so the client can
 * fetch a static file instead of hitting the DB-backed API route at runtime.
 *
 * The query MUST stay in sync with `app/hooks/get-page-words.ts` (same slim nested
 * verse select + mushaf-19 layout override + line grouping). Run manually when the
 * Quran data changes: `npm run generate:quran-json` (loads .env.local via dotenv).
 * Output is committed (immutable content), so dev and prod serve it identically.
 */
const fs = require("fs");
const path = require("path");
const {
  requireQuranDatabaseUrl,
  targetLabel,
  createQuranClient,
} = require("../quran-seed/db-connection");

const LAYOUT_MUSHAF_IDS = [19];
const TOTAL_PAGES = 604;
const OUT_DIR = path.join(__dirname, "../../public/quran/pages");

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
async function getPageWords(prisma, page) {
  const [words, pageMetadata] = await Promise.all([
    prisma.word.findMany({
      include: {
        verse: {
          select: {
            verse_key: true,
            page_number: true,
            chapter: { select: { verses_count: true } },
          },
        },
        mushafLayouts: { where: { mushaf_id: { in: LAYOUT_MUSHAF_IDS } } },
      },
      where: { page_number: page },
      orderBy: [{ verse_id: "asc" }, { position: "asc" }],
    }),
    prisma.pageMetadata.findUniqueOrThrow({
      where: { page_number: page },
      include: { chapter: true },
    }),
  ]);

  const wordsWithLayouts = words.map(({ mushafLayouts, ...word }) => ({
    ...word,
    layouts: Object.fromEntries(mushafLayouts.map((l) => [l.mushaf_id, l.line_number])),
  }));

  return { lines: groupBy(wordsWithLayouts, "line_number"), pageMetadata };
}

async function main() {
  const url = requireQuranDatabaseUrl();
  console.log(`Generating static page JSON from ${targetLabel(url)} → public/quran/pages/`);
  const prisma = createQuranClient(url);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  try {
    for (let page = 1; page <= TOTAL_PAGES; page++) {
      const data = await getPageWords(prisma, page);
      fs.writeFileSync(path.join(OUT_DIR, `${page}.json`), JSON.stringify(data));
      if (page % 50 === 0 || page === TOTAL_PAGES) {
        console.log(`  ${page}/${TOTAL_PAGES}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`Done — wrote ${TOTAL_PAGES} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
