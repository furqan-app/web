import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import type { SurahResult } from "@/app/types";
import {
  quantityAmount,
  computeTodayTaskCounts,
  getPlanPaceSummary,
  formatVerseRange,
  parseVerseKey,
  formatRawVerseKey,
} from "@/app/lib/plans/ui-helpers";
import { PLAN_TRACK_UI } from "@/app/constants/plan-ui";

describe("Plans UI Redesign (#595)", () => {
  describe("i18n Translation Keys Parity", () => {
    const requiredKeys = [
      "tabs.today",
      "tabs.manage",
      "noTasksToday",
      "noTasksHint",
      "goToManage",
      "manageHint",
      "summary.allQuran",
      "summary.juzRange",
      "pagesPerDay",
      "versesPerDay",
    ];

    it("ensures all newly added translation keys exist in both ar.json and en.json", () => {
      const getNested = (obj: Record<string, unknown>, path: string) =>
        path
          .split(".")
          .reduce<unknown>(
            (acc, part) =>
              acc && typeof acc === "object"
                ? (acc as Record<string, unknown>)[part]
                : undefined,
            obj
          );

      for (const key of requiredKeys) {
        const arVal = getNested(arMessages.plans, key);
        const enVal = getNested(enMessages.plans, key);

        expect(arVal, `Missing ar.json key: plans.${key}`).toBeDefined();
        expect(typeof arVal).toBe("string");
        expect(enVal, `Missing en.json key: plans.${key}`).toBeDefined();
        expect(typeof enVal).toBe("string");
      }
    });

    it("verifies tab labels are correctly localized", () => {
      expect(arMessages.plans.tabs.today).toBe("مهام اليوم");
      expect(enMessages.plans.tabs.today).toBe("Today's Tasks");
      expect(arMessages.plans.tabs.manage).toBe("إدارة الخطط");
      expect(enMessages.plans.tabs.manage).toBe("My Plans");
    });
  });

  describe("Plan Parameters Summary Logic (Imported Implementation)", () => {
    it("extracts plain numeric quantities correctly", () => {
      expect(quantityAmount(5, 1)).toBe(5);
      expect(quantityAmount(undefined, 1)).toBe(1);
    });

    it("guards null correctly without throwing TypeError", () => {
      expect(quantityAmount(null, 1)).toBe(1);
      expect(quantityAmount(null, 5)).toBe(5);
    });

    it("extracts object-wrapped PlanQuantity correctly (ADR 0038)", () => {
      expect(quantityAmount({ unit: "pages", amount: 2 }, 1)).toBe(2);
      expect(quantityAmount({ unit: "pages", amount: 10 }, 1)).toBe(10);
    });

    it("formats pace summaries according to trackUnits (page vs verse)", () => {
      const mockT = (k: string, def?: string) => {
        if (k === "plans.versesPerDay") return "verses/day";
        if (k === "plans.pagesPerDay") return "pages/day";
        return def ?? k;
      };

      expect(getPlanPaceSummary(5, "page", "en", mockT)).toBe("5 pages/day");
      expect(getPlanPaceSummary(10, "verse", "en", mockT)).toBe("10 verses/day");
      expect(getPlanPaceSummary(5, undefined, "en", mockT)).toBe("5 pages/day");
    });

    it("derives Husun plan parameters summary correctly", () => {
      const wholeQuranPlan: UserPlanListItem = {
        id: 1,
        template_key: "husun",
        params: { quantities: { hifz: 1 } },
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
        target_juz_start: 1,
        target_juz_end: 30,
      };

      const startJuz = wholeQuranPlan.target_juz_start ?? 1;
      const endJuz = wholeQuranPlan.target_juz_end ?? 30;
      const isWholeQuran = startJuz === 1 && endJuz === 30;
      expect(isWholeQuran).toBe(true);

      const partialPlan: UserPlanListItem = {
        id: 2,
        template_key: "husun",
        params: {
          quantities: { hifz: { unit: "pages", amount: 2 } },
          trackUnits: { hifz: "verse" },
        },
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
        target_juz_start: 1,
        target_juz_end: 5,
      };

      expect(partialPlan.target_juz_start).toBe(1);
      expect(partialPlan.target_juz_end).toBe(5);
      expect(quantityAmount(partialPlan.params.quantities?.hifz, 1)).toBe(2);
      expect(partialPlan.params.trackUnits?.hifz).toBe("verse");
    });

    it("derives Daily Wird and Listening Wird parameters summary correctly", () => {
      const dailyWird: UserPlanListItem = {
        id: 3,
        template_key: "daily-wird",
        params: { quantities: { reading: 4 } },
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
      };
      expect(quantityAmount(dailyWird.params.quantities?.reading, 5)).toBe(4);

      const listeningWird: UserPlanListItem = {
        id: 4,
        template_key: "listening-wird",
        params: {},
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
      };
      expect(quantityAmount(listeningWird.params.quantities?.listening, 5)).toBe(5);
    });
  });

  describe("Today's Tasks Aggregation & Badges (Imported Implementation)", () => {
    it("aggregates pending and total tasks across active plans using computeTodayTaskCounts", () => {
      const todayData = [
        {
          planId: 1,
          assignments: [
            { trackKey: "tilawa", completed: true },
            { trackKey: "hifz", completed: false },
          ],
        },
        {
          planId: 2,
          assignments: [{ trackKey: "reading", completed: false }],
        },
      ];

      const { totalTasks, pendingTasks } = computeTodayTaskCounts(todayData);

      expect(totalTasks).toBe(3);
      expect(pendingTasks).toBe(2);
    });

    it("reports pendingTasks as 0 when all tasks are checked off", () => {
      const todayData = [
        {
          planId: 1,
          assignments: [
            { trackKey: "tilawa", completed: true },
            { trackKey: "hifz", completed: true },
          ],
        },
      ];

      const { totalTasks, pendingTasks } = computeTodayTaskCounts(todayData);

      expect(totalTasks).toBe(2);
      expect(pendingTasks).toBe(0);
    });

    it("handles null or undefined todayData safely", () => {
      expect(computeTodayTaskCounts(null)).toEqual({ totalTasks: 0, pendingTasks: 0 });
      expect(computeTodayTaskCounts(undefined)).toEqual({ totalTasks: 0, pendingTasks: 0 });
    });
  });
});

describe("Daily Wird Activity Flavours (#607)", () => {
  describe("i18n Translation Keys Parity", () => {
    const requiredKeys = [
      "browse.dailyWirdType.title",
      "browse.dailyWirdType.description",
      "browse.customWirdType.title",
      "browse.customWirdType.description",
      "browse.comingSoon",
      "startPoint.label",
      "startPoint.fromBeginning",
      "startPoint.pagePrefix",
      "startPoint.lockedNotice",
      "startPoint.byPage",
      "startPoint.bySurah",
      "startPoint.pageNumber",
      "startPoint.pageRangeHint",
      "startPoint.choosePage",
      "startPoint.searchPages",
      "startPoint.noPageFound",
      "startPoint.chooseSurah",
      "startPoint.searchSurahs",
      "startPoint.noSurahFound",
      "templates.dailyWird.label",
      "templates.listeningWird.label",
      "templates.memorizingWird.label",
      "templates.memorizingWird.description",
      "templates.reviewingWird.label",
      "templates.reviewingWird.description",
      "tracks.memorizing",
      "tracks.reviewing",
    ];

    it("ensures all newly added translation keys exist in both ar.json and en.json", () => {
      const getNested = (obj: Record<string, unknown>, path: string) =>
        path
          .split(".")
          .reduce<unknown>(
            (acc, part) =>
              acc && typeof acc === "object"
                ? (acc as Record<string, unknown>)[part]
                : undefined,
            obj
          );

      for (const key of requiredKeys) {
        const arVal = getNested(arMessages.plans, key);
        const enVal = getNested(enMessages.plans, key);

        expect(arVal, `Missing ar.json key: plans.${key}`).toBeDefined();
        expect(typeof arVal).toBe("string");
        expect(enVal, `Missing en.json key: plans.${key}`).toBeDefined();
        expect(typeof enVal).toBe("string");
      }
    });
  });

  describe("Plan Parameters Summary for new flavours", () => {
    it("derives memorizing-wird pace correctly with default 1", () => {
      const memorizingWird: UserPlanListItem = {
        id: 5,
        template_key: "memorizing-wird",
        params: {},
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
      };
      expect(quantityAmount(memorizingWird.params.quantities?.memorizing, 1)).toBe(1);

      const memorizingWirdWithCustomPace: UserPlanListItem = {
        id: 6,
        template_key: "memorizing-wird",
        params: { quantities: { memorizing: 2 } },
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
      };
      expect(quantityAmount(memorizingWirdWithCustomPace.params.quantities?.memorizing, 1)).toBe(2);
    });

    it("derives reviewing-wird pace correctly with default 1", () => {
      const reviewingWird: UserPlanListItem = {
        id: 7,
        template_key: "reviewing-wird",
        params: {},
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
      };
      expect(quantityAmount(reviewingWird.params.quantities?.reviewing, 1)).toBe(1);

      const reviewingWirdWithCustomPace: UserPlanListItem = {
        id: 8,
        template_key: "reviewing-wird",
        params: { quantities: { reviewing: 3 } },
        start_date: "2026-09-01",
        status: "active",
        has_progress: false,
      };
      expect(quantityAmount(reviewingWirdWithCustomPace.params.quantities?.reviewing, 1)).toBe(3);
    });
  });
});

describe("Custom Wird UI (#610)", () => {
  describe("i18n Translation Keys Parity", () => {
    const requiredCustomKeys = [
      "browse.customWirdType.title",
      "browse.customWirdType.description",
      "custom.newTitle",
      "custom.editTitle",
      "custom.description",
      "custom.nameLabel",
      "custom.namePlaceholder",
      "custom.activityLabel",
      "custom.rangeLabel",
      "custom.rangeMode.wholeMushaf",
      "custom.rangeMode.surah",
      "custom.rangeMode.juz",
      "custom.rangeMode.page",
      "custom.rangeMode.verse",
      "custom.fromSurah",
      "custom.toSurah",
      "custom.fromJuz",
      "custom.toJuz",
      "custom.fromPage",
      "custom.toPage",
      "custom.fromVerse",
      "custom.toVerse",
      "custom.cadenceLabel",
      "custom.cadenceType.pace",
      "custom.cadenceType.deadline",
      "custom.period.day",
      "custom.period.week",
      "custom.targetDate",
      "custom.repetitions",
      "custom.versePrefix",
      "custom.pagesRange",
      "custom.singlePage",
      "custom.pagesCount",
      "custom.versesCount",
      "custom.daysCount",
      "custom.pagesPerDay",
      "custom.versesPerDay",
      "custom.pagesPerWeek",
      "custom.estimate.days",
      "custom.estimate.pace",
      "custom.rangeFrozen",
      "custom.verseWeeklyUnavailable",
      "custom.memorizeRepetitionsLocked",
      "custom.submit",
      "custom.save",
      "templates.custom.label",
      "templates.custom.description",
    ];

    it("ensures all custom wird translation keys exist in both ar.json and en.json", () => {
      const getNested = (obj: Record<string, unknown>, path: string) =>
        path
          .split(".")
          .reduce<unknown>(
            (acc, part) =>
              acc && typeof acc === "object"
                ? (acc as Record<string, unknown>)[part]
                : undefined,
            obj
          );

      for (const key of requiredCustomKeys) {
        const arVal = getNested(arMessages.plans, key);
        const enVal = getNested(enMessages.plans, key);

        expect(arVal, `Missing ar.json key: plans.${key}`).toBeDefined();
        expect(typeof arVal).toBe("string");
        expect(enVal, `Missing en.json key: plans.${key}`).toBeDefined();
        expect(typeof enVal).toBe("string");
      }
    });

    it("verifies copy polish for custom wird deadline date", () => {
      expect(arMessages.plans.custom.targetDate).toBe("موعد الانتهاء");
      expect(enMessages.plans.custom.targetDate).toBe("Target date");
    });

    it("verifies estimate placeholders follow ICU format", () => {
      expect(arMessages.plans.custom.estimate.days).toContain("{count, plural,");
      expect(enMessages.plans.custom.estimate.days).toContain("{count, plural,");
      expect(arMessages.plans.custom.estimate.pace).toContain("{pace}");
      expect(enMessages.plans.custom.estimate.pace).toContain("{pace}");
    });

    it("verifies picker card description matches custom wird reality (Nit 4)", () => {
      expect(arMessages.plans.browse.customWirdType.description).toBe(
        "اختَر مقدارًا مخصّصًا وحدِّد وتيرته اليومية أو تاريخ انتهائه"
      );
      expect(enMessages.plans.browse.customWirdType.description).toBe(
        "Pick a custom range and set its daily pace or an end date"
      );
    });

    it("verifies Arabic date formatting forces Arabic-Indic numerals (Nit 2)", () => {
      const date = new Date("2026-10-10T00:00:00");
      const formatted = date.toLocaleDateString("ar-u-nu-arab", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      expect(formatted).toBe("١٠ أكتوبر ٢٠٢٦");
    });
  });

  describe("Custom Plan Structure in UserPlanListItem", () => {
    it("safely models custom wird item with definition and has_progress flag", () => {
      const customPlan: UserPlanListItem = {
        id: 9,
        name: "ورد الفاتحة",
        template_key: "custom",
        definition: {
          activity: "read",
          unit: "page",
          rangeStart: 1,
          rangeEnd: 604,
          cadence: {
            type: "pace",
            unitsPerDay: 5,
          },
        },
        params: {
          trackUnits: { custom: "page" },
        },
        start_date: "2026-09-09",
        status: "active",
        has_progress: true,
      };

      expect(customPlan.template_key).toBe("custom");
      expect(customPlan.name).toBe("ورد الفاتحة");
      expect(customPlan.has_progress).toBe(true);
      expect(customPlan.definition?.activity).toBe("read");
      expect(customPlan.definition?.rangeStart).toBe(1);
      expect(customPlan.definition?.rangeEnd).toBe(604);
    });

    it("defines PLAN_TRACK_UI entry for custom wirds with Sparkles icon", () => {
      expect(PLAN_TRACK_UI.custom).toBeDefined();
      expect(PLAN_TRACK_UI.custom.labelKey).toBe("plans.templates.custom.label");
      expect(PLAN_TRACK_UI.custom.defaultLabel).toBe("Custom wird");
      expect(PLAN_TRACK_UI.custom.icon).toBeDefined();
    });
  });

  describe("Human-readable Verse Range Formatting (#610 follow-up)", () => {
    const mockChapters: SurahResult[] = [
      {
        id: 4,
        name_simple: "An-Nisa",
        name_arabic: "النساء",
        verses_count: 176,
        revelation_place: "madinah",
        pages: "77-106",
      },
      {
        id: 5,
        name_simple: "Al-Ma'idah",
        name_arabic: "المائدة",
        verses_count: 120,
        revelation_place: "madinah",
        pages: "106-127",
      },
    ];

    it("parses verse keys correctly", () => {
      expect(parseVerseKey("4:12")).toEqual({ surah: 4, ayah: 12 });
      expect(parseVerseKey("invalid")).toBeNull();
      expect(parseVerseKey("4:0")).toBeNull();
      expect(parseVerseKey("0:5")).toBeNull();
      expect(parseVerseKey("4:12:1")).toBeNull();
    });

    it("formats raw verse keys with localized numerals", () => {
      expect(formatRawVerseKey("4:12", "en")).toBe("4:12");
      expect(formatRawVerseKey("4:12", "ar")).toBe("٤:١٢");
      expect(formatRawVerseKey("invalid", "ar")).toBe("invalid");
    });

    it("formats same-surah verse ranges with surah name and unspaced en-dash", () => {
      expect(formatVerseRange("4:1", "4:12", "ar", mockChapters)).toBe("النساء ١–١٢");
      expect(formatVerseRange("4:1", "4:12", "en", mockChapters)).toBe("An-Nisa 1–12");
    });

    it("formats cross-surah verse ranges with surah names and spaced en-dash", () => {
      expect(formatVerseRange("4:176", "5:3", "ar", mockChapters)).toBe("النساء ١٧٦ – المائدة ٣");
      expect(formatVerseRange("4:176", "5:3", "en", mockChapters)).toBe("An-Nisa 176 – Al-Ma'idah 3");
    });

    it("formats single-ayah ranges without dash", () => {
      expect(formatVerseRange("4:1", "4:1", "ar", mockChapters)).toBe("النساء ١");
      expect(formatVerseRange("4:1", "4:1", "en", mockChapters)).toBe("An-Nisa 1");
    });

    it("falls back to localized raw keys when chapters are missing or loading", () => {
      expect(formatVerseRange("4:1", "4:12", "ar", undefined)).toBe("٤:١–٤:١٢");
      expect(formatVerseRange("4:1", "4:12", "ar", [])).toBe("٤:١–٤:١٢");
      expect(formatVerseRange("4:1", "4:12", "en", undefined)).toBe("4:1–4:12");
      expect(formatVerseRange("4:1", "4:1", "ar", undefined)).toBe("٤:١");
    });

    it("falls back to localized raw keys when chapter cannot be resolved", () => {
      expect(formatVerseRange("99:1", "99:5", "ar", mockChapters)).toBe("٩٩:١–٩٩:٥");
    });
  });

  describe("ICU Plural Formatting for Custom Wird (#610 polish)", () => {
    it("formats Arabic pagesCount with correct plural categories", () => {
      const msg = new IntlMessageFormat(arMessages.plans.custom.pagesCount, "ar");
      expect(msg.format({ count: 1, n: "١" })).toBe("١ صفحة");
      expect(msg.format({ count: 2, n: "٢" })).toBe("٢ صفحتان");
      expect(msg.format({ count: 5, n: "٥" })).toBe("٥ صفحات");
      expect(msg.format({ count: 15, n: "١٥" })).toBe("١٥ صفحة");
    });

    it("formats Arabic pagesPerDay with correct plural categories (Nit 1)", () => {
      const msg = new IntlMessageFormat(arMessages.plans.custom.pagesPerDay, "ar");
      expect(msg.format({ count: 1, n: "١" })).toBe("١ صفحة/يوم");
      expect(msg.format({ count: 2, n: "٢" })).toBe("٢ صفحتان/يوم");
      expect(msg.format({ count: 5, n: "٥" })).toBe("٥ صفحات/يوم");
      expect(msg.format({ count: 15, n: "١٥" })).toBe("١٥ صفحة/يوم");
    });

    it("formats Arabic versesPerDay and pagesPerWeek correctly", () => {
      const vMsg = new IntlMessageFormat(arMessages.plans.custom.versesPerDay, "ar");
      expect(vMsg.format({ count: 1, n: "١" })).toBe("١ آية/يوم");
      expect(vMsg.format({ count: 10, n: "١٠" })).toBe("١٠ آيات/يوم");

      const wMsg = new IntlMessageFormat(arMessages.plans.custom.pagesPerWeek, "ar");
      expect(wMsg.format({ count: 1, n: "١" })).toBe("١ صفحة/أسبوع");
      expect(wMsg.format({ count: 7, n: "٧" })).toBe("٧ صفحات/أسبوع");
    });

    it("formats shortened page range and single page in MyPlansList (Nit 3)", () => {
      const rangeMsg = new IntlMessageFormat(arMessages.plans.custom.pagesRange, "ar");
      expect(rangeMsg.format({ start: "٧٧", end: "١٠٦" })).toBe("صفحات ٧٧–١٠٦");

      const singleMsg = new IntlMessageFormat(arMessages.plans.custom.singlePage, "ar");
      expect(singleMsg.format({ page: "٧٧" })).toBe("صفحة ٧٧");
    });
  });
});

