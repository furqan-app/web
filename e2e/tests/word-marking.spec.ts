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
  clearUserMarks,
} from "../helpers/auth";

test.describe.configure({ mode: "serial" });

/**
 * Standard setup helper for reader tests: clears marks, sets auth cookies,
 * navigates to page 1, and waits for reader content to mount.
 */
async function setupReaderSession(
  page: Page,
  context: BrowserContext,
  pageNumber = 1,
  locale = "ar"
) {
  await clearUserMarks();
  await authenticateAsUser(context);
  await page.goto(`/${locale}/pages/${pageNumber}`);
  await waitForReaderContent(page);
}

test.describe("Unauthenticated Gating", () => {
  test.beforeEach(async ({ context }) => {
    await clearAuth(context);
    await clearUserMarks();
  });

  test("signed-out user clicking word sees sign-in prompt in MarkModal without category options", async ({
    page,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Word click is desktop-oriented");

    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await expect(firstWord).toBeVisible();
    await firstWord.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Verify word label in Arabic ("تحديد كلمة")
    await expect(dialog.getByText("تحديد كلمة").first()).toBeVisible();

    // Verify unauthenticated prompt and sign-in button
    await expect(
      dialog.getByText("سجّل الدخول لتحديد الكلمات والآيات")
    ).toBeVisible();
    const signInBtn = dialog.getByRole("button", { name: "تسجيل الدخول" });
    await expect(signInBtn).toBeVisible();

    // Category options and comment box must not exist
    await expect(dialog.locator("#mark-color-forgetting")).toBeHidden();
    await expect(dialog.getByPlaceholder(/أضف تعليقًا/)).toBeHidden();
  });

  test("signed-out user visiting /ar/marks sees signed-out prompt", async ({
    page,
  }) => {
    await page.goto("/ar/marks");
    await expect(page.locator("main")).toBeVisible();

    await expect(page.getByText("سجّل الدخول لرؤية علاماتك.")).toBeVisible();
    const signInBtn = page
      .locator("main")
      .getByRole("button", { name: "تسجيل الدخول" });
    await expect(signInBtn).toBeVisible();
  });
});

test.describe("Modal Lifecycle & Audio Actions", () => {
  test("modal dismissal via close button, backdrop overlay, and Escape key", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop dialog lifecycle");
    await setupReaderSession(page, context);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    const dialog = page.getByRole("dialog");

    // 1. Close via X button
    await firstWord.click();
    await expect(dialog).toBeVisible();
    const closeBtn = dialog.getByRole("button", { name: "إغلاق لوحة العلامة" });
    await closeBtn.click();
    await expect(dialog).toBeHidden();

    // 2. Close via Escape key
    await firstWord.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 3. Close via backdrop click (click outside dialog content)
    await firstWord.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(dialog).toBeHidden();
  });

  test("word audio pronunciation button plays audio and 'Play from here' starts recitation", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop audio interactions");
    await setupReaderSession(page, context);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await firstWord.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Word pronunciation button
    const pronunciationBtn = dialog.getByRole("button", {
      name: "سماع النطق",
    });
    await expect(pronunciationBtn).toBeVisible();
    await pronunciationBtn.click();

    // "Play from here" recitation button
    const playFromHereBtn = dialog.getByRole("button", {
      name: "التشغيل من هنا",
    });
    await expect(playFromHereBtn).toBeVisible();
    await playFromHereBtn.click();

    // Modal closes upon starting recitation
    await expect(dialog).toBeHidden();
  });
});

test.describe("Word Mark Creation & Highlighting", () => {
  test("selecting category and optional comment saves mark and updates word class", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop mark flow");
    await setupReaderSession(page, context);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await firstWord.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText("ضع علامة للمراجعة")).toBeVisible();
    const commentInput = dialog.getByPlaceholder(/أضف تعليقًا/);
    await expect(commentInput).toBeEnabled();
    await expect(commentInput).toHaveAttribute("dir", "rtl");

    const saveBtn = dialog.getByRole("button", { name: "حفظ العلامة" });
    await expect(saveBtn).toBeDisabled();

    // Select category "نسيان" (forgetting)
    const forgettingOption = dialog.locator('label[for="mark-color-forgetting"]');
    await forgettingOption.click();
    await expect(forgettingOption).toHaveClass(/border-primary/);

    const selectedSaveBtn = dialog.getByRole("button", { name: "حفظ: نسيان" });
    await expect(selectedSaveBtn).toBeEnabled();

    // The optional comment is always available.
    await commentInput.fill("ملاحظة حفظ الكلمة الأولى");

    // Save mark
    await selectedSaveBtn.click();
    await expect(dialog).toBeHidden();

    // Verify word element receives forgetting highlight styling (bg-red-400)
    await expect(firstWord).toHaveClass(/bg-red-400/, { timeout: 10000 });
  });
});

test.describe("Reload Persistence & Modal Edit Mode", () => {
  test("mark highlight persists across page reload and opens in edit mode with remove button", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop mark persistence");
    await setupReaderSession(page, context);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await firstWord.click();

    const initialDialog = page.getByRole("dialog");
    await expect(initialDialog).toBeVisible();

    await initialDialog.locator('label[for="mark-color-forgetting"]').click();
    const commentInput = initialDialog.getByPlaceholder(/أضف تعليقًا/);
    await commentInput.fill("ملاحظة اختبار الثبات");
    await initialDialog.getByRole("button", { name: "حفظ: نسيان" }).click();
    await expect(initialDialog).toBeHidden();
    await expect(firstWord).toHaveClass(/bg-red-400/, { timeout: 10000 });

    // Hard reload
    await page.reload();
    await waitForReaderContent(page);

    const reloadedWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();

    // Highlight must persist post-reload
    await expect(reloadedWord).toHaveClass(/bg-red-400/, { timeout: 10000 });

    // Click marked word to open in edit mode
    await reloadedWord.click();
    const postReloadDialog = page.getByRole("dialog");
    await expect(postReloadDialog).toBeVisible();

    // Category should be pre-selected
    const radio = postReloadDialog.locator("#mark-color-forgetting");
    await expect(radio).toBeChecked();

    // Comment should be pre-filled
    await expect(postReloadDialog.getByPlaceholder(/أضف تعليقًا/)).toHaveValue(
      "ملاحظة اختبار الثبات"
    );

    // "إزالة العلامة" (Remove mark) button must be present
    const removeBtn = postReloadDialog.getByRole("button", { name: "إزالة العلامة" });
    await expect(removeBtn).toBeVisible();

    await page.keyboard.press("Escape");
  });
});

test.describe("Category Mutation & Deletion", () => {
  test("updating mark category changes highlight class and removing mark deletes it", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop mutation & deletion");
    await setupReaderSession(page, context);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    const dialog = page.getByRole("dialog");

    // 1. Initial mark as forgetting
    await firstWord.click();
    await expect(dialog).toBeVisible();
    await dialog.locator('label[for="mark-color-forgetting"]').click();
    await dialog.getByRole("button", { name: "حفظ: نسيان" }).click();
    await expect(dialog).toBeHidden();
    await expect(firstWord).toHaveClass(/bg-red-400/, { timeout: 10000 });

    // 2. Change category to similar (متشابه)
    await firstWord.click();
    await expect(dialog).toBeVisible();
    await dialog.locator('label[for="mark-color-similar"]').click();
    await dialog.getByRole("button", { name: "تحديث: متشابه" }).click();
    await expect(dialog).toBeHidden();

    // Verify class switched to similar highlight (bg-orange-300)
    await expect(firstWord).toHaveClass(/bg-orange-300/, { timeout: 10000 });
    await expect(firstWord).not.toHaveClass(/bg-red-400/);

    // 3. Remove mark
    await firstWord.click();
    await expect(dialog).toBeVisible();
    const removeBtn = dialog.getByRole("button", { name: "إزالة العلامة" });
    await removeBtn.click();
    await expect(dialog).toBeHidden();

    // Verify highlight class is removed
    await expect(firstWord).not.toHaveClass(/bg-orange-300/, { timeout: 10000 });
    await expect(firstWord).not.toHaveClass(/bg-red-400/);

    // Reload to verify deletion persistence
    await page.reload();
    await waitForReaderContent(page);
    const reloadedWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await expect(reloadedWord).not.toHaveClass(/bg-orange-300/);
  });
});

test.describe("Concurrent Marks", () => {
  test("marking multiple words on the same page applies independent highlight classes", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Multiple marks flow");
    await setupReaderSession(page, context);

    const word1 = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    const word2 = getActivePanel(page)
      .locator('[data-fq-word="1:1:2"]')
      .first();
    const dialog = page.getByRole("dialog");

    // Mark word 1 as forgetting (red)
    await word1.click();
    await expect(dialog).toBeVisible();
    await dialog.locator('label[for="mark-color-forgetting"]').click();
    await dialog.getByRole("button", { name: "حفظ: نسيان" }).click();
    await expect(dialog).toBeHidden();
    await expect(word1).toHaveClass(/bg-red-400/, { timeout: 10000 });

    // Mark word 2 as linking (blue)
    await word2.click();
    await expect(dialog).toBeVisible();
    await dialog.locator('label[for="mark-color-linking"]').click();
    await dialog.getByRole("button", { name: "حفظ: تربيط" }).click();
    await expect(dialog).toBeHidden();

    // Verify both words render independent classes concurrently
    await expect(word1).toHaveClass(/bg-red-400/, { timeout: 10000 });
    await expect(word2).toHaveClass(/bg-blue-300/, { timeout: 10000 });
  });
});

test.describe("Verse-Level Marking", () => {
  test("clicking ayah end marker opens verse-level mark modal, saves verse mark, and persists across reload", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Verse mark flow");
    await setupReaderSession(page, context);

    // Click ayah end symbol for 1:1
    const ayahEnd = getActivePanel(page).locator(".fq-ayah-end").first();
    await expect(ayahEnd).toBeVisible();
    await ayahEnd.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Header must indicate verse marking in Arabic ("تحديد آية")
    await expect(dialog.getByText("تحديد آية").first()).toBeVisible();

    // Select tajweed-error and save
    await dialog.locator('label[for="mark-color-tajweed-error"]').click();
    await dialog.getByRole("button", { name: "حفظ: خطأ تجويدي" }).click();
    await expect(dialog).toBeHidden();

    // Verify persistence across reload
    await page.reload();
    await waitForReaderContent(page);

    const reloadedAyahEnd = getActivePanel(page).locator(".fq-ayah-end").first();
    await reloadedAyahEnd.click();

    const reloadedDialog = page.getByRole("dialog");
    await expect(reloadedDialog).toBeVisible();
    const radio = reloadedDialog.locator("#mark-color-tajweed-error");
    await expect(radio).toBeChecked();
    await page.keyboard.press("Escape");
  });
});

test.describe("My Marks Management", () => {
  test("renders saved marks grouped by surah with category filters and allows in-place deletion", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop My Marks management suite");
    await setupReaderSession(page, context);

    // 1. Create a mark on page 1
    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await firstWord.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('label[for="mark-color-forgetting"]').click();
    const commentInput = dialog.getByPlaceholder(/أضف تعليقًا/);
    await commentInput.fill("ملاحظة سورة الفاتحة");
    await dialog.getByRole("button", { name: "حفظ: نسيان" }).click();
    await expect(dialog).toBeHidden();

    // 2. Navigate to /ar/marks
    await page.goto("/ar/marks");
    await expect(page.locator("main")).toBeVisible();

    // Verify Surah group heading
    await expect(page.getByText("الفاتحة").first()).toBeVisible({
      timeout: 10000,
    });

    // Verify mark item content
    await expect(page.getByText("الفاتحة - ١").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("ملاحظة سورة الفاتحة")).toBeVisible();
    await expect(page.getByText("صفحة ١").first()).toBeVisible();

    // 3. Test category filtering (desktop horizontal pills)
    const similarFilter = page.locator("button").filter({ hasText: "متشابه" });
    await similarFilter.click();
    await expect(
      page.getByText("لا توجد علامات في هذا التصنيف بعد.")
    ).toBeVisible({ timeout: 10000 });

    // Filter back to all -> shows item again
    const allFilter = page.locator("button").filter({ hasText: "الكل" });
    await allFilter.click();
    await expect(page.getByText("الفاتحة - ١").first()).toBeVisible({
      timeout: 10000,
    });

    // 4. Test row navigation to reader
    const markLink = page.locator('a[href*="/pages/1"]').first();
    await markLink.click();
    await expect(page).toHaveURL(/\/ar\/pages\/1/);
    await waitForReaderContent(page);

    // 5. Navigate back to /ar/marks and delete mark in-place
    await page.goto("/ar/marks");
    await expect(page.getByText("الفاتحة - ١").first()).toBeVisible({
      timeout: 10000,
    });

    const deleteBtn = page
      .getByRole("button", { name: "إزالة العلامة" })
      .first();
    await deleteBtn.click();

    // Global empty state should display once all marks are deleted
    await expect(page.getByText("لا توجد علامات بعد.")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("علّم كلمة أو آية أثناء القراءة وستظهر هنا.")
    ).toBeVisible();
  });
});

test.describe("Mobile Long-Press Interaction", () => {
  test("long-press on mobile opens mark modal without triggering overlay navigation toggle", async ({
    page,
    context,
  }, testInfo) => {
    skipNonMobile(testInfo, "Mobile long-press touch interactions");
    await setupReaderSession(page, context);

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await expect(firstWord).toBeVisible();

    // Execute touch long-press (600ms)
    await longPressWord(page, firstWord, 600);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("تحديد كلمة").first()).toBeVisible();
    await expect(dialog).toHaveCSS("overflow-y", "visible");
    await expect(dialog.getByRole("button", { name: "حفظ العلامة" })).toBeVisible();
  });
});

test.describe("English Locale & Tajweed Edition Continuity", () => {
  test("English locale renders LTR layout and English labels in modal and My Marks", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Desktop English flow");
    await setupReaderSession(page, context, 1, "en");

    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await firstWord.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // English labels
    await expect(dialog.getByText("Mark word").first()).toBeVisible();
    await expect(dialog.getByText("Add a review mark")).toBeVisible();

    // Select Forgetting and save
    await dialog.locator('label[for="mark-color-forgetting"]').click();
    await dialog.getByRole("button", { name: "Save: Forgetting" }).click();
    await expect(dialog).toBeHidden();

    // Visit /en/marks
    await page.goto("/en/marks");
    await expect(page.getByText("My Marks")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Al-Fatihah - 1").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Page 1").first()).toBeVisible();
  });

  test("marks remain visible when switching to Tajweed edition (ADR 0033)", async ({
    page,
    context,
  }, testInfo) => {
    skipNonDesktop(testInfo, "Tajweed edition continuity");
    await setupReaderSession(page, context);

    // Mark word 1:1:1 on default edition
    const firstWord = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await firstWord.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('label[for="mark-color-forgetting"]').click();
    await dialog.getByRole("button", { name: "حفظ: نسيان" }).click();
    await expect(dialog).toBeHidden();
    await expect(firstWord).toHaveClass(/bg-red-400/, { timeout: 10000 });

    // Both evaluate and addInitScript are needed: evaluate immediately updates current
    // window's storage, while addInitScript guarantees the key exists before Next.js
    // hydration runs on the subsequent hard page reload.
    await page.evaluate(() => {
      window.localStorage.setItem("quranMushafId", "19");
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("quranMushafId", "19");
    });

    await page.reload();
    await waitForReaderContent(page);

    // Word should still display mark highlight in Tajweed edition
    const wordInTajweed = getActivePanel(page)
      .locator('[data-fq-word="1:1:1"]')
      .first();
    await expect(wordInTajweed).toHaveClass(/bg-red-400/, { timeout: 10000 });
  });
});
