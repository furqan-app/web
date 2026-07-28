/**
 * Streak / week-strip derivation (Companion redesign, docs/plans/daily-awrad-ui.md).
 *
 * Pure functions — no DB, no clock. Mirrors engine.ts's derivation-not-storage
 * philosophy (ADR 0030): streak and the week strip are recomputed at read time
 * from the same (template, params, progress log) inputs deriveAssignments
 * already uses, just replayed against past dates.
 *
 * Only currently-active plans count, each contributing from its own
 * start_date onward — pause/resume history isn't timestamped anywhere, so it
 * can't be reconstructed (accepted limitation, see the plan).
 */

import { deriveAssignments, type ProgressLogEntry } from "@/app/lib/plans/engine";
import { addDays } from "@/app/lib/plans/dates";
import type { PlanTemplate, UserPlanParams } from "@/app/constants/plans";

export type StreakPlanInput = {
  startDate: string; // "YYYY-MM-DD"
  template: PlanTemplate;
  params: UserPlanParams;
  entries: ProgressLogEntry[];
};

const MAX_LOOKBACK_DAYS = 400;

/**
 * "done" — something was due (across all started plans) and every bit of it
 * was checked off. "missed" — something was due and wasn't. "none" — no plan
 * had started yet, or nothing was left to do; doesn't break the streak
 * *count*, but must never be painted as "done" in the UI (rendering it green
 * reads as a false claim of having actually done something that day).
 */
type DayStatus = "done" | "missed" | "none";

const dayStatus = (plans: StreakPlanInput[], date: string): DayStatus => {
  let anyAssignment = false;
  for (const plan of plans) {
    if (date < plan.startDate) continue;
    // Only entries up to and including `date` may influence that day's
    // derivation — deriveAssignments doesn't filter by date itself (it's only
    // ever called with "today" in the live app, where future entries can't
    // exist), so replaying past days here must filter explicitly or a later
    // day's progress would leak backward into an earlier day's assignment.
    const entriesUpToDate = plan.entries.filter((e) => e.date <= date);
    const assignments = deriveAssignments(plan.template, plan.params, entriesUpToDate, date);
    if (assignments.length > 0) {
      anyAssignment = true;
      if (!assignments.every((a) => a.completed)) return "missed";
    }
  }
  return anyAssignment ? "done" : "none";
};

const continuesStreak = (status: DayStatus) => status !== "missed";

export type StreakResult = {
  /** Consecutive non-"missed" days walking backward from `today`. */
  streakLength: number;
  /** 7 day statuses, oldest first, always ending at `today`. */
  week: DayStatus[];
};

export const deriveStreak = (plans: StreakPlanInput[], today: string): StreakResult => {
  const earliestStart = plans.reduce<string | null>(
    (min, p) => (min === null || p.startDate < min ? p.startDate : min),
    null
  );

  let streakLength = 0;
  if (earliestStart !== null) {
    // Today not being done yet doesn't retroactively break an existing
    // streak — the walk starts from yesterday in that case. Any earlier
    // "missed" day still stops the walk as normal.
    let cursor = continuesStreak(dayStatus(plans, today)) ? today : addDays(today, -1);
    while (cursor >= earliestStart && streakLength < MAX_LOOKBACK_DAYS) {
      if (!continuesStreak(dayStatus(plans, cursor))) break;
      streakLength += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const week: DayStatus[] = [];
  for (let i = 6; i >= 0; i--) {
    week.push(dayStatus(plans, addDays(today, -i)));
  }

  return { streakLength, week };
};
