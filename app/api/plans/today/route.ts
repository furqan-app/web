import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  PLAN_DATE_RE,
  getPlanTemplate,
  type UserPlanParams,
} from "@/app/constants/plans";
import {
  deriveAssignments,
  type ProgressLogEntry,
  type TrackAssignment,
} from "@/app/lib/plans/engine";

export type TodayPlanAssignments = {
  planId: number;
  templateKey: string;
  assignments: TrackAssignment[];
};

/**
 * GET /api/plans/today?date=YYYY-MM-DD — derived assignments for every active
 * enrollment on the given local date (client supplies its local-midnight day,
 * ADR 0028). Nothing is stored — pure derivation from the progress log.
 */
export async function GET(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !PLAN_DATE_RE.test(date)) {
    return jsonResponse({ code: 422, message: "Missing or invalid date" });
  }

  const plans = await appPrisma.userPlan.findMany({
    where: { user_id: user.id, status: "active" },
    include: { progress: true },
    orderBy: { created_at: "asc" },
  });

  const data: TodayPlanAssignments[] = [];

  for (const plan of plans) {
    const template = getPlanTemplate(plan.template_key);
    // An enrollment referencing a template this build no longer ships is
    // skipped, not an error — templates are code (ADR 0028).
    if (!template) continue;

    const entries: ProgressLogEntry[] = plan.progress.map((entry) => ({
      track_key: entry.track_key,
      date: entry.date.toISOString().slice(0, 10),
      range_start: entry.range_start,
      range_end: entry.range_end,
    }));

    data.push({
      planId: plan.id,
      templateKey: plan.template_key,
      assignments: deriveAssignments(
        template,
        (plan.params ?? {}) as UserPlanParams,
        entries,
        date
      ),
    });
  }

  return jsonResponse({ data });
}
