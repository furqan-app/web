#!/usr/bin/env node
/**
 * Reader screenshot + geometry probe, at an exact viewport.
 *
 * Why this exists: the MCP/headed browser clamps its viewport at ~1600px, which
 * puts the entire tablet band (1024–1366px) out of reach — so tablet visuals
 * could not be verified at all. This drives system Chrome headless instead, at
 * any size, and writes a PNG you can sample with PIL.
 *
 * Depth changes on dark surfaces MUST be verified by sampling rendered pixels,
 * not by reading the CSS: the dark background is RGB (7,15,23), so a shadow can
 * be perfectly correct in the cascade and produce no visible pixels. See
 * ADR 0032.
 *
 * Playwright's own browsers are not installed in this repo (installing them is a
 * ~150MB download); we point it at the system Chrome instead.
 *
 * Usage:
 *   node scripts/dev/reader-shot.mjs <width> <height> <theme> <out.png> [extra.css] [url]
 *
 *   theme: dark | light | gold
 *   extra.css: optional stylesheet injected after load — use it to probe a
 *              candidate treatment WITHOUT editing globals.css first.
 *
 * Prints the measured card/stack rectangles as JSON, so sample points can be
 * derived from real geometry. Do not guess viewport fractions: the pager mounts
 * three panels side by side, so the visible spread occupies only part of the
 * viewport and a fraction like 0.955 lands on the desk, not the paper.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const [width, height, theme = "dark", out, cssFile, url] = process.argv.slice(2);

if (!width || !height || !out) {
  console.error("usage: node scripts/dev/reader-shot.mjs <width> <height> <theme> <out.png> [extra.css] [url]");
  process.exit(1);
}

const PORT = process.env.PORT ?? 7001;
const target = url ?? `http://localhost:${PORT}/ar/pages/51`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable",
});
const ctx = await browser.newContext({
  viewport: { width: +width, height: +height },
  deviceScaleFactor: 1,
  hasTouch: true,
});
const page = await ctx.newPage();

// Theme + view are read from localStorage by the pre-paint script in layout.tsx.
await page.addInitScript((t) => {
  localStorage.setItem("theme", JSON.stringify(t));
  localStorage.setItem("quranSafhaView", JSON.stringify("double"));
}, theme);

await page.goto(target, { waitUntil: "networkidle" });
if (cssFile) await page.addStyleTag({ content: fs.readFileSync(cssFile, "utf8") });
await page.waitForTimeout(700); // let fonts settle so text isn't sampled mid-swap

const geometry = await page.evaluate(() => {
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) };
  };
  // The pager parks neighbour panels a full viewport to either side; keep only
  // what actually overlaps the viewport. This must be a real overlap test, not a
  // loose margin: a neighbour panel's card can start just past the right edge and
  // still pass a "within 100px" check, and then every sample point derived from
  // it lands outside the screenshot.
  const onScreen = (r) => r && r.x < window.innerWidth && r.right > 0;
  const visible = (sel) => [...document.querySelectorAll(sel)]
    .filter((el) => getComputedStyle(el).display !== "none")
    .map(rect)
    .filter(onScreen);

  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    theme: document.documentElement.className,
    spread: visible(".fq-spread")[0] ?? null,
    cards: visible(".fq-spread .fq-safha-card"),
    stackLayers: visible(".fq-spread .fq-stack-layer"),
    navArrows: visible(".fq-nav-arrow"),
    recitationBar: rect(document.querySelector(".fq-recitation-bar")),
  };
});

await page.screenshot({ path: out });
console.log(JSON.stringify(geometry, null, 1));
await browser.close();
