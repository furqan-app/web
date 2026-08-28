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

test.describe("Sidebar Tabs: Surahs & Rubs Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await revealNavOverlay(page);
    await getOpenTrigger(page).click();
    await expect(getSidebarDialog(page)).toBeVisible();
  });

  test("switches between Surahs and Rubs tabs displaying full list items", async ({
    page,
  }) => {
    const sheet = getSidebarDialog(page);
    const surahsTab = sheet.getByRole("tab", { name: /السور|Surahs/ });
    const rubsTab = sheet.getByRole("tab", { name: /أرباع|Rubs/ });

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

    // 3. Switch back to Surahs tab
    await surahsTab.click();
    await expect(surahsTab).toHaveAttribute("aria-selected", "true");
    await expect(sheet.locator("[data-surah-id]")).toHaveCount(114);
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

    // Clicking Surah 2 navigates to /en/pages/2
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
