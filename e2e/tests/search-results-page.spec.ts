import { test, expect, type Page } from "@playwright/test";
import {
  openSearch,
  waitForServiceWorker,
  waitForReaderContent,
} from "../helpers/reader";
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
      // Load once online: primes the verse-pages entry and lets the SW finish
      // precaching (shell included, #591), so the refine below resolves fully
      // offline from the precached index.
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

    test("cold offline entry serves the shell with full verse plus surah results", async ({
      page,
      context,
    }) => {
      // Prime online: caches the shell's dependencies and lets the SW finish
      // precaching (the shell itself is served by the #591 isAppShellPage rule).
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

      // Cold navigation with zero connection: the shell serves, ?q= seeds
      // client-side, and both sections resolve from precached JSON.
      await page.goto("/ar/search?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86"); // الرحمن
      await expect(page.getByPlaceholder("ابحث في القرآن…")).toHaveValue(
        "الرحمن",
        { timeout: DEBOUNCE_TIMEOUT }
      );
      await expect(
        page.getByRole("link", { name: /^Ar-Rahman/ }).first()
      ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
      await expect(verseLinks(page).first()).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      // Offline total must equal the online/API total for this query (48 verses
      // in the full-dataset fixture — see the seed note at the top of this file).
      await expect(page.getByText("عدد النتائج: ٤٨")).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      expect(searchApiCalls).toBe(0);
    });

    test("surah links resolve through the edition map offline, identical to online", async ({
      page,
      context,
    }) => {
      await page.goto("/ar/search?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86");
      const surahLink = page.getByRole("link", { name: /^Ar-Rahman/ }).first();
      await expect(surahLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
      const onlineHref = await surahLink.getAttribute("href");
      // Edition-resolved first page (ADR 0033) — never the default-edition range.
      expect(onlineHref).toMatch(/^\/ar\/pages\/\d+$/);
      await waitForServiceWorker(page);
      await waitForIndexPrecached(page);

      await page.route("**/api/search/**", (route) => route.abort());
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));

      // Refine away and back so the surah section re-resolves fully offline.
      const input = page.getByPlaceholder("ابحث في القرآن…");
      await input.fill("الفاتحة");
      await expect(
        page.getByRole("link", { name: /^Al-Fatihah/ }).first()
      ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
      await input.fill("الرحمن");
      const offlineLink = page.getByRole("link", { name: /^Ar-Rahman/ }).first();
      await expect(offlineLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
      expect(await offlineLink.getAttribute("href")).toBe(onlineHref);
    });

    test("missing index offline shows error plus retry, recovers on retry", async ({
      page,
      context,
    }) => {
      // Prime the shell with no search intent, so the index stays unfetched
      // (ADR 0049).
      await page.goto("/ar/search");
      await expect(page.getByPlaceholder("ابحث في القرآن…")).toBeVisible();
      await waitForServiceWorker(page);
      await waitForIndexPrecached(page);

      // Simulate a never-precached index: stash its bytes in-page, then delete
      // the entry under its exact precache key. An abort route alone cannot
      // prove absence — nothing guarantees interception wins over an SW
      // precache hit, while a deleted entry deterministically fails the fetch
      // (no cache, no connection). The exact key (with revision param) is
      // saved so recovery puts the bytes back where the precache route looks
      // them up; the whole test — including recovery — stays offline on this
      // one document.
      await page.evaluate(async () => {
        const w = window as unknown as {
          __savedIndexKey?: { cache: string; url: string };
          __savedIndex?: ArrayBuffer;
        };
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          for (const req of await cache.keys()) {
            if (req.url.includes("/quran/search-index.json")) {
              const res = await cache.match(req);
              if (!res) {
                throw new Error("search-index.json entry unreadable");
              }
              w.__savedIndex = await res.arrayBuffer();
              w.__savedIndexKey = { cache: name, url: req.url };
              await cache.delete(req);
            }
          }
        }
        if (!w.__savedIndexKey) {
          throw new Error("search-index.json precache entry not found");
        }
      });

      // Any hit to the search API at any point is a bug — the engine must read
      // the index directly (searchVersesOnline bails on navigator.onLine).
      let searchApiCalls = 0;
      await page.route("**/api/search/**", (route) => {
        searchApiCalls += 1;
        return route.abort();
      });
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));

      await page.getByPlaceholder("ابحث في القرآن…").fill("الرحمن");
      // The chapters half succeeds offline (precached chapters.json) but the
      // verses half throws on the missing index, so the page-level error state
      // wins over the surah section. React Query retries 3× (~7s backoff) plus
      // the 500ms debounce before the error lands — hence the wider timeout.
      await expect(page.getByText("تعذّر البحث")).toBeVisible({
        timeout: 20000,
      });

      // Recovery proves the INDEX path: put the stashed bytes back under the
      // exact saved key and Retry — results resolve with the API still aborted
      // throughout.
      await page.evaluate(async () => {
        const w = window as unknown as {
          __savedIndexKey: { cache: string; url: string };
          __savedIndex: ArrayBuffer;
        };
        const cache = await caches.open(w.__savedIndexKey.cache);
        await cache.put(
          w.__savedIndexKey.url,
          new Response(w.__savedIndex)
        );
      });
      await page.getByRole("button", { name: "إعادة المحاولة" }).click();
      await expect(verseLinks(page).first()).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      await expect(page.getByText("عدد النتائج: ٤٨")).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      expect(searchApiCalls).toBe(0);
    });

    test("offline misses show no-results, surah-only matches skip the empty state", async ({
      page,
      context,
    }) => {
      // Guards the throw's boundary: index present + zero matches must stay
      // "Nothing found" (never the error state); only a missing index errors.
      await page.goto("/ar/search?q=%D8%A7%D9%84%D8%AD%D9%85%D8%AF"); // الحمد
      await expect(verseLinks(page).first()).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      await waitForServiceWorker(page);
      await waitForIndexPrecached(page);

      await page.route("**/api/search/**", (route) => route.abort());
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));

      const input = page.getByPlaceholder("ابحث في القرآن…");
      await input.fill("xyznonexistent");
      await expect(page.getByText("لا توجد نتائج")).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      await expect(page.getByText("تعذّر البحث")).toBeHidden();

      // Numeric surah-only match offline: surah section renders, verses hide,
      // and still no global empty or error state.
      await input.fill("114");
      await expect(
        page.getByRole("link", { name: /^An-Nas/ }).first()
      ).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
      await expect(verseLinks(page)).toHaveCount(0);
      await expect(page.getByText("لا توجد نتائج")).toBeHidden();
      await expect(page.getByText("تعذّر البحث")).toBeHidden();
    });

    test("offline result links open edition-correct reader pages", async ({
      page,
      context,
    }) => {
      await page.goto("/ar/search?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86");
      const verseLink = verseLinks(page).first();
      await expect(verseLink).toBeVisible({ timeout: DEBOUNCE_TIMEOUT });
      const verseHref = await verseLink.getAttribute("href");
      expect(verseHref).toMatch(/\/ar\/pages\/\d+\?highlight=/);
      const surahHref = await page
        .getByRole("link", { name: /^Ar-Rahman/ })
        .first()
        .getAttribute("href");
      expect(surahHref).toMatch(/^\/ar\/pages\/\d+$/);
      if (!verseHref || !surahHref) {
        throw new Error("search result hrefs missing before offline open");
      }
      await waitForServiceWorker(page);
      await waitForIndexPrecached(page);

      // Prime both targets so their document + JSON + font are cached.
      await page.goto(verseHref);
      await waitForReaderContent(page);
      await page.goto(surahHref);
      await waitForReaderContent(page);

      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));

      // Cold search entry, then open the verse row: the reader renders offline.
      await page.goto("/ar/search?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86");
      await expect(verseLinks(page).first()).toBeVisible({
        timeout: DEBOUNCE_TIMEOUT,
      });
      await verseLinks(page).first().click();
      await expect(page).toHaveURL(/\/ar\/pages\/\d+\?highlight=/, {
        timeout: DEBOUNCE_TIMEOUT,
      });
      await waitForReaderContent(page);

      // Back to search (cold nav) and open the surah row to its first page.
      await page.goto("/ar/search?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86");
      await page
        .getByRole("link", { name: /^Ar-Rahman/ })
        .first()
        .click();
      const surahPage = surahHref.split("/").pop();
      await expect(page).toHaveURL(new RegExp(`/ar/pages/${surahPage}(\\?|$)`), {
        timeout: DEBOUNCE_TIMEOUT,
      });
      await waitForReaderContent(page);
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
