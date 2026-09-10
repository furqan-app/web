import { test, expect } from "@playwright/test";
import { authenticateAsUser, clearUserPlans } from "../helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("Plans Page: Custom Wird Creation & Editing (#610)", () => {
  test.beforeEach(async ({ context }) => {
    await clearUserPlans();
    await authenticateAsUser(context);
  });

  test("creates a custom wird with surah range and verifies live estimate", async ({
    page,
  }) => {
    await page.goto("/ar/plans");

    // Open PlansBrowseDialog
    const headerCta = page
      .locator("header")
      .getByRole("button", { name: /ورد جديد/i });
    await expect(headerCta).toBeVisible();
    await headerCta.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Click "ورد مخصص"
    const customWirdBtn = dialog.getByRole("button", { name: /ورد مخصص/i });
    await expect(customWirdBtn).toBeVisible();
    await customWirdBtn.click();

    // Verify Custom Wird form header
    await expect(dialog.getByRole("heading", { name: "ورد مخصص جديد" })).toBeVisible();

    // Fill Wird Name
    const nameInput = dialog.locator('input[placeholder*="سورة البقرة"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill("ورد سورة الكهف");

    // Select "بالسورة" range mode tab
    const bySurahTab = dialog.getByRole("tab", { name: "بالسورة" });
    await expect(bySurahTab).toBeVisible();
    await bySurahTab.click();

    // Live preview shows days or pace estimate
    await expect(dialog.getByText(/للإتمام|يُعاد حسابه تلقائيًا/)).toBeVisible();

    // Submit the form
    const submitBtn = dialog.getByRole("button", { name: "ابدأ الورد" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Assert default active tab is "Today's tasks" (مهام اليوم)
    const todayTab = page.getByRole("tab", { name: /مهام اليوم|today/i });
    await expect(todayTab).toHaveAttribute("aria-selected", "true");

    // Switch to "My plans" (إدارة الخطط) tab unconditionally
    const myPlansTab = page.getByRole("tab", { name: /إدارة الخطط|my plans/i });
    await myPlansTab.click();
    await expect(myPlansTab).toHaveAttribute("aria-selected", "true");

    // Custom plan card appears with the custom name
    const planCard = page.getByText("ورد سورة الكهف");
    await expect(planCard).toBeVisible();

    // Edit button is present on the custom plan card
    const editBtn = page.getByRole("button", { name: "تعديل" });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Dialog opens in edit mode
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "تعديل الورد المخصص" })
    ).toBeVisible();

    // Range section is visible
    await expect(page.getByRole("dialog").getByText("المقدار")).toBeVisible();

    // Save changes
    const saveBtn = page.getByRole("dialog").getByRole("button", { name: "حفظ التعديلات" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Dialog closes after saving
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("respects range mode whole mushaf affordance and freeze behavior", async ({
    page,
  }) => {
    await page.goto("/ar/plans");

    // Open dialog
    await page.locator("header").getByRole("button", { name: /ورد جديد/i }).click();
    const dialog = page.getByRole("dialog");

    // Open custom wird form
    await dialog.getByRole("button", { name: /ورد مخصص/i }).click();

    // Name
    await dialog.locator('input[placeholder*="سورة البقرة"]').fill("ختمة كاملة مخصصة");

    // "كامل المصحف" tab is selected by default
    const wholeQuranTab = dialog.getByRole("tab", { name: "كامل المصحف" });
    await expect(wholeQuranTab).toHaveAttribute("aria-selected", "true");

    // Switch to "بالآية" (verse mode)
    const verseTab = dialog.getByRole("tab", { name: "بالآية" });
    await verseTab.click();

    // In verse mode, weekly pace is disabled with helper text
    const weeklyPill = dialog.getByRole("button", { name: "أسبوعيًا" });
    await expect(weeklyPill).toBeDisabled();
    await expect(
      dialog.getByText(/المعدل الأسبوعي غير متاح للآيات/)
    ).toBeVisible();

    // Activity selector: select "حفظ" (memorize)
    const memorizeBtn = dialog.getByRole("radio", { name: /حفظ/i });
    await memorizeBtn.click();

    // Switch to deadline cadence
    const deadlineTab = dialog.getByRole("tab", { name: "بتاريخ إتمام" });
    await deadlineTab.click();

    // Repetitions stepper must be HIDDEN for memorize activity
    await expect(dialog.getByText("عدد الختمات")).not.toBeVisible();
  });
});
