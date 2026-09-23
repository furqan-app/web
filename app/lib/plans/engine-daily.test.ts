import { describe, expect, it } from "vitest";
import {
  deriveAssignments,
  type ProgressLogEntry,
} from "@/app/lib/plans/engine";
import {
  planTemplateFromDefinition,
  type CustomWirdDefinition,
  type UserPlanParams,
} from "@/app/constants/plans";

/**
 * Daily-recurring custom wirds (ADR 0073, #661): full-range fixed_cycle
 * with onComplete "wrap" and no weekday gate (recurs every day).
 */

const mulk: CustomWirdDefinition = {
  activity: "read",
  unit: "verse",
  rangeStart: 5214,
  rangeEnd: 5243, // 30 verses
  cadence: { type: "daily" },
};

const template = planTemplateFromDefinition(mulk);
const params: UserPlanParams = { trackUnits: { custom: "verse" } };

const DAY1 = "2026-09-23";
const DAY2 = "2026-09-24";
const DAY3 = "2026-09-25";

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

describe("daily recurring custom wird template shape", () => {
  it("builds a full-range fixed_cycle with onComplete wrap and no weekday gate", () => {
    expect(template.tracks).toHaveLength(1);
    const track = template.tracks[0];
    expect(track.activity).toBe("read");
    expect(track.unit).toBe("verse");
    const rule = track.rule;
    expect(rule.kind).toBe("fixed_cycle");
    if (rule.kind !== "fixed_cycle") return;
    expect(rule.rangeStart).toBe(5214);
    expect(rule.rangeEnd).toBe(5243);
    expect(rule.defaultUnitsPerDay).toBe(30);
    expect(rule.onComplete).toBe("wrap");
    expect(rule.weekday).toBeUndefined();
  });
});

describe("daily recurring custom wird engine derivation", () => {
  it("1. assigns full range on day 1 with no prior history", () => {
    const assignments = deriveAssignments(template, params, [], DAY1);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      trackKey: "custom",
      activity: "read",
      unit: "verse",
      rangeStart: 5214,
      rangeEnd: 5243,
      completed: false,
    });
  });

  it("2. echoes today's completed assignment once logged", () => {
    const history = [entry("custom", DAY1, 5214, 5243)];
    const assignments = deriveAssignments(template, params, history, DAY1);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      trackKey: "custom",
      rangeStart: 5214,
      rangeEnd: 5243,
      completed: true,
    });
  });

  it("3. wraps back to start on day 2 after day 1 completion", () => {
    const history = [entry("custom", DAY1, 5214, 5243)];
    const assignments = deriveAssignments(template, params, history, DAY2);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      trackKey: "custom",
      rangeStart: 5214,
      rangeEnd: 5243,
      completed: false,
    });
  });

  it("4. resets to full range without accumulation when day 2 was missed", () => {
    // Only DAY1 is in history; user skipped DAY2 and is now on DAY3
    const history = [entry("custom", DAY1, 5214, 5243)];
    const assignments = deriveAssignments(template, params, history, DAY3);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      trackKey: "custom",
      rangeStart: 5214,
      rangeEnd: 5243,
      completed: false,
    });
  });
});
