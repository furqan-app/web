import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { getNotificationDeps } from "@/app/lib/notifications/deps";

const hashEndpoint = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

// Known Web Push service hosts — web-push later POSTs to `endpoint` verbatim
// from the server, so an unvalidated arbitrary URL here is an SSRF primitive.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];

const isValidPushEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && ALLOWED_PUSH_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
};

/** POST /api/notifications/push-subscription — register (or re-register) a Web Push subscription for the caller. Protected. */
export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  const p256dh = body?.keys?.p256dh as string | undefined;
  const auth = body?.keys?.auth as string | undefined;

  if (!endpoint || !p256dh || !auth) {
    return jsonResponse({ code: 422, message: "Missing endpoint or keys" });
  }
  if (!isValidPushEndpoint(endpoint)) {
    return jsonResponse({ code: 422, message: "Unrecognized push endpoint" });
  }

  const { store } = getNotificationDeps();
  await store.savePushSubscription({
    userId: user.id,
    endpoint,
    endpointHash: hashEndpoint(endpoint),
    p256dh,
    auth,
    userAgent: request.headers.get("user-agent"),
  });

  return jsonResponse({ data: { registered: true } });
}

/** DELETE /api/notifications/push-subscription — unregister a subscription (e.g. permission revoked). Protected. Body: { endpoint }. */
export async function DELETE(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) return jsonResponse({ code: 422, message: "Missing endpoint" });

  const { store } = getNotificationDeps();
  await store.deletePushSubscriptionByHash(user.id, hashEndpoint(endpoint));

  return jsonResponse({ data: { unregistered: true } });
}
