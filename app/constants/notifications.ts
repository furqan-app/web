/**
 * Notification type registry (ADR 0037).
 *
 * Types are typed TS constants (like MARK_CATEGORIES/PLAN_TEMPLATES) — never
 * DB rows. Adding a new notification type is a new entry here; dispatch.ts
 * never needs to change (Open/Closed).
 */

import { escapeHtml } from "@/app/lib/notifications/html";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { formatRawVerseKey } from "@/app/lib/plans/ui-helpers";

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
  /** Plural-aware category lookup against an object { zero, one, two, few, many, other }. */
  tPlural: (
    key: string,
    count: number,
    fallback: string,
    vars?: Record<string, string | number>
  ) => string;
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
  pendingCount: number;
  primary: {
    unit: "page" | "verse";
    rangeStart: number;
    rangeEnd: number;
    startVerseKey?: string; // e.g. "4:23"
    endVerseKey?: string;   // e.g. "4:60"
  } | null;
  targetPage: number | null; // mushaf page (1–604) for single-assignment deep link, null if multiple/ambiguous
  targetUrlKind: "page" | "plans";
};

export type SystemTestPayload = {
  message?: string;
};

export const NOTIFICATION_TYPES: Record<string, NotificationTypeDef> = {
  "plans.daily_reminder": {
    key: "plans.daily_reminder",
    defaultChannels: ["in_app", "push"],
    render: (payload: PlanDailyReminderPayload, ctx: RenderContext) => {
      const { t, tPlural, locale } = ctx;
      const title = t("notifications.types.plansDailyReminder.title", "Daily Wird");
      const url =
        payload.targetUrlKind === "page" && payload.targetPage
          ? `/${locale}/pages/${payload.targetPage}`
          : `/${locale}/plans`;

      const count = payload.pendingCount ?? 1;

      let body = "";
      if (count > 1 || !payload.primary) {
        body = tPlural(
          "notifications.types.plansDailyReminder.multipleTasks",
          count,
          "You have {{n}} tasks remaining in today's wird",
          { n: toLocaleNumeral(count, ctx.locale) }
        );
      } else if (payload.primary.unit === "page") {
        const pageCount = payload.primary.rangeEnd - payload.primary.rangeStart + 1;
        body = tPlural(
          "notifications.types.plansDailyReminder.singlePage",
          pageCount,
          "Today's wird: {{n}} pages (p. {{start}} to p. {{end}})",
          {
            n: toLocaleNumeral(pageCount, locale),
            start: toLocaleNumeral(payload.primary.rangeStart, locale),
            end: toLocaleNumeral(payload.primary.rangeEnd, locale),
          }
        );
      } else {
        // Verse unit
        const startFmt = payload.primary.startVerseKey
          ? formatRawVerseKey(payload.primary.startVerseKey, locale)
          : toLocaleNumeral(payload.primary.rangeStart, locale);
        const endFmt = payload.primary.endVerseKey
          ? formatRawVerseKey(payload.primary.endVerseKey, locale)
          : toLocaleNumeral(payload.primary.rangeEnd, locale);

        if (payload.primary.rangeStart === payload.primary.rangeEnd) {
          body = t(
            "notifications.types.plansDailyReminder.singleVerseOne",
            "Today's wird: verse {{verse}}",
            { verse: startFmt }
          );
        } else {
          body = t(
            "notifications.types.plansDailyReminder.singleVerseRange",
            "Today's wird: verses {{range}}",
            { range: `${startFmt}–${endFmt}` }
          );
        }
      }

      return { title, body, url };
    },
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
