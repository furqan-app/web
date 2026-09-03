import { test, expect, type Page } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  skipNonDesktop,
} from "../helpers/reader";
import { clearAuth, clearUserMarks, authenticateAsUser } from "../helpers/auth";
import {
  createE2EGrant,
  clearAllGrantsAndCodes,
  seedTestUsers,
  SECONDARY_E2E_USER,
} from "../helpers/mushaf";

// Silent WAV audio generator for mocking playback
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

// Mock audio for Surah Al-Baqarah crossing from 2:5 (Page 2) to 2:6 (Page 3)
const BAQARAH_PAGE_BOUNDARY_AUDIO = {
  audioUrl: silentWavDataUri(30),
  durationMs: 30000,
  verseTimings: [
    { verseKey: "2:1", timestampFrom: 0, timestampTo: 1000, segments: [[1, 0, 500]] },
    { verseKey: "2:2", timestampFrom: 1000, timestampTo: 2000, segments: [[1, 1000, 1500]] },
    { verseKey: "2:3", timestampFrom: 2000, timestampTo: 3000, segments: [[1, 2000, 2500]] },
    { verseKey: "2:4", timestampFrom: 3000, timestampTo: 4000, segments: [[1, 3000, 3500]] },
    { verseKey: "2:5", timestampFrom: 4000, timestampTo: 6000, segments: [[1, 4000, 4500]] },
    { verseKey: "2:6", timestampFrom: 6000, timestampTo: 10000, segments: [[1, 6000, 6500]] },
  ],
};

const FATIHA_AUDIO = {
  audioUrl: silentWavDataUri(30),
  durationMs: 25000,
  verseTimings: Array.from({ length: 7 }, (_, i) => ({
    verseKey: `1:${i + 1}`,
    timestampFrom: i * 3000,
    timestampTo: (i + 1) * 3000,
    segments: [[1, i * 3000, i * 3000 + 500]],
  })),
};

async function openTafsirForWord(page: Page, wordLocation: string) {
  const word = getActivePanel(page)
    .locator(`[data-fq-word="${wordLocation}"]`)
    .first();
  await expect(word).toBeVisible();
  await word.click();

  const markModal = page.locator('[role="dialog"].bg-card');
  await expect(markModal).toBeVisible();

  const tafsirBtn = markModal.getByRole("button", { name: /تفسير الآية|Tafsir/ });
  await expect(tafsirBtn).toBeVisible();
  await tafsirBtn.click();

  // Wait for mark modal to close before locating the open TafsirSheet dialog
  await expect(markModal).toBeHidden();

  const tafsirSheet = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByRole("button", { name: /الآية التالية|الآية السابقة|Next|Previous/ }) });
  await expect(tafsirSheet).toBeVisible();
  return tafsirSheet;
}

test.describe("Tafsir Sheet Integration & Page Boundary Interplay", () => {
  test.beforeEach(async ({ context, page }) => {
    await clearAuth(context);
    await clearUserMarks();
    await context.addInitScript(() => {
      localStorage.setItem("quranSafhaView", JSON.stringify("single"));
    });
    // Mock QDC public tafsir endpoint for deterministic responses & scrollable content.
    // The body is intentionally long so `.fq-scroll-nice` is guaranteed to overflow at
    // any CI viewport/build timing — the scroll-preservation assertions in the recitation
    // auto-advance test need a genuinely scrollable container (see
    // docs/plans/e2e-tafsir-page-boundaries-recitation.md).
    const longTafsirParagraph =
      "<p>تفسير الآية الكريمة وبيان معانيها العظيمة ودلالاتها البلاغية واللغوية، مع استطراد موسع في الفوائد المستنبطة والأحكام المتعلقة بها لضمان امتلاء الحاوية بمحتوى قابل للتمرير الرأسي واختبار استقرار موضع التمرير وعدم إعادة ضبطه.</p>";
    await page.route("https://api.qurancdn.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tafsir: {
            text: `
              ${longTafsirParagraph.repeat(40)}
              <p>قال تعالى: <span class="arabic qpc-hafs green">{ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ }</span> وهو الحي القيوم العظيم.</p>
            `,
          },
        }),
      })
    );
  });

  test("opens Tafsir sheet from MarkModal and supports edition switching & stepper navigation", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Word click is desktop-oriented");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const tafsirSheet = await openTafsirForWord(page, "1:1:1");
    await expect(tafsirSheet.getByText(/سورة الفاتحة/)).toBeVisible();

    // Verify default edition is Al-Muyassar
    await expect(tafsirSheet.getByText("التفسير الميسر")).toBeVisible();

    // Test Next Ayah button (advances to 1:2)
    const nextAyahBtn = tafsirSheet.getByRole("button", { name: "الآية التالية" });
    await expect(nextAyahBtn).toBeEnabled();
    await nextAyahBtn.click();
    await expect(tafsirSheet.getByText(/الآية ٢/)).toBeVisible();

    // Test Keyboard navigation (ArrowLeft advances to 1:3 in RTL)
    await page.keyboard.press("ArrowLeft");
    await expect(tafsirSheet.getByText(/الآية ٣/)).toBeVisible();

    // Test Previous Ayah button (goes back to 1:2)
    const prevAyahBtn = tafsirSheet.getByRole("button", { name: "الآية السابقة" });
    await expect(prevAyahBtn).toBeEnabled();
    await prevAyahBtn.click();
    await expect(tafsirSheet.getByText(/الآية ٢/)).toBeVisible();

    // Switch Tafsir edition via dropdown
    const editionTrigger = tafsirSheet.getByRole("button", { name: "اختر التفسير" });
    await expect(editionTrigger).toBeVisible();
    await editionTrigger.click();

    const ibnKathirOption = page.getByText(/تفسير ابن كثير/);
    await expect(ibnKathirOption).toBeVisible();
    await ibnKathirOption.click();
    await expect(tafsirSheet.getByText(/تفسير ابن كثير/)).toBeVisible();

    // Close the sheet via Escape key
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("manual forward and backward verse stepping across page boundaries turns the reader pager", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop verification");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Open Tafsir on 1:7:1 (last verse of Page 1)
    const tafsirSheet = await openTafsirForWord(page, "1:7:1");
    await expect(tafsirSheet.getByText(/سورة الفاتحة/)).toBeVisible();
    await expect(tafsirSheet.getByText(/الآية ٧/)).toBeVisible();

    // Step forward to 2:1 (first verse of Page 2)
    const nextAyahBtn = tafsirSheet.getByRole("button", { name: "الآية التالية" });
    await expect(nextAyahBtn).toBeEnabled();
    await nextAyahBtn.click();

    // Tafsir header updates to Surah Al-Baqarah Ayah 1
    await expect(tafsirSheet.getByText(/سورة البقرة/)).toBeVisible();
    await expect(tafsirSheet.getByText(/الآية ١/)).toBeVisible();

    // Underlying reader pager has turned to Page 2
    await expect(page).toHaveURL(/\/ar\/pages\/2$/);
    await expect(tafsirSheet).toBeVisible();

    // Step backward to 1:7 (Page 1)
    const prevAyahBtn = tafsirSheet.getByRole("button", { name: "الآية السابقة" });
    await expect(prevAyahBtn).toBeEnabled();
    await prevAyahBtn.click();

    // Tafsir header returns to Al-Fatihah 7
    await expect(tafsirSheet.getByText(/سورة الفاتحة/)).toBeVisible();
    await expect(tafsirSheet.getByText(/الآية ٧/)).toBeVisible();

    // Underlying reader pager turns back to Page 1
    await expect(page).toHaveURL(/\/ar\/pages\/1$/);
    await expect(tafsirSheet).toBeVisible();
  });

  test("double-page spread keeps visible facing page without jump, but jumps across spread pairs", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Spread testing");

    // Force double page view mode
    await page.addInitScript(() => {
      localStorage.setItem("quranSafhaView", JSON.stringify("double"));
    });

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Open Tafsir on 1:7 (right page of spread 1, 2)
    const tafsirSheet = await openTafsirForWord(page, "1:7:1");
    await expect(tafsirSheet.getByText(/الآية ٧/)).toBeVisible();

    // Step forward to 2:1 (left page of spread 1, 2)
    const nextAyahBtn = tafsirSheet.getByRole("button", { name: "الآية التالية" });
    await nextAyahBtn.click();
    await expect(tafsirSheet.getByText(/الآية ١/)).toBeVisible();

    // Page 2 is already visible in the spread: URL remains /ar/pages/1
    await expect(page).toHaveURL(/\/ar\/pages\/1$/);

    // Step forward through Page 2 verses to 2:6 (which is on Page 3, spread 3, 4)
    // 2:1 -> 2:2 -> 2:3 -> 2:4 -> 2:5 -> 2:6
    for (let i = 0; i < 5; i++) {
      await nextAyahBtn.click();
    }
    await expect(tafsirSheet.getByText(/الآية ٦/)).toBeVisible();

    // Crosses spread pair boundary: URL updates to /ar/pages/3
    await expect(page).toHaveURL(/\/ar\/pages\/3$/);
    await expect(tafsirSheet).toBeVisible();
  });

  test("recitation auto-advance across page boundaries leaves Tafsir open, independent, and unreset", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Recitation auto-advance");
    await authenticateAsUser(context);

    // Mock recitation endpoint with 2:5 -> 2:6 transition
    await page.route("**/api/quran/recitations/**", (route) =>
      route.fulfill({ json: { success: true, message: null, data: BAQARAH_PAGE_BOUNDARY_AUDIO } })
    );
    await page.route("**/stop-point**", (route) =>
      route.fulfill({
        json: { success: true, message: null, data: { verseKey: "2:25", chapterId: 2 } },
      })
    );

    await page.goto("/ar/pages/2");
    await waitForReaderContent(page);

    await page.getByRole("button", { name: "استماع" }).click();
    await page.waitForFunction(() => {
      const a = document.querySelector("audio");
      return !!a && !a.paused;
    });

    // Open Tafsir on 2:5:1 (Page 2)
    const tafsirSheet = await openTafsirForWord(page, "2:5:1");
    await expect(tafsirSheet.getByText(/الآية ٥/)).toBeVisible();

    // Scroll commentary down inside the sheet. Wait for the mocked commentary to
    // actually render and overflow before scrolling — openTafsirForWord only waits
    // for the sheet header, so the body may still be a non-overflowing skeleton.
    const scrollContainer = tafsirSheet.locator(".fq-scroll-nice");
    await expect
      .poll(() => scrollContainer.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 100;
    });
    // Let scroll-smooth settle before capturing the reference position.
    await expect
      .poll(() => scrollContainer.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    const initialScroll = await scrollContainer.evaluate((el) => el.scrollTop);

    // Simulate audio reaching 6.5s (verse 2:6, Page 3)
    await page.evaluate(() => {
      const a = document.querySelector("audio");
      if (a) {
        a.currentTime = 6.5;
        a.dispatchEvent(new Event("timeupdate"));
      }
    });

    // Reader pager auto-advances to Page 3 in background
    await expect(page).toHaveURL(/\/ar\/pages\/3$/);

    // Tafsir remains open, displays 2:5 (independent of recitation), and did not reset scroll
    await expect(tafsirSheet).toBeVisible();
    await expect(tafsirSheet.getByText(/الآية ٥/)).toBeVisible();
    // Scroll position is preserved across the auto-advance (no remount / reset).
    const postAdvanceScroll = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(Math.abs(postAdvanceScroll - initialScroll)).toBeLessThanOrEqual(2);
  });

  test("manual Tafsir step away from active recitation detaches follow; stepping back re-attaches", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Recitation follow detach");
    await authenticateAsUser(context);

    await page.route("**/api/quran/recitations/**", (route) =>
      route.fulfill({ json: { success: true, message: null, data: FATIHA_AUDIO } })
    );
    await page.route("**/stop-point**", (route) =>
      route.fulfill({
        json: { success: true, message: null, data: { verseKey: "1:7", chapterId: 1 } },
      })
    );

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Start playback on Page 1
    await page.getByRole("button", { name: "استماع" }).click();
    await page.waitForFunction(() => {
      const a = document.querySelector("audio");
      return !!a && !a.paused;
    });

    const returnStrip = page.locator(".fq-recitation-return-strip");
    await expect(returnStrip).toBeHidden();

    // Open Tafsir on 1:7:1 (Page 1)
    const tafsirSheet = await openTafsirForWord(page, "1:7:1");
    await expect(tafsirSheet.getByText(/الآية ٧/)).toBeVisible();

    // Step Tafsir forward to 2:1 (Page 2)
    const nextAyahBtn = tafsirSheet.getByRole("button", { name: "الآية التالية" });
    await nextAyahBtn.click();
    await expect(page).toHaveURL(/\/ar\/pages\/2$/);

    // Anchor is 2, audio is playing on Page 1 -> follow detaches, return strip surfaces
    await expect(returnStrip).toBeVisible();

    // Step Tafsir backward to 1:7 (Page 1)
    const prevAyahBtn = tafsirSheet.getByRole("button", { name: "الآية السابقة" });
    await prevAyahBtn.click();
    await expect(page).toHaveURL(/\/ar\/pages\/1$/);

    // Anchor is 1, audio is on Page 1 -> follow re-attaches, return strip hides
    await expect(returnStrip).toBeHidden();
  });

  test("bounds clamping at absolute Quran start (1:1) and end (114:6)", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Bounds clamping");

    // Start of Quran: 1:1 on Page 1
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const tafsirSheetStart = await openTafsirForWord(page, "1:1:1");
    const prevAyahBtn = tafsirSheetStart.getByRole("button", { name: "الآية السابقة" });
    await expect(prevAyahBtn).toBeDisabled();

    // Keyboard back arrow in RTL (ArrowRight) does nothing
    await page.keyboard.press("ArrowRight");
    await expect(tafsirSheetStart.getByText(/الآية ١/)).toBeVisible();
    await expect(page).toHaveURL(/\/ar\/pages\/1$/);

    await page.keyboard.press("Escape");

    // End of Quran: 114:6 on Page 604
    await page.goto("/ar/pages/604");
    await waitForReaderContent(page);

    const tafsirSheetEnd = await openTafsirForWord(page, "114:6:1");
    const nextAyahBtn = tafsirSheetEnd.getByRole("button", { name: "الآية التالية" });
    await expect(nextAyahBtn).toBeDisabled();

    // Keyboard forward arrow in RTL (ArrowLeft) does nothing
    await page.keyboard.press("ArrowLeft");
    await expect(tafsirSheetEnd.getByText(/الآية ٦/)).toBeVisible();
    await expect(page).toHaveURL(/\/ar\/pages\/604$/);
  });

  test("shared mushaf reader preserves grant path across Tafsir page boundaries", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Shared mushaf");

    await seedTestUsers();
    await clearAllGrantsAndCodes();
    const grantId = "test-grant-tafsir-e2e";
    await createE2EGrant(grantId);
    await authenticateAsUser(context, SECONDARY_E2E_USER);

    await page.goto(`/ar/mushaf/${grantId}/pages/1`);
    await waitForReaderContent(page);

    const tafsirSheet = await openTafsirForWord(page, "1:7:1");
    await expect(tafsirSheet.getByText(/الآية ٧/)).toBeVisible();

    // Step forward to 2:1
    const nextAyahBtn = tafsirSheet.getByRole("button", { name: "الآية التالية" });
    await nextAyahBtn.click();
    await expect(tafsirSheet.getByText(/الآية ١/)).toBeVisible();

    // URL remains within the shared mushaf grant route
    await expect(page).toHaveURL(new RegExp(`/ar/mushaf/${grantId}/pages/2$`));
    await expect(tafsirSheet).toBeVisible();
  });

  test("keyboard arrow navigation works symmetrically across RTL (ar) and LTR (en)", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Locale keyboard symmetry");

    // 1. English (LTR): ArrowRight advances, ArrowLeft steps back
    await page.goto("/en/pages/1");
    await waitForReaderContent(page);

    const enSheet = await openTafsirForWord(page, "1:1:1");
    await page.keyboard.press("ArrowRight");
    await expect(enSheet.getByText(/Ayah 2/i)).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await expect(enSheet.getByText(/Ayah 1/i)).toBeVisible();

    await page.keyboard.press("Escape");

    // 2. Arabic (RTL): ArrowLeft advances, ArrowRight steps back
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const arSheet = await openTafsirForWord(page, "1:1:1");
    await page.keyboard.press("ArrowLeft");
    await expect(arSheet.getByText(/الآية ٢/)).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(arSheet.getByText(/الآية ١/)).toBeVisible();
  });
});
