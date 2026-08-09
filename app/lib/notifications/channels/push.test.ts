import { describe, expect, it, vi } from "vitest";
import { createPushChannel } from "@/app/lib/notifications/channels/push";
import type { ChannelSendInput, NotificationStore } from "@/app/lib/notifications/types";
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

const sub = (id: number) => ({
  id,
  endpoint: `https://fcm.googleapis.com/fake/${id}`,
  endpointHash: `hash-${id}`,
  p256dh: "p256dh",
  auth: "auth",
});

const baseInput: ChannelSendInput = {
  notificationId: 1,
  type: "system.test",
  payload: {},
  content: { title: "t", body: "b" },
  typeDef: { key: "system.test", defaultChannels: [], render: () => ({ title: "t", body: "b" }) },
  recipient: { userId: 1, email: null, locale: "en" },
};

const makeStore = (subscriptions: ReturnType<typeof sub>[]): NotificationStore =>
  ({
    getPushSubscriptions: vi.fn(async () => subscriptions),
    touchPushSubscription: vi.fn(),
    deletePushSubscriptionByHash: vi.fn(),
  }) as unknown as NotificationStore;

describe("createPushChannel", () => {
  it("skips when the recipient has no subscriptions", async () => {
    const store = makeStore([]);
    const channel = createPushChannel({ store, webpush: { sendNotification: vi.fn() }, logger: fakeLogger });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "skipped", reason: "no_subscription" });
  });

  it("a 410 response prunes the subscription", async () => {
    const store = makeStore([sub(1)]);
    const sendNotification = vi.fn().mockRejectedValue(Object.assign(new Error("gone"), { statusCode: 410 }));
    const channel = createPushChannel({ store, webpush: { sendNotification }, logger: fakeLogger });

    const result = await channel.send(baseInput);

    expect(result.status).toBe("failed");
    expect(store.deletePushSubscriptionByHash).toHaveBeenCalledWith(1, "hash-1");
  });

  it("a non-404/410 failure does not prune the subscription", async () => {
    const store = makeStore([sub(1)]);
    const sendNotification = vi.fn().mockRejectedValue(Object.assign(new Error("server error"), { statusCode: 500 }));
    const channel = createPushChannel({ store, webpush: { sendNotification }, logger: fakeLogger });

    await channel.send(baseInput);

    expect(store.deletePushSubscriptionByHash).not.toHaveBeenCalled();
  });

  it("partial success across multiple subscriptions is reported as sent", async () => {
    const store = makeStore([sub(1), sub(2)]);
    const sendNotification = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockResolvedValueOnce(undefined);
    const channel = createPushChannel({ store, webpush: { sendNotification }, logger: fakeLogger });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "sent" });
  });

  it("all subscriptions failing is reported as failed", async () => {
    const store = makeStore([sub(1)]);
    const sendNotification = vi.fn().mockRejectedValue(new Error("network down"));
    const channel = createPushChannel({ store, webpush: { sendNotification }, logger: fakeLogger });

    const result = await channel.send(baseInput);

    expect(result.status).toBe("failed");
  });
});
