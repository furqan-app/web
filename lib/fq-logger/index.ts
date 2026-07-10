import { headers } from "next/headers";
import { nodeLogger } from "./node";
import type { FqLogger } from "./types";

/**
 * Node-runtime entry point — for API routes, Server Actions, and NextAuth
 * callbacks (none of which set `runtime = "edge"` in this app). Do not import
 * this from middleware.ts/auth-middleware.ts; use `@/lib/fq-logger/edge` there.
 */
export const logger: FqLogger = nodeLogger;

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Returns a request-scoped child logger carrying the `x-request-id` set by
 * `withRequestId` middleware. Only valid inside a request context (Server
 * Components/Actions/Route Handlers) — `headers()` throws outside one, so
 * never call this from scripts, seeders, or other build-time code.
 */
export const getLogger = (): FqLogger => {
  const requestId = headers().get(REQUEST_ID_HEADER) ?? undefined;
  return requestId ? logger.child({ requestId }) : logger;
};

export type { FqLogger, LogContext } from "./types";
