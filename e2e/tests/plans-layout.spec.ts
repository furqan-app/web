import { test, expect } from "@playwright/test";
import {
  authenticateAsUser,
  clearAuth,
  clearUserPlans,
  createTestPlan,
} from "../helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("Plans Page: Unauthenticated Gating", () => {
  test.beforeEach(async ({ context }) => {
    await clearAuth(context);
  });

  test("displays page title and signed-out prompt on /ar/plans without header CTA", async ({
    page,
  }) => {
    await page.goto("/ar/plans");

    // Title is present
    const heading = page.getByRole("heading", { name: "الأوراد وخطط التعلم" });
    await expect(heading).toBeVisible();

    // Sign-in prompt is visible
    await expect(
      page.getByRole("button", { name: /تسجيل الدخول|Sign in/i })
    ).toBeVisible();

    // Promoted header CTA (+ ورد جديد) is NOT rendered for signed-out users
    await expect(
      page.locator("header").getByRole("button", { name: /ورد جديد/i })
    ).not.toBeVisible();
  });

  test("displays page title and signed-out prompt on /en/plans without header CTA", async ({
    page,
  }) => {
    await page.goto("/en/plans");

    // English title
    const heading = page.getByRole("heading", {
      name: "Daily Awrad & Learning Plans",
    });
    await expect(heading).toBeVisible();

    // Sign-in prompt
    await expect(
      page.getByRole("button", { name: /Sign in|تسجيل الدخول/i })
    ).toBeVisible();

    // Promoted header CTA (+ New wird) is NOT rendered
    await expect(
      page.locator("header").getByRole("button", { name: /New wird/i })
    ).not.toBeVisible();
  });
});

test.describe("Plans Page: Authenticated Empty State & Header CTA", () => {
  test.beforeEach(async ({ context }) => {
    await clearUserPlans();
    await authenticateAsUser(context);
  });

  test("renders promoted header CTA and opens template browse dialog on click", async ({
    page,
  }) => {
    await page.goto("/ar/plans");

    // Header CTA exists next to title
    const headerCta = page
      .locator("header")
      .getByRole("button", { name: /ورد جديد/i });
    await expect(headerCta).toBeVisible();

    // Clicking header CTA opens the PlansBrowseDialog modal
    await headerCta.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Unified creation dialog options:
    await expect(dialog.getByText("ورد جديد", { exact: true })).toBeVisible();
    await expect(dialog.getByText("الحصون الخمسة")).toBeVisible();
    await expect(dialog.getByText("أوراد جاهزة للاشتراك السريع")).toBeVisible();

    // Clicking "ورد جديد" reveals the unified custom wird form
    await dialog.getByText("ورد جديد", { exact: true }).click();
    await expect(dialog.getByRole("radio", { name: "قراءة" })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "استماع" })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "حفظ" })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "مراجعة" })).toBeVisible();

    // Press Escape to dismiss dialog
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Plans Page: Segmented Navigation", () => {
  test.beforeEach(async ({ context }) => {
    await clearUserPlans();
    await createTestPlan(1, "daily-wird", { quantities: { reading: 5 } });
    await authenticateAsUser(context);
  });

  test.afterEach(async () => {
    await clearUserPlans();
  });

  test("toggles between 'My Awrad', 'Progress', and 'Reminders' tabs", async ({
    page,
  }) => {
    await page.goto("/ar/plans");

    const tablist = page.getByRole("tablist");
    await expect(tablist).toBeVisible();

    const todayTab = page.getByRole("tab", { name: /أورادي/i });
    const progressTab = page.getByRole("tab", { name: /التقدّم/i });
    const remindersTab = page.getByRole("tab", { name: /التنبيهات/i });

    await expect(todayTab).toBeVisible();
    await expect(progressTab).toBeVisible();
    await expect(remindersTab).toBeVisible();

    // Today tab is selected by default
    await expect(todayTab).toHaveAttribute("aria-selected", "true");
    await expect(progressTab).toHaveAttribute("aria-selected", "false");
    await expect(remindersTab).toHaveAttribute("aria-selected", "false");

    // Today tabpanel is rendered
    const todayPanel = page.locator("#tabpanel-today");
    await expect(todayPanel).toBeVisible();

    // Switch to Progress tab
    await progressTab.click();
    await expect(progressTab).toHaveAttribute("aria-selected", "true");
    await expect(todayTab).toHaveAttribute("aria-selected", "false");

    const progressPanel = page.locator("#tabpanel-progress");
    await expect(progressPanel).toBeVisible();
    await expect(todayPanel).not.toBeVisible();

    // Switch to Reminders tab
    await remindersTab.click();
    await expect(remindersTab).toHaveAttribute("aria-selected", "true");
    await expect(progressTab).toHaveAttribute("aria-selected", "false");

    const remindersPanel = page.locator("#tabpanel-reminders");
    await expect(remindersPanel).toBeVisible();
    await expect(progressPanel).not.toBeVisible();

    // Switch back to Today tab
    await todayTab.click();
    await expect(todayTab).toHaveAttribute("aria-selected", "true");
    await expect(todayPanel).toBeVisible();
  });

  test("renders correctly in English locale (/en/plans)", async ({ page }) => {
    await page.goto("/en/plans");

    // Header CTA in English
    const headerCta = page
      .locator("header")
      .getByRole("button", { name: /New wird/i });
    await expect(headerCta).toBeVisible();

    const tablist = page.getByRole("tablist");
    await expect(tablist).toBeVisible();

    const todayTab = page.getByRole("tab", { name: /My Awrad/i });
    const progressTab = page.getByRole("tab", { name: /Progress/i });
    const remindersTab = page.getByRole("tab", { name: /Reminders/i });

    await expect(todayTab).toBeVisible();
    await expect(progressTab).toBeVisible();
    await expect(remindersTab).toBeVisible();
  });
});
