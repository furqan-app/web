import { test, expect } from "@playwright/test";
import {
  waitForReaderContent,
  openSettings,
  getStorageItem,
  skipNonDesktop,
  skipNonMobile,
  revealNavOverlay,
} from "../helpers/reader";

test.describe("Settings Drawer: Open & Close Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("opens via navbar settings button and closes via X close button", async ({ page }) => {
    const sheet = await openSettings(page);
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: /الإعدادات|Settings/ })).toBeVisible();

    // Close using the X close button
    const closeBtn = sheet.getByRole("button", { name: /Close|إغلاق/i }).first();
    await closeBtn.click();
    await expect(sheet).not.toBeVisible();
  });

  test("closes via backdrop overlay click (Desktop)", async ({ page }, testInfo) => {
    skipNonDesktop(testInfo, "Mobile sheet is full width (w-full); backdrop overlay is desktop-accessible");
    const sheet = await openSettings(page);
    await expect(sheet).toBeVisible();

    // Click backdrop overlay in the uncovered area (RTL sheet is on the left, click right side based on viewport width)
    const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
    const overlay = page.locator('[data-radix-dialog-overlay], [data-state="open"].fixed.inset-0').first();
    await overlay.click({ position: { x: viewport.width - 100, y: 100 }, force: true });
    await expect(sheet).not.toBeVisible();
  });

  test("closes via Escape keyboard key", async ({ page }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard escape is desktop-oriented");
    const sheet = await openSettings(page);
    await expect(sheet).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();
  });
});

test.describe("Theme Switching & Storage Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("toggles Light, Gold, and Dark themes and updates DOM classes and localStorage", async ({
    page,
  }) => {
    const sheet = await openSettings(page);

    // 1. Toggle Gold (ذهبي)
    const goldRadio = sheet.locator('button[role="radio"]').filter({ hasText: /ذهبي|Gold/ });
    await goldRadio.click();
    await expect(goldRadio).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveClass(/theme-gold/);
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    const storedGold = await getStorageItem(page, "theme");
    expect(storedGold).toBe(JSON.stringify("gold"));

    // 2. Toggle Dark (داكن)
    const darkRadio = sheet.locator('button[role="radio"]').filter({ hasText: /داكن|Dark/ });
    await darkRadio.click();
    await expect(darkRadio).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("html")).toHaveClass(/theme-dark/);
    await expect(page.locator("html")).not.toHaveClass(/theme-gold/);
    const storedDark = await getStorageItem(page, "theme");
    expect(storedDark).toBe(JSON.stringify("dark"));

    // 3. Toggle Light (فاتح)
    const lightRadio = sheet.locator('button[role="radio"]').filter({ hasText: /فاتح|Light/ });
    await lightRadio.click();
    await expect(lightRadio).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveClass(/theme-light/);
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    const storedLight = await getStorageItem(page, "theme");
    expect(storedLight).toBe(JSON.stringify("light"));
  });

  test("persists theme selection across page reload", async ({ page }) => {
    const sheet = await openSettings(page);
    const darkRadio = sheet.locator('button[role="radio"]').filter({ hasText: /داكن|Dark/ });
    await darkRadio.click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    // Hard page reload
    await page.reload();
    await waitForReaderContent(page);

    // Assert theme persistence on root element
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("html")).toHaveClass(/theme-dark/);

    // Assert radio selection remains checked
    const sheetAfter = await openSettings(page);
    const darkRadioAfter = sheetAfter.locator('button[role="radio"]').filter({ hasText: /داكن|Dark/ });
    await expect(darkRadioAfter).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("Desktop Quran Font Size Presets (ADR 0038)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop font presets are desktop-only");
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("adjusts font size presets (Small 26px, Medium 28px, Large 30px) and updates reader CSS", async ({
    page,
  }) => {
    const sheet = await openSettings(page);
    const fontTrigger = sheet.locator("button").filter({ hasText: /حجم الخط|Quran Font Size/ });

    // 1. Select Medium (٢٨ / 28)
    await fontTrigger.click();
    const mediumBtn = sheet.locator(".fq-section-drawer button").filter({ hasText: /متوسط|Medium/ });
    await mediumBtn.click();

    const storedMed = await getStorageItem(page, "desktopQuranFontSize");
    expect(storedMed).toBe(JSON.stringify("medium"));
    await expect(page.locator(".fq-safha-card").first()).toHaveAttribute(
      "style",
      /--fq-desktop-word:\s*28px/
    );

    // 2. Select Large (٣٠ / 30)
    await fontTrigger.click();
    const largeBtn = sheet.locator(".fq-section-drawer button").filter({ hasText: /كبير|Large/ });
    await largeBtn.click();

    const storedLarge = await getStorageItem(page, "desktopQuranFontSize");
    expect(storedLarge).toBe(JSON.stringify("large"));
    await expect(page.locator(".fq-safha-card").first()).toHaveAttribute(
      "style",
      /--fq-desktop-word:\s*30px/
    );

    // 3. Select Small (٢٦ / 26)
    await fontTrigger.click();
    const smallBtn = sheet.locator(".fq-section-drawer button").filter({ hasText: /صغير|Small/ });
    await smallBtn.click();

    const storedSmall = await getStorageItem(page, "desktopQuranFontSize");
    expect(storedSmall).toBe(JSON.stringify("small"));
    await expect(page.locator(".fq-safha-card").first()).toHaveAttribute(
      "style",
      /--fq-desktop-word:\s*26px/
    );
  });

  test("persists font size preset across page reload", async ({ page }) => {
    const sheet = await openSettings(page);
    const fontTrigger = sheet.locator("button").filter({ hasText: /حجم الخط|Quran Font Size/ });
    await fontTrigger.click();
    const largeBtn = sheet.locator(".fq-section-drawer button").filter({ hasText: /كبير|Large/ });
    await largeBtn.click();

    await page.reload();
    await waitForReaderContent(page);

    const stored = await getStorageItem(page, "desktopQuranFontSize");
    expect(stored).toBe(JSON.stringify("large"));
    await expect(page.locator(".fq-safha-card").first()).toHaveAttribute(
      "style",
      /--fq-desktop-word:\s*30px/
    );
  });
});

test.describe("Mushaf Layout Edition Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("toggles between Default and Tajweed Mushaf editions and updates storage", async ({
    page,
  }) => {
    const sheet = await openSettings(page);
    const mushafTrigger = sheet.locator("button").filter({ hasText: /تخطيط المصحف|Mushaf Layout/ });

    // 1. Switch to Tajweed (ID 19)
    await mushafTrigger.click();
    const tajweedRow = sheet
      .locator(".fq-section-drawer .fq-section-drawer-row")
      .filter({ hasText: /مصحف التجويد|Tajweed/ });
    await tajweedRow.locator("button").first().click();

    const storedTajweed = await getStorageItem(page, "quranMushafId");
    expect(storedTajweed).toBe("19");

    // Re-expand to verify checked radio indicator
    await mushafTrigger.click();
    await expect(tajweedRow.locator('[data-state="checked"]')).toBeVisible();

    // 2. Switch back to Default (ID 2)
    const defaultRow = sheet
      .locator(".fq-section-drawer .fq-section-drawer-row")
      .filter({ hasText: /مجمع الملك فهد|Madinah|QCF V1/ });
    await defaultRow.locator("button").first().click();

    const storedDefault = await getStorageItem(page, "quranMushafId");
    expect(storedDefault).toBe("2");

    // Re-expand to verify checked radio indicator
    await mushafTrigger.click();
    await expect(defaultRow.locator('[data-state="checked"]')).toBeVisible();
  });

  test("persists Mushaf edition across page reload", async ({ page }) => {
    const sheet = await openSettings(page);
    const mushafTrigger = sheet.locator("button").filter({ hasText: /تخطيط المصحف|Mushaf Layout/ });
    await mushafTrigger.click();
    const tajweedRow = sheet
      .locator(".fq-section-drawer .fq-section-drawer-row")
      .filter({ hasText: /مصحف التجويد|Tajweed/ });
    await tajweedRow.locator("button").first().click();

    await page.reload();
    await waitForReaderContent(page);

    const stored = await getStorageItem(page, "quranMushafId");
    expect(stored).toBe("19");

    const sheetAfter = await openSettings(page);
    await sheetAfter.locator("button").filter({ hasText: /تخطيط المصحف|Mushaf Layout/ }).click();
    const tajweedRowAfter = sheetAfter
      .locator(".fq-section-drawer .fq-section-drawer-row")
      .filter({ hasText: /مصحف التجويد|Tajweed/ });
    await expect(tajweedRowAfter.locator('[data-state="checked"]')).toBeVisible();
  });
});

test.describe("Desktop Page View Mode (Single vs Double)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    skipNonDesktop(testInfo, "Page view toggle is desktop-only");
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("toggles single and double page view mode and updates data-safha-view attribute", async ({
    page,
  }) => {
    const sheet = await openSettings(page);
    const pageViewTrigger = sheet.locator("button").filter({ hasText: /عرض الصفحة|Page View/ });

    // 1. Select Single page view
    await pageViewTrigger.click();
    const singleBtn = sheet
      .locator(".fq-section-drawer button")
      .filter({ hasText: /صفحة واحدة|Single page view/ });
    await singleBtn.click();

    await expect(page.locator("html")).toHaveAttribute("data-safha-view", "single");
    const storedSingle = await getStorageItem(page, "quranSafhaView");
    expect(storedSingle).toBe(JSON.stringify("single"));

    // 2. Select Double page view
    await pageViewTrigger.click();
    const doubleBtn = sheet
      .locator(".fq-section-drawer button")
      .filter({ hasText: /صفحتين|Double page view/ });
    await doubleBtn.click();

    await expect(page.locator("html")).toHaveAttribute("data-safha-view", "double");
    const storedDouble = await getStorageItem(page, "quranSafhaView");
    expect(storedDouble).toBe(JSON.stringify("double"));
  });

  test("persists page view mode across page reload", async ({ page }) => {
    const sheet = await openSettings(page);
    const pageViewTrigger = sheet.locator("button").filter({ hasText: /عرض الصفحة|Page View/ });
    await pageViewTrigger.click();
    const singleBtn = sheet
      .locator(".fq-section-drawer button")
      .filter({ hasText: /صفحة واحدة|Single page view/ });
    await singleBtn.click();

    await page.reload();
    await waitForReaderContent(page);

    await expect(page.locator("html")).toHaveAttribute("data-safha-view", "single");
    const stored = await getStorageItem(page, "quranSafhaView");
    expect(stored).toBe(JSON.stringify("single"));
  });
});

test.describe("Device Settings: Keep Screen Awake (Mobile)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    skipNonMobile(testInfo, "Keep screen awake toggle is mobile/tablet-only");
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("toggles keep screen awake switch and persists in localStorage", async ({ page }) => {
    const sheet = await openSettings(page);
    const switchEl = sheet.locator("#keep-screen-awake-switch");
    await expect(switchEl).toBeVisible();

    // Verify initial default state is checked (true)
    await expect(switchEl).toHaveAttribute("data-state", "checked");

    // 1. Toggle switch OFF
    await switchEl.click();
    const storedOff = await getStorageItem(page, "keepScreenAwake");
    expect(storedOff).toBe("false");

    // 2. Toggle switch back ON
    await switchEl.click();
    const storedOn = await getStorageItem(page, "keepScreenAwake");
    expect(storedOn).toBe("true");

    // 3. Toggle OFF and test reload persistence
    await switchEl.click();
    await page.reload();
    await waitForReaderContent(page);

    const storedAfterReload = await getStorageItem(page, "keepScreenAwake");
    expect(storedAfterReload).toBe("false");

    const sheetAfter = await openSettings(page);
    await expect(sheetAfter.locator("#keep-screen-awake-switch")).toHaveAttribute("data-state", "unchecked");
  });
});

test.describe("Language Switcher & Bi-Directionality (RTL vs LTR)", () => {
  test("switches between Arabic (RTL) and English (LTR) with correct sheet alignment and copy", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // 1. Arabic sheet verification
    const sheetAr = await openSettings(page);
    await expect(sheetAr).toHaveAttribute("dir", "rtl");
    await expect(sheetAr.getByRole("heading", { name: "الإعدادات" })).toBeVisible();

    // Switch to English
    const langTriggerAr = sheetAr.locator("button").filter({ hasText: /اللغة|Language/ });
    await langTriggerAr.click();
    const englishBtn = sheetAr.locator(".fq-section-drawer button").filter({ hasText: "English" });
    await englishBtn.click();

    // 2. English page verification
    await expect(page).toHaveURL("/en/pages/1");
    await waitForReaderContent(page);

    const sheetEn = await openSettings(page);
    await expect(sheetEn).toHaveAttribute("dir", "ltr");
    await expect(sheetEn.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(sheetEn.getByText("Reading", { exact: true })).toBeVisible();
    await expect(sheetEn.getByText("Appearance", { exact: true })).toBeVisible();

    // Switch back to Arabic
    const langTriggerEn = sheetEn.locator("button").filter({ hasText: /Language|اللغة/ });
    await langTriggerEn.click();
    const arabicBtn = sheetEn.locator(".fq-section-drawer button").filter({ hasText: "العربية" });
    await arabicBtn.click();

    await expect(page).toHaveURL("/ar/pages/1");
    await waitForReaderContent(page);
  });

  test("persists language selection across reader navigation back to home page", async ({
    page,
  }) => {
    // 1. Open homepage
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("body")).toHaveAttribute("dir", "rtl");

    // 2. Go to any Quran page (page 50)
    await page.goto("/ar/pages/50");
    await waitForReaderContent(page);
    await expect(page).toHaveURL("/ar/pages/50");

    // 3. Change language from settings to English
    const sheet = await openSettings(page);
    const langTrigger = sheet.locator("button").filter({ hasText: /اللغة|Language/ });
    await langTrigger.click();
    const englishBtn = sheet.locator(".fq-section-drawer button").filter({ hasText: "English" });
    await englishBtn.click();

    // Verify reader updated to English
    await expect(page).toHaveURL("/en/pages/50");
    await waitForReaderContent(page);

    // 4. Go to the home page (via Home link / logo in navbar)
    await revealNavOverlay(page);
    const homeLink = page.locator('nav a[aria-label="Home"]').first();
    await homeLink.click();

    // 5. Check the language again
    await expect(page).toHaveURL("/en");
    await expect(page.locator("div[dir='ltr']").first()).toBeVisible();
    await expect(
      page.getByPlaceholder("Search by surah (e.g. Mulk, 67), juz (juz 30), or page (page 50)...")
    ).toBeVisible();
    await expect(page.locator('nav button[aria-label="Settings"]')).toBeVisible();
  });
});
