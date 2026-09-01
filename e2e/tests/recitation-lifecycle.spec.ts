import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  skipNonDesktop,
  skipNonMobile,
  swipeReader,
  revealNavOverlay,
} from "../helpers/reader";
import { authenticateAsUser } from "../helpers/auth";

// Recitation lifecycle vs. active browsing & cross-route jumps (Issue #467 / ADR 0050).
// Playback is app-wide: leaving the reader or navigating to another page never stops it.
// A detached follow surfaces RecitationReturnPanel, which navigates back and can stop.

test.describe.configure({ mode: "serial" });

// 3-second silent WAV per verse window, 25s total — long enough that a test's
// worth of real playback never reaches a verse boundary or the chapter end, so
// the recited verse (and page) stay put while we exercise navigation.
function silentWavDataUri(seconds = 25): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2; // 16-bit mono
  const buf = Buffer.alloc(44 + dataSize); // Buffer.alloc zero-fills → silence
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
    route.fulfill({ json: { success: true, message: null, data: AL_FATIHA_AUDIO } }),
  );
  // stopPoint "page" (the default) resolves to the last verse of page 1.
  await page.route("**/stop-point**", (route) =>
    route.fulfill({
      json: { success: true, message: null, data: { verseKey: "1:7", chapterId: 1 } },
    }),
  );
}

const audioIsPlaying = () => {
  const a = document.querySelector("audio");
  return !!a && !a.paused && !a.ended;
};

async function startRecitationOnPage1(page: Page, context: BrowserContext) {
  await authenticateAsUser(context);
  await mockRecitationApis(page);
  await page.goto("/ar/pages/1");
  await waitForReaderContent(page);

  await page.getByRole("button", { name: "استماع" }).click();
  await page.waitForFunction(audioIsPlaying);
}

// Off-reader surface.
const returnPill = (page: Page) => page.locator(".fq-recitation-return-pill");
// On-reader, the "back to page N" affordance lives inside RecitationPlayerBar.
const barReturnButton = (page: Page) =>
  page.locator(".fq-recitation-bar").getByRole("button", { name: /العودة إلى صفحة/ });

test.describe("Recitation lifecycle vs. navigation", () => {
  test("playback survives leaving the reader; the return pill brings it back", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Audio interactions");
    await startRecitationOnPage1(page, context);

    // Leave the reader route entirely, client-side (the logo → home).
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/ar");

    // Playback did NOT stop, and the return pill has taken over.
    expect(await page.evaluate(audioIsPlaying)).toBe(true);
    await expect(returnPill(page)).toBeVisible();
    await expect(page.locator(".fq-recitation-bar")).toHaveCount(0);

    // Return → back on the recited page, pill gone, still playing.
    await returnPill(page).getByRole("link", { name: /العودة إلى صفحة/ }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
    await expect(returnPill(page)).toBeHidden();
    expect(await page.evaluate(audioIsPlaying)).toBe(true);
  });

  test("paging away in the reader does not snap back; the bar's return button re-attaches", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Audio interactions");
    await startRecitationOnPage1(page, context);

    // On the recited page, no return affordance and no floating pill.
    await expect(barReturnButton(page)).toBeHidden();
    await expect(returnPill(page)).toBeHidden();

    // Page away from the recited page using the in-spread Next arrow.
    await getActivePanel(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).not.toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);

    // No forced snap-back, no floating pill on the reader — the way back is in
    // the player bar, whose band the reader already reserves.
    await expect(barReturnButton(page)).toBeVisible();
    await expect(returnPill(page)).toBeHidden();
    await page.waitForTimeout(600);
    await expect(page).not.toHaveURL("/ar/pages/1");
    expect(await page.evaluate(audioIsPlaying)).toBe(true);

    await barReturnButton(page).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await expect(barReturnButton(page)).toBeHidden();
  });

  test("mobile: swiping away from the recited page does not snap back", async ({
    page,
    context,
  }, testInfo) => {
    skipNonMobile(testInfo, "Touch swipe gesture");
    await authenticateAsUser(context);
    await mockRecitationApis(page);
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    await revealNavOverlay(page);
    await page.getByRole("button", { name: "استماع" }).click();
    await page.waitForFunction(audioIsPlaying);

    // Swipe forward (Quran RTL: drag right) off the recited page.
    await swipeReader(page, 140);
    await expect(page).not.toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);

    await expect(barReturnButton(page)).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page).not.toHaveURL("/ar/pages/1");
    expect(await page.evaluate(audioIsPlaying)).toBe(true);

    await barReturnButton(page).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await expect(barReturnButton(page)).toBeHidden();
  });

  test("the pill's Stop ends playback", async ({ page, context }, testInfo) => {
    skipNonDesktop(testInfo, "Audio interactions");
    await startRecitationOnPage1(page, context);

    await page.getByRole("link", { name: "Home" }).click();
    await expect(returnPill(page)).toBeVisible();

    await returnPill(page).getByRole("button", { name: "إيقاف", exact: true }).click();
    await expect(returnPill(page)).toBeHidden();
    await page.waitForFunction(() => {
      const a = document.querySelector("audio");
      return !a || a.paused;
    });
  });

  test("the pill can pause and resume an off-reader session", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Audio interactions");
    await startRecitationOnPage1(page, context);

    await page.getByRole("link", { name: "Home" }).click();
    await expect(returnPill(page)).toBeVisible();

    await returnPill(page).getByRole("button", { name: "إيقاف مؤقت" }).click();
    await page.waitForFunction(() => {
      const a = document.querySelector("audio");
      return !!a && a.paused;
    });
    await expect(returnPill(page)).toBeVisible();

    await returnPill(page).getByRole("button", { name: "متابعة" }).click();
    await page.waitForFunction(audioIsPlaying);
  });
});
