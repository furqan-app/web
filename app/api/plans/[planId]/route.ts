import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  USER_PLAN_STATUSES,
  getEnrollmentTemplate,
  type CustomWirdDefinition,
  type PlanUnit,
  type UserPlanParams,
  type UserPlanStatus,
} from "@/app/constants/plans";
import { resolvePlanParams } from "@/app/lib/plans/validate-params";
import { resolveCustomPlanEdit } from "@/app/lib/plans/validate-custom-definition";
import {
  cancelDedicatedWirdReminder,
  dedicatedRecurrenceForDefinition,
  setDedicatedWirdReminder,
} from "@/app/lib/notifications/wird-reminder";
import { getNotificationDeps } from "@/app/lib/notifications/deps";

const serializePlan = (plan: {
  id: number;
  name?: string | null;
  template_key: string;
  definition?: unknown;
  params: unknown;
  start_date: Date;
  status: string;
  _count?: {
    progress?: number;
  };
}) => ({
  id: plan.id,
  name: plan.name ?? null,
  template_key: plan.template_key,
  definition: (plan.definition as CustomWirdDefinition | null) ?? null,
  params: (plan.params ?? {}) as UserPlanParams,
  start_date: plan.start_date.toISOString().slice(0, 10),
  status: plan.status as UserPlanStatus,
  has_progress: (plan._count?.progress ?? 0) > 0,
});

async function cancelDedicatedIfLeavingActive(
  userId: number,
  planId: number,
  newStatus?: UserPlanStatus
): Promise<void> {
  if (newStatus !== undefined && newStatus !== "active") {
    try {
      const deps = getNotificationDeps();
      await cancelDedicatedWirdReminder(userId, planId, deps.store);
    } catch (err) {
      console.error(
        `Failed to cancel dedicated wird reminder for user ${userId}, plan ${planId}:`,
        err
      );
    }
  }
}

/**
 * After a cadence edit on an active custom wird, re-derive the bound
 * dedicated reminder from the updated plan when the derived
 * recurrence/weekday changed (e.g. Friday → Sunday, or weekly → pace):
 * re-`setDedicatedWirdReminder` with the new weekday reuses the same dedupe
 * key, so the row is replaced in place and no orphaned row remains
 * (ADR 0070, plan Case 4). No-op when no dedicated reminder exists, when the
 * plan isn't active, or when the derivation is unchanged. Never fails the
 * PATCH — a reminder miss is logged, not thrown.
 */
async function rederiveDedicatedIfCadenceChanged(
  userId: number,
  planId: number,
  oldDefinition: unknown,
  newDefinition: CustomWirdDefinition
): Promise<void> {
  try {
    const before = dedicatedRecurrenceForDefinition(oldDefinition);
    const after = dedicatedRecurrenceForDefinition(newDefinition);
    if (before.recurrence === after.recurrence && before.weekday === after.weekday) {
      return;
    }
    const deps = getNotificationDeps();
    const row = await deps.store.getScheduledReminderByDedupeKey(
      `plans.daily_reminder:${userId}:plan:${planId}`
    );
    if (!row || row.status !== "pending") return;
    const payload = row.payload as { time?: string } | null;
    await setDedicatedWirdReminder(
      {
        userId,
        planId,
        time: payload?.time ?? "20:00",
        timezone: row.timezone ?? "UTC",
        locale: row.locale ?? "ar",
        ...after,
      },
      deps.store,
      deps.clock
    );
  } catch (err) {
    console.error(
      `Failed to re-derive dedicated wird reminder for user ${userId}, plan ${planId}:`,
      err
    );
  }
}

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
  const hasCustomEdit =
    body?.name !== undefined ||
    body?.cadence !== undefined ||
    body?.range !== undefined;

  if (status === undefined && !hasParamsEdit && !hasCustomEdit) {
    return jsonResponse({ code: 422, message: "Nothing to update" });
  }
  if (status !== undefined && !USER_PLAN_STATUSES.includes(status)) {
    return jsonResponse({ code: 422, message: "Invalid status" });
  }

  const plan = await appPrisma.userPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    return jsonResponse({ code: 404, message: "Plan not found" });
  }

  if (plan.template_key === "custom") {
    if (hasParamsEdit) {
      return jsonResponse({
        code: 422,
        message: "Custom wirds edit cadence/range, not params",
      });
    }

    const progressCount = await appPrisma.planProgressEntry.count({
      where: { user_plan_id: planId },
    });
    const resolved = await resolveCustomPlanEdit(body ?? {}, plan, progressCount);
    if ("error" in resolved) {
      return jsonResponse({ code: 422, message: resolved.error });
    }

    const data: {
      status?: UserPlanStatus;
      name?: string | null;
      definition?: object;
      params?: object;
    } = {};
    if (resolved.status !== undefined) data.status = resolved.status;
    if (resolved.name !== undefined) data.name = resolved.name;
    if (resolved.definition !== undefined) data.definition = resolved.definition as object;
    if (resolved.params !== undefined) data.params = resolved.params as object;

    const updated = await appPrisma.userPlan.update({
      where: { id: planId },
      data,
      include: { _count: { select: { progress: true } } },
    });

    await cancelDedicatedIfLeavingActive(user.id, planId, data.status);

    if (resolved.definition !== undefined && updated.status === "active") {
      await rederiveDedicatedIfCadenceChanged(
        user.id,
        planId,
        plan.definition,
        resolved.definition
      );
    }

    return jsonResponse({
      data: serializePlan(updated),
    });
  }

  if (hasCustomEdit) {
    return jsonResponse({
      code: 422,
      message: "name/cadence/range apply only to custom wirds",
    });
  }

  const data: { status?: UserPlanStatus; params?: object } = {};
  if (status !== undefined) data.status = status;

  if (hasParamsEdit) {
    const template = getEnrollmentTemplate(plan);
    if (!template) {
      return jsonResponse({ code: 422, message: "Unknown template_key" });
    }
    const existingTrackUnits =
      (plan.params as { trackUnits?: Record<string, PlanUnit> } | null)?.trackUnits ?? {};
    const resolved = await resolvePlanParams(body ?? {}, template, existingTrackUnits);
    if ("error" in resolved) {
      return jsonResponse({ code: 422, message: resolved.error });
    }
    data.params = resolved.params as object;
  }

  const updated = await appPrisma.userPlan.update({
    where: { id: planId },
    data,
  });

  await cancelDedicatedIfLeavingActive(user.id, planId, data.status);

  return jsonResponse({
    data: {
      id: updated.id,
      status: updated.status,
      params: updated.params,
    },
  });
}
