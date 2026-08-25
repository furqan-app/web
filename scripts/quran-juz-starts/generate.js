/**
 * Generates one immutable static JSON file, `public/quran/juz-starts.json`,
 * holding the 30 juz start positions: `{ juz, verse_key, defaultPage }`.
 *
 * Source of truth: the rubs table — a juz is exactly 8 consecutive rubs
 * (240 total), so juz N starts at the rub whose rub_number === (N - 1) * 8 + 1.
 * This must stay in sync with RubList's `Math.ceil(rub_number / 8)` grouping.
 *
 * `verse_key` is what consumers resolve at runtime through the active mushaf
 * edition's verse-pages map (ADR 0033 — page numbers are meaningless without
 * an edition); `defaultPage` is the default edition's page, used as the
 * display/offline fallback until that map loads.
 *
 * Run manually when Quran data changes: `npm run generate:quran-juz-starts`
 * (loads .env.local via dotenv). Output is committed (immutable content).
 */
const fs = require("fs");
const path = require("path");
const {
  requireQuranDatabaseUrl,
  targetLabel,
  createQuranClient,
} = require("../quran-seed/db-connection");

const OUT_FILE = path.join(__dirname, "../../public/quran/juz-starts.json");

async function main() {
  const url = requireQuranDatabaseUrl();
  console.log(`Generating static juz-starts JSON from ${targetLabel(url)} → public/quran/juz-starts.json`);
  const prisma = createQuranClient(url);

  try {
    const rubs = await prisma.rub.findMany({
      // Prisma 5 has no `mod` filter — list juz-starting rub numbers directly.
      where: { rub_number: { in: Array.from({ length: 30 }, (_, i) => i * 8 + 1) } },
      orderBy: { rub_number: "asc" },
      select: {
        rub_number: true,
        startVerse: {
          select: {
            verse_key: true,
            page_number: true,
          },
        },
      },
    });

    const juzStarts = rubs.map((rub, i) => ({
      juz: i + 1,
      verse_key: rub.startVerse.verse_key,
      defaultPage: rub.startVerse.page_number,
    }));

    if (juzStarts.length !== 30) {
      throw new Error(`Expected 30 juz starts (rubs 1,9,…,233), got ${juzStarts.length}`);
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(juzStarts));
    console.log(`Done — wrote ${juzStarts.length} juz starts.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
