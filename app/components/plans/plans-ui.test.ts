import { describe, expect, it } from "vitest";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import {
  quantityAmount,
  computeTodayTaskCounts,
  getPlanPaceSummary,
} from "@/app/lib/plans/ui-helpers";

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
      };
      expect(quantityAmount(dailyWird.params.quantities?.reading, 5)).toBe(4);

      const listeningWird: UserPlanListItem = {
        id: 4,
        template_key: "listening-wird",
        params: {},
        start_date: "2026-09-01",
        status: "active",
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
      };
      expect(quantityAmount(memorizingWird.params.quantities?.memorizing, 1)).toBe(1);

      const memorizingWirdWithCustomPace: UserPlanListItem = {
        id: 6,
        template_key: "memorizing-wird",
        params: { quantities: { memorizing: 2 } },
        start_date: "2026-09-01",
        status: "active",
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
      };
      expect(quantityAmount(reviewingWird.params.quantities?.reviewing, 1)).toBe(1);

      const reviewingWirdWithCustomPace: UserPlanListItem = {
        id: 8,
        template_key: "reviewing-wird",
        params: { quantities: { reviewing: 3 } },
        start_date: "2026-09-01",
        status: "active",
      };
      expect(quantityAmount(reviewingWirdWithCustomPace.params.quantities?.reviewing, 1)).toBe(3);
    });
  });
});
