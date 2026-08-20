"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, MoreVertical, Pause, Pencil, Play, XCircle, CheckCircle2 } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { usePlans } from "@hooks/use-plans";
import { useTodayAssignments } from "@hooks/use-today-assignments";
import { usePlanHistory } from "@hooks/use-plan-history";
import { useOnlineStatus } from "@hooks/use-online-status";
import { PLAN_TEMPLATE_UI, PLAN_TRACK_UI } from "@constants/plan-ui";
import type { PlanProgressHistoryEntry, UserPlanListItem } from "@/app/server/actions/plans";
import type { UserPlanStatus } from "@constants/plans";
import { usePlanVerseIndex } from "@hooks/use-plan-verse-index";
import { PlanAssignmentRow } from "./PlanAssignmentRow";
import { PlansTodayHero } from "./PlansTodayHero";
import { AddPlanButton } from "./AddPlanButton";
import { PlansBrowseDialog, type PlansBrowseView } from "./PlansBrowseDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const CARD_SHADOW =
  "shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]";

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
  husun: "husun-settings",
};

const STATUS_LABEL: Record<UserPlanStatus, { labelKey: string; defaultLabel: string }> = {
  active: { labelKey: "plans.status.active", defaultLabel: "Active" },
  paused: { labelKey: "plans.status.paused", defaultLabel: "Paused" },
  completed: { labelKey: "plans.status.completed", defaultLabel: "Completed" },
  abandoned: { labelKey: "plans.status.abandoned", defaultLabel: "Abandoned" },
};

const PlanRowSkeleton = () => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 animate-pulse">
    <span className="size-9 rounded-lg bg-muted flex-none" />
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
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
                    {new Date(`${group.date}T00:00:00`).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
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

const PlanCard = ({ plan }: { plan: UserPlanListItem }) => {
  const t = useTranslations();
  const isOnline = useOnlineStatus();
  const { setStatus } = usePlans();
  const { data: todayData, checkOff, uncheckOff } = useTodayAssignments();
  const [editOpen, setEditOpen] = useState(false);

  const ui = PLAN_TEMPLATE_UI[plan.template_key];
  const Icon = ui?.icon;
  const statusUi = STATUS_LABEL[plan.status];
  const actions = STATUS_ACTIONS[plan.status];
  const editView = EDIT_VIEW_FOR_TEMPLATE[plan.template_key];
  const assignments =
    plan.status === "active"
      ? (todayData ?? []).find((p) => p.planId === plan.id)?.assignments ?? []
      : [];

  return (
    <div className={cn("flex flex-col gap-3.5 rounded-2xl bg-card p-4", CARD_SHADOW)}>
      <div className="flex items-center gap-3">
        <span className="grid place-items-center size-9 rounded-xl bg-primary/10 text-primary flex-none">
          {Icon ? <Icon className="size-[19px]" strokeWidth={1.6} /> : null}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold text-foreground">
            {ui ? t(ui.labelKey, ui.defaultLabel) : plan.template_key}
          </div>
          <div className="text-xs text-muted-foreground">
            {t(statusUi.labelKey, statusUi.defaultLabel)}
          </div>
        </div>

        {actions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("plans.actions.label", "Plan actions")}
              className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MoreVertical className="size-4" strokeWidth={1.8} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editView ? (
                <DropdownMenuItem onSelect={() => setEditOpen(true)} className="gap-2">
                  <Pencil className="size-4" strokeWidth={1.8} />
                  {t("plans.actions.edit", "Edit")}
                </DropdownMenuItem>
              ) : null}
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

      {editView ? (
        <PlansBrowseDialog open={editOpen} onOpenChange={setEditOpen} initialView={editView} />
      ) : null}

      {plan.status === "active" ? (
        assignments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {assignments.map((assignment) => (
              <PlanAssignmentRow
                key={assignment.trackKey}
                planId={plan.id}
                assignment={assignment}
                onToggle={() =>
                  assignment.completed
                    ? uncheckOff.mutate({ planId: plan.id, trackKey: assignment.trackKey })
                    : checkOff.mutate({
                        planId: plan.id,
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
              <p className="text-xs text-muted-foreground text-center">
                {t("plans.offlineNotice", "Connect to the internet to check off progress")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("plans.nothingToday", "Nothing due today.")}
          </p>
        )
      ) : null}

      <PlanHistorySection planId={plan.id} />
    </div>
  );
};

// Hub body: hero "today" card (all active plans' assignments, streak + week
// strip) above per-plan cards (status, actions, history), plus the
// consolidated "new wird" entry point.
export const MyPlansList = () => {
  const t = useTranslations();
  const { data: plans, isLoading } = usePlans();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <PlanRowSkeleton />
        <PlanRowSkeleton />
      </div>
    );
  }

  const items = plans ?? [];
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-center text-sm text-muted-foreground py-8">
          {t("plans.empty", "No plans yet — enroll in one below.")}
        </p>
        <AddPlanButton />
      </div>
    );
  }

  const active = items.filter((p) => p.status === "active");
  const other = items.filter((p) => p.status !== "active" && p.status !== "abandoned");

  return (
    <div className="flex flex-col gap-6">
      {active.length > 0 ? <PlansTodayHero /> : null}

      <div className="flex flex-col gap-3.5">
        <div className="text-xs font-extrabold tracking-wide text-muted-foreground">
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
    </div>
  );
};
