import type { JWT } from "google-auth-library";
import type { NotificationStore } from "@/app/lib/notifications/types";
import type { NativePushSender } from "@/app/lib/notifications/channels/native-push";
import type { FqLogger } from "@/lib/fq-logger";

const FCM_SEND_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_SEND_URL = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

/** Minimal shape of a Google service-account JSON key used for the FCM send scope. */
export type FcmServiceAccount = {
  client_email: string;
  private_key: string;
};

// google-auth-library's JWT caches and refreshes the access token for its
// lifetime (getAccessToken() returns the cached token until ~expiry), so one
// client per credentials-boundary is correct. The cron builds a fresh deps
// object every tick, so the cache is keyed by credential CONTENT (parsed
// objects are new each call — identity would never match).
//
// The library is dynamically imported server-side (ADR 0075 precedent): the
// FCM credential path must not be statically pulled into every route that
// composes the notification deps.
let cachedKey: string | null = null;
let cachedJwtPromise: Promise<JWT> | null = null;

const buildJwt = (account: FcmServiceAccount): Promise<JWT> => {
  const key = `${account.client_email}\n${account.private_key}`;
  if (cachedKey === key && cachedJwtPromise) return cachedJwtPromise;

  cachedKey = key;
  const promise = import("google-auth-library").then(
    ({ JWT: JwtClient }) =>
      new JwtClient({
        email: account.client_email,
        key: account.private_key.replace(/\\n/g, "\n") + "\n",
        scopes: [FCM_SEND_SCOPE],
      })
  );
  cachedJwtPromise = promise;
  void promise.catch(() => {
    if (cachedJwtPromise === promise) {
      cachedJwtPromise = null;
      cachedKey = null;
    }
  });
  return promise;
};

/**
 * Builds the sender wired into the native_push channel (ADR 0076) when FCM
 * credentials exist; null otherwise — the channel then keeps its deliberate
 * no_sender skip path (never a failure, never silent).
 *
 * `FCM_SERVICE_ACCOUNT_JSON` is the Google service-account JSON key as a single
 * env string (Hostinger panel only, per ADR 0076 — never committed, never
 * NEXT_PUBLIC_*). `FCM_PROJECT_ID` is the Firebase project id used in the
 * send URL.
 */
export const createFcmSender = (deps: {
  store: NotificationStore;
  logger: FqLogger;
}): NativePushSender | null => {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FCM_PROJECT_ID;
  if (!raw || !projectId) return null;

  let account: FcmServiceAccount;
  try {
    const parsed = JSON.parse(raw) as Partial<FcmServiceAccount>;
    if (
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string" ||
      parsed.client_email.length === 0 ||
      parsed.private_key.length === 0
    ) {
      deps.logger.error("notifications.fcm_sender.bad_service_account");
      return null;
    }
    account = { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    // Key material never passes through logs — only existence/shape facts do.
    deps.logger.error("notifications.fcm_sender.unparseable_service_account");
    return null;
  }

  // Never throws — channel-level errors surface as `{ status: "failed" }`
  // through the channel's allSettled collection; UNREGISTERED is handled here
  // (token deleted, token-level no-op) and never retried by the runner.
  return async ({ userId, tokenHash, provider, token, title, body, url, notificationId }) => {
    if (provider !== "fcm") return "unhandled_provider";

    const jwt = await buildJwt(account);
    const accessToken = await jwt.getAccessToken();
    if (!accessToken.token) {
      throw new Error("FCM access token unavailable");
    }

    const response = await fetch(FCM_SEND_URL(projectId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      // notification + data hybrid (ADR 0076): the notification payload shows
      // the tray natively when the app is killed from Recents; the data payload
      // carries the tap target so navigation can validate it on action.
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: {
            url: url ?? "",
            // FCM data values must be strings.
            notificationId: String(notificationId),
          },
          android: { priority: "HIGH" },
        },
      }),
    });

    if (response.ok) return "sent";

    const errorBody = (await response.json().catch(() => null)) as {
      error?: { status?: string };
    } | null;
    const errorStatus = errorBody?.error?.status;

    // Stale-token cleanup (ADR 0076): FCM said the token no longer exists —
    // mirroring Web Push 404/410 semantics, delete the row and treat the
    // token as a handled no-op rather than a channel failure.
    if (errorStatus === "UNREGISTERED") {
      await deps.store.deleteDeviceTokenByHash(userId, tokenHash);
      return "unhandled_provider";
    }

    // Token values never in logs (fq-logger redacts `token`; keep payloads out anyway).
    deps.logger.warn("notifications.fcm_sender.send_failed", {
      status: response.status,
      errorStatus: errorStatus ?? "unknown",
    });
    throw new Error(`FCM send failed (${response.status}${errorStatus ? `/${errorStatus}` : ""})`);
  };
};
