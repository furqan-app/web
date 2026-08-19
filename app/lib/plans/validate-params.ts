/**
 * Shared juz-range resolution + params hardening for POST /api/plans and
 * PATCH /api/plans/:planId (Companion Redesign, docs/plans/daily-awrad-ui.md;
 * widened for per-track verse units by ADR 0038).
 * Juz numbers are UI/enroll-time only — resolved to pages (then, for a
 * verse-unit track, to verse ordinals) here so UserPlanParams never stores a
 * juz number directly (D3).
 */

import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
  independentTrackKeys,
  independentTrackUnit,
  type PlanTemplate,
  type PlanQuantity,
  type PlanUnit,
  type UserPlanParams,
} from "@/app/constants/plans";
import { getJuzPageRange } from "@/app/lib/plans/resolve-units";
import {
  MUSHAF_FIRST_VERSE,
  MUSHAF_LAST_VERSE,
  pageFirstVerseOrdinal,
  pageLastVerseOrdinal,
} from "@/app/lib/plans/verse-index";

export type ResolvePlanParamsResult =
  | { params: UserPlanParams }
  | { error: string };

/**
 * Tracks whose `params.quantities` override may take the `{unit:"pages"}`
 * fractional form (a live-recomputed daily pace) rather than a plain
 * integer — reserved for the three pace tracks; `tahdeer`'s repetitions and
 * `qareeb`'s windowSize are plain-integer-only even when their inherited
 * unit is "verse" (ADR 0038 widening — see the plan doc's "Fraction
 * support" decision).
 */
const FRACTIONAL_QUANTITY_TRACKS = new Set(["reading", "listening", "tilawa", "hifz", "baeed"]);

/**
 * A quantities-bearing track's own resolved unit — an independent track
 * reads `params.trackUnits` directly; a dependent track (e.g. baeed)
 * inherits its sourceTrack's. Mirrors `resolveTrackUnit` in
 * constants/plans.ts without importing engine.ts (this module stays
 * engine-agnostic).
 */
const resolveQuantityTrackUnit = (
  template: PlanTemplate,
  params: UserPlanParams,
  trackKey: string
): PlanUnit => {
  const track = template.tracks.find((t) => t.key === trackKey);
  if (!track) return "page";
  if (track.rule.kind === "fixed_cycle" || track.rule.kind === "cursor_advance") {
    return independentTrackUnit(params, trackKey);
  }
  return resolveQuantityTrackUnit(template, params, track.rule.sourceTrack);
};

/**
 * Resolves `body.target_juz_start`/`body.target_juz_end` (if present) into
 * `params.targetStart`/`targetEnd` (overwriting any client-supplied value),
 * then hardens the rest of the client-supplied params. `body.params` is the
 * base — callers pass `{}` for a bare status-only PATCH. `template` is
 * needed to know which track keys are independently unit-choosable
 * (`params.trackUnits`) and which single track (if any) is the
 * `cursor_advance` target the juz range resolves onto.
 *
 * `existingTrackUnits` (PATCH only) is the enrollment's current per-track
 * units — a track's unit is fixed for its lifetime (ADR 0038), so an edit
 * that tries to change any independent track's unit is rejected. The edit
 * form always resends the current `params.trackUnits` verbatim, same as it
 * does for `quantities`.
 */
export const resolvePlanParams = async (
  body: {
    params?: UserPlanParams;
    target_juz_start?: unknown;
    target_juz_end?: unknown;
  },
  template: PlanTemplate,
  existingTrackUnits?: Record<string, PlanUnit>
): Promise<ResolvePlanParamsResult> => {
  const params: UserPlanParams = { ...(body.params ?? {}) };
  const independentKeys = independentTrackKeys(template);

  if (params.trackUnits !== undefined) {
    if (typeof params.trackUnits !== "object" || params.trackUnits === null) {
      return { error: "Invalid params.trackUnits" };
    }
    for (const [key, value] of Object.entries(params.trackUnits)) {
      if (!independentKeys.includes(key)) {
        return { error: `Invalid params.trackUnits: "${key}" has no independent unit` };
      }
      if (value !== "page" && value !== "verse") {
        return { error: `Invalid params.trackUnits.${key}` };
      }
    }
  }
  if (existingTrackUnits) {
    for (const key of independentKeys) {
      const existing = existingTrackUnits[key] ?? "page";
      const next = independentTrackUnit(params, key);
      if (next !== existing) {
        return { error: `params.trackUnits.${key} cannot change after enrollment` };
      }
    }
  }

  // Only one track per template is ever cursor_advance (hifz, for husun) —
  // the juz picker always targets it.
  const cursorAdvanceTrackKey = template.tracks.find((t) => t.rule.kind === "cursor_advance")?.key;
  const { target_juz_start: juzStart, target_juz_end: juzEnd } = body;
  if (juzStart !== undefined || juzEnd !== undefined) {
    if (!cursorAdvanceTrackKey) {
      return { error: "This template has no cursor_advance track" };
    }
    const isJuzNumber = (n: unknown): n is number =>
      typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 30;
    if (!isJuzNumber(juzStart) || !isJuzNumber(juzEnd) || juzStart > juzEnd) {
      return { error: "Invalid target juz range" };
    }
    const [startRange, endRange] = await Promise.all([
      getJuzPageRange(juzStart),
      getJuzPageRange(juzEnd),
    ]);
    if (!startRange || !endRange) {
      return { error: "Unknown juz" };
    }
    const targetUnit = independentTrackUnit(params, cursorAdvanceTrackKey);
    params.targetStart =
      targetUnit === "page" ? startRange.startPage : pageFirstVerseOrdinal(startRange.startPage);
    params.targetEnd =
      targetUnit === "page" ? endRange.endPage : pageLastVerseOrdinal(endRange.endPage);
  }

  const rangeFor = (unit: PlanUnit) => ({
    min: unit === "page" ? MUSHAF_FIRST_PAGE : MUSHAF_FIRST_VERSE,
    max: unit === "page" ? MUSHAF_LAST_PAGE : MUSHAF_LAST_VERSE,
  });
  const isInRange = (n: unknown, unit: PlanUnit): n is number => {
    if (typeof n !== "number" || !Number.isInteger(n)) return false;
    const { min, max } = rangeFor(unit);
    return n >= min && n <= max;
  };

  // startPage always seeds a fixed_cycle track — resolvePlanParams has no
  // way to know which one when a template has more than one, but every
  // current template has at most one, so the first independent track's unit
  // is the right scale to validate against.
  const primaryUnit = independentTrackUnit(params, independentKeys[0] ?? "");
  if (params.startPage !== undefined && !isInRange(params.startPage, primaryUnit)) {
    return { error: "Invalid params.startPage" };
  }
  const targetUnit = cursorAdvanceTrackKey
    ? independentTrackUnit(params, cursorAdvanceTrackKey)
    : primaryUnit;
  for (const [key, value] of [
    ["targetStart", params.targetStart],
    ["targetEnd", params.targetEnd],
  ] as const) {
    if (value !== undefined && !isInRange(value, targetUnit)) {
      return { error: `Invalid params.${key}` };
    }
  }
  if (
    params.targetStart !== undefined &&
    params.targetEnd !== undefined &&
    params.targetStart > params.targetEnd
  ) {
    return { error: "params.targetStart must be <= params.targetEnd" };
  }

  if (params.quantities) {
    const isValidQuantity = (trackKey: string, value: PlanQuantity): boolean => {
      if (typeof value === "number") return Number.isInteger(value) && value >= 1;
      // {unit:"pages", amount} — only meaningful on a fractional-eligible
      // track whose resolved unit is "verse" (page-unit tracks are already
      // whole-page precision, ADR 0038).
      if (!FRACTIONAL_QUANTITY_TRACKS.has(trackKey)) return false;
      const trackUnit = resolveQuantityTrackUnit(template, params, trackKey);
      return (
        trackUnit === "verse" &&
        typeof value === "object" &&
        value !== null &&
        value.unit === "pages" &&
        typeof value.amount === "number" &&
        Number.isFinite(value.amount) &&
        value.amount > 0
      );
    };
    for (const [trackKey, value] of Object.entries(params.quantities)) {
      if (!isValidQuantity(trackKey, value)) {
        return { error: `Invalid params.quantities.${trackKey}` };
      }
    }
  }

  return { params };
};
