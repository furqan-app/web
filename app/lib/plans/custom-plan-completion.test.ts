import { describe, expect, it, vi } from "vitest";
import { isCustomPlanCompleted } from "./custom-plan-completion";
import type { CustomWirdDefinition } from "@/app/constants/plans";

/**
 * Weekly-recurring custom wirds (ADR 0070) never terminal-complete:
 * `isCustomPlanCompleted` must return false for a "weekly" cadence even
 * when a full-range entry is logged, so `status` stays "active".
 */
describe("isCustomPlanCompleted", () => {
  const weeklyRead: CustomWirdDefinition = {
    activity: "read",
    unit: "page",
    rangeStart: 294,
    rangeEnd: 297,
    cadence: { type: "weekly", weekday: 5 },
  };

  const weeklyMemorize: CustomWirdDefinition = {
    ...weeklyRead,
    activity: "memorize",
  };

  const dbWithFullRangeEntry = {
    planProgressEntry: {
      findMany: vi.fn(async () => [{ range_end: "297" }]),
      count: vi.fn(async () => 1),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it("never completes a weekly read wird, even with a full-range entry logged", async () => {
    expect(await isCustomPlanCompleted(1, weeklyRead, dbWithFullRangeEntry)).toBe(
      false
    );
  });

  it("never completes a weekly memorize wird, even at/past the range end", async () => {
    expect(
      await isCustomPlanCompleted(1, weeklyMemorize, dbWithFullRangeEntry)
    ).toBe(false);
  });

  it("never completes a daily recurring read wird, even with a full-range entry logged", async () => {
    const dailyRead: CustomWirdDefinition = {
      ...weeklyRead,
      cadence: { type: "daily" },
    };
    expect(await isCustomPlanCompleted(1, dailyRead, dbWithFullRangeEntry)).toBe(
      false
    );
  });

  it("never completes a daily recurring memorize wird, even at/past the range end", async () => {
    const dailyMemorize: CustomWirdDefinition = {
      ...weeklyMemorize,
      cadence: { type: "daily" },
    };
    expect(
      await isCustomPlanCompleted(1, dailyMemorize, dbWithFullRangeEntry)
    ).toBe(false);
  });

  it("still completes a pace read wird once the full range is logged", async () => {
    const pace: CustomWirdDefinition = {
      ...weeklyRead,
      cadence: { type: "pace", unitsPerDay: 1 },
    };
    expect(await isCustomPlanCompleted(1, pace, dbWithFullRangeEntry)).toBe(true);
  });

  it("never completes a pace wird when repeat is true", async () => {
    const repeatingPace: CustomWirdDefinition = {
      ...weeklyRead,
      cadence: { type: "pace", unitsPerDay: 1, repeat: true },
    };
    expect(
      await isCustomPlanCompleted(1, repeatingPace, dbWithFullRangeEntry)
    ).toBe(false);
  });

  it("does not complete a 0.5-page plan at verse 604; completes only at terminal verse 6236", async () => {
    const halfPagePlan: CustomWirdDefinition = {
      activity: "read",
      unit: "page",
      rangeStart: 1,
      rangeEnd: 604,
      cadence: { type: "pace", unitsPerDay: 0.5, repeat: false },
    };

    const dbAtVerse604 = {
      planProgressEntry: {
        findMany: vi.fn(async () => [{ range_end: "604" }]),
        count: vi.fn(async () => 0),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    expect(await isCustomPlanCompleted(1, halfPagePlan, dbAtVerse604)).toBe(false);

    const dbAtVerse6236 = {
      planProgressEntry: {
        findMany: vi.fn(async () => [{ range_end: "6236" }]),
        count: vi.fn(async () => 1),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    expect(await isCustomPlanCompleted(1, halfPagePlan, dbAtVerse6236)).toBe(true);
  });
});

