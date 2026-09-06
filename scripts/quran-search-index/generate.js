/**
 * Generates one immutable static JSON file, `public/quran/search-index.json`, holding
 * all 6,236 verses — the data source for offline verse search in the installed PWA
 * (Static Generation Strategy decision: "Static data must be pre-computed, not
 * calculated at runtime").
 *
 * Row shape `{ k: verse_key, t: text_imlaei_simple, d: pre-joined qpc_uthmani_hafs
 * display string, c: chapter_id }` MUST stay in sync with the offline engine in
 * `app/hooks/use-search.ts` and the `VerseResult.display_uthmani` contract in
 * `app/types/index.ts`. The display string is the `Word.qpc_uthmani_hafs` join in
 * `position` order — the same join the search API/overlay uses, so offline rows render
 * pixel-identical to online rows (see ADR 0062; never imlaei/uthmani for display).
 * No page number and no surah names by design (ADR 0033): page resolves at use time
 * through the active edition's `verse-pages/{mushafId}.json`, names through `chapters.json`.
 *
 * Run manually when Quran content data changes: `npm run generate:quran-search-index`
 * (loads .env.local via dotenv). Output is committed (immutable content), so dev
 * and prod serve it identically.
 */
const fs = require("fs");
const path = require("path");
const {
  requireQuranDatabaseUrl,
  targetLabel,
  createQuranClient,
} = require("../quran-seed/db-connection");

const OUT_FILE = path.join(__dirname, "../../public/quran/search-index.json");

async function main() {
  const url = requireQuranDatabaseUrl();
  console.log(`Generating static search index from ${targetLabel(url)} → public/quran/search-index.json`);
  const prisma = createQuranClient(url);

  try {
    const verses = await prisma.verse.findMany({
      select: {
        verse_key: true,
        text_imlaei_simple: true,
        chapter_id: true,
        Word: {
          select: { qpc_uthmani_hafs: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });
    const rows = verses.map((v) => ({
      k: v.verse_key,
      t: v.text_imlaei_simple,
      d: v.Word.map((w) => w.qpc_uthmani_hafs).join(" "),
      c: v.chapter_id,
    }));
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(rows));
    console.log(`Done — wrote ${rows.length} verses.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
