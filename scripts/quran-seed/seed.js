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
  console.log("\n[1/4] Resetting schema (prisma db push --force-reset)…");
  execSync(
    `npx prisma db push --force-reset --skip-generate --schema ${SCHEMA}`,
    { stdio: "inherit" }
  );

  // 2. Fetch from QDC.
  console.log("\n[2/4] Fetching chapters…");
  const chapters = await fetchChapters();

  console.log(`[2/4] Fetching verses + words (${TOTAL_PAGES} pages)…`);
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(TOTAL_PAGES, 0);
  const { verses, words } = await fetchVersesAndWords((page) => bar.update(page));
  bar.stop();

  // 3. Derive reference tables from verses.
  console.log("\n[3/4] Deriving rubs / rub_verse_mappings / page_metadata…");
  const rubs = deriveRubs(verses);
  const rubVerseMappings = deriveRubVerseMappings(verses);
  const pageMetadata = derivePageMetadata(verses);

  // 4. Insert in FK order.
  console.log("[4/4] Inserting (chapters → verses → words → rubs → rub_verse_mappings → page_metadata)…");
  const prisma = createQuranClient(url);
  try {
    await prisma.chapter.createMany({ data: chapters });
    await insertChunked(prisma.verse, verses);
    await insertChunked(prisma.word, words);
    await prisma.rub.createMany({ data: rubs });
    await prisma.rubVerseMapping.createMany({ data: rubVerseMappings });
    await prisma.pageMetadata.createMany({ data: pageMetadata });

    console.log(
      `\n✓ Done. chapters=${chapters.length} verses=${verses.length} ` +
        `words=${words.length} rubs=${rubs.length} ` +
        `rub_verse_mappings=${rubVerseMappings.length} page_metadata=${pageMetadata.length}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
