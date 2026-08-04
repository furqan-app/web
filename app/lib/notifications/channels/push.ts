import type webpush from "web-push";
import type { FqLogger } from "@/lib/fq-logger";
import type { ChannelSendInput, DeliveryResult, NotificationChannel, NotificationStore } from "@/app/lib/notifications/types";

type WebPushLib = Pick<typeof webpush, "sendNotification">;

export const createPushChannel = (deps: {
  store: NotificationStore;
  webpush: WebPushLib;
  logger: FqLogger;
}): NotificationChannel => ({
  key: "push",
  send: async (input: ChannelSendInput): Promise<DeliveryResult> => {
    const { recipient, content, notificationId } = input;
    const subscriptions = await deps.store.getPushSubscriptions(recipient.userId);

    if (subscriptions.length === 0) {
      return { status: "skipped", reason: "no_subscription" };
    }

    const payload = JSON.stringify({
      title: content.title,
      body: content.body,
      url: content.url,
      notificationId,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await deps.webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          await deps.store.touchPushSubscription(sub.endpointHash);
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await deps.store.deletePushSubscriptionByHash(recipient.userId, sub.endpointHash);
          }
          throw error;
        }
      })
    );

    const anySent = results.some((r) => r.status === "fulfilled");
    if (anySent) return { status: "sent" };

    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    )?.reason;
    deps.logger.warn("notifications.channels.push.all_failed", {
      userId: recipient.userId,
      error: firstError instanceof Error ? firstError.message : String(firstError),
    });
    return {
      status: "failed",
      error: firstError instanceof Error ? firstError.message : String(firstError ?? "unknown"),
    };
  },
});
