"use client";

import { useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "@/app/hooks/use-isomorphic-layout-effect";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import useTranslations from "@hooks/use-translations";
import { useTodayAssignments } from "@hooks/use-today-assignments";
import { useOnlineStatus } from "@hooks/use-online-status";
import { useReaderPage } from "@/app/contexts/ReaderPageContext";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useIsReaderRoute } from "@/app/hooks/use-is-reader-route";
import { PLAN_TEMPLATE_UI } from "@constants/plan-ui";
import type { TrackAssignment } from "@/app/lib/plans/engine";
import { getPageRelevantAssignments } from "@/app/lib/plans/assignment-range";
import { usePlanVerseIndex } from "@hooks/use-plan-verse-index";
import { PlanAssignmentRow } from "./PlanAssignmentRow";
import { Check, RotateCcw } from "lucide-react";
import { useSmartCompletion } from "@hooks/use-smart-completion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const RADIUS = 17;
const CENTER = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type FlourishState = "idle" | "flourishing" | "fading" | "done";

function getSegmentArcPath(index: number, count: number, gapDeg = 8): string {
  const sliceDeg = 360 / count;
  const arcDeg = sliceDeg - gapDeg;
  const startDeg = -90 + index * sliceDeg + gapDeg / 2;
  const endDeg = startDeg + arcDeg;

  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;

  const x1 = CENTER + RADIUS * Math.cos(startRad);
  const y1 = CENTER + RADIUS * Math.sin(startRad);
  const x2 = CENTER + RADIUS * Math.cos(endRad);
  const y2 = CENTER + RADIUS * Math.sin(endRad);

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// Floating unobtrusive progress dial on reader routes surfacing today's
// assignments scoped to the current page. Renders null unless >= 1 uncompleted
// assignment overlaps the reader position, and auto-hides after completion.
// Excluded on shared mushaf grant reader routes (ADR 0012).
// Mirrors RecitationPlayerBar's nav-overlay show/hide.
export const PlansWidget = () => {
  const t = useTranslations();
  const pathname = usePathname();
  const { status: sessionStatus } = useSession();
  const isOnReaderRoute = useIsReaderRoute();
  const isSharedMushaf = pathname?.includes("/mushaf/") ?? false;
  const isSelfReaderRoute = isOnReaderRoute && !isSharedMushaf;
  const isSignedIn = sessionStatus === "authenticated";

  const { data: todayData, checkOff, uncheckOff } = useTodayAssignments({
    enabled: isSelfReaderRoute && isSignedIn,
  });
  const isOnline = useOnlineStatus();
  const { visiblePages } = useReaderPage();
  const {
    recitedPage,
    status: recitationStatus,
    currentVerseKey,
    settings: recitationSettings,
    activeOverride,
  } = useRecitation();
  const { isOverlayMode, overlayVisible } = useNavOverlay();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [flourishState, setFlourishState] = useState<FlourishState>("idle");
  const [completionPending, setCompletionPending] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevSheetOpenRef = useRef<boolean>(sheetOpen);
  const prevPendingRef = useRef<number | null>(null);
  const prevPageKeyRef = useRef<string>("");

  // Only fetch/build the verse index when at least one active track actually
  // needs it — the page-unit majority never pays for it.
  const needsVerseIndex = Boolean(
    todayData?.some((plan) =>
      plan.assignments.some(
        (a) => !a.completed && (a.unit === "verse" || a.activity === "listen"),
      ),
    ),
  );
  const verseIndex = usePlanVerseIndex({ enabled: needsVerseIndex });

  const isPlaybackActive = recitationStatus !== "idle";
  const { relevant, pendingCount, totalCount, doneFraction } = getPageRelevantAssignments(
    todayData,
    visiblePages,
    recitedPage,
    isPlaybackActive,
    verseIndex.data,
  );

  const pageKey = `${visiblePages?.join(",") ?? ""}:${isPlaybackActive && recitedPage != null ? recitedPage : ""}`;

  const startFlourish = () => {
    setFlourishState("flourishing");

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      timerRef.current = setTimeout(() => {
        setFlourishState("fading");
        timerRef.current = setTimeout(() => {
          setFlourishState("done");
          timerRef.current = null;
        }, 200);
      }, 100);
    } else {
      timerRef.current = setTimeout(() => {
        setFlourishState("fading");
        timerRef.current = setTimeout(() => {
          setFlourishState("done");
          timerRef.current = null;
        }, 300);
      }, 1200);
    }
  };

  const smartCompletion = useSmartCompletion({
    enabled: isSelfReaderRoute && isSignedIn && !sheetOpen,
    visiblePages,
    relevant,
    recitationStatus,
    currentVerseKey,
    activeOverrideId: activeOverride?.id ?? null,
    playbackSpeed: recitationSettings.playbackSpeed,
    verseIndex: verseIndex.data,
    onCheckOff: (input) => {
      checkOff.mutate({
        planId: input.planId,
        trackKey: input.trackKey,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
      });
    },
    onUncheckOff: (input) => {
      uncheckOff.mutate({
        planId: input.planId,
        trackKey: input.trackKey,
      });
    },
    onStartFlourish: startFlourish,
  });

  useIsomorphicLayoutEffect(() => {
    // 1. If reader position changed (page turn), cancel any in-flight flourish, clear pending completion, and close sheet
    if (prevPageKeyRef.current !== pageKey) {
      prevPageKeyRef.current = pageKey;
      prevPendingRef.current = pendingCount;
      // Close sheet quietly on navigation away so it does not spontaneously reopen if the user returns to this page
      setSheetOpen(false);
      setCompletionPending(false);
      if (flourishState !== "idle") {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setFlourishState("idle");
      }
      return;
    }

    // 2. If check-off was undone, reset flourish state back to idle and clear pending completion
    if (pendingCount > 0) {
      if (completionPending) setCompletionPending(false);
      if (flourishState !== "idle") {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setFlourishState("idle");
      }
    }

    // 3. Completion detection: on the same page, pending dropped from > 0 to 0 (with totalCount > 0)
    if (
      prevPendingRef.current !== null &&
      prevPendingRef.current > 0 &&
      pendingCount === 0 &&
      totalCount > 0 &&
      flourishState === "idle"
    ) {
      if (sheetOpen) {
        // Sheet is currently open: remember completion is pending; do not flourish yet
        setCompletionPending(true);
      } else {
        // Sheet already closed: flourish immediately
        setCompletionPending(false);
        startFlourish();
      }
    }

    // 4. When sheet closes: if completion was pending and still all completed, trigger flourish
    const justClosedSheet = prevSheetOpenRef.current && !sheetOpen;
    if (
      justClosedSheet &&
      completionPending &&
      pendingCount === 0 &&
      totalCount > 0 &&
      flourishState === "idle"
    ) {
      setCompletionPending(false);
      startFlourish();
    }

    prevSheetOpenRef.current = sheetOpen;
    prevPendingRef.current = pendingCount;
  }, [pageKey, pendingCount, totalCount, flourishState, sheetOpen, completionPending]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (
    !isSelfReaderRoute ||
    !isSignedIn ||
    !visiblePages ||
    totalCount === 0 ||
    (flourishState === "done" && !smartCompletion.autoWriteNotice) ||
    (flourishState === "idle" &&
      pendingCount === 0 &&
      !sheetOpen &&
      !completionPending &&
      !smartCompletion.autoWriteNotice)
  ) {
    return null;
  }

  const isFlourishing = flourishState === "flourishing" || flourishState === "fading";
  const isFading = flourishState === "fading";

  const getOfferTitle = (activity?: string) => {
    switch (activity) {
      case "listen":
        return t("plans.detection.listeningOfferTitle", "Finished today's recitation?");
      case "memorize":
        return t("plans.detection.memorizeOfferTitle", "Finished today's memorization?");
      case "review":
        return t("plans.detection.reviewOfferTitle", "Finished today's review?");
      case "read":
      default:
        return t("plans.detection.readingOfferTitle", "Finished today's reading?");
    }
  };

  const renderDialRing = () => {
    if (totalCount === 0) return null;

    if (totalCount === 1) {
      const isCompleted = relevant[0]?.assignment.completed || isFlourishing;
      const isOffered =
        smartCompletion.activeOffer?.assignment.trackKey === relevant[0]?.assignment.trackKey;
      return (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={
            isCompleted || isOffered
              ? "hsl(var(--primary))"
              : "hsl(var(--primary) / 0.6)"
          }
          strokeWidth="3"
          className={cn(
            "transition-colors duration-300 ease-out",
            isOffered && "motion-safe:animate-pulse",
          )}
        />
      );
    }

    if (totalCount <= 4) {
      const gapDeg = totalCount === 2 ? 12 : 8;
      return (
        <>
          {relevant.map(({ assignment }, idx) => {
            const isDone = assignment.completed || isFlourishing;
            const isOffered =
              smartCompletion.activeOffer?.assignment.trackKey === assignment.trackKey;
            return (
              <path
                key={`${assignment.trackKey}-${idx}`}
                d={getSegmentArcPath(idx, totalCount, gapDeg)}
                fill="none"
                stroke={
                  isDone || isOffered
                    ? "hsl(var(--primary))"
                    : "hsl(var(--primary) / 0.6)"
                }
                strokeWidth="3"
                strokeLinecap="round"
                className={cn(
                  "transition-[stroke] duration-300 ease-out",
                  isOffered && "motion-safe:animate-pulse",
                )}
              />
            );
          })}
        </>
      );
    }

    return (
      <>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--primary) / 0.6)"
          strokeWidth="3"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={isFlourishing ? 0 : CIRCUMFERENCE * (1 - doneFraction)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </>
    );
  };

  // Group relevant items by plan for the sheet
  const plansMap = new Map<
    number,
    { plan: (typeof relevant)[0]["plan"]; assignments: TrackAssignment[] }
  >();
  for (const item of relevant) {
    let entry = plansMap.get(item.plan.planId);
    if (!entry) {
      entry = { plan: item.plan, assignments: [] };
      plansMap.set(item.plan.planId, entry);
    }
    entry.assignments.push(item.assignment);
  }

  return (
    <>
      {flourishState === "flourishing" && (
        <span className="sr-only" role="status" aria-live="polite">
          {t("plans.widget.completed", "Today's wird on this page is done")}
        </span>
      )}

      {smartCompletion.activeOffer && !sheetOpen && (
        <div
          data-testid="smart-completion-offer"
          role="alert"
          aria-live="polite"
          className={cn(
            "fixed z-40 bottom-24 end-16 flex items-center gap-2.5 rounded-full bg-card border border-border py-1 ps-3.5 pe-1.5 shadow-[inset_0_1px_0_hsl(var(--surface-rim)/var(--surface-rim-alpha))] transition-all duration-300",
            isOverlayMode && !overlayVisible && "translate-y-36 opacity-0 pointer-events-none",
            isFading && "opacity-0 scale-95",
          )}
          style={isOverlayMode ? { transitionTimingFunction: EASE_OUT } : undefined}
        >
          <div className="flex flex-col gap-0.5 select-none">
            <span className="text-[11px] font-bold text-foreground leading-tight">
              {getOfferTitle(smartCompletion.activeOffer.assignment.activity)}
            </span>
            {smartCompletion.activeOffer.planName ? (
              <span className="text-[9px] text-muted-foreground leading-none">
                {smartCompletion.activeOffer.planName}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="smart-completion-confirm"
              onClick={smartCompletion.handleConfirmOffer}
              className="fq-focus-ring min-h-[44px] px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 active:scale-[0.97] transition-all hover:bg-primary/90"
            >
              <Check className="size-3.5" aria-hidden="true" />
              <span>{t("plans.detection.confirm", "Confirm")}</span>
            </button>
            <button
              type="button"
              data-testid="smart-completion-dismiss"
              onClick={smartCompletion.handleDismissOffer}
              className="fq-focus-ring min-h-[44px] px-2.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
            >
              {t("plans.detection.dismiss", "Not now")}
            </button>
          </div>
        </div>
      )}

      {smartCompletion.autoWriteNotice && (
        <div
          data-testid="smart-completion-auto-notice"
          role="status"
          aria-live="polite"
          className={cn(
            "fixed z-40 bottom-24 end-16 flex items-center gap-2.5 rounded-full bg-card border border-border py-1 ps-3.5 pe-1.5 shadow-[inset_0_1px_0_hsl(var(--surface-rim)/var(--surface-rim-alpha))] transition-all duration-300",
            isOverlayMode && !overlayVisible && "translate-y-36 opacity-0 pointer-events-none",
            isFading && "opacity-0 scale-95",
          )}
          style={isOverlayMode ? { transitionTimingFunction: EASE_OUT } : undefined}
        >
          <div className="flex items-center gap-1.5 select-none">
            <Check className="size-3.5 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-xs font-bold text-foreground">
              {smartCompletion.autoWriteNotice.activity === "listen"
                ? t("plans.detection.autoWriteNoticeListening", "Listening wird auto-recorded")
                : smartCompletion.autoWriteNotice.activity === "read"
                  ? t("plans.detection.autoWriteNoticeReading", "Reading wird auto-recorded")
                  : t("plans.detection.autoWriteNoticeGeneric", "Wird completion automatically recorded")}
            </span>
          </div>
          <button
            type="button"
            data-testid="smart-completion-undo"
            onClick={smartCompletion.handleUndoAutoWrite}
            className="fq-focus-ring min-h-[44px] px-3 py-1.5 rounded-full bg-foreground/10 text-foreground hover:bg-foreground/15 text-xs font-semibold flex items-center gap-1 active:scale-[0.97] transition-all"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>{t("plans.detection.undo", "Undo")}</span>
          </button>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open && completionPending && pendingCount === 0 && totalCount > 0 && flourishState === "idle") {
            setCompletionPending(false);
            startFlourish();
          }
        }}
      >
        <SheetTrigger
          data-testid="plans-widget-trigger"
          aria-label={t("plans.widget.open", "Check off today's wird")}
          className={cn(
            "fixed z-40 bottom-24 end-4 size-11 flex items-center justify-center p-0.5 fq-focus-ring rounded-full",
            isOverlayMode && "transition-all duration-300",
            isOverlayMode && !overlayVisible && "translate-y-36 opacity-0 pointer-events-none",
            isFading && "opacity-0 scale-95 transition-all duration-300 ease-out",
          )}
          style={isOverlayMode ? { transitionTimingFunction: EASE_OUT } : undefined}
        >
          <span
            className={cn(
              "relative size-[42px] rounded-full bg-card border border-border grid place-items-center shadow-[inset_0_1px_0_hsl(var(--surface-rim)/var(--surface-rim-alpha))] transition-transform duration-300 ease-out",
              isFlourishing && "scale-[1.05]",
              smartCompletion.isOffering && "border-primary scale-[1.05]",
            )}
          >
            <svg
              viewBox="0 0 40 40"
              className="absolute inset-0 size-full pointer-events-none"
            >
              {renderDialRing()}
              <text
                x={CENTER}
                y={CENTER}
                textAnchor="middle"
                dominantBaseline="central"
                fill={
                  smartCompletion.isOffering
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground))"
                }
                fontSize="7.5"
                fontWeight={smartCompletion.isOffering ? "700" : "500"}
                letterSpacing="-0.02em"
                className="select-none pointer-events-none"
                aria-hidden="true"
              >
                {t("plans.widget.dialLabel", "wird")}
              </text>
            </svg>
          </span>
        </SheetTrigger>

        <SheetContent side="bottom" className="max-h-[70dvh] overflow-y-auto fq-scroll-nice">
          <SheetHeader>
            <SheetTitle>{t("plans.widget.title", "Today's wird")}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("plans.widget.description", "Assignments due on this page for your active plans.")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-4">
            {Array.from(plansMap.values()).map(({ plan, assignments }) => {
              const ui = PLAN_TEMPLATE_UI[plan.templateKey];
              return (
                <div key={plan.planId} className="flex flex-col gap-2">
                  <div className="text-xs font-bold text-primary">
                    {plan.name || (ui ? t(ui.labelKey, ui.defaultLabel) : plan.templateKey)}
                  </div>
                  {assignments.map((assignment) => (
                    <PlanAssignmentRow
                      key={assignment.trackKey}
                      planId={plan.planId}
                      planName={plan.name}
                      assignment={assignment}
                      onToggle={() =>
                        assignment.completed
                          ? uncheckOff.mutate({
                              planId: plan.planId,
                              trackKey: assignment.trackKey,
                            })
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
              );
            })}
            {!isOnline ? (
              <p className="text-xs text-muted-foreground text-center">
                {t("plans.offlineNotice", "Connect to the internet to check off progress")}
              </p>
            ) : null}
          </div>

          <div className="mt-2 pt-3 border-t border-border/50 text-center">
            <Link
              href="/plans"
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium inline-block py-1"
            >
              {t("plans.widget.viewAllPlans", "All plans & history")}
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
