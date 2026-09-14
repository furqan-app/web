import { describe, expect, it } from "vitest";
import {
  dateWeekday,
  deriveAssignments,
  type ProgressLogEntry,
} from "@/app/lib/plans/engine";
import {
  PLAN_TEMPLATES,
  planTemplateFromDefinition,
  type CustomWirdDefinition,
  type UserPlanParams,
} from "@/app/constants/plans";

/**
 * Weekly-recurring custom wirds (ADR 0070, #628): a weekday-gated
 * fixed_cycle with onComplete "wrap". Worked examples follow the plan's
 * Verified Test Cases 1–2 (Al-Kahf every Friday, example page span 294–297).
 */

const kahf: CustomWirdDefinition = {
  activity: "read",
  unit: "page",
  rangeStart: 294,
  rangeEnd: 297,
  cadence: { type: "weekly", weekday: 5 },
};

const template = planTemplateFromDefinition(kahf);
const params: UserPlanParams = { trackUnits: { custom: "page" } };

// Real 2026 calendar days: 09-08 Tue, 09-09 Wed, 09-10 Thu, 09-11 Fri,
// 09-12 Sat, 09-14 Mon, 09-18 Fri.
const TUE = "2026-09-08";
const WED = "2026-09-09";
const THU = "2026-09-10";
const FRI = "2026-09-11";
const SAT = "2026-09-12";
const MON = "2026-09-14";
const NEXT_FRI = "2026-09-18";

const entry = (
  track_key: string,
  date: string,
  start: number,
  end: number
): ProgressLogEntry => ({
  track_key,
  date,
  range_start: String(start),
  range_end: String(end),
});

describe("dateWeekday", () => {
  it("maps YYYY-MM-DD strings to Date.getUTCDay() weekdays", () => {
    expect(dateWeekday(TUE)).toBe(2);
    expect(dateWeekday(WED)).toBe(3);
    expect(dateWeekday(FRI)).toBe(5);
    expect(dateWeekday("2026-11-01")).toBe(0); // Sunday
    expect(dateWeekday("2026-11-07")).toBe(6); // Saturday
  });
});

describe("weekly custom wird template shape", () => {
  it("builds a weekday-gated fixed_cycle with onComplete wrap, regardless of activity", () => {
    expect(template.missedDayPolicy).toBe("weekly");
    expect(template.tracks).toHaveLength(1);
    const rule = template.tracks[0].rule;
    expect(rule.kind).toBe("fixed_cycle");
    if (rule.kind !== "fixed_cycle") return;
    expect(rule.weekday).toBe(5);
    expect(rule.onComplete).toBe("wrap");
    expect(rule.defaultUnitsPerDay).toBe(4); // 297 - 294 + 1, the full span
    expect(rule.boundsUnit).toBe("page");
  });

  it("a weekly memorize wird is still a fixed_cycle wrap, not a cursor march", () => {
    const memorize = planTemplateFromDefinition({
      ...kahf,
      activity: "memorize",
    });
    const rule = memorize.tracks[0].rule;
    expect(rule.kind).toBe("fixed_cycle");
    if (rule.kind !== "fixed_cycle") return;
    expect(rule.onComplete).toBe("wrap");
    expect(rule.weekday).toBe(5);
  });
});

describe("fixed_cycle weekday gate (Case 1: first three occurrences)", () => {
  it("produces no assignment on Tue/Wed/Thu before the first due Friday", () => {
    expect(deriveAssignments(template, params, [], TUE)).toEqual([]);
    expect(deriveAssignments(template, params, [], WED)).toEqual([]);
    expect(deriveAssignments(template, params, [], THU)).toEqual([]);
  });

  it("assigns the whole range on the first due Friday", () => {
    const assignments = deriveAssignments(template, params, [], FRI);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      trackKey: "custom",
      rangeStart: 294,
      rangeEnd: 297,
      completed: false,
    });
  });

  it("echoes the logged entry on the due Friday once checked off", () => {
    const logged = [entry("custom", FRI, 294, 297)];
    const assignments = deriveAssignments(template, params, logged, FRI);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      rangeStart: 294,
      rangeEnd: 297,
      completed: true,
    });
  });

  it("produces no assignment on Sat after the due day", () => {
    const logged = [entry("custom", FRI, 294, 297)];
    expect(deriveAssignments(template, params, logged, SAT)).toEqual([]);
  });

  it("wraps back to the full range on the next Friday after completion", () => {
    const logged = [entry("custom", FRI, 294, 297)];
    const assignments = deriveAssignments(template, params, logged, NEXT_FRI);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      rangeStart: 294,
      rangeEnd: 297,
      completed: false,
    });
  });
});

describe("fixed_cycle weekday gate (Case 2: missed Friday waits for next week)", () => {
  it("re-offers the same range the following Friday with nothing logged", () => {
    expect(deriveAssignments(template, params, [], MON)).toEqual([]);
    const assignments = deriveAssignments(template, params, [], NEXT_FRI);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      rangeStart: 294,
      rangeEnd: 297,
      completed: false,
    });
  });
});

describe("todayEntry echo holds on a non-matching weekday", () => {
  it("echoes a logged entry verbatim even when the weekday gate would block", () => {
    // An entry logged on a Wednesday (e.g. checked off early) still echoes.
    const logged = [entry("custom", WED, 294, 297)];
    const assignments = deriveAssignments(template, params, logged, WED);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      rangeStart: 294,
      rangeEnd: 297,
      completed: true,
    });
  });
});

describe("non-gated fixed_cycle tracks are unchanged", () => {
  it("a daily wird still assigns every day of the week", () => {
    const daily = PLAN_TEMPLATES["daily-wird"];
    const dailyParams: UserPlanParams = {};
    for (const date of [TUE, WED, THU, FRI, SAT, MON, NEXT_FRI]) {
      expect(deriveAssignments(daily, dailyParams, [], date)).toHaveLength(1);
    }
  });
});
