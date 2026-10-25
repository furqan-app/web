import type { FqLogger } from "@/lib/fq-logger";
import type { EmailTransport } from "@/app/lib/notifications/channels/email/transport";
import type { ChannelRegistry, NotificationStore } from "@/app/lib/notifications/types";
import { createEmailChannel } from "@/app/lib/notifications/channels/email";
import { createPushChannel } from "@/app/lib/notifications/channels/push";
import { createNativePushChannel, type NativePushSender } from "@/app/lib/notifications/channels/native-push";
import type webpush from "web-push";

/**
 * Adding a new channel later (SMS/Slack/webhook) = one new file under
 * channels/ + one entry here. dispatch.ts never changes.
 */
export const createChannelRegistry = (deps: {
  store: NotificationStore;
  emailTransport: EmailTransport;
  webpush: Pick<typeof webpush, "sendNotification">;
  /** Plugged in by deps.ts when FCM credentials exist (ADR 0076); absent otherwise. */
  nativePushSender?: NativePushSender;
  logger: FqLogger;
}): ChannelRegistry => ({
  email: createEmailChannel({ transport: deps.emailTransport, logger: deps.logger }),
  push: createPushChannel({ store: deps.store, webpush: deps.webpush, logger: deps.logger }),
  native_push: createNativePushChannel({
    store: deps.store,
    sender: deps.nativePushSender,
    logger: deps.logger,
  }),
});
