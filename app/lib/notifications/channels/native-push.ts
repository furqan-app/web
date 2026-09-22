import type { FqLogger } from "@/lib/fq-logger";
import type {
  ChannelSendInput,
  DeliveryResult,
  DeviceTokenProvider,
  NotificationChannel,
  NotificationStore,
} from "@/app/lib/notifications/types";

/** Pluggable native sender (APNs/FCM) — wired once credentials exist (Phase 2 push). Absent until then, by design. */
export type NativePushSender = (input: {
  provider: DeviceTokenProvider;
  token: string;
  title: string;
  body: string;
  url?: string;
  notificationId: number;
}) => Promise<void>;

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
    // after the list read) — counts as not-sent, never as sent.
    const outcomes = await Promise.allSettled(
      tokens.map(async (row) => {
        const token = await deps.store.getDeviceToken(recipient.userId, row.tokenHash);
        if (!token) return false;
        await sender({
          provider: row.provider,
          token,
          title: content.title,
          body: content.body,
          url: content.url,
          notificationId,
        });
        return true;
      })
    );

    const anySent = outcomes.some((r) => r.status === "fulfilled" && r.value === true);
    if (anySent) return { status: "sent" };

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
