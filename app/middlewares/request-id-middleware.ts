import { CustomMiddleware } from "./pipe";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generates (or passes through) a request-correlation id and forwards it on
 * the request headers, mirroring the pattern auth-middleware.ts uses for the
 * `user` header. Mutates `req.headers` directly (not just the forwarded
 * response's request headers) so downstream wrappers in this same pipe run
 * (e.g. auth-middleware's own logging) can read it via `req.headers.get()`
 * without regenerating it — see fq-logger plan's Request Correlation section.
 */
export const withRequestId = (middleware: CustomMiddleware) => {
  return async (
    req: NextRequest,
    event: NextFetchEvent,
    response: NextResponse
  ) => {
    const requestId = req.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
    req.headers.set(REQUEST_ID_HEADER, requestId);

    const requestHeaders = new Headers(req.headers);

    return middleware(
      req,
      event,
      // Preserve any response-level headers a wrapper earlier in the pipe
      // already set, rather than silently dropping them.
      NextResponse.next({ request: { headers: requestHeaders }, headers: response.headers })
    );
  };
};
