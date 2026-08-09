import { randomUUID, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { getNotificationDeps } from "@/app/lib/notifications/deps";
import { dispatchNotification } from "@/app/lib/notifications/dispatch";
import { nextOccurrence } from "@/app/lib/notifications/reminders";

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
  let failed = 0;

  for (const reminder of claimed) {
    // No per-user locale column exists yet (deferred, see plan) — default
    // "ar" per the app's i18n decision. Email is looked up so the email
    // channel has something to send to; cron requests have no session.
    let recipientEmail: string | null = null;
    try {
      const recipient = await deps.store.getRecipient(reminder.user_id);
      recipientEmail = recipient?.email ?? null;

      await dispatchNotification(
        {
          recipient: { userId: reminder.user_id, email: recipientEmail, locale: "ar" },
          type: reminder.type,
          payload: reminder.payload,
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
      if (reminder.recurrence === "daily") {
        const next = nextOccurrence(reminder.scheduled_for, reminder.recurrence, reminder.timezone, now);
        await deps.store.rescheduleReminder(reminder.id, next);
      } else {
        await deps.store.completeReminder(reminder.id, now);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.logger.error("notifications.cron.reschedule_failed", { reminderId: reminder.id, error: message });
    }
  }

  return jsonResponse({ data: { claimed: claimed.length, dispatched, failed } });
};

export const POST = handle;
export const GET = handle;
