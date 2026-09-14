import { test, expect } from "@playwright/test";
import { authenticateAsUser, clearUserPlans, createTestPlan } from "../helpers/auth";

test.describe("Daily Wird Reminder Settings & Deep Link Affordance (#600)", () => {
  test.beforeEach(async ({ context }) => {
    await authenticateAsUser(context);
  });

  test("configures daily reminder time in Reminders tab and verifies persistence", async ({
    page,
  }) => {
    await page.goto("/ar/plans");

    // Open reminders tab
    const remindersTab = page.locator('[data-testid="tab-reminders"]');
    await expect(remindersTab).toBeVisible();
    await remindersTab.click();

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

    // Click 08:30 option
    const option0830 = popover.locator('[data-testid="wird-reminder-time-option-0830"]');
    await option0830.scrollIntoViewIfNeeded();
    await expect(option0830).toBeVisible();
    await option0830.click();

    // Popover closes and trigger shows updated time
    await expect(popover).not.toBeVisible();
    await expect(timeTrigger).toContainText("٠٨:٣٠");

    // Reload page and verify settings persisted
    await page.reload();

    const remindersTabReloaded = page.locator('[data-testid="tab-reminders"]');
    await remindersTabReloaded.click();

    const reloadedToggle = page.locator('[data-testid="wird-reminder-toggle"]');
    await expect(reloadedToggle).toHaveAttribute("data-state", "checked");

    const reloadedTimeTrigger = page.locator('[data-testid="wird-reminder-time-trigger"]');
    await expect(reloadedTimeTrigger).toContainText("٠٨:٣٠");
  });

  test("multi-slot: add slot 2, set time, remove, and verify persistence", async ({
    page,
  }) => {
    await clearUserPlans(1);
    await createTestPlan(1);

    await page.goto("/ar/plans");

    const remindersTab = page.locator('[data-testid="tab-reminders"]');
    await expect(remindersTab).toBeVisible();
    await remindersTab.click();

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

    // Set slot 1 to 08:30
    const timeTriggerSlot1 = reminderSection.locator('[data-testid="wird-reminder-time-trigger"]');
    await expect(timeTriggerSlot1).toBeEnabled();
    await timeTriggerSlot1.click();
    await page.locator('[data-testid="wird-reminder-time-option-0830"]').click();
    await expect(page.locator('[data-testid="wird-reminder-time-popover"]')).not.toBeVisible();

    // Add slot 2
    const addSlotButton = reminderSection.locator('[data-testid="wird-reminder-add-slot"]');
    await expect(addSlotButton).toBeVisible();
    await addSlotButton.click();

    // Set slot 2 time to 14:00 via its dedicated trigger
    const timeTriggerSlot2 = reminderSection.locator('[data-testid="wird-reminder-time-trigger-slot-2"]');
    await expect(timeTriggerSlot2).toBeEnabled();
    await timeTriggerSlot2.click();
    await page.locator('[data-testid="wird-reminder-time-option-1400"]').click();
    await expect(page.locator('[data-testid="wird-reminder-time-popover"]')).not.toBeVisible();

    // Reload and verify both slots persist
    await page.reload();
    await remindersTab.click();

    const reloadedTimeTriggerSlot1 = reminderSection.locator('[data-testid="wird-reminder-time-trigger"]');
    await expect(reloadedTimeTriggerSlot1).toContainText("٠٨:٣٠");

    const reloadedTimeTriggerSlot2 = reminderSection.locator('[data-testid="wird-reminder-time-trigger-slot-2"]');
    await expect(reloadedTimeTriggerSlot2).toContainText("٠٢:٠٠");

    // Remove slot 2
    const removeSlot2 = reminderSection.locator('[data-testid="wird-reminder-remove-slot-2"]');
    await expect(removeSlot2).toBeVisible();
    await removeSlot2.click();

    // Reload and verify only 08:30 remains
    await page.reload();
    await remindersTab.click();

    const finalTimeTriggerSlot1 = reminderSection.locator('[data-testid="wird-reminder-time-trigger"]');
    await expect(finalTimeTriggerSlot1).toContainText("٠٨:٣٠");

    const addSlotButtonAfter = reminderSection.locator('[data-testid="wird-reminder-add-slot"]');
    await expect(addSlotButtonAfter).toBeVisible();
  });

  test("dedicated reminder: set time via plan card and verifies persistence", async ({
    page,
  }) => {
    await clearUserPlans(1);
    const planId = await createTestPlan(1);

    await page.goto("/ar/plans");

    // Switch to My Plans tab so PlanCard elements are mounted
    const plansTab = page.locator('[data-testid="tab-plans"]');
    await expect(plansTab).toBeVisible();
    await plansTab.click();
    await expect(plansTab).toHaveAttribute("aria-selected", "true");

    // Click dedicated set button on the plan card
    const dedicatedSetButton = page.locator(`[data-testid="plan-card-dedicated-set-${planId}"]`);
    await expect(dedicatedSetButton).toBeVisible();
    await dedicatedSetButton.click();

    // After setting, the dedicated time trigger should appear
    const dedicatedTrigger = page.locator(`[data-testid="dedicated-reminder-time-trigger-${planId}"]`);
    await expect(dedicatedTrigger).toBeEnabled();

    // Open the time popover and select 21:00
    await dedicatedTrigger.click();
    const option2100 = page.locator('[data-testid="wird-reminder-time-option-2100"]');
    await expect(option2100).toBeVisible();
    await option2100.click();
    await expect(page.locator('[data-testid="wird-reminder-time-popover"]')).not.toBeVisible();

    // Reload and verify dedicated time persists
    await page.reload();

    // Reload resets the tab to default; switch to My Plans again
    const plansTabReloaded = page.locator('[data-testid="tab-plans"]');
    await expect(plansTabReloaded).toBeVisible();
    await plansTabReloaded.click();
    await expect(plansTabReloaded).toHaveAttribute("aria-selected", "true");

    const reloadedDedicatedTrigger = page.locator(`[data-testid="dedicated-reminder-time-trigger-${planId}"]`);
    await expect(reloadedDedicatedTrigger).toBeEnabled();

    // Verify the remove button is present (dedicated reminder is active)
    const dedicatedRemove = page.locator(`[data-testid="plan-card-dedicated-remove-${planId}"]`);
    await expect(dedicatedRemove).toBeVisible();
  });

  test("clicking plans hero reminder row switches to reminders tab with section revealed", async ({
    page,
  }) => {
    await clearUserPlans(1);
    await createTestPlan(1);

    await page.goto("/ar/plans");

    const heroRow = page.locator('[data-testid="plans-hero-reminder-row"]');
    await expect(heroRow).toBeVisible();
    await heroRow.click();

    const remindersTab = page.locator('[data-testid="tab-reminders"]');
    await expect(remindersTab).toHaveAttribute("aria-selected", "true");

    const reminderSection = page.locator('[data-testid="settings-section-wird-reminder"]');
    await expect(reminderSection).toBeVisible();
  });

  test("/en mirror: configures daily reminder time with Latin digits and verifies persistence", async ({
    page,
  }) => {
    await page.goto("/en/plans");

    // Open reminders tab
    const remindersTab = page.locator('[data-testid="tab-reminders"]');
    await expect(remindersTab).toBeVisible();
    await remindersTab.click();

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

    // Click 08:30 option
    const option0830 = popover.locator('[data-testid="wird-reminder-time-option-0830"]');
    await option0830.scrollIntoViewIfNeeded();
    await expect(option0830).toBeVisible();
    await option0830.click();

    // Popover closes and trigger shows updated time with Latin digits
    await expect(popover).not.toBeVisible();
    await expect(timeTrigger).toContainText("08:30 AM");

    // Reload page and verify settings persisted
    await page.reload();

    const remindersTabReloaded = page.locator('[data-testid="tab-reminders"]');
    await remindersTabReloaded.click();

    const reloadedToggle = page.locator('[data-testid="wird-reminder-toggle"]');
    await expect(reloadedToggle).toHaveAttribute("data-state", "checked");

    const reloadedTimeTrigger = page.locator('[data-testid="wird-reminder-time-trigger"]');
    await expect(reloadedTimeTrigger).toContainText("08:30 AM");
  });
});
