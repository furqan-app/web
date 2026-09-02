import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  skipNonDesktop,
  skipNonMobile,
  longPressWord,
} from "../helpers/reader";
import {
  authenticateAsUser,
  clearAuth,
  DEFAULT_E2E_USER,
} from "../helpers/auth";
import {
  SECONDARY_E2E_USER,
  ANONYMOUS_E2E_USER,
  seedTestUsers,
  clearAllGrantsAndCodes,
  createE2EGrant,
  deleteE2EGrant,
  seedE2EWordMark,
} from "../helpers/mushaf";

test.describe.configure({ mode: "serial" });

test.describe("Shared Mushaf Access & Mid-Session Revocation", () => {
  test.beforeAll(async () => {
    await seedTestUsers();
  });

  test.beforeEach(async ({ context }) => {
    await clearAuth(context);
    await clearAllGrantsAndCodes();
  });

  test.describe("Hub Share Code Flow & Self-Redemption Gating", () => {
    test("owner generates code, self-redemption is blocked, and viewer redeems successfully", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Hub management flow");

      // 1. Authenticate as Owner
      await authenticateAsUser(context, DEFAULT_E2E_USER);
      await page.goto("/ar/mushaf");
      await expect(page.locator("main")).toBeVisible();

      // Click Generate Code
      const generateBtn = page.getByRole("button", { name: "إنشاء رمز" });
      await expect(generateBtn).toBeVisible();
      await generateBtn.click();

      // A code pill should appear in span.font-mono
      const codePill = page.locator("span.font-mono").first();
      await expect(codePill).toBeVisible({ timeout: 10000 });
      const shareCode = (await codePill.textContent())?.trim();
      expect(shareCode).toBeTruthy();

      // 2. Owner attempts to self-redeem own code -> blocked
      const redeemInput = page.locator('input[placeholder*="رمز"]');
      await redeemInput.fill(shareCode!);
      const redeemBtn = page.getByRole("button", { name: "استخدام الرمز" });
      await redeemBtn.click();

      // Should display error message
      const errorMsg = page.locator("p.text-destructive");
      await expect(errorMsg).toBeVisible({ timeout: 10000 });
      await expect(errorMsg).toHaveText(/You can't redeem your own code|لا يمكنك/i);

      // 3. Switch to Viewer session and redeem code
      await clearAuth(context);
      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto("/ar/mushaf");

      const viewerRedeemInput = page.locator('input[placeholder*="رمز"]');
      await viewerRedeemInput.fill(shareCode!);
      const viewerRedeemBtn = page.getByRole("button", { name: "استخدام الرمز" });
      await viewerRedeemBtn.click();

      // Wait for redemption success message
      await expect(
        page.getByText("تم منح الوصول — انظر القائمة بالأسفل.")
      ).toBeVisible({ timeout: 10000 });

      // Grant appears under "Mushafs I can access"
      await expect(page.getByText("E2E Test User")).toBeVisible({
        timeout: 10000,
      });
      const openLink = page.locator('a[href*="/mushaf/"]').first();
      await expect(openLink).toBeVisible();
      expect(await openLink.getAttribute("href")).toMatch(
        /\/ar\/mushaf\/[^/]+\/pages\/1/
      );
    });
  });

  test.describe("Shared Mushaf Reading & Personal Widget Suppression", () => {
    test("viewer sees ViewingChip, owner marks, and personal PlansWidget is suppressed", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Desktop shared reader view");

      const grantId = "e2e-grant-view-1";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);
      await seedE2EWordMark(
        DEFAULT_E2E_USER.id,
        DEFAULT_E2E_USER.id,
        1,
        "1:1:1",
        "forgetting",
        "Owner test note"
      );

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/ar/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      // 1. ViewingChip rendered in safha header start cell with owner tooltip
      const chip = page
        .locator('.fq-safha-header span[title*="E2E Test User"]')
        .first();
      await expect(chip).toBeVisible({ timeout: 10000 });
      await expect(chip).toHaveAttribute(
        "aria-label",
        "تتصفح مصحف E2E Test User"
      );

      // 2. Personal daily awrad PlansWidget must NOT be rendered on shared mushaf
      const plansWidgetTrigger = page.locator('button[aria-label*="خطط"]');
      await expect(plansWidgetTrigger).toBeHidden();

      // 3. Owner mark on word 1:1:1 is visible
      const markedWord = getActivePanel(page)
        .locator('[data-fq-word="1:1:1"]')
        .first();
      await expect(markedWord).toHaveClass(/bg-red-400/, { timeout: 10000 });
    });
  });

  test.describe("In-Reader Navigation & Base Path Derivation", () => {
    test("page turns and sidebar navigation stay grant-scoped on shared mushaf", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "In-reader grant navigation");

      const grantId = "e2e-grant-nav-1";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/ar/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      // 1. Forward page turn stays grant-scoped
      const nextArrow = page
        .locator('button[aria-label*="التالية"], a[href*="pages/2"], a[href*="pages/3"]')
        .first();
      if (await nextArrow.isVisible()) {
        await nextArrow.click();
      } else {
        await page.keyboard.press("ArrowLeft");
      }
      await expect(page).toHaveURL(new RegExp(`/ar/mushaf/${grantId}/pages/[23]`));

      // 2. Sidebar Surah navigation stays grant-scoped via useReaderBasePath()
      const sidebarTrigger = page.locator('button[aria-label*="navigation"]').first();
      await sidebarTrigger.click();

      const fatihaItem = page.locator('[data-surah-id="1"]').first();
      await expect(fatihaItem).toBeVisible();
      await fatihaItem.click();

      // Navigates back to page 1 while remaining on the grant route
      await expect(page).toHaveURL(new RegExp(`/ar/mushaf/${grantId}/pages/1`));
    });
  });

  test.describe("Multi-User Mark Creation, Attribution & Round-Trip", () => {
    test("viewer updates owner mark, saves attribution, and owner sees viewer attribution in self reader", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Multi-user mark round-trip");

      const grantId = "e2e-grant-marks-1";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);
      await seedE2EWordMark(
        DEFAULT_E2E_USER.id,
        DEFAULT_E2E_USER.id,
        1,
        "1:1:1",
        "forgetting",
        "Original owner note"
      );

      // 1. Viewer opens shared mushaf and changes mark to "linking"
      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/ar/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      const word = getActivePanel(page).locator('[data-fq-word="1:1:1"]').first();
      await word.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Viewer observes owner's attribution on the existing mark
      await expect(dialog.getByText("E2E Test User")).toBeVisible();

      // Change category to linking (تربيط)
      await dialog.locator('label[for="mark-color-linking"]').click();
      const updateBtn = dialog.getByRole("button", { name: "تحديث: تربيط" });
      await updateBtn.click();
      await expect(dialog).toBeHidden();

      // Word receives linking highlight (bg-blue-300)
      await expect(word).toHaveClass(/bg-blue-300/, { timeout: 10000 });

      // 2. Owner logs in and opens personal reader /ar/pages/1
      await clearAuth(context);
      await authenticateAsUser(context, DEFAULT_E2E_USER);
      await page.goto("/ar/pages/1");
      await waitForReaderContent(page);

      const ownerWord = getActivePanel(page)
        .locator('[data-fq-word="1:1:1"]')
        .first();
      await expect(ownerWord).toHaveClass(/bg-blue-300/, { timeout: 10000 });

      // Owner observes viewer's attribution on the updated mark
      await ownerWord.click();
      const ownerDialog = page.getByRole("dialog");
      await expect(ownerDialog).toBeVisible();
      await expect(ownerDialog.getByText("Viewer Student")).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });

  test.describe("Mid-Session Revocation on Page Turn", () => {
    test("revoking grant mid-session redirects viewer to /mushaf?removed=1 on next page turn", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Mid-session page turn revocation");

      const grantId = "e2e-grant-revoke-turn";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/ar/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      // Delete grant in DB to simulate live mid-session revocation
      await deleteE2EGrant(grantId);

      // Viewer attempts to turn the page
      await page.keyboard.press("ArrowLeft");

      // Should automatically redirect to /ar/mushaf?removed=1
      await expect(page).toHaveURL(/\/ar\/mushaf\?removed=1/, {
        timeout: 10000,
      });

      // Generic Access Removed banner is visible
      const banner = page.locator('div[role="alert"].border-warning\\/40');
      await expect(banner).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText("لم يعد لديك صلاحية الوصول إلى هذا المصحف.")
      ).toBeVisible();

      // Must not leak owner name in the banner (ADR 0012)
      await expect(banner.getByText("E2E Test User")).toBeHidden();
    });
  });

  test.describe("Mid-Session Revocation on Sidebar Navigation", () => {
    test("revoking grant mid-session redirects to /mushaf?removed=1 on sidebar route change", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Mid-session sidebar revocation");

      const grantId = "e2e-grant-revoke-sidebar";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/ar/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      // Open sidebar
      const sidebarTrigger = page.locator('button[aria-label*="navigation"]').first();
      await sidebarTrigger.click();

      // Revoke grant in DB
      await deleteE2EGrant(grantId);

      // Click Surah 3 (Ali 'Imran, page 50)
      const surahItem = page.locator('[data-surah-id="3"]').first();
      await expect(surahItem).toBeVisible();
      await surahItem.click();

      // Pager jumps to page 50, marks fetch hits 403, and redirects to hub
      await expect(page).toHaveURL(/\/ar\/mushaf\?removed=1/, {
        timeout: 10000,
      });
      await expect(
        page.locator('div[role="alert"].border-warning\\/40')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Owner Hub UI Revocation", () => {
    test("owner can revoke viewer access from hub with confirmation", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Owner hub revocation");

      const grantId = "e2e-grant-ui-revoke";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);

      await authenticateAsUser(context, DEFAULT_E2E_USER);
      await page.goto("/ar/mushaf");
      await expect(page.locator("main")).toBeVisible();

      // Viewer name is visible under "People who can access my mushaf"
      await expect(page.getByText("Viewer Student")).toBeVisible({
        timeout: 10000,
      });

      // Click remove button
      const removeBtn = page
        .locator('button[aria-label*="إزالة"], button[aria-label*="Remove"]')
        .first();
      await removeBtn.click();

      // Confirm button appears
      const confirmBtn = page.getByRole("button", { name: "إزالة" });
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();

      // Viewer row is removed and empty state is shown
      await expect(
        page.getByText("لا أحد لديه وصول إلى مصحفك.")
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Banner Dismissal", () => {
    test("dismissing AccessRemovedBanner hides it and clears query string", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Banner dismissal");

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto("/ar/mushaf?removed=1");

      const banner = page.locator('div[role="alert"].border-warning\\/40');
      await expect(banner).toBeVisible({ timeout: 10000 });

      // Click Dismiss X button
      const dismissBtn = banner.getByRole("button", { name: /إغلاق|Dismiss/ });
      await dismissBtn.click();

      await expect(banner).toBeHidden();
      // Query string is stripped from URL
      await expect(page).toHaveURL(/\/ar\/mushaf$/);
    });
  });

  test.describe("Generic ViewingChip Fallback", () => {
    test("owner with empty name renders generic ViewingChip fallback tooltip", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "Generic ViewingChip");

      const grantId = "e2e-grant-anon";
      await createE2EGrant(grantId, ANONYMOUS_E2E_USER.id, SECONDARY_E2E_USER.id);

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/ar/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      const chip = page
        .locator('.fq-safha-header span[title*="تتصفح مصحف"]')
        .first();
      await expect(chip).toBeVisible({ timeout: 10000 });
      await expect(chip).toHaveAttribute(
        "aria-label",
        "تتصفح مصحف مستخدم آخر"
      );
    });
  });

  test.describe("Mobile Long-Press on Shared Mushaf", () => {
    test("touch long-press on word opens MarkModal in shared mushaf", async ({
      page,
      context,
    }, testInfo) => {
      skipNonMobile(testInfo, "Mobile shared reader interaction");

      const grantId = "e2e-grant-mobile";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/ar/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      const word = getActivePanel(page).locator('[data-fq-word="1:1:1"]').first();
      await expect(word).toBeVisible();

      // Long press word
      await longPressWord(page, word, 600);

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("تحديد كلمة").first()).toBeVisible();
    });
  });

  test.describe("English (LTR) Locale Continuity", () => {
    test("English locale renders LTR labels, ViewingChip copy, and redirects to /en/mushaf?removed=1", async ({
      page,
      context,
    }, testInfo) => {
      skipNonDesktop(testInfo, "English locale shared mushaf");

      const grantId = "e2e-grant-en";
      await createE2EGrant(grantId, DEFAULT_E2E_USER.id, SECONDARY_E2E_USER.id);

      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto(`/en/mushaf/${grantId}/pages/1`);
      await waitForReaderContent(page);

      // English ViewingChip
      const chip = page
        .locator('.fq-safha-header span[title*="Viewing E2E Test User"]')
        .first();
      await expect(chip).toBeVisible({ timeout: 10000 });
      await expect(chip).toHaveAttribute(
        "aria-label",
        "Viewing E2E Test User's mushaf"
      );

      // Revoke grant and turn page
      await deleteE2EGrant(grantId);
      await page.keyboard.press("ArrowLeft");

      // Redirects to English hub with English removed banner
      await expect(page).toHaveURL(/\/en\/mushaf\?removed=1/, {
        timeout: 10000,
      });
      await expect(
        page.getByText("You no longer have access to this mushaf.")
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Direct Route & Auth Gating", () => {
    test("direct access to invalid grant as signed-in user redirects to /mushaf?removed=1", async ({
      page,
      context,
    }) => {
      await authenticateAsUser(context, SECONDARY_E2E_USER);
      await page.goto("/ar/mushaf/non-existent-grant-id/pages/1");

      await expect(page).toHaveURL(/\/ar\/mushaf\?removed=1/, {
        timeout: 10000,
      });
      await expect(
        page.locator('div[role="alert"].border-warning\\/40')
      ).toBeVisible({ timeout: 10000 });
    });

    test("direct access to grant as signed-out visitor redirects to home /ar", async ({
      page,
      context,
    }) => {
      await clearAuth(context);
      await page.goto("/ar/mushaf/any-grant/pages/1");
      await expect(page).toHaveURL(/\/ar$/);
    });
  });
});
