import { routing } from "@/i18n/routing";
import { CustomMiddleware } from "./pipe";
import createMiddleware from "next-intl/middleware";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

export const withIntl = (middleware: CustomMiddleware) => {
  return async (
    req: NextRequest,
    event: NextFetchEvent,
    response: NextResponse
  ) => {
    if (!req.nextUrl.pathname.startsWith("/api")) {
      return createMiddleware(routing)(req);
    }
    return middleware(req, event, response);
  };
};

