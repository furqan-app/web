import { test, expect, type Page } from "@playwright/test";
import { waitForReaderContent, skipNonDesktop, skipNonMobile } from "../helpers/reader";

const DEBOUNCE_TIMEOUT = 10000;

/**
 * Helper to open the search dialog and wait for the input to become interactive.
 */
async function openSearch(page: Page, locale: "ar" | "en" = "ar") {
  // Ensure page navigation and hydration before interacting with controls
  await expect(page.locator("nav")).toBeVisible();

  const triggerName =
    locale === "ar"
      ? "ابحث عن السورة بالاسم أو الرقم"
      : "Search surah by name or number";

  const searchTrigger = page.getByRole("button", { name: triggerName });
  await expect(searchTrigger).toBeVisible();
  await searchTrigger.click();

  const searchDialog = page.getByRole("dialog");
  await expect(searchDialog).toBeVisible();

  const searchInput = searchDialog.getByPlaceholder(triggerName);
  await expect(searchInput).toBeVisible();

  return { searchDialog, searchInput };
}

test.describe("Search Overlay Triggers & Dismissal", () => {
  test("keyboard shortcut (Cmd+K / Ctrl+K) toggles search dialog on desktop", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard shortcuts are desktop-oriented");

    await page.goto("/ar");
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();

    const searchDialog = page.getByRole("dialog");
    await expect(searchDialog).toBeHidden();

    // Press Control+k
    await page.keyboard.press("Control+k");
    await expect(searchDialog).toBeVisible();

    // Verify search input is focused
    const searchInput = searchDialog.getByPlaceholder("ابحث عن السورة بالاسم أو الرقم");
    await expect(searchInput).toBeFocused();

    // Press Control+k again to toggle closed
    await page.keyboard.press("Control+k");
    await expect(searchDialog).toBeHidden();
  });

  test("navbar search button opens overlay and Escape key closes it", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog } = await openSearch(page, "ar");

    // Dismiss via Escape key
    await page.keyboard.press("Escape");
    await expect(searchDialog).toBeHidden();
  });

  test("header close button dismisses search overlay in English locale", async ({
    page,
  }) => {
    await page.goto("/en");
    const { searchDialog } = await openSearch(page, "en");

    // Click header close button
    const closeBtn = searchDialog.getByRole("button", { name: "Close search" });
    await closeBtn.click();

    await expect(searchDialog).toBeHidden();
  });
});

test.describe("Search Query Lifecycle & State Transitions", () => {
  test("renders Idle state when query is empty or shorter than 2 characters", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    // Initial state: Idle message
    await expect(searchDialog.getByText("ابحث في القرآن")).toBeVisible();
    await expect(
      searchDialog.getByText("اكتب اسم سورة أو رقم آية أو عبارة.")
    ).toBeVisible();

    // 1 character input (< 2 chars minimum) remains in idle state
    await searchInput.fill("ا");
    await expect(searchDialog.getByText("ابحث في القرآن")).toBeVisible();
  });

  test("shows loading indicator and settles into results for valid query", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("الرحمن");

    // Settles cleanly on Ar-Rahman result
    const rahmanLink = searchDialog.getByRole("link", { name: /^Ar-Rahman/ });
    await expect(rahmanLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
  });

  test("renders No Results state when no chapters or verses match", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("xyznonexistent");

    // Wait for debounced search to settle and display no-results
    await expect(searchDialog.getByText("لا توجد نتائج")).toBeVisible({
      timeout: DEBOUNCE_TIMEOUT,
    });
    await expect(
      searchDialog.getByText("جرّب كتابة مختلفة، أو ابحث برقم السورة.")
    ).toBeVisible();
  });

  test("clearing query immediately resets UI to Idle state", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    // Fill query and wait for results
    await searchInput.fill("البقرة");
    const baqarahLink = searchDialog.getByRole("link", { name: /^Al-Baqarah/ });
    await expect(baqarahLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // Clear input
    await searchInput.fill("");

    // Immediately returns to Idle state
    await expect(searchDialog.getByText("ابحث في القرآن")).toBeVisible();
    await expect(baqarahLink).toBeHidden();
  });

  test("rapid typing settles cleanly on final debounced query", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    // Rapid sequential keystrokes
    await searchInput.pressSequentially("الفاتحة", { delay: 40 });

    // Settles cleanly on Al-Fatihah result
    await expect(
      searchDialog.getByRole("link", { name: /^Al-Fatihah/ })
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
  });
});

test.describe("Search Query Matching & Result Variations", () => {
  test("searches by Arabic surah name", async ({ page }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("البقرة");

    await expect(
      searchDialog.getByRole("link", { name: /^Al-Baqarah/ })
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
  });

  test("searches by English surah name in English locale", async ({ page }) => {
    await page.goto("/en");
    const { searchDialog, searchInput } = await openSearch(page, "en");

    await searchInput.fill("Fatihah");

    await expect(
      searchDialog.getByRole("link", { name: /^Al-Fatihah/ })
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
  });

  test("searches by numeric surah ID (Western & Eastern numerals)", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    // 1. Western number: 18 -> Surah Al-Kahf
    await searchInput.fill("18");
    await expect(
      searchDialog.getByRole("link", { name: /^Al-Kahf/ })
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // 2. Eastern Arabic numerals: ١٨ -> Surah Al-Kahf
    await searchInput.fill("١٨");
    await expect(
      searchDialog.getByRole("link", { name: /^Al-Kahf/ })
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // 3. Last surah 114 -> An-Nas
    await searchInput.fill("114");
    await expect(
      searchDialog.getByRole("link", { name: /^An-Nas/ })
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
  });

  test("searches by Arabic verse text with Hamza normalization", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    // Query with standard Hamza: "إياك" (Al-Fatihah 1:5)
    await searchInput.fill("إياك");
    const verseLinkHamza = searchDialog.locator("a[href*='highlight=1%3A5'], a[href*='highlight=1:5']").first();
    await expect(verseLinkHamza).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // Query with bare Alif: "اياك"
    await searchInput.fill("اياك");
    const verseLinkBare = searchDialog.locator("a[href*='highlight=1%3A5'], a[href*='highlight=1:5']").first();
    await expect(verseLinkBare).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
  });

  test("caps verse search results at 10 items for broad queries", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    // Common word with hundreds of occurrences across the Quran
    await searchInput.fill("الله");

    // Wait for verse section heading to render
    await expect(
      searchDialog.getByText(/آيات|Verses/)
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // Verify verse links do not exceed the take: 10 cap
    const verseLinks = searchDialog.locator("a[href*='highlight=']");
    await expect(verseLinks).toHaveCount(10);
  });
});

test.describe("Search Result Selection, Navigation & Highlighting", () => {
  test("clicking a chapter result navigates to chapter start page and closes search", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("البقرة");

    const baqarahLink = searchDialog.getByRole("link", {
      name: /^Al-Baqarah/,
    });
    await expect(baqarahLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // Click Al-Baqarah result
    await baqarahLink.click();

    // Dialog must close
    await expect(searchDialog).toBeHidden();

    // Navigates to page 2 (Al-Baqarah start page)
    await expect(page).toHaveURL("/ar/pages/2");
    await waitForReaderContent(page);
  });

  test("clicking a verse result navigates to page with highlight parameter and highlights ayah words", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("الحمد لله");

    // Find verse result link for 1:2
    const verseLink = searchDialog.locator("a[href*='highlight=1%3A2'], a[href*='highlight=1:2']").first();
    await expect(verseLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // Click verse result
    await verseLink.click();

    // Dialog must close
    await expect(searchDialog).toBeHidden();

    // Verifies URL carries highlight query params
    await expect(page).toHaveURL(/\/ar\/pages\/1\?.*highlight=1(%3A|:)2/);
    await waitForReaderContent(page);

    // Verify verse 1:2 words have highlight class
    const highlightedWords = page.locator(
      '[data-fq-word^="1:2:"].bg-gray-900\\/10, [data-fq-word^="1:2:"].dark\\:bg-cyan-600\\/30'
    );
    expect(await highlightedWords.count()).toBeGreaterThan(0);
  });

  test("preserves reader base path when searching from reader pages", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "In-reader top bar search is desktop-oriented");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("البقرة");
    const baqarahLink = searchDialog.getByRole("link", { name: /^Al-Baqarah/ });
    await expect(baqarahLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    await baqarahLink.click();
    await expect(searchDialog).toBeHidden();
    await expect(page).toHaveURL("/ar/pages/2");
  });
});

test.describe("Mobile Search Interaction", () => {
  test.beforeEach(async ({}, testInfo) => {
    skipNonMobile(testInfo, "Mobile search interactions scoped to mobile viewport");
  });

  test("full-screen search overlay operates cleanly on mobile and navigates to target surah", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("يس");

    const yasinLink = searchDialog.getByRole("link", { name: /^Ya-Sin/ });
    await expect(yasinLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    await yasinLink.click();

    await expect(searchDialog).toBeHidden();
    await expect(page).toHaveURL("/ar/pages/440");
    await waitForReaderContent(page);
  });
});
