import { type Page, type Locator, type TestInfo } from "@playwright/test";

/**
 * Returns the active visible center panel in ReaderPager.
 * ReaderPager renders 3 panels in .fq-reader-pager-strip: [prevPanel, currentPanel (nth=1), nextPanel].
 */
export function getActivePanel(page: Page): Locator {
  return page.locator(".fq-reader-panel").nth(1);
}

/**
 * Skips the current test if running under the mobile project.
 */
export function skipNonDesktop(
  testInfo: TestInfo,
  reason = "Desktop-only feature"
) {
  if (testInfo.project.name === "mobile") {
    testInfo.skip(true, reason);
  }
}

/**
 * Skips the current test if running under the desktop project.
 */
export function skipNonMobile(
  testInfo: TestInfo,
  reason = "Mobile-only feature"
) {
  if (testInfo.project.name !== "mobile") {
    testInfo.skip(true, reason);
  }
}

/**
 * Blocks until every mounted .fq-quran-safha has painted its word rows (.fq-safha-row).
 * Uses a positive content assertion rather than a skeleton-absence check (ADR 0022 / ADR 0034).
 */
export async function waitForReaderContent(page: Page) {
  await page.waitForFunction(() => {
    const safhas = Array.from(document.querySelectorAll(".fq-quran-safha"));
    return safhas.length > 0 && safhas.every((el) => el.querySelector(".fq-safha-row"));
  });
}

/**
 * Sets the stored safha view ("single" or "double") in localStorage and initializes
 * html[data-safha-view] before first paint, matching QuranSafhaViewContext / storage.ts.
 */
export async function setStoredSafhaView(page: Page, view: "single" | "double") {
  await page.addInitScript((v) => {
    window.localStorage.setItem("quranSafhaView", JSON.stringify(v));
    document.documentElement.setAttribute("data-safha-view", v);
  }, view);
}

/**
 * Sets the theme before first paint, matching storage.ts JSON serialization.
 * Exported for theme-dependent reader suites.
 */
export async function withTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => {
    window.localStorage.setItem("theme", JSON.stringify(t));
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

/**
 * Simulates a touch drag / swipe on the reader panel strip using multi-step touchmove dispatch.
 * dx > 0: drag right (Quran RTL forward / next page)
 * dx < 0: drag left (Quran RTL backward / prev page)
 */
export async function swipeReader(
  page: Page,
  dx: number,
  startX = 200,
  startY = 350,
  steps = 5
) {
  await page.evaluate(
    ({ dx, startX, startY, steps }) => {
      const strip =
        document.querySelector(".fq-reader-pager-strip") ||
        document.querySelector(".fq-reader-panel") ||
        document.body;

      const touchId = Date.now();

      const createTouch = (x: number, y: number) =>
        new Touch({
          identifier: touchId,
          target: strip,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          screenX: x,
          screenY: y,
        });

      const t0 = createTouch(startX, startY);

      strip.dispatchEvent(
        new TouchEvent("touchstart", {
          touches: [t0],
          targetTouches: [t0],
          changedTouches: [t0],
          bubbles: true,
          cancelable: true,
        })
      );

      for (let i = 1; i <= steps; i++) {
        const currentX = startX + (dx * i) / steps;
        const currentY = startY;
        const ti = createTouch(currentX, currentY);

        strip.dispatchEvent(
          new TouchEvent("touchmove", {
            touches: [ti],
            targetTouches: [ti],
            changedTouches: [ti],
            bubbles: true,
            cancelable: true,
          })
        );
      }

      const tFinal = createTouch(startX + dx, startY);

      strip.dispatchEvent(
        new TouchEvent("touchend", {
          touches: [],
          targetTouches: [],
          changedTouches: [tFinal],
          bubbles: true,
          cancelable: true,
        })
      );
    },
    { dx, startX, startY, steps }
  );
}

/**
 * Ensures the reader nav bar is visible in mobile/tablet overlay mode.
 * Clicks the reader viewport to reveal the nav if it is fixed off-screen.
 */
export async function revealNavOverlay(page: Page) {
  const isOverlayHidden = await page.evaluate(() => {
    const navEl = document.querySelector("nav.fq-nav-overlay-page");
    if (!navEl) return false;
    const style = window.getComputedStyle(navEl);
    return style.position === "fixed" && !navEl.classList.contains("fq-nav-visible");
  });
  if (isOverlayHidden) {
    await page.locator(".fq-reader-pager-viewport").click({ position: { x: 50, y: 50 } });
    await page.waitForFunction(() => {
      const navEl = document.querySelector("nav.fq-nav-overlay-page");
      return !navEl || navEl.classList.contains("fq-nav-visible");
    });
  }
}

/**
 * Reads a value from window.localStorage inside the page context.
 */
export async function getStorageItem(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

/**
 * Opens the settings sidebar sheet from the Nav bar and returns its Locator.
 */
export async function openSettings(page: Page): Promise<Locator> {
  await revealNavOverlay(page);
  const settingsBtn = page.locator('nav button[aria-label="Settings"], nav button[aria-label="الإعدادات"]');
  await settingsBtn.click();
  const sheet = page.getByRole("dialog").filter({ hasText: /الإعدادات|Settings/ });
  await sheet.waitFor({ state: "visible" });
  return sheet;
}



