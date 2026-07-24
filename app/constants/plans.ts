/**
 * Plan engine template definitions (ADR 0028).
 *
 * Templates are typed TS constants (like MARK_CATEGORIES) — never DB rows.
 * A track = unit + quantity + one scheduling rule kind + an activity.
 * Scheduling ("which range today?") is orthogonal to activity ("what you do
 * with it") — never encode modality into a rule kind.
 *
 * All ranges are page-canonical (mushaf pages 1–604), inclusive on both ends.
 */

export const MUSHAF_FIRST_PAGE = 1;
export const MUSHAF_LAST_PAGE = 604;

/** Validates "YYYY-MM-DD" date strings used across the plan APIs. */
export const PLAN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PLAN_ACTIVITIES = ["read", "listen", "memorize", "review"] as const;
export type PlanActivity = (typeof PLAN_ACTIVITIES)[number];

/** v1 is page-canonical; "verse" is the planned future widening (D3). */
export type PlanUnit = "page";

export type TrackRule =
  | {
      /** Cycle a fixed range at N units/day, wrap on completion (khatma). */
      kind: "fixed_cycle";
      rangeStart: number;
      rangeEnd: number;
      defaultUnitsPerDay: number;
    }
  | {
      /** Advance a cursor N units/day through a target range; stops at end. */
      kind: "cursor_advance";
      defaultUnitsPerDay: number;
    }
  | {
      /** Re-visit the last `windowSize` units completed by `sourceTrack`. */
      kind: "trailing_window";
      sourceTrack: string;
      windowSize: number;
    }
  | {
      /**
       * Cycle N units/day through everything `sourceTrack` has completed,
       * excluding its most recent `excludeTrailingWindow` units (those belong
       * to the near-review track).
       */
      kind: "completed_cycle";
      sourceTrack: string;
      defaultUnitsPerDay: number;
      excludeTrailingWindow: number;
    }
  | {
      /** Preview tomorrow's assignment of `sourceTrack`, × repetitions. */
      kind: "lookahead";
      sourceTrack: string;
      repetitions: number;
    };

export type PlanTrack = {
  key: string;
  activity: PlanActivity;
  unit: PlanUnit;
  rule: TrackRule;
};

/**
 * Missed-day policy (D4): "cursor" — the plan shifts forward, tomorrow resumes
 * where you stopped; "calendar" — a fixed end date, remaining quantity is
 * recomputed over remaining days (requires params.endDate).
 */
export type MissedDayPolicy = "cursor" | "calendar";

export type PlanTemplate = {
  key: string;
  tracks: PlanTrack[];
  missedDayPolicy: MissedDayPolicy;
};

/**
 * Per-enrollment configuration stored in UserPlan.params (JSON).
 * quantities override a track rule's defaultUnitsPerDay by track key.
 * targetStart/targetEnd bound cursor_advance tracks (e.g. "memorize Juz Amma").
 * endDate ("YYYY-MM-DD") is required by the "calendar" missed-day policy.
 */
export type UserPlanParams = {
  quantities?: Record<string, number>;
  startPage?: number;
  targetStart?: number;
  targetEnd?: number;
  endDate?: string;
};

export const USER_PLAN_STATUSES = [
  "active",
  "paused",
  "completed",
  "abandoned",
] as const;
export type UserPlanStatus = (typeof USER_PLAN_STATUSES)[number];

/**
 * The launch template: the original ask — read N pages/day through the whole
 * mushaf. الحصون الخمسة ships later as a 5-track template composing all five
 * rule kinds, once its per-level quantities are sourced (see the plan doc).
 */
export const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  "daily-wird": {
    key: "daily-wird",
    missedDayPolicy: "cursor",
    tracks: [
      {
        key: "reading",
        activity: "read",
        unit: "page",
        rule: {
          kind: "fixed_cycle",
          rangeStart: MUSHAF_FIRST_PAGE,
          rangeEnd: MUSHAF_LAST_PAGE,
          defaultUnitsPerDay: 5,
        },
      },
    ],
  },
};

export const getPlanTemplate = (key: string): PlanTemplate | null =>
  PLAN_TEMPLATES[key] ?? null;
