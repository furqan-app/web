import webpush from "web-push";
import { getLogger, logger } from "@/lib/fq-logger";
import type { FqLogger } from "@/lib/fq-logger";
import { appPrisma } from "@/app/utils/db";
import { createNotificationStore } from "@/app/lib/notifications/repository";
import { createChannelRegistry } from "@/app/lib/notifications/channels/registry";
import { createSmtpEmailTransport } from "@/app/lib/notifications/channels/email/smtp-transport";
import { createLogEmailTransport } from "@/app/lib/notifications/channels/email/log-transport";
import type { EmailTransport } from "@/app/lib/notifications/channels/email/transport";
import { buildRenderContext } from "@/app/lib/notifications/render-context";
import type { DispatchDeps } from "@/app/lib/notifications/dispatch";

const hasSmtpConfig = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@furqan.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Memoized at module scope (constructed once per process, not per request) so
// nodemailer's connection pooling is actually used — mirrors the
// `setVapidDetails` call above being a one-time setup, not per-call.
let cachedEmailTransport: EmailTransport | null = null;
const getEmailTransport = (): EmailTransport => {
  if (cachedEmailTransport) return cachedEmailTransport;
  cachedEmailTransport = hasSmtpConfig()
    ? createSmtpEmailTransport({
        host: process.env.SMTP_HOST as string,
        port: Number(process.env.SMTP_PORT ?? 587),
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
        from: process.env.EMAIL_FROM ?? "no-reply@furqan.app",
      })
    : createLogEmailTransport(logger);
  return cachedEmailTransport;
};

/**
 * Composition root — the only place wiring appPrisma + web-push + SMTP
 * together. Only ever called from within a Route Handler (request scope),
 * so `getLogger()` (request-id-correlated) is safe to use here, unlike in
 * the pure-function modules below it.
 */
export const getNotificationDeps = (): DispatchDeps => {
  const requestLogger: FqLogger = getLogger();
  const store = createNotificationStore(appPrisma, requestLogger);
  const emailTransport = getEmailTransport();
  const registry = createChannelRegistry({ store, emailTransport, webpush, logger: requestLogger });

  return {
    store,
    registry,
    clock: () => new Date(),
    logger: requestLogger,
    renderContext: buildRenderContext,
  };
};
