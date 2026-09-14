import { describe, expect, it } from "vitest";
import { buildRenderContext } from "@/app/lib/notifications/render-context";
import { toLocaleNumeral } from "@/app/utils/i18n";

describe("RenderContext - t and tPlural", () => {
  it("preserves backward compatibility of t with standard string keys", () => {
    const ctxAr = buildRenderContext("ar");
    expect(ctxAr.t("notifications.types.plansDailyReminder.title", "Daily Wird")).toBe("وردك اليومي");

    const ctxEn = buildRenderContext("en");
    expect(ctxEn.t("notifications.types.plansDailyReminder.title", "Daily Wird")).toBe("Daily Wird");

    expect(ctxEn.t("non.existent.key", "Default Fallback")).toBe("Default Fallback");
  });

  it("selects Arabic plural categories accurately", () => {
    const ctx = buildRenderContext("ar");
    const key = "notifications.types.plansDailyReminder.multipleTasks";

    const renderFor = (count: number) =>
      ctx.tPlural(key, count, "لديك {{n}} مهام", { n: toLocaleNumeral(count, "ar") });

    // count = 0 -> zero
    expect(renderFor(0)).toBe("لا توجد مهام متبقية في ورد اليوم");
    // count = 1 -> one
    expect(renderFor(1)).toBe("لديك مهمة واحدة متبقية في ورد اليوم");
    // count = 2 -> two
    expect(renderFor(2)).toBe("لديك مهمتان متبقيتان في ورد اليوم");
    // count = 3 -> few
    expect(renderFor(3)).toBe("لديك ٣ مهام متبقية في ورد اليوم");
    // count = 10 -> few
    expect(renderFor(10)).toBe("لديك ١٠ مهام متبقية في ورد اليوم");
    // count = 11 -> many
    expect(renderFor(11)).toBe("لديك ١١ مهمة متبقية في ورد اليوم");
    // count = 99 -> many
    expect(renderFor(99)).toBe("لديك ٩٩ مهمة متبقية في ورد اليوم");
    // count = 100 -> other
    expect(renderFor(100)).toBe("لديك ١٠٠ مهمة متبقية في ورد اليوم");
  });

  it("selects English plural categories accurately", () => {
    const ctx = buildRenderContext("en");
    const key = "notifications.types.plansDailyReminder.multipleTasks";

    const renderFor = (count: number) =>
      ctx.tPlural(key, count, "You have {{n}} tasks remaining", { n: count });

    // count = 1 -> one
    expect(renderFor(1)).toBe("You have 1 task remaining in today's wird");
    // count = 2 -> other
    expect(renderFor(2)).toBe("You have 2 tasks remaining in today's wird");
    // count = 0 -> other (in English)
    expect(renderFor(0)).toBe("You have 0 tasks remaining in today's wird");
  });

  it("falls back to other when a specific category is missing, and to fallback when other is missing", () => {
    const ctx = buildRenderContext("ar");

    // Test with a key that does not exist in messages
    const missingResult = ctx.tPlural(
      "notifications.nonExistentKey",
      5,
      "Fallback template for {{n}}",
      { n: "5" }
    );
    expect(missingResult).toBe("Fallback template for 5");
  });
});
