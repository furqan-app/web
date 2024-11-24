import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { withAuth } from "./app/middlewares/auth-middleware";
import { withIntl } from "./app/middlewares/intl-middleware";
import { CustomMiddleware, pipeMiddlewares } from "./app/middlewares/pipe";

const withInit =
  (middleware: CustomMiddleware) => (req: NextRequest, event: NextFetchEvent) =>
    middleware(req, event, NextResponse.next());

export default pipeMiddlewares([withInit, withIntl, withAuth]);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|fonts/*).*)",
  ],
};

