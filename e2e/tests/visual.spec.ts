import { test, expect, type Page } from "@playwright/test";

// Visual regression smoke suite — see docs/plans/visual-e2e-testing.md and
// ADR 0022. Covers 5 fixed screens x {ar, en} x {light, dark}, run against
// both the "desktop" and "mobile" Playwright projects (except the double-page
// spread, which only exists at lg+ and is skipped on "mobile").

type Locale = "ar" | "en";
type Theme = "light" | "dark";

const LOCALES: Locale[] = ["ar", "en"];
const THEMES: Theme[] = ["light", "dark"];

const SEARCH_PLACEHOLDER: Record<Locale, string> = {
  ar: "ابحث عن السورة بالاسم أو الرقم",
  en: "Search surah by name or number",
};
const SEARCH_QUERY: Record<Locale, string> = {
  ar: "فاتحة",
  en: "Fatihah",
};
const SETTINGS_LABEL: Record<Locale, string> = {
  ar: "الإعدادات",
  en: "Settings",
};
// UserMenu trigger
const ACCOUNT_LABEL: Record<Locale, string> = {
  ar: "حسابي",
  en: "Account",
};
// The results dropdown's surah heading, which SearchQueryResults renders only
// once `chapters.length > 0` — so it cannot match before results exist. Matched
// by prefix because the count is rendered inside it as a localized numeral.
// Deliberately not a locator for the result row itself: the home page's own
// surah list renders each surah as a link with the same accessible name, so
// `getByRole("link", { name: "Al-Fatihah" })` would resolve against the list
// underneath the dropdown and pass before the search had rendered anything.
const SEARCH_RESULTS_HEADING: Record<Locale, RegExp> = {
  ar: /^السور \(/,
  en: /^Surahs \(/,
};

/** Sets the theme in localStorage before first paint, mirroring app/utils/storage.ts's JSON.stringify shape. */
async function withTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("theme", JSON.stringify(t));
  }, theme);
}

// Blocks until every mounted safha has painted its word rows.
//
// `toHaveScreenshot` decides a page has settled by comparing two screenshots
// 100ms apart — but it disables CSS animations first, which freezes the loading
// skeleton's `animate-pulse` and makes a half-loaded reader look like a settled
// one. Its only built-in readiness signal, `document.fonts.ready`, resolves long
// before the line content arrives (ADR 0034), so without this the captured frame
// is whichever of {skeleton, text} the runner happened to reach — measured at
// 4-in-8 runs, and the difference between the two lands right on the diff gate.
//
// This asserts content is PRESENT rather than that the skeleton is absent. A
// `no .animate-pulse` check returns an empty list — and so passes instantly —
// the moment that class is renamed, silently restoring the flake with no failing
// test to reveal it. The length guard is the same hazard one level up: `every()`
// on an empty list is vacuously true. See docs/plans/visual-e2e-testing.md
// Addendum (2026-08-02).
async function waitForReaderContent(page: Page) {
  await page.waitForFunction(() => {
    const safhas = Array.from(document.querySelectorAll(".fq-quran-safha"));
    return safhas.length > 0 && safhas.every((el) => el.querySelector(".fq-safha-row"));
  });
}

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    const suffix = `${locale}-${theme}`;

    test.describe(`home (${suffix})`, () => {
      test("surah list", async ({ page }) => {
        await withTheme(page, theme);
        await page.goto(`/${locale}`);
        await expect(page).toHaveScreenshot(`home-${suffix}.png`);
      });
    });

    test.describe(`quran page 1 (${suffix})`, () => {
      test("single page, short opening page", async ({ page }) => {
        await withTheme(page, theme);
        await page.goto(`/${locale}/pages/1`);
        await waitForReaderContent(page);
        await expect(page).toHaveScreenshot(`page-1-${suffix}.png`);
      });
    });

    test.describe(`quran pages 2-3 double-spread (${suffix})`, () => {
      test("double-page spread", async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name === "mobile",
          "double-page spread only renders at lg+ (ADR 0013) — nothing distinct to capture on mobile"
        );
        await withTheme(page, theme);
        await page.goto(`/${locale}/pages/2`);
        await waitForReaderContent(page);
        await expect(page).toHaveScreenshot(`spread-2-3-${suffix}.png`);
      });
    });

    test.describe(`search results (${suffix})`, () => {
      test("search for a chapter", async ({ page }) => {
        await withTheme(page, theme);
        await page.goto(`/${locale}`);

        // Search is a single icon trigger at every breakpoint (desktop no
        // longer has a persistent inline field — SearchBar.tsx,
        // docs/plans/desktop-navbar-font-bg.md) that opens the same
        // full-screen Sheet/dialog overlay on both desktop and mobile.
        await page.getByRole("button", { name: SEARCH_PLACEHOLDER[locale] }).click();
        const scope = page.getByRole("dialog");
        await scope.getByPlaceholder(SEARCH_PLACEHOLDER[locale]).fill(SEARCH_QUERY[locale]);

        // Positive wait on the rendered results rather than a fixed sleep: the
        // old `waitForTimeout(800)` left only ~300ms after the 500ms debounce for
        // the request and render, so the screenshot caught either the spinner or
        // the dropdown depending on timing — 2 of the 4 search snapshots differed
        // run-to-run at a ratio of ~0.05, well past the diff gate.
        await expect(scope.getByText(SEARCH_RESULTS_HEADING[locale])).toBeVisible();
        await expect(page).toHaveScreenshot(`search-${suffix}.png`);
      });
    });

    test.describe(`settings sheet (${suffix})`, () => {
      test("open settings sheet", async ({ page, isMobile }) => {
        await withTheme(page, theme);
        await page.goto(`/${locale}`);
        // Settings is in the nav row on desktop, but behind the UserMenu on mobile.
        if (isMobile) {
          await page.getByRole("button", { name: ACCOUNT_LABEL[locale] }).click();
        }
        await page.getByRole("button", { name: SETTINGS_LABEL[locale] }).click();
        // Sheet slide-in animation.
        await page.waitForTimeout(600);
        await expect(page).toHaveScreenshot(`settings-${suffix}.png`);
      });
    });
  }
}
