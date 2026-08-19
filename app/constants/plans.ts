/**
 * Plan engine template definitions (ADR 0030).
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

/**
 * "page" (v1) or "verse" (ADR 0038). Unit is an enrollment-time choice, not a
 * template-fixed property — the same template supports either per enrollment.
 * Fixed for the life of an enrollment; never migrated or switched mid-plan.
 */
export type PlanUnit = "page" | "verse";

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
 * A quantity override, per track. A plain number means "N units/day" in the
 * enrollment's unit (pages/day for a page-unit enrollment, verses/day for a
 * verse-unit one). The `{unit:"pages"}` form is only valid on a verse-unit
 * enrollment: a fractional/whole page pace (e.g. 0.5), resolved fresh every
 * day from the verse count of whatever page that day's cursor starts on
 * (ADR 0038) — never locked at enroll time.
 */
export type PlanQuantity = number | { unit: "pages"; amount: number };

/**
 * Per-enrollment configuration stored in UserPlan.params (JSON).
 * quantities override a track rule's defaultUnitsPerDay (or, for `tahdeer`'s
 * repetitions / `qareeb`'s windowSize, the rule's fixed constant) by track key.
 * targetStart/targetEnd bound cursor_advance tracks (e.g. "memorize Juz Amma"),
 * in that track's own unit (pages or verse ordinals).
 * endDate ("YYYY-MM-DD") is required by the "calendar" missed-day policy.
 * trackUnits (ADR 0038, widened): unit is chosen **per independent track**
 * (a `fixed_cycle`/`cursor_advance` track), not enrollment-wide — keyed by
 * track key, e.g. `{ tilawa: "page", hifz: "verse" }`. A dependent track
 * (`trailing_window`/`completed_cycle`/`lookahead`) never gets its own entry:
 * its range math slices its `sourceTrack`'s own logged numbers directly, so
 * it always inherits that source track's resolved unit (see
 * `resolveTrackUnit`). A track absent from `trackUnits` defaults to "page".
 * Fixed for the life of the enrollment; never migrated or switched mid-plan.
 */
export type UserPlanParams = {
  quantities?: Record<string, PlanQuantity>;
  startPage?: number;
  targetStart?: number;
  targetEnd?: number;
  endDate?: string;
  trackUnits?: Record<string, PlanUnit>;
};

/**
 * Average verses/page across the whole mushaf (6236 verses / 604 pages),
 * used only to derive husun's verse-equivalent rule defaults below — same
 * "documented best-effort, editable per-enrollment" framing as the original
 * page defaults (no authoritative source for either).
 */
const AVG_VERSES_PER_PAGE = 6236 / 604;
export const toVerseEquivalent = (pages: number) => Math.round(pages * AVG_VERSES_PER_PAGE);

export const USER_PLAN_STATUSES = [
  "active",
  "paused",
  "completed",
  "abandoned",
] as const;
export type UserPlanStatus = (typeof USER_PLAN_STATUSES)[number];

/**
 * The launch template: the original ask — read N pages/day through the whole
 * mushaf.
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
  /** Same shape as daily-wird, for a listening khatma instead of reading. */
  "listening-wird": {
    key: "listening-wird",
    missedDayPolicy: "cursor",
    tracks: [
      {
        key: "listening",
        activity: "listen",
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
  /**
   * الحصون الخمسة (Dr. Saeed Hamza) — the forcing case for all five rule
   * kinds (see docs/plans/daily-awrad-ui.md and ADR 0030). Quantities are a
   * documented best-effort default, not a verbatim source — all overridable
   * per-enrollment via params.quantities.
   */
  husun: {
    key: "husun",
    missedDayPolicy: "cursor",
    tracks: [
      {
        key: "tilawa",
        activity: "read",
        unit: "page",
        rule: {
          kind: "fixed_cycle",
          rangeStart: MUSHAF_FIRST_PAGE,
          rangeEnd: MUSHAF_LAST_PAGE,
          defaultUnitsPerDay: 20,
        },
      },
      {
        key: "hifz",
        activity: "memorize",
        unit: "page",
        rule: {
          kind: "cursor_advance",
          defaultUnitsPerDay: 1,
        },
      },
      {
        key: "tahdeer",
        activity: "listen",
        unit: "page",
        rule: {
          kind: "lookahead",
          sourceTrack: "hifz",
          repetitions: 10,
        },
      },
      {
        key: "qareeb",
        activity: "review",
        unit: "page",
        rule: {
          kind: "trailing_window",
          sourceTrack: "hifz",
          windowSize: 20,
        },
      },
      {
        key: "baeed",
        activity: "review",
        unit: "page",
        rule: {
          kind: "completed_cycle",
          sourceTrack: "hifz",
          defaultUnitsPerDay: 1,
          excludeTrailingWindow: 20,
        },
      },
    ],
  },
};

export const getPlanTemplate = (key: string): PlanTemplate | null =>
  PLAN_TEMPLATES[key] ?? null;

/**
 * The unit an independent (`fixed_cycle`/`cursor_advance`) track's own range
 * math runs in — chosen per-enrollment via `params.trackUnits`, "page" if
 * absent. Only source-free tracks can be looked up this way.
 */
export const independentTrackUnit = (
  params: UserPlanParams,
  trackKey: string
): PlanUnit => params.trackUnits?.[trackKey] ?? "page";

/**
 * The unit `trackKey`'s range math actually runs in. Independent tracks
 * (`fixed_cycle`/`cursor_advance`) resolve from `params.trackUnits`; a
 * dependent track (`trailing_window`/`completed_cycle`/`lookahead`) always
 * inherits its `sourceTrack`'s resolved unit — it slices that track's own
 * logged numbers directly, so it can never disagree with them (ADR 0038).
 * Falls back to "page" for an unknown track key.
 */
export const resolveTrackUnit = (
  template: PlanTemplate,
  params: UserPlanParams,
  trackKey: string
): PlanUnit => {
  const track = template.tracks.find((t) => t.key === trackKey);
  if (!track) return "page";
  if (track.rule.kind === "fixed_cycle" || track.rule.kind === "cursor_advance") {
    return independentTrackUnit(params, trackKey);
  }
  return resolveTrackUnit(template, params, track.rule.sourceTrack);
};

/** Every track in `template` whose unit is independently choosable. */
export const independentTrackKeys = (template: PlanTemplate): string[] =>
  template.tracks
    .filter((t) => t.rule.kind === "fixed_cycle" || t.rule.kind === "cursor_advance")
    .map((t) => t.key);
