import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
  PLAN_DATE_RE,
  getPlanTemplate,
  type UserPlanParams,
  type UserPlanStatus,
} from "@/app/constants/plans";
import { getJuzPageRange } from "@/app/lib/plans/resolve-units";

export type UserPlanListItem = {
  id: number;
  template_key: string;
  params: UserPlanParams;
  start_date: string;
  status: UserPlanStatus;
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

/** GET /api/plans — the caller's enrollments (all statuses). Protected. */
export async function GET(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const plans = await appPrisma.userPlan.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  return jsonResponse({ data: plans.map(serializePlan) });
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

  const params: UserPlanParams = body.params ?? {};
  if (params.endDate && !PLAN_DATE_RE.test(params.endDate)) {
    return jsonResponse({ code: 422, message: "Invalid params.endDate" });
  }
  if (template.missedDayPolicy === "calendar" && !params.endDate) {
    return jsonResponse({
      code: 422,
      message: "This template requires params.endDate",
    });
  }

  // Juz-range target (husun's hifz track): resolved to page numbers here so
  // UserPlanParams stays page-canonical (D3) — juz numbers are never stored.
  const { target_juz_start: juzStart, target_juz_end: juzEnd } = body;
  if (juzStart !== undefined || juzEnd !== undefined) {
    const isJuzNumber = (n: unknown): n is number =>
      typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 30;
    if (!isJuzNumber(juzStart) || !isJuzNumber(juzEnd) || juzStart > juzEnd) {
      return jsonResponse({ code: 422, message: "Invalid target juz range" });
    }
    const [startRange, endRange] = await Promise.all([
      getJuzPageRange(juzStart),
      getJuzPageRange(juzEnd),
    ]);
    if (!startRange || !endRange) {
      return jsonResponse({ code: 422, message: "Unknown juz" });
    }
    // Overwrites any client-sent targetStart/targetEnd.
    params.targetStart = startRange.startPage;
    params.targetEnd = endRange.endPage;
  }

  // Harden the rest of the client-supplied params — the enroll form is the
  // first real caller of these fields.
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
      return jsonResponse({ code: 422, message: `Invalid params.${key}` });
    }
  }
  if (
    params.targetStart !== undefined &&
    params.targetEnd !== undefined &&
    params.targetStart > params.targetEnd
  ) {
    return jsonResponse({
      code: 422,
      message: "params.targetStart must be <= params.targetEnd",
    });
  }
  if (params.quantities) {
    const invalid = Object.values(params.quantities).some(
      (v) => !Number.isInteger(v) || v < 1
    );
    if (invalid) {
      return jsonResponse({ code: 422, message: "Invalid params.quantities" });
    }
  }

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
