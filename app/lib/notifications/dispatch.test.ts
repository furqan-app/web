import { describe, expect, it, vi } from "vitest";
import { dispatchNotification } from "@/app/lib/notifications/dispatch";
import type { DispatchDeps } from "@/app/lib/notifications/dispatch";
import type { ChannelRegistry, NotificationStore, Recipient } from "@/app/lib/notifications/types";
import type { FqLogger } from "@/lib/fq-logger";
import { NOTIFICATION_TYPES } from "@/app/constants/notifications";

const recipient: Recipient = { userId: 1, email: "a@b.com", locale: "en" };

const fakeLogger: FqLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: () => fakeLogger,
};

const makeStore = (): NotificationStore => {
  const deliveries: Record<string, unknown> = {};
  return {
    createNotification: vi.fn(async () => ({ id: 42 })),
    recordDelivery: vi.fn(async (id, channel, result) => {
      deliveries[`${id}:${channel}`] = result;
    }),
    listNotifications: vi.fn(),
    countUnread: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    getPushSubscriptions: vi.fn(async () => []),
    savePushSubscription: vi.fn(),
    deletePushSubscriptionByHash: vi.fn(),
    touchPushSubscription: vi.fn(),
    getRecipient: vi.fn(),
    upsertScheduledReminder: vi.fn(),
    claimDueReminders: vi.fn(),
    completeReminder: vi.fn(),
    rescheduleReminder: vi.fn(),
    failReminder: vi.fn(),
  } as unknown as NotificationStore;
};

const baseDeps = (registry: ChannelRegistry): DispatchDeps => ({
  store: makeStore(),
  registry,
  clock: () => new Date("2026-08-03T00:00:00Z"),
  logger: fakeLogger,
  renderContext: () => ({ locale: "en", t: (_k, fallback) => fallback }),
});

describe("dispatchNotification", () => {
  it("persists once and invokes every selected channel", async () => {
    const inApp = { key: "in_app" as const, send: vi.fn(async () => ({ status: "sent" as const })) };
    const push = { key: "push" as const, send: vi.fn(async () => ({ status: "sent" as const })) };
    const deps = baseDeps({ in_app: inApp, push });

    const outcome = await dispatchNotification(
      { recipient, type: "plans.daily_reminder", payload: { planId: 1, templateKey: "x", templateLabel: "X" } },
      deps
    );

    expect(deps.store.createNotification).toHaveBeenCalledTimes(1);
    expect(inApp.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledTimes(1);
    expect(outcome.notificationId).toBe(42);
    expect(outcome.results.in_app).toEqual({ status: "sent" });
    expect(outcome.results.push).toEqual({ status: "sent" });
  });

  it("one failing channel does not block or fail the others", async () => {
    const inApp = { key: "in_app" as const, send: vi.fn(async () => ({ status: "sent" as const })) };
    const push = {
      key: "push" as const,
      send: vi.fn(async () => ({ status: "failed" as const, error: "boom" })),
    };
    const deps = baseDeps({ in_app: inApp, push });

    const outcome = await dispatchNotification(
      { recipient, type: "plans.daily_reminder", payload: { planId: 1, templateKey: "x", templateLabel: "X" } },
      deps
    );

    expect(outcome.results.in_app).toEqual({ status: "sent" });
    expect(outcome.results.push).toEqual({ status: "failed", error: "boom" });
  });

  it("an unknown type returns null notificationId without throwing", async () => {
    const deps = baseDeps({});
    const outcome = await dispatchNotification(
      { recipient, type: "nonexistent.type", payload: {} },
      deps
    );
    expect(outcome.notificationId).toBeNull();
    expect(outcome.results).toEqual({});
    expect(deps.store.createNotification).not.toHaveBeenCalled();
  });

  it("respects an explicit channels override and records unavailable ones as skipped", async () => {
    const email = { key: "email" as const, send: vi.fn(async () => ({ status: "sent" as const })) };
    const deps = baseDeps({ email });

    const outcome = await dispatchNotification(
      {
        recipient,
        type: "system.test",
        payload: {},
        channels: ["email", "push"],
      },
      deps
    );

    expect(email.send).toHaveBeenCalledTimes(1);
    expect(outcome.results.email).toEqual({ status: "sent" });
    expect(outcome.results.push).toEqual({ status: "skipped", reason: "channel_unavailable" });
  });

  it("registered type keys used in tests exist in the real registry (sanity check)", () => {
    expect(NOTIFICATION_TYPES["plans.daily_reminder"]).toBeDefined();
    expect(NOTIFICATION_TYPES["system.test"]).toBeDefined();
  });
});
