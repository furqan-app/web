import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { getNotificationDeps } from "@/app/lib/notifications/deps";

/** POST /api/notifications/read-all — mark every unread notification read for the caller. Protected. */
export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const { store } = getNotificationDeps();
  const count = await store.markAllRead(user.id);

  return jsonResponse({ data: { count } });
}
