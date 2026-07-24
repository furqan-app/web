// NOTE: like the other files in app/server/actions/, these run in the
// BROWSER (no "use server" directive; relative fetch paths; called from
// React Query hooks in client components).

import type { UserPlanListItem } from "@/app/api/plans/route";
import type { TodayPlanAssignments } from "@/app/api/plans/today/route";
import type { UserPlanParams, UserPlanStatus } from "@/app/constants/plans";

export type { UserPlanListItem, TodayPlanAssignments };

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
}: {
  templateKey: string;
  params?: UserPlanParams;
  startDate?: string;
}): Promise<UserPlanListItem | null> => {
  try {
    const { data, success } = await fetch("/api/plans", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        template_key: templateKey,
        params,
        start_date: startDate,
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

/** Local-midnight day boundary (ADR 0028): the browser's own date. */
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
