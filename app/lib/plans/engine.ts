/**
 * Plan assignment engine (ADR 0028).
 *
 * Pure functions — no DB, no clock. The daily assignment is derived from
 * (template, enrollment params, progress log, date) and is never stored.
 * All ranges are inclusive mushaf page ranges (page-canonical, D3).
 *
 * Dates are "YYYY-MM-DD" strings in the user's local timezone — the client
 * supplies "today" (local-midnight day boundary, see the plan doc).
 */

import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
  type PlanTemplate,
  type PlanTrack,
  type UserPlanParams,
} from "@/app/constants/plans";

export type ProgressLogEntry = {
  track_key: string;
  /** "YYYY-MM-DD" */
  date: string;
  range_start: string;
  range_end: string;
};

export type TrackAssignment = {
  trackKey: string;
  activity: PlanTrack["activity"];
  unit: PlanTrack["unit"];
  rangeStart: number;
  rangeEnd: number;
  /** Only set for lookahead tracks (e.g. تحضير repetition count). */
  repetitions?: number;
  /** True when a progress entry exists for this track on the given date. */
  completed: boolean;
};

const dayCountInclusive = (from: string, to: string) => {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.floor(ms / 86_400_000) + 1;
};

const clampQuantity = (n: number) => Math.max(1, Math.floor(n));

type TrackState = {
  /**
   * range_end of the latest-dated entry, or null if never logged. Cursors
   * resume from here — the *latest* position, not the highest ever reached, so
   * a track that has wrapped to a new khatma keeps advancing (dates are unique
   * per track and "YYYY-MM-DD" sorts lexicographically).
   */
  lastEnd: number | null;
  /** Lowest page this track has ever started from, or null. */
  minStart: number | null;
  /** The entry logged on the requested date, if any. */
  todayEntry: ProgressLogEntry | null;
};

const trackState = (
  entries: ProgressLogEntry[],
  trackKey: string,
  date: string
): TrackState => {
  let lastEnd: number | null = null;
  let lastDate: string | null = null;
  let minStart: number | null = null;
  let todayEntry: ProgressLogEntry | null = null;
  for (const entry of entries) {
    if (entry.track_key !== trackKey) continue;
    const start = Number(entry.range_start);
    const end = Number(entry.range_end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (lastDate === null || entry.date > lastDate) {
      lastDate = entry.date;
      lastEnd = end;
    }
    if (minStart === null || start < minStart) minStart = start;
    if (entry.date === date) todayEntry = entry;
  }
  return { lastEnd, minStart, todayEntry };
};

/**
 * Units/day for a self-advancing track: enrollment override, else the rule's
 * default; under the "calendar" missed-day policy (D4) with an endDate, the
 * remaining quantity is spread over the remaining days instead.
 */
const unitsPerDay = (
  template: PlanTemplate,
  track: PlanTrack,
  params: UserPlanParams,
  date: string,
  remainingUnits: number,
  defaultUnits: number
) => {
  const override = params.quantities?.[track.key];
  const base = clampQuantity(override ?? defaultUnits);
  if (template.missedDayPolicy !== "calendar" || !params.endDate) return base;
  // A malformed endDate would make dayCountInclusive NaN and poison the range;
  // treat it as "no calendar spreading" and fall back to the base quantity.
  if (Number.isNaN(Date.parse(`${params.endDate}T00:00:00Z`))) return base;
  const remainingDays = dayCountInclusive(date, params.endDate);
  if (remainingDays <= 0) return remainingUnits; // past the end date: finish today
  return clampQuantity(Math.ceil(remainingUnits / remainingDays));
};

const assignRange = (
  track: PlanTrack,
  rangeStart: number,
  rangeEnd: number,
  state: TrackState,
  repetitions?: number
): TrackAssignment => ({
  trackKey: track.key,
  activity: track.activity,
  unit: track.unit,
  rangeStart,
  rangeEnd,
  ...(repetitions !== undefined ? { repetitions } : {}),
  completed: state.todayEntry !== null,
});

const cursorAdvanceTarget = (params: UserPlanParams) => ({
  targetStart: params.targetStart ?? MUSHAF_FIRST_PAGE,
  targetEnd: params.targetEnd ?? MUSHAF_LAST_PAGE,
});

/** Assignment for one self-advancing (source-free) track, or null when done. */
const deriveSourceFreeTrack = (
  template: PlanTemplate,
  track: PlanTrack,
  params: UserPlanParams,
  state: TrackState,
  date: string
): TrackAssignment | null => {
  const rule = track.rule;

  if (rule.kind === "fixed_cycle") {
    let start =
      state.lastEnd !== null
        ? state.lastEnd + 1
        : Math.min(
            Math.max(params.startPage ?? rule.rangeStart, rule.rangeStart),
            rule.rangeEnd
          );
    if (start > rule.rangeEnd) start = rule.rangeStart; // wrap: next khatma
    const units = unitsPerDay(
      template,
      track,
      params,
      date,
      rule.rangeEnd - start + 1,
      rule.defaultUnitsPerDay
    );
    return assignRange(
      track,
      start,
      Math.min(start + units - 1, rule.rangeEnd),
      state
    );
  }

  if (rule.kind === "cursor_advance") {
    const { targetStart, targetEnd } = cursorAdvanceTarget(params);
    const start =
      state.lastEnd !== null
        ? state.lastEnd + 1
        : Math.min(Math.max(params.startPage ?? targetStart, targetStart), targetEnd);
    if (start > targetEnd) return null; // target fully memorized
    const units = unitsPerDay(
      template,
      track,
      params,
      date,
      targetEnd - start + 1,
      rule.defaultUnitsPerDay
    );
    return assignRange(track, start, Math.min(start + units - 1, targetEnd), state);
  }

  return null;
};

/**
 * Derive the full set of track assignments for one enrollment on one date.
 * Tracks whose rule has nothing to work on yet (e.g. review tracks before any
 * memorization is logged, or a completed cursor_advance) are omitted.
 */
export const deriveAssignments = (
  template: PlanTemplate,
  params: UserPlanParams,
  entries: ProgressLogEntry[],
  date: string
): TrackAssignment[] => {
  const states = new Map<string, TrackState>();
  const sourceFree = new Map<string, TrackAssignment | null>();

  for (const track of template.tracks) {
    states.set(track.key, trackState(entries, track.key, date));
  }
  // Pass 1: source-free tracks (rule kinds with a sourceTrack may only
  // reference these, so two passes fully resolve the dependency graph).
  for (const track of template.tracks) {
    if (track.rule.kind === "fixed_cycle" || track.rule.kind === "cursor_advance") {
      sourceFree.set(
        track.key,
        deriveSourceFreeTrack(template, track, params, states.get(track.key)!, date)
      );
    }
  }

  const assignments: TrackAssignment[] = [];

  for (const track of template.tracks) {
    const state = states.get(track.key)!;
    const rule = track.rule;

    if (rule.kind === "fixed_cycle" || rule.kind === "cursor_advance") {
      const assignment = sourceFree.get(track.key);
      if (assignment) assignments.push(assignment);
      continue;
    }

    const source = states.get(rule.sourceTrack);
    if (!source) continue;

    // Review rules need source *history*; lookahead (below) does not — on day
    // one it derives tomorrow's portion from the source's own assignment.
    const hasHistory = source.lastEnd !== null && source.minStart !== null;

    if (rule.kind === "trailing_window") {
      if (!hasHistory) continue;
      const start = Math.max(source.minStart!, source.lastEnd! - rule.windowSize + 1);
      assignments.push(assignRange(track, start, source.lastEnd!, state));
      continue;
    }

    if (rule.kind === "completed_cycle") {
      if (!hasHistory) continue;
      const regionStart = source.minStart!;
      const regionEnd = source.lastEnd! - rule.excludeTrailingWindow;
      if (regionEnd < regionStart) continue;
      let start = state.lastEnd !== null ? state.lastEnd + 1 : regionStart;
      if (start > regionEnd) start = regionStart; // wrap within reviewed region
      const units = unitsPerDay(
        template,
        track,
        params,
        date,
        regionEnd - start + 1,
        rule.defaultUnitsPerDay
      );
      assignments.push(
        assignRange(track, start, Math.min(start + units - 1, regionEnd), state)
      );
      continue;
    }

    // lookahead: tomorrow's portion of the source track. If the source was
    // already checked off today, tomorrow starts after the logged range;
    // otherwise after the source's derived assignment for today.
    const sourceAssignment = sourceFree.get(rule.sourceTrack);
    const sourceTodayEnd = source.todayEntry
      ? Number(source.todayEntry.range_end)
      : sourceAssignment?.rangeEnd;
    if (sourceTodayEnd === undefined) continue;

    const sourceTrack = template.tracks.find((t) => t.key === rule.sourceTrack);
    if (!sourceTrack) continue;
    const bound =
      sourceTrack.rule.kind === "fixed_cycle"
        ? sourceTrack.rule.rangeEnd
        : cursorAdvanceTarget(params).targetEnd;
    const sourceUnits =
      sourceAssignment !== null && sourceAssignment !== undefined
        ? sourceAssignment.rangeEnd - sourceAssignment.rangeStart + 1
        : 1;
    const start = sourceTodayEnd + 1;
    if (start > bound) continue; // nothing left to prepare
    assignments.push(
      assignRange(
        track,
        start,
        Math.min(start + sourceUnits - 1, bound),
        state,
        rule.repetitions
      )
    );
  }

  return assignments;
};
