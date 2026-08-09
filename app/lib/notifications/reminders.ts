import type { NotificationChannelKey } from "@/app/constants/notifications";
import type { NotificationStore } from "@/app/lib/notifications/types";

const DAY_MS = 24 * 60 * 60 * 1000;

// A timezone string past this many single-day advances is treated as
// pathological rather than looped forever — 5 years of daily catch-up.
const MAX_ADVANCE_STEPS = 365 * 5;

/** `timezone` is client-supplied (see ScheduledNotification.timezone) — an invalid IANA name must degrade to UTC, not throw. */
const toSafeTimeZone = (timeZone: string): string => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
};

const getTimezoneOffsetMs = (date: Date, timeZone: string): number => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: toSafeTimeZone(timeZone),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
};

/** One day forward, preserving the same local wall-clock time in `timeZone` (DST-corrected). */
const advanceOneDay = (from: Date, timeZone: string): Date => {
  const offsetBefore = getTimezoneOffsetMs(from, timeZone);
  const naiveNext = new Date(from.getTime() + DAY_MS);
  const offsetAfter = getTimezoneOffsetMs(naiveNext, timeZone);
  const dstCorrection = offsetAfter - offsetBefore;
  return new Date(naiveNext.getTime() - dstCorrection);
};

/**
 * Pure: the next `daily`-recurrence instant that preserves the same local
 * wall-clock time in `timezone`, correcting for DST — and is strictly after
 * `now`. A single `scheduledFor + 1 day` is not enough: after a cron outage
 * longer than 24h, that would still land in the past and the reminder would
 * re-fire on every subsequent poll until it caught up. Non-"daily" recurrence
 * (including null/one-shot) returns `scheduledFor` unchanged — callers only
 * advance recurring reminders.
 */
export const nextOccurrence = (
  scheduledFor: Date,
  recurrence: string | null,
  timezone: string | null,
  now: Date
): Date => {
  if (recurrence !== "daily") return scheduledFor;

  const tz = timezone ?? "UTC";
  let next = advanceOneDay(scheduledFor, tz);
  let steps = 0;
  while (next.getTime() <= now.getTime() && steps < MAX_ADVANCE_STEPS) {
    next = advanceOneDay(next, tz);
    steps++;
  }
  return next;
};

/** Pure: is this reminder due at `now`? */
export const isDue = (scheduledFor: Date, now: Date): boolean => scheduledFor.getTime() <= now.getTime();

export const scheduleReminder = (
  store: NotificationStore,
  input: {
    userId: number;
    type: string;
    payload: unknown;
    channels?: NotificationChannelKey[];
    scheduledFor: Date;
    recurrence?: "daily" | null;
    timezone?: string | null;
    dedupeKey?: string;
  }
) => store.upsertScheduledReminder(input);
