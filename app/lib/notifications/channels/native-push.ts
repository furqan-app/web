import type { FqLogger } from "@/lib/fq-logger";
import type {
  ChannelSendInput,
  DeliveryResult,
  DeviceTokenProvider,
  NativePushSendOutcome,
  NotificationChannel,
  NotificationStore,
} from "@/app/lib/notifications/types";

/** Pluggable native sender (FCM today, APNs later — ADR 0076). Returns a per-token outcome:
 *  "sent" or "unhandled_provider" (skip recorded by the channel, never a failure). Throws
 *  only for genuine delivery failures the channel converts to `{ status: "failed" }`. */
export type NativePushSender = (input: {
  userId: number;
  provider: DeviceTokenProvider;
  token: string;
  tokenHash: string;
  title: string;
  body: string;
  url?: string;
  notificationId: number;
}) => Promise<NativePushSendOutcome>;

export const createNativePushChannel = (deps: {
  store: NotificationStore;
  sender?: NativePushSender;
  logger: FqLogger;
}): NotificationChannel => ({
  key: "native_push",
  send: async (input: ChannelSendInput): Promise<DeliveryResult> => {
    const { recipient, content, notificationId } = input;
    const tokens = await deps.store.getDeviceTokens(recipient.userId);

    if (tokens.length === 0) {
      return { status: "skipped", reason: "no_token" };
    }
    const sender = deps.sender;
    if (!sender) {
      // No sender credentials configured yet (Phase 2 push): recorded as a
      // skip with an explicit reason, never silently dropped and never a
      // failure — there is nothing to retry.
      deps.logger.warn("notifications.channels.native_push.no_sender", {
        userId: recipient.userId,
        tokenCount: tokens.length,
      });
      return { status: "skipped", reason: "no_sender" };
    }

    // A null token means its row vanished concurrently (deleted elsewhere
    // after the list read) — counts as not-sent, never as sent. An
    // "unhandled_provider" outcome is an explicit skip (e.g. apns rows until
    // Apple credentials exist — ADR 0076), never a failure and never a send.
    const outcomes = await Promise.allSettled(
      tokens.map(async (row) => {
        const token = await deps.store.getDeviceToken(recipient.userId, row.tokenHash);
        if (!token) return false;
        return sender({
          userId: recipient.userId,
          provider: row.provider,
          token,
          tokenHash: row.tokenHash,
          title: content.title,
          body: content.body,
          url: content.url,
          notificationId,
        });
      })
    );

    const anySent = outcomes.some(
      (r) => r.status === "fulfilled" && r.value === "sent"
    );
    if (anySent) return { status: "sent" };

    const anyUnhandledProvider = outcomes.some(
      (r) => r.status === "fulfilled" && r.value === "unhandled_provider"
    );
    if (anyUnhandledProvider && !outcomes.some((r) => r.status === "rejected")) {
      return { status: "skipped", reason: "provider_unhandled" };
    }

    const firstError = outcomes.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    )?.reason;
    if (firstError) {
      deps.logger.warn("notifications.channels.native_push.all_failed", {
        userId: recipient.userId,
        error: firstError instanceof Error ? firstError.message : String(firstError),
      });
      return {
        status: "failed",
        error: firstError instanceof Error ? firstError.message : String(firstError),
      };
    }
    return { status: "skipped", reason: "no_token" };
  },
});
