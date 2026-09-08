/**
 * LOCAL DEV ONLY — populates `mushaf_id = 1` (QCF V2) rows in
 * `mushaf_word_layouts` + `mushaf_page_metadata` WITHOUT the destructive full
 * reseed, so `npm run generate:quran-json` can emit `public/quran/pages/1/*.json`
 * during development.
 *
 * It calls the same `fetchMushafLayout(1)` / `derivePageMetadata` the real
 * seeder does (including `fetchMushafLayout`'s own "every seeded word has a
 * placement" + `validateLayout` checks), so the rows it inserts are identical to
 * a full `npm run seed:quran -- --force` — which stays the canonical
 * regeneration path (this is a dev convenience to avoid dropping the whole DB
 * mid-task).
 *
 * Run from the worktree root:  node scripts/dev/populate-qcf-v2-local.js
 */
require("dotenv").config({ path: ".env.local" });
const cliProgress = require("cli-progress");
const { createQuranClient } = require("../quran-seed/db-connection");
const {
  fetchMushafLayout,
  QCF_V2_MUSHAF_ID,
  TOTAL_PAGES,
} = require("../quran-seed/mushaf-layout");
const { derivePageMetadata } = require("../quran-seed/derive");

async function main() {
  const url = process.env.QURAN_DATABASE_URL;
  if (!url) throw new Error("QURAN_DATABASE_URL not set (.env.local)");
  const prisma = createQuranClient(url);
  try {
    const words = await prisma.word.findMany({ select: { id: true } });
    const verses = await prisma.verse.findMany();

    console.log(`Fetching mushaf=${QCF_V2_MUSHAF_ID} layout (${TOTAL_PAGES} pages)…`);
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(TOTAL_PAGES, 0);
    const { rows, versePages } = await fetchMushafLayout(
      QCF_V2_MUSHAF_ID,
      new Set(words.map((w) => w.id)),
      (p) => bar.update(p),
    );
    bar.stop();

    const pageMeta = derivePageMetadata(
      verses,
      (v) => versePages.get(v.verse_key),
    ).map((r) => ({ ...r, mushaf_id: QCF_V2_MUSHAF_ID }));

    await prisma.mushafWordLayout.deleteMany({
      where: { mushaf_id: QCF_V2_MUSHAF_ID },
    });
    await prisma.mushafPageMetadata.deleteMany({
      where: { mushaf_id: QCF_V2_MUSHAF_ID },
    });
    for (let i = 0; i < rows.length; i += 1000) {
      await prisma.mushafWordLayout.createMany({ data: rows.slice(i, i + 1000) });
    }
    await prisma.mushafPageMetadata.createMany({ data: pageMeta });
    console.log(
      `Inserted ${rows.length} layout rows + ${pageMeta.length} page-metadata rows for mushaf ${QCF_V2_MUSHAF_ID}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
