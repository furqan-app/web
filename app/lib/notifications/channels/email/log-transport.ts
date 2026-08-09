import type { FqLogger } from "@/lib/fq-logger";
import type { EmailTransport } from "@/app/lib/notifications/channels/email/transport";

/** Used when SMTP env vars are absent (local dev, CI) — logs instead of sending. */
export const createLogEmailTransport = (logger: FqLogger): EmailTransport => ({
  send: async (message) => {
    logger.info("notifications.email.logged", {
      to: message.to,
      subject: message.subject,
    });
  },
});
