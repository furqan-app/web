"use client";

import { useLocale } from "next-intl";
import { Check } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { useTodayAssignments } from "@hooks/use-today-assignments";
import { usePlanStreak } from "@hooks/use-plan-streak";
import { useOnlineStatus } from "@hooks/use-online-status";
import { PlanAssignmentRow } from "./PlanAssignmentRow";
import type { StreakResult } from "@/app/lib/plans/streak";
import { cn } from "@/lib/utils";

const CARD_SHADOW =
  "shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]";

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

// Hero "today" card: flattens every active plan's today-assignments into one
// row list, swapping to a celebratory all-done state once every row is
// checked off. Streak + week strip are derived (never stored) via
// usePlanStreak. Renders nothing if there are no active plans (caller-gated).
export const PlansTodayHero = () => {
  const t = useTranslations();
  const locale = useLocale();
  const isOnline = useOnlineStatus();
  const { data: todayData, checkOff, uncheckOff } = useTodayAssignments();
  const { data: streak } = usePlanStreak();

  const rows = (todayData ?? []).flatMap((plan) =>
    plan.assignments.map((assignment) => ({ plan, assignment }))
  );
  const totalCount = rows.length;
  const doneCount = rows.filter((r) => r.assignment.completed).length;
  const allDone = totalCount > 0 && doneCount === totalCount;
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
    </div>
  );
};
