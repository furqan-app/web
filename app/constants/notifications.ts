/**
 * Notification type registry (ADR 0037).
 *
 * Types are typed TS constants (like MARK_CATEGORIES/PLAN_TEMPLATES) — never
 * DB rows. Adding a new notification type is a new entry here; dispatch.ts
 * never needs to change (Open/Closed).
 */

import { escapeHtml } from "@/app/lib/notifications/html";

// The channel registry (app/lib/notifications/channels/registry.ts) is the
// single source of truth for which channels actually exist at runtime; this
// is a type-only enumeration of the possible keys, not a second list.
export type NotificationChannelKey = "in_app" | "push" | "email";

export type NotificationContent = {
  title: string;
  body: string;
  url?: string;
};

export type NotificationEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type RenderContext = {
  locale: string;
  /** `t("key", "fallback")` — dot-path lookup against messages/<locale>.json, with `{{var}}` interpolation. */
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
};

export type NotificationTypeDef<P = unknown> = {
  key: string;
  /** Channels used when the caller doesn't request specific ones. */
  defaultChannels: NotificationChannelKey[];
  /** Used for in_app + push (title/body/url). */
  render: (payload: P, ctx: RenderContext) => NotificationContent;
  /** Used for email. Falls back to a generic text/html shell built from `render` when absent. */
  renderEmail?: (payload: P, ctx: RenderContext) => NotificationEmailContent;
};

export type PlanDailyReminderPayload = {
  planId: number;
  templateKey: string;
  templateLabel: string;
};

export type SystemTestPayload = {
  message?: string;
};

export const NOTIFICATION_TYPES: Record<string, NotificationTypeDef> = {
  "plans.daily_reminder": {
    key: "plans.daily_reminder",
    defaultChannels: ["in_app", "push"],
    render: (payload: PlanDailyReminderPayload, { t }) => ({
      title: t("notifications.types.plansDailyReminder.title", "Time for your daily wird"),
      body: t(
        "notifications.types.plansDailyReminder.body",
        "Your {{template}} assignment for today is ready.",
        { template: payload.templateLabel }
      ),
      url: "/plans",
    }),
  } satisfies NotificationTypeDef<PlanDailyReminderPayload> as NotificationTypeDef,

  "system.test": {
    key: "system.test",
    defaultChannels: ["in_app", "push", "email"],
    render: (payload: SystemTestPayload, { t }) => ({
      title: t("notifications.types.systemTest.title", "Test notification"),
      body: payload.message ?? t("notifications.types.systemTest.body", "This is a test notification."),
      url: "/",
    }),
    renderEmail: (payload: SystemTestPayload, { t }) => {
      const body = payload.message ?? t("notifications.types.systemTest.body", "This is a test notification.");
      return {
        subject: t("notifications.types.systemTest.title", "Test notification"),
        text: body,
        html: `<p>${escapeHtml(body)}</p>`,
      };
    },
  } satisfies NotificationTypeDef<SystemTestPayload> as NotificationTypeDef,
};

export const getNotificationType = (key: string): NotificationTypeDef | null =>
  NOTIFICATION_TYPES[key] ?? null;
