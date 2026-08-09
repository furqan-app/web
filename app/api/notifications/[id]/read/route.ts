import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { getNotificationDeps } from "@/app/lib/notifications/deps";

/** POST /api/notifications/:id/read — mark one notification read. Protected; ownership enforced via WHERE. */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return jsonResponse({ code: 422, message: "Invalid notification id" });
  }

  const { store } = getNotificationDeps();
  const updated = await store.markRead(user.id, id);
  if (!updated) return jsonResponse({ code: 404, message: "Notification not found" });

  return jsonResponse({ data: { id } });
}
