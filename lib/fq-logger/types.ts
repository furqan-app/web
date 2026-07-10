export type LogContext = Record<string, unknown> & { err?: unknown };

export interface FqLogger {
  trace(msg: string, ctx?: LogContext): void;
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  /** Also reports to Sentry via `ctx.err` (or a synthetic Error if absent) — see ADR 0019. */
  error(msg: string, ctx?: LogContext): void;
  fatal(msg: string, ctx?: LogContext): void;
  child(bindings: Record<string, unknown>): FqLogger;
}
