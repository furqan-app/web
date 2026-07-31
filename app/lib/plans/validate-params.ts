/**
 * Shared juz-range resolution + params hardening for POST /api/plans and
 * PATCH /api/plans/:planId (Companion Redesign, docs/plans/daily-awrad-ui.md).
 * Juz numbers are UI/enroll-time only — resolved to page numbers here so
 * UserPlanParams stays page-canonical (D3) and is never stored as juz.
 */

import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
  type UserPlanParams,
} from "@/app/constants/plans";
import { getJuzPageRange } from "@/app/lib/plans/resolve-units";

export type ResolvePlanParamsResult =
  | { params: UserPlanParams }
  | { error: string };

/**
 * Resolves `body.target_juz_start`/`target_juz_end` (if present) into
 * `params.targetStart`/`targetEnd` (overwriting any client-supplied page
 * values), then hardens the rest of the client-supplied params. `body.params`
 * is the base — callers pass `{}` for a bare status-only PATCH.
 */
export const resolvePlanParams = async (body: {
  params?: UserPlanParams;
  target_juz_start?: unknown;
  target_juz_end?: unknown;
}): Promise<ResolvePlanParamsResult> => {
  const params: UserPlanParams = { ...(body.params ?? {}) };

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
    params.targetStart = startRange.startPage;
    params.targetEnd = endRange.endPage;
  }

  const isPageNumber = (n: unknown): n is number =>
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= MUSHAF_FIRST_PAGE &&
    n <= MUSHAF_LAST_PAGE;

  for (const [key, value] of [
    ["startPage", params.startPage],
    ["targetStart", params.targetStart],
    ["targetEnd", params.targetEnd],
  ] as const) {
    if (value !== undefined && !isPageNumber(value)) {
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
    const invalid = Object.values(params.quantities).some(
      (v) => !Number.isInteger(v) || v < 1
    );
    if (invalid) {
      return { error: "Invalid params.quantities" };
    }
  }

  return { params };
};
