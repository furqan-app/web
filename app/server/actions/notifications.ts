// NOTE: like the other files in app/server/actions/, these run in the
// BROWSER (no "use server" directive; relative fetch paths; called from
// React Query hooks in client components).

import type { NotificationListResponse } from "@/app/api/notifications/route";

export type { NotificationListResponse };

const JSON_HEADERS = { "Content-Type": "application/json" };

export const getNotifications = async (args: {
  cursor?: number;
  limit?: number;
  locale?: string;
}): Promise<NotificationListResponse> => {
  const params = new URLSearchParams();
  if (args.cursor) params.set("cursor", String(args.cursor));
  if (args.limit) params.set("limit", String(args.limit));
  if (args.locale) params.set("locale", args.locale);

  try {
    const { data, success } = await fetch(`/api/notifications?${params}`, {
      headers: JSON_HEADERS,
    }).then((r) => r.json());
    return success && data ? data : { items: [], next_cursor: null, unread_count: 0 };
  } catch (e) {
    console.error(e);
    return { items: [], next_cursor: null, unread_count: 0 };
  }
};

export const markNotificationRead = async (id: number): Promise<boolean> => {
  try {
    const { success } = await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: JSON_HEADERS,
    }).then((r) => r.json());
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const markAllNotificationsRead = async (): Promise<boolean> => {
  try {
    const { success } = await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: JSON_HEADERS,
    }).then((r) => r.json());
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const registerPushSubscription = async (
  subscription: PushSubscriptionJSON
): Promise<boolean> => {
  try {
    const { success } = await fetch("/api/notifications/push-subscription", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(subscription),
    }).then((r) => r.json());
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const unregisterPushSubscription = async (endpoint: string): Promise<boolean> => {
  try {
    const { success } = await fetch("/api/notifications/push-subscription", {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({ endpoint }),
    }).then((r) => r.json());
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};
