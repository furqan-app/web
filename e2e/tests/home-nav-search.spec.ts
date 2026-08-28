import { test, expect, type Page } from "@playwright/test";
import { waitForReaderContent, skipNonDesktop } from "../helpers/reader";

/**
 * Returns the home navigation search input for a given locale.
 */
function getHomeSearchInput(page: Page, locale: "ar" | "en" = "ar") {
  const placeholder =
    locale === "ar"
      ? "ابحث بسورة (الكهف)، جزء (جزء ٢٠)، أو صفحة (صفحة ٥٠)..."
      : "Search by surah (e.g. Mulk, 67), juz (juz 30), or page (page 50)...";
  return page.getByPlaceholder(placeholder);
}

test.describe("Home Navigation Search — Initial State & Rendering", () => {
  test("renders search input, all 114 surahs, and idle sections in Arabic", async ({
    page,
  }) => {
    await page.goto("/ar");

    const searchInput = getHomeSearchInput(page, "ar");
    await expect(searchInput).toBeVisible();

    // Verify all 114 surah cards are rendered
    await expect(page.locator("[data-surah-id]")).toHaveCount(114);

    // Verify recommended surahs section exists
    await expect(page.getByRole("region", { name: "السور الموصى بها" })).toBeVisible();
  });

  test("renders search input with English placeholder in English locale", async ({
    page,
  }) => {
    await page.goto("/en");

    const searchInput = getHomeSearchInput(page, "en");
    await expect(searchInput).toBeVisible();
    await expect(page.locator("[data-surah-id]")).toHaveCount(114);
  });
});

test.describe("Home Navigation Search — Live Surah Filtering", () => {
  test("filters by Arabic surah name with Hamza normalization and surah prefix", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    // 1. Al-Mulk (exact without Hamza)
    await searchInput.fill("الملك");
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);
    await expect(page.locator('[data-surah-id="67"]')).toBeVisible();

    // 2. Al-An'am typed without Hamza ("الانعام" -> matches "الأنعام")
    await searchInput.fill("الانعام");
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);
    await expect(page.locator('[data-surah-id="6"]')).toBeVisible();

    // 3. Al-An'am typed with Hamza ("الأنعام")
    await searchInput.fill("الأنعام");
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);
    await expect(page.locator('[data-surah-id="6"]')).toBeVisible();

    // 4. "سورة الكهف" with surah prefix
    await searchInput.fill("سورة الكهف");
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);
    await expect(page.locator('[data-surah-id="18"]')).toBeVisible();
  });

  test("filters by English surah name and shows live results count in English", async ({
    page,
  }) => {
    await page.goto("/en");
    const searchInput = getHomeSearchInput(page, "en");

    await searchInput.fill("Mulk");
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);
    await expect(page.locator('[data-surah-id="67"]')).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("1 results");

    // 1-char instant filter
    await searchInput.fill("q");
    const count = await page.locator("[data-surah-id]").count();
    expect(count).toBeGreaterThan(0);
    await expect(page.getByRole("status")).toHaveText(`${count} results`);
  });
});

test.describe("Home Navigation Search — Numeric Queries & Jump Rows", () => {
  test("bare digit <= 30 renders exact surah card, Juz row, and Page row", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    // Query "5" (or Eastern "٥")
    await searchInput.fill("٥");

    // Matches Surah 5 (Al-Ma'idah)
    await expect(page.locator('[data-surah-id="5"]')).toBeVisible();
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);

    // Jump rows: Juz 5 and Page 5
    const juzRow = page.getByRole("link", { name: /الجزء ٥/ });
    const pageRow = page.getByRole("link", { name: /صفحة ٥/ });
    await expect(juzRow).toBeVisible();
    await expect(pageRow).toBeVisible();
  });

  test("bare digit 31–114 renders exact surah card and Page row only", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    await searchInput.fill("67");

    // Matches Surah 67 (Al-Mulk)
    await expect(page.locator('[data-surah-id="67"]')).toBeVisible();
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);

    // Page 67 jump row only (Juz 67 > 30 so omitted)
    await expect(page.getByRole("link", { name: /صفحة ٦٧/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /الجزء/ })).toBeHidden();
  });

  test("bare digit > 114 collapses grid and renders Page row only", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    await searchInput.fill("200");

    // Grid collapses: 0 surah cards
    await expect(page.locator("[data-surah-id]")).toHaveCount(0);

    // Page 200 jump row
    const pageRow = page.getByRole("link", { name: /صفحة ٢٠٠/ });
    await expect(pageRow).toBeVisible();
    await expect(pageRow).toHaveAttribute("href", /\/ar\/pages\/200$/);
  });

  test("prefixed query with definite article 'الجزء N' collapses grid and renders Juz jump row", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    // Definite article "الجزء 20"
    await searchInput.fill("الجزء 20");

    // Grid collapses
    await expect(page.locator("[data-surah-id]")).toHaveCount(0);

    // Juz 20 jump row with starting page (page 382)
    const juzRow = page.getByRole("link", { name: /الجزء ٢٠ · يبدأ في ص ٣٨٢/ });
    await expect(juzRow).toBeVisible();
    await expect(juzRow).toHaveAttribute("href", /\/ar\/pages\/382$/);

    // Indefinite with Eastern Arabic numeral "جزء ٣٠"
    await searchInput.fill("جزء ٣٠");
    const juzRow30 = page.getByRole("link", { name: /الجزء ٣٠ · يبدأ في ص ٥٨٢/ });
    await expect(juzRow30).toBeVisible();
    await expect(juzRow30).toHaveAttribute("href", /\/ar\/pages\/582$/);
  });

  test("prefixed query with definite article 'الصفحة N' collapses grid and renders Page jump row", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    // Definite article "الصفحة 100"
    await searchInput.fill("الصفحة 100");

    // Grid collapses
    await expect(page.locator("[data-surah-id]")).toHaveCount(0);

    // Page 100 jump row
    const pageRow = page.getByRole("link", { name: /صفحة ١٠٠/ });
    await expect(pageRow).toBeVisible();
    await expect(pageRow).toHaveAttribute("href", /\/ar\/pages\/100$/);
  });

  test("bare prefix keywords render inline guidance prompt and suppress empty state", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    // "جزء"
    await searchInput.fill("جزء");
    await expect(page.locator("[data-surah-id]")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("اكتب رقم الجزء (١–٣٠) للانتقال السريع");
    await expect(page.getByText("لا توجد نتائج")).toBeHidden();

    // "الصفحة"
    await searchInput.fill("الصفحة");
    await expect(page.locator("[data-surah-id]")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("اكتب رقم الصفحة (١–٦٠٤) للانتقال السريع");
    await expect(page.getByText("لا توجد نتائج")).toBeHidden();
  });

  test("out-of-range prefixed queries render inline range hints", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    // Page > 604
    await searchInput.fill("page 999");
    await expect(page.locator("[data-surah-id]")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("الصفحات ١–٦٠٤");
    await expect(page.getByRole("link", { name: /صفحة/ })).toBeHidden();

    // Juz > 30
    await searchInput.fill("juz 31");
    await expect(page.locator("[data-surah-id]")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("الأجزاء ١–٣٠");
    await expect(page.getByRole("link", { name: /الجزء/ })).toBeHidden();
  });
});

test.describe("Home Navigation Search — Empty State & Section Visibility", () => {
  test("renders unified empty state for non-matching query", async ({ page }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    await searchInput.fill("xyznonexistent");

    await expect(page.locator("[data-surah-id]")).toHaveCount(0);
    await expect(page.getByText("لا توجد نتائج")).toBeVisible();
    await expect(
      page.getByText("تبحث عن آية؟ استخدم البحث في الشريط العلوي.")
    ).toBeVisible();
  });

  test("active query hides continue-reading and recommended cards; clearing restores them", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    // Type query
    await searchInput.fill("الملك");

    // Continue reading / recommended section hidden
    await expect(page.getByRole("region", { name: "السور الموصى بها" })).toBeHidden();

    // Click clear 'X' button
    const clearButton = page.getByRole("button", { name: "مسح البحث" });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Query cleared and cards restored
    await expect(searchInput).toHaveValue("");
    await expect(page.locator("[data-surah-id]")).toHaveCount(114);
  });
});

const NAV_TIMEOUT = 15000;

test.describe("Home Navigation Search — Keyboard & Click Navigation", () => {
  test("Escape key clears active query and restores full grid", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard shortcuts are desktop-oriented");

    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    await searchInput.fill("البقرة");
    await expect(page.locator("[data-surah-id]")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(searchInput).toHaveValue("");
    await expect(page.locator("[data-surah-id]")).toHaveCount(114);
  });

  test("Enter key on jump row navigates to page", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard Enter navigation is desktop-oriented");

    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    await searchInput.fill("200");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("/ar/pages/200", { timeout: NAV_TIMEOUT });
    await waitForReaderContent(page);
  });

  test("Enter key on filtered surah name navigates to surah start page", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard Enter navigation is desktop-oriented");

    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    await searchInput.fill("الملك");
    await page.keyboard.press("Enter");

    // Al-Mulk starts on page 562
    await expect(page).toHaveURL("/ar/pages/562", { timeout: NAV_TIMEOUT });
    await waitForReaderContent(page);
  });

  test("clicking a jump row navigates to the target reader page", async ({
    page,
  }) => {
    await page.goto("/en");
    const searchInput = getHomeSearchInput(page, "en");

    await searchInput.fill("page 100");
    const pageRow = page.getByRole("link", { name: "Page 100" });
    await expect(pageRow).toBeVisible();

    await pageRow.click();
    await expect(page).toHaveURL("/en/pages/100", { timeout: NAV_TIMEOUT });
    await waitForReaderContent(page);
  });

  test("clicking a filtered surah card navigates to its starting page", async ({
    page,
  }) => {
    await page.goto("/ar");
    const searchInput = getHomeSearchInput(page, "ar");

    await searchInput.fill("الكهف");
    const kahfCard = page.locator('[data-surah-id="18"]');
    await expect(kahfCard).toBeVisible();

    await kahfCard.click();
    await expect(page).toHaveURL("/ar/pages/293", { timeout: NAV_TIMEOUT });
    await waitForReaderContent(page);
  });
});
