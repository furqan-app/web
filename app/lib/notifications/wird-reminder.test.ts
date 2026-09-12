import { describe, expect, it, vi } from "vitest";
import {
  computeInitialScheduledFor,
  getDailyWirdReminders,
  setGeneralWirdReminder,
  cancelGeneralWirdReminder,
  cancelAllGeneralWirdReminders,
  setDedicatedWirdReminder,
  cancelDedicatedWirdReminder,
  MAX_GENERAL_WIRD_REMINDERS,
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

  describe("multi-slot general reminders", () => {
    it("allows up to 3 general reminder slots and throws if slot > 3", async () => {
      const storedRows: Map<string, ScheduledReminderRow> = new Map();

      const mockStore = {
        upsertScheduledReminder: vi.fn(async (input) => {
          const row: ScheduledReminderRow = {
            id: storedRows.size + 1,
            user_id: input.userId,
            type: input.type,
            payload: input.payload,
            channels: input.channels ?? null,
            scheduled_for: input.scheduledFor,
            recurrence: input.recurrence ?? null,
            timezone: input.timezone ?? null,
            locale: input.locale ?? null,
            status: "pending",
            dedupe_key: input.dedupeKey ?? null,
          };
          storedRows.set(input.dedupeKey!, row);
          return { id: row.id };
        }),
        listScheduledRemindersForUser: vi.fn(async (userId: number) => {
          return Array.from(storedRows.values()).filter(
            (r) => r.user_id === userId && r.status === "pending"
          );
        }),
        cancelScheduledReminder: vi.fn(async (dedupeKey: string) => {
          const row = storedRows.get(dedupeKey);
          if (row) row.status = "cancelled";
        }),
      } as unknown as NotificationStore;

      const clock = () => new Date("2026-09-11T05:00:00Z");

      // 1. Set slot 1
      await setGeneralWirdReminder(
        { userId: 1, slot: 1, time: "08:00", timezone: "Africa/Cairo", locale: "ar" },
        mockStore,
        clock
      );
      expect(mockStore.upsertScheduledReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          dedupeKey: "plans.daily_reminder:1:slot:1",
          channels: ["push"],
        })
      );

      // 2. Set slot 2
      await setGeneralWirdReminder(
        { userId: 1, slot: 2, time: "14:00", timezone: "Africa/Cairo", locale: "ar" },
        mockStore,
        clock
      );

      // 3. Set slot 3
      await setGeneralWirdReminder(
        { userId: 1, slot: 3, time: "20:00", timezone: "Africa/Cairo", locale: "ar" },
        mockStore,
        clock
      );

      // 4. Invalid or out-of-range slots throw
      await expect(
        setGeneralWirdReminder(
          { userId: 1, slot: 4, time: "22:00", timezone: "Africa/Cairo", locale: "ar" },
          mockStore,
          clock
        )
      ).rejects.toThrow(`Reminder slot must be between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`);

      await expect(
        setGeneralWirdReminder(
          { userId: 1, slot: 1.5, time: "22:00", timezone: "Africa/Cairo", locale: "ar" },
          mockStore,
          clock
        )
      ).rejects.toThrow(`Reminder slot must be between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`);

      await expect(
        setGeneralWirdReminder(
          { userId: 1, slot: NaN, time: "22:00", timezone: "Africa/Cairo", locale: "ar" },
          mockStore,
          clock
        )
      ).rejects.toThrow(`Reminder slot must be between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`);

      await expect(cancelGeneralWirdReminder(1, 1.5, mockStore)).rejects.toThrow(
        `Reminder slot must be between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`
      );
      await expect(cancelGeneralWirdReminder(1, NaN, mockStore)).rejects.toThrow(
        `Reminder slot must be between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`
      );

      // 5. Query active preferences
      const prefs = await getDailyWirdReminders(1, mockStore);
      expect(prefs.enabled).toBe(true);
      expect(prefs.general).toHaveLength(3);
      expect(prefs.general.map((g) => g.time)).toEqual(["08:00", "14:00", "20:00"]);

      // 6. Cancel slot 2
      await cancelGeneralWirdReminder(1, 2, mockStore);
      const afterCancel = await getDailyWirdReminders(1, mockStore);
      expect(afterCancel.general).toHaveLength(2);
      expect(afterCancel.general.map((g) => g.slot)).toEqual([1, 3]);

      // 7. Cancel all general reminders
      await cancelAllGeneralWirdReminders(1, mockStore);
      const afterCancelAll = await getDailyWirdReminders(1, mockStore);
      expect(afterCancelAll.enabled).toBe(false);
      expect(afterCancelAll.general).toHaveLength(0);
    });
  });

  describe("dedicated per-wird reminders", () => {
    it("sets and cancels dedicated reminder independently", async () => {
      const storedRows: Map<string, ScheduledReminderRow> = new Map();

      const mockStore = {
        upsertScheduledReminder: vi.fn(async (input) => {
          const row: ScheduledReminderRow = {
            id: storedRows.size + 1,
            user_id: input.userId,
            type: input.type,
            payload: input.payload,
            channels: input.channels ?? null,
            scheduled_for: input.scheduledFor,
            recurrence: input.recurrence ?? null,
            timezone: input.timezone ?? null,
            locale: input.locale ?? null,
            status: "pending",
            dedupe_key: input.dedupeKey ?? null,
          };
          storedRows.set(input.dedupeKey!, row);
          return { id: row.id };
        }),
        listScheduledRemindersForUser: vi.fn(async (userId: number) => {
          return Array.from(storedRows.values()).filter(
            (r) => r.user_id === userId && r.status === "pending"
          );
        }),
        cancelScheduledReminder: vi.fn(async (dedupeKey: string) => {
          const row = storedRows.get(dedupeKey);
          if (row) row.status = "cancelled";
        }),
      } as unknown as NotificationStore;

      const clock = () => new Date("2026-09-11T05:00:00Z");

      // Set dedicated reminder for plan 42
      const res = await setDedicatedWirdReminder(
        { userId: 1, planId: 42, time: "21:30", timezone: "Africa/Cairo", locale: "ar" },
        mockStore,
        clock
      );
      expect(res.planId).toBe(42);
      expect(mockStore.upsertScheduledReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          dedupeKey: "plans.daily_reminder:1:plan:42",
          payload: { time: "21:30", planId: 42 },
          channels: ["push"],
        })
      );

      const prefs = await getDailyWirdReminders(1, mockStore);
      expect(prefs.dedicated).toHaveLength(1);
      expect(prefs.dedicated[0]).toMatchObject({
        planId: 42,
        time: "21:30",
      });

      // Cancel dedicated reminder
      await cancelDedicatedWirdReminder(1, 42, mockStore);
      expect(mockStore.cancelScheduledReminder).toHaveBeenCalledWith("plans.daily_reminder:1:plan:42");

      const afterCancel = await getDailyWirdReminders(1, mockStore);
      expect(afterCancel.dedicated).toHaveLength(0);
    });
  });

  describe("legacy migration backward compatibility", () => {
    it("recognizes legacy plans.daily_reminder:<userId> key as slot 1", async () => {
      const legacyRow: ScheduledReminderRow = {
        id: 99,
        user_id: 1,
        type: "plans.daily_reminder",
        payload: { time: "09:15" },
        channels: ["push"],
        scheduled_for: new Date("2026-09-11T06:15:00Z"),
        recurrence: "daily",
        timezone: "Africa/Cairo",
        locale: "ar",
        status: "pending",
        dedupe_key: "plans.daily_reminder:1",
      };

      const mockStore = {
        listScheduledRemindersForUser: vi.fn(async () => [legacyRow]),
        cancelScheduledReminder: vi.fn(),
      } as unknown as NotificationStore;

      const prefs = await getDailyWirdReminders(1, mockStore);
      expect(prefs.enabled).toBe(true);
      expect(prefs.general).toHaveLength(1);
      expect(prefs.general[0].slot).toBe(1);
      expect(prefs.general[0].time).toBe("09:15");
    });
  });
});
