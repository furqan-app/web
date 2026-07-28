import { describe, expect, it } from "vitest";
import { deriveStreak, type StreakPlanInput } from "@/app/lib/plans/streak";
import type { ProgressLogEntry } from "@/app/lib/plans/engine";
import { PLAN_TEMPLATES } from "@/app/constants/plans";

const TODAY = "2026-07-27";

const wird = PLAN_TEMPLATES["daily-wird"];

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

describe("deriveStreak", () => {
  it("case 1: zero plans -> streak 0, week all 'none' (no plan ever existed)", () => {
    const { streakLength, week } = deriveStreak([], TODAY);
    expect(streakLength).toBe(0);
    expect(week).toEqual(["none", "none", "none", "none", "none", "none", "none"]);
  });

  it("case 2: 10-day plan, checked off every day including today -> streak 10, week all 'done'", () => {
    const startDate = "2026-07-18"; // 10 days before TODAY inclusive
    const entries: ProgressLogEntry[] = [];
    let cursor = 1;
    for (let i = 0; i < 10; i++) {
      const date = new Date(`${startDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + i);
      const d = date.toISOString().slice(0, 10);
      entries.push(entry("reading", d, cursor, cursor + 4));
      cursor += 5;
    }
    const plans: StreakPlanInput[] = [
      { startDate, template: wird, params: {}, entries },
    ];
    const { streakLength, week } = deriveStreak(plans, TODAY);
    expect(streakLength).toBe(10);
    expect(week).toEqual(["done", "done", "done", "done", "done", "done", "done"]);
  });

  it("case 2b: same plan, today not yet checked off -> streak counts up to yesterday", () => {
    const startDate = "2026-07-18";
    const entries: ProgressLogEntry[] = [];
    let cursor = 1;
    for (let i = 0; i < 9; i++) {
      const date = new Date(`${startDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + i);
      const d = date.toISOString().slice(0, 10);
      entries.push(entry("reading", d, cursor, cursor + 4));
      cursor += 5;
    }
    // day 10 (today) has no entry yet.
    const plans: StreakPlanInput[] = [
      { startDate, template: wird, params: {}, entries },
    ];
    const { streakLength, week } = deriveStreak(plans, TODAY);
    expect(streakLength).toBe(9);
    expect(week[6]).toBe("missed"); // today: assigned, not yet done
    expect(week[5]).toBe("done"); // yesterday
  });

  it("case 3: missed day 5 of 10 breaks the streak at that day", () => {
    const startDate = "2026-07-18";
    const entries: ProgressLogEntry[] = [];
    let cursor = 1;
    for (let i = 0; i < 10; i++) {
      if (i === 4) {
        cursor += 5; // day 5 (index 4) skipped entirely
        continue;
      }
      const date = new Date(`${startDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + i);
      const d = date.toISOString().slice(0, 10);
      entries.push(entry("reading", d, cursor, cursor + 4));
      cursor += 5;
    }
    const plans: StreakPlanInput[] = [
      { startDate, template: wird, params: {}, entries },
    ];
    const { streakLength } = deriveStreak(plans, TODAY);
    // Walking back from today (day 10) through day 6 are complete (5 days),
    // day 5 is missed -> streak stops at 5.
    expect(streakLength).toBe(5);
  });

  it("case 4: husun's baeed (not due yet, <20 memorized pages) doesn't block completeness", () => {
    const husun = PLAN_TEMPLATES.husun;
    const startDate = "2026-07-25"; // 3 days before TODAY inclusive
    // tilawa/hifz/tahdeer/qareeb are all assigned from day one (qareeb's
    // trailing_window has "history" as soon as hifz has any entry, even
    // today's own); baeed needs >20 memorized pages so it stays absent the
    // whole fixture (regionEnd < regionStart) — that absence must not count
    // against completeness.
    const entries: ProgressLogEntry[] = [
      entry("tilawa", "2026-07-25", 1, 20),
      entry("hifz", "2026-07-25", 100, 100),
      entry("tahdeer", "2026-07-25", 101, 110),
      entry("qareeb", "2026-07-25", 100, 100),
      entry("tilawa", "2026-07-26", 21, 40),
      entry("hifz", "2026-07-26", 101, 101),
      entry("tahdeer", "2026-07-26", 102, 111),
      entry("qareeb", "2026-07-26", 100, 101),
      entry("tilawa", TODAY, 41, 60),
      entry("hifz", TODAY, 102, 102),
      entry("tahdeer", TODAY, 103, 112),
      entry("qareeb", TODAY, 100, 102),
    ];
    const plans: StreakPlanInput[] = [
      { startDate, template: husun, params: {}, entries },
    ];
    const { streakLength, week } = deriveStreak(plans, TODAY);
    expect(streakLength).toBe(3);
    expect(week[6]).toBe("done");
  });

  it("a day before any plan's start_date is 'none' (pass-through, not a failure, not painted done)", () => {
    const startDate = TODAY; // plan starts today
    const entries: ProgressLogEntry[] = [entry("reading", TODAY, 1, 5)];
    const plans: StreakPlanInput[] = [
      { startDate, template: wird, params: {}, entries },
    ];
    const { streakLength, week } = deriveStreak(plans, TODAY);
    expect(streakLength).toBe(1);
    // The 6 days before start_date are "none" (pass-through for the streak
    // count) but must NOT render as "done" — that would falsely claim
    // something was completed before the plan even existed.
    expect(week).toEqual(["none", "none", "none", "none", "none", "none", "done"]);
  });
});
