import { describe, expect, it } from "vitest";
import { buildRenderContext } from "@/app/lib/notifications/render-context";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { NOTIFICATION_TYPES } from "@/app/constants/notifications";

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

describe("NOTIFICATION_TYPES['plans.daily_reminder'] render title fallback", () => {
  const renderReminder = NOTIFICATION_TYPES["plans.daily_reminder"].render;

  it("renders custom plan name when planName is present", () => {
    const ctxAr = buildRenderContext("ar");
    const contentAr = renderReminder(
      {
        pendingCount: 1,
        primary: null,
        targetPage: null,
        targetUrlKind: "plans",
        planName: "ختمة رمضان",
      },
      ctxAr
    );
    expect(contentAr.title).toBe("تذكير: ختمة رمضان");

    const ctxEn = buildRenderContext("en");
    const contentEn = renderReminder(
      {
        pendingCount: 1,
        primary: null,
        targetPage: null,
        targetUrlKind: "plans",
        planName: "Ramadan Khatma",
      },
      ctxEn
    );
    expect(contentEn.title).toBe("Reminder: Ramadan Khatma");
  });

  it("renders template label when planName is absent but templateKey is provided", () => {
    const ctxAr = buildRenderContext("ar");
    const contentHusunAr = renderReminder(
      {
        pendingCount: 1,
        primary: null,
        targetPage: null,
        targetUrlKind: "plans",
        templateKey: "husun",
      },
      ctxAr
    );
    expect(contentHusunAr.title).toBe("تذكير: الحصون الخمسة");

    const contentDailyAr = renderReminder(
      {
        pendingCount: 1,
        primary: null,
        targetPage: null,
        targetUrlKind: "plans",
        templateKey: "daily-wird",
      },
      ctxAr
    );
    expect(contentDailyAr.title).toBe("تذكير: الورد اليومي — قراءة");

    const ctxEn = buildRenderContext("en");
    const contentHusunEn = renderReminder(
      {
        pendingCount: 1,
        primary: null,
        targetPage: null,
        targetUrlKind: "plans",
        templateKey: "husun",
      },
      ctxEn
    );
    expect(contentHusunEn.title).toBe("Reminder: Al-Husun Al-Khamsa");
  });

  it("renders generic Daily Wird when neither planName nor templateKey is provided", () => {
    const ctxAr = buildRenderContext("ar");
    const contentAr = renderReminder(
      {
        pendingCount: 2,
        primary: null,
        targetPage: null,
        targetUrlKind: "plans",
      },
      ctxAr
    );
    expect(contentAr.title).toBe("وردك اليومي");

    const ctxEn = buildRenderContext("en");
    const contentEn = renderReminder(
      {
        pendingCount: 2,
        primary: null,
        targetPage: null,
        targetUrlKind: "plans",
      },
      ctxEn
    );
    expect(contentEn.title).toBe("Daily Wird");
  });
});
