"use client";

import { useMemo, useRef } from "react";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { BookOpen, Brain, Headphones, RotateCcw, Sparkles, Target } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { useIsomorphicLayoutEffect } from "@/app/hooks/use-isomorphic-layout-effect";
import { toLocaleNumeral } from "@utils/i18n";
import { usePlanDashboard } from "@hooks/use-plan-dashboard";
import { AddPlanButton } from "./AddPlanButton";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { DashboardHeatmapDay } from "@/app/lib/plans/dashboard";
import type { PlanActivity } from "@/app/constants/plans";
import { scrollToCurrentWeek } from "@/app/lib/plans/heatmap-scroll";

const INTENSITY_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted/40 dark:bg-white/[0.07]",
  1: "bg-primary/20 dark:bg-primary/35",
  2: "bg-primary/45 dark:bg-primary/60",
  3: "bg-primary/70 dark:bg-primary/80",
  4: "bg-primary",
};

export const ProgressSkeleton = () => (
  <div className="flex flex-col gap-6 animate-pulse" aria-busy="true">
    <div className="flex flex-col gap-2">
      <div className="h-5 w-44 rounded-md bg-muted" />
      <div className="h-3.5 w-64 rounded-md bg-muted/60" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="h-28 rounded-2xl border border-border bg-card p-4" />
      <div className="h-28 rounded-2xl border border-border bg-card p-4" />
      <div className="h-28 rounded-2xl border border-border bg-card p-4" />
      <div className="h-28 rounded-2xl border border-border bg-card p-4" />
    </div>
    <div className="h-44 rounded-2xl border border-border bg-card p-5" />
    <div className="h-40 rounded-2xl border border-border bg-card p-5" />
  </div>
);

export const ProgressEmptyState = () => {
  const t = useTranslations();
  return (
    <div
      data-testid="progress-empty-state"
      className="fq-section-group flex flex-col items-center gap-3 px-6 py-14 text-center"
    >
      <span className="fq-well grid size-12 place-items-center rounded-2xl text-[hsl(var(--control-inert))]">
        <Target className="size-6" strokeWidth={1.6} />
      </span>
      <p className="text-sm font-semibold text-foreground">
        {t("plans.dashboard.empty.title", "No plans enrolled yet")}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {t(
          "plans.dashboard.empty.hint",
          "Enroll in a daily wird or custom plan to begin tracking your progress."
        )}
      </p>
      <div className="w-full pt-2">
        <AddPlanButton />
      </div>
    </div>
  );
};

interface HeatmapCellProps {
  day: DashboardHeatmapDay;
  locale: string;
  onSelectTab?: (tab: "today" | "progress" | "plans") => void;
}

const HeatmapCell = ({ day, locale, onSelectTab }: HeatmapCellProps) => {
  const t = useTranslations();
  const tIntl = useNextIntlTranslations();

  const formattedDate = useMemo(() => {
    try {
      return new Date(`${day.date}T00:00:00`).toLocaleDateString(
        locale === "ar" ? "ar-u-nu-arab" : locale,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return day.date;
    }
  }, [day.date, locale]);

  const taskCountText = tIntl("plans.dashboard.heatmap.tooltipTasks", {
    count: day.count,
    n: toLocaleNumeral(day.count, locale),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${formattedDate}: ${taskCountText}`}
          title={`${formattedDate} • ${taskCountText}`}
          className={cn(
            "size-3 rounded-[2.5px] relative cursor-pointer outline-none transition-transform duration-100",
            "before:absolute before:-inset-1 before:rounded-sm before:content-['']",
            "hover:scale-125 focus-visible:scale-125 hover:z-10 focus-visible:z-10",
            "hover:ring-2 hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30",
            "motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100",
            INTENSITY_CLASSES[day.intensity]
          )}
        />
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-56 p-3 text-xs flex flex-col gap-2">
        <div className="font-semibold text-foreground">{formattedDate}</div>
        <div className="text-muted-foreground">{taskCountText}</div>
        {day.count > 0 && onSelectTab ? (
          <button
            type="button"
            onClick={() => onSelectTab("plans")}
            className="fq-focus-ring mt-1 inline-flex items-center justify-center rounded-lg bg-accent/60 hover:bg-accent px-2.5 py-1.5 font-semibold text-accent-foreground transition-colors"
          >
            {t("plans.dashboard.heatmap.viewInHistory", "View in Plan History →")}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

interface HeatmapWeek {
  weekIndex: number;
  startDate: string;
  days: DashboardHeatmapDay[];
}

export interface PlansProgressTabProps {
  hasPlans?: boolean;
  onSelectTab?: (tab: "today" | "progress" | "plans") => void;
}

export const PlansProgressTab = ({ hasPlans = true, onSelectTab }: PlansProgressTabProps) => {
  const t = useTranslations();
  const tIntl = useNextIntlTranslations();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { data, isLoading } = usePlanDashboard();

  const weeks: HeatmapWeek[] = useMemo(() => {
    if (!data?.heatmap?.days) return [];
    const result: HeatmapWeek[] = [];
    const days = data.heatmap.days;
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      result.push({
        weekIndex: result.length,
        startDate: weekDays[0].date,
        days: weekDays,
      });
    }
    return result;
  }, [data?.heatmap?.days]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    scrollToCurrentWeek(el, isRtl);

    const rafId = requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollToCurrentWeek(scrollContainerRef.current, isRtl);
      }
    });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (scrollContainerRef.current) {
          scrollToCurrentWeek(scrollContainerRef.current, isRtl);
        }
      });
      ro.observe(el);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [isRtl, weeks.length]);

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  if (!hasPlans || !data) {
    return <ProgressEmptyState />;
  }

  const { streaks, totals, heatmap } = data;
  const activityStreaks = streaks.byActivity;
  const isSparse = heatmap.totalActiveDays <= 1;
  const khatmat = totals.read.khatmat ?? 0;

  // Chronological column mapping:
  // RTL: Current week is on the far right (reading start edge), so we reverse weeks
  // so index 0 in DOM is the newest week.
  // LTR: Week 0 (52 weeks ago) is on the left, newest week is on the right.
  const displayedWeeks: HeatmapWeek[] = isRtl
    ? [...weeks].reverse()
    : weeks;

  const activities: {
    key: PlanActivity;
    label: string;
    icon: typeof BookOpen;
    streak: typeof activityStreaks.read;
  }[] = [
    {
      key: "read",
      label: t("plans.dashboard.streaks.read", "Reading"),
      icon: BookOpen,
      streak: activityStreaks.read,
    },
    {
      key: "listen",
      label: t("plans.dashboard.streaks.listen", "Listening"),
      icon: Headphones,
      streak: activityStreaks.listen,
    },
    {
      key: "memorize",
      label: t("plans.dashboard.streaks.memorize", "Memorization"),
      icon: Brain,
      streak: activityStreaks.memorize,
    },
    {
      key: "review",
      label: t("plans.dashboard.streaks.review", "Review"),
      icon: RotateCcw,
      streak: activityStreaks.review,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Reflection Banner */}
      {isSparse ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-xs font-semibold text-primary">
            {t(
              "plans.dashboard.sparse.encouragement",
              "A blessed beginning — every single step in the study of the Qur'an brings reward."
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-foreground">
            {t("plans.dashboard.title", "Progress & Milestones")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t(
              "plans.dashboard.subtitle",
              "Track your consistency across recitation, listening, memorization, and review"
            )}
          </p>
        </div>
      )}

      {/* 2. Activity Streaks Grid */}
      <div
        data-testid="progress-streaks-grid"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {activities.map(({ key, label, icon: Icon, streak }) => {
          const count = streak.streakLength;
          const hasActivePlan = streak.startDate !== null;
          const statusText = !hasActivePlan
            ? t("plans.dashboard.streaks.noActivePlan", "No active plan")
            : streak.completedToday
              ? t("plans.dashboard.streaks.completedToday", "Completed today")
              : t("plans.dashboard.streaks.pendingToday", "Pending today");

          return (
            <div
              key={key}
              className="fq-panel-cast flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-muted/60 text-foreground">
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="text-xs font-bold text-foreground">{label}</span>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors",
                    !hasActivePlan
                      ? "bg-muted text-muted-foreground"
                      : streak.completedToday
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted/70 text-muted-foreground"
                  )}
                >
                  {statusText}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-extrabold text-foreground tracking-tight">
                    {toLocaleNumeral(count, locale)}
                  </span>
                  <span className="ms-1.5 text-xs font-medium text-muted-foreground">
                    {tIntl("plans.dashboard.streaks.daysCount", {
                      count,
                      n: toLocaleNumeral(count, locale),
                    })}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {tIntl("plans.dashboard.streaks.activeDaysCount", {
                    count: streak.activeDaysCount,
                    n: toLocaleNumeral(streak.activeDaysCount, locale),
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Cumulative Accomplishments Card */}
      <div
        data-testid="progress-totals-card"
        className="fq-panel-cast rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            {t("plans.dashboard.totals.title", "Cumulative Accomplishments")}
          </span>
          {khatmat > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/20">
              <Sparkles className="size-3.5" />
              <span>
                {tIntl("plans.dashboard.totals.khatmatCount", {
                  count: khatmat,
                  n: toLocaleNumeral(khatmat, locale),
                })}
              </span>
            </span>
          ) : null}
        </div>

        <div className="divide-y divide-border pt-1">
          {/* Read */}
          <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5">
              <BookOpen className="size-4 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-xs font-medium text-foreground">
                {t("plans.dashboard.totals.readPages", "Pages read")}
              </span>
            </div>
            <div className="text-end">
              <div className="text-xs font-bold text-foreground">
                {tIntl("plans.dashboard.totals.pagesCount", {
                  count: totals.read.pages,
                  n: toLocaleNumeral(totals.read.pages, locale),
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {tIntl("plans.dashboard.totals.versesCount", {
                  count: totals.read.verses,
                  n: toLocaleNumeral(totals.read.verses, locale),
                })}
              </div>
            </div>
          </div>

          {/* Listen */}
          <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5">
              <Headphones className="size-4 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-xs font-medium text-foreground">
                {t("plans.dashboard.totals.listenedPages", "Pages listened")}
              </span>
            </div>
            <div className="text-end">
              <div className="text-xs font-bold text-foreground">
                {tIntl("plans.dashboard.totals.pagesCount", {
                  count: totals.listen.pages,
                  n: toLocaleNumeral(totals.listen.pages, locale),
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {tIntl("plans.dashboard.totals.versesCount", {
                  count: totals.listen.verses,
                  n: toLocaleNumeral(totals.listen.verses, locale),
                })}
              </div>
            </div>
          </div>

          {/* Memorize */}
          <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5">
              <Brain className="size-4 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-xs font-medium text-foreground">
                {t("plans.dashboard.totals.memorizedVerses", "Verses memorized")}
              </span>
            </div>
            <div className="text-end">
              <div className="text-xs font-bold text-foreground">
                {tIntl("plans.dashboard.totals.versesCount", {
                  count: totals.memorize.verses,
                  n: toLocaleNumeral(totals.memorize.verses, locale),
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {tIntl("plans.dashboard.totals.pagesCount", {
                  count: totals.memorize.pages,
                  n: toLocaleNumeral(totals.memorize.pages, locale),
                })}
              </div>
            </div>
          </div>

          {/* Review */}
          <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5">
              <RotateCcw className="size-4 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-xs font-medium text-foreground">
                {t("plans.dashboard.totals.reviewedPages", "Pages reviewed")}
              </span>
            </div>
            <div className="text-end">
              <div className="text-xs font-bold text-foreground">
                {tIntl("plans.dashboard.totals.pagesCount", {
                  count: totals.review.pages,
                  n: toLocaleNumeral(totals.review.pages, locale),
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {tIntl("plans.dashboard.totals.versesCount", {
                  count: totals.review.verses,
                  n: toLocaleNumeral(totals.review.verses, locale),
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Activity Heatmap Card */}
      <div
        data-testid="progress-heatmap-card"
        className="fq-panel-cast rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-foreground">
              {t("plans.dashboard.heatmap.title", "Study & Habit Calendar")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {tIntl("plans.dashboard.heatmap.summary", {
                activeDays: heatmap.totalActiveDays,
                activeDaysFormatted: toLocaleNumeral(heatmap.totalActiveDays, locale),
              })}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {t(
              "plans.dashboard.heatmap.directionHint",
              "Past weeks on left → Current week on right"
            )}
          </span>
        </div>

        {/* Scrollable 52-week lattice */}
        <div ref={scrollContainerRef} className="overflow-x-auto fq-scroll-nice pb-2">
          <div className="w-max flex flex-col gap-1.5 pt-1">
            {/* Month labels row */}
            <div className="flex gap-[3px] h-4">
              {displayedWeeks.map((week, idx) => {
                const prevWeek = idx > 0 ? displayedWeeks[idx - 1] : null;
                const currentMonth = week.startDate.slice(5, 7);
                const prevMonth = prevWeek ? prevWeek.startDate.slice(5, 7) : null;
                const showMonth = idx === 0 || currentMonth !== prevMonth;

                let monthName = "";
                if (showMonth) {
                  try {
                    monthName = new Date(`${week.startDate}T00:00:00`).toLocaleDateString(
                      locale === "ar" ? "ar-u-nu-arab" : locale,
                      { month: "short" }
                    );
                  } catch {
                    monthName = "";
                  }
                }

                return (
                  <div key={`month-${week.weekIndex}`} className="w-3 flex-none relative">
                    {showMonth ? (
                      <span className="absolute top-0 start-0 text-[9px] font-bold text-muted-foreground whitespace-nowrap pointer-events-none">
                        {idx === 0 && isRtl
                          ? t("plans.dashboard.heatmap.currentMonthNow", "Now")
                          : monthName}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Heatmap Grid */}
            <div className="flex gap-[3px]">
              {displayedWeeks.map((week) => (
                <div
                  key={`week-${week.weekIndex}`}
                  className="flex flex-col gap-[3px] flex-none"
                >
                  {week.days.map((day) => (
                    <HeatmapCell
                      key={day.date}
                      day={day}
                      locale={locale}
                      onSelectTab={onSelectTab}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Footer & Legend */}
        <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
          <span>
            {t(
              "plans.dashboard.heatmap.legendCaption",
              "Each cell represents a day with completed wird tasks"
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <span>{t("plans.dashboard.heatmap.legendLess", "Less")}</span>
            <span className="size-2.5 rounded-[1.5px] bg-muted/40 dark:bg-white/[0.07]" />
            <span className="size-2.5 rounded-[1.5px] bg-primary/20 dark:bg-primary/35" />
            <span className="size-2.5 rounded-[1.5px] bg-primary/45 dark:bg-primary/60" />
            <span className="size-2.5 rounded-[1.5px] bg-primary/70 dark:bg-primary/80" />
            <span className="size-2.5 rounded-[1.5px] bg-primary" />
            <span>{t("plans.dashboard.heatmap.legendMore", "More")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
