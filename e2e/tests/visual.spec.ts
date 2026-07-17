import { test, expect, type Page } from "@playwright/test";

// Visual regression smoke suite — see docs/plans/visual-e2e-testing.md and
// ADR 0018. Covers 5 fixed screens x {ar, en} x {light, dark}, run against
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

/** Sets the theme in localStorage before first paint, mirroring app/utils/storage.ts's JSON.stringify shape. */
async function withTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("theme", JSON.stringify(t));
  }, theme);
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
        await expect(page).toHaveScreenshot(`spread-2-3-${suffix}.png`);
      });
    });

    test.describe(`search results (${suffix})`, () => {
      test("search for a chapter", async ({ page }, testInfo) => {
        await withTheme(page, theme);
        await page.goto(`/${locale}`);

        if (testInfo.project.name === "mobile") {
          await page.getByRole("button", { name: SEARCH_PLACEHOLDER[locale] }).click();
          const dialog = page.getByRole("dialog");
          await dialog.getByPlaceholder(SEARCH_PLACEHOLDER[locale]).fill(SEARCH_QUERY[locale]);
        } else {
          await page.getByPlaceholder(SEARCH_PLACEHOLDER[locale]).fill(SEARCH_QUERY[locale]);
        }

        // Debounced search (500ms) + results render.
        await page.waitForTimeout(800);
        await expect(page).toHaveScreenshot(`search-${suffix}.png`);
      });
    });

    test.describe(`settings sheet (${suffix})`, () => {
      test("open settings sheet", async ({ page }) => {
        await withTheme(page, theme);
        await page.goto(`/${locale}`);
        await page.getByRole("button", { name: SETTINGS_LABEL[locale] }).click();
        // Sheet slide-in animation.
        await page.waitForTimeout(600);
        await expect(page).toHaveScreenshot(`settings-${suffix}.png`);
      });
    });
  }
}
