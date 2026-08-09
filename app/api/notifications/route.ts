import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { getNotificationDeps } from "@/app/lib/notifications/deps";
import { getNotificationType, type NotificationContent } from "@/app/constants/notifications";

export type NotificationListItem = {
  id: number;
  type: string;
  content: NotificationContent;
  channels: string[];
  read_at: string | null;
  created_at: string;
};

export type NotificationListResponse = {
  items: NotificationListItem[];
  next_cursor: number | null;
  unread_count: number;
};

const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/** GET /api/notifications — the caller's in-app feed, cursor-paginated (?cursor=&limit=&locale=&unread=1). Protected. */
export async function GET(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const searchParams = request.nextUrl.searchParams;
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : undefined;
  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(rawLimit, MIN_LIMIT), MAX_LIMIT);
  const locale = searchParams.get("locale") ?? "ar";
  const unreadOnly = searchParams.get("unread") === "1";

  const deps = getNotificationDeps();
  const [{ items, nextCursor }, unreadCount] = await Promise.all([
    deps.store.listNotifications({ userId: user.id, cursor, limit, unreadOnly }),
    deps.store.countUnread(user.id),
  ]);

  const ctx = deps.renderContext(locale);

  const data: NotificationListResponse = {
    items: items.map((item) => {
      const typeDef = getNotificationType(item.type);
      const content = typeDef?.render(item.payload, ctx) ?? { title: item.type, body: "" };
      return {
        id: item.id,
        type: item.type,
        content,
        channels: item.channels,
        read_at: item.read_at ? item.read_at.toISOString() : null,
        created_at: item.created_at.toISOString(),
      };
    }),
    next_cursor: nextCursor,
    unread_count: unreadCount,
  };

  return jsonResponse({ data });
}
