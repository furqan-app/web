import { test, expect, type Page } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  openSearch,
  revealNavOverlay,
  skipNonDesktop,
  skipNonMobile,
} from "../helpers/reader";

function getOpenSidebarTrigger(page: Page) {
  return page.locator('nav button[aria-label="Open navigation"]');
}

function getCloseSidebarTrigger(page: Page) {
  return page.locator('nav button[aria-label="Close navigation"]');
}

function getSidebarDialog(page: Page) {
  return page.getByRole("dialog");
}

function getAyahsTab(sheet: import("@playwright/test").Locator) {
  return sheet.getByRole("tab", { name: /الآيات|Ayahs/ });
}

function getSurahPickerTrigger(sheet: import("@playwright/test").Locator) {
  return sheet.locator("button[aria-expanded]").first();
}

function getSurahPickerSearchInput(sheet: import("@playwright/test").Locator) {
  return sheet.locator('input[placeholder*="اختر سورة"], input[placeholder*="Choose a surah"]');
}

/**
 * Spoofs standalone/fullscreen mobile PWA mode and Android user agent
 * before page load so useIsStandaloneMobileOrTablet() and isAndroid() return true.
 */
async function spoofStandaloneAndroidPwa(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("fq-offline-prompt-dismissed-v2-2", "1");
      window.localStorage.setItem("fq-offline-prompt-dismissed-v2-19", "1");
    } catch {}

    const realMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes("display-mode")
        ? {
            matches: true,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return true;
            },
          }
        : realMatchMedia(query);

    Object.defineProperty(navigator, "userAgent", {
      value: navigator.userAgent + " Android",
      configurable: true,
    });
  });
}

test.describe("Multi-Layer Overlay Stacks & Cascading LIFO Dismissal", () => {
  test("Ayah Picker in-sheet sub-layer: 3-tier LIFO dismissal via Escape", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop Escape key navigation test");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // 1. Open Sidebar via Nav trigger
    const sidebarTrigger = getOpenSidebarTrigger(page);
    await sidebarTrigger.click();
    const sidebar = getSidebarDialog(page);
    await expect(sidebar).toBeVisible();

    // 2. Switch to Ayah Picker tab
    const ayahsTab = getAyahsTab(sidebar);
    await ayahsTab.click();
    await expect(ayahsTab).toHaveAttribute("data-state", "active");

    // 3. Open inline surah picker accordion
    const pickerTrigger = getSurahPickerTrigger(sidebar);
    await pickerTrigger.click();
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "true");

    const surahSearch = getSurahPickerSearchInput(sidebar);
    await expect(surahSearch).toBeVisible();

    // 4. Type query into search filter
    await surahSearch.fill("الكهف");
    await expect(surahSearch).toHaveValue("الكهف");

    // Tier 1: 1st Escape clears the filter query; inline picker and Sidebar remain open
    await page.keyboard.press("Escape");
    await expect(surahSearch).toHaveValue("");
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar).toBeVisible();

    // Tier 2: 2nd Escape collapses the inline surah picker list; Sidebar remains open
    await page.keyboard.press("Escape");
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(surahSearch).not.toBeVisible();
    await expect(pickerTrigger).toBeFocused();
    await expect(sidebar).toBeVisible();

    // Tier 3: 3rd Escape closes the Sidebar sheet; reader remains active
    await page.keyboard.press("Escape");
    await expect(sidebar).not.toBeVisible();
    const activePanel = getActivePanel(page);
    await expect(activePanel).toBeVisible();
  });

  test("Mobile standalone PWA: cascading back gesture pops nested sub-layer before Sidebar before Reader", async ({
    page,
  }, testInfo) => {
    skipNonMobile(testInfo, "Mobile standalone gesture verification");
    await spoofStandaloneAndroidPwa(page);

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // 1. Reveal nav overlay on mobile & open Sidebar via Nav trigger
    await revealNavOverlay(page);
    const sidebarTrigger = getOpenSidebarTrigger(page);
    await sidebarTrigger.click();
    const sidebar = getSidebarDialog(page);
    await expect(sidebar).toBeVisible();

    // 2. Switch to Ayah Picker tab & expand inline surah list
    const ayahsTab = getAyahsTab(sidebar);
    await ayahsTab.click();
    const pickerTrigger = getSurahPickerTrigger(sidebar);
    await pickerTrigger.click();
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "true");

    // 3. First back gesture: pops the nested picking guard, collapsing picker while Sidebar stays open
    await page.evaluate(() => window.history.back());
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(sidebar).toBeVisible();

    // 4. Second back gesture: pops the Sidebar guard, closing Sidebar while Reader stays mounted
    await page.evaluate(() => window.history.back());
    await expect(sidebar).not.toBeVisible();
    await expect(getActivePanel(page)).toBeVisible();

    // 5. Third back gesture on Reader: intercepted by AndroidBackExitGuard, shows exit toast
    await page.evaluate(() => window.history.back());
    const exitToast = page.getByText(/اضغط رجوع مرة أخرى للخروج|Press back again to exit/);
    await expect(exitToast).toBeVisible();
    await expect(page).toHaveURL(/\/ar\/pages\/1/);
  });

  test("Recitation Settings Sheet + ReciterCombobox Popover: strict LIFO dismissal via Escape", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop Escape popover stack test");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // 1. Open RecitationSettingsSheet via bottom player settings button
    const settingsBtn = page.locator('button[aria-label*="إعدادات التلاوة"], button[aria-label*="Recitation settings"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const recitationSheet = page.getByRole("dialog").filter({ hasText: /إعدادات التلاوة|Recitation Settings/ });
    await expect(recitationSheet).toBeVisible();

    // 2. Open ReciterCombobox popover inside the sheet
    const reciterTrigger = recitationSheet.locator("button[aria-expanded]").first();
    await expect(reciterTrigger).toBeVisible();
    await reciterTrigger.click();
    await expect(reciterTrigger).toHaveAttribute("aria-expanded", "true");

    // Popover content is visible
    const popoverContent = recitationSheet.locator(".max-h-\\[300px\\]");
    await expect(popoverContent).toBeVisible();

    // 3. 1st Escape: closes ReciterCombobox popover only; RecitationSettingsSheet remains open
    await page.keyboard.press("Escape");
    await expect(reciterTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(popoverContent).not.toBeVisible();
    await expect(recitationSheet).toBeVisible();

    // 4. 2nd Escape: closes RecitationSettingsSheet
    await page.keyboard.press("Escape");
    await expect(recitationSheet).not.toBeVisible();
    await expect(getActivePanel(page)).toBeVisible();
  });

  test("MarkModal to TafsirSheet cross-overlay transition stability without premature dismissals", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop cross-overlay modal transition test");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // 1. Open MarkModal by clicking word 1:1:1
    const activePanel = getActivePanel(page);
    const word111 = activePanel.locator('[data-fq-word="1:1:1"]');
    await expect(word111).toBeVisible();
    await word111.click();

    const markDialog = page.getByRole("dialog").filter({ hasText: /تشغيل من هنا|Play from here/ });
    await expect(markDialog).toBeVisible();

    // 2. Click Tafsir button in the MarkModal utility rail
    const tafsirBtn = markDialog.getByRole("button", { name: /تفسير|Tafsir/ });
    await expect(tafsirBtn).toBeVisible();
    await tafsirBtn.click();

    // 3. MarkModal closes and TafsirSheet opens
    await expect(markDialog).not.toBeVisible();
    const tafsirSheet = page.getByRole("dialog").filter({ hasText: /تفسير|Tafsir/ });
    await expect(tafsirSheet).toBeVisible();

    // 4. Press Escape to close TafsirSheet cleanly without reopening MarkModal or navigating
    await page.keyboard.press("Escape");
    await expect(tafsirSheet).not.toBeVisible();
    await expect(markDialog).not.toBeVisible();
    await expect(activePanel).toBeVisible();
  });

  test("Multi-hop history traversal: Home → Search → Reader → Sidebar → Reader with Back and Forward", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop multi-hop browser history traversal test");

    // 1. Start on Home
    await page.goto("/ar");
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();

    // 2. Open Search overlay and navigate to Reader
    const { searchDialog, searchInput } = await openSearch(page, "ar");
    await searchInput.fill("الحمد لله");
    const verseLink = searchDialog
      .locator("a[href*='highlight=1%3A2'], a[href*='highlight=1:2']")
      .first();
    await expect(verseLink).toBeVisible({ timeout: 10000 });
    await verseLink.click();

    await expect(searchDialog).toBeHidden();
    await expect(page).toHaveURL(/\/ar\/pages\/1\?.*highlight=1(%3A|:)2/);
    await waitForReaderContent(page);

    // 3. Open Sidebar and close it via X button inside sheet header
    const openTrigger = getOpenSidebarTrigger(page);
    await openTrigger.click();
    const sidebar = getSidebarDialog(page);
    await expect(sidebar).toBeVisible();

    const closeTrigger = sidebar.getByRole("button").first();
    await closeTrigger.click();
    await expect(sidebar).not.toBeVisible();
    await expect(getActivePanel(page)).toBeVisible();

    // 4. Browser Back: returns cleanly from Reader to Home (/ar)
    await page.goBack();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('[data-surah-id="1"]')).toBeVisible();

    // 5. Browser Forward: traverses back from Home to Reader (/ar/pages/1)
    await page.goForward();
    await expect(page).toHaveURL(/\/ar\/pages\/1/);
    await waitForReaderContent(page);
    await expect(getActivePanel(page)).toBeVisible();
  });
});
