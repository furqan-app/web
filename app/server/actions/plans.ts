// NOTE: like the other files in app/server/actions/, these run in the
// BROWSER (no "use server" directive; relative fetch paths; called from
// React Query hooks in client components).

import type { UserPlanListItem } from "@/app/api/plans/route";
import type { TodayPlanAssignments } from "@/app/api/plans/today/route";
import type { PlanProgressHistoryEntry } from "@/app/api/plans/[planId]/progress/route";
import type { StreakResult } from "@/app/lib/plans/streak";
import type { UserPlanParams, UserPlanStatus } from "@/app/constants/plans";

export type { UserPlanListItem, TodayPlanAssignments, PlanProgressHistoryEntry, StreakResult };

const JSON_HEADERS = { "Content-Type": "application/json" };

export const getMyPlans = async (): Promise<UserPlanListItem[]> => {
  try {
    const { data, success } = await fetch("/api/plans", {
      headers: JSON_HEADERS,
    }).then((r) => r.json());
    return success && data ? data : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const enrollInPlan = async ({
  templateKey,
  params,
  startDate,
  targetJuzStart,
  targetJuzEnd,
}: {
  templateKey: string;
  params?: UserPlanParams;
  startDate?: string;
  /** Husun's hifz target range — resolved to pages server-side (D3). */
  targetJuzStart?: number;
  targetJuzEnd?: number;
}): Promise<UserPlanListItem | null> => {
  try {
    const { data, success } = await fetch("/api/plans", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        template_key: templateKey,
        params,
        start_date: startDate,
        target_juz_start: targetJuzStart,
        target_juz_end: targetJuzEnd,
      }),
    }).then((r) => r.json());
    return success ? data : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const updatePlanStatus = async ({
  planId,
  status,
}: {
  planId: number;
  status: UserPlanStatus;
}): Promise<boolean> => {
  try {
    const { success } = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ status }),
    }).then((r) => r.json());
    return Boolean(success);
  } catch (e) {
    console.error(e);
    return false;
  }
};

/**
 * Edit an active plan's params (quantities / husun's target juz range) — a
 * full replace, not a merge (the caller always sends the complete shape).
 * Never retro-applies to past PlanProgressEntry rows.
 */
export const updatePlanParams = async ({
  planId,
  params,
  targetJuzStart,
  targetJuzEnd,
}: {
  planId: number;
  params: UserPlanParams;
  targetJuzStart?: number;
  targetJuzEnd?: number;
}): Promise<boolean> => {
  try {
    const { success } = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        params,
        target_juz_start: targetJuzStart,
        target_juz_end: targetJuzEnd,
      }),
    }).then((r) => r.json());
    return Boolean(success);
  } catch (e) {
    console.error(e);
    return false;
  }
};

/** Local-midnight day boundary (ADR 0030): the browser's own date. */
export const getLocalDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const getTodayAssignments = async (
  date: string
): Promise<TodayPlanAssignments[]> => {
  try {
    const { data, success } = await fetch(
      `/api/plans/today?date=${encodeURIComponent(date)}`,
      { headers: JSON_HEADERS }
    ).then((r) => r.json());
    return success && data ? data : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getPlanHistory = async (
  planId: number
): Promise<PlanProgressHistoryEntry[]> => {
  try {
    const { data, success } = await fetch(`/api/plans/${planId}/progress`, {
      headers: JSON_HEADERS,
    }).then((r) => r.json());
    return success && data ? data : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getPlanStreak = async (date: string): Promise<StreakResult> => {
  try {
    const { data, success } = await fetch(
      `/api/plans/streak?date=${encodeURIComponent(date)}`,
      { headers: JSON_HEADERS }
    ).then((r) => r.json());
    return success && data ? data : { streakLength: 0, week: [] };
  } catch (e) {
    console.error(e);
    return { streakLength: 0, week: [] };
  }
};

export const checkOffTrack = async ({
  planId,
  trackKey,
  date,
  rangeStart,
  rangeEnd,
}: {
  planId: number;
  trackKey: string;
  date: string;
  rangeStart: number;
  rangeEnd: number;
}): Promise<boolean> => {
  try {
    const { success } = await fetch(`/api/plans/${planId}/progress`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        track_key: trackKey,
        date,
        range_start: rangeStart,
        range_end: rangeEnd,
      }),
    }).then((r) => r.json());
    return Boolean(success);
  } catch (e) {
    console.error(e);
    return false;
  }
};

/** Undo a check-off — removes the one PlanProgressEntry for { track_key, date }. */
export const uncheckTrack = async ({
  planId,
  trackKey,
  date,
}: {
  planId: number;
  trackKey: string;
  date: string;
}): Promise<boolean> => {
  try {
    const { success } = await fetch(`/api/plans/${planId}/progress`, {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({ track_key: trackKey, date }),
    }).then((r) => r.json());
    return Boolean(success);
  } catch (e) {
    console.error(e);
    return false;
  }
};
