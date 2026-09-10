import { describe, expect, it, vi } from "vitest";
import {
  computeInitialScheduledFor,
  getDailyWirdReminder,
  setDailyWirdReminder,
  cancelDailyWirdReminder,
} from "@/app/lib/notifications/wird-reminder";
import type { NotificationStore, ScheduledReminderRow } from "@/app/lib/notifications/types";

describe("wird-reminder service", () => {
  describe("computeInitialScheduledFor", () => {
    it("schedules for today when local time is in the future today", () => {
      // Cairo is UTC+3 (no DST in this date or standard)
      // Now: 06:00 UTC = 09:00 Cairo
      const now = new Date("2026-09-11T06:00:00Z");
      // Target time: 10:00 local Cairo time (future)
      const scheduled = computeInitialScheduledFor("10:00", "Africa/Cairo", now);

      expect(scheduled.toISOString()).toBe("2026-09-11T07:00:00.000Z");
      expect(scheduled.getTime()).toBeGreaterThan(now.getTime());
    });

    it("rolls over to tomorrow when local time has already passed today", () => {
      // Cairo: Now is 11:00 UTC = 14:00 Cairo
      const now = new Date("2026-09-11T11:00:00Z");
      // Target time: 08:30 Cairo time (already passed today)
      const scheduled = computeInitialScheduledFor("08:30", "Africa/Cairo", now);

      expect(scheduled.toISOString()).toBe("2026-09-12T05:30:00.000Z");
      expect(scheduled.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe("setDailyWirdReminder and getDailyWirdReminder", () => {
    it("upserts scheduled reminder with daily_reminder dedupe key and fetches preference", async () => {
      let storedRow: ScheduledReminderRow | null = null;

      const mockStore = {
        upsertScheduledReminder: vi.fn(async (input) => {
          storedRow = {
            id: 42,
            user_id: input.userId,
            type: input.type,
            payload: input.payload,
            channels: input.channels ?? null,
            scheduled_for: input.scheduledFor,
            recurrence: input.recurrence ?? null,
            timezone: input.timezone ?? null,
            locale: input.locale ?? null,
            status: "pending",
          };
          return { id: 42 };
        }),
        getScheduledReminderByDedupeKey: vi.fn(async (dedupeKey: string) => {
          if (storedRow && `plans.daily_reminder:${storedRow.user_id}` === dedupeKey) {
            return storedRow;
          }
          return null;
        }),
        cancelScheduledReminder: vi.fn(async (dedupeKey: string) => {
          if (storedRow && `plans.daily_reminder:${storedRow.user_id}` === dedupeKey) {
            storedRow.status = "cancelled";
          }
        }),
      } as unknown as NotificationStore;

      const clock = () => new Date("2026-09-11T05:00:00Z");

      // 1. Initially disabled
      const initial = await getDailyWirdReminder(1, mockStore);
      expect(initial.enabled).toBe(false);

      // 2. Set reminder
      const result = await setDailyWirdReminder(
        {
          userId: 1,
          time: "08:30",
          timezone: "Africa/Cairo",
          locale: "ar",
        },
        mockStore,
        clock
      );

      expect(result.id).toBe(42);
      expect(mockStore.upsertScheduledReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: "plans.daily_reminder",
          dedupeKey: "plans.daily_reminder:1",
          recurrence: "daily",
          timezone: "Africa/Cairo",
          locale: "ar",
          channels: ["in_app", "push"],
          payload: { time: "08:30" },
        })
      );

      // 3. Fetch active preference
      const active = await getDailyWirdReminder(1, mockStore);
      expect(active.enabled).toBe(true);
      expect(active.time).toBe("08:30");
      expect(active.timezone).toBe("Africa/Cairo");
      expect(active.locale).toBe("ar");

      // 4. Cancel reminder
      await cancelDailyWirdReminder(1, mockStore);
      expect(mockStore.cancelScheduledReminder).toHaveBeenCalledWith("plans.daily_reminder:1");

      // 5. Fetch after cancel
      const cancelled = await getDailyWirdReminder(1, mockStore);
      expect(cancelled.enabled).toBe(false);
      expect(cancelled.time).toBe("08:30");
    });
  });
});
