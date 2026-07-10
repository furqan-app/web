import { redact } from "./redact";
import { reportToSentry } from "./sentry-bridge";
import type { FqLogger, LogContext } from "./types";

/**
 * Edge-runtime counterpart to `node.ts` — pino's worker-thread transports
 * don't run under Next's Edge runtime (used by middleware.ts/auth-middleware.ts),
 * so this is a plain console-based shim exposing the same FqLogger API.
 * Import this directly from Edge-runtime files; never import the Node entry
 * (`@/lib/fq-logger`) from there, since it pulls in `pino` itself.
 */

const isProd = process.env.NODE_ENV === "production";

type Level = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_VALUE: Record<Level, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const configuredLevel = (process.env.LOG_LEVEL as Level | undefined) ?? (isProd ? "info" : "debug");
const minLevelValue = LEVEL_VALUE[configuredLevel] ?? LEVEL_VALUE.debug;

const CONSOLE_FOR_LEVEL: Record<Level, (line: string) => void> = {
  trace: console.debug,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  fatal: console.error,
};

const write = (
  level: Level,
  msg: string,
  ctx: LogContext,
  bindings: Record<string, unknown>
) => {
  if (LEVEL_VALUE[level] < minLevelValue) return;
  const redacted = redact({ ...bindings, ...ctx });
  CONSOLE_FOR_LEVEL[level](
    JSON.stringify({ level: LEVEL_VALUE[level], time: Date.now(), msg, ...redacted })
  );
};

const build = (bindings: Record<string, unknown> = {}): FqLogger => ({
  trace: (msg, ctx: LogContext = {}) => write("trace", msg, ctx, bindings),
  debug: (msg, ctx: LogContext = {}) => write("debug", msg, ctx, bindings),
  info: (msg, ctx: LogContext = {}) => write("info", msg, ctx, bindings),
  warn: (msg, ctx: LogContext = {}) => write("warn", msg, ctx, bindings),
  error: (msg, ctx: LogContext = {}) => {
    write("error", msg, ctx, bindings);
    reportToSentry(msg, ctx);
  },
  fatal: (msg, ctx: LogContext = {}) => write("fatal", msg, ctx, bindings),
  child: (childBindings) => build({ ...bindings, ...childBindings }),
});

export const edgeLogger: FqLogger = build();
