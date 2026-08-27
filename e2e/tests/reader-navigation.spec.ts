import { test, expect } from "@playwright/test";
import {
  waitForReaderContent,
  setStoredSafhaView,
  swipeReader,
  getActivePanel,
  skipNonDesktop,
  skipNonMobile,
} from "../helpers/reader";

test.describe("Desktop: In-Spread Navigation Arrows & Wrap-Around", () => {
  test.beforeEach(async ({}, testInfo) => {
    skipNonDesktop(testInfo, "In-spread click arrows are md+ desktop-only controls");
  });

  test("steps to next facing pair in default double-page spread mode", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // On page 1 in double view, facing pair 1 & 2 is mounted
    await expect(page).toHaveURL("/ar/pages/1");

    // Click Next page arrow in active center panel -> advances by pair to /ar/pages/3
    await getActivePanel(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);

    // Click Previous page arrow in active center panel -> steps back to /ar/pages/1
    await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("steps by single page when single-page view is stored", async ({
    page,
  }) => {
    await setStoredSafhaView(page, "single");
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    await expect(page).toHaveURL("/ar/pages/1");

    // Click Next page arrow in active center panel -> advances single page to /ar/pages/2
    await getActivePanel(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/2");
    await waitForReaderContent(page);

    // Click Previous page arrow -> steps back to /ar/pages/1
    await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("wraps around at boundaries (Page 1 <-> Page 604) in single view", async ({
    page,
  }) => {
    await setStoredSafhaView(page, "single");
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Previous on Page 1 wraps to Page 604
    await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
    await expect(page).toHaveURL("/ar/pages/604");
    await waitForReaderContent(page);

    // Next on Page 604 wraps back to Page 1
    await getActivePanel(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("wraps around at boundaries in double-page spread mode", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Previous on Page 1 wraps to Page 603 (pair 603-604)
    await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
    await expect(page).toHaveURL("/ar/pages/603");
    await waitForReaderContent(page);

    // Next on Page 603 wraps back to Page 1 (pair 1-2)
    await getActivePanel(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
  });
});

test.describe("Desktop: Keyboard Arrow Navigation (Locale-Invariance)", () => {
  test.beforeEach(async ({}, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard arrow navigation is desktop-oriented");
  });

  test("ArrowLeft steps forward and ArrowRight steps backward in Arabic (RTL)", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // ArrowLeft is forward in Quran order -> pair 3-4 (/ar/pages/3)
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);

    // ArrowRight is backward in Quran order -> pair 1-2 (/ar/pages/1)
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("ArrowLeft steps forward and ArrowRight steps backward in English (LTR)", async ({
    page,
  }) => {
    await page.goto("/en/pages/1");
    await waitForReaderContent(page);

    // ArrowLeft remains forward in Quran order regardless of LTR locale -> pair 3-4 (/en/pages/3)
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL("/en/pages/3");
    await waitForReaderContent(page);

    // ArrowRight remains backward in Quran order -> pair 1-2 (/en/pages/1)
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/en/pages/1");
    await waitForReaderContent(page);
  });

  test("rapid consecutive keypresses settle cleanly (in-flight handoff)", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // 3 rapid ArrowLeft presses advance 3 pairs in double mode from 1 -> 3 -> 5 -> 7
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");

    await expect(page).toHaveURL("/ar/pages/7", { timeout: 10000 });
    await waitForReaderContent(page);
  });

  test("keyboard navigation is ignored when focused inside an input element", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Click reader background to reveal nav overlay
    const panel = page.locator(".fq-reader-panel").first();
    await panel.click({ position: { x: 50, y: 50 } });

    // Open Search modal
    await page
      .getByRole("button", { name: "ابحث عن السورة بالاسم أو الرقم" })
      .click();
    const searchDialog = page.getByRole("dialog");
    await expect(searchDialog).toBeVisible();

    const searchInput = searchDialog.getByPlaceholder(
      "ابحث عن السورة بالاسم أو الرقم"
    );
    await searchInput.fill("البقرة");

    // Press ArrowLeft inside search input
    await page.keyboard.press("ArrowLeft");

    // Page URL must not change while focused in input
    await expect(page).toHaveURL("/ar/pages/1");
  });
});

test.describe("Desktop: Double-Page Spread View Toggle via Settings", () => {
  test.beforeEach(async ({}, testInfo) => {
    skipNonDesktop(testInfo, "Double-page spread toggle is md+ desktop-only");
  });

  test("toggles between Single page and Double page views live via Settings sheet", async ({
    page,
  }) => {
    await page.goto("/ar");
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();

    // Open Settings sheet from home where nav is permanently visible
    await page.getByRole("button", { name: "الإعدادات" }).click();
    const settingsSheet = page.getByRole("dialog");
    await expect(settingsSheet).toBeVisible();

    // Expand Page View drawer
    const pageViewToggle = settingsSheet.getByRole("button", { name: /عرض الصفحة|Page View/ });
    await expect(pageViewToggle).toBeVisible();
    await pageViewToggle.click();

    // Select Single page view
    const singleOption = settingsSheet.getByRole("button", { name: /عرض صفحة واحدة|Single page view/ });
    await expect(singleOption).toBeVisible();
    await singleOption.click();

    // Verify html data-safha-view updated to single
    await expect(page.locator("html")).toHaveAttribute(
      "data-safha-view",
      "single"
    );

    // Verify localStorage value is synced
    const storedSingle = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("quranSafhaView") || '""');
      } catch {
        return localStorage.getItem("quranSafhaView");
      }
    });
    expect(storedSingle).toBe("single");

    // Close settings via escape
    await page.keyboard.press("Escape");
    await expect(settingsSheet).not.toBeVisible();

    // Navigate to reader page 2
    await page.goto("/ar/pages/2");
    await waitForReaderContent(page);

    // In single view on page 2, clicking Next steps by 1 page -> /ar/pages/3
    await getActivePanel(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);

    // Click reader background to reveal nav overlay
    const panel = page.locator(".fq-reader-panel").first();
    await panel.click({ position: { x: 50, y: 50 } });

    // Open settings and switch back to Double page view
    await page.getByRole("button", { name: "الإعدادات" }).click();
    await expect(settingsSheet).toBeVisible();
    await settingsSheet.getByRole("button", { name: /عرض الصفحة|Page View/ }).click();
    await settingsSheet
      .getByRole("button", { name: /عرض صفحتين|Double page view/ })
      .click();

    await expect(page.locator("html")).toHaveAttribute(
      "data-safha-view",
      "double"
    );

    const storedDouble = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("quranSafhaView") || '""');
      } catch {
        return localStorage.getItem("quranSafhaView");
      }
    });
    expect(storedDouble).toBe("double");
  });
});

test.describe("Mobile: Touch Gestures & Viewport Invariants", () => {
  test.beforeEach(async ({}, testInfo) => {
    skipNonMobile(testInfo, "Touch gesture tests are scoped to mobile viewport");
  });

  test("swiping right advances page and swiping left goes backward", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Quran RTL: drag right (dx > 0) is forward -> /ar/pages/2
    await swipeReader(page, 120);
    await expect(page).toHaveURL("/ar/pages/2");
    await waitForReaderContent(page);

    // Drag left (dx < 0) is backward -> /ar/pages/1
    await swipeReader(page, -120);
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("sub-threshold drag snaps back without changing page", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Small drag under 80px threshold
    await swipeReader(page, 30);

    // URL remains /ar/pages/1
    await expect(page).toHaveURL("/ar/pages/1");
  });

  test("mobile forces single page layout and hides click navigation arrows", async ({
    page,
  }) => {
    // Set double view in storage to verify mobile overrides it
    await setStoredSafhaView(page, "double");
    await page.goto("/ar/pages/2");
    await waitForReaderContent(page);

    // In-spread click arrows are hidden on mobile
    await expect(
      page.getByRole("link", { name: "Next page" })
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Previous page" })
    ).toBeHidden();
  });
});

test.describe("Cross-Platform: Direct Routing & Continue Reading State", () => {
  test("direct navigation to a reader URL hydrates content and clears jump gate", async ({
    page,
  }) => {
    await page.goto("/ar/pages/5");
    await waitForReaderContent(page);

    await expect(page).toHaveURL("/ar/pages/5");
    // Verify SSR jump gate class is removed
    await expect(page.locator("html")).not.toHaveClass(/fq-pending-jump/);
    // Verify word rows painted
    expect(
      await page.locator(".fq-quran-safha .fq-safha-row").count()
    ).toBeGreaterThan(0);
  });

  test("direct navigation in English locale renders correctly", async ({
    page,
  }) => {
    await page.goto("/en/pages/12");
    await waitForReaderContent(page);

    await expect(page).toHaveURL("/en/pages/12");
    expect(
      await page.locator(".fq-quran-safha .fq-safha-row").count()
    ).toBeGreaterThan(0);
  });

  test("invalid out-of-bounds page routes render 404", async ({ page }) => {
    // Upper boundary out-of-bounds
    const res999 = await page.goto("/ar/pages/999");
    expect(res999).not.toBeNull();
    expect(res999!.status()).toBe(404);
    await expect(page.getByText("404", { exact: true })).toBeVisible();

    // Lower boundary out-of-bounds (page 0)
    const res0 = await page.goto("/ar/pages/0");
    expect(res0).not.toBeNull();
    expect(res0!.status()).toBe(404);
    await expect(page.getByText("404", { exact: true })).toBeVisible();

    // Non-numeric ID
    const resInvalid = await page.goto("/ar/pages/invalid");
    expect(resInvalid).not.toBeNull();
    expect(resInvalid!.status()).toBe(404);
    await expect(page.getByText("404", { exact: true })).toBeVisible();
  });

  test("home surah list item navigates directly to starting page", async ({
    page,
  }) => {
    await page.goto("/ar");

    // Click Al-Baqarah (Surah 2, starting page 2)
    const baqarahCard = page.locator('[data-surah-id="2"]');
    await expect(baqarahCard).toBeVisible();
    await Promise.all([
      page.waitForURL("/ar/pages/2"),
      baqarahCard.click(),
    ]);

    await expect(page).toHaveURL("/ar/pages/2");
    await waitForReaderContent(page);
  });

  test("visiting a reader page syncs lastReadPage and Continue Reading CTAs resume it", async ({
    page,
  }) => {
    // Visit page 7
    await page.goto("/ar/pages/7");
    await waitForReaderContent(page);

    // Return to home
    await page.goto("/ar");

    // 1. Verify Continue Reading link exists in navbar and targets /ar/pages/7
    const navContinueLink = page.locator("nav a[href='/ar/pages/7']");
    await expect(navContinueLink).toBeVisible();

    // 2. Verify HomeContinueReadingCard is rendered and links to /ar/pages/7
    const homeResumeLink = page.locator('main a[href="/ar/pages/7"]');
    await expect(homeResumeLink).toBeVisible();

    // Click resume link and verify navigation to page 7
    await Promise.all([
      page.waitForURL("/ar/pages/7"),
      homeResumeLink.click(),
    ]);

    await expect(page).toHaveURL("/ar/pages/7");
    await waitForReaderContent(page);
  });
});
