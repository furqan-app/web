import { test, expect, type Page } from "@playwright/test";
import { openSearch, waitForServiceWorker } from "../helpers/reader";
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
    // NOTE: the seed query must match both a surah and verse text. Surah
    // names alone match nothing in verse text (verified 0 rows for
    // "البقرة"/"الأنعام"/"الفاتحة" in the e2e DB) — "الرحمن" matches the
    // surah and 48 verses.
    await page.goto("/ar/search?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86");

    const input = page.getByPlaceholder("ابحث في القرآن…");
    await expect(input).toHaveValue("الرحمن");

    // Surah section renders the match…
    await expect(
      page.getByRole("link", { name: /^Ar-Rahman/ }).first()
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

    const input = page.getByPlaceholder("ابحث في القرآن…");
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

  test.describe("Offline (precached search index)", () => {
    // Wait until the Serwist install-time precache actually holds the index —
    // waitForServiceWorker only proves the SW is active/controlling. Precache
    // entries are keyed with a revision query param, so match with ignoreSearch.
    const waitForIndexPrecached = (page: Page) =>
      page.waitForFunction(
        async () => {
          for (const name of await caches.keys()) {
            const cache = await caches.open(name);
            if (await cache.match("/quran/search-index.json", { ignoreSearch: true }))
              return true;
          }
          return false;
        },
        undefined,
        { timeout: 15000 }
      );

    test("serves verse results from the precached index when offline", async ({
      page,
      context,
    }) => {
      // Load once online: primes the verse-pages CacheFirst entry and lets the
      // SW finish precaching. The dedicated page is in-app-offline scope only
      // (ADR 0062 / search-results-page.md) — a cold offline deep link is not
      // expected to work.
      await page.goto("/ar/search?q=%D8%A7%D9%84%D8%AD%D9%85%D8%AF"); // الحمد
      await expect(verseLinks(page).first()).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      await waitForServiceWorker(page);
      await waitForIndexPrecached(page);

      // Any hit to the search API while offline is a bug — the engine must read
      // the index directly (searchVersesOnline bails on navigator.onLine).
      let searchApiCalls = 0;
      await page.route("**/api/search/**", (route) => {
        searchApiCalls += 1;
        return route.abort();
      });
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));

      // Refine to a query that was never fetched online — its results can only
      // come from the precached index.
      const input = page.getByPlaceholder("ابحث في القرآن…");
      await input.fill("الرحمن");

      // The debounced refine reached the URL (the new query, not just any ?q=).
      await expect(page).toHaveURL(
        /\/ar\/search\?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86$/,
        { timeout: DEBOUNCE_TIMEOUT }
      );
      await expect(verseLinks(page).first()).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      // Offline total must equal the online/API total for this query (48 verses
      // in the full-dataset fixture — see the seed note at the top of this file).
      // A silently truncated index would show a smaller count here.
      await expect(page.getByText("عدد النتائج: ٤٨")).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      expect(searchApiCalls).toBe(0);
    });

    test("keeps loaded rows and pages further from the index after going offline mid-session", async ({
      page,
      context,
    }) => {
      await page.goto("/ar/search?q=%D8%A7%D9%84%D9%84%D9%87"); // الله
      const links = verseLinks(page);
      await expect(links).toHaveCount(20, { timeout: DEBOUNCE_TIMEOUT });
      await waitForServiceWorker(page);
      await waitForIndexPrecached(page);

      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));

      // Rows fetched online survive the transition untouched…
      await expect(links).toHaveCount(20);
      // …and the next infinite-scroll chunk resolves from the local index.
      await links.last().scrollIntoViewIfNeeded();
      await expect(links).toHaveCount(40, { timeout: DEBOUNCE_TIMEOUT });
    });
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
