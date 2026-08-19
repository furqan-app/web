import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  PLAN_DATE_RE,
  getPlanTemplate,
  independentTrackUnit,
  type UserPlanParams,
  type UserPlanStatus,
} from "@/app/constants/plans";
import { resolvePlanParams } from "@/app/lib/plans/validate-params";
import { getPageJuzNumber } from "@/app/lib/plans/resolve-units";
import { pageOfVerse } from "@/app/lib/plans/verse-index";

export type UserPlanListItem = {
  id: number;
  template_key: string;
  params: UserPlanParams;
  start_date: string;
  status: UserPlanStatus;
  /**
   * Derived-on-read juz numbers for params.targetStart/targetEnd, for
   * prefilling the params-edit UI — juz is never stored (D3), only computed
   * on demand from the page-canonical value.
   */
  target_juz_start?: number;
  target_juz_end?: number;
};

const toDateString = (d: Date) => d.toISOString().slice(0, 10);

const serializePlan = (plan: {
  id: number;
  template_key: string;
  params: unknown;
  start_date: Date;
  status: string;
}): UserPlanListItem => ({
  id: plan.id,
  template_key: plan.template_key,
  params: (plan.params ?? {}) as UserPlanParams,
  start_date: toDateString(plan.start_date),
  status: plan.status as UserPlanStatus,
});

const withTargetJuz = async (item: UserPlanListItem): Promise<UserPlanListItem> => {
  const { targetStart, targetEnd } = item.params;
  if (targetStart === undefined || targetEnd === undefined) return item;
  // targetStart/targetEnd are verse ordinals when the cursor_advance track
  // they belong to is verse-unit (ADR 0038, per-track) — convert to the page
  // they fall on before the page-based juz lookup, same as resolvePlanParams
  // does in reverse at enroll/edit time.
  const template = getPlanTemplate(item.template_key);
  const cursorAdvanceTrackKey = template?.tracks.find((t) => t.rule.kind === "cursor_advance")?.key;
  const isVerseUnit =
    cursorAdvanceTrackKey !== undefined &&
    independentTrackUnit(item.params, cursorAdvanceTrackKey) === "verse";
  const startPage = isVerseUnit ? pageOfVerse(targetStart) : targetStart;
  const endPage = isVerseUnit ? pageOfVerse(targetEnd) : targetEnd;
  const [juzStart, juzEnd] = await Promise.all([
    getPageJuzNumber(startPage),
    getPageJuzNumber(endPage),
  ]);
  if (juzStart === null || juzEnd === null) return item;
  return { ...item, target_juz_start: juzStart, target_juz_end: juzEnd };
};

/** GET /api/plans — the caller's enrollments (all statuses). Protected. */
export async function GET(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const plans = await appPrisma.userPlan.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  const data = await Promise.all(plans.map(serializePlan).map(withTargetJuz));
  return jsonResponse({ data });
}

/**
 * POST /api/plans — enroll in a template. Multiple concurrent active
 * enrollments are allowed (D6). Body: { template_key, params?, start_date? }.
 */
export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const body = await request.json().catch(() => null);
  if (!body?.template_key) {
    return jsonResponse({ code: 422, message: "Missing template_key" });
  }

  const template = getPlanTemplate(body.template_key);
  if (!template) {
    return jsonResponse({ code: 422, message: "Unknown template_key" });
  }

  if (body.start_date && !PLAN_DATE_RE.test(body.start_date)) {
    return jsonResponse({ code: 422, message: "Invalid start_date" });
  }

  const bodyParams: UserPlanParams = body.params ?? {};
  if (bodyParams.endDate && !PLAN_DATE_RE.test(bodyParams.endDate)) {
    return jsonResponse({ code: 422, message: "Invalid params.endDate" });
  }
  if (template.missedDayPolicy === "calendar" && !bodyParams.endDate) {
    return jsonResponse({
      code: 422,
      message: "This template requires params.endDate",
    });
  }

  const resolved = await resolvePlanParams(body, template);
  if ("error" in resolved) {
    return jsonResponse({ code: 422, message: resolved.error });
  }
  const params = resolved.params;

  const startDate = body.start_date ?? toDateString(new Date());

  const plan = await appPrisma.userPlan.create({
    data: {
      user_id: user.id,
      template_key: template.key,
      params: params as object,
      start_date: new Date(`${startDate}T00:00:00Z`),
    },
  });

  return jsonResponse({ data: serializePlan(plan) });
}
