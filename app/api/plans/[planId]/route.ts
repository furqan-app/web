import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { USER_PLAN_STATUSES, type UserPlanStatus } from "@/app/constants/plans";

/**
 * PATCH /api/plans/:planId — change enrollment status (pause/resume/complete/
 * abandon). Ownership is re-verified server-side; the id in the URL is not a
 * capability. Body: { status }.
 */
export async function PATCH(
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
  const status = body?.status as UserPlanStatus | undefined;
  if (!status || !USER_PLAN_STATUSES.includes(status)) {
    return jsonResponse({ code: 422, message: "Invalid status" });
  }

  const plan = await appPrisma.userPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    return jsonResponse({ code: 404, message: "Plan not found" });
  }

  const updated = await appPrisma.userPlan.update({
    where: { id: planId },
    data: { status },
  });

  return jsonResponse({ data: { id: updated.id, status: updated.status } });
}
