import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { getNotificationDeps } from "@/app/lib/notifications/deps";
import type { DeviceTokenProvider } from "@/app/lib/notifications/types";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const isProvider = (value: unknown): value is DeviceTokenProvider =>
  value === "apns" || value === "fcm";

/** POST /api/notifications/device-tokens — register (or re-register) a native push token (APNs/FCM) for the caller. Protected (covered by the existing ^/api/notifications matcher — no middleware change). POST-only, so no service-worker NetworkOnly rule is needed. */
export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const body = await request.json().catch(() => null);
  const provider = body?.provider as unknown;
  const token = body?.token as unknown;

  if (!isProvider(provider) || typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return jsonResponse({ code: 422, message: "Missing or invalid provider/token" });
  }

  const { store } = getNotificationDeps();
  await store.saveDeviceToken({ userId: user.id, provider, token, tokenHash: hashToken(token) });

  return jsonResponse({ data: { registered: true } });
}

/** DELETE /api/notifications/device-tokens — unregister a native token (e.g. logout, permission revoked). Protected. Body: { token }. */
export async function DELETE(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const body = await request.json().catch(() => null);
  const token = body?.token as unknown;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return jsonResponse({ code: 422, message: "Missing token" });
  }

  const { store } = getNotificationDeps();
  await store.deleteDeviceTokenByHash(user.id, hashToken(token));

  return jsonResponse({ data: { unregistered: true } });
}
