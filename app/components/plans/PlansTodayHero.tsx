"use client";

import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { Bell, Check, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { useTodayAssignments } from "@hooks/use-today-assignments";
import { usePlanStreak } from "@hooks/use-plan-streak";
import { useOnlineStatus } from "@hooks/use-online-status";
import { useSettingsSidebar } from "@/app/contexts/SettingsSidebarContext";
import { formatTimeOption } from "@/components/ui/time-combobox";
import { getLocalDateString } from "@/app/server/actions/plans";
import { isAutoWritten } from "@/app/lib/plans/auto-write-log";
import { PlanAssignmentRow } from "./PlanAssignmentRow";
import type { StreakResult } from "@/app/lib/plans/streak";
import { cn } from "@/lib/utils";

// Token, not a literal: the hardcoded rgba drew a real cast on light and
// gold and nothing on dark, where --background is (7,15,23) (ADR 0032).
const CARD_SHADOW = "fq-panel-cast";

// A fixed 7-day streak view — unrelated to how many tracks are due today
// (that count lives in the "N of M today" line above it). Labeled explicitly
// so the two aren't read as the same thing. Only "done" (something was due
// and actually checked off) paints a filled pill — "none" (no plan had
// started yet, or nothing left to do) and "missed" both render muted, since
// showing either as green would falsely claim something was accomplished.
//
// `week` is oldest-first, ending at today. Rendered right-to-left in Arabic
// (today on the right, the reading-start side) — explicitly reversed by
// locale rather than left to flex-direction/dir tricks, so the meaning is
// unambiguous regardless of how the app's base direction is set elsewhere.
const WeekStrip = ({ week, label }: { week: StreakResult["week"]; label: string }) => {
  const locale = useLocale();
  const ordered = locale === "ar" ? [...week].reverse() : week;
  const todayIndex = locale === "ar" ? 0 : week.length - 1;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {ordered.map((status, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              status === "done" ? "bg-primary" : "bg-muted",
              i === todayIndex && "shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]"
            )}
          />
        ))}
      </div>
      <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
};

const HeroReminderRow = () => {
  const t = useTranslations();
  const tIntl = useNextIntlTranslations();
  const locale = useLocale();
  const { openSettings } = useSettingsSidebar();
  const { data } = useQuery<{
    general?: { time: string }[];
    dedicated?: { time: string; planId: number }[];
    enabled: boolean;
    time: string;
  } | null>({
    queryKey: ["daily-wird-reminder"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/daily-reminder");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });

  const generalCount = data?.general?.length ?? 0;
  const dedicatedCount = data?.dedicated?.length ?? 0;
  const totalCount =
    data?.general || data?.dedicated
      ? generalCount + dedicatedCount
      : data?.enabled
        ? 1
        : 0;

  let reminderText = t("plans.hero.reminderSet", "Set daily reminder");
  if (data?.enabled && totalCount > 0) {
    if (totalCount > 1) {
      reminderText = tIntl("plans.hero.remindersMultiple", {
        count: toLocaleNumeral(totalCount, locale),
      });
    } else {
      const singleTime =
        data?.general?.[0]?.time ?? data?.dedicated?.[0]?.time ?? data?.time;
      const formattedTime = singleTime ? formatTimeOption(singleTime, locale) : "";
      reminderText = tIntl("plans.hero.reminderLabel", { time: formattedTime });
    }
  }

  return (
    <div className="pt-3 border-t border-border/60">
      <button
        type="button"
        data-testid="plans-hero-reminder-row"
        onClick={() => openSettings("wird-reminder")}
        className="flex w-full items-center justify-between py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          <Bell className="size-3.5 text-muted-foreground shrink-0" />
          <span>{reminderText}</span>
        </div>
        <ChevronRight className="size-3 text-muted-foreground/60 rtl:rotate-180 shrink-0" />
      </button>
    </div>
  );
};

// Hero "today" card: flattens every active plan's today-assignments into one
// row list, swapping to a celebratory all-done state once every row is
// checked off. Streak + week strip are derived (never stored) via
// usePlanStreak. Renders nothing if there are no active plans (caller-gated).
export const PlansTodayHero = () => {
  const t = useTranslations();
  const locale = useLocale();
  const isOnline = useOnlineStatus();
  const { data: session } = useSession();
  const userId = (session?.user as { id?: number } | undefined)?.id;
  const todayDate = getLocalDateString();
  const { data: todayData, checkOff, uncheckOff } = useTodayAssignments();
  const { data: streak } = usePlanStreak();

  const rows = (todayData ?? []).flatMap((plan) =>
    plan.assignments.map((assignment) => ({ plan, assignment }))
  );
  const totalCount = rows.length;
  const doneCount = rows.filter((r) => r.assignment.completed).length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  // Completed assignments recorded automatically stay reversible here: the
  // all-done celebration below replaces the row list, so without this an
  // auto-written entry would have no visible marker and no undo affordance.
  const autoRows = rows.filter(
    (r) =>
      r.assignment.completed &&
      isAutoWritten(userId, r.plan.planId, r.assignment.trackKey, todayDate),
  );
  const week = streak?.week ?? [];
  const streakLength = streak?.streakLength ?? 0;

  if (totalCount === 0) return null;

  if (allDone) {
    return (
      <div className={cn("rounded-[20px] bg-card p-6 text-center", CARD_SHADOW)}>
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-5" strokeWidth={2.6} />
        </span>
        <div className="text-[17px] font-extrabold text-foreground">
          {t("plans.hero.allDone", "Well done, you've completed today's wird")} ◆
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("plans.hero.keepGoing", "Keep going — you're now on")}{" "}
          {toLocaleNumeral(streakLength, locale)}{" "}
          {t("plans.hero.streakDays", "day streak")}
        </div>
        {week.length === 7 ? (
          <div className="mt-4">
            <WeekStrip week={week} label={t("plans.hero.last7Days", "Last 7 days")} />
          </div>
        ) : null}
        {autoRows.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2 text-start">
            {autoRows.map(({ plan, assignment }) => (
              <PlanAssignmentRow
                key={`${plan.planId}-${assignment.trackKey}`}
                planId={plan.planId}
                planName={plan.name}
                assignment={assignment}
                onToggle={() =>
                  assignment.completed
                    ? uncheckOff.mutate({ planId: plan.planId, trackKey: assignment.trackKey })
                    : checkOff.mutate({
                        planId: plan.planId,
                        trackKey: assignment.trackKey,
                        rangeStart: assignment.rangeStart,
                        rangeEnd: assignment.rangeEnd,
                      })
                }
                isPending={checkOff.isPending || uncheckOff.isPending}
                disabled={!isOnline}
              />
            ))}
          </div>
        ) : null}
        <HeroReminderRow />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3.5 rounded-[20px] bg-card p-6", CARD_SHADOW)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[17px] font-extrabold text-foreground">
            {t("plans.hero.title", "Today's wird")}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {toLocaleNumeral(doneCount, locale)} {t("plans.hero.of", "of")}{" "}
            {toLocaleNumeral(totalCount, locale)} {t("plans.hero.today", "today")}
          </div>
        </div>
        <div className="text-end">
          <div className="text-[22px] font-extrabold text-primary">
            {toLocaleNumeral(streakLength, locale)}
          </div>
          <div className="text-[10px] font-bold text-muted-foreground">
            {t("plans.hero.streakDays", "day streak")}
          </div>
        </div>
      </div>

      {week.length === 7 ? (
        <WeekStrip week={week} label={t("plans.hero.last7Days", "Last 7 days")} />
      ) : null}

      <div className="flex flex-col gap-2">
        {rows.map(({ plan, assignment }) => (
          <PlanAssignmentRow
            key={`${plan.planId}-${assignment.trackKey}`}
            planId={plan.planId}
            planName={plan.name}
            assignment={assignment}
            onToggle={() =>
              assignment.completed
                ? uncheckOff.mutate({ planId: plan.planId, trackKey: assignment.trackKey })
                : checkOff.mutate({
                    planId: plan.planId,
                    trackKey: assignment.trackKey,
                    rangeStart: assignment.rangeStart,
                    rangeEnd: assignment.rangeEnd,
                  })
            }
            isPending={checkOff.isPending || uncheckOff.isPending}
            disabled={!isOnline}
          />
        ))}
        {!isOnline ? (
          <p className="text-center text-xs text-muted-foreground">
            {t("plans.offlineNotice", "Connect to the internet to check off progress")}
          </p>
        ) : null}
      </div>

      <HeroReminderRow />
    </div>
  );
};
