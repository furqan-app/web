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
  onCheckOff: () => void;
  isPending: boolean;
  disabled: boolean;
};

// One track's today-assignment: icon + label + page range + check-off. Shared
// between the hub's MyPlansList and the reader's PlansWidget sheet so the two
// surfaces never drift apart.
export const PlanAssignmentRow = ({ assignment, onCheckOff, isPending, disabled }: Props) => {
  const t = useTranslations();
  const locale = useLocale();

  const trackUi = PLAN_TRACK_UI[assignment.trackKey];
  const activityUi = PLAN_ACTIVITY_UI[assignment.activity];
  const Icon = trackUi?.icon;

  const rangeLabel =
    assignment.rangeStart === assignment.rangeEnd
      ? toLocaleNumeral(assignment.rangeStart, locale)
      : `${toLocaleNumeral(assignment.rangeStart, locale)}–${toLocaleNumeral(assignment.rangeEnd, locale)}`;

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
        </div>
      </Link>

      {assignment.completed ? (
        <span className="grid place-items-center size-7 rounded-full bg-primary/10 text-primary flex-none">
          <Check className="size-4" strokeWidth={2} />
        </span>
      ) : (
        <button
          type="button"
          onClick={onCheckOff}
          disabled={disabled || isPending}
          className={cn(
            "flex-none rounded-lg px-2.5 py-1.5 text-xs font-medium border border-border text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50",
          )}
        >
          {t("plans.checkOff", "Check off")}
        </button>
      )}
    </div>
  );
};
