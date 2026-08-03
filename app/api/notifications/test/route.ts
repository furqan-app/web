import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { getNotificationDeps } from "@/app/lib/notifications/deps";
import { dispatchNotification } from "@/app/lib/notifications/dispatch";

const isAllowedInProd = (email: string) =>
  (process.env.NOTIFICATION_TEST_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email);

/** POST /api/notifications/test — manual verification trigger (dispatches "system.test"). Protected; blocked in prod except allow-listed emails. */
export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  if (process.env.NODE_ENV === "production" && !isAllowedInProd(user.email)) {
    return jsonResponse({ code: 403, message: "Not allowed" });
  }

  const body = await request.json().catch(() => ({}));
  const deps = getNotificationDeps();

  const outcome = await dispatchNotification(
    {
      recipient: { userId: user.id, email: user.email ?? null, locale: body?.locale ?? "ar" },
      type: "system.test",
      payload: { message: body?.message },
    },
    deps
  );

  return jsonResponse({ data: outcome });
}
