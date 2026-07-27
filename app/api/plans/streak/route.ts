import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { PLAN_DATE_RE, getPlanTemplate, type UserPlanParams } from "@/app/constants/plans";
import { deriveStreak, type StreakPlanInput, type StreakResult } from "@/app/lib/plans/streak";
import type { ProgressLogEntry } from "@/app/lib/plans/engine";

const toDateString = (d: Date) => d.toISOString().slice(0, 10);

/**
 * GET /api/plans/streak?date=YYYY-MM-DD — the caller's current streak and a
 * rolling 7-day week strip ending on `date`, derived from every active
 * enrollment's own template+params+progress log. Nothing is stored — see
 * docs/plans/daily-awrad-ui.md's Companion Redesign section.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !PLAN_DATE_RE.test(date)) {
    return jsonResponse({ code: 422, message: "Missing or invalid date" });
  }

  const plans = await appPrisma.userPlan.findMany({
    where: { user_id: user.id, status: "active" },
    include: { progress: true },
  });

  const inputs: StreakPlanInput[] = [];
  for (const plan of plans) {
    const template = getPlanTemplate(plan.template_key);
    if (!template) continue;

    const entries: ProgressLogEntry[] = plan.progress.map((entry) => ({
      track_key: entry.track_key,
      date: toDateString(entry.date),
      range_start: entry.range_start,
      range_end: entry.range_end,
    }));

    inputs.push({
      startDate: toDateString(plan.start_date),
      template,
      params: (plan.params ?? {}) as UserPlanParams,
      entries,
    });
  }

  const data: StreakResult = deriveStreak(inputs, date);
  return jsonResponse({ data });
}
