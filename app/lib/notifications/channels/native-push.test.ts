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

const makeStore = (
  tokens: { id: number; provider: "fcm" | "apns"; tokenHash: string }[]
): NotificationStore =>
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

  it("sends through the sender once per token and reports sent (ADR 0076 fan-out)", async () => {
    const sender = vi.fn(async () => "sent" as const);
    const channel = createNativePushChannel({
      store: makeStore([tokenRow(1), tokenRow(2)]),
      sender,
      logger: fakeLogger,
    });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "sent" });
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender).toHaveBeenCalledWith({
      userId: 1,
      provider: "fcm",
      token: "token-for-hash-1",
      tokenHash: "hash-1",
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

  it("reports sent when at least one send succeeds even if others throw", async () => {
    const sender = vi
      .fn<(input: { tokenHash: string }) => Promise<"sent">>()
      .mockImplementationOnce(async () => "sent")
      .mockImplementationOnce(async () => {
        throw new Error("transient");
      });
    const channel = createNativePushChannel({
      store: makeStore([tokenRow(1), tokenRow(2)]),
      sender,
      logger: fakeLogger,
    });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "sent" });
  });

  it("skips with provider_unhandled when every token comes back unhandled (apns rows, ADR 0076)", async () => {
    const sender = vi.fn(async () => "unhandled_provider" as const);
    const channel = createNativePushChannel({
      store: makeStore([tokenRow(1), tokenRow(2)]),
      sender,
      logger: fakeLogger,
    });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "skipped", reason: "provider_unhandled" });
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it("reports sent even when one token is unhandled and another sends", async () => {
    const sender = vi
      .fn<(input: { tokenHash: string }) => Promise<"sent" | "unhandled_provider">>()
      .mockImplementationOnce(async () => "unhandled_provider")
      .mockImplementationOnce(async () => "sent");
    const apnsRow = { id: 3, provider: "apns" as const, tokenHash: "hash-3" };
    const channel = createNativePushChannel({
      store: makeStore([apnsRow, tokenRow(2)]),
      sender,
      logger: fakeLogger,
    });

    const result = await channel.send(baseInput);

    expect(result).toEqual({ status: "sent" });
  });

  it("skips with no_token when every token row vanished concurrently", async () => {
    const sender = vi.fn(async () => "sent" as const);
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
