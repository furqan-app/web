import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { appPrisma } from "@/app/utils/db";
import { extractUser } from "@/app/api/request";
import { jsonResponse } from "@/app/api/response";

// Native-shell bootstrap minter (ADR 0072, plan mobile-app-capacitor).
// Called from the system browser right after a normal web sign-in: mints a
// short-lived single-use code the shell later exchanges at POST
// /api/auth/native-bootstrap. Protected (see protectedRoutes in
// auth-middleware) — the owner comes from the trusted `user` header, never
// from the body, so a caller can only mint for themselves.
export async function POST(request: NextRequest) {
  const user = extractUser(request) as { id?: unknown } | null;
  const userId = typeof user?.id === "number" ? user.id : null;
  if (!userId) {
    // Belt-and-suspenders: the middleware already 401s unauthenticated
    // callers, but a direct call must never mint for "nobody".
    return jsonResponse({ code: 401 });
  }

  const row = await appPrisma.nativeBootstrapCode.create({
    data: {
      code: randomUUID(),
      user_id: userId,
      // Long enough to switch apps and paste/open the link, short enough
      // that a leaked code is useless within minutes.
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    },
    select: { code: true, expires_at: true },
  });
  // Opportunistic hygiene: minting is the only writer, so piggyback pruning
  // of spent/expired rows here instead of a cron job.
  await appPrisma.nativeBootstrapCode.deleteMany({
    where: { OR: [{ used_at: { not: null } }, { expires_at: { lt: new Date() } }] },
  });
  return jsonResponse({ data: row });
}
