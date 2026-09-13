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

  it("still completes a pace read wird once the full range is logged", async () => {
    const pace: CustomWirdDefinition = {
      ...weeklyRead,
      cadence: { type: "pace", unitsPerDay: 1 },
    };
    expect(await isCustomPlanCompleted(1, pace, dbWithFullRangeEntry)).toBe(true);
  });
});
