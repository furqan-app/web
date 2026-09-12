import type { Clock, NotificationStore } from "@/app/lib/notifications/types";
import { nextOccurrence } from "@/app/lib/notifications/reminders";
import { MAX_GENERAL_WIRD_REMINDERS } from "@/app/constants/notifications";

export { MAX_GENERAL_WIRD_REMINDERS };

export type GeneralWirdReminderSlot = {
  id: number;
  slot: number;
  time: string; // "HH:MM" (15-minute boundary)
  timezone: string;
  locale: string;
  scheduledFor: Date | null;
};

export type DedicatedWirdReminder = {
  id: number;
  planId: number;
  time: string; // "HH:MM"
  timezone: string;
  locale: string;
  scheduledFor: Date | null;
};

export type MultiWirdReminderPreference = {
  general: GeneralWirdReminderSlot[];
  dedicated: DedicatedWirdReminder[];
  enabled: boolean;
  time: string; // Primary time (slot 1) or fallback
  timezone: string;
  locale: string;
};

export type SetGeneralWirdReminderInput = {
  userId: number;
  slot?: number;
  time: string; // "HH:MM"
  timezone: string;
  locale: string;
};

export type SetDedicatedWirdReminderInput = {
  userId: number;
  planId: number;
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

export async function getDailyWirdReminders(
  userId: number,
  store: NotificationStore
): Promise<MultiWirdReminderPreference> {
  const rows = await store.listScheduledRemindersForUser(userId, "plans.daily_reminder");

  const general: GeneralWirdReminderSlot[] = [];
  const dedicated: DedicatedWirdReminder[] = [];
  let legacySlot1Row: (typeof rows)[0] | null = null;

  for (const row of rows) {
    const key = row.dedupe_key ?? "";
    const slotMatch = key.match(/^plans\.daily_reminder:\d+:slot:(\d+)$/);
    if (slotMatch) {
      const slot = Number(slotMatch[1]);
      const payload = row.payload as { time?: string } | null;
      general.push({
        id: row.id,
        slot,
        time: payload?.time ?? "08:00",
        timezone: row.timezone ?? "",
        locale: row.locale ?? "ar",
        scheduledFor: row.status === "pending" ? row.scheduled_for : null,
      });
      continue;
    }

    const planMatch = key.match(/^plans\.daily_reminder:\d+:plan:(\d+)$/);
    if (planMatch) {
      const planId = Number(planMatch[1]);
      const payload = row.payload as { time?: string } | null;
      dedicated.push({
        id: row.id,
        planId,
        time: payload?.time ?? "08:00",
        timezone: row.timezone ?? "",
        locale: row.locale ?? "ar",
        scheduledFor: row.status === "pending" ? row.scheduled_for : null,
      });
      continue;
    }

    // Legacy single-reminder row from #620: plans.daily_reminder:<userId>
    if (key === `plans.daily_reminder:${userId}`) {
      legacySlot1Row = row;
    }
  }

  // If a legacy row exists and slot 1 was not found in slot-format, treat it as slot 1
  if (legacySlot1Row && !general.some((g) => g.slot === 1)) {
    const payload = legacySlot1Row.payload as { time?: string } | null;
    general.push({
      id: legacySlot1Row.id,
      slot: 1,
      time: payload?.time ?? "08:00",
      timezone: legacySlot1Row.timezone ?? "",
      locale: legacySlot1Row.locale ?? "ar",
      scheduledFor: legacySlot1Row.status === "pending" ? legacySlot1Row.scheduled_for : null,
    });
  }

  general.sort((a, b) => a.slot - b.slot);
  dedicated.sort((a, b) => a.planId - b.planId);

  const primary = general[0] ?? dedicated[0];
  const enabled = general.length > 0 || dedicated.length > 0;

  return {
    general,
    dedicated,
    enabled,
    time: primary?.time ?? "08:00",
    timezone: primary?.timezone ?? "",
    locale: primary?.locale ?? "ar",
  };
}

export async function setGeneralWirdReminder(
  input: SetGeneralWirdReminderInput,
  store: NotificationStore,
  clock: Clock = () => new Date()
): Promise<{ id: number; scheduledFor: Date; slot: number }> {
  const slot = input.slot ?? 1;
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > MAX_GENERAL_WIRD_REMINDERS) {
    throw new Error(`Reminder slot must be between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`);
  }

  const now = clock();
  const scheduledFor = computeInitialScheduledFor(input.time, input.timezone, now);
  const dedupeKey = `plans.daily_reminder:${input.userId}:slot:${slot}`;

  const result = await store.upsertScheduledReminder({
    userId: input.userId,
    type: "plans.daily_reminder",
    payload: { time: input.time, slot },
    channels: ["push"],
    scheduledFor,
    recurrence: "daily",
    timezone: input.timezone,
    locale: input.locale,
    dedupeKey,
  });

  // If slot 1 is being set, also cancel any legacy single-reminder row to prevent duplicates
  if (slot === 1) {
    await store.cancelScheduledReminder(`plans.daily_reminder:${input.userId}`);
  }

  return { id: result.id, scheduledFor, slot };
}

export async function cancelGeneralWirdReminder(
  userId: number,
  slot: number,
  store: NotificationStore
): Promise<void> {
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > MAX_GENERAL_WIRD_REMINDERS) {
    throw new Error(`Reminder slot must be between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`);
  }
  const dedupeKey = `plans.daily_reminder:${userId}:slot:${slot}`;
  await store.cancelScheduledReminder(dedupeKey);
  if (slot === 1) {
    await store.cancelScheduledReminder(`plans.daily_reminder:${userId}`);
  }
}

export async function cancelAllGeneralWirdReminders(
  userId: number,
  store: NotificationStore
): Promise<void> {
  for (let slot = 1; slot <= MAX_GENERAL_WIRD_REMINDERS; slot++) {
    await store.cancelScheduledReminder(`plans.daily_reminder:${userId}:slot:${slot}`);
  }
  await store.cancelScheduledReminder(`plans.daily_reminder:${userId}`);
}

export async function setDedicatedWirdReminder(
  input: SetDedicatedWirdReminderInput,
  store: NotificationStore,
  clock: Clock = () => new Date()
): Promise<{ id: number; scheduledFor: Date; planId: number }> {
  const now = clock();
  const scheduledFor = computeInitialScheduledFor(input.time, input.timezone, now);
  const dedupeKey = `plans.daily_reminder:${input.userId}:plan:${input.planId}`;

  const result = await store.upsertScheduledReminder({
    userId: input.userId,
    type: "plans.daily_reminder",
    payload: { time: input.time, planId: input.planId },
    channels: ["push"],
    scheduledFor,
    recurrence: "daily",
    timezone: input.timezone,
    locale: input.locale,
    dedupeKey,
  });

  return { id: result.id, scheduledFor, planId: input.planId };
}

export async function cancelDedicatedWirdReminder(
  userId: number,
  planId: number,
  store: NotificationStore
): Promise<void> {
  const dedupeKey = `plans.daily_reminder:${userId}:plan:${planId}`;
  await store.cancelScheduledReminder(dedupeKey);
}
