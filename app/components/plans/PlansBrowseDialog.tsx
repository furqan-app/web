"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { READY_MADE_PRESETS, type PlanPreset } from "@/app/constants/plan-presets";
import { bindDedicatedReminderSafe } from "@/app/lib/plans/custom-wird-form-helpers";
import useTranslations from "@hooks/use-translations";
import { PLAN_TEMPLATE_UI } from "@constants/plan-ui";
import { usePlans } from "@hooks/use-plans";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import { PlanEnrollForm } from "./PlanEnrollForm";
import { CustomWirdForm } from "./CustomWirdForm";
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
  | "husun-settings"
  | "custom";
type View = PlansBrowseView;

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
  initialPlan?: UserPlanListItem;
};

// Consolidated entry point for enrolling in a template or, when the user
// already has an active enrollment of it, editing its params — replaces the
// always-expanded TemplateCatalog accordion. One enroll-or-edit slot per
// template per user (see docs/plans/daily-awrad-ui.md's Companion Redesign
// section for the accepted same-template-concurrency simplification).
export const PlansBrowseDialog = ({
  open,
  onOpenChange,
  initialView = "list",
  initialPlan,
}: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: plans, enrollCustom } = usePlans();
  const [view, setView] = useState<View>(initialView);
  const [enrollingPresetId, setEnrollingPresetId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PlanPreset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (
        initialView === "daily-wird" ||
        initialView === "listening-wird" ||
        initialView === "memorizing-wird" ||
        initialView === "reviewing-wird"
      ) {
        setView("custom");
      } else {
        setView(initialView);
      }
    }
  }, [open, initialView]);

  const activePlanFor = (templateKey: string): UserPlanListItem | undefined =>
    plans?.find((p) => p.template_key === templateKey && p.status === "active");

  const close = () => {
    onOpenChange(false);
    setView(initialView);
    setSelectedPreset(null);
    setEnrollingPresetId(null);
    setError(null);
  };

  const backLabel = t("plans.browse.back", "Back");

  const renderList = () => (
    <>
      <ViewHeader
        title={t("plans.browse.title", "New wird or plan")}
        srDescription={t("plans.browse.description", "Enroll in a template, or edit an active one.")}
      />
      {error ? (
        <div className="mt-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive text-center">
          {error}
        </div>
      ) : null}
      <div className="mt-2 flex flex-col gap-1">
        {/* 1. New wird */}
        <button
          type="button"
          onClick={() => {
            setSelectedPreset(null);
            setView("custom");
          }}
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-start hover:bg-accent/50 transition-colors min-h-[44px]"
        >
          <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary flex-none">
            <BookOpen className="size-[17px]" strokeWidth={1.7} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {t("plans.browse.customWirdType.title", "New wird")}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {t(
                "plans.browse.customWirdType.description",
                "Choose a full khatma, surah, or custom range at your own pace"
              )}
            </div>
          </div>
          <ChevronRight
            className="size-3.5 text-muted-foreground flex-none rtl:rotate-180"
            strokeWidth={1.8}
          />
        </button>

        {/* 2. Al-Husun Al-Khamsa */}
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

      {/* Ready-made Presets */}
      <div className="mt-4 pt-3 border-t border-border/60">
        <div className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
          {t("plans.presets.sectionTitle", "أوراد جاهزة للاشتراك السريع")}
        </div>
        <div className="flex flex-col gap-1.5">
          {READY_MADE_PRESETS.map((preset) => {
            const isEnrolling = enrollingPresetId === preset.id;
            const isAnyEnrolling = enrollingPresetId !== null;
            const PresetIcon = preset.icon;
            const title = t(preset.titleKey, preset.defaultTitle);
            const description = t(preset.descriptionKey, preset.defaultDescription);
            return (
              <div
                key={preset.id}
                className="group flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-accent/50 transition-colors border border-border/40 text-start"
              >
                <button
                  type="button"
                  disabled={isAnyEnrolling}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setView("custom");
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 text-start fq-focus-ring rounded-lg cursor-pointer disabled:opacity-60"
                >
                  <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary flex-none">
                    <PresetIcon className="size-[17px]" strokeWidth={1.7} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {description}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isAnyEnrolling}
                  onClick={() => {
                    setError(null);
                    setEnrollingPresetId(preset.id);
                    enrollCustom.mutate(
                      {
                        ...preset.payload,
                        name: title,
                      },
                      {
                        onSuccess: async (data) => {
                          if (!data.plan) {
                            setEnrollingPresetId(null);
                            setError(
                              data.errorMessage ??
                                t("plans.enrollError", "Something went wrong. Try again.")
                            );
                            return;
                          }
                          if (preset.defaultReminderTime && data.plan.id) {
                            await bindDedicatedReminderSafe({
                              planId: data.plan.id,
                              time: preset.defaultReminderTime,
                              locale,
                            });
                            queryClient.invalidateQueries({ queryKey: ["daily-wird-reminder"] });
                          }
                          setEnrollingPresetId(null);
                          close();
                        },
                        onError: (err) => {
                          setEnrollingPresetId(null);
                          setError(
                            err instanceof Error && err.message
                              ? err.message
                              : t("plans.enrollError", "Something went wrong. Try again.")
                          );
                        },
                      }
                    );
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 min-h-[36px]"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      <span>{t("plans.presets.enrolling", "جارٍ الاشتراك…")}</span>
                    </>
                  ) : (
                    <span>{t("plans.presets.enroll", "اشتراك")}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
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

  const renderCustomWird = () => {
    const editingPlan = initialPlan;
    return (
      <>
        <ViewHeader
          title={
            editingPlan
              ? t("plans.custom.editTitle", "Edit custom wird")
              : t("plans.custom.newTitle", "New custom wird")
          }
          srDescription={t(
            "plans.custom.description",
            "Set a custom range and cadence"
          )}
          onBack={() => {
            setSelectedPreset(null);
            setView("list");
          }}
          backLabel={backLabel}
        />
        <CustomWirdForm
          key={initialPlan?.id ?? selectedPreset?.id ?? "new"}
          existingPlan={editingPlan}
          preset={selectedPreset}
          onDone={close}
        />
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        closeLabel={t("common.close", "Close")}
        className={cn(
          "w-[calc(100vw-2rem)] max-h-[85dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto rounded-[20px] fq-scroll-nice",
          view === "custom"
            ? "sm:max-w-lg p-5 sm:p-6"
            : view === "list"
              ? "sm:max-w-md max-w-[420px] p-5"
              : "max-w-[360px] p-5"
        )}
      >
        {view === "list" && renderList()}
        {view === "husun-overview" && renderHusunOverview()}
        {view === "husun-settings" && renderHusunSettings()}
        {view === "custom" && renderCustomWird()}
      </DialogContent>
    </Dialog>
  );
};
