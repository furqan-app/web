import { test, expect, type Page } from "@playwright/test";
import { openSearch } from "../helpers/reader";
import {
  authenticateAsUser,
  clearAuth,
  DEFAULT_E2E_USER,
} from "../helpers/auth";
import {
  SECONDARY_E2E_USER,
  seedTestUsers,
  clearAllGrantsAndCodes,
  createE2EGrant,
} from "../helpers/mushaf";

const DEBOUNCE_TIMEOUT = 15000;
const GRANT_ID = "e2e-grant-search-1";

const verseLinks = (page: Page) => page.locator("a[href*='highlight=']");

test.describe.configure({ mode: "serial" });

test.describe("Search Results Page", () => {
  test("seeds the query from ?q= and shows surah + verse results", async ({
    page,
  }) => {
    await page.goto("/ar/search?q=%D8%A7%D9%84%D8%A8%D9%82%D8%B1%D8%A9");

    const input = page.getByPlaceholder("ابحث عن السورة بالاسم أو الرقم");
    await expect(input).toHaveValue("البقرة");

    // Surah section renders the match…
    await expect(
      page.getByRole("link", { name: /^Al-Baqarah/ }).first()
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });

    // …and verse results carry highlight links plus a total count.
    await expect(verseLinks(page).first()).toBeVisible({
      timeout: DEBOUNCE_TIMEOUT,
    });
    await expect(page.getByText(/عدد النتائج/)).toBeVisible();
  });

  test("renders Idle state for a query shorter than 2 characters", async ({
    page,
  }) => {
    await page.goto("/ar/search?q=%D8%A7");

    await expect(page.getByText("ابحث في القرآن")).toBeVisible();
    await expect(verseLinks(page)).toHaveCount(0);
  });

  test("renders No Results state when nothing matches", async ({ page }) => {
    await page.goto("/ar/search?q=xyznonexistent");

    await expect(page.getByText("لا توجد نتائج")).toBeVisible({
      timeout: DEBOUNCE_TIMEOUT,
    });
  });

  test("infinite scroll loads further chunks for a broad query", async ({
    page,
  }) => {
    await page.goto("/ar/search?q=%D8%A7%D9%84%D9%84%D9%87");

    const links = verseLinks(page);
    // First chunk: take = 20.
    await expect(links).toHaveCount(20, { timeout: DEBOUNCE_TIMEOUT });

    // Scrolling the last row into view trips the sentinel → second chunk.
    await links.last().scrollIntoViewIfNeeded();
    await expect(links).toHaveCount(40, { timeout: DEBOUNCE_TIMEOUT });
  });

  test("refining the in-page query updates ?q= via replaceState", async ({
    page,
  }) => {
    await page.goto("/ar/search");

    const input = page.getByPlaceholder("ابحث عن السورة بالاسم أو الرقم");
    await input.fill("الفاتحة");

    await expect(page).toHaveURL(/\/ar\/search\?q=.+/, {
      timeout: DEBOUNCE_TIMEOUT,
    });
    await expect(
      page.getByRole("link", { name: /^Al-Fatihah/ }).first()
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
  });

  test("overlay More-results button navigates to the full page and closes the overlay", async ({
    page,
  }) => {
    await page.goto("/ar");
    const { searchDialog, searchInput } = await openSearch(page, "ar");

    await searchInput.fill("الله");

    // Total exceeds the 10-result overlay cap → count-bearing label.
    const moreLink = searchDialog.getByRole("link", { name: /عرض كل النتائج/ });
    await expect(moreLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
    await moreLink.click();

    await expect(searchDialog).toBeHidden();
    await expect(page).toHaveURL(/\/ar\/search\?q=.+/);
    await expect(verseLinks(page).first()).toBeVisible({
      timeout: DEBOUNCE_TIMEOUT,
    });
  });

  test("surah-only match shows the surah section without a global empty state", async ({
    page,
  }) => {
    await page.goto("/ar/search?q=114");

    await expect(
      page.getByRole("link", { name: /^An-Nas/ }).first()
    ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
    await expect(verseLinks(page)).toHaveCount(0);
    await expect(page.getByText("لا توجد نتائج")).toBeHidden();
  });

  test.describe("Grant-scoped entry", () => {
    test.beforeAll(async () => {
      await seedTestUsers();
    });

    test.beforeEach(async ({ context }) => {
      await clearAuth(context);
      await clearAllGrantsAndCodes();
    });

    test("keeps verse links inside the granted mushaf", async ({
      page,
      context,
    }) => {
      await createE2EGrant(
        GRANT_ID,
        DEFAULT_E2E_USER.id,
        SECONDARY_E2E_USER.id
      );
      await authenticateAsUser(context, SECONDARY_E2E_USER);

      await page.goto(`/ar/mushaf/${GRANT_ID}/search?q=%D8%A7%D9%84%D8%AD%D9%85%D8%AF`);

      const link = verseLinks(page).first();
      await expect(link).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
      const href = await link.getAttribute("href");
      expect(href).toContain(`/mushaf/${GRANT_ID}/pages/`);
    });
  });
});
