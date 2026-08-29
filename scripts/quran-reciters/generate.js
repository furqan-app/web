/**
 * Generates two immutable static JSON files, `public/quran/reciters-{ar,en}.json`
 * — the data source for RecitationContext's reciter list. Precached as part of the
 * app shell (see globPublicPatterns in next.config.mjs), so the client never hits
 * QDC live at launch (ADR 0049).
 *
 * The mapping below MUST stay in sync with the `Reciter` type in
 * app/types/recitation.ts (qdc-provider.ts's own getReciters was removed when
 * this script replaced it — ADR 0049). Run manually when QDC's reciter roster
 * changes: `npm run generate:quran-reciters`. Output is committed, so dev and
 * prod serve it identically.
 */
const fs = require("fs");
const path = require("path");

const QDC_BASE_URL = "https://api.qurancdn.com/api/qdc";
const LOCALES = ["ar", "en"];

async function generateForLocale(locale) {
  const res = await fetch(`${QDC_BASE_URL}/audio/reciters?language=${locale}`);
  if (!res.ok) {
    throw new Error(`QDC reciters request failed for locale "${locale}": ${res.status}`);
  }

  const { reciters } = await res.json();

  // Mirrors the Reciter shape (app/types/recitation.ts) that qdc-provider.ts's
  // now-removed getReciters used to produce.
  const mapped = reciters.map((r) => ({
    id: r.id,
    name: r.name,
    translatedName: r.translated_name?.name ?? r.name,
    style: r.style?.name ?? null,
  }));

  const outFile = path.join(__dirname, `../../public/quran/reciters-${locale}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(mapped));
  console.log(`Done — wrote ${mapped.length} reciters → public/quran/reciters-${locale}.json`);
}

async function main() {
  for (const locale of LOCALES) {
    console.log(`Generating static reciters JSON for locale "${locale}"`);
    await generateForLocale(locale);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
