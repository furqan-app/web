import { test, expect } from "@playwright/test";
import { authenticateAsUser } from "../helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("Quran Heart Memorization Map (#651)", () => {
  test.beforeEach(async ({ context }) => {
    await authenticateAsUser(context);
  });

  test("navigates to '/ar/heart', renders SVG heart map, donut chart, inspector, and tool switcher", async (
    { page },
    testInfo
  ) => {
    await page.goto("/ar/heart");

    // Verify SVG heart map is rendered
    const svgMap = page.locator("#quran-heart-svg");
    await expect(svgMap).toBeVisible();

    // Verify global title and stats
    await expect(page.getByRole("heading", { name: "قلبي القرآني" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "حالة قلبي" })).toBeVisible();

    const isMobile = testInfo.project.name === "mobile";
    if (isMobile) {
      // On mobile, the inspector is in a bottom sheet opened by tapping a surah cell
      const fatihahPath = page.locator("#quran-heart-svg path[aria-label*='الفاتحة']");
      await fatihahPath.click();
    }

    // Inspector is visible (defaults to Al-Fatihah, chapter 1)
    const inspector = isMobile ? page.locator('[role="dialog"]') : page.locator("main");
    await expect(inspector.getByText("سورة الفاتحة")).toBeVisible();
    await expect(inspector.getByRole("link", { name: /اقرأ في المصحف/i })).toBeVisible();

    // Tool selector bar
    const toolMastered = inspector.getByRole("radio", { name: /متقنة/i });
    const toolNeedsReview = inspector.getByRole("radio", { name: /تحتاج تعاهداً/i });
    const toolEraser = inspector.getByRole("radio", { name: /غير محفوظة/i });
    await expect(toolMastered).toBeVisible();
    await expect(toolNeedsReview).toBeVisible();
    await expect(toolEraser).toBeVisible();

    // Bulk action: single unified "تطبيق على الكل" applying active tool
    await expect(inspector.getByRole("button", { name: /تطبيق على الكل/i })).toBeVisible();
  });

  test("allows selecting different surahs by clicking SVG polygons or navigating", async (
    { page },
    testInfo
  ) => {
    await page.goto("/ar/heart");

    const isMobile = testInfo.project.name === "mobile";

    // Find a surah path on the SVG, e.g. Al-Baqarah (surah 2)
    const baqarahPath = page.locator("#quran-heart-svg path[aria-label*='البقرة']");
    await expect(baqarahPath).toBeVisible();
    await baqarahPath.click();

    // Inspector updates to Al-Baqarah
    const inspector = isMobile ? page.locator('[role="dialog"]') : page.locator("main");
    await expect(inspector.getByText("سورة البقرة")).toBeVisible();
    await expect(inspector.getByText(/٤٨ صفحة/)).toBeVisible();
  });
});
