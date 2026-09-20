import { test, expect } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  skipNonDesktop,
  swipeReader,
  longPressWord,
} from "../helpers/reader";

// Regression coverage for #642: the 1024–1366px tablet band also covers the
// most common non-touch laptop viewports. Interaction must key off input
// capability (ADR 0071), not width — fine-pointer laptops get desktop
// interaction inside the tablet shape, touch tablets keep touch behavior.
test.describe("Tablet band without touch (1280px laptop): desktop interaction", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({}, testInfo) => {
    skipNonDesktop(testInfo, "Tablet-band pointer gating asserts desktop-class pointers");
  });

  test("primary pointer is fine inside the tablet band", async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const contract = await page.evaluate(() => ({
      inTabletBand: window.matchMedia("(min-width: 1024px) and (max-width: 1366px)").matches,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    }));
    expect(contract.inTabletBand).toBe(true);
    expect(contract.coarsePointer).toBe(false);
  });

  test("word click opens the mark modal and background click toggles reader chrome", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await expect(firstWord).toBeVisible();
    await firstWord.click();

    // Unauthenticated click opens the modal's sign-in prompt (no DB writes).
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("تحديد كلمة").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Pinned chrome for fine pointers is background-click toggleable (the
    // mouse equivalent of the touch tap-toggle): hide, confirm no modal
    // opened, then show again.
    const nav = page.locator("nav.fq-nav-visible");
    await expect(nav).toBeVisible();
    await page.mouse.click(20, 400);
    await expect(nav).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.mouse.click(20, 400);
    await expect(nav).toBeVisible();
  });

  test("in-spread arrows stay hidden inside the band; keyboard steps a whole pair", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Full-bleed bands navigate by swipe/drag, never arrows — arrows are a
    // >=1367px control (design-principles "Navigation buttons"). Lock that in.
    await expect(
      getActivePanel(page).locator(".fq-nav-arrow:visible")
    ).toHaveCount(0);

    // Keyboard covers pair-step navigation instead: forward then back.
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/ar/pages/1");
  });

  test("mouse drag turns the page without opening the mark modal", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Quran is RTL: drag right = next pair.
    await page.mouse.move(640, 400);
    await page.mouse.down();
    await page.mouse.move(830, 400, { steps: 12 });
    await page.mouse.up();

    await expect(page).toHaveURL("/ar/pages/3");
    await waitForReaderContent(page);
    // The release click of a committed drag is suppressed — no modal opens
    // on the newly arrived page's word under the cursor.
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("Tablet band with touch (1280px tablet): touch behavior unchanged", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({}, testInfo) => {
    skipNonDesktop(testInfo, "Runs once under the desktop project with emulated touch");
  });

  test("primary pointer is coarse inside the tablet band", async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const contract = await page.evaluate(() => ({
      inTabletBand: window.matchMedia("(min-width: 1024px) and (max-width: 1366px)").matches,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    }));
    expect(contract.inTabletBand).toBe(true);
    expect(contract.coarsePointer).toBe(true);
  });

  test("short tap toggles chrome without opening the modal; long-press opens it", async ({
    page,
  }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // Chrome starts hidden on touch; a short tap reveals it and must not
    // open the mark modal (tap is the nav toggle, not a click-to-mark).
    await expect(page.locator("nav.fq-nav-visible")).toHaveCount(0);
    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await expect(firstWord).toBeVisible();
    await firstWord.tap();
    await expect(page.locator("nav.fq-nav-visible")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Long-press keeps opening the modal on touch.
    await longPressWord(page, firstWord, 600);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("تحديد كلمة").first()).toBeVisible();
  });

  test("touch swipe still turns the page inside the band", async ({ page }) => {
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    await swipeReader(page, 190);
    await expect(page).toHaveURL("/ar/pages/3");
  });
});
