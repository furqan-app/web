import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { USER_PLAN_STATUSES, type UserPlanStatus } from "@/app/constants/plans";
import { resolvePlanParams } from "@/app/lib/plans/validate-params";

/**
 * PATCH /api/plans/:planId — change enrollment status (pause/resume/complete/
 * abandon) and/or edit an active plan's params (quantities / husun's target
 * juz range, Companion Redesign). Ownership is re-verified server-side; the
 * id in the URL is not a capability. Body: { status? } and/or
 * { params?, target_juz_start?, target_juz_end? } — at least one required.
 * Params editing is a full replace, not a merge, and never touches past
 * PlanProgressEntry rows (history reads the log verbatim, ADR 0030).
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
  const hasParamsEdit =
    body?.params !== undefined ||
    body?.target_juz_start !== undefined ||
    body?.target_juz_end !== undefined;

  if (status === undefined && !hasParamsEdit) {
    return jsonResponse({ code: 422, message: "Nothing to update" });
  }
  if (status !== undefined && !USER_PLAN_STATUSES.includes(status)) {
    return jsonResponse({ code: 422, message: "Invalid status" });
  }

  const plan = await appPrisma.userPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    return jsonResponse({ code: 404, message: "Plan not found" });
  }

  const data: { status?: UserPlanStatus; params?: object } = {};
  if (status !== undefined) data.status = status;

  if (hasParamsEdit) {
    const resolved = await resolvePlanParams(body ?? {});
    if ("error" in resolved) {
      return jsonResponse({ code: 422, message: resolved.error });
    }
    data.params = resolved.params as object;
  }

  const updated = await appPrisma.userPlan.update({
    where: { id: planId },
    data,
  });

  return jsonResponse({
    data: {
      id: updated.id,
      status: updated.status,
      params: updated.params,
    },
  });
}
