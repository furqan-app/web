import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  MUSHAF_FIRST_PAGE,
  MUSHAF_LAST_PAGE,
  PLAN_DATE_RE,
  getPlanTemplate,
} from "@/app/constants/plans";

/**
 * POST /api/plans/:planId/progress — manual check-off (D5) for one track on
 * one local date. Body: { track_key, date, range_start, range_end } with an
 * inclusive page range. One entry per (plan, track, day) — re-checking the
 * same day updates the range in place; history is otherwise append-only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const planId = Number(params.planId);
  if (!Number.isInteger(planId)) {
    return jsonResponse({ code: 422, message: "Invalid plan id" });
  }

  const body = await request.json().catch(() => null);
  const { track_key, date, range_start, range_end } = body ?? {};

  if (!track_key || !date || range_start === undefined || range_end === undefined) {
    return jsonResponse({ code: 422, message: "Missing required fields" });
  }
  if (!PLAN_DATE_RE.test(date)) {
    return jsonResponse({ code: 422, message: "Invalid date" });
  }

  const start = Number(range_start);
  const end = Number(range_end);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start > end ||
    start < MUSHAF_FIRST_PAGE ||
    end > MUSHAF_LAST_PAGE
  ) {
    return jsonResponse({ code: 422, message: "Invalid page range" });
  }

  const plan = await appPrisma.userPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    return jsonResponse({ code: 404, message: "Plan not found" });
  }
  if (plan.status !== "active") {
    return jsonResponse({ code: 422, message: "Plan is not active" });
  }

  const template = getPlanTemplate(plan.template_key);
  if (!template || !template.tracks.some((t) => t.key === track_key)) {
    return jsonResponse({ code: 422, message: "Unknown track for this plan" });
  }

  const entry = await appPrisma.planProgressEntry.upsert({
    where: {
      user_plan_id_track_key_date: {
        user_plan_id: planId,
        track_key,
        date: new Date(`${date}T00:00:00Z`),
      },
    },
    update: { range_start: String(start), range_end: String(end) },
    create: {
      user_plan_id: planId,
      track_key,
      date: new Date(`${date}T00:00:00Z`),
      range_start: String(start),
      range_end: String(end),
    },
  });

  return jsonResponse({
    data: {
      id: entry.id,
      track_key: entry.track_key,
      date,
      range_start: entry.range_start,
      range_end: entry.range_end,
    },
  });
}
