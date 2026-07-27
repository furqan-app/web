"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, ChevronUp, MoreVertical, Pause, Play, XCircle, CheckCircle2 } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { usePlans } from "@hooks/use-plans";
import { useTodayAssignments } from "@hooks/use-today-assignments";
import { usePlanHistory } from "@hooks/use-plan-history";
import { useOnlineStatus } from "@hooks/use-online-status";
import { PLAN_TEMPLATE_UI, PLAN_TRACK_UI } from "@constants/plan-ui";
import type { PlanProgressHistoryEntry, UserPlanListItem } from "@/app/server/actions/plans";
import type { UserPlanStatus } from "@constants/plans";
import { PlanAssignmentRow } from "./PlanAssignmentRow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
// done). Collapsed by default so it doesn't fetch until asked for.
const PlanHistorySection = ({ planId }: { planId: number }) => {
  const t = useTranslations();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const { data: history, isLoading } = usePlanHistory(planId, { enabled: expanded });
  const grouped = useMemo(() => groupHistoryByDate(history ?? []), [history]);

  return (
    <div className="border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronUp className="size-3.5" strokeWidth={1.8} />
        ) : (
          <ChevronDown className="size-3.5" strokeWidth={1.8} />
        )}
        {t("plans.history.toggle", "History")}
      </button>

      {expanded ? (
        isLoading ? (
          <p className="text-xs text-muted-foreground mt-2">
            {t("plans.history.loading", "Loading…")}
          </p>
        ) : grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">
            {t("plans.history.empty", "No history yet.")}
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {grouped.map((group) => (
              <div key={group.date} className="flex flex-col gap-1">
                <div className="text-xs font-semibold text-foreground">
                  {new Date(`${group.date}T00:00:00`).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                {group.entries.map((entry) => {
                  const trackUi = PLAN_TRACK_UI[entry.track_key];
                  const start = Number(entry.range_start);
                  const end = Number(entry.range_end);
                  const range =
                    start === end
                      ? toLocaleNumeral(start, locale)
                      : `${toLocaleNumeral(start, locale)}–${toLocaleNumeral(end, locale)}`;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-xs text-muted-foreground ps-1"
                    >
                      <span>{trackUi ? t(trackUi.labelKey, trackUi.defaultLabel) : entry.track_key}</span>
                      <span>
                        {t("page", "Page")} {range}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
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
  const { data: todayData, checkOff } = useTodayAssignments();

  const ui = PLAN_TEMPLATE_UI[plan.template_key];
  const Icon = ui?.icon;
  const statusUi = STATUS_LABEL[plan.status];
  const actions = STATUS_ACTIONS[plan.status];
  const assignments =
    plan.status === "active"
      ? (todayData ?? []).find((p) => p.planId === plan.id)?.assignments ?? []
      : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary flex-none">
          {Icon ? <Icon className="size-5" strokeWidth={1.6} /> : null}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">
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

      {plan.status === "active" ? (
        assignments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {assignments.map((assignment) => (
              <PlanAssignmentRow
                key={assignment.trackKey}
                assignment={assignment}
                onCheckOff={() =>
                  checkOff.mutate({
                    planId: plan.id,
                    trackKey: assignment.trackKey,
                    rangeStart: assignment.rangeStart,
                    rangeEnd: assignment.rangeEnd,
                  })
                }
                isPending={checkOff.isPending}
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

// Hub body: enrollments grouped by status, active ones showing today's
// assignments with check-off; pause/resume/abandon/complete via PATCH.
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
      <p className="text-center text-sm text-muted-foreground py-8">
        {t("plans.empty", "No plans yet — enroll in one below.")}
      </p>
    );
  }

  const active = items.filter((p) => p.status === "active");
  const other = items.filter((p) => p.status !== "active");

  return (
    <div className="flex flex-col gap-2">
      {active.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
      {other.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
};
