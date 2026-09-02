import { test, expect } from "@playwright/test";
import {
  waitForReaderContent,
  setStoredSafhaView,
  swipeReader,
  getActivePanel,
  openSettings,
  openSearch,
  skipNonDesktop,
  skipNonMobile,
} from "../helpers/reader";

const DEBOUNCE_TIMEOUT = 10000;

test.describe("Deep Links, Highlight Lifecycle & View Mode Transitions", () => {
  test("direct deep link renders selection highlight on targeted verse only", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Direct deep link selection highlight test on desktop");

    // Navigate directly with ?highlight=1:2&highlight-type=selection
    await page.goto("/ar/pages/1?highlight=1:2&highlight-type=selection");
    await waitForReaderContent(page);

    const activePanel = getActivePanel(page);

    // Targeted verse 1:2 words carry selection highlight class
    const verse12Words = activePanel.locator('[data-fq-word^="1:2:"]');
    await expect(verse12Words.first()).toBeVisible();
    await expect(verse12Words.first()).toHaveClass(/bg-blue-200\/70/);

    // Non-targeted verse 1:1 words do NOT have highlight class
    const verse11Words = activePanel.locator('[data-fq-word^="1:1:"]');
    await expect(verse11Words.first()).toBeVisible();
    await expect(verse11Words.first()).not.toHaveClass(/bg-blue-200\/70/);
    await expect(verse11Words.first()).not.toHaveClass(/bg-gray-900\/10/);
  });

  test("search result navigation lands with search highlight class and closes overlay", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Search overlay navigation test on desktop");

    await page.goto("/ar");
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();

    const { searchDialog, searchInput } = await openSearch(page, "ar");
    await searchInput.fill("الحمد لله");

    const verseResultLink = searchDialog
      .locator("a[href*='highlight=1%3A2'], a[href*='highlight=1:2']")
      .first();
    await expect(verseResultLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
    await verseResultLink.click();

    // Search dialog closes
    await expect(searchDialog).toBeHidden();

    // Lands on reader with highlight parameter in URL
    await expect(page).toHaveURL(/\/ar\/pages\/1\?.*highlight=1(%3A|:)2/);
    await waitForReaderContent(page);

    // Verse 1:2 words carry search highlight class
    const verse12Words = getActivePanel(page).locator('[data-fq-word^="1:2:"]');
    await expect(verse12Words.first()).toBeVisible();
    await expect(verse12Words.first()).toHaveClass(/bg-gray-900\/10/);
  });

  test("Ayah Picker surah retarget and ayah pick jumps with stamped highlight", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Ayah Picker retargeting and jump on desktop");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Open sidebar from Nav trigger
    const trigger = page.locator('nav button[aria-label="Open navigation"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    // Switch to Ayahs tab
    const ayahsTab = sheet.getByRole("tab", { name: /الآيات|Ayahs/ });
    await expect(ayahsTab).toBeVisible();
    await ayahsTab.click();
    await expect(ayahsTab).toHaveAttribute("aria-selected", "true");

    // Open surah selector to retarget to Surah 2 (Al-Baqarah)
    const pickerTrigger = sheet.locator("button[aria-expanded]").first();
    await pickerTrigger.click();
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "true");

    const surahSearch = sheet.locator(
      'input[placeholder*="اختر سورة"], input[placeholder*="Choose a surah"]'
    );
    await expect(surahSearch).toBeVisible();
    await surahSearch.fill("البقرة");

    const baqarahOption = sheet.getByRole("button", { name: /البقرة/ }).first();
    await baqarahOption.click();

    // Wait for verse pages map to load (chips become enabled)
    const firstChip = sheet.locator('button[aria-label^="آية"]').first();
    await expect(firstChip).toBeEnabled();

    // Tap Ayah 1 chip of Al-Baqarah
    const chip1 = sheet.locator('button[aria-label="آية ١"]');
    await chip1.click();

    // Sheet closes immediately
    await expect(sheet).not.toBeVisible();

    // Jumps to Page 2 with highlight=2:1 stamped onto URL
    await expect(page).toHaveURL(/\/ar\/pages\/2\?.*highlight=2(%3A|:)1/);
    await waitForReaderContent(page);

    // Verse 2:1 words on Page 2 carry highlight class
    const verse21Words = getActivePanel(page).locator('[data-fq-word^="2:1:"]');
    await expect(verse21Words.first()).toBeVisible();
    await expect(verse21Words.first()).toHaveClass(/bg-gray-900\/10/);
  });

  test("page turn clears highlight parameter and styling in single-page mode", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "In-spread arrows are desktop md+ controls");

    await setStoredSafhaView(page, "single");
    await page.goto("/ar/pages/1?highlight=1:2");
    await waitForReaderContent(page);

    // Verse 1:2 is initially highlighted
    const activePanel = getActivePanel(page);
    await expect(activePanel.locator('[data-fq-word^="1:2:"]').first()).toHaveClass(
      /bg-gray-900\/10/
    );

    // Click Next page arrow -> advances to Page 2 and clears highlight from URL
    await activePanel.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/2");
    await waitForReaderContent(page);

    // Click Previous page arrow -> steps back to Page 1 (URL stays bare)
    await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);

    // Verse 1:2 words NO LONGER carry highlight class
    await expect(
      getActivePanel(page).locator('[data-fq-word^="1:2:"]').first()
    ).not.toHaveClass(/bg-gray-900\/10/);
  });

  test("page turn clears highlight parameter and styling in double-spread mode", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Double-spread arrow navigation is desktop-only");

    await setStoredSafhaView(page, "double");
    await page.goto("/ar/pages/1?highlight=1:2");
    await waitForReaderContent(page);

    // Verse 1:2 on right page (Page 1) is highlighted
    const activePanel = getActivePanel(page);
    await expect(activePanel.locator('[data-fq-word^="1:2:"]').first()).toHaveClass(
      /bg-gray-900\/10/
    );

    // Click Next page arrow -> advances by pair to Page 3 and clears highlight from URL
    await activePanel.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);

    // Click Previous page arrow -> returns to Page 1 (bare /ar/pages/1)
    await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);

    // Verse 1:2 on Page 1 NO LONGER carries highlight class
    await expect(
      getActivePanel(page).locator('[data-fq-word^="1:2:"]').first()
    ).not.toHaveClass(/bg-gray-900\/10/);
  });

  test("keyboard arrow navigation clears highlight parameter and styling in RTL", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard arrow navigation is desktop-oriented");

    await setStoredSafhaView(page, "double");
    await page.goto("/ar/pages/1?highlight=1:2");
    await waitForReaderContent(page);

    // Initial highlight on verse 1:2
    const activePanel = getActivePanel(page);
    await expect(
      activePanel.locator('[data-fq-word^="1:2:"]').first()
    ).toHaveClass(/bg-gray-900\/10/);

    // ArrowLeft advances in Quran RTL order -> Page 3 (clears ?highlight= parameter)
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);

    // ArrowRight steps backward in Quran RTL order -> returns to Page 1 (bare /ar/pages/1)
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);

    // Verse 1:2 is NO LONGER highlighted
    await expect(
      getActivePanel(page).locator('[data-fq-word^="1:2:"]').first()
    ).not.toHaveClass(/bg-gray-900\/10/);
  });

  test("double spread facing page highlight isolates to targeted partner page", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Double-spread facing page isolation is desktop-only");

    await setStoredSafhaView(page, "double");
    // Deep-link to Page 2 targeting verse 2:1 (left page in pair 1-2)
    await page.goto("/ar/pages/2?highlight=2:1");
    await waitForReaderContent(page);

    const activePanel = getActivePanel(page);

    // Left page (Page 2) words for verse 2:1 are highlighted
    const leftPageVerse21 = activePanel.locator('.fq-compensate-l [data-fq-word^="2:1:"]');
    await expect(leftPageVerse21.first()).toBeVisible();
    await expect(leftPageVerse21.first()).toHaveClass(/bg-gray-900\/10/);

    // Right page (Page 1) words for verse 1:7 remain UNHIGHLIGHTED
    const rightPageVerse17 = activePanel.locator('.fq-compensate-r [data-fq-word^="1:7:"]');
    await expect(rightPageVerse17.first()).toBeVisible();
    await expect(rightPageVerse17.first()).not.toHaveClass(/bg-gray-900\/10/);

    // Advance by pair to Page 3 -> URL is bare /ar/pages/3
    await activePanel.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);

    // Return to Page 1 -> URL is bare /ar/pages/1
    await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);

    // Facing pair 1 & 2 is rendered, but verse 2:1 on left page is NO LONGER highlighted
    await expect(
      getActivePanel(page).locator('.fq-compensate-l [data-fq-word^="2:1:"]').first()
    ).not.toHaveClass(/bg-gray-900\/10/);
  });

  test("mobile touch swipe cleans highlight parameter upon page turn", async ({
    page,
  }, testInfo) => {
    skipNonMobile(testInfo, "Touch gesture navigation is mobile-only");

    await page.goto("/ar/pages/1?highlight=1:2");
    await waitForReaderContent(page);

    // Verse 1:2 is highlighted initially
    const activePanel = getActivePanel(page);
    await expect(activePanel.locator('[data-fq-word^="1:2:"]').first()).toHaveClass(
      /bg-gray-900\/10/
    );

    // Quran RTL: swipe right (dx > 0) advances to /ar/pages/2 and strips query params
    await swipeReader(page, 120);
    await expect(page).toHaveURL("/ar/pages/2");
    await waitForReaderContent(page);
    // Await sliding commit animation to settle before triggering return swipe
    await page.locator(".fq-reader-pager-strip").evaluate((el) => {
      return Promise.all(el.getAnimations().map((a) => a.finished));
    });

    // Swipe left (dx < 0) returns to /ar/pages/1
    await swipeReader(page, -120);
    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);

    // Verse 1:2 is NO LONGER highlighted
    await expect(
      getActivePanel(page).locator('[data-fq-word^="1:2:"]').first()
    ).not.toHaveClass(/bg-gray-900\/10/);
  });

  test("toggling view mode preserves active highlight and updates partner visibility", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "View mode toggle is desktop-only");

    await setStoredSafhaView(page, "double");
    await page.goto("/ar/pages/2?highlight=2:1");
    await waitForReaderContent(page);

    const activePanel = getActivePanel(page);

    // Initial state: double view, partner page visible, verse 2:1 highlighted
    await expect(page.locator("html")).toHaveAttribute("data-safha-view", "double");
    await expect(activePanel.locator(".fq-safha-partner")).toBeVisible();
    await expect(activePanel.locator('[data-fq-word^="2:1:"]').first()).toHaveClass(
      /bg-gray-900\/10/
    );

    // 1. Open Settings sheet and switch to Single page view
    const sheet1 = await openSettings(page);
    const pageViewTrigger1 = sheet1
      .locator("button")
      .filter({ hasText: /عرض الصفحة|Page View/ });
    await pageViewTrigger1.click();
    const singleBtn = sheet1
      .locator(".fq-section-drawer button")
      .filter({ hasText: /صفحة واحدة|Single page view/ });
    await singleBtn.click();
    await sheet1.getByRole("button", { name: /Close|إغلاق/i }).click();
    await expect(sheet1).toBeHidden();

    // Assert: Single view active, partner page hidden, highlight preserved on verse 2:1
    await expect(page.locator("html")).toHaveAttribute("data-safha-view", "single");
    await expect(getActivePanel(page).locator(".fq-safha-partner")).toBeHidden();
    await expect(
      getActivePanel(page).locator('[data-fq-word^="2:1:"]').first()
    ).toHaveClass(/bg-gray-900\/10/);

    // 2. Open Settings sheet and switch back to Double page view
    const sheet2 = await openSettings(page);
    const pageViewTrigger2 = sheet2
      .locator("button")
      .filter({ hasText: /عرض الصفحة|Page View/ });
    await pageViewTrigger2.click();
    const doubleBtn = sheet2
      .locator(".fq-section-drawer button")
      .filter({ hasText: /صفحتين|Double page view/ });
    await doubleBtn.click();
    await sheet2.getByRole("button", { name: /Close|إغلاق/i }).click();
    await expect(sheet2).toBeHidden();

    // Assert: Double view active, partner page visible, highlight preserved on verse 2:1
    await expect(page.locator("html")).toHaveAttribute("data-safha-view", "double");
    await expect(getActivePanel(page).locator(".fq-safha-partner")).toBeVisible();
    await expect(
      getActivePanel(page).locator('[data-fq-word^="2:1:"]').first()
    ).toHaveClass(/bg-gray-900\/10/);
  });

  test("preserves browser history back-stack across search deep link and page turns", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "History navigation test on desktop");

    // Start at home page
    await page.goto("/ar");
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();

    // Search and navigate to verse 1:2 (pushes single history entry)
    const { searchDialog, searchInput } = await openSearch(page, "ar");
    await searchInput.fill("الحمد لله");

    const verseResultLink = searchDialog
      .locator("a[href*='highlight=1%3A2'], a[href*='highlight=1:2']")
      .first();
    await expect(verseResultLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
    await verseResultLink.click();
    await expect(searchDialog).toBeHidden();

    await expect(page).toHaveURL(/\/ar\/pages\/1\?.*highlight=1(%3A|:)2/);
    await waitForReaderContent(page);

    // Advance to next page via arrow (commitTo replaces history state via replaceState)
    await getActivePanel(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL(/\/ar\/pages\/(2|3)$/);
    await waitForReaderContent(page);

    // Click browser Back button -> must return directly to /ar without intermediate trapped loops
    await page.goBack();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();
  });
});
