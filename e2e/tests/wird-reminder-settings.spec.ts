import { test, expect } from "@playwright/test";
import { authenticateAsUser, clearUserPlans, createTestPlan } from "../helpers/auth";

test.describe("Daily Wird Reminder Settings & Deep Link Affordance (#600)", () => {
  test.beforeEach(async ({ context }) => {
    await authenticateAsUser(context);
  });

  test("configures daily reminder time in SettingsSidebar and verifies persistence", async ({
    page,
  }) => {
    await page.goto("/ar/plans");

    // Open settings sheet
    const settingsBtn = page.locator('[data-testid="nav-settings-button"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Verify reminder section is present
    const reminderSection = page.locator('[data-testid="settings-section-wird-reminder"]');
    await expect(reminderSection).toBeVisible();

    // Toggle reminder switch ON
    const toggle = reminderSection.locator('[data-testid="wird-reminder-toggle"]');
    await expect(toggle).toBeVisible();

    const isChecked = (await toggle.getAttribute("data-state")) === "checked";
    if (!isChecked) {
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-state", "checked");
    }

    // Open time picker combobox
    const timeTrigger = reminderSection.locator('[data-testid="wird-reminder-time-trigger"]');
    await expect(timeTrigger).toBeEnabled();
    await timeTrigger.click();

    // Popover opens
    const popover = page.locator('[data-testid="wird-reminder-time-popover"]');
    await expect(popover).toBeVisible();

    // Search for 08:30
    const searchInput = popover.locator('[data-testid="wird-reminder-time-search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("08:30");

    // Click 08:30 option
    const option0830 = popover.locator('[data-testid="wird-reminder-time-option-0830"]');
    await expect(option0830).toBeVisible();
    await option0830.click();

    // Popover closes and trigger shows updated time
    await expect(popover).not.toBeVisible();
    await expect(timeTrigger).toContainText("٠٨:٣٠");

    // Reload page and verify settings persisted
    await page.reload();

    const settingsBtnReloaded = page.locator('[data-testid="nav-settings-button"]').first();
    await settingsBtnReloaded.click();

    const reloadedToggle = page.locator('[data-testid="wird-reminder-toggle"]');
    await expect(reloadedToggle).toHaveAttribute("data-state", "checked");

    const reloadedTimeTrigger = page.locator('[data-testid="wird-reminder-time-trigger"]');
    await expect(reloadedTimeTrigger).toContainText("٠٨:٣٠");
  });

  test("clicking plans hero reminder row opens settings sidebar with section revealed", async ({
    page,
  }) => {
    await clearUserPlans(1);
    await createTestPlan(1);

    await page.goto("/ar/plans");

    const heroRow = page.locator('[data-testid="plans-hero-reminder-row"]');
    await expect(heroRow).toBeVisible();
    await heroRow.click();

    const reminderSection = page.locator('[data-testid="settings-section-wird-reminder"]');
    await expect(reminderSection).toBeVisible();
  });
});
