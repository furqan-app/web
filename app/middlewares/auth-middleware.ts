import { CustomMiddleware } from "./pipe";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { jsonResponse } from "../api/response";
import { isJSONRequest } from "../api/request";
import { edgeLogger } from "@/lib/fq-logger/edge";
import { REQUEST_ID_HEADER } from "./request-id-middleware";

const protectedRoutes = [
  new RegExp("/api/quran/pages/[0-9]+/marks"),
  // All shared-mushaf endpoints require an authenticated user (ADR 0012).
  new RegExp("^/api/mushaf/"),
];

export const withAuth = (middleware: CustomMiddleware) => {
  return async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: NextRequest & { nextauth?: { token?: any } },
    event: NextFetchEvent,
    response: NextResponse
  ) => {
    const pathname = req.nextUrl.pathname;

    if (!protectedRoutes.some((route) => route.test(pathname))) {
      return middleware(req, event, response);
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.email) {
      const log = edgeLogger.child({
        requestId: req.headers.get(REQUEST_ID_HEADER) ?? undefined,
      });

      if (isJSONRequest(req)) {
        log.warn("auth.denied", { pathname, reason: "no_token" });
        return jsonResponse({
          code: 401,
        });
      }

      log.warn("auth.redirect_to_signin", { pathname });
      return NextResponse.redirect(`/api/auth/signin?callbackUrl=${pathname}`);
    }

    // Forward the trusted token to the route handler as a REQUEST header (which
    // `extractUser` reads). Strip any client-supplied `user` header first so it
    // can never be forged, and forward via `request.headers` rather than setting
    // it on the response (which the handler never sees, and which would leak the
    // token to the browser). `withIntl` doesn't mutate the response for `/api`
    // paths, so building a fresh forwarding response here drops nothing.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete("user");
    requestHeaders.set("user", JSON.stringify(token));

    return middleware(
      req,
      event,
      NextResponse.next({ request: { headers: requestHeaders } })
    );
  };
};

