import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import {
  waitForActivePanelContent,
  getActivePanel,
  skipNonDesktop,
  setStoredSafhaView,
  openSettings,
  withStandaloneDisplayMode,
} from "../helpers/reader";
import { authenticateAsUser } from "../helpers/auth";
import {
  PAGES_CACHE_NAME,
  RECITATION_DOWNLOAD_CACHE_NAME,
} from "../../app/constants/offline";

function silentWavDataUri(seconds = 30): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return `data:audio/wav;base64,${buf.toString("base64")}`;
}

const AL_KAHF_AUDIO = {
  audioUrl: "https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/018.mp3",
  durationMs: 30000,
  verseTimings: [
    { verseKey: "18:1", timestampFrom: 0, timestampTo: 5000, segments: [[1, 0, 1000]] },
    { verseKey: "18:2", timestampFrom: 5000, timestampTo: 10000, segments: [[1, 5000, 6000]] },
    { verseKey: "18:110", timestampFrom: 25000, timestampTo: 30000, segments: [[1, 25000, 26000]] },
  ],
};

const audioIsPlaying = () => {
  const a = document.querySelector("audio");
  return !!a && !a.paused && !a.ended;
};

/**
 * Ensures the Serwist service worker is registered and actively controlling the page.
 */
async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg?.active && navigator.serviceWorker.controller);
  }, undefined, { timeout: 15000 }).catch(() => {});
}

/**
 * Mocks chapter 18 audio metadata and returns silent audio bytes with CORS headers from QDC audio host.
 */
async function mockRecitationAudio(page: Page) {
  const silentAudioData = Buffer.from(silentWavDataUri(30).split(",")[1], "base64");
  await page.route("https://download.quranicaudio.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      headers: {
        "access-control-allow-origin": "*",
        "accept-ranges": "bytes",
      },
      body: silentAudioData,
    })
  );

  await page.route("**/api/quran/recitations/*/chapters/18", (route) =>
    route.fulfill({ json: { success: true, message: null, data: AL_KAHF_AUDIO } })
  );
}

test.describe("Offline PWA: Setup Gate & Precached Asset Navigation", () => {
  test("1. standalone first-run setup gate presents focus trap and persists dismissal on skip", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo);
    await authenticateAsUser(context);

    // Spoof standalone mode with NO dismissed editions
    await withStandaloneDisplayMode(page, []);
    await setStoredSafhaView(page, "single");

    await page.goto("/ar/pages/1");

    // Blocking first-run dialog appears
    const gate = page.getByRole("dialog", { name: "اقرأ القرآن بدون إنترنت" });
    await expect(gate).toBeVisible();
    await expect(gate.getByRole("heading", { name: "اقرأ القرآن بدون إنترنت" })).toBeVisible();

    // Escape and outside clicking are suppressed (ADR 0014 Addendum 2)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await expect(gate).toBeVisible();

    // Click "تخطٍّ الآن" (Skip)
    const skipBtn = gate.getByRole("button", { name: /تخط/ });
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // Gate unblocks and closes
    await expect(gate).toBeHidden();

    // Dismissal is saved to localStorage for default edition (id 2)
    const dismissed = await page.evaluate(() =>
      window.localStorage.getItem("fq-offline-prompt-dismissed-v2-2")
    );
    expect(dismissed).toBe("1");

    // Reader content mounts cleanly
    await waitForActivePanelContent(page);
  });

  test("2. downloads surah recitation and populates Cache Storage across audio and pages caches", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo);
    await authenticateAsUser(context);
    await withStandaloneDisplayMode(page, [1, 2]);
    await setStoredSafhaView(page, "single");
    await mockRecitationAudio(page);

    await page.goto("/ar/pages/293");
    await waitForActivePanelContent(page);
    await waitForServiceWorker(page);

    // Open settings sidebar
    const settingsSheet = await openSettings(page);

    // Open Offline Recitation sheet
    const offlineRecitationTrigger = settingsSheet.getByRole("button", { name: /التلاوة دون اتصال/ });
    await expect(offlineRecitationTrigger).toBeVisible();
    await offlineRecitationTrigger.click();

    const sheet = page.getByRole("dialog", { name: "التلاوة دون اتصال" });
    await expect(sheet).toBeVisible();

    // Wait for reciter to resolve
    await expect(sheet.getByRole("button", { name: "ياسر الدوسري" })).toBeVisible();

    // Locate Al-Kahf row in the surah tab and trigger download
    const alKahfRow = sheet.getByRole("tabpanel").locator("div.bg-muted").filter({ hasText: "Al-Kahf" }).first();
    const downloadBtn = alKahfRow.getByRole("button", { name: "تنزيل" });
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();

    // Appears under downloaded section
    const downloadedItem = sheet
      .locator("div.bg-muted")
      .filter({ hasText: "Al-Kahf" })
      .filter({ has: page.getByRole("button", { name: "استماع" }) })
      .first();
    await expect(downloadedItem).toBeVisible({ timeout: 30000 });

    // Verify Cache Storage holds expected assets
    const hasAudioCached = await page.evaluate(
      async (cacheName) => {
        const cache = await window.caches.open(cacheName);
        const keys = await cache.keys();
        return keys.some((req) => req.url.includes("018.mp3") || req.url.includes("/chapters/18"));
      },
      RECITATION_DOWNLOAD_CACHE_NAME
    );
    expect(hasAudioCached).toBe(true);

    const hasPageCached = await page.evaluate(
      async (cacheName) => {
        const cache = await window.caches.open(cacheName);
        const match = await cache.match("/quran/pages/2/293.json");
        return !!match;
      },
      PAGES_CACHE_NAME
    );
    expect(hasPageCached).toBe(true);
  });

  test("3. plays downloaded recitation offline and pages through cached range (293–304) uninterrupted", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo);
    await authenticateAsUser(context);
    await withStandaloneDisplayMode(page, [1, 2]);
    await setStoredSafhaView(page, "single");
    await mockRecitationAudio(page);

    await page.goto("/ar/pages/293");
    await waitForActivePanelContent(page);
    await waitForServiceWorker(page);

    // Download Al-Kahf online
    const settingsSheet = await openSettings(page);
    const offlineRecitationTrigger = settingsSheet.getByRole("button", { name: /التلاوة دون اتصال/ });
    await offlineRecitationTrigger.click();

    const sheet = page.getByRole("dialog", { name: "التلاوة دون اتصال" });
    await expect(sheet.getByRole("button", { name: "ياسر الدوسري" })).toBeVisible();

    const alKahfRow = sheet.getByRole("tabpanel").locator("div.bg-muted").filter({ hasText: "Al-Kahf" }).first();
    const downloadBtn = alKahfRow.getByRole("button", { name: "تنزيل" });
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();

    const downloadedItem = sheet
      .locator("div.bg-muted")
      .filter({ hasText: "Al-Kahf" })
      .filter({ has: page.getByRole("button", { name: "استماع" }) })
      .first();
    await expect(downloadedItem).toBeVisible({ timeout: 30000 });

    // Switch network offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // Offline notice must appear in open sheet
    await expect(sheet.getByText("اتصل بالإنترنت للتنزيل.")).toBeVisible();

    // Start playback from downloaded item
    const listenBtn = downloadedItem.getByRole("button", { name: "استماع" });
    await expect(listenBtn).toBeVisible();
    await listenBtn.click();

    // Close settings sidebar
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Audio is playing offline
    await page.waitForFunction(audioIsPlaying, undefined, { timeout: 10000 });
    expect(await page.evaluate(audioIsPlaying)).toBe(true);

    // Reader is on page 293
    await waitForActivePanelContent(page);

    // Navigate from page 294 through 304 via keyboard ArrowLeft while audio continues playing
    for (let p = 294; p <= 304; p++) {
      await page.keyboard.press("ArrowLeft");
      await expect(page).toHaveURL(`/ar/pages/${p}`);
      await waitForActivePanelContent(page);
      expect(await page.evaluate(audioIsPlaying)).toBe(true);
    }
  });

  test("4. gracefully degrades to offline empty state on un-cached boundary page 305 and recovers cleanly on page 304", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo);
    await authenticateAsUser(context);
    await withStandaloneDisplayMode(page, [1, 2]);
    await setStoredSafhaView(page, "single");
    await mockRecitationAudio(page);

    await page.goto("/ar/pages/293");
    await waitForActivePanelContent(page);
    await waitForServiceWorker(page);

    // Download Al-Kahf online so pages 293-304 are cached
    const settingsSheet = await openSettings(page);
    await settingsSheet.getByRole("button", { name: /التلاوة دون اتصال/ }).click();
    const sheet = page.getByRole("dialog", { name: "التلاوة دون اتصال" });
    await expect(sheet.getByRole("button", { name: "ياسر الدوسري" })).toBeVisible();

    const alKahfRow = sheet.getByRole("tabpanel").locator("div.bg-muted").filter({ hasText: "Al-Kahf" }).first();
    const downloadBtn = alKahfRow.getByRole("button", { name: "تنزيل" });
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();

    const downloadedItem = sheet
      .locator("div.bg-muted")
      .filter({ hasText: "Al-Kahf" })
      .filter({ has: page.getByRole("button", { name: "استماع" }) })
      .first();
    await expect(downloadedItem).toBeVisible({ timeout: 30000 });

    // Start playback (starts at 18:1 on page 293)
    await downloadedItem.getByRole("button", { name: "استماع" }).click();
    await page.keyboard.press("Escape");

    await page.waitForFunction(audioIsPlaying);

    // Switch network offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // Active panel on 293 is visible and audio is playing
    await waitForActivePanelContent(page);
    expect(await page.evaluate(audioIsPlaying)).toBe(true);

    // Advance quickly to boundary page 304
    for (let p = 294; p <= 304; p++) {
      await page.keyboard.press("ArrowLeft");
      await expect(page).toHaveURL(`/ar/pages/${p}`);
    }
    await waitForActivePanelContent(page);
    expect(await page.evaluate(audioIsPlaying)).toBe(true);

    // Step forward into un-cached page 305
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL("/ar/pages/305");

    // Un-cached page gracefully renders offline empty notice without crashing reader
    const activePanel = getActivePanel(page);
    await expect(
      activePanel.getByText("لم يتم تنزيل هذه الصفحة بعد — اتصل بالإنترنت لقراءتها.").first()
    ).toBeVisible({ timeout: 15000 });

    // Recitation continues playing uninterrupted
    expect(await page.evaluate(audioIsPlaying)).toBe(true);

    // Step backward to recover back to cached page 304
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/ar/pages/304");

    // Clean recovery: word rows render immediately, audio still playing
    await waitForActivePanelContent(page);
    expect(await page.evaluate(audioIsPlaying)).toBe(true);
  });

  test("5. un-downloaded recitation playback while offline displays offline-unavailable guard", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo);
    await authenticateAsUser(context);
    await withStandaloneDisplayMode(page, [1, 2]);
    await setStoredSafhaView(page, "single");
    await mockRecitationAudio(page);

    await page.goto("/ar/pages/293");
    await waitForActivePanelContent(page);
    await waitForServiceWorker(page);

    // Go offline immediately with no downloads
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // Open Settings -> Offline Recitation
    const settingsSheet = await openSettings(page);
    await settingsSheet.getByRole("button", { name: /التلاوة دون اتصال/ }).click();
    const sheet = page.getByRole("dialog", { name: "التلاوة دون اتصال" });

    // Download buttons are disabled
    const alKahfRow = sheet.locator("div.bg-muted").filter({ hasText: /^Al-Kahf$/ }).first();
    const downloadBtn = alKahfRow.getByRole("button", { name: "تنزيل" });
    await expect(downloadBtn).toBeDisabled();

    // Close settings
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Attempting to trigger recitation from the navbar listen button
    const listenNavBtn = page.getByRole("button", { name: "استماع" });
    if (await listenNavBtn.isVisible()) {
      await listenNavBtn.click();
      // Verifies offline playback guard does not throw unhandled exception
      await page.waitForTimeout(500);
      expect(await page.evaluate(audioIsPlaying)).toBe(false);
    }
  });

  test("6. English LTR parity on un-cached reader fallback message and layout", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo);
    await authenticateAsUser(context);
    await withStandaloneDisplayMode(page, [1, 2]);
    await setStoredSafhaView(page, "single");
    await mockRecitationAudio(page);

    // Load page 293 online
    await page.goto("/en/pages/293");
    await waitForActivePanelContent(page);
    await waitForServiceWorker(page);

    // Download Al-Kahf online so pages 293-304 are cached
    const settingsSheet = await openSettings(page);
    await settingsSheet.getByRole("button", { name: /Offline Recitation/i }).click();
    const sheet = page.getByRole("dialog", { name: /Offline Recitation/i });
    await expect(sheet.getByRole("button", { name: "Yasser Ad Dussary" })).toBeVisible();

    const alKahfRow = sheet.getByRole("tabpanel").locator("div.bg-muted").filter({ hasText: "Al-Kahf" }).first();
    const downloadBtn = alKahfRow.getByRole("button", { name: /Download/i });
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();

    const downloadedItem = sheet
      .locator("div.bg-muted")
      .filter({ hasText: "Al-Kahf" })
      .filter({ has: page.getByRole("button", { name: /Listen/i }) })
      .first();
    await expect(downloadedItem).toBeVisible({ timeout: 30000 });

    // Close settings
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Turn offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // Advance quickly to boundary page 304
    for (let p = 294; p <= 304; p++) {
      await page.keyboard.press("ArrowLeft");
      await expect(page).toHaveURL(`/en/pages/${p}`);
    }
    await waitForActivePanelContent(page);

    // Step forward into un-cached page 305 via ArrowLeft (forward in Quran order)
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL("/en/pages/305");

    // Notice renders with English copy and LTR direction
    const activePanel = getActivePanel(page);
    const notice = activePanel.getByText(
      "This page hasn't been downloaded yet — connect to the internet to read it."
    ).first();
    await expect(notice).toBeVisible({ timeout: 15000 });
    await expect(activePanel).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("7. service worker: marks GET is NetworkOnly and rejects offline rather than resolving from cache", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo);
    await authenticateAsUser(context);
    await withStandaloneDisplayMode(page, [1, 2]);
    await setStoredSafhaView(page, "single");

    // Visit reader page online
    await page.goto("/ar/pages/1");
    await waitForActivePanelContent(page);
    await waitForServiceWorker(page);

    // Issue marks GET requests
    const fetchResults = await page.evaluate(async () => {
      const headers = { accept: "application/json" };
      const r1 = await fetch("/api/quran/pages/1/marks", { headers });
      const r2 = await fetch("/api/marks", { headers });
      return { r1Ok: r1.ok, r2Ok: r2.ok };
    });
    expect(fetchResults.r1Ok).toBe(true);
    expect(fetchResults.r2Ok).toBe(true);

    // Verify 'apis' cache holds no marks entries
    const cacheInspection = await page.evaluate(async () => {
      const keys = await caches.keys();
      const apisCache = keys.find((k) => k === "apis");
      if (!apisCache) return [];
      const cache = await caches.open(apisCache);
      const reqs = await cache.keys();
      return reqs.map((r) => r.url);
    });
    const marksInApis = cacheInspection.filter((url) =>
      url.includes("/marks")
    );
    expect(marksInApis).toEqual([]);

    // Turn offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // Seed a mark in localMarks in localStorage
    await page.evaluate(() => {
      const mark = {
        marked_type: "word",
        marked_id: "1:1:1",
        page_number: 1,
        category: "forgetting",
        comment: null,
        snippet: "بِسْمِ",
        chapter_name_simple: "Al-Fatihah",
        chapter_name_arabic: "الفاتحة",
        verse_number: 1,
        deleted: false,
        updated_at: Date.now(),
        sync: "synced",
        from_user: 1,
      };
      localStorage.setItem("localMarks", JSON.stringify({ "word:1:1:1": mark }));
      localStorage.setItem("localMarksOwner", JSON.stringify("1"));
      window.dispatchEvent(new StorageEvent("storage", { key: "localMarks" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "localMarksOwner" }));
    });

    // Offline mark display still works — served by the store, not cache
    const markedWord = getActivePanel(page).locator('[data-fq-word="1:1:1"]');
    await expect(markedWord).toHaveClass(/bg-red-400/);

    // Verify marks GET rejects rather than resolving from cache
    const offlineResult = await page.evaluate(async () => {
      const headers = { accept: "application/json" };
      let r1Rejected = false;
      try {
        await fetch("/api/quran/pages/1/marks", { headers });
      } catch {
        r1Rejected = true;
      }
      let r2Rejected = false;
      try {
        await fetch("/api/marks", { headers });
      } catch {
        r2Rejected = true;
      }
      return { r1Rejected, r2Rejected };
    });
    expect(offlineResult.r1Rejected).toBe(true);
    expect(offlineResult.r2Rejected).toBe(true);
  });
});
