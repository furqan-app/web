import pino from "pino";
import PinoPretty from "pino-pretty";
import { redact } from "./redact";
import { reportToSentry } from "./sentry-bridge";
import type { FqLogger, LogContext } from "./types";

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");

// pino's `transport` option spawns a worker thread that resolves the target
// module (e.g. "pino-pretty") from disk — this breaks under Next.js's webpack
// bundling ("unable to determine transport target"). Passing pino-pretty
// directly as a synchronous stream avoids the worker-thread/module-resolution
// path entirely and works inside a bundled Route Handler.
const base = isProd
  ? pino({ level })
  : pino({ level }, PinoPretty({ colorize: true, translateTime: "SYS:standard" }));

/** Wraps a pino instance in the shared FqLogger call shape (`msg` first, `ctx` second). */
const wrap = (instance: pino.Logger): FqLogger => ({
  trace: (msg, ctx: LogContext = {}) => instance.trace(redact(ctx), msg),
  debug: (msg, ctx: LogContext = {}) => instance.debug(redact(ctx), msg),
  info: (msg, ctx: LogContext = {}) => instance.info(redact(ctx), msg),
  warn: (msg, ctx: LogContext = {}) => instance.warn(redact(ctx), msg),
  error: (msg, ctx: LogContext = {}) => {
    instance.error(redact(ctx), msg);
    reportToSentry(msg, ctx);
  },
  fatal: (msg, ctx: LogContext = {}) => instance.fatal(redact(ctx), msg),
  child: (bindings) => wrap(instance.child(bindings)),
});

export const nodeLogger: FqLogger = wrap(base);
