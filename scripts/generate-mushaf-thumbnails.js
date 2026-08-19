/**
 * One-off script — renders a small "Mushaf Layout" settings thumbnail per
 * edition: the basmalah (verse 1:1) in that edition's own page-1 font,
 * cropped to a fixed size, saved to public/mushaf-previews/{mushafId}.png.
 *
 * Static, pre-rendered, run manually (`node scripts/generate-mushaf-thumbnails.js`)
 * — never at request time. Re-run only if page-1's font assets change.
 *
 * Must use the real DB-seeded glyph string (word.code_v1 / word.code_v2), not
 * typed Arabic text: QCF fonts remap each word to a page-local PUA codepoint
 * sequence, so plain Unicode input would not draw the correct glyphs (ADR 0033
 * — glyph field, font file and word placement are one edition-owned unit).
 */
const path = require("path");
const { chromium } = require("@playwright/test");
const { requireQuranDatabaseUrl, createQuranClient } = require("./quran-seed/db-connection");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const OUT_DIR = path.join(PUBLIC_DIR, "mushaf-previews");

const EDITIONS = [
  {
    mushafId: 2,
    glyphField: "code_v1",
    fontFile: path.join(PUBLIC_DIR, "fonts/v1/woff2/p1.woff2"),
    usesColorGlyphs: false,
  },
  {
    mushafId: 19,
    glyphField: "code_v2",
    fontFile: path.join(PUBLIC_DIR, "fonts/v4/colrv1/woff2/p1.woff2"),
    usesColorGlyphs: true,
  },
];

const WIDTH = 240;
const HEIGHT = 80;

/** The basmalah's glyph string, in word order, for one edition's page 1. */
async function fetchBasmalahGlyphs(prisma, mushafId, glyphField) {
  const rows = await prisma.mushafWordLayout.findMany({
    where: { mushaf_id: mushafId, page_number: 1 },
    select: {
      line_number: true,
      word: {
        select: { position: true, verse_key: true, [glyphField]: true },
      },
    },
    orderBy: [{ word: { verse_id: "asc" } }, { word: { position: "asc" } }],
  });

  const basmalahWords = rows
    .filter((row) => row.word.verse_key === "1:1")
    .map((row) => row.word[glyphField]);

  if (basmalahWords.length === 0) {
    throw new Error(
      `generate-mushaf-thumbnails: no verse 1:1 words found for mushaf ${mushafId} — ` +
        "check MushafWordLayout seeding.",
    );
  }
  return basmalahWords.join(" ");
}

function htmlFor({ glyphs, fontFile, fontFamily, usesColorGlyphs }) {
  const fontUrl = `file://${fontFile}`;
  // Tajweed's COLRv1 font ignores CSS `color`; it paints its own baked-in
  // palette. base-palette 0 is the font's light palette (ADR 0023) — no
  // override-colors here, this is a small settings icon, not the reader.
  const paletteRule = usesColorGlyphs
    ? `@font-palette-values --Preview { font-family: "${fontFamily}"; base-palette: 0; }`
    : "";
  const paletteProp = usesColorGlyphs ? "font-palette: --Preview;" : "color: #2b2118;";

  return `<!doctype html>
<html>
<head>
<style>
  @font-face {
    font-family: "${fontFamily}";
    src: url("${fontUrl}") format("woff2");
  }
  ${paletteRule}
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
  }
  .snippet {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "${fontFamily}";
    font-size: 28px;
    direction: rtl;
    ${paletteProp}
  }
</style>
</head>
<body>
  <div class="snippet">${glyphs}</div>
</body>
</html>`;
}

async function main() {
  const fs = require("fs");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const url = requireQuranDatabaseUrl();
  const prisma = createQuranClient(url);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

    for (const edition of EDITIONS) {
      const glyphs = await fetchBasmalahGlyphs(prisma, edition.mushafId, edition.glyphField);
      const fontFamily = `mushaf-preview-${edition.mushafId}`;
      // page.setContent() leaves the page on "about:blank", whose origin can't
      // load file:// font resources. Write to a temp .html and page.goto() it
      // instead, so the page's own origin is file:// and the @font-face load
      // is same-origin.
      const tmpHtmlPath = path.join(OUT_DIR, `_tmp-${edition.mushafId}.html`);
      fs.writeFileSync(
        tmpHtmlPath,
        htmlFor({ glyphs, fontFile: edition.fontFile, fontFamily, usesColorGlyphs: edition.usesColorGlyphs }),
      );
      await page.goto(`file://${tmpHtmlPath}`);
      // Wait for the @font-face to actually load before screenshotting —
      // otherwise the fallback system font gets captured instead.
      await page.evaluate((family) => document.fonts.load(`28px "${family}"`), fontFamily);
      await page.waitForTimeout(100);
      fs.unlinkSync(tmpHtmlPath);

      const outFile = path.join(OUT_DIR, `${edition.mushafId}.png`);
      await page.locator(".snippet").screenshot({ path: outFile, omitBackground: true });
      console.log(`Wrote ${outFile}`);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
