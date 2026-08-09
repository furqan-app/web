import type { FqLogger } from "@/lib/fq-logger";
import type { EmailTransport } from "@/app/lib/notifications/channels/email/transport";
import type { ChannelSendInput, DeliveryResult, NotificationChannel } from "@/app/lib/notifications/types";
import { escapeHtml } from "@/app/lib/notifications/html";

const fallbackEmail = (input: ChannelSendInput) => ({
  subject: input.content.title,
  text: input.content.body,
  html: `<p>${escapeHtml(input.content.body)}</p>`,
});

export const createEmailChannel = (deps: {
  transport: EmailTransport;
  logger: FqLogger;
}): NotificationChannel => ({
  key: "email",
  send: async (input: ChannelSendInput): Promise<DeliveryResult> => {
    const { recipient } = input;
    if (!recipient.email) {
      return { status: "skipped", reason: "no_email" };
    }

    const rendered = input.emailContent ?? fallbackEmail(input);

    try {
      await deps.transport.send({ to: recipient.email, ...rendered });
      return { status: "sent" };
    } catch (error) {
      deps.logger.error("notifications.channels.email.send_failed", {
        userId: recipient.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  },
});
