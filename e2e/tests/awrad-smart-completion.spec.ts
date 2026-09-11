import { test, expect } from "@playwright/test";
import {
  authenticateAsUser,
  clearAuth,
  clearUserPlans,
  createTestPlan,
} from "../helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("Awrad Smart Completion Detection (#598)", () => {
  const userId = 1;

  test.beforeEach(async ({ context }) => {
    await clearUserPlans(userId);
    await authenticateAsUser(context, { id: userId });
  });

  test.afterEach(async ({ context }) => {
    await clearUserPlans(userId);
    await clearAuth(context);
  });

  test("Option A: smart nudge appears on meeting dwell threshold and checks off in 1 tap", async ({
    page,
  }) => {
    const planId = await createTestPlan(userId, "daily-wird", {
      quantities: { reading: 1 },
    });

    await page.goto("/ar/pages/1");
    await expect(page.getByTestId("plans-widget-trigger")).toBeVisible();

    // Offer pill must not be visible before meeting dwell threshold
    await expect(page.getByTestId("smart-completion-offer")).not.toBeVisible();

    // Fast-forward simulated active dwell past the 60s threshold
    await page.evaluate(() => {
      const win = window as unknown as {
        __advanceDwellTimeForTesting?: (seconds: number) => void;
      };
      win.__advanceDwellTimeForTesting?.(61);
    });

    // Smart nudge offer pill must appear unconditionally
    const offerPill = page.getByTestId("smart-completion-offer");
    await expect(offerPill).toBeVisible();
    const confirmBtn = page.getByTestId("smart-completion-confirm");
    await expect(confirmBtn).toBeVisible();

    // 1-tap confirm
    await confirmBtn.click();

    // Offer pill disappears immediately
    await expect(offerPill).not.toBeVisible();

    // Completion flourish plays, then dial widget unmounts
    await expect(page.getByTestId("plans-widget-trigger")).not.toBeVisible({
      timeout: 5000,
    });

    // Verify progress was logged to the database via API
    const res = await page.request.get(`/api/plans/${planId}/progress`);
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.data.length).toBeGreaterThanOrEqual(1);
    expect(json.data[0].track_key).toBe("reading");
  });

  test("Option A: dismissing the offer pill collapses it and suppresses it on the same page", async ({
    page,
  }) => {
    await createTestPlan(userId, "daily-wird", {
      quantities: { reading: 1 },
    });

    await page.goto("/ar/pages/1");
    await expect(page.getByTestId("plans-widget-trigger")).toBeVisible();

    // Fast-forward simulated active dwell
    await page.evaluate(() => {
      const win = window as unknown as {
        __advanceDwellTimeForTesting?: (seconds: number) => void;
      };
      win.__advanceDwellTimeForTesting?.(61);
    });

    const offerPill = page.getByTestId("smart-completion-offer");
    await expect(offerPill).toBeVisible();

    // Dismiss the offer
    const dismissBtn = page.getByTestId("smart-completion-dismiss");
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    // Offer collapses, dial trigger remains visible
    await expect(offerPill).not.toBeVisible();
    await expect(page.getByTestId("plans-widget-trigger")).toBeVisible();

    // Fast-forward dwell again on the same page; cooldown suppresses the offer
    await page.evaluate(() => {
      const win = window as unknown as {
        __advanceDwellTimeForTesting?: (seconds: number) => void;
      };
      win.__advanceDwellTimeForTesting?.(65);
    });

    await expect(offerPill).not.toBeVisible();
  });

  test("Option B: auto-writes progress, displays notice with undo, and supports durable reversal", async ({
    page,
  }) => {
    const planId = await createTestPlan(userId, "daily-wird", {
      quantities: { reading: 1 },
    });

    // Navigate to /ar/plans and enable auto-write via SettingsSidebar
    await page.goto("/ar/plans");
    const settingsBtn = page.locator('[data-testid="nav-settings-button"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const autoWriteToggle = page.getByTestId("settings-autowrite-toggle");
    await expect(autoWriteToggle).toBeVisible();
    const isChecked = (await autoWriteToggle.getAttribute("data-state")) === "checked";
    if (!isChecked) {
      await autoWriteToggle.click();
      await expect(autoWriteToggle).toHaveAttribute("data-state", "checked");
    }

    // Close settings and navigate to reader page 1
    await page.keyboard.press("Escape");
    await page.goto("/ar/pages/1");
    await expect(page.getByTestId("plans-widget-trigger")).toBeVisible();

    // Fast-forward simulated active dwell
    await page.evaluate(() => {
      const win = window as unknown as {
        __advanceDwellTimeForTesting?: (seconds: number) => void;
      };
      win.__advanceDwellTimeForTesting?.(61);
    });

    // Auto-write notice appears with undo button
    const autoNotice = page.getByTestId("smart-completion-auto-notice");
    await expect(autoNotice).toBeVisible();
    const undoBtn = page.getByTestId("smart-completion-undo");
    await expect(undoBtn).toBeVisible();

    // Verify progress was recorded via API
    const res = await page.request.get(`/api/plans/${planId}/progress`);
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.data.length).toBeGreaterThanOrEqual(1);

    // Navigate to /ar/plans to verify durable reversal signal
    await page.goto("/ar/plans");

    // The assignment row must display the auto-recorded badge
    const badge = page.getByTestId("auto-recorded-badge");
    await expect(badge).toBeVisible();

    // Durable Reversal: uncheck the assignment
    const toggleBtn = page.getByTestId("plan-assignment-toggle").first();
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Auto-recorded badge must be removed upon reversal
    await expect(badge).not.toBeVisible();

    // Progress in the database must be deleted
    const resAfter = await page.request.get(`/api/plans/${planId}/progress`);
    expect(resAfter.ok()).toBe(true);
    const jsonAfter = await resAfter.json();
    expect(jsonAfter.data.length).toBe(0);
  });
});
