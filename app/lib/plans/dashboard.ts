/**
 * Awrad Progress Dashboard Derivation Layer (Issue #599, ADR 0030).
 *
 * Pure functions — no DB, no clock. Recomputes per-activity streaks,
 * cumulative totals with unit reconciliation, and 365-day heatmap buckets
 * from the progress log at read time.
 */

import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
  resolveTrackUnit,
  type PlanActivity,
  type PlanTemplate,
  type PlanUnit,
  type UserPlanParams,
} from "@/app/constants/plans";
import { addDays } from "@/app/lib/plans/dates";
import type { ProgressLogEntry } from "@/app/lib/plans/engine";
import {
  deriveStreak,
  deriveActivityStreaks,
  type StreakPlanInput,
  type StreakResult,
  type ActivityStreakResult,
} from "@/app/lib/plans/streak";
import {
  MUSHAF_FIRST_VERSE,
  MUSHAF_LAST_VERSE,
  pageFirstVerseOrdinal,
  pageLastVerseOrdinal,
  pageOfVerse,
  pageVerseCount,
} from "@/app/lib/plans/verse-index";

export type DashboardInputPlan = {
  id: number;
  startDate: string; // "YYYY-MM-DD"
  status: "active" | "paused" | "completed" | "abandoned";
  template: PlanTemplate;
  params: UserPlanParams;
  entries: (ProgressLogEntry & { unit?: string })[];
};

export type ActivityTotals = {
  pages: number;
  verses: number;
  /** Complete mushaf passes (pages / 604) for reading tracks. */
  khatmat?: number;
};

export type DashboardHeatmapDay = {
  date: string; // "YYYY-MM-DD"
  count: number; // total completed assignments on this day
  activities: PlanActivity[]; // distinct activities completed on this day
  intensity: 0 | 1 | 2 | 3 | 4; // 0 = none, 1 = 1 task, 2 = 2 tasks, 3 = 3 tasks, 4 = 4+ tasks
};

export type DashboardHeatmapData = {
  startDate: string; // 364 days before today ("YYYY-MM-DD")
  endDate: string; // client "today" ("YYYY-MM-DD")
  days: DashboardHeatmapDay[];
  totalActiveDays: number;
};

export type AwradDashboardData = {
  streaks: {
    global: StreakResult;
    byActivity: Record<PlanActivity, ActivityStreakResult>;
  };
  totals: Record<PlanActivity, ActivityTotals>;
  heatmap: DashboardHeatmapData;
};

/**
 * Derives cumulative totals per activity across ALL plans (active, paused, completed, abandoned),
 * reconciling page-unit and verse-unit tracks using static verse indexing.
 */
export const deriveActivityTotals = (
  plans: DashboardInputPlan[]
): Record<PlanActivity, ActivityTotals> => {
  const accumulatedPages: Record<PlanActivity, number> = {
    read: 0,
    listen: 0,
    memorize: 0,
    review: 0,
  };
  const accumulatedVerses: Record<PlanActivity, number> = {
    read: 0,
    listen: 0,
    memorize: 0,
    review: 0,
  };

  for (const plan of plans) {
    const trackMap = new Map(plan.template.tracks.map((t) => [t.key, t]));

    for (const entry of plan.entries) {
      const track = trackMap.get(entry.track_key);
      if (!track) continue;

      const act = track.activity;
      const start = Number(entry.range_start);
      const end = Number(entry.range_end);
      if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) continue;

      const effectiveUnit =
        (entry.unit as PlanUnit | undefined) ??
        resolveTrackUnit(plan.template, plan.params, entry.track_key);

      if (effectiveUnit === "page") {
        if (start < MUSHAF_FIRST_PAGE || end > MUSHAF_LAST_PAGE) {
          console.warn(
            `[dashboard] Skipping out-of-range page entry: start=${start}, end=${end}, planId=${plan.id}, track=${entry.track_key}`
          );
          continue;
        }
        const pages = end - start + 1;
        accumulatedPages[act] += pages;

        // Exact verse count contained in these pages
        try {
          const vStart = pageFirstVerseOrdinal(start);
          const vEnd = pageLastVerseOrdinal(end);
          const verses = vEnd - vStart + 1;
          accumulatedVerses[act] += verses;
        } catch (err) {
          console.warn(
            `[dashboard] Error computing verses for page entry: start=${start}, end=${end}, planId=${plan.id}`,
            err
          );
        }
      } else {
        // Verse unit
        if (start < MUSHAF_FIRST_VERSE || end > MUSHAF_LAST_VERSE) {
          console.warn(
            `[dashboard] Skipping out-of-range verse entry: start=${start}, end=${end}, planId=${plan.id}, track=${entry.track_key}`
          );
          continue;
        }
        const verses = end - start + 1;
        accumulatedVerses[act] += verses;

        // Reconcile exact fractional page equivalent
        try {
          let fracPages = 0;
          for (let v = start; v <= end; v++) {
            const p = pageOfVerse(v);
            const countOnPage = pageVerseCount(p);
            fracPages += 1 / countOnPage;
          }
          accumulatedPages[act] += fracPages;
        } catch (err) {
          console.warn(
            `[dashboard] Error computing fractional pages for verse entry: start=${start}, end=${end}, planId=${plan.id}`,
            err
          );
        }
      }
    }
  }

  const totals: Record<PlanActivity, ActivityTotals> = {
    read: {
      pages: Math.round(accumulatedPages.read),
      verses: accumulatedVerses.read,
      khatmat: Math.floor(Math.round(accumulatedPages.read) / 604),
    },
    listen: {
      pages: Math.round(accumulatedPages.listen),
      verses: accumulatedVerses.listen,
    },
    memorize: {
      pages: Math.round(accumulatedPages.memorize),
      verses: accumulatedVerses.memorize,
    },
    review: {
      pages: Math.round(accumulatedPages.review),
      verses: accumulatedVerses.review,
    },
  };

  return totals;
};

/**
 * Derives a 365-day rolling heatmap matrix ending at `today`.
 */
export const deriveHeatmapBuckets = (
  plans: DashboardInputPlan[],
  today: string
): DashboardHeatmapData => {
  const TOTAL_DAYS = 365;
  const startDate = addDays(today, -(TOTAL_DAYS - 1));

  // Date -> { count: number, activities: Set<PlanActivity> }
  const dateMap = new Map<string, { count: number; activities: Set<PlanActivity> }>();

  for (const plan of plans) {
    const trackMap = new Map(plan.template.tracks.map((t) => [t.key, t]));

    for (const entry of plan.entries) {
      if (entry.date < startDate || entry.date > today) continue;

      const track = trackMap.get(entry.track_key);
      if (!track) continue;

      let bucket = dateMap.get(entry.date);
      if (!bucket) {
        bucket = { count: 0, activities: new Set<PlanActivity>() };
        dateMap.set(entry.date, bucket);
      }

      bucket.count += 1;
      bucket.activities.add(track.activity);
    }
  }

  const days: DashboardHeatmapDay[] = [];
  let totalActiveDays = 0;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = addDays(startDate, i);
    const bucket = dateMap.get(date);
    const count = bucket?.count ?? 0;
    const activities = bucket ? Array.from(bucket.activities) : [];

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (count === 1) intensity = 1;
    else if (count === 2) intensity = 2;
    else if (count === 3) intensity = 3;
    else if (count >= 4) intensity = 4;

    if (count > 0) totalActiveDays += 1;

    days.push({
      date,
      count,
      activities,
      intensity,
    });
  }

  return {
    startDate,
    endDate: today,
    days,
    totalActiveDays,
  };
};

/**
 * Pure root function deriving the complete Awrad Dashboard payload.
 */
export const deriveAwradDashboard = (
  plans: DashboardInputPlan[],
  today: string
): AwradDashboardData => {
  // Streaks derive across ACTIVE plans only (ADR 0030)
  const activeStreakInputs: StreakPlanInput[] = plans
    .filter((p) => p.status === "active")
    .map((p) => ({
      startDate: p.startDate,
      template: p.template,
      params: p.params,
      entries: p.entries,
    }));

  const global = deriveStreak(activeStreakInputs, today);
  const byActivity = deriveActivityStreaks(activeStreakInputs, today);

  // Totals & Heatmap aggregate across ALL plans (active, paused, completed, abandoned)
  const totals = deriveActivityTotals(plans);
  const heatmap = deriveHeatmapBuckets(plans, today);

  return {
    streaks: {
      global,
      byActivity,
    },
    totals,
    heatmap,
  };
};
