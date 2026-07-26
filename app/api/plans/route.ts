import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  PLAN_DATE_RE,
  getPlanTemplate,
  type UserPlanParams,
  type UserPlanStatus,
} from "@/app/constants/plans";

export type UserPlanListItem = {
  id: number;
  template_key: string;
  params: UserPlanParams;
  start_date: string;
  status: UserPlanStatus;
};

export const toDateString = (d: Date) => d.toISOString().slice(0, 10);

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
