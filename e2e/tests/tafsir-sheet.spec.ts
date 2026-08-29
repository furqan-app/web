import { test, expect } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  skipNonDesktop,
} from "../helpers/reader";
import { clearAuth, clearUserMarks } from "../helpers/auth";

test.describe("Tafsir Sheet Integration", () => {
  test.beforeEach(async ({ context }) => {
    await clearAuth(context);
    await clearUserMarks();
  });

  test("opens Tafsir sheet from MarkModal and supports edition switching & stepper navigation", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Word click is desktop-oriented");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    // 1. Click the first word of 1:1 to open MarkModal
    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await expect(firstWord).toBeVisible();
    await firstWord.click();

    // 2. MarkModal is open
    const markDialog = page.getByRole("dialog");
    await expect(markDialog).toBeVisible();

    // 3. Click "تفسير الآية" button inside MarkModal
    const tafsirBtn = markDialog.getByRole("button", { name: "تفسير الآية" });
    await expect(tafsirBtn).toBeVisible();
    await tafsirBtn.click();

    // 4. Tafsir sheet should open and display header for Surah Al-Fatihah Ayah 1
    const tafsirSheet = page.getByRole("dialog");
    await expect(tafsirSheet).toBeVisible();
    await expect(tafsirSheet.getByText(/سورة الفاتحة/)).toBeVisible();

    // 5. Verify default edition is Al-Muyassar
    await expect(tafsirSheet.getByText("التفسير الميسر")).toBeVisible();

    // 6. Test Next Ayah button (advances to 1:2)
    const nextAyahBtn = tafsirSheet.getByRole("button", { name: "الآية التالية" });
    await expect(nextAyahBtn).toBeEnabled();
    await nextAyahBtn.click();

    // Header updates to Ayah 2
    await expect(tafsirSheet.getByText(/الآية ٢/)).toBeVisible();

    // 7. Test Keyboard navigation (ArrowLeft advances to 1:3 in RTL)
    await page.keyboard.press("ArrowLeft");
    await expect(tafsirSheet.getByText(/الآية ٣/)).toBeVisible();

    // 8. Test Previous Ayah button (goes back to 1:2)
    const prevAyahBtn = tafsirSheet.getByRole("button", { name: "الآية السابقة" });
    await expect(prevAyahBtn).toBeEnabled();
    await prevAyahBtn.click();
    await expect(tafsirSheet.getByText(/الآية ٢/)).toBeVisible();

    // 9. Switch Tafsir edition via dropdown
    const editionTrigger = tafsirSheet.getByRole("button", { name: "اختر التفسير" });
    await expect(editionTrigger).toBeVisible();
    await editionTrigger.click();

    const ibnKathirOption = page.getByText(/تفسير ابن كثير/);
    await expect(ibnKathirOption).toBeVisible();
    await ibnKathirOption.click();

    await expect(tafsirSheet.getByText(/تفسير ابن كثير/)).toBeVisible();

    // 10. Close the sheet via Escape key
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
