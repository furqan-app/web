import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  openSettings,
  revealNavOverlay,
} from "../helpers/reader";
import { authenticateAsUser } from "../helpers/auth";

// Locale switching & bi-directional reader navigation (Issue #474, epic #466).
// Covers ar (RTL, default) <-> en (LTR) switches mid-reader-journey: page and
// query preservation, layout-dir flip with Quran-correct reading order,
// locale-independent arrow keys, and clean recitation teardown on switch.

// Opens the settings sheet, expands the language section, and picks `target`.
async function switchLocaleViaSettings(
  page: Page,
  target: "English" | "العربية",
) {
  const sheet = await openSettings(page);
  await sheet.getByRole("button", { name: /اللغة|Language/ }).click();
  await sheet
    .locator(".fq-section-drawer")
    .getByRole("button", { name: target, exact: true })
    .click();
}

const rootDir = (page: Page) =>
  page.evaluate(
    () => document.querySelector("div[dir]")?.getAttribute("dir") ?? "none",
  );

const audioIsPlaying = () => {
  const a = document.querySelector("audio");
  return !!a && !a.paused && !a.ended;
};
const audioIsPaused = () => {
  const a = document.querySelector("audio");
  return !a || a.paused;
};

// 25s silent WAV per the recitation-lifecycle pattern: playback never reaches
// a verse boundary mid-test, so the recited page stays put.
function silentWavDataUri(seconds = 25): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2; // 16-bit mono
  const buf = Buffer.alloc(44 + dataSize); // zero-filled -> silence
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return `data:audio/wav;base64,${buf.toString("base64")}`;
}

const AL_FATIHA_AUDIO = {
  audioUrl: silentWavDataUri(),
  durationMs: 21000,
  verseTimings: Array.from({ length: 7 }, (_, i) => ({
    verseKey: `1:${i + 1}`,
    timestampFrom: i * 3000,
    timestampTo: (i + 1) * 3000,
    segments: [[1, i * 3000, i * 3000 + 500]],
  })),
};

async function mockRecitationApis(page: Page) {
  await page.route("**/api/quran/recitations/**", (route) =>
    route.fulfill({
      json: { success: true, message: null, data: AL_FATIHA_AUDIO },
    }),
  );
  await page.route("**/stop-point**", (route) =>
    route.fulfill({
      json: {
        success: true,
        message: null,
        data: { verseKey: "1:7", chapterId: 1 },
      },
    }),
  );
}

test.describe("Locale switching & bi-directional reader navigation", () => {
  test("switching locale preserves the reader page in both directions", async ({
    page,
  }) => {
    await page.goto("/ar/pages/5");
    await waitForReaderContent(page);

    await switchLocaleViaSettings(page, "English");
    await expect(page).toHaveURL("/en/pages/5");
    await waitForReaderContent(page);

    await switchLocaleViaSettings(page, "العربية");
    await expect(page).toHaveURL("/ar/pages/5");
    await waitForReaderContent(page);
  });

  test("switching locale preserves highlight query params", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1?highlight=1:2&highlight-type=selection");
    await waitForReaderContent(page);

    // Highlight is applied before the switch...
    const verse12Words = getActivePanel(page).locator('[data-fq-word^="1:2:"]');
    await expect(verse12Words.first()).toBeVisible();
    await expect(verse12Words.first()).toHaveClass(/bg-blue-200\/70/);

    await switchLocaleViaSettings(page, "English");

    // ...and survives it verbatim.
    await expect(page).toHaveURL(
      "/en/pages/1?highlight=1:2&highlight-type=selection",
    );
    await waitForReaderContent(page);
    const enVerse12Words = getActivePanel(page).locator(
      '[data-fq-word^="1:2:"]',
    );
    await expect(enVerse12Words.first()).toBeVisible();
    await expect(enVerse12Words.first()).toHaveClass(/bg-blue-200\/70/);
  });

  test("layout direction flips while mushaf reading order stays right-to-left", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    expect(await rootDir(page)).toBe("rtl");
    const arRow = getActivePanel(page).locator(".fq-safha-row").first();
    await expect(arRow).toHaveClass(/flex-row/);
    await expect(arRow).not.toHaveClass(/flex-row-reverse/);

    await page.goto("/en/pages/1");
    await waitForReaderContent(page);

    expect(await rootDir(page)).toBe("ltr");
    const enRow = getActivePanel(page).locator(".fq-safha-row").first();
    await expect(enRow).toHaveClass(/flex-row-reverse/);

    // First DOM word still renders rightmost (descending left offsets).
    const lefts = await enRow
      .locator("[data-fq-word]")
      .evaluateAll((els) =>
        els.slice(0, 3).map((el) => el.getBoundingClientRect().left),
      );
    expect(lefts.length).toBeGreaterThan(1);
    expect(lefts[0]).toBeGreaterThan(lefts[lefts.length - 1]);
  });

  test("arrow keys stay Quran-ordered across a live locale switch", async ({
    page,
  }, testInfo) => {
    // Mobile is single-page (steps of 1); desktop defaults to double-spread
    // (steps of a pair). Both stay Quran-ordered regardless of LTR locale.
    const forwardUrl =
      testInfo.project.name === "mobile" ? "/en/pages/2" : "/en/pages/3";
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    await switchLocaleViaSettings(page, "English");
    await expect(page).toHaveURL("/en/pages/1");
    await waitForReaderContent(page);

    // ArrowLeft stays forward in Quran order even in LTR.
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(forwardUrl);
    await waitForReaderContent(page);

    // ArrowRight stays backward: back to page 1.
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/en/pages/1");
    await waitForReaderContent(page);
  });

  test("recitation stops cleanly on locale switch", async ({
    page,
    context,
  }: {
    page: Page;
    context: BrowserContext;
  }, testInfo) => {
    const errors: Error[] = [];
    page.on("pageerror", (e) => errors.push(e));

    await authenticateAsUser(context);
    await mockRecitationApis(page);
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    // Mobile keeps the player bar in the nav overlay: reveal it first.
    await revealNavOverlay(page);
    await page.getByRole("button", { name: "استماع" }).click();
    await page.waitForFunction(audioIsPlaying);

    await switchLocaleViaSettings(page, "English");
    await expect(page).toHaveURL("/en/pages/1");
    await waitForReaderContent(page);

    // Provider remounts with the locale layout: no orphan audio, no crash,
    // and the reader stays usable.
    await page.waitForFunction(audioIsPaused);
    expect(errors).toEqual([]);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(
      testInfo.project.name === "mobile" ? "/en/pages/2" : "/en/pages/3",
    );
  });
});
