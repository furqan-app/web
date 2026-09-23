import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  getEnrollmentTemplate,
  type UserPlanParams,
} from "@/app/constants/plans";
import { isValidCalendarDate } from "@/app/lib/plans/dates";
import {
  deriveAwradDashboard,
  type DashboardInputPlan,
  type AwradDashboardData,
} from "@/app/lib/plans/dashboard";

const toDateString = (d: Date) => d.toISOString().slice(0, 10);

/**
 * GET /api/plans/dashboard?date=YYYY-MM-DD — full progress dashboard payload
 * (per-activity streaks, cumulative totals, and 365-day calendar heatmap buckets).
 * Pure derivation from the progress log (ADR 0030).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !isValidCalendarDate(date)) {
    return jsonResponse({ code: 422, message: "Missing or invalid date" });
  }

  const plans = await appPrisma.userPlan.findMany({
    where: { user_id: user.id },
    include: { progress: true },
    orderBy: { start_date: "asc" },
  });

  const dashboardInputs: DashboardInputPlan[] = [];
  for (const plan of plans) {
    const template = getEnrollmentTemplate(plan);
    if (!template) continue;

    dashboardInputs.push({
      id: plan.id,
      startDate: toDateString(plan.start_date),
      status: plan.status as DashboardInputPlan["status"],
      template,
      params: (plan.params ?? {}) as UserPlanParams,
      entries: plan.progress.map((entry) => ({
        track_key: entry.track_key,
        date: toDateString(entry.date),
        unit: entry.unit ?? "page",
        range_start: entry.range_start,
        range_end: entry.range_end,
      })),
    });
  }

  const data: AwradDashboardData = deriveAwradDashboard(dashboardInputs, date);
  return jsonResponse({ data });
}
