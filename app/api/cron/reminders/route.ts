import { randomUUID, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { getNotificationDeps } from "@/app/lib/notifications/deps";
import { dispatchNotification } from "@/app/lib/notifications/dispatch";
import { nextOccurrence } from "@/app/lib/notifications/reminders";

import {
  resolveGeneralWirdDispatch,
  resolveDedicatedWirdDispatch,
} from "@/app/lib/notifications/wird-reminder-resolver";

export const dynamic = "force-dynamic";

const BATCH_LIMIT = 50;

const isAuthorized = (request: NextRequest) => {
  const provided = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

/**
 * Machine-called, secret-guarded (not session-protected — see the
 * auth-middleware matcher's deliberate exclusion). Claims a batch of due
 * ScheduledNotification rows without MySQL UPDATE...RETURNING: findMany due
 * ids -> updateMany claim -> findMany claimed. Stale leases (>10min) are
 * re-claimable by the store's claimDueReminders.
 */
const handle = async (request: NextRequest) => {
  if (!isAuthorized(request)) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const deps = getNotificationDeps();
  const now = deps.clock();
  const claimId = randomUUID();

  // claimDueReminders only ever returns rows it just confirmed are due
  // (scheduled_for <= now) — no need to re-check that here.
  const claimed = await deps.store.claimDueReminders({ now, limit: BATCH_LIMIT, claimId });

  let dispatched = 0;
  let skipped = 0;
  let failed = 0;

  for (const reminder of claimed) {
    const locale = reminder.locale ?? "ar";

    // For plans.daily_reminder, resolve live assignments and check skip guard (D2, D3).
    let resolvedPayload: unknown = reminder.payload;
    if (reminder.type === "plans.daily_reminder") {
      try {
        const payload = reminder.payload as { planId?: number; time?: string } | null;
        let planId = payload?.planId;
        if (planId === undefined && reminder.dedupe_key) {
          const match = reminder.dedupe_key.match(/:plan:(\d+)$/);
          if (match) {
            planId = Number(match[1]);
          }
        }

        const resolution =
          planId !== undefined
            ? await resolveDedicatedWirdDispatch(
                reminder.user_id,
                planId,
                reminder.timezone ?? "UTC",
                now
              )
            : await resolveGeneralWirdDispatch(
                reminder.user_id,
                reminder.timezone ?? "UTC",
                now
              );
        if (!resolution.shouldSend) {
          deps.logger.info("notifications.cron.wird_reminder_skipped", {
            reminderId: reminder.id,
            userId: reminder.user_id,
            reason: resolution.reason,
          });
          skipped++;
          try {
            if (reminder.recurrence === "daily" || reminder.recurrence === "weekly") {
              const next = nextOccurrence(reminder.scheduled_for, reminder.recurrence, reminder.timezone, now);
              await deps.store.rescheduleReminder(reminder.id, next, null, reminder.updated_at);
            } else {
              await deps.store.completeReminder(reminder.id, now);
            }
          } catch (rescheduleError) {
            const message = rescheduleError instanceof Error ? rescheduleError.message : String(rescheduleError);
            deps.logger.error("notifications.cron.reschedule_failed", { reminderId: reminder.id, error: message });
          }
          continue;
        }
        resolvedPayload = resolution.payload;
      } catch (resolutionError) {
        const message = resolutionError instanceof Error ? resolutionError.message : String(resolutionError);
        deps.logger.error("notifications.cron.wird_resolver_failed", { reminderId: reminder.id, error: message });
        failed++;
        try {
          if (reminder.recurrence === "daily" || reminder.recurrence === "weekly") {
            const next = nextOccurrence(reminder.scheduled_for, reminder.recurrence, reminder.timezone, now);
            await deps.store.rescheduleReminder(reminder.id, next, message, reminder.updated_at);
          } else {
            await deps.store.failReminder(reminder.id, message);
          }
        } catch (rescheduleError) {
          const resErr = rescheduleError instanceof Error ? rescheduleError.message : String(rescheduleError);
          deps.logger.error("notifications.cron.reschedule_failed", { reminderId: reminder.id, error: resErr });
        }
        continue;
      }
    }

    let recipientEmail: string | null = null;
    try {
      const recipient = await deps.store.getRecipient(reminder.user_id);
      recipientEmail = recipient?.email ?? null;

      await dispatchNotification(
        {
          recipient: { userId: reminder.user_id, email: recipientEmail, locale },
          type: reminder.type,
          payload: resolvedPayload,
          channels: reminder.channels ?? undefined,
        },
        deps
      );
      dispatched++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.logger.error("notifications.cron.reminder_failed", { reminderId: reminder.id, error: message });
      await deps.store.failReminder(reminder.id, message);
      failed++;
      continue;
    }

    // The notification already went out — a failure past this point must
    // never re-label a delivered reminder as "failed" (that would be a lie).
    try {
      if (reminder.recurrence === "daily" || reminder.recurrence === "weekly") {
        const next = nextOccurrence(reminder.scheduled_for, reminder.recurrence, reminder.timezone, now);
        await deps.store.rescheduleReminder(reminder.id, next, null, reminder.updated_at);
      } else {
        await deps.store.completeReminder(reminder.id, now);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.logger.error("notifications.cron.reschedule_failed", { reminderId: reminder.id, error: message });
    }
  }

  return jsonResponse({ data: { claimed: claimed.length, dispatched, skipped, failed } });
};

export const POST = handle;
export const GET = handle;
