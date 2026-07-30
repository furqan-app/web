const { execSync } = require("child_process");
const cliProgress = require("cli-progress");
const {
  requireQuranDatabaseUrl,
  targetLabel,
  createQuranClient,
} = require("./db-connection");
const { fetchChapters } = require("./chapters");
const { fetchVersesAndWords, TOTAL_PAGES } = require("./verses-words");
const {
  fetchMushafLayout,
  layoutFromSeededWords,
  LAYOUT_MUSHAF_IDS,
  DEFAULT_MUSHAF_ID,
} = require("./mushaf-layout");
const {
  deriveRubs,
  deriveRubVerseMappings,
  derivePageMetadata,
} = require("./derive");

const SCHEMA = "prisma/quran/schema.prisma";
const CHUNK = 1000;

/** createMany in chunks to stay under packet/placeholder limits. */
async function insertChunked(delegate, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await delegate.createMany({ data: rows.slice(i, i + CHUNK) });
  }
}

async function main() {
  const url = requireQuranDatabaseUrl();
  const label = targetLabel(url);

  console.log(`\nQuran seeder — target: ${label}`);
  if (!process.argv.includes("--force")) {
    console.error(
      "\n✗ Refusing: this DROPS and REBUILDS the entire Quran database above.\n" +
        "  Re-run with --force to proceed:  npm run seed:quran -- --force\n"
    );
    process.exit(1);
  }

  // 1. Schema: Prisma owns it — drop + recreate from prisma/quran/schema.prisma.
  console.log("\n[1/5] Resetting schema (prisma db push --force-reset)…");
  execSync(
    `npx prisma db push --force-reset --skip-generate --schema ${SCHEMA}`,
    { stdio: "inherit" }
  );

  // 2. Fetch from QDC.
  console.log("\n[2/5] Fetching chapters…");
  const chapters = await fetchChapters();

  console.log(`[2/5] Fetching verses + words (${TOTAL_PAGES} pages)…`);
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(TOTAL_PAGES, 0);
  const { verses, words } = await fetchVersesAndWords((page) => bar.update(page));
  bar.stop();

  // Every word id seeded above. Each edition's scan must account for all of
  // them — a word with no placement in an edition cannot be rendered in it.
  const expectedWordIds = new Set(words.map((w) => w.id));

  // 3. Fetch each edition's complete word placement (page AND line). No edition
  // is a base the others override: mushaf 2 is fetched and validated exactly
  // like mushaf 19. See ADR 0033.
  const mushafWordLayouts = [];
  const mushafPageMetadata = [];
  for (const mushafId of LAYOUT_MUSHAF_IDS) {
    let rows;
    let pageOf;

    if (mushafId === DEFAULT_MUSHAF_ID) {
      // Already in hand — verses-words.js fetched with this same mushaf param.
      console.log(`\n[3/5] Deriving mushaf=${mushafId} word placement from seeded words…`);
      rows = layoutFromSeededWords(mushafId, words);
      pageOf = (v) => v.page_number;
    } else {
      console.log(`\n[3/5] Fetching mushaf=${mushafId} word placement (${TOTAL_PAGES} pages)…`);
      const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      bar.start(TOTAL_PAGES, 0);
      const fetched = await fetchMushafLayout(mushafId, expectedWordIds, (page) =>
        bar.update(page)
      );
      bar.stop();
      rows = fetched.rows;
      pageOf = (v) => fetched.versePages.get(v.verse_key);
    }

    mushafWordLayouts.push(...rows);

    // Per-edition page summary, from that edition's own verse→page assignment.
    mushafPageMetadata.push(
      ...derivePageMetadata(verses, pageOf).map((row) => ({
        ...row,
        mushaf_id: mushafId,
      }))
    );
  }

  // 4. Derive reference tables from verses.
  console.log("\n[4/5] Deriving rubs / rub_verse_mappings / page_metadata…");
  const rubs = deriveRubs(verses);
  const rubVerseMappings = deriveRubVerseMappings(verses);
  // Legacy default-edition table, superseded by mushaf_page_metadata (ADR 0033)
  // and kept only until its remaining consumers move off it.
  const pageMetadata = derivePageMetadata(verses);

  // 5. Insert in FK order.
  console.log("[5/5] Inserting (chapters → verses → words → mushaf_word_layouts → rubs → rub_verse_mappings → page_metadata → mushaf_page_metadata)…");
  const prisma = createQuranClient(url);
  try {
    await prisma.chapter.createMany({ data: chapters });
    await insertChunked(prisma.verse, verses);
    await insertChunked(prisma.word, words);
    await insertChunked(prisma.mushafWordLayout, mushafWordLayouts);
    await prisma.rub.createMany({ data: rubs });
    await prisma.rubVerseMapping.createMany({ data: rubVerseMappings });
    await prisma.pageMetadata.createMany({ data: pageMetadata });
    await insertChunked(prisma.mushafPageMetadata, mushafPageMetadata);

    const perEdition = LAYOUT_MUSHAF_IDS.map(
      (id) =>
        `${id}=${mushafWordLayouts.filter((r) => r.mushaf_id === id).length}`
    ).join(" ");
    console.log(
      `\n✓ Done. chapters=${chapters.length} verses=${verses.length} ` +
        `words=${words.length} mushaf_word_layouts=${mushafWordLayouts.length} ` +
        `(${perEdition}) rubs=${rubs.length} ` +
        `rub_verse_mappings=${rubVerseMappings.length} ` +
        `page_metadata=${pageMetadata.length} ` +
        `mushaf_page_metadata=${mushafPageMetadata.length} ` +
        `default_mushaf=${DEFAULT_MUSHAF_ID}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // Print more than `.message` — axios/network errors often carry an empty
  // message, which once produced a bare "Seed failed:" with no cause while the
  // database had already been dropped.
  console.error("\nSeed failed:", e.message || e.code || String(e));
  if (e.code) console.error("  code:", e.code);
  if (e.response?.status) console.error("  http status:", e.response.status);
  if (e.stack) console.error(e.stack);
  console.error(
    "\n⚠ The database was already reset before this failure — it is now EMPTY.\n" +
      "  Re-run to completion:  npm run seed:quran -- --force\n"
  );
  process.exit(1);
});
