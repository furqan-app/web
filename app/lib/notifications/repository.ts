import type { AppPrismaClient } from "@/app/utils/db";
import type { FqLogger } from "@/lib/fq-logger";
import type { NotificationChannelKey } from "@/app/constants/notifications";
import type {
  CreateNotificationInput,
  DeliveryResult,
  NotificationStore,
  ScheduledReminderRow,
} from "@/app/lib/notifications/types";

const STALE_LEASE_MS = 10 * 60 * 1000;

const toReminderRow = (row: {
  id: number;
  user_id: number;
  type: string;
  payload: unknown;
  channels: unknown;
  scheduled_for: Date;
  recurrence: string | null;
  timezone: string | null;
  locale?: string | null;
  status: string;
  dedupe_key?: string | null;
  updated_at?: Date;
}): ScheduledReminderRow => ({
  ...row,
  channels: (row.channels as NotificationChannelKey[] | null) ?? null,
  locale: row.locale ?? null,
  status: row.status,
  dedupe_key: row.dedupe_key ?? null,
  updated_at: row.updated_at,
});

/** Only module importing `appPrisma` for notifications — the rest of the notification lib depends on the narrow `NotificationStore` interface, not Prisma. */
export const createNotificationStore = (prisma: AppPrismaClient, logger: FqLogger): NotificationStore => ({
  createNotification: async ({ userId, type, payload, channels }: CreateNotificationInput) => {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        payload: payload as object,
        channels: channels as unknown as object,
        deliveries: {
          create: channels.map((channel) => ({ channel, status: "pending" })),
        },
      },
    });
    return { id: notification.id };
  },

  recordDelivery: async (notificationId, channel, result: DeliveryResult) => {
    const data =
      result.status === "sent"
        ? { status: "sent", delivered_at: new Date(), error: null }
        : result.status === "skipped"
          ? { status: "skipped", error: result.reason ?? null }
          : { status: "failed", error: result.error };

    await prisma.notificationDelivery.upsert({
      where: { notification_id_channel: { notification_id: notificationId, channel } },
      create: { notification_id: notificationId, channel, attempts: 1, ...data },
      update: { attempts: { increment: 1 }, ...data },
    });
  },

  getPushSubscriptions: async (userId) => {
    const rows = await prisma.pushSubscription.findMany({ where: { user_id: userId } });
    return rows.map((row) => ({
      id: row.id,
      endpoint: row.endpoint,
      endpointHash: row.endpoint_hash,
      p256dh: row.p256dh,
      auth: row.auth,
    }));
  },

  savePushSubscription: async ({ userId, endpoint, endpointHash, p256dh, auth, userAgent }) => {
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint_hash: endpointHash } });
    if (existing && existing.user_id !== userId) {
      // Explicit ownership transfer (e.g. same device, different account
      // logged in) rather than a silent overwrite — delete the old owner's
      // row first so the upsert below is a clean create, and log it since an
      // unexpected transfer is worth being able to audit.
      logger.warn("notifications.push_subscription.ownership_transfer", {
        endpointHash,
        fromUserId: existing.user_id,
        toUserId: userId,
      });
      await prisma.pushSubscription.delete({ where: { endpoint_hash: endpointHash } });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint_hash: endpointHash },
      create: {
        user_id: userId,
        endpoint,
        endpoint_hash: endpointHash,
        p256dh,
        auth,
        user_agent: userAgent ?? null,
      },
      update: { endpoint, p256dh, auth, user_agent: userAgent ?? null, failed_at: null },
    });
  },

  deletePushSubscriptionByHash: async (userId, endpointHash) => {
    await prisma.pushSubscription.deleteMany({ where: { user_id: userId, endpoint_hash: endpointHash } });
  },

  touchPushSubscription: async (endpointHash) => {
    await prisma.pushSubscription.updateMany({
      where: { endpoint_hash: endpointHash },
      data: { last_used_at: new Date() },
    });
  },

  getRecipient: async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user ? { email: user.email } : null;
  },

  upsertScheduledReminder: async ({
    userId,
    type,
    payload,
    channels,
    scheduledFor,
    recurrence,
    timezone,
    locale,
    dedupeKey,
  }) => {
    if (dedupeKey) {
      const staleBefore = new Date(Date.now() - STALE_LEASE_MS);
      const existing = await prisma.scheduledNotification.findUnique({
        where: { dedupe_key: dedupeKey },
      });

      const isActivelyLeased =
        existing &&
        existing.claim_id !== null &&
        existing.locked_at !== null &&
        existing.locked_at >= staleBefore;

      const row = await prisma.scheduledNotification.upsert({
        where: { dedupe_key: dedupeKey },
        create: {
          user_id: userId,
          type,
          payload: payload as object,
          channels: (channels ?? null) as unknown as object,
          scheduled_for: scheduledFor,
          recurrence: recurrence ?? null,
          timezone: timezone ?? null,
          locale: locale ?? null,
          dedupe_key: dedupeKey,
        },
        update: {
          scheduled_for: scheduledFor,
          timezone: timezone ?? null,
          locale: locale ?? null,
          payload: payload as object,
          channels: (channels ?? null) as unknown as object,
          recurrence: recurrence ?? null,
          status: "pending",
          ...(isActivelyLeased ? {} : { claim_id: null, locked_at: null }),
          last_error: null,
          dispatched_at: null,
        },
      });
      return { id: row.id };
    }

    const row = await prisma.scheduledNotification.create({
      data: {
        user_id: userId,
        type,
        payload: payload as object,
        channels: (channels ?? null) as unknown as object,
        scheduled_for: scheduledFor,
        recurrence: recurrence ?? null,
        timezone: timezone ?? null,
        locale: locale ?? null,
      },
    });
    return { id: row.id };
  },

  getScheduledReminderByDedupeKey: async (dedupeKey: string) => {
    const row = await prisma.scheduledNotification.findUnique({
      where: { dedupe_key: dedupeKey },
    });
    return row ? toReminderRow(row) : null;
  },

  listScheduledRemindersForUser: async (userId: number, type?: string) => {
    const rows = await prisma.scheduledNotification.findMany({
      where: {
        user_id: userId,
        ...(type ? { type } : {}),
        status: "pending",
      },
      orderBy: { scheduled_for: "asc" },
    });
    return rows.map(toReminderRow);
  },

  cancelScheduledReminder: async (dedupeKey: string) => {
    await prisma.scheduledNotification.updateMany({
      where: { dedupe_key: dedupeKey },
      data: { status: "cancelled", claim_id: null, locked_at: null },
    });
  },

  claimDueReminders: async ({ now, limit, claimId }) => {
    const staleBefore = new Date(now.getTime() - STALE_LEASE_MS);

    const due = await prisma.scheduledNotification.findMany({
      where: {
        status: "pending",
        scheduled_for: { lte: now },
        OR: [{ claim_id: null }, { locked_at: { lt: staleBefore } }],
      },
      orderBy: { scheduled_for: "asc" },
      take: limit,
      select: { id: true },
    });
    if (due.length === 0) return [];

    // Repeats the exact guard `findMany` used above (not just `id: { in }`) —
    // the UPDATE is the only atomic statement here, so a second overlapping
    // cron run must re-check status/lease itself or it can claim rows the
    // first run already claimed between our two queries.
    await prisma.scheduledNotification.updateMany({
      where: {
        id: { in: due.map((row) => row.id) },
        status: "pending",
        OR: [{ claim_id: null }, { locked_at: { lt: staleBefore } }],
      },
      data: { claim_id: claimId, locked_at: now },
    });

    const claimed = await prisma.scheduledNotification.findMany({
      where: { claim_id: claimId },
    });
    return claimed.map(toReminderRow);
  },

  completeReminder: async (id, dispatchedAt) => {
    await prisma.scheduledNotification.update({
      where: { id },
      data: { status: "dispatched", dispatched_at: dispatchedAt, claim_id: null, locked_at: null },
    });
  },

  rescheduleReminder: async (
    id,
    nextScheduledFor,
    lastError = null,
    expectedUpdatedAt?: Date
  ) => {
    if (expectedUpdatedAt) {
      const result = await prisma.scheduledNotification.updateMany({
        where: {
          id,
          updated_at: expectedUpdatedAt,
        },
        data: {
          scheduled_for: nextScheduledFor,
          status: "pending",
          last_error: lastError,
          claim_id: null,
          locked_at: null,
          dispatched_at: null,
        },
      });

      if (result.count === 0) {
        // The user updated their settings while cron was in-flight!
        // Release the lease without overwriting their newly updated scheduled_for.
        await prisma.scheduledNotification.updateMany({
          where: { id },
          data: {
            claim_id: null,
            locked_at: null,
          },
        });
        return;
      }
      return;
    }

    await prisma.scheduledNotification.update({
      where: { id },
      data: {
        scheduled_for: nextScheduledFor,
        status: "pending",
        last_error: lastError,
        claim_id: null,
        locked_at: null,
        dispatched_at: null,
      },
    });
  },

  failReminder: async (id, error) => {
    await prisma.scheduledNotification.update({
      where: { id },
      data: { status: "failed", last_error: error, claim_id: null, locked_at: null },
    });
  },
});
