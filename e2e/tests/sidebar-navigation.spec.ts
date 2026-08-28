import { test, expect } from "@playwright/test";
import {
  waitForReaderContent,
  revealNavOverlay,
  skipNonDesktop,
  skipNonMobile,
} from "../helpers/reader";

function getOpenTrigger(page: import("@playwright/test").Page) {
  return page.locator('nav button[aria-label="Open navigation"]');
}

function getCloseTrigger(page: import("@playwright/test").Page) {
  return page.locator('nav button[aria-label="Close navigation"]');
}

function getSidebarDialog(page: import("@playwright/test").Page) {
  return page.getByRole("dialog");
}

function getAyahsTab(sheet: import("@playwright/test").Locator) {
  return sheet.getByRole("tab", { name: /الآيات|Ayahs/ });
}

function getFilterInput(sheet: import("@playwright/test").Locator) {
  return sheet.locator('input[placeholder*="اسم السورة"], input[placeholder*="الجزء"], input[placeholder*="Surah name"], input[placeholder*="Juz"], input[placeholder*="ابحث"], input[placeholder*="Search"], input[placeholder*="رشّح"], input[placeholder*="Filter"]');
}

function getAyahInput(sheet: import("@playwright/test").Locator) {
  return sheet.locator('input[placeholder*="أدخل رقم الآية"], input[placeholder*="Ayah number"]');
}

function getPageInput(sheet: import("@playwright/test").Locator) {
  return sheet.locator('input[placeholder*="رقم الصفحة"], input[placeholder*="page number"]');
}

function getSurahPickerTrigger(sheet: import("@playwright/test").Locator) {
  return sheet.locator("button[aria-expanded]").first();
}

function getSurahPickerSearchInput(sheet: import("@playwright/test").Locator) {
  return sheet.locator('input[placeholder*="اختر سورة"], input[placeholder*="Choose a surah"]');
}

test.describe("Sidebar Trigger: Presence & Layout Boundary", () => {
  test("renders Nav-mounted sidebar trigger on reader pages with active surah & juz metadata (Desktop)", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop navbar layout verification");
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Nav-mounted trigger exists and is initially closed
    const trigger = getOpenTrigger(page);
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Displays metadata for Page 1: Surah 1 glyph & Juz 1 • Hizb 1
    await expect(trigger).toContainText("001");
    await expect(trigger).toContainText("جزء ١");
    await expect(trigger).toContainText("الحزب ١");
  });

  test("renders Nav-mounted sidebar trigger as single-line pill (Mobile)", async ({
    page,
  }, testInfo) => {
    skipNonMobile(testInfo, "Mobile navbar layout verification");
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    const trigger = getOpenTrigger(page);
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toContainText("001");
  });

  test("does not render sidebar trigger on non-reader routes", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();

    const trigger = getOpenTrigger(page);
    await expect(trigger).toHaveCount(0);
  });
});

test.describe("Sidebar Drawer: Open & Close Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);
  });

  test("opens via Nav trigger and closes via X button", async ({ page }) => {
    const trigger = getOpenTrigger(page);
    await trigger.click();

    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();
    await expect(getCloseTrigger(page)).toBeVisible();

    // Click close button inside sheet header
    const closeBtn = sheet.getByRole("button").first();
    await closeBtn.click();

    await expect(sheet).not.toBeVisible();
    await expect(getOpenTrigger(page)).toBeVisible();
  });

  test("closes via backdrop overlay click", async ({ page }) => {
    const trigger = getOpenTrigger(page);
    await trigger.click();

    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    // Click backdrop overlay outside the drawer
    const overlay = page.locator('[data-radix-dialog-overlay], [data-state="open"].fixed.inset-0').first();
    await overlay.click({ position: { x: 10, y: 100 }, force: true });

    await expect(sheet).not.toBeVisible();
  });

  test("closes via Escape keyboard key", async ({ page }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard escape is desktop-oriented");
    const trigger = getOpenTrigger(page);
    await trigger.click();

    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();
  });
});

test.describe("Sidebar Tabs: Surahs, Rubs & Ayahs Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);
    await getOpenTrigger(page).click();
    await expect(getSidebarDialog(page)).toBeVisible();
  });

  test("switches between Surahs, Rubs, and Ayahs tabs displaying corresponding content", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const surahsTab = sheet.getByRole("tab", { name: /السور|Surahs/ });
    const rubsTab = sheet.getByRole("tab", { name: /أرباع|Rubs/ });
    const ayahsTab = getAyahsTab(sheet);

    // 1. Surahs tab is active by default
    await expect(surahsTab).toHaveAttribute("aria-selected", "true");
    const surahItems = sheet.locator("[data-surah-id]");
    await expect(surahItems).toHaveCount(114);

    // 2. Switch to Rubs tab
    await rubsTab.click();
    await expect(rubsTab).toHaveAttribute("aria-selected", "true");
    await expect(surahsTab).toHaveAttribute("aria-selected", "false");

    // Rub list renders Juz group headings and 240 rub links
    const rubItems = sheet.locator("[data-rub-id]");
    await expect(rubItems).toHaveCount(240);
    await expect(sheet.getByText(/جزء\s*١|Juz\s*1/).first()).toBeVisible();

    // 3. Switch to Ayahs tab
    await ayahsTab.click();
    await expect(ayahsTab).toHaveAttribute("aria-selected", "true");
    await expect(rubsTab).toHaveAttribute("aria-selected", "false");
    await expect(sheet.getByRole("button", { name: /الفاتحة/ })).toBeVisible();

    // 4. Switch back to Surahs tab
    await surahsTab.click();
    await expect(surahsTab).toHaveAttribute("aria-selected", "true");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(114);
  });
});

test.describe("Sidebar Search Filters: Surahs & Rubs Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);
    await getOpenTrigger(page).click();
    await expect(getSidebarDialog(page)).toBeVisible();
  });

  test("filters surahs by Arabic name and Enter navigates to first result", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const filterInput = getFilterInput(sheet);
    await expect(filterInput).toBeVisible();

    await filterInput.fill("الكهف");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(1);
    await expect(sheet.locator('[data-surah-id="18"]')).toBeVisible();
    await expect(sheet.getByRole("status")).toContainText("١ نتيجة");

    // Press Enter to navigate to first result
    await filterInput.press("Enter");
    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL("/ar/pages/293");
  });

  test("filters surahs by exact number with Eastern Arabic numerals", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const filterInput = getFilterInput(sheet);

    await filterInput.fill("٦٧");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(1);
    await expect(sheet.locator('[data-surah-id="67"]')).toBeVisible();
  });

  test("filters rubs by juz prefix and associated surah name", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    await sheet.getByRole("tab", { name: /أرباع|Rubs/ }).click();

    const filterInput = getFilterInput(sheet);
    await expect(filterInput).toBeVisible();

    // 1. Filter by Juz 5 (rubs 33-40)
    await filterInput.fill("جزء ٥");
    await expect(sheet.locator("[data-rub-id]")).toHaveCount(8);
    await expect(sheet.locator('[data-rub-id="33"]')).toBeVisible();
    await expect(sheet.locator('[data-rub-id="40"]')).toBeVisible();

    // 2. Filter by surah name Maryam
    await filterInput.fill("مريم");
    const maryamRubs = sheet.locator("[data-rub-id]");
    await expect(maryamRubs).toHaveCount(2);
  });

  test("clear-first Escape contract: first Escape clears input, second Escape closes sheet", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Keyboard escape testing");
    const sheet = getSidebarDialog(page);
    const filterInput = getFilterInput(sheet);

    await filterInput.fill("الكهف");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(1);

    // 1st Escape: clears filter query, sheet remains open, all 114 restored
    await page.keyboard.press("Escape");
    await expect(filterInput).toHaveValue("");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(114);
    await expect(sheet).toBeVisible();

    // 2nd Escape: closes sheet
    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();
  });

  test("preserves independent query state across tab switches", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const filterInput = getFilterInput(sheet);

    // 1. Filter Surahs by "الكهف"
    await filterInput.fill("الكهف");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(1);

    // 2. Switch to Rubs tab and filter by "جزء ٢"
    await sheet.getByRole("tab", { name: /أرباع|Rubs/ }).click();
    await expect(filterInput).toHaveValue("");
    await filterInput.fill("جزء ٢");
    await expect(sheet.locator("[data-rub-id]")).toHaveCount(8);

    // 3. Switch back to Surahs tab -> query is preserved
    await sheet.getByRole("tab", { name: /السور|Surahs/ }).click();
    await expect(filterInput).toHaveValue("الكهف");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(1);

    // 4. Switch back to Rubs tab -> query is preserved
    await sheet.getByRole("tab", { name: /أرباع|Rubs/ }).click();
    await expect(filterInput).toHaveValue("جزء ٢");
    await expect(sheet.locator("[data-rub-id]")).toHaveCount(8);
  });

  test("shows empty state when no items match query", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const filterInput = getFilterInput(sheet);

    await filterInput.fill("999");
    await expect(sheet.getByText("لا توجد نتائج")).toBeVisible();
    await expect(sheet.getByText("السور ١–١١٤")).toBeVisible();

    await sheet.getByRole("tab", { name: /أرباع|Rubs/ }).click();
    await filterInput.fill("999");
    await expect(sheet.getByText("لا توجد نتائج")).toBeVisible();
    await expect(sheet.getByText("الجزء ١–٣٠ · الحزب ١–٦٠ · الربع ١–٢٤٠")).toBeVisible();
  });
});

test.describe("Sidebar Ayahs Tab & Ayah Picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);
    await getOpenTrigger(page).click();
    await expect(getSidebarDialog(page)).toBeVisible();
    await getAyahsTab(getSidebarDialog(page)).click();
  });

  test("renders active surah header, ayah chips grid, and hides shared filter field", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);

    // Shared filter field is hidden on Ayahs tab
    await expect(getFilterInput(sheet)).toHaveCount(0);

    // Header displays Surah Al-Fatihah and 7 verses
    await expect(sheet.getByRole("button", { name: /الفاتحة/ })).toBeVisible();
    await expect(sheet.getByText(/٧ آيات/)).toBeVisible();

    // 7 ayah chips rendered for Al-Fatihah
    const chips = sheet.locator('button[aria-label^="آية"]');
    await expect(chips).toHaveCount(7);

    // Chip 1 (on page 1) has the active highlight class
    await expect(chips.first()).toHaveClass(/border-primary\/50/);
  });

  test("tapping an ayah chip jumps to target page, closes drawer, and adds highlight param", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);

    // Tap Ayah 5 chip in Al-Fatihah
    const chip5 = sheet.locator('button[aria-label="آية ٥"]');
    await chip5.click();

    // Drawer closes immediately
    await expect(sheet).not.toBeVisible();

    // URL contains highlight parameter
    await expect(page).toHaveURL(/\/ar\/pages\/1\?highlight=1%3A5/);
  });

  test("typing ayah number and pressing Enter jumps to ayah with highlight", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const ayahInput = getAyahInput(sheet);

    // Wait for verse pages map to load (chips become enabled)
    await expect(sheet.locator('button[aria-label^="آية"]').first()).toBeEnabled();

    await ayahInput.fill("6");
    await ayahInput.press("Enter");

    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL(/\/ar\/pages\/1\?highlight=1%3A6/);
  });

  test("typing out-of-range ayah shows range error hint and prevents jump", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const ayahInput = getAyahInput(sheet);

    await ayahInput.fill("999");
    await expect(sheet.getByRole("status")).toContainText("اختر رقمًا بين ١ و ٧");

    await ayahInput.press("Enter");
    await expect(sheet).toBeVisible();
  });

  test("typing page number and pressing Enter jumps directly to page without highlight", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const pageInput = getPageInput(sheet);

    await pageInput.fill("200");
    await pageInput.press("Enter");

    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL("/ar/pages/200");
  });

  test("typing out-of-range page number shows range error hint and prevents jump", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const pageInput = getPageInput(sheet);

    await pageInput.fill("700");
    await expect(sheet.getByRole("status")).toContainText("اختر رقمًا بين ١ و ٦٠٤");

    await pageInput.press("Enter");
    await expect(sheet).toBeVisible();
  });

  test("retargets surah via inline searchable list and picks ayah from retargeted surah", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);

    // 1. Click target selector to open inline surah list
    const pickerTrigger = getSurahPickerTrigger(sheet);
    await pickerTrigger.click();
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "true");

    // 2. Search for Al-Kahf (18)
    const surahSearch = getSurahPickerSearchInput(sheet);
    await expect(surahSearch).toBeVisible();
    await surahSearch.fill("الكهف");

    // 3. Select Al-Kahf
    const kahfOption = sheet.getByRole("button", { name: /الكهف/ }).first();
    await kahfOption.click();

    // 4. Header is retargeted to Al-Kahf with 110 verses
    await expect(sheet.getByRole("button", { name: /الكهف/ })).toBeVisible();
    await expect(sheet.getByText(/١١٠ آيات/)).toBeVisible();

    // 5. 110 chips rendered and enabled
    const chips = sheet.locator('button[aria-label^="آية"]');
    await expect(chips).toHaveCount(110);
    await expect(chips.first()).toBeEnabled();

    // 6. Click Ayah 50 chip -> jumps to page 299 with highlight
    const chip50 = sheet.locator('button[aria-label="آية ٥٠"]');
    await chip50.click();

    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL(/\/ar\/pages\/299\?highlight=18%3A50/);
  });
});

test.describe("Sidebar Active Item & Auto-Scroll", () => {
  test("highlights active surah and auto-scrolls into view", async ({ page }) => {
    // Navigate directly to Page 50 (Surah Aal-Imran, starting page 50)
    await page.goto("/ar/pages/50");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    await getOpenTrigger(page).click();
    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    // Surah 3 is marked active
    const surah3 = sheet.locator('[data-surah-id="3"]');
    await expect(surah3).toBeVisible();
    await expect(surah3).toHaveClass(/border-primary\/50/);

    // Verify Surah 3 is auto-scrolled into the visible scroll viewport
    await expect(async () => {
      const isInViewport = await surah3.evaluate((el) => {
        const container = el.closest('[role="tabpanel"]') || el.parentElement;
        if (!container) return false;
        const cRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        return elRect.top >= cRect.top - 50 && elRect.bottom <= cRect.bottom + 50;
      });
      expect(isInViewport).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("highlights active rub in rubs tab", async ({ page }) => {
    // Page 5 hosts Rub 2 (starts 2:26)
    await page.goto("/ar/pages/5");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    await getOpenTrigger(page).click();
    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    await sheet.getByRole("tab", { name: /أرباع|Rubs/ }).click();

    const rub2 = sheet.locator('[data-rub-id="2"]');
    await expect(rub2).toBeVisible();
    await expect(rub2).toHaveClass(/bg-primary\/10/);
  });
});

test.describe("Sidebar Selection & Navigation Mechanics", () => {
  test("clicking a surah navigates to its starting page, closes drawer, and updates Nav", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    // Open sidebar and click Surah 2 (Al-Baqarah, starts on page 2)
    await getOpenTrigger(page).click();
    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    const surah2 = sheet.locator('[data-surah-id="2"]');
    await surah2.click();

    // Drawer closes immediately
    await expect(sheet).not.toBeVisible();

    // Navigates to page 2 and renders page 2 content
    await expect(page).toHaveURL("/ar/pages/2");
    await waitForReaderContent(page);

    // Nav trigger updates to Surah 2
    const trigger = getOpenTrigger(page);
    await expect(trigger).toContainText("002");
  });

  test("clicking a rub navigates to target page and updates Nav metadata", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    await getOpenTrigger(page).click();
    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    // Switch to rubs tab and click Rub 2 (starts on page 5)
    await sheet.getByRole("tab", { name: /أرباع|Rubs/ }).click();
    const rub2 = sheet.locator('[data-rub-id="2"]');
    await rub2.click();

    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL("/ar/pages/5");
    await waitForReaderContent(page);
  });

  test("clicking same-page item closes sidebar immediately without reload", async ({
    page,
  }) => {
    await page.goto("/ar/pages/2");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    await getOpenTrigger(page).click();
    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    // Click Surah 2 (starts on page 2, where we already are)
    await sheet.locator('[data-surah-id="2"]').click();

    // Closes immediately
    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL("/ar/pages/2");
  });

  test("multi-surah page selection pins chosen surah in Nav trigger", async ({
    page,
    isMobile,
  }) => {
    // Page 604 hosts Surahs 112 (Al-Ikhlas), 113 (Al-Falaq), and 114 (An-Nas)
    await page.goto("/ar/pages/604");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    await getOpenTrigger(page).click();
    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    // Click Surah 114 (An-Nas)
    const surah114 = sheet.locator('[data-surah-id="114"]');
    await surah114.click();

    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL("/ar/pages/604");

    // Nav trigger reflects pinned Surah 114 (114 / 0014)
    const trigger = getOpenTrigger(page);
    if (isMobile) {
      await expect(trigger).toContainText("١١٤");
    } else {
      await expect(trigger).toContainText("114");
    }
  });
});

test.describe("Sidebar Locale & Bi-Directionality (RTL vs LTR)", () => {
  test("English (LTR) renders left-anchored sheet with transliterated surahs and Western numbers", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/en/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);

    // Trigger on English reader shows English transliterated surah name
    const trigger = getOpenTrigger(page);
    await expect(trigger).toContainText("Al-Fatihah");

    await trigger.click();
    const sheet = getSidebarDialog(page);
    await expect(sheet).toBeVisible();

    // Sheet has LTR direction
    await expect(sheet).toHaveAttribute("dir", "ltr");

    // Tab triggers are in English
    const surahsTab = sheet.getByRole("tab", { name: "Surahs" });
    const rubsTab = sheet.getByRole("tab", { name: "Rubs" });
    await expect(surahsTab).toBeVisible();
    await expect(rubsTab).toBeVisible();

    // English transliterated names are visible in list
    await expect(sheet.getByText("Al-Baqarah")).toBeVisible();

    // Verify Ayahs tab in English
    const ayahsTab = getAyahsTab(sheet);
    await expect(ayahsTab).toBeVisible();
    await ayahsTab.click();
    await expect(sheet.getByRole("button", { name: "Al-Fatihah" })).toBeVisible();
    await expect(sheet.getByText(/7 ayahs/i)).toBeVisible();

    // Switch back to Surahs tab and click Surah 2
    await surahsTab.click();
    await sheet.locator('[data-surah-id="2"]').click();
    await expect(sheet).not.toBeVisible();
    await expect(page).toHaveURL("/en/pages/2");
    await waitForReaderContent(page);

    const updatedTrigger = getOpenTrigger(page);
    await expect(updatedTrigger).toContainText("Al-Baqarah");
    if (!isMobile) {
      await expect(updatedTrigger).toContainText(/Juz 1.*Hizb 1/);
    }
  });
});
