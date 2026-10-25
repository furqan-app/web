import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAccessToken = vi.fn();
vi.mock("google-auth-library", () => ({
  // Constructible (never an arrow) — the module does `new JWT(...)`; the
  // client's getAccessToken is stubbed per test, no network ever happens.
  JWT: vi.fn().mockImplementation(function () {
    return { getAccessToken };
  }),
}));

import { createFcmSender } from "@/app/lib/notifications/channels/fcm-sender";
import type { NotificationStore } from "@/app/lib/notifications/types";
import type { FqLogger } from "@/lib/fq-logger";

const fakeLogger: FqLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: () => fakeLogger,
};

const makeStore = () =>
  ({
    deleteDeviceTokenByHash: vi.fn(async () => undefined),
  }) as unknown as NotificationStore;

const sendInput = {
  userId: 1,
  provider: "fcm" as const,
  token: "fcm-token-1",
  tokenHash: "hash-1",
  title: "Daily Wird",
  body: "2 assignments pending",
  url: undefined as string | undefined,
  notificationId: 42,
};

const SERVICE_ACCOUNT = JSON.stringify({
  client_email: "pub@furqan.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----trimmed-----END PRIVATE KEY-----\n",
});

const okResponse = () => new Response(JSON.stringify({}), { status: 200 });

describe("createFcmSender", () => {
  beforeEach(() => {
    getAccessToken.mockClear();
    getAccessToken.mockResolvedValueOnce({ token: "mock-access-token" });
    vi.stubEnv("FCM_PROJECT_ID", "furqan-prod");
    vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", SERVICE_ACCOUNT);
    vi.stubGlobal("fetch", vi.fn(async () => okResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns null without credentials — channel keeps its no_sender skip", () => {
    vi.stubEnv("FCM_PROJECT_ID", "");
    vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", "");
    expect(createFcmSender({ store: makeStore(), logger: fakeLogger })).toBeNull();
  });

  it("returns null for an unparseable or malformed service account, logging shape only", () => {
    const store = makeStore();
    vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", "{not-json");
    expect(createFcmSender({ store, logger: fakeLogger })).toBeNull();

    vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", JSON.stringify({ client_email: 1 }));
    expect(createFcmSender({ store, logger: fakeLogger })).toBeNull();
    expect(fakeLogger.error).toHaveBeenCalledWith("notifications.fcm_sender.unparseable_service_account");
    expect(fakeLogger.error).toHaveBeenCalledWith("notifications.fcm_sender.bad_service_account");
    // Raw key/cert material never reaches a log call.
    const logged = vi.mocked(fakeLogger.error).mock.calls.flat().join("\n");
    expect(logged).not.toContain("PRIVATE KEY");
  });

  it("posts a notification+data hybrid message and reports sent", async () => {
    const sender = createFcmSender({ store: makeStore(), logger: fakeLogger })!;
    sendInput.url = "/en/pages/300";

    const outcome = await sender(sendInput);

    expect(outcome).toBe("sent");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchMock = fetch as unknown as any;
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://fcm.googleapis.com/v1/projects/furqan-prod/messages:send"
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.message).toMatchObject({
      token: "fcm-token-1",
      notification: { title: "Daily Wird", body: "2 assignments pending" },
      data: { url: "/en/pages/300", notificationId: "42" },
      android: { priority: "HIGH" },
    });
    // Token values stay out of logs.
    const logged = vi.mocked(fakeLogger.warn).mock.calls.flat().join("\n");
    expect(logged).not.toContain("fcm-token-1");
  });

  it("deletes the token row and reports unhandled_provider on UNREGISTERED", async () => {
    const store = makeStore();
    const platError = () =>
      new Response(JSON.stringify({ error: { status: "UNREGISTERED" } }), { status: 404 });
    vi.stubGlobal("fetch", vi.fn(async () => platError()));
    const sender = createFcmSender({ store, logger: fakeLogger })!;
    sendInput.url = undefined;

    const outcome = await sender(sendInput);

    expect(outcome).toBe("unhandled_provider");
    expect(store.deleteDeviceTokenByHash).toHaveBeenCalledWith(1, "hash-1");
  });

  it("marks other FCM failures as channel failures (typed throw, one reason string)", async () => {
    getAccessToken.mockReset();
    getAccessToken.mockResolvedValueOnce({ token: "mock-access-token" });
    vi.stubGlobal(
      "fetch",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.fn(async () => new Response(JSON.stringify({ error: { status: "INTERNAL" } }), { status: 500 }) as any)
    );
    const sender = createFcmSender({ store: makeStore(), logger: fakeLogger })!;

    await expect(sender(sendInput)).rejects.toThrow("FCM send failed (500/INTERNAL)");
    expect(fakeLogger.warn).toHaveBeenCalledWith(
      "notifications.fcm_sender.send_failed",
      { status: 500, errorStatus: "INTERNAL" }
    );
  });

  it("throws when the access token is unavailable (channel converts to failed)", async () => {
    getAccessToken.mockReset();
    getAccessToken.mockResolvedValueOnce({ token: null as unknown as string });
    const sender = createFcmSender({ store: makeStore(), logger: fakeLogger })!;

    await expect(sender(sendInput)).rejects.toThrow("FCM access token unavailable");
  });
});
