"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { ChevronDown, MoreVertical, Pause, Pencil, Play, Target, XCircle, CheckCircle2, Bell, Plus, X } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { usePlans } from "@hooks/use-plans";
import { useTodayAssignments } from "@hooks/use-today-assignments";
import { usePlanHistory } from "@hooks/use-plan-history";
import { PLAN_TEMPLATE_UI, PLAN_TRACK_UI } from "@constants/plan-ui";
import type { PlanProgressHistoryEntry, UserPlanListItem } from "@/app/server/actions/plans";
import type { UserPlanStatus } from "@constants/plans";
import { usePlanVerseIndex } from "@hooks/use-plan-verse-index";
import { PlansTodayHero } from "./PlansTodayHero";
import { AddPlanButton } from "./AddPlanButton";
import { PlansProgressTab } from "./PlansProgressTab";
import { PlansBrowseDialog, type PlansBrowseView } from "./PlansBrowseDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TimeCombobox, formatTimeOption } from "@/components/ui/time-combobox";
import { fetchChapters } from "@/app/utils/recitation-api";
import {
  quantityAmount,
  getPlanPaceSummary,
  computeTodayTaskCounts,
  formatVerseRange,
} from "@/app/lib/plans/ui-helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// A plan IS a distinct object the user acts on, edits and dismisses, so a card
// is warranted here (unlike a marks row). Only the hardcoded rgba literal goes:
// it drew a real shadow on light and gold and nothing at all on dark, where
// --background is (7,15,23). --panel-cast spends dark's lift where it shows.
const CARD_SHADOW = "fq-panel-cast";

const STATUS_ACTIONS: Record<UserPlanStatus, { status: UserPlanStatus; icon: typeof Pause; labelKey: string; defaultLabel: string }[]> = {
  active: [
    { status: "paused", icon: Pause, labelKey: "plans.actions.pause", defaultLabel: "Pause" },
    { status: "completed", icon: CheckCircle2, labelKey: "plans.actions.markCompleted", defaultLabel: "Mark completed" },
    { status: "abandoned", icon: XCircle, labelKey: "plans.actions.abandon", defaultLabel: "Abandon" },
  ],
  paused: [
    { status: "active", icon: Play, labelKey: "plans.actions.resume", defaultLabel: "Resume" },
    { status: "abandoned", icon: XCircle, labelKey: "plans.actions.abandon", defaultLabel: "Abandon" },
  ],
  completed: [],
  abandoned: [],
};

const EDIT_VIEW_FOR_TEMPLATE: Record<string, PlansBrowseView> = {
  "daily-wird": "daily-wird",
  "listening-wird": "listening-wird",
  "memorizing-wird": "memorizing-wird",
  "reviewing-wird": "reviewing-wird",
  husun: "husun-settings",
  custom: "custom",
};

const STATUS_LABEL: Record<UserPlanStatus, { labelKey: string; defaultLabel: string }> = {
  active: { labelKey: "plans.status.active", defaultLabel: "Active" },
  paused: { labelKey: "plans.status.paused", defaultLabel: "Paused" },
  completed: { labelKey: "plans.status.completed", defaultLabel: "Completed" },
  abandoned: { labelKey: "plans.status.abandoned", defaultLabel: "Abandoned" },
};

const PlanRowSkeleton = () => (
  <div className="fq-panel-cast flex items-center gap-3 rounded-2xl border border-border bg-card p-4 animate-pulse">
    <span className="size-9 rounded-xl bg-muted flex-none" />
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-4 w-40 rounded bg-muted" />
    </div>
  </div>
);

const groupHistoryByDate = (entries: PlanProgressHistoryEntry[]) => {
  const groups: { date: string; entries: PlanProgressHistoryEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.date) last.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
};

// Read-only progress log for one plan, fetched on demand — never recomputed
// with current template params (ADR 0030: history reads what was actually
// done). Collapsed by default so it doesn't fetch until asked for. Expanded
// view is a vertical timeline: an inset line with one dot per entry.
const PlanHistorySection = ({ planId }: { planId: number }) => {
  const t = useTranslations();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const { data: history, isLoading } = usePlanHistory(planId, { enabled: expanded });
  const grouped = useMemo(() => groupHistoryByDate(history ?? []), [history]);
  const hasVerseUnitEntry = Boolean(history?.some((e) => e.unit === "verse"));
  const verseIndex = usePlanVerseIndex({ enabled: expanded && hasVerseUnitEntry });

  return (
    <div className="border-t border-border pt-2.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="fq-focus-ring flex items-center gap-1.5 rounded-md text-xs font-semibold text-[hsl(var(--control-inert))] transition-colors hover:text-[hsl(var(--control-live))]"
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          strokeWidth={1.8}
        />
        {t("plans.history.toggle", "History")}
      </button>

      {expanded ? (
        isLoading ? (
          <p className="text-xs text-muted-foreground mt-3">
            {t("plans.history.loading", "Loading…")}
          </p>
        ) : grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-3">
            {t("plans.history.empty", "No history yet.")}
          </p>
        ) : (
          <div className="relative mt-3 ps-[18px]">
            <div className="absolute top-1 bottom-1 start-[5px] w-px bg-border" />
            <div className="flex flex-col gap-3">
              {grouped.map((group) => (
                <div key={group.date} className="relative">
                  <span className="absolute -start-[18px] top-0.5 size-2.5 rounded-full bg-primary" />
                  <div className="text-xs font-bold text-foreground">
                    {new Date(`${group.date}T00:00:00`).toLocaleDateString(
                      locale === "ar" ? "ar-u-nu-arab" : locale,
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {group.entries.map((entry) => {
                      const trackUi = PLAN_TRACK_UI[entry.track_key];
                      const start = Number(entry.range_start);
                      const end = Number(entry.range_end);
                      const isVerseUnit = entry.unit === "verse";
                      const startKey = isVerseUnit ? verseIndex.data?.verseKeyOf(start) : undefined;
                      const endKey = isVerseUnit ? verseIndex.data?.verseKeyOf(end) : undefined;
                      const range =
                        isVerseUnit && startKey && endKey
                          ? startKey === endKey
                            ? startKey
                            : `${startKey}–${endKey}`
                          : start === end
                            ? toLocaleNumeral(start, locale)
                            : `${toLocaleNumeral(start, locale)}–${toLocaleNumeral(end, locale)}`;
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span>{trackUi ? t(trackUi.labelKey, trackUi.defaultLabel) : entry.track_key}</span>
                          <span>{isVerseUnit ? range : `${t("page", "Page")} ${range}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
};

export const PlanParametersSummary = ({ plan }: { plan: UserPlanListItem }) => {
  const t = useTranslations();
  const tIntl = useNextIntlTranslations();
  const locale = useLocale();
  const isVerseCustom = plan.template_key === "custom" && plan.definition?.unit === "verse";
  const verseIndex = usePlanVerseIndex({
    enabled: isVerseCustom,
  });
  const { data: chapters } = useQuery({
    queryKey: ["quran-chapters"],
    queryFn: fetchChapters,
    staleTime: Infinity,
    enabled: isVerseCustom,
  });

  const parts: string[] = [];

  if (plan.template_key === "husun") {
    const startJuz = plan.target_juz_start ?? 1;
    const endJuz = plan.target_juz_end ?? 30;
    if (startJuz === 1 && endJuz === 30) {
      parts.push(t("plans.summary.allQuran", "Whole Qur'an (30 Juz)"));
    } else {
      const startStr = toLocaleNumeral(startJuz, locale);
      const endStr = toLocaleNumeral(endJuz, locale);
      const rangeTemplate = t("plans.summary.juzRange", "Juz {start} to {end}");
      parts.push(rangeTemplate.replace("{start}", startStr).replace("{end}", endStr));
    }
    const hifzPace = quantityAmount(plan.params.quantities?.hifz, 1);
    const hifzUnit = plan.params.trackUnits?.hifz;
    parts.push(getPlanPaceSummary(hifzPace, hifzUnit, locale, t));
  } else if (plan.template_key === "daily-wird") {
    const pace = quantityAmount(plan.params.quantities?.reading, 5);
    const unit = plan.params.trackUnits?.reading;
    parts.push(getPlanPaceSummary(pace, unit, locale, t));
  } else if (plan.template_key === "listening-wird") {
    const pace = quantityAmount(plan.params.quantities?.listening, 5);
    const unit = plan.params.trackUnits?.listening;
    parts.push(getPlanPaceSummary(pace, unit, locale, t));
  } else if (plan.template_key === "memorizing-wird") {
    const pace = quantityAmount(plan.params.quantities?.memorizing, 1);
    const unit = plan.params.trackUnits?.memorizing;
    parts.push(getPlanPaceSummary(pace, unit, locale, t));
  } else if (plan.template_key === "reviewing-wird") {
    const pace = quantityAmount(plan.params.quantities?.reviewing, 1);
    const unit = plan.params.trackUnits?.reviewing;
    parts.push(getPlanPaceSummary(pace, unit, locale, t));
  } else if (plan.template_key === "custom" && plan.definition) {
    const def = plan.definition;
    if (def.unit === "page") {
      if (def.rangeStart === 1 && def.rangeEnd === 604) {
        parts.push(t("plans.custom.rangeMode.wholeMushaf", "Whole Quran"));
      } else if (def.rangeStart === def.rangeEnd) {
        const pageStr = toLocaleNumeral(def.rangeStart, locale);
        parts.push(tIntl("plans.custom.singlePage", { page: pageStr }));
      } else {
        const startStr = toLocaleNumeral(def.rangeStart, locale);
        const endStr = toLocaleNumeral(def.rangeEnd, locale);
        parts.push(
          tIntl("plans.custom.pagesRange", { start: startStr, end: endStr })
        );
      }
    } else {
      const startKey = verseIndex.data?.verseKeyOf(def.rangeStart);
      const endKey = verseIndex.data?.verseKeyOf(def.rangeEnd);
      if (startKey && endKey) {
        parts.push(formatVerseRange(startKey, endKey, locale, chapters));
      } else {
        const startStr = toLocaleNumeral(def.rangeStart, locale);
        const endStr = toLocaleNumeral(def.rangeEnd, locale);
        parts.push(
          def.rangeStart === def.rangeEnd
            ? `${t("plans.verse", "verse")} ${startStr}`
            : `${t("plans.verses", "verses")} ${startStr} – ${endStr}`
        );
      }
    }

    if (def.cadence.type === "pace") {
      const unitsPerDay = def.cadence.unitsPerDay;
      if (Number.isInteger(unitsPerDay)) {
        parts.push(
          def.unit === "verse"
            ? tIntl("plans.custom.versesPerDay", {
                count: unitsPerDay,
                n: toLocaleNumeral(unitsPerDay, locale),
              })
            : tIntl("plans.custom.pagesPerDay", {
                count: unitsPerDay,
                n: toLocaleNumeral(unitsPerDay, locale),
              })
        );
      } else {
        const weeklyAmount = Math.round(unitsPerDay * 7);
        parts.push(
          tIntl("plans.custom.pagesPerWeek", {
            count: weeklyAmount,
            n: toLocaleNumeral(weeklyAmount, locale),
          })
        );
      }
    } else if (def.cadence.type === "deadline") {
      const dateLocale = locale === "ar" ? "ar-u-nu-arab" : locale;
      const formattedDate = new Date(`${def.cadence.endDate}T00:00:00`).toLocaleDateString(
        dateLocale,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
      parts.push(`${t("plans.custom.targetDate", "Target date")}: ${formattedDate}`);
      if (def.cadence.repetitions && def.cadence.repetitions > 1) {
        parts.push(`×${toLocaleNumeral(def.cadence.repetitions, locale)}`);
      }
    } else if (def.cadence.type === "weekly") {
      const dayName = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
        new Date(Date.UTC(2026, 0, 4 + def.cadence.weekday))
      );
      parts.push(tIntl("plans.custom.estimate.weekly", { weekday: dayName }));
    }
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-1">
      {parts.map((part, idx) => (
        <span key={idx} className="inline-flex items-center gap-1.5">
          {idx > 0 && <span aria-hidden="true" className="text-muted-foreground/40">•</span>}
          <span>{part}</span>
        </span>
      ))}
    </div>
  );
};

const PlanCard = ({ plan }: { plan: UserPlanListItem }) => {
  const t = useTranslations();
  const tIntl = useNextIntlTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { setStatus } = usePlans();
  const [editOpen, setEditOpen] = useState(false);

  const ui = PLAN_TEMPLATE_UI[plan.template_key];
  const Icon = ui?.icon;
  const statusUi = STATUS_LABEL[plan.status];
  const actions = STATUS_ACTIONS[plan.status];
  const editView = EDIT_VIEW_FOR_TEMPLATE[plan.template_key];

  const { data: reminderData } = useQuery<{
    dedicated?: { planId: number; time: string }[];
  }>({
    queryKey: ["daily-wird-reminder"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/daily-reminder");
      if (!res.ok) throw new Error("Failed to fetch reminder preference");
      const json = await res.json();
      return json.data;
    },
  });

  const dedicatedReminder = reminderData?.dedicated?.find((d) => d.planId === plan.id);
  const hasDedicatedReminder = Boolean(dedicatedReminder);
  const dedicatedTime = dedicatedReminder?.time ?? "20:00";
  const formattedTime = hasDedicatedReminder ? formatTimeOption(dedicatedTime, locale) : "";

  // Weekly-recurring custom wirds (ADR 0070): the due weekday is derived from
  // the plan's cadence — read-only here, never picked on this surface.
  const def = plan.template_key === "custom" ? plan.definition : null;
  const weeklyWeekday =
    def && def.cadence.type === "weekly" ? def.cadence.weekday : null;
  const weeklyDayName =
    weeklyWeekday !== null
      ? new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
          new Date(Date.UTC(2026, 0, 4 + weeklyWeekday))
        )
      : null;

  const { mutate: updateDedicatedReminder } = useMutation({
    mutationFn: async (payload: { planId: number; time?: string; enabled: boolean }) => {
      const res = await fetch("/api/notifications/daily-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dedicated",
          planId: payload.planId,
          time: payload.time ?? "20:00",
          enabled: payload.enabled,
          timezone:
            typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
              : "UTC",
          locale,
        }),
      });
      if (!res.ok) throw new Error("Failed to update dedicated reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-wird-reminder"] });
    },
  });

  return (
    <div className={cn("flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4", CARD_SHADOW)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Identity icon */}
          <span className="grid place-items-center size-9 rounded-xl bg-primary/10 text-primary flex-none mt-0.5">
            {Icon ? <Icon className="size-[19px]" strokeWidth={1.6} /> : null}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-foreground">
                {plan.template_key === "custom" && plan.name
                  ? plan.name
                  : ui
                    ? t(ui.labelKey, ui.defaultLabel)
                    : plan.template_key}
              </span>
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-md font-semibold",
                  plan.status === "active"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t(statusUi.labelKey, statusUi.defaultLabel)}
              </span>
            </div>
            <PlanParametersSummary plan={plan} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-none">
          {editView ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="fq-focus-ring min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors"
            >
              <Pencil className="size-3.5" strokeWidth={1.8} />
              <span>{t("plans.actions.edit", "Edit")}</span>
            </button>
          ) : null}

          {actions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t("plans.actions.label", "Plan actions")}
                className="fq-chrome-btn fq-focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
              >
                <MoreVertical className="size-4" strokeWidth={1.8} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action.status}
                    onSelect={() => setStatus.mutate({ planId: plan.id, status: action.status })}
                    className="gap-2"
                  >
                    <action.icon className="size-4" strokeWidth={1.8} />
                    {t(action.labelKey, action.defaultLabel)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {editView ? (
        <PlansBrowseDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          initialView={editView}
          initialPlan={plan}
        />
      ) : null}

      {plan.status === "active" && (
        <div className="flex items-center justify-between border-t border-dashed border-border/70 pt-2.5 mt-1 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground min-w-0 flex-1">
            <Bell className="size-3.5 shrink-0 text-muted-foreground" />
            {weeklyDayName ? (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary whitespace-nowrap flex-none">
                {weeklyDayName}
              </span>
            ) : null}
            {hasDedicatedReminder ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-foreground">
                  {tIntl("plans.dedicatedReminder.badge", {
                    time: formattedTime,
                  })}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({t("plans.dedicatedReminder.generalNotice", "Excluded from general reminders")})
                </span>
              </div>
            ) : (
              <span className="truncate">
                {t("plans.dedicatedReminder.includedInGeneral", "Included in general reminders")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-none ms-2">
            {hasDedicatedReminder ? (
              <>
                <TimeCombobox
                  value={dedicatedTime}
                  onChange={(newTime) =>
                    updateDedicatedReminder({ planId: plan.id, time: newTime, enabled: true })
                  }
                  className="w-32"
                  triggerTestId={`dedicated-reminder-time-trigger-${plan.id}`}
                />
                <button
                  type="button"
                  onClick={() => updateDedicatedReminder({ planId: plan.id, enabled: false })}
                  className="fq-focus-ring min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive flex items-center justify-center rounded-lg transition-colors"
                  aria-label={t("plans.dedicatedReminder.remove", "Remove dedicated reminder")}
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() =>
                  updateDedicatedReminder({ planId: plan.id, time: "20:00", enabled: true })
                }
                className="fq-focus-ring min-h-[44px] inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-accent/50 transition-colors"
              >
                <Plus className="size-3" />
                <span>{t("plans.dedicatedReminder.set", "Set dedicated time")}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <PlanHistorySection planId={plan.id} />
    </div>
  );
};

// Hub body: Segmented dual-view tabs ([ Today's tasks | My plans ])
// separating daily actionable check-offs from plan configuration & management.
export const MyPlansList = () => {
  const t = useTranslations();
  const locale = useLocale();
  const { data: plans, isLoading } = usePlans();
  const { data: todayData } = useTodayAssignments();
  const items = plans ?? [];
  const active = items.filter((p) => p.status === "active");
  const other = items.filter((p) => p.status !== "active" && p.status !== "abandoned");
  const [activeTab, setActiveTab] = useState<"today" | "progress" | "plans">("today");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        <PlanRowSkeleton />
        <PlanRowSkeleton />
      </div>
    );
  }

  const { totalTasks, pendingTasks } = computeTodayTaskCounts(todayData);

  return (
    <div className="flex flex-col gap-6">
      {/* Segmented Navigation Tabs */}
      <div
        className="flex p-1 rounded-2xl bg-muted/50 border border-border text-xs font-semibold"
        role="tablist"
        aria-label={t("plans.pageTitle", "Daily Awrad & Learning Plans")}
      >
        <button
          type="button"
          role="tab"
          id="tab-today"
          data-testid="tab-today"
          aria-selected={activeTab === "today"}
          aria-controls="tabpanel-today"
          onClick={() => setActiveTab("today")}
          className={cn(
            "flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-150 fq-focus-ring",
            activeTab === "today"
              ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{t("plans.tabs.today", "Today's Tasks")}</span>
          {totalTasks > 0 ? (
            <span
              className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 min-w-5 h-4 text-[10px] rounded-full font-bold transition-colors",
                pendingTasks === 0
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {pendingTasks === 0 ? "✓" : `${toLocaleNumeral(pendingTasks, locale)}/${toLocaleNumeral(totalTasks, locale)}`}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-progress"
          data-testid="tab-progress"
          aria-selected={activeTab === "progress"}
          aria-controls="tabpanel-progress"
          onClick={() => setActiveTab("progress")}
          className={cn(
            "flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-150 fq-focus-ring",
            activeTab === "progress"
              ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{t("plans.tabs.progress", "Progress")}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-plans"
          data-testid="tab-plans"
          aria-selected={activeTab === "plans"}
          aria-controls="tabpanel-plans"
          onClick={() => setActiveTab("plans")}
          className={cn(
            "flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-150 fq-focus-ring",
            activeTab === "plans"
              ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{t("plans.tabs.manage", "My Plans")}</span>
          {active.length > 0 ? (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-5 h-4 text-[10px] rounded-full bg-muted text-muted-foreground font-bold">
              {toLocaleNumeral(active.length, locale)}
            </span>
          ) : null}
        </button>
      </div>

      {/* Tab 1: Today's Tasks */}
      {activeTab === "today" ? (
        <div id="tabpanel-today" data-testid="tabpanel-today" role="tabpanel" aria-labelledby="tab-today" className="flex flex-col gap-4">
          {items.length === 0 ? (
            <div className="fq-section-group flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="fq-well grid size-12 place-items-center rounded-2xl text-[hsl(var(--control-inert))]">
                <Target className="size-6" strokeWidth={1.6} />
              </span>
              <p className="text-sm font-medium text-foreground">
                {t("plans.empty", "No plans yet — enroll in one below.")}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {t(
                  "plans.emptyHint",
                  "A plan gives you a daily portion to read, listen to, or memorise.",
                )}
              </p>
              <div className="w-full pt-2">
                <AddPlanButton />
              </div>
            </div>
          ) : active.length > 0 ? (
            <>
              <PlansTodayHero />
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("plans")}
                  className="fq-focus-ring rounded-md text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-1 px-2"
                >
                  {t("plans.manageHint", "Want to edit your plans or view history? Go to Plan Management →")}
                </button>
              </div>
            </>
          ) : (
            <div className="fq-card flex flex-col items-center gap-3 p-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                {t("plans.noTasksToday", "No tasks due today.")}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {t(
                  "plans.noTasksHint",
                  "Your plans may be paused or completed. You can view or resume them in plan management."
                )}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("plans")}
                className="fq-focus-ring rounded-md mt-2 text-xs font-bold text-primary hover:underline py-1 px-2"
              >
                {t("plans.goToManage", "Go to Plan Management →")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Tab 2: Progress Dashboard */}
      {activeTab === "progress" ? (
        <div id="tabpanel-progress" data-testid="tabpanel-progress" role="tabpanel" aria-labelledby="tab-progress" className="flex flex-col gap-4">
          <PlansProgressTab hasPlans={items.length > 0} onSelectTab={setActiveTab} />
        </div>
      ) : null}

      {/* Tab 3: Plan Management */}
      {activeTab === "plans" ? (
        <div id="tabpanel-plans" data-testid="tabpanel-plans" role="tabpanel" aria-labelledby="tab-plans" className="flex flex-col gap-5">
          {items.length === 0 ? (
            <div className="fq-section-group flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="fq-well grid size-12 place-items-center rounded-2xl text-[hsl(var(--control-inert))]">
                <Target className="size-6" strokeWidth={1.6} />
              </span>
              <p className="text-sm font-medium text-foreground">
                {t("plans.empty", "No plans yet — enroll in one below.")}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {t(
                  "plans.emptyHint",
                  "A plan gives you a daily portion to read, listen to, or memorise.",
                )}
              </p>
              <div className="w-full pt-2">
                <AddPlanButton />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3.5">
                <div className="fq-overline">
                  {t("plans.myPlans", "My plans")}
                </div>
                {active.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
                {other.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>

              <AddPlanButton />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
