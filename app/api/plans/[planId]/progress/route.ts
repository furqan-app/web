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

export type PlanProgressHistoryEntry = {
  id: number;
  track_key: string;
  /** "YYYY-MM-DD" */
  date: string;
  range_start: string;
  range_end: string;
};

const PLAN_HISTORY_LIMIT = 50;

/**
 * GET /api/plans/:planId/progress — the plan's progress log, most recent
 * first, capped at 50 entries. Read-only view of what was actually done —
 * never recomputed with current template params (ADR 0030).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const planId = Number(params.planId);
  if (!Number.isInteger(planId)) {
    return jsonResponse({ code: 422, message: "Invalid plan id" });
  }

  const plan = await appPrisma.userPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    return jsonResponse({ code: 404, message: "Plan not found" });
  }

  const entries = await appPrisma.planProgressEntry.findMany({
    where: { user_plan_id: planId },
    orderBy: { date: "desc" },
    take: PLAN_HISTORY_LIMIT,
  });

  const data: PlanProgressHistoryEntry[] = entries.map((entry) => ({
    id: entry.id,
    track_key: entry.track_key,
    date: entry.date.toISOString().slice(0, 10),
    range_start: entry.range_start,
    range_end: entry.range_end,
  }));

  return jsonResponse({ data });
}

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

/**
 * DELETE /api/plans/:planId/progress — undo a check-off (Companion Redesign):
 * removes the one upserted entry for { track_key, date }. Same ownership/
 * active-plan/known-track checks as POST; no server-side "must be today"
 * restriction — POST already trusts the client-supplied date, and the UI is
 * what scopes this to today's own row (past-day history has no undo control).
 */
export async function DELETE(
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
  const { track_key, date } = body ?? {};

  if (!track_key || !date) {
    return jsonResponse({ code: 422, message: "Missing required fields" });
  }
  if (!PLAN_DATE_RE.test(date)) {
    return jsonResponse({ code: 422, message: "Invalid date" });
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

  await appPrisma.planProgressEntry.deleteMany({
    where: {
      user_plan_id: planId,
      track_key,
      date: new Date(`${date}T00:00:00Z`),
    },
  });

  return jsonResponse({ data: { track_key, date } });
}
