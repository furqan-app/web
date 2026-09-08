"use client";

import { useState, useEffect } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import type { PlanActivity } from "@constants/plans";
import { PLAN_TEMPLATE_UI } from "@constants/plan-ui";
import { usePlans } from "@hooks/use-plans";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import { PlanEnrollForm } from "./PlanEnrollForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type PlansBrowseView =
  | "list"
  | "daily-wird"
  | "listening-wird"
  | "memorizing-wird"
  | "reviewing-wird"
  | "husun-overview"
  | "husun-settings";
type View = PlansBrowseView;

const DAILY_WIRD_ACTIVITIES: {
  activity: PlanActivity;
  templateKey: PlansBrowseView;
  labelKey: string;
  defaultLabel: string;
}[] = [
  { activity: "read", templateKey: "daily-wird", labelKey: "plans.activities.read", defaultLabel: "Read" },
  { activity: "listen", templateKey: "listening-wird", labelKey: "plans.activities.listen", defaultLabel: "Listen" },
  { activity: "memorize", templateKey: "memorizing-wird", labelKey: "plans.activities.memorize", defaultLabel: "Memorize" },
  { activity: "review", templateKey: "reviewing-wird", labelKey: "plans.activities.review", defaultLabel: "Review" },
];

// Every step (except the root "list") shows this same back control, in the
// same top position — previously husun-settings alone used a bottom
// plain-text link with no icon, breaking the pattern.
const BackButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="mb-3.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
  >
    <ChevronLeft className="size-3.5 rtl:rotate-180" strokeWidth={2} />
    {label}
  </button>
);

// One shared header for all 5 views: optional BackButton, then a real,
// visible DialogTitle (previously husun-overview used a plain <div> instead
// of DialogTitle — an accessibility gap — and husun-settings hid its
// DialogHeader entirely with sr-only, the only step with no visible title).
const ViewHeader = ({
  title,
  srDescription,
  onBack,
  backLabel,
}: {
  title: string;
  srDescription: string;
  onBack?: () => void;
  backLabel?: string;
}) => (
  <>
    {onBack ? <BackButton onClick={onBack} label={backLabel ?? ""} /> : null}
    <DialogHeader>
      <DialogTitle className="text-base">{title}</DialogTitle>
      <DialogDescription className="sr-only">{srDescription}</DialogDescription>
    </DialogHeader>
  </>
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * View to land on when opened — "list" (default) for the "new wird" entry
   * point, or a specific template's view to jump straight to editing it
   * (each plan card's "Edit" menu item, skipping the list/overview steps).
   */
  initialView?: View;
};

// Consolidated entry point for enrolling in a template or, when the user
// already has an active enrollment of it, editing its params — replaces the
// always-expanded TemplateCatalog accordion. One enroll-or-edit slot per
// template per user (see docs/plans/daily-awrad-ui.md's Companion Redesign
// section for the accepted same-template-concurrency simplification).
export const PlansBrowseDialog = ({ open, onOpenChange, initialView = "list" }: Props) => {
  const t = useTranslations();
  const { data: plans } = usePlans();
  const [view, setView] = useState<View>(initialView);

  useEffect(() => {
    if (open) {
      setView(initialView);
    }
  }, [open, initialView]);

  const activePlanFor = (templateKey: string): UserPlanListItem | undefined =>
    plans?.find((p) => p.template_key === templateKey && p.status === "active");

  const close = () => {
    onOpenChange(false);
    setView(initialView);
  };

  const backLabel = t("plans.browse.back", "Back");

  const isDailyWirdView =
    view === "daily-wird" ||
    view === "listening-wird" ||
    view === "memorizing-wird" ||
    view === "reviewing-wird";

  const renderList = () => (
    <>
      <ViewHeader
        title={t("plans.browse.title", "New wird or plan")}
        srDescription={t("plans.browse.description", "Enroll in a template, or edit an active one.")}
      />
      <div className="mt-2 flex flex-col gap-1">
        {/* 1. Daily wird */}
        <button
          type="button"
          onClick={() => setView("daily-wird")}
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-start hover:bg-accent/50 transition-colors min-h-[44px]"
        >
          <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary flex-none">
            <BookOpen className="size-[17px]" strokeWidth={1.7} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {t("plans.browse.dailyWirdType.title", "Daily wird")}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {t(
                "plans.browse.dailyWirdType.description",
                "A repeating full-mushaf khatma with your choice of activity and pace."
              )}
            </div>
          </div>
          <ChevronRight
            className="size-3.5 text-muted-foreground flex-none rtl:rotate-180"
            strokeWidth={1.8}
          />
        </button>

        {/* 2. Custom wird (placeholder) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-start opacity-60 cursor-not-allowed min-h-[44px]"
        >
          <span className="grid place-items-center size-9 rounded-lg bg-muted text-muted-foreground flex-none">
            <Sparkles className="size-[17px]" strokeWidth={1.7} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {t("plans.browse.customWirdType.title", "Custom wird")}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {t("plans.browse.comingSoon", "Soon")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {t(
                "plans.browse.customWirdType.description",
                "Choose a custom range, surah, or target completion date (coming soon)."
              )}
            </div>
          </div>
        </button>

        {/* 3. Al-Husun Al-Khamsa */}
        {(() => {
          const husunUi = PLAN_TEMPLATE_UI.husun;
          const HusunIcon = husunUi.icon;
          const activeHusun = activePlanFor("husun");
          return (
            <button
              type="button"
              onClick={() => setView("husun-overview")}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-start hover:bg-accent/50 transition-colors min-h-[44px]"
            >
              <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary flex-none">
                <HusunIcon className="size-[17px]" strokeWidth={1.7} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {t(husunUi.labelKey, husunUi.defaultLabel)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {t(husunUi.descriptionKey, husunUi.defaultDescription)}
                </div>
              </div>
              {activeHusun ? (
                <span className="text-xs font-semibold text-primary flex-none">
                  {t("plans.status.active", "Active")}
                </span>
              ) : (
                <ChevronRight
                  className="size-3.5 text-muted-foreground flex-none rtl:rotate-180"
                  strokeWidth={1.8}
                />
              )}
            </button>
          );
        })()}
      </div>
    </>
  );

  const renderDailyWird = (templateKey: string) => (
    <>
      <ViewHeader
        title={t("plans.browse.dailyWirdType.title", "Daily wird")}
        srDescription={t(
          "plans.browse.dailyWirdType.description",
          "A repeating full-mushaf khatma with your choice of activity and pace."
        )}
        onBack={() => setView("list")}
        backLabel={backLabel}
      />
      <div className="mt-2 flex flex-col gap-4">
        <div
          role="tablist"
          aria-label={t("plans.browse.dailyWirdType.title", "Daily wird")}
          className="flex p-1 rounded-2xl bg-muted/60 border border-border text-xs font-semibold"
        >
          {DAILY_WIRD_ACTIVITIES.map((tab) => {
            const isSelected = templateKey === tab.templateKey;
            return (
              <button
                key={tab.activity}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setView(tab.templateKey)}
                className={cn(
                  "flex-1 min-h-[44px] flex items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 fq-focus-ring text-xs",
                  isSelected
                    ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{t(tab.labelKey, tab.defaultLabel)}</span>
              </button>
            );
          })}
        </div>

        <PlanEnrollForm
          key={templateKey}
          templateKey={templateKey}
          existingPlan={activePlanFor(templateKey)}
          onDone={close}
        />
      </div>
    </>
  );

  const renderHusunOverview = () => (
    <>
      <ViewHeader
        title={t(PLAN_TEMPLATE_UI.husun.labelKey, PLAN_TEMPLATE_UI.husun.defaultLabel)}
        srDescription={t(PLAN_TEMPLATE_UI.husun.descriptionKey, PLAN_TEMPLATE_UI.husun.defaultDescription)}
        onBack={() => setView("list")}
        backLabel={backLabel}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary">
          {(() => {
            const Icon = PLAN_TEMPLATE_UI.husun.icon;
            return <Icon className="size-6" strokeWidth={1.7} />;
          })()}
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "plans.browse.husunOverview",
            "Five interlinked tracks: you memorize a new page daily, prepare it, and review it both soon and later — automatically, based on what you've memorized. You only choose the memorization rate and range."
          )}
        </p>
        <button
          type="button"
          onClick={() => setView("husun-settings")}
          className="mt-1.5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform duration-150"
        >
          {t("plans.browse.next", "Next")}
        </button>
      </div>
    </>
  );

  const renderHusunSettings = () => (
    <>
      <ViewHeader
        title={t(PLAN_TEMPLATE_UI.husun.labelKey, PLAN_TEMPLATE_UI.husun.defaultLabel)}
        srDescription={t(PLAN_TEMPLATE_UI.husun.descriptionKey, PLAN_TEMPLATE_UI.husun.defaultDescription)}
        onBack={() => setView("husun-overview")}
        backLabel={t("plans.browse.previous", "Previous")}
      />
      <PlanEnrollForm
        templateKey="husun"
        existingPlan={activePlanFor("husun")}
        onDone={close}
      />
    </>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-[360px] max-h-[80dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto rounded-[20px]">
        {view === "list" && renderList()}
        {isDailyWirdView && renderDailyWird(view)}
        {view === "husun-overview" && renderHusunOverview()}
        {view === "husun-settings" && renderHusunSettings()}
      </DialogContent>
    </Dialog>
  );
};
