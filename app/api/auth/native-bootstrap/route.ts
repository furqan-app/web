import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { appPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";
import { getLogger } from "@/lib/fq-logger";

// Native-shell session bootstrap (ADR 0072, plan mobile-app-capacitor).
// The shell completes sign-in in the system browser, receives a short-lived
// single-use code out of band, and POSTs it here. This endpoint spends the
// code atomically and answers with a 302 into the app while setting the
// NextAuth session cookie — no token ever enters JS, so `extractUser` keeps
// working unchanged on every subsequent request (the auth middleware reads
// the cookie via `getToken` exactly as on web).
//
// POST-only on purpose: the service worker's `defaultCache` only ever caches
// GET, so no `NetworkOnly` rule is needed for this route (same reason the
// plan requires documenting per route). This route is deliberately NOT in
// `protectedRoutes` — it mints the session it would otherwise require.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    callbackUrl?: unknown;
  } | null;
  const code = body?.code;
  if (!code || typeof code !== "string") {
    return jsonResponse({ code: 422, message: "Missing required fields" });
  }

  // Single-use spend, race-safe: exactly one concurrent exchange can win the
  // row (used_at IS NULL + unexpired), every other attempt sees count 0.
  const now = new Date();
  const spent = await appPrisma.nativeBootstrapCode.updateMany({
    where: { code, used_at: null, expires_at: { gt: now } },
    data: { used_at: now },
  });
  if (spent.count === 0) {
    return jsonResponse({ code: 401, message: "Invalid or expired code" });
  }

  const row = await appPrisma.nativeBootstrapCode.findUnique({
    where: { code },
  });
  const user =
    row &&
    (await appPrisma.user.findUnique({ where: { id: row.user_id } }));
  if (!user) {
    getLogger().error("auth.native_bootstrap.no_user", {});
    return jsonResponse({ code: 401, message: "Invalid or expired code" });
  }

  // Mirror NextAuth's own cookie naming: the `__Secure-` prefix exactly when
  // the deployment is HTTPS (same rule `next-auth` applies from NEXTAUTH_URL).
  // Cookie flags follow the same condition: plain-HTTP LAN dev (e.g. a phone
  // on http://192.168.x.x) cannot store `Secure` cookies, so secure context
  // gates all three — name prefix, `Secure`, and `SameSite=None` together.
  const useSecureCookies =
    (process.env.NEXTAUTH_URL ?? "").startsWith("https://") ||
    Boolean(process.env.VERCEL);
  const cookieName = useSecureCookies
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
  // Never spread the User row: it carries the password hash column.
  const sessionToken = await encode({
    token: { id: user.id, email: user.email, name: user.name },
    secret: process.env.NEXTAUTH_SECRET as string,
    maxAge: 30 * 24 * 60 * 60,
  });

  // Same-origin locale paths only. A leading backslash (`/\evil.com`)
  // resolves cross-origin under WHATWG URL parsing, so it is rejected along
  // with anything off-origin or outside the two locales — a code bearer must
  // never turn this into an open redirect off the app.
  const rawCallback = body?.callbackUrl;
  const candidate = typeof rawCallback === "string" ? rawCallback : "/ar";
  let target = "/ar";
  if (!candidate.includes("\\")) {
    const resolved = new URL(candidate, request.url);
    const appOrigin = new URL(request.url).origin;
    if (
      resolved.origin === appOrigin &&
      /^\/(ar|en)(\/|$)/.test(resolved.pathname)
    ) {
      target = `${resolved.pathname}${resolved.search}`;
    }
  }
  // Shell contract: the caller POSTs with fetch, then navigates the WebView
  // itself (`window.location.assign(target)`) — fetch follows the 302 to an
  // HTML document the caller never reads; the session travels via Set-Cookie,
  // never via JS.
  const response = NextResponse.redirect(new URL(target, request.url), 302);
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: useSecureCookies ? "none" : "lax",
    secure: useSecureCookies,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
