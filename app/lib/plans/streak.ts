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
import {
  PLAN_ACTIVITIES,
  type PlanActivity,
  type PlanTemplate,
  type UserPlanParams,
} from "@/app/constants/plans";

export type StreakPlanInput = {
  startDate: string; // "YYYY-MM-DD"
  template: PlanTemplate;
  params: UserPlanParams;
  entries: ProgressLogEntry[];
};

export type ActivityStreakResult = {
  streakLength: number;
  /** Whether the user completed an assignment for this activity on client 'today'. */
  completedToday: boolean;
  /** Earliest start date across active plans containing this activity ("YYYY-MM-DD" | null). */
  startDate: string | null;
  /** Total active days for this activity in the last 365 days. */
  activeDaysCount: number;
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

/**
 * Derives per-activity streaks grouped by PlanActivity ("read" | "listen" | "memorize" | "review").
 *
 * Rule (D3): A day counts toward an activity's streak when at least one assignment
 * belonging to that activity was completed on that local date.
 */
export const deriveActivityStreaks = (
  plans: StreakPlanInput[],
  today: string
): Record<PlanActivity, ActivityStreakResult> => {
  const result: Record<PlanActivity, ActivityStreakResult> = {
    read: { streakLength: 0, completedToday: false, startDate: null, activeDaysCount: 0 },
    listen: { streakLength: 0, completedToday: false, startDate: null, activeDaysCount: 0 },
    memorize: { streakLength: 0, completedToday: false, startDate: null, activeDaysCount: 0 },
    review: { streakLength: 0, completedToday: false, startDate: null, activeDaysCount: 0 },
  };

  const minDay365 = addDays(today, -364);

  for (const act of PLAN_ACTIVITIES) {
    const activityPlans = plans
      .map((plan) => ({
        plan,
        trackKeys: new Set(
          plan.template.tracks.filter((t) => t.activity === act).map((t) => t.key)
        ),
      }))
      .filter((item) => item.trackKeys.size > 0);

    if (activityPlans.length === 0) continue;

    const earliestStart = activityPlans.reduce<string | null>(
      (min, item) => (min === null || item.plan.startDate < min ? item.plan.startDate : min),
      null
    );

    if (!earliestStart) continue;

    const activityDayStatus = (date: string): DayStatus => {
      let anyAssignment = false;
      for (const { plan, trackKeys } of activityPlans) {
        if (date < plan.startDate) continue;
        const entriesUpToDate = plan.entries.filter((e) => e.date <= date);
        const assignments = deriveAssignments(plan.template, plan.params, entriesUpToDate, date);
        const actAssignments = assignments.filter((a) => trackKeys.has(a.trackKey));
        if (actAssignments.length > 0) {
          anyAssignment = true;
          if (!actAssignments.every((a) => a.completed)) return "missed";
        }
      }
      return anyAssignment ? "done" : "none";
    };

    const todayStatus = activityDayStatus(today);
    const completedToday = todayStatus === "done";

    // Compute active days in the rolling 365-day window
    const activeDates = new Set<string>();
    for (const { plan, trackKeys } of activityPlans) {
      for (const e of plan.entries) {
        if (
          trackKeys.has(e.track_key) &&
          e.date >= plan.startDate &&
          e.date >= minDay365 &&
          e.date <= today
        ) {
          activeDates.add(e.date);
        }
      }
    }

    let streakLength = 0;
    if (activeDates.size > 0) {
      let count = 0;
      let hasDone = false;
      let cursor = continuesStreak(todayStatus) ? today : addDays(today, -1);
      while (cursor >= earliestStart && count < MAX_LOOKBACK_DAYS) {
        const status = activityDayStatus(cursor);
        if (!continuesStreak(status)) break;
        if (status === "done") hasDone = true;
        count += 1;
        cursor = addDays(cursor, -1);
      }
      if (hasDone) {
        streakLength = count;
      }
    }

    result[act] = {
      streakLength,
      completedToday,
      startDate: earliestStart,
      activeDaysCount: activeDates.size,
    };
  }

  return result;
};

