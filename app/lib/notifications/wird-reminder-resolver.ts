import { appPrisma, type AppPrismaClient } from "@/app/utils/db";
import { getEnrollmentTemplate, type UserPlanParams } from "@/app/constants/plans";
import { deriveAssignments, type ProgressLogEntry, type TrackAssignment } from "@/app/lib/plans/engine";
import { pageOfVerse, verseKeyOfOrdinal } from "@/app/lib/plans/verse-index";
import type { PlanDailyReminderPayload } from "@/app/constants/notifications";

export type WirdDispatchResolution =
  | { shouldSend: false; reason: "all_completed" | "no_active_plans" }
  | { shouldSend: true; payload: PlanDailyReminderPayload };

const toSafeTimeZone = (timeZone: string): string => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
};

export const toLocalDateString = (date: Date, timeZone: string): string => {
  const safeTz = toSafeTimeZone(timeZone);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export async function resolveDailyWirdDispatch(
  userId: number,
  timezone: string,
  now: Date,
  prisma: AppPrismaClient = appPrisma
): Promise<WirdDispatchResolution> {
  const localDate = toLocalDateString(now, timezone);

  const plans = await prisma.userPlan.findMany({
    where: { user_id: userId, status: "active" },
    include: { progress: true },
    orderBy: { created_at: "asc" },
  });

  if (plans.length === 0) {
    return { shouldSend: false, reason: "no_active_plans" };
  }

  const allAssignments: TrackAssignment[] = [];
  for (const plan of plans) {
    const template = getEnrollmentTemplate(plan);
    if (!template) continue;
    const entries: ProgressLogEntry[] = plan.progress.map((p) => ({
      track_key: p.track_key,
      date: p.date.toISOString().slice(0, 10),
      range_start: String(p.range_start),
      range_end: String(p.range_end),
    }));
    const assignments = deriveAssignments(
      template,
      (plan.params ?? {}) as UserPlanParams,
      entries,
      localDate
    );
    allAssignments.push(...assignments);
  }

  const pending = allAssignments.filter((a) => !a.completed);
  if (pending.length === 0) {
    return { shouldSend: false, reason: "all_completed" };
  }

  let primary: PlanDailyReminderPayload["primary"] = null;
  let targetPage: number | null = null;
  let targetUrlKind: PlanDailyReminderPayload["targetUrlKind"] = "plans";

  if (pending.length === 1) {
    const p = pending[0];
    let startVerseKey: string | undefined;
    let endVerseKey: string | undefined;

    if (p.unit === "page") {
      targetPage = p.rangeStart;
    } else if (p.unit === "verse") {
      try {
        targetPage = pageOfVerse(p.rangeStart);
        startVerseKey = verseKeyOfOrdinal(p.rangeStart);
        endVerseKey = verseKeyOfOrdinal(p.rangeEnd);
      } catch {
        targetPage = null;
      }
    }

    if (targetPage !== null && targetPage >= 1 && targetPage <= 604) {
      targetUrlKind = "page";
    }

    primary = {
      unit: p.unit,
      rangeStart: p.rangeStart,
      rangeEnd: p.rangeEnd,
      startVerseKey,
      endVerseKey,
    };
  }

  return {
    shouldSend: true,
    payload: {
      pendingCount: pending.length,
      primary,
      targetPage,
      targetUrlKind,
    },
  };
}
