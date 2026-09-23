import { describe, expect, it, vi } from "vitest";
import { createNativePushChannel } from "@/app/lib/notifications/channels/native-push";
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

const tokenRow = (id: number) => ({
  id,
  provider: "fcm" as const,
  tokenHash: `hash-${id}`,
});

const baseInput: ChannelSendInput = {
  notificationId: 1,
  type: "system.test",
  payload: {},
  content: { title: "t", body: "b" },
  typeDef: { key: "system.test", defaultChannels: [], render: () => ({ title: "t", body: "b" }) },
  recipient: { userId: 1, email: null, locale: "en" },
};

const makeStore = (tokens: ReturnType<typeof tokenRow>[]): NotificationStore =>
  ({
    getDeviceTokens: vi.fn(async () => tokens),
    getDeviceToken: vi.fn(async (_userId: number, hash: string) => `token-for-${hash}`),
  }) as unknown as NotificationStore;

describe("createNativePushChannel", () => {
  it("skips with no_token when the recipient has no device tokens", async () => {
    const channel = createNativePushChannel({ store: makeStore([]), logger: fakeLogger });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "skipped", reason: "no_token" });
  });

  it("skips with no_sender when tokens exist but no sender is wired", async () => {
    const channel = createNativePushChannel({ store: makeStore([tokenRow(1)]), logger: fakeLogger });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "skipped", reason: "no_sender" });
    expect(fakeLogger.warn).toHaveBeenCalledWith(
      "notifications.channels.native_push.no_sender",
      { userId: 1, tokenCount: 1 }
    );
  });

  it("sends through the sender once per token and reports sent", async () => {
    const sender = vi.fn(async () => {});
    const channel = createNativePushChannel({
      store: makeStore([tokenRow(1), tokenRow(2)]),
      sender,
      logger: fakeLogger,
    });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "sent" });
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender).toHaveBeenCalledWith({
      provider: "fcm",
      token: "token-for-hash-1",
      title: "t",
      body: "b",
      url: undefined,
      notificationId: 1,
    });
  });

  it("reports failed when every send throws", async () => {
    const sender = vi.fn(async () => {
      throw new Error("apns down");
    });
    const channel = createNativePushChannel({
      store: makeStore([tokenRow(1)]),
      sender,
      logger: fakeLogger,
    });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "failed", error: "apns down" });
  });

  it("skips with no_token when every token row vanished concurrently", async () => {
    const sender = vi.fn(async () => {});
    const store = {
      getDeviceTokens: vi.fn(async () => [tokenRow(1)]),
      getDeviceToken: vi.fn(async (): Promise<string | null> => null),
    } as unknown as NotificationStore;
    const channel = createNativePushChannel({ store, sender, logger: fakeLogger });

    const result = await channel.send(baseInput);

    // A null lookup fulfils its promise — it must never count as sent.
    expect(result).toEqual({ status: "skipped", reason: "no_token" });
    expect(sender).not.toHaveBeenCalled();
  });
});
