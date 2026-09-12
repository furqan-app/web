import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { getNotificationDeps } from "@/app/lib/notifications/deps";
import {
  getDailyWirdReminders,
  setGeneralWirdReminder,
  cancelGeneralWirdReminder,
  cancelAllGeneralWirdReminders,
  setDedicatedWirdReminder,
  cancelDedicatedWirdReminder,
  MAX_GENERAL_WIRD_REMINDERS,
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

const validateReminderFields = (body: {
  time?: unknown;
  timezone?: unknown;
  locale?: unknown;
}):
  | { valid: true; time: string; timezone: string; locale: string }
  | { valid: false; message: string } => {
  if (typeof body.time !== "string" || !TIME_REGEX.test(body.time)) {
    return {
      valid: false,
      message: "Time must be in HH:MM format on a 15-minute step (e.g. 08:00, 08:15)",
    };
  }

  if (typeof body.timezone !== "string" || !isValidTimeZone(body.timezone)) {
    return {
      valid: false,
      message: "Invalid IANA timezone identifier",
    };
  }

  if (
    typeof body.locale !== "string" ||
    !(routing.locales as readonly string[]).includes(body.locale)
  ) {
    return {
      valid: false,
      message: "Unsupported locale",
    };
  }

  return {
    valid: true,
    time: body.time,
    timezone: body.timezone,
    locale: body.locale,
  };
};

export async function GET(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const deps = getNotificationDeps();
  const pref = await getDailyWirdReminders(user.id, deps.store);

  return jsonResponse({
    data: {
      general: pref.general.map((g) => ({
        id: g.id,
        slot: g.slot,
        time: g.time,
        timezone: g.timezone,
        locale: g.locale,
        scheduledFor: g.scheduledFor ? g.scheduledFor.toISOString() : null,
      })),
      dedicated: pref.dedicated.map((d) => ({
        id: d.id,
        planId: d.planId,
        time: d.time,
        timezone: d.timezone,
        locale: d.locale,
        scheduledFor: d.scheduledFor ? d.scheduledFor.toISOString() : null,
      })),
      enabled: pref.enabled,
      time: pref.time,
      timezone: pref.timezone || null,
      locale: pref.locale || null,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  let body: {
    type?: unknown;
    slot?: unknown;
    planId?: unknown;
    enabled?: unknown;
    time?: unknown;
    timezone?: unknown;
    locale?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: 400, message: "Invalid JSON body" });
  }

  if (typeof body?.enabled !== "boolean") {
    return jsonResponse({ code: 422, message: "Invalid or missing 'enabled' flag" });
  }

  const deps = getNotificationDeps();
  const isDedicated = body.type === "dedicated" || body.planId !== undefined;

  if (isDedicated) {
    if (
      typeof body.planId !== "number" ||
      !Number.isInteger(body.planId) ||
      body.planId <= 0
    ) {
      return jsonResponse({ code: 422, message: "Missing or invalid 'planId'" });
    }
    const planId = body.planId;

    if (!body.enabled) {
      await cancelDedicatedWirdReminder(user.id, planId, deps.store);
      return jsonResponse({
        data: {
          success: true,
          planId,
          enabled: false,
        },
      });
    }

    // Validate that plan belongs to user and is active
    const plan = await appPrisma.userPlan.findFirst({
      where: { id: planId, user_id: user.id, status: "active" },
    });
    if (!plan) {
      return jsonResponse({
        code: 422,
        message: "Cannot bind reminder to inactive or non-existent plan",
      });
    }

    const reminderValidation = validateReminderFields(body);
    if (!reminderValidation.valid) {
      return jsonResponse({
        code: 422,
        message: reminderValidation.message,
      });
    }

    const result = await setDedicatedWirdReminder(
      {
        userId: user.id,
        planId,
        time: reminderValidation.time,
        timezone: reminderValidation.timezone,
        locale: reminderValidation.locale,
      },
      deps.store,
      deps.clock
    );

    return jsonResponse({
      data: {
        success: true,
        enabled: true,
        planId,
        time: reminderValidation.time,
        scheduledFor: result.scheduledFor.toISOString(),
      },
    });
  }

  // General reminders
  if (body.slot !== undefined) {
    if (
      typeof body.slot !== "number" ||
      !Number.isInteger(body.slot) ||
      body.slot < 1 ||
      body.slot > MAX_GENERAL_WIRD_REMINDERS
    ) {
      return jsonResponse({
        code: 422,
        message: `Slot must be an integer between 1 and ${MAX_GENERAL_WIRD_REMINDERS}`,
      });
    }
  }

  if (!body.enabled) {
    if (body.slot !== undefined) {
      await cancelGeneralWirdReminder(user.id, body.slot as number, deps.store);
      return jsonResponse({
        data: {
          success: true,
          slot: body.slot,
          enabled: false,
        },
      });
    }

    // Toggle master general switch OFF: cancel all general slots
    await cancelAllGeneralWirdReminders(user.id, deps.store);
    return jsonResponse({
      data: {
        success: true,
        enabled: false,
      },
    });
  }

  const slot = (body.slot as number | undefined) ?? 1;

  const reminderValidation = validateReminderFields(body);
  if (!reminderValidation.valid) {
    return jsonResponse({
      code: 422,
      message: reminderValidation.message,
    });
  }

  const result = await setGeneralWirdReminder(
    {
      userId: user.id,
      slot,
      time: reminderValidation.time,
      timezone: reminderValidation.timezone,
      locale: reminderValidation.locale,
    },
    deps.store,
    deps.clock
  );

  return jsonResponse({
    data: {
      success: true,
      enabled: true,
      slot,
      time: reminderValidation.time,
      scheduledFor: result.scheduledFor.toISOString(),
    },
  });
}
