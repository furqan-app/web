import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { jsonResponse } from "./app/api/response";
import { isJSONRequest } from "./app/api/request";

export default withAuth(
  async function middleware(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      if (isJSONRequest(req)) {
        return jsonResponse({
          code: 401,
        });
      }
      return NextResponse.redirect("/api/auth/signin");
    }
    const headers = new Headers(req.headers);
    headers.set("user", JSON.stringify(token));
    return NextResponse.next({
      request: {
        headers,
      },
    });
  },
  {
    callbacks: {
      // Should be true to run the middleware
      authorized: () => {
        return true;
      },
    },
  }
);

export const config = { matcher: ["/api/quran/pages/:pageId/marks"] };

