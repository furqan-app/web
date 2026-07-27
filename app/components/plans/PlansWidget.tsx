"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { useLocale } from "next-intl";
import { useTodayAssignments } from "@hooks/use-today-assignments";
import { useOnlineStatus } from "@hooks/use-online-status";
import { useReaderPage } from "@/app/contexts/ReaderPageContext";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { PLAN_TEMPLATE_UI } from "@constants/plan-ui";
import type { TrackAssignment } from "@/app/lib/plans/engine";
import { PlanAssignmentRow } from "./PlanAssignmentRow";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

const inRange = (
  assignment: TrackAssignment,
  visiblePages: number[] | null,
  recitedPage: number | null,
  isPlaybackActive: boolean,
): boolean => {
  if (assignment.activity === "listen" && isPlaybackActive && recitedPage != null) {
    return recitedPage >= assignment.rangeStart && recitedPage <= assignment.rangeEnd;
  }
  if (!visiblePages) return false;
  return visiblePages.some((p) => p >= assignment.rangeStart && p <= assignment.rangeEnd);
};

// Floating pill on reader routes surfacing every active plan's today
// assignments, with a live "in range" hint — never an auto-check-off (D5).
// Mirrors RecitationPlayerBar's nav-overlay show/hide.
export const PlansWidget = () => {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { status: sessionStatus } = useSession();
  const isOnReaderRoute = Boolean(pathname?.includes("/pages/"));
  const isSignedIn = sessionStatus === "authenticated";

  const { data: todayData, checkOff, uncheckOff } = useTodayAssignments({
    enabled: isOnReaderRoute && isSignedIn,
  });
  const isOnline = useOnlineStatus();
  const { visiblePages } = useReaderPage();
  const { recitedPage, status: recitationStatus } = useRecitation();
  const { isOverlayMode, overlayVisible } = useNavOverlay();

  if (!isOnReaderRoute || !isSignedIn || !todayData || todayData.length === 0) {
    return null;
  }

  const rows = todayData.flatMap((plan) =>
    plan.assignments.map((assignment) => ({ plan, assignment })),
  );
  const totalCount = rows.length;
  const pendingCount = rows.filter((r) => !r.assignment.completed).length;
  const doneFraction = totalCount > 0 ? (totalCount - pendingCount) / totalCount : 0;
  const isHighlighted = rows.some(({ assignment }) =>
    inRange(assignment, visiblePages, recitedPage, recitationStatus !== "idle"),
  );

  const RING_RADIUS = 22;
  const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  return (
    <Sheet>
      <SheetTrigger
        aria-label={t("plans.widget.open", "Today's plans")}
        className={cn(
          "fixed z-40 bottom-20 end-4 size-[50px]",
          isOverlayMode && "transition-transform duration-300",
          isOverlayMode && !overlayVisible && "translate-y-24 opacity-0 pointer-events-none",
        )}
        style={isOverlayMode ? { transitionTimingFunction: EASE_OUT } : undefined}
      >
        <span className="relative block size-full">
          <svg width="50" height="50" viewBox="0 0 50 50" className="absolute inset-0">
            <circle
              cx="25"
              cy="25"
              r={RING_RADIUS}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="3"
            />
            <circle
              cx="25"
              cy="25"
              r={RING_RADIUS}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - doneFraction)}
              transform="rotate(-90 25 25)"
              className="transition-[stroke-dashoffset] duration-300 ease-out"
            />
          </svg>
          <span
            className={cn(
              "absolute inset-[6px] grid place-items-center rounded-full bg-primary shadow-[0_6px_14px_-6px_rgba(0,0,0,0.4)] transition-shadow duration-200",
              isHighlighted && "shadow-[0_0_0_4px_hsl(var(--primary)/0.25)]",
            )}
          >
            <span className="text-[11px] font-extrabold text-primary-foreground">
              {toLocaleNumeral(pendingCount, locale)}
            </span>
          </span>
        </span>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[70dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("plans.widget.title", "Today's plans")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("plans.widget.description", "Your active plans' assignments for today.")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          {todayData.map((plan) => {
            const ui = PLAN_TEMPLATE_UI[plan.templateKey];
            return (
              <div key={plan.planId} className="flex flex-col gap-2">
                <div className="text-xs font-bold text-primary">
                  {ui ? t(ui.labelKey, ui.defaultLabel) : plan.templateKey}
                </div>
                {plan.assignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("plans.nothingToday", "Nothing due today.")}
                  </p>
                ) : (
                  plan.assignments.map((assignment) => (
                    <PlanAssignmentRow
                      key={assignment.trackKey}
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
                  ))
                )}
              </div>
            );
          })}
          {!isOnline ? (
            <p className="text-xs text-muted-foreground text-center">
              {t("plans.offlineNotice", "Connect to the internet to check off progress")}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
