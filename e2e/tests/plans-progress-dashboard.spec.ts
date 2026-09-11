import { test, expect } from "@playwright/test";
import { authenticateAsUser, clearUserPlans, createTestPlan } from "../helpers/auth";

test.describe("Plans Page: Progress Dashboard Tab (#599)", () => {
  test.beforeEach(async ({ context }) => {
    await clearUserPlans(1);
    await authenticateAsUser(context);
  });

  test.afterEach(async () => {
    await clearUserPlans(1);
  });

  test("unconditionally switches to Progress tab and renders dashboard sections", async ({ page }) => {
    // 1. Seed active plan
    await createTestPlan(1, "daily-wird", { quantities: { reading: 5 } });

    await page.goto("/ar/plans");

    // 2. Select Progress tab via stable test ID
    const progressTab = page.locator('[data-testid="tab-progress"]');
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await expect(progressTab).toHaveAttribute("aria-selected", "true");

    // 3. Unconditionally assert visibility of dashboard sections
    const dashboardPanel = page.locator('[data-testid="tabpanel-progress"]');
    await expect(dashboardPanel).toBeVisible();

    const streaksGrid = page.locator('[data-testid="progress-streaks-grid"]');
    await expect(streaksGrid).toBeVisible();

    const totalsCard = page.locator('[data-testid="progress-totals-card"]');
    await expect(totalsCard).toBeVisible();

    const heatmap = page.locator('[data-testid="progress-heatmap-card"]');
    await expect(heatmap).toBeVisible();
  });

  test("renders calm empty state when user has zero plans", async ({ page }) => {
    await page.goto("/ar/plans");

    // Click progress tab on empty state
    const progressTab = page.locator('[data-testid="tab-progress"]');
    await expect(progressTab).toBeVisible();
    await progressTab.click();

    // Unconditionally assert presence of dignified empty state CTA
    const emptyState = page.locator('[data-testid="progress-empty-state"]');
    await expect(emptyState).toBeVisible();

    const addPlanCta = emptyState.locator('[data-testid="add-plan-button"]');
    await expect(addPlanCta).toBeVisible();
  });
});
