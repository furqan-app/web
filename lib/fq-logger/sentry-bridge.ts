import * as Sentry from "@sentry/nextjs";
import { redact } from "./redact";
import type { LogContext } from "./types";

/**
 * logger.error() also reports to Sentry (ADR 0019, amending ADR 0017's
 * "Sentry = exceptions only" scope). Uses the same redaction pass as the log
 * line itself so Sentry's `extra` never receives a field the log line scrubbed.
 */
export const reportToSentry = (msg: string, ctx: LogContext) => {
  const { err, ...rest } = ctx;
  Sentry.captureException(err instanceof Error ? err : new Error(msg), {
    extra: redact(rest),
  });
};
