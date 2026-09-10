import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { getNotificationDeps } from "@/app/lib/notifications/deps";
import {
  getDailyWirdReminder,
  setDailyWirdReminder,
  cancelDailyWirdReminder,
} from "@/app/lib/notifications/wird-reminder";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const TIME_REGEX = /^(0[0-9]|1[0-9]|2[0-3]):(00|15|30|45)$/;

const isValidTimeZone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export async function GET(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const deps = getNotificationDeps();
  const pref = await getDailyWirdReminder(user.id, deps.store);

  if (!pref.enabled) {
    return jsonResponse({
      data: {
        enabled: false,
        time: pref.time || "08:00",
        timezone: pref.timezone || null,
        locale: pref.locale || null,
      },
    });
  }

  return jsonResponse({
    data: {
      enabled: true,
      time: pref.time,
      timezone: pref.timezone,
      locale: pref.locale,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  let body: { enabled?: unknown; time?: unknown; timezone?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: 400, message: "Invalid JSON body" });
  }

  if (typeof body?.enabled !== "boolean") {
    return jsonResponse({ code: 422, message: "Invalid or missing 'enabled' flag" });
  }

  const deps = getNotificationDeps();

  if (!body.enabled) {
    await cancelDailyWirdReminder(user.id, deps.store);
    return jsonResponse({
      data: {
        success: true,
        enabled: false,
      },
    });
  }

  if (typeof body.time !== "string" || !TIME_REGEX.test(body.time)) {
    return jsonResponse({
      code: 422,
      message: "Time must be in HH:MM format on a 15-minute step (e.g. 08:00, 08:15)",
    });
  }

  if (typeof body.timezone !== "string" || !isValidTimeZone(body.timezone)) {
    return jsonResponse({
      code: 422,
      message: "Invalid IANA timezone identifier",
    });
  }

  if (
    typeof body.locale !== "string" ||
    !(routing.locales as readonly string[]).includes(body.locale)
  ) {
    return jsonResponse({
      code: 422,
      message: "Unsupported locale",
    });
  }

  const result = await setDailyWirdReminder(
    {
      userId: user.id,
      time: body.time,
      timezone: body.timezone,
      locale: body.locale,
    },
    deps.store,
    deps.clock
  );

  return jsonResponse({
    data: {
      success: true,
      enabled: true,
      time: body.time,
      scheduledFor: result.scheduledFor.toISOString(),
    },
  });
}
