import { test, expect } from "@playwright/test";
import {
  waitForReaderContent,
  setStoredSafhaView,
  swipeReader,
  getActivePanel,
  skipNonDesktop,
  skipNonMobile,
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
  deleteE2EGrant,
} from "../helpers/mushaf";

// Boundary wrap-arounds (Page 1 <-> 604) beyond the arrow-driven cases in
// reader-navigation.spec.ts, plus 404 recovery via the Return to Reading link.
// Arrow wrap (single + double) and 999/0/invalid 404 rendering are already
// pinned there and intentionally not duplicated here.
test.describe.configure({ mode: "serial" });

test.describe("Boundary Recovery & Error Routes", () => {
  test.beforeAll(async () => {
    await seedTestUsers();
  });

  test.beforeEach(async ({ context }) => {
    await clearAuth(context);
    await clearAllGrantsAndCodes();
  });

  test.describe("Desktop: Keyboard Wrap-Around at Page Extremes", () => {
    test.beforeEach(async ({}, testInfo) => {
      skipNonDesktop(testInfo, "Keyboard arrow navigation is desktop-oriented");
    });

    test("ArrowLeft on Page 604 wraps to Page 1 and back in single view", async ({
      page,
    }) => {
      await setStoredSafhaView(page, "single");
      await page.goto("/ar/pages/604");
      await waitForReaderContent(page);

      // ArrowLeft is forward in Quran order -> wraps 604 -> 1
      await page.keyboard.press("ArrowLeft");
      await expect(page).toHaveURL("/ar/pages/1");
      await waitForReaderContent(page);

      // ArrowRight is backward -> wraps 1 -> 604
      await page.keyboard.press("ArrowRight");
      await expect(page).toHaveURL("/ar/pages/604");
      await waitForReaderContent(page);
    });
  });

  test.describe("Mobile: Swipe Wrap-Around at Page Extremes", () => {
    test.beforeEach(async ({}, testInfo) => {
      skipNonMobile(testInfo, "Touch gesture tests are scoped to mobile viewport");
    });

    test("swiping past Page 1 and Page 604 wraps around in single view", async ({
      page,
    }) => {
      await page.goto("/ar/pages/1");
      await waitForReaderContent(page);

      // Drag left (dx < 0) is backward -> wraps 1 -> 604
      await swipeReader(page, -120);
      await expect(page).toHaveURL("/ar/pages/604");
      await waitForReaderContent(page);

      // Drag right (dx > 0) is forward -> wraps 604 -> 1
      await swipeReader(page, 120);
      await expect(page).toHaveURL("/ar/pages/1");
      await waitForReaderContent(page);
    });
  });

  test.describe("Cross-Platform: Upper Edge & 404 Recovery", () => {
    test("true upper edge /pages/605 renders 404", async ({ page }) => {
      const res = await page.goto("/en/pages/605");
      expect(res).not.toBeNull();
      expect(res!.status()).toBe(404);
      await expect(page.getByText("404", { exact: true })).toBeVisible();
    });

    test("fresh 404 falls back to page 1 and recovery lands valid reader state", async ({
      page,
    }) => {
      // Clean storage (fresh context): no stored position -> default-locale page 1
      const res = await page.goto("/ar/pages/0");
      expect(res).not.toBeNull();
      expect(res!.status()).toBe(404);
      await expect(page.getByText("404", { exact: true })).toBeVisible();

      const recovery = page.locator('a[href="/ar/pages/1"]');
      await expect(recovery).toBeVisible();

      await Promise.all([page.waitForURL("/ar/pages/1"), recovery.click()]);
      await expect(page).toHaveURL("/ar/pages/1");
      await waitForReaderContent(page);
    });

    test("seeded 404 offers Return to Reading without corrupting lastRead", async ({
      page,
    }) => {
      // Seed lastRead at page 7
      await page.goto("/ar/pages/7");
      await waitForReaderContent(page);

      // Out-of-bounds visit renders 404 ...
      const res = await page.goto("/ar/pages/999");
      expect(res).not.toBeNull();
      expect(res!.status()).toBe(404);
      await expect(page.getByText("404", { exact: true })).toBeVisible();

      // ... without touching the stored position
      expect(await page.evaluate(() => window.localStorage.getItem("lastReadPage"))).toBe(
        "7",
      );
      expect(await page.evaluate(() => window.localStorage.getItem("lastReadPath"))).toBe(
        '"/ar/pages/7"',
      );

      // Recovery link targets the stored page
      const recovery = page.locator('a[href="/ar/pages/7"]');
      await expect(recovery).toBeVisible();

      // Recovery lands on valid reader state with progress intact
      await Promise.all([page.waitForURL("/ar/pages/7"), recovery.click()]);
      await expect(page).toHaveURL("/ar/pages/7");
      await waitForReaderContent(page);

      // Home resume path still points at the same page (progress intact).
      // Asserted on home, not the reader: on pages routes the nav Continue
      // entry is hidden on mobile viewports (Nav.tsx), while on home it is
      // visible on every breakpoint.
      await page.goto("/ar");
      await expect(page.locator("nav a[href='/ar/pages/7']")).toBeVisible();
    });
  });

  test.describe("Desktop: Grant Reader Wrap-Around", () => {
    test.beforeEach(async ({}, testInfo) => {
      skipNonDesktop(testInfo, "Grant wrap is pinned on desktop double view");
    });

    test("Previous on grant pair 1-2 wraps to pair 603-604 grant-scoped", async ({
      page,
      context,
    }) => {
      const grantId = "e2e-grant-boundary-1";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);

      try {
        // Explicit double view: the wrapped anchor (603 = pair 603-604) only
        // holds in double view; do not rely on the stored-view default.
        await setStoredSafhaView(page, "double");
        await authenticateAsUser(context, SECONDARY_E2E_USER);
        await page.goto(`/ar/mushaf/${grantId}/pages/1`);
        await waitForReaderContent(page);

        await getActivePanel(page).getByRole("link", { name: "Previous page" }).click();
        await expect(page).toHaveURL(`/ar/mushaf/${grantId}/pages/603`);
        await waitForReaderContent(page);
      } finally {
        await deleteE2EGrant(grantId);
      }
    });
  });
});
