/**
 * Generates one immutable static JSON file, `public/quran/chapters.json`, holding
 * all 114 surahs — the data source for the surah list (Static Generation Strategy
 * decision: "Static data (surah list, juz/hizb info) must be pre-computed, not
 * calculated at runtime").
 *
 * The `select` below MUST stay in sync with the `SurahResult` type in
 * `app/types/index.ts`. Run manually when Quran chapter data changes: `npm run generate:quran-chapters`
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

const OUT_FILE = path.join(__dirname, "../../public/quran/chapters.json");

async function main() {
  const url = requireQuranDatabaseUrl();
  console.log(`Generating static chapters JSON from ${targetLabel(url)} → public/quran/chapters.json`);
  const prisma = createQuranClient(url);

  try {
    // Field list mirrors the SurahResult type — keep in sync with app/types/index.ts.
    const chapters = await prisma.chapter.findMany({
      select: {
        id: true,
        name_arabic: true,
        name_simple: true,
        verses_count: true,
        revelation_place: true,
        pages: true,
      },
      orderBy: { id: "asc" },
    });
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(chapters));
    console.log(`Done — wrote ${chapters.length} chapters.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
