"use client";

import { useLocale } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { PLAN_TRACK_UI, PLAN_ACTIVITY_UI } from "@constants/plan-ui";
import type { TrackAssignment } from "@/app/lib/plans/engine";
import { cn } from "@/lib/utils";

type Props = {
  assignment: TrackAssignment;
  /** Check off when not yet completed, undo the check-off when it is. */
  onToggle: () => void;
  isPending: boolean;
  disabled: boolean;
};

const formatRange = (start: number, end: number, locale: string) =>
  start === end
    ? toLocaleNumeral(start, locale)
    : `${toLocaleNumeral(start, locale)}–${toLocaleNumeral(end, locale)}`;

// One track's today-assignment: icon + label + page range + check-off. Shared
// between the hub's MyPlansList and the reader's PlansWidget sheet so the two
// surfaces never drift apart.
export const PlanAssignmentRow = ({ assignment, onToggle, isPending, disabled }: Props) => {
  const t = useTranslations();
  const locale = useLocale();

  const trackUi = PLAN_TRACK_UI[assignment.trackKey];
  const activityUi = PLAN_ACTIVITY_UI[assignment.activity];
  const Icon = trackUi?.icon;

  const rangeLabel = formatRange(assignment.rangeStart, assignment.rangeEnd, locale);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <Link
        href={`/pages/${assignment.rangeStart}`}
        locale={locale}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <span className="grid place-items-center size-8 rounded-lg bg-primary/10 text-primary flex-none">
          {Icon ? <Icon className="size-4" strokeWidth={1.7} /> : null}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {trackUi ? t(trackUi.labelKey, trackUi.defaultLabel) : assignment.trackKey}
          </div>
          <div className="text-xs text-muted-foreground">
            {activityUi ? t(activityUi.labelKey, activityUi.defaultLabel) : assignment.activity}
            {" · "}
            {t("page", "Page")} {rangeLabel}
            {assignment.repetitions ? ` · ×${toLocaleNumeral(assignment.repetitions, locale)}` : ""}
          </div>
          {assignment.completed && assignment.next ? (
            <div className="text-xs text-muted-foreground/70">
              {t("plans.nextAssignment", "Next")}: {t("page", "Page")}{" "}
              {formatRange(assignment.next.rangeStart, assignment.next.rangeEnd, locale)}
              {assignment.next.repetitions
                ? ` · ×${toLocaleNumeral(assignment.next.repetitions, locale)}`
                : ""}
            </div>
          ) : null}
        </div>
      </Link>

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isPending}
        aria-label={
          assignment.completed
            ? t("plans.undoCheckOff", "Undo check-off")
            : t("plans.checkOff", "Check off")
        }
        aria-pressed={assignment.completed}
        className={cn(
          "grid flex-none place-items-center size-8 rounded-full transition-[background-color,box-shadow] duration-200",
          assignment.completed
            ? "bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.22)] hover:shadow-none"
            : "border-[1.5px] border-border bg-transparent hover:border-primary/50",
          "disabled:cursor-default disabled:hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.22)]",
        )}
      >
        {assignment.completed ? (
          <Check className="size-4 text-primary-foreground" strokeWidth={2.6} />
        ) : null}
      </button>
    </div>
  );
};
