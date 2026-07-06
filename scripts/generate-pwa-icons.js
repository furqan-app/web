// One-off generator: renders public/icon.svg to the PNG sizes the web app
// manifest needs. Re-run manually if icon.svg's design ever changes.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const publicDir = path.join(__dirname, "..", "public");
const outDir = path.join(publicDir, "icons");
fs.mkdirSync(outDir, { recursive: true });

const sourceSvg = fs.readFileSync(path.join(publicDir, "icon.svg"), "utf8");

// Maskable variant: full-bleed square background (OS applies its own mask
// shape, so rounded corners here would just be redundant) and the glyph
// scaled/recentered so its bounding-box corners stay inside the 80% safe-zone
// circle (radius 40 from center) that Android's adaptive-icon spec requires.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#16232F"/>
  <g transform="translate(23.6,23.6) scale(2.2)" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </g>
</svg>`;

async function main() {
  await sharp(Buffer.from(sourceSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, "icon-192.png"));

  await sharp(Buffer.from(sourceSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, "icon-512.png"));

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, "icon-maskable-512.png"));

  console.log("Generated PWA icons in public/icons/");
}

main();
