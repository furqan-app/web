import { describe, expect, it, vi } from "vitest";
import { resolveDailyWirdDispatch } from "@/app/lib/notifications/wird-reminder-resolver";
import type { AppPrismaClient } from "@/app/utils/db";
import { pageOfVerse, verseKeyOfOrdinal } from "@/app/lib/plans/verse-index";

import { getEnrollmentTemplate, type UserPlanParams } from "@/app/constants/plans";
import { deriveAssignments, type ProgressLogEntry } from "@/app/lib/plans/engine";
import { toLocalDateString } from "@/app/lib/notifications/wird-reminder-resolver";

describe("resolveDailyWirdDispatch", () => {
  const date = new Date("2026-09-11T08:30:00Z");
  const timezone = "UTC";

  it("returns shouldSend: false with reason 'no_active_plans' when user has no active plans", async () => {
    const mockPrisma = {
      userPlan: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as AppPrismaClient;

    const res = await resolveDailyWirdDispatch(1, timezone, date, mockPrisma);
    expect(res).toEqual({ shouldSend: false, reason: "no_active_plans" });
  });

  it("returns shouldSend: false with reason 'all_completed' when today's tasks are completed", async () => {
    const plan = {
      id: 10,
      user_id: 1,
      template_key: "daily-wird",
      params: {},
      progress: [
        {
          track_key: "reading",
          date: new Date("2026-09-11T00:00:00Z"),
          range_start: "1",
          range_end: "5",
        },
      ],
    };

    const template = getEnrollmentTemplate(plan);
    expect(template).toBeDefined();
    const localDate = toLocalDateString(date, timezone);
    const entries: ProgressLogEntry[] = plan.progress.map((p) => ({
      track_key: p.track_key,
      date: p.date.toISOString().slice(0, 10),
      range_start: String(p.range_start),
      range_end: String(p.range_end),
    }));
    const assignments = deriveAssignments(template!, plan.params as UserPlanParams, entries, localDate);
    expect(assignments.length).toBeGreaterThan(0);
    expect(assignments.every((a) => a.completed)).toBe(true);

    const mockPrisma = {
      userPlan: {
        findMany: vi.fn().mockResolvedValue([plan]),
      },
    } as unknown as AppPrismaClient;

    const res = await resolveDailyWirdDispatch(1, timezone, date, mockPrisma);
    expect(res).toEqual({ shouldSend: false, reason: "all_completed" });
  });

  it("generates structured payload for a single pending page-unit assignment with deep link targetPage", async () => {
    const mockPrisma = {
      userPlan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 10,
            user_id: 1,
            template_key: "daily-wird",
            params: { startPage: 25, quantities: { reading: 2 } },
            progress: [],
          },
        ]),
      },
    } as unknown as AppPrismaClient;

    const res = await resolveDailyWirdDispatch(1, timezone, date, mockPrisma);
    expect(res.shouldSend).toBe(true);
    if (!res.shouldSend) return;

    expect(res.payload).toEqual({
      pendingCount: 1,
      primary: {
        unit: "page",
        rangeStart: 25,
        rangeEnd: 26,
        startVerseKey: undefined,
        endVerseKey: undefined,
      },
      targetPage: 25,
      targetUrlKind: "page",
    });
  });

  it("resolves targetPage and verse keys for a single pending verse-unit assignment", async () => {
    const mockPrisma = {
      userPlan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 10,
            user_id: 1,
            template_key: "daily-wird",
            params: {
              trackUnits: { reading: "verse" },
              startPage: 100,
              quantities: { reading: 5 },
            },
            progress: [],
          },
        ]),
      },
    } as unknown as AppPrismaClient;

    const res = await resolveDailyWirdDispatch(1, timezone, date, mockPrisma);
    expect(res.shouldSend).toBe(true);
    if (!res.shouldSend) return;

    expect(res.payload.pendingCount).toBe(1);
    expect(res.payload.primary?.unit).toBe("verse");
    expect(res.payload.primary?.rangeStart).toBeDefined();

    const rangeStart = res.payload.primary!.rangeStart;
    const rangeEnd = res.payload.primary!.rangeEnd;
    expect(res.payload.targetPage).toBe(pageOfVerse(rangeStart));
    expect(res.payload.primary?.startVerseKey).toBe(verseKeyOfOrdinal(rangeStart));
    expect(res.payload.primary?.endVerseKey).toBe(verseKeyOfOrdinal(rangeEnd));
    expect(res.payload.targetUrlKind).toBe("page");
  });

  it("returns targetPage: null and targetUrlKind: 'plans' when multiple assignments are pending", async () => {
    const mockPrisma = {
      userPlan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 10,
            user_id: 1,
            template_key: "daily-wird",
            params: { quantities: { reading: 5 } },
            progress: [],
          },
          {
            id: 11,
            user_id: 1,
            template_key: "daily-wird",
            params: { quantities: { reading: 3 } },
            progress: [],
          },
        ]),
      },
    } as unknown as AppPrismaClient;

    const res = await resolveDailyWirdDispatch(1, timezone, date, mockPrisma);
    expect(res.shouldSend).toBe(true);
    if (!res.shouldSend) return;

    expect(res.payload.pendingCount).toBe(2);
    expect(res.payload.primary).toBeNull();
    expect(res.payload.targetPage).toBeNull();
    expect(res.payload.targetUrlKind).toBe("plans");
  });
});
