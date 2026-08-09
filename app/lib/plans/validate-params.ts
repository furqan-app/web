/**
 * Shared juz-range resolution + params hardening for POST /api/plans and
 * PATCH /api/plans/:planId (Companion Redesign, docs/plans/daily-awrad-ui.md;
 * widened for per-enrollment verse units by ADR 0037).
 * Juz numbers are UI/enroll-time only — resolved to pages (then, for a
 * verse-unit enrollment, to verse ordinals) here so UserPlanParams never
 * stores a juz number directly (D3).
 */

import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
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
 * Resolves `body.target_juz_start`/`target_juz_end` (if present) into
 * `params.targetStart`/`targetEnd` (overwriting any client-supplied value),
 * then hardens the rest of the client-supplied params. `body.params` is the
 * base — callers pass `{}` for a bare status-only PATCH.
 *
 * `existingUnit` (PATCH only) is the enrollment's current unit — a track's
 * unit is fixed for its lifetime (ADR 0037), so an edit that tries to change
 * it is rejected. The edit form always resends the current `params.unit`
 * verbatim, same as it does for `quantities`.
 */
export const resolvePlanParams = async (
  body: {
    params?: UserPlanParams;
    target_juz_start?: unknown;
    target_juz_end?: unknown;
  },
  existingUnit?: PlanUnit
): Promise<ResolvePlanParamsResult> => {
  const params: UserPlanParams = { ...(body.params ?? {}) };

  if (params.unit !== undefined && params.unit !== "page" && params.unit !== "verse") {
    return { error: "Invalid params.unit" };
  }
  const unit: PlanUnit = params.unit ?? "page";
  if (existingUnit !== undefined && unit !== existingUnit) {
    return { error: "params.unit cannot change after enrollment" };
  }

  const { target_juz_start: juzStart, target_juz_end: juzEnd } = body;
  if (juzStart !== undefined || juzEnd !== undefined) {
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
    params.targetStart =
      unit === "page" ? startRange.startPage : pageFirstVerseOrdinal(startRange.startPage);
    params.targetEnd =
      unit === "page" ? endRange.endPage : pageLastVerseOrdinal(endRange.endPage);
  }

  const rangeMin = unit === "page" ? MUSHAF_FIRST_PAGE : MUSHAF_FIRST_VERSE;
  const rangeMax = unit === "page" ? MUSHAF_LAST_PAGE : MUSHAF_LAST_VERSE;
  const isInRange = (n: unknown): n is number =>
    typeof n === "number" && Number.isInteger(n) && n >= rangeMin && n <= rangeMax;

  for (const [key, value] of [
    ["startPage", params.startPage],
    ["targetStart", params.targetStart],
    ["targetEnd", params.targetEnd],
  ] as const) {
    if (value !== undefined && !isInRange(value)) {
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
    for (const value of Object.values(params.quantities)) {
      if (typeof value === "number") {
        if (!Number.isInteger(value) || value < 1) {
          return { error: "Invalid params.quantities" };
        }
        continue;
      }
      // {unit:"pages", amount} — only meaningful on a verse-unit enrollment
      // (page-unit tracks are already whole-page precision, ADR 0037).
      if (
        unit !== "verse" ||
        typeof value !== "object" ||
        value === null ||
        value.unit !== "pages" ||
        typeof value.amount !== "number" ||
        !Number.isFinite(value.amount) ||
        value.amount <= 0
      ) {
        return { error: "Invalid params.quantities" };
      }
    }
  }

  return { params };
};
