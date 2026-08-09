/**
 * Plan assignment engine (ADR 0030, widened by ADR 0038).
 *
 * Pure functions — no DB, no clock. The daily assignment is derived from
 * (template, enrollment params, progress log, date) and is never stored.
 *
 * Ranges are inclusive and expressed in the enrollment's own unit
 * (`params.unit`, defaulting to `"page"` for pre-widening enrollments):
 * mushaf page numbers for a page-unit enrollment, global verse ordinals
 * (1–6236, see verse-index.ts) for a verse-unit one. The unit is fixed for an
 * enrollment's lifetime and applies to every track in it — never mixed within
 * one enrollment, never inferred from a stored number's magnitude.
 *
 * Dates are "YYYY-MM-DD" strings in the user's local timezone — the client
 * supplies "today" (local-midnight day boundary, see the plan doc).
 */

import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
  toVerseEquivalent,
  type PlanTemplate,
  type PlanTrack,
  type PlanUnit,
  type TrackRule,
  type UserPlanParams,
} from "@/app/constants/plans";
import { addDays } from "@/app/lib/plans/dates";
import {
  MUSHAF_FIRST_VERSE,
  MUSHAF_LAST_VERSE,
  pageOfVerse,
  pageFirstVerseOrdinal,
  pageLastVerseOrdinal,
  pageVerseCount,
} from "@/app/lib/plans/verse-index";

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
  unit: PlanUnit;
  rangeStart: number;
  rangeEnd: number;
  /** Only set for lookahead tracks (e.g. تحضير repetition count). */
  repetitions?: number;
  /** True when a progress entry exists for this track on the given date. */
  completed: boolean;
  /**
   * Preview of this track's assignment the day after `date`, only computed
   * for completed rows (Companion Redesign's "next assignment" preview) —
   * absent when the track has nothing left (e.g. an exhausted cursor_advance)
   * or hasn't started yet. Presentation-only, never writable.
   */
  next?: { rangeStart: number; rangeEnd: number; repetitions?: number };
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
 * fixed_cycle's range, in the enrollment's unit. The template always declares
 * this range in pages (e.g. the whole mushaf, 1–604); for a verse-unit
 * enrollment it's converted to the verse ordinals spanning those same pages —
 * so a "whole mushaf" page range naturally becomes 1–6236.
 */
const fixedCycleBounds = (
  rule: Extract<TrackRule, { kind: "fixed_cycle" }>,
  unit: PlanUnit
): { start: number; end: number } =>
  unit === "page"
    ? { start: rule.rangeStart, end: rule.rangeEnd }
    : {
        start: pageFirstVerseOrdinal(rule.rangeStart),
        end: pageLastVerseOrdinal(rule.rangeEnd),
      };

/**
 * Units/day for a self-advancing track: enrollment override, else the rule's
 * (page-canonical) default converted to the enrollment's unit; under the
 * "calendar" missed-day policy (D4) with an endDate, the remaining quantity is
 * spread over the remaining days instead. `cursorStart` is where today's
 * range would begin, in the enrollment's unit — needed only to resolve a
 * `{unit:"pages"}` fractional override (verse-unit tracks only, ADR 0038):
 * "half a page" always means half of *that page's* actual verse count,
 * resolved fresh every call, never locked in at enroll time.
 */
const unitsPerDay = (
  template: PlanTemplate,
  track: PlanTrack,
  params: UserPlanParams,
  unit: PlanUnit,
  date: string,
  remainingUnits: number,
  defaultUnitsPerDayPages: number,
  cursorStart: number
) => {
  const override = params.quantities?.[track.key];
  const resolveBase = (): number => {
    if (override === undefined) {
      return unit === "page" ? defaultUnitsPerDayPages : toVerseEquivalent(defaultUnitsPerDayPages);
    }
    if (typeof override === "number") return override;
    // {unit:"pages"} is only meaningful on a verse-unit track — validated at
    // input time, but guarded here too since resolveBase() has no other way
    // to know a page-unit call is misusing it (interpreting a page-unit
    // cursor as a verse ordinal would silently return a wrong-but-plausible
    // number instead of failing loud). Recompute from whichever page today's
    // cursor starts on.
    if (unit !== "verse") return defaultUnitsPerDayPages;
    const page = pageOfVerse(cursorStart);
    return Math.round(override.amount * pageVerseCount(page));
  };
  const base = clampQuantity(resolveBase());
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
  unit: PlanUnit,
  repetitions?: number
): TrackAssignment => ({
  trackKey: track.key,
  activity: track.activity,
  unit,
  rangeStart,
  rangeEnd,
  ...(repetitions !== undefined ? { repetitions } : {}),
  completed: state.todayEntry !== null,
});

const cursorAdvanceTarget = (params: UserPlanParams, unit: PlanUnit) => ({
  targetStart:
    params.targetStart ?? (unit === "page" ? MUSHAF_FIRST_PAGE : MUSHAF_FIRST_VERSE),
  targetEnd: params.targetEnd ?? (unit === "page" ? MUSHAF_LAST_PAGE : MUSHAF_LAST_VERSE),
});

/**
 * If this track already has an entry logged for the queried date, the
 * assignment must echo that entry's own range verbatim — never recompute a
 * cursor/window position, which would silently advance past what was
 * actually logged while `completed` (date-based) stays true. Applies to
 * every rule kind alike. Guards non-numeric range fields the same way
 * trackState does for lastEnd/minStart.
 */
const todayEntryAssignment = (
  track: PlanTrack,
  state: TrackState,
  unit: PlanUnit
): TrackAssignment | null => {
  if (!state.todayEntry) return null;
  const start = Number(state.todayEntry.range_start);
  const end = Number(state.todayEntry.range_end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const repetitions = track.rule.kind === "lookahead" ? track.rule.repetitions : undefined;
  return assignRange(track, start, end, state, unit, repetitions);
};

/** Assignment for one self-advancing (source-free) track, or null when done. */
const deriveSourceFreeTrack = (
  template: PlanTemplate,
  track: PlanTrack,
  params: UserPlanParams,
  state: TrackState,
  unit: PlanUnit,
  date: string
): TrackAssignment | null => {
  const already = todayEntryAssignment(track, state, unit);
  if (already) return already;

  const rule = track.rule;

  if (rule.kind === "fixed_cycle") {
    const { start: boundStart, end: boundEnd } = fixedCycleBounds(rule, unit);
    let start =
      state.lastEnd !== null
        ? state.lastEnd + 1
        : Math.min(Math.max(params.startPage ?? boundStart, boundStart), boundEnd);
    if (start > boundEnd) start = boundStart; // wrap: next khatma
    const units = unitsPerDay(
      template,
      track,
      params,
      unit,
      date,
      boundEnd - start + 1,
      rule.defaultUnitsPerDay,
      start
    );
    return assignRange(track, start, Math.min(start + units - 1, boundEnd), state, unit);
  }

  if (rule.kind === "cursor_advance") {
    const { targetStart, targetEnd } = cursorAdvanceTarget(params, unit);
    const start =
      state.lastEnd !== null
        ? state.lastEnd + 1
        : Math.min(Math.max(params.startPage ?? targetStart, targetStart), targetEnd);
    if (start > targetEnd) return null; // target fully memorized
    const units = unitsPerDay(
      template,
      track,
      params,
      unit,
      date,
      targetEnd - start + 1,
      rule.defaultUnitsPerDay,
      start
    );
    return assignRange(track, start, Math.min(start + units - 1, targetEnd), state, unit);
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
  // Enrollment-wide (ADR 0038) — every track in one enrollment shares the
  // same unit; never mixed, never inferred from stored data.
  const unit: PlanUnit = params.unit ?? "page";

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
        deriveSourceFreeTrack(template, track, params, states.get(track.key)!, unit, date)
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

    const already = todayEntryAssignment(track, state, unit);
    if (already) {
      assignments.push(already);
      continue;
    }

    const source = states.get(rule.sourceTrack);
    if (!source) continue;

    // Review rules need source *history*; lookahead (below) does not — on day
    // one it derives tomorrow's portion from the source's own assignment.
    const hasHistory = source.lastEnd !== null && source.minStart !== null;

    if (rule.kind === "trailing_window") {
      if (!hasHistory) continue;
      const windowSize = unit === "page" ? rule.windowSize : toVerseEquivalent(rule.windowSize);
      const start = Math.max(source.minStart!, source.lastEnd! - windowSize + 1);
      assignments.push(assignRange(track, start, source.lastEnd!, state, unit));
      continue;
    }

    if (rule.kind === "completed_cycle") {
      if (!hasHistory) continue;
      const excludeTrailingWindow =
        unit === "page" ? rule.excludeTrailingWindow : toVerseEquivalent(rule.excludeTrailingWindow);
      const regionStart = source.minStart!;
      const regionEnd = source.lastEnd! - excludeTrailingWindow;
      if (regionEnd < regionStart) continue;
      let start = state.lastEnd !== null ? state.lastEnd + 1 : regionStart;
      if (start > regionEnd) start = regionStart; // wrap within reviewed region
      const units = unitsPerDay(
        template,
        track,
        params,
        unit,
        date,
        regionEnd - start + 1,
        rule.defaultUnitsPerDay,
        start
      );
      assignments.push(
        assignRange(track, start, Math.min(start + units - 1, regionEnd), state, unit)
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
        ? fixedCycleBounds(sourceTrack.rule, unit).end
        : cursorAdvanceTarget(params, unit).targetEnd;
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
        unit,
        rule.repetitions
      )
    );
  }

  return assignments;
};

/**
 * Attaches a `next` preview (the day-after-`date` assignment) to every
 * completed row in `assignments`, by calling deriveAssignments once more for
 * `date + 1` against the same (unchanged) entries — no new entries, no
 * persistence, same derive-at-read-time model as everything else here.
 * Rows that aren't completed, or whose track has nothing for `date + 1`
 * (exhausted cursor_advance, or a review track still without history),
 * are left untouched.
 */
export const withNextPreview = (
  template: PlanTemplate,
  params: UserPlanParams,
  entries: ProgressLogEntry[],
  date: string,
  assignments: TrackAssignment[]
): TrackAssignment[] => {
  if (!assignments.some((a) => a.completed)) return assignments;

  const tomorrow = deriveAssignments(template, params, entries, addDays(date, 1));
  const tomorrowByTrack = new Map(tomorrow.map((a) => [a.trackKey, a]));

  return assignments.map((a) => {
    if (!a.completed) return a;
    const next = tomorrowByTrack.get(a.trackKey);
    if (!next) return a;
    return {
      ...a,
      next: {
        rangeStart: next.rangeStart,
        rangeEnd: next.rangeEnd,
        ...(next.repetitions !== undefined ? { repetitions: next.repetitions } : {}),
      },
    };
  });
};
