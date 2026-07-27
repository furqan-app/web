"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Target } from "lucide-react";
import useTranslations from "@hooks/use-translations";
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
  const pathname = usePathname();
  const { status: sessionStatus } = useSession();
  const isOnReaderRoute = Boolean(pathname?.includes("/pages/"));
  const isSignedIn = sessionStatus === "authenticated";

  const { data: todayData, checkOff } = useTodayAssignments({
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
  const pendingCount = rows.filter((r) => !r.assignment.completed).length;
  const isHighlighted = rows.some(({ assignment }) =>
    inRange(assignment, visiblePages, recitedPage, recitationStatus !== "idle"),
  );

  return (
    <Sheet>
      <SheetTrigger
        aria-label={t("plans.widget.open", "Today's plans")}
        className={cn(
          "fixed z-40 bottom-20 end-4 flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur",
          isHighlighted
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card/95 text-foreground border-border supports-[backdrop-filter]:bg-card/80",
          isOverlayMode && "transition-transform duration-300",
          isOverlayMode && !overlayVisible && "translate-y-24 opacity-0 pointer-events-none",
        )}
        style={isOverlayMode ? { transitionTimingFunction: EASE_OUT } : undefined}
      >
        <Target className="size-4" strokeWidth={1.8} />
        {pendingCount > 0 ? (
          <span className="text-xs font-semibold">{pendingCount}</span>
        ) : null}
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
                      onCheckOff={() =>
                        checkOff.mutate({
                          planId: plan.planId,
                          trackKey: assignment.trackKey,
                          rangeStart: assignment.rangeStart,
                          rangeEnd: assignment.rangeEnd,
                        })
                      }
                      isPending={checkOff.isPending}
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
