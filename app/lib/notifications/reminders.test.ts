import { describe, expect, it } from "vitest";
import { isDue, nextOccurrence } from "@/app/lib/notifications/reminders";

describe("nextOccurrence", () => {
  it("advances non-daily recurrence not at all (returns scheduledFor unchanged)", () => {
    const d = new Date("2026-08-03T06:00:00Z");
    expect(nextOccurrence(d, null, "UTC", d).getTime()).toBe(d.getTime());
  });

  it("advances exactly 24h in a fixed-offset timezone (no DST) when now is before that", () => {
    const d = new Date("2026-08-03T06:00:00Z"); // 09:00 in Africa/Cairo (UTC+3, no DST)
    const next = nextOccurrence(d, "daily", "Africa/Cairo", d);
    expect(next.getTime() - d.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("preserves local wall-clock time across a US DST fall-back boundary", () => {
    // 2026-11-01 02:00 local in America/New_York is the fall-back morning (DST ends 2026-11-01 02:00 -> 01:00).
    // Pick a reminder the day before at 09:00 local and confirm the next occurrence is still 09:00 local.
    const before = new Date("2026-10-31T13:00:00Z"); // 09:00 EDT (UTC-4)
    const next = nextOccurrence(before, "daily", "America/New_York", before);

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = formatter.formatToParts(next).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    expect(`${parts.hour}:${parts.minute}`).toBe("09:00");
  });

  it("catches up past a multi-day cron outage instead of re-firing in the past", () => {
    const scheduledFor = new Date("2026-08-01T06:00:00Z");
    const now = new Date("2026-08-04T10:00:00Z"); // 3+ days later — outage longer than 24h
    const next = nextOccurrence(scheduledFor, "daily", "UTC", now);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
    // Still lands on the original 06:00 UTC time-of-day, just a later day.
    expect(next.getUTCHours()).toBe(6);
  });

  it("degrades to UTC instead of throwing on an invalid timezone", () => {
    const d = new Date("2026-08-03T06:00:00Z");
    expect(() => nextOccurrence(d, "daily", "Not/ARealZone", d)).not.toThrow();
  });
});

describe("isDue", () => {
  it("is due when scheduledFor is exactly now", () => {
    const now = new Date("2026-08-03T06:00:00Z");
    expect(isDue(now, now)).toBe(true);
  });

  it("is due when scheduledFor is in the past", () => {
    const now = new Date("2026-08-03T06:00:00Z");
    const scheduledFor = new Date(now.getTime() - 1000);
    expect(isDue(scheduledFor, now)).toBe(true);
  });

  it("is not due when scheduledFor is in the future", () => {
    const now = new Date("2026-08-03T06:00:00Z");
    const scheduledFor = new Date(now.getTime() + 1000);
    expect(isDue(scheduledFor, now)).toBe(false);
  });
});
