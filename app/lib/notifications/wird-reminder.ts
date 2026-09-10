import type { Clock, NotificationStore } from "@/app/lib/notifications/types";
import { nextOccurrence } from "@/app/lib/notifications/reminders";

export type WirdReminderPreference = {
  enabled: boolean;
  time: string; // "HH:MM" (15-minute boundary: "08:00", "08:15", etc.)
  timezone: string;
  locale: string;
  scheduledFor: Date | null;
};

export type SetWirdReminderInput = {
  userId: number;
  time: string; // "HH:MM"
  timezone: string;
  locale: string;
};

const toSafeTimeZone = (timeZone: string): string => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
};

const getTimezoneOffsetMs = (date: Date, timeZone: string): number => {
  const safeTz = toSafeTimeZone(timeZone);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
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

// Note on DST spring-forward transitions: during an annual spring-forward jump
// (e.g. Africa/Cairo skipping 00:00 to 01:00, both in TIME_OPTIONS), nonexistent
// wall-clock times silently resolve to the shifted UTC instant (firing ~1h offset
// on that single day). This is standard across IANA offset arithmetic and acceptable.
export const computeInitialScheduledFor = (
  time: string,
  timeZone: string,
  now: Date
): Date => {
  const safeTz = toSafeTimeZone(timeZone);
  const [hourStr, minStr] = time.split(":");
  const targetHour = parseInt(hourStr, 10);
  const targetMinute = parseInt(minStr, 10);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(now).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const targetAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    targetHour,
    targetMinute,
    0
  );

  const naive = new Date(targetAsUtc);
  const offset = getTimezoneOffsetMs(naive, safeTz);
  let seedDate = new Date(targetAsUtc - offset);
  const offsetRefined = getTimezoneOffsetMs(seedDate, safeTz);
  if (offsetRefined !== offset) {
    seedDate = new Date(targetAsUtc - offsetRefined);
  }

  if (seedDate.getTime() >= now.getTime()) {
    return seedDate;
  }
  return nextOccurrence(seedDate, "daily", safeTz, now);
};

export async function getDailyWirdReminder(
  userId: number,
  store: NotificationStore
): Promise<WirdReminderPreference> {
  const dedupeKey = `plans.daily_reminder:${userId}`;
  const row = await store.getScheduledReminderByDedupeKey(dedupeKey);

  if (!row) {
    return {
      enabled: false,
      time: "08:00",
      timezone: "",
      locale: "ar",
      scheduledFor: null,
    };
  }

  const payload = row.payload as { time?: string } | null;
  const isPending = row.status === "pending";

  return {
    enabled: isPending,
    time: payload?.time ?? "08:00",
    timezone: row.timezone ?? "",
    locale: row.locale ?? "ar",
    scheduledFor: isPending ? row.scheduled_for : null,
  };
}

export async function setDailyWirdReminder(
  input: SetWirdReminderInput,
  store: NotificationStore,
  clock: Clock = () => new Date()
): Promise<{ id: number; scheduledFor: Date }> {
  const now = clock();
  const scheduledFor = computeInitialScheduledFor(input.time, input.timezone, now);
  const dedupeKey = `plans.daily_reminder:${input.userId}`;

  const result = await store.upsertScheduledReminder({
    userId: input.userId,
    type: "plans.daily_reminder",
    payload: { time: input.time },
    channels: ["in_app", "push"],
    scheduledFor,
    recurrence: "daily",
    timezone: input.timezone,
    locale: input.locale,
    dedupeKey,
  });

  return { id: result.id, scheduledFor };
}

export async function cancelDailyWirdReminder(
  userId: number,
  store: NotificationStore
): Promise<void> {
  const dedupeKey = `plans.daily_reminder:${userId}`;
  await store.cancelScheduledReminder(dedupeKey);
}
