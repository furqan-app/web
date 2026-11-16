"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  Headphones,
  Heart,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";
import { usePlans } from "@/app/hooks/use-plans";
import { useRouter } from "@/i18n/routing";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import type { UserPlanParams } from "@/app/constants/plans";
import type { MemorizationMap } from "@/app/lib/plans/memorization-derivation";
import {
  diagnoseHeartMemorization,
  type HeartPulseDirection,
} from "@/app/lib/plans/heart-pulse-algorithm";
import { QuantityStepper } from "./QuantityStepper";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memorizationMap: MemorizationMap;
  isLoadingMap?: boolean;
  existingPlan?: UserPlanListItem | null;
};

type TrackKey = "hifz" | "motafallit" | "qareeb" | "tahdeer";

type TrackCardProps = {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  activeClassName?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  showStepper?: boolean;
  unitLabel?: string;
  value?: number;
  onValueChange?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

function TrackCard({
  id,
  checked,
  disabled = false,
  onToggle,
  activeClassName = "border-primary/50 bg-primary/5",
  icon,
  title,
  description,
  showStepper = checked,
  unitLabel,
  value,
  onValueChange,
  min = 1,
  max = 20,
  step = 1,
}: TrackCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      aria-disabled={disabled}
      className={cn(
        "p-3 sm:p-3.5 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none",
        disabled
          ? "border-border/40 opacity-50 cursor-not-allowed"
          : checked
            ? cn(activeClassName, "cursor-pointer")
            : "border-border/60 opacity-60 hover:opacity-90 cursor-pointer"
      )}
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <input
          type="checkbox"
          id={id}
          checked={checked && !disabled}
          disabled={disabled}
          onChange={disabled ? undefined : onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            {icon}
            {title}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5">{description}</span>
        </div>
      </div>

      {!disabled && showStepper && value !== undefined && onValueChange && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 self-end sm:self-center flex-none cursor-default"
        >
          {unitLabel && (
            <span className="text-[11px] text-muted-foreground font-medium">{unitLabel}</span>
          )}
          <QuantityStepper value={value} onChange={onValueChange} min={min} max={max} step={step} />
        </div>
      )}
    </div>
  );
}

export function HeartPulsePlanDialog({
  open,
  onOpenChange,
  memorizationMap,
  isLoadingMap = false,
  existingPlan,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { enroll, updateParams } = usePlans();

  const [direction, setDirection] = useState<HeartPulseDirection>("ascending");
  const [activeTracks, setActiveTracks] = useState<Record<TrackKey, boolean>>({
    hifz: true,
    motafallit: true,
    qareeb: false,
    tahdeer: false,
  });

  const [quantities, setQuantities] = useState<Record<TrackKey, number>>({
    hifz: 1,
    motafallit: 2,
    qareeb: 5,
    tahdeer: 3,
  });

  const [name, setName] = useState<string>("");
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Diagnosis derived in real time based on active direction
  const diagnosis = useMemo(() => {
    return diagnoseHeartMemorization(memorizationMap, direction);
  }, [memorizationMap, direction]);

  const hasUnmemorized = diagnosis.targetQueue.length > 0;
  const hasSlipping = diagnosis.slippingPagesCount > 0;
  const isFullyMastered = !hasUnmemorized && !hasSlipping;
  const canUseHifzDependents = hasUnmemorized && activeTracks.hifz;

  const suggestedName = t("plans.heartPulse.planName", {
    default: locale === "ar" ? "نبض القلب" : "Heart Pulse",
  });

  const wasOpenRef = useRef(false);

  // Synchronize state only when the dialog transitions from closed -> open (and map is ready)
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (isLoadingMap || wasOpenRef.current) return;
    wasOpenRef.current = true;
    setErrorMsg(null);
    if (existingPlan?.params) {
      const p = existingPlan.params as UserPlanParams;
      if (p.direction) setDirection(p.direction);
      if (Array.isArray(p.activeTracks)) {
        setActiveTracks({
          hifz: p.activeTracks.includes("hifz"),
          motafallit: p.activeTracks.includes("motafallit"),
          qareeb: p.activeTracks.includes("qareeb"),
          tahdeer: p.activeTracks.includes("tahdeer"),
        });
      }
      if (p.quantities) {
        setQuantities({
          hifz: typeof p.quantities.hifz === "number" ? p.quantities.hifz : 1,
          motafallit: typeof p.quantities.motafallit === "number" ? p.quantities.motafallit : 2,
          qareeb: typeof p.quantities.qareeb === "number" ? p.quantities.qareeb : 5,
          tahdeer: typeof p.quantities.tahdeer === "number" ? p.quantities.tahdeer : 3,
        });
      }
      if (existingPlan.name) {
        setName(existingPlan.name);
        setIsNameManuallyEdited(true);
      }
    } else {
      // Default: enable only tracks that have actionable pages
      const initialTracks: Record<TrackKey, boolean> = {
        hifz: hasUnmemorized,
        motafallit: hasSlipping,
        qareeb: false,
        tahdeer: false,
      };
      setDirection("ascending");
      setQuantities({
        hifz: 1,
        motafallit: 2,
        qareeb: 5,
        tahdeer: 3,
      });
      setActiveTracks(initialTracks);
      setIsNameManuallyEdited(false);
      setName(suggestedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingPlan, isLoadingMap]);

  const handleDirectionChange = (newDir: HeartPulseDirection) => {
    setDirection(newDir);
  };

  const toggleTrack = (key: TrackKey) => {
    if (key === "hifz" && !hasUnmemorized) return;
    if (key === "motafallit" && !hasSlipping) return;
    if ((key === "qareeb" || key === "tahdeer") && !canUseHifzDependents) return;

    setActiveTracks((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "hifz" && !next.hifz) {
        next.qareeb = false;
        next.tahdeer = false;
      }
      return next;
    });
  };

  const handleQuantityChange = (key: TrackKey, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const enabledTrackKeys = (Object.entries(activeTracks) as Array<[TrackKey, boolean]>)
    .filter(([key, active]) => {
      if (!active) return false;
      if (key === "hifz") return hasUnmemorized;
      if (key === "motafallit") return hasSlipping;
      return canUseHifzDependents;
    })
    .map(([key]) => key);

  const handleSubmit = async () => {
    if (isLoadingMap || isFullyMastered || enabledTrackKeys.length === 0) {
      if (!isLoadingMap) {
        setErrorMsg(
          isFullyMastered
            ? t("plans.heartPulse.fullyMasteredNotice")
            : t("plans.heartPulse.errors.atLeastOneTrack")
        );
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const freshDiagnosis = diagnoseHeartMemorization(memorizationMap, direction);

    const params: UserPlanParams = {
      direction,
      activeTracks: enabledTrackKeys,
      quantities: {
        hifz: quantities.hifz,
        motafallit: quantities.motafallit,
        qareeb: quantities.qareeb,
        tahdeer: quantities.tahdeer,
      },
      targetPages: freshDiagnosis.targetPages,
      slippingPages: freshDiagnosis.slippingPages,
      targetQueue: freshDiagnosis.targetQueue,
      slippingQueue: freshDiagnosis.slippingQueue,
    };

    const finalPlanName = name.trim() || suggestedName;

    try {
      if (existingPlan) {
        const ok = await updateParams.mutateAsync({
          planId: existingPlan.id,
          params,
          name: finalPlanName,
        });
        if (!ok) {
          setErrorMsg(t("plans.heartPulse.errors.generic"));
          return;
        }
      } else {
        const created = await enroll.mutateAsync({
          templateKey: "heart-pulse",
          params,
          name: finalPlanName,
        });
        if (!created) {
          setErrorMsg(t("plans.heartPulse.errors.generic"));
          return;
        }
      }
      onOpenChange(false);
      router.push("/plans");
    } catch (e) {
      console.error(e);
      setErrorMsg(t("plans.heartPulse.errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideDefaultClose
        className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[88vh] overflow-y-auto fq-scroll-nice p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-2xl text-start"
      >
        <DialogHeader className="gap-1.5 pb-2.5 border-b border-border/40 text-start">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid place-items-center size-8 rounded-xl bg-primary/10 text-primary flex-none">
                <Heart className="size-4" strokeWidth={1.75} />
              </span>
              <DialogTitle className={cn("text-base sm:text-lg font-bold text-foreground truncate", locale === "ar" && "font-tajawal")}>
                {existingPlan
                  ? t("plans.heartPulse.editTitle", { default: "تعديل ورد نبض القلب" })
                  : t("plans.heartPulse.createTitle", { default: "إنشاء أوراد نبض القلب الذكية" })}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors fq-focus-ring flex-none cursor-pointer"
              aria-label={t("plans.heartPulse.cancel", { default: "إلغاء" })}
            >
              <X className="size-4" />
            </button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {t("plans.heartPulse.description", {
              default:
                "خطة مخصصة متعددة المسارات تعتمد على تشخيص حالة حفظك في القلب القرآني، مع تحديد طاقتك اليومية وتحديث خلايا القلب فور إنجاز أورادك.",
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Diagnostic Health Banner */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>{t("plans.heartPulse.diagnosticTitle", { default: "تشخيص الصدر الحالي" })}</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {t("plans.heartPulse.diagnosticHint", { default: "يُحدد أولويات الحفظ والمراجعة" })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Mastered pages */}
            <div className="p-2 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-500">
                {toLocaleNumeral(diagnosis.masteredPagesCount, locale)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium truncate w-full">
                {t("plans.heartPulse.masteredPages", { default: "صفحة متقنة" })}
              </span>
            </div>

            {/* Slipping pages */}
            <div className="p-2 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-base font-extrabold text-yellow-600 dark:text-yellow-500">
                {toLocaleNumeral(diagnosis.slippingPagesCount, locale)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium truncate w-full">
                {t("plans.heartPulse.slippingPages", { default: "صفحة تحتاج تعهداً" })}
              </span>
            </div>

            {/* Unmemorized pages */}
            <div className="p-2 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-base font-extrabold text-foreground">
                {toLocaleNumeral(diagnosis.unmemorizedPagesCount, locale)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium truncate w-full">
                {t("plans.heartPulse.unmemorizedPages", { default: "صفحة غير محفوظة" })}
              </span>
            </div>
          </div>
        </div>

        {/* Direction Selection */}
        <div className="flex flex-col gap-2 pt-1">
          <label className={cn("text-xs font-bold text-foreground", locale === "ar" && "font-tajawal")}>
            {t("plans.heartPulse.directionLabel", { default: "مسار واتجاه السير في الحفظ والمراجعة" })}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Option 1: Ascending 114 -> 1 */}
            <button
              type="button"
              onClick={() => handleDirectionChange("ascending")}
              className={cn(
                "p-3 rounded-2xl border text-start transition-all fq-focus-ring flex flex-col gap-1 cursor-pointer",
                direction === "ascending"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border/60 hover:bg-accent/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ArrowUpRight className="size-3.5 text-primary rtl:rotate-90" />
                  {t("plans.heartPulse.directionAscending", { default: "من سورة الناس صعوداً" })}
                </span>
                <span className="text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                  {t("plans.heartPulse.recommended", { default: "الموصى به" })}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                {t("plans.heartPulse.directionAscendingDesc", {
                  default: "يبدأ من قصار السور وجزء عم صعوداً، مع تخطي ما أتقنته تماماً.",
                })}
              </span>
            </button>

            {/* Option 2: Descending 2 -> 114 */}
            <button
              type="button"
              onClick={() => handleDirectionChange("descending")}
              className={cn(
                "p-3 rounded-2xl border text-start transition-all fq-focus-ring flex flex-col gap-1 cursor-pointer",
                direction === "descending"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border/60 hover:bg-accent/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ArrowDownRight className="size-3.5 text-primary rtl:rotate-90" />
                  {t("plans.heartPulse.directionDescending", { default: "من سورة البقرة نزولاً" })}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                {t("plans.heartPulse.directionDescendingDesc", {
                  default: "يبدأ من سورة البقرة نزولاً حسب ترتيب المصحف الشريف.",
                })}
              </span>
            </button>
          </div>
        </div>

        {/* Plan Name Field */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className={cn("text-xs font-bold text-foreground", locale === "ar" && "font-tajawal")}>
              {t("plans.heartPulse.nameLabel", { default: "اسم الورد" })}
            </label>
            {isNameManuallyEdited && (
              <button
                type="button"
                onClick={() => {
                  setIsNameManuallyEdited(false);
                  setName(suggestedName);
                }}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                {t("plans.custom.resetSuggestedName", { default: "استعادة الاسم المقترح" })}
              </button>
            )}
          </div>
          <input
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => {
              setIsNameManuallyEdited(true);
              setName(e.target.value);
            }}
            placeholder={suggestedName}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium text-foreground transition-all shadow-sm"
          />
        </div>

        {/* Active Tracks & Pace Customization */}
        <div className="flex flex-col gap-3 pt-2">
          <label className={cn("text-xs font-bold text-foreground", locale === "ar" && "font-tajawal")}>
            {t("plans.heartPulse.tracksLabel", { default: "تحديد المسارات والمقادير اليومية" })}
          </label>

          {isFullyMastered && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {t("plans.heartPulse.fullyMasteredNotice")}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <TrackCard
              id="track-hifz"
              checked={activeTracks.hifz}
              disabled={!hasUnmemorized}
              onToggle={() => toggleTrack("hifz")}
              icon={<Brain className="size-3.5 text-primary flex-none" />}
              title={t("plans.tracks.hifz")}
              description={
                hasUnmemorized
                  ? t("plans.heartPulse.hifzDesc")
                  : t("plans.heartPulse.noUnmemorizedPages")
              }
              unitLabel={
                quantities.hifz === 0.5
                  ? t("plans.heartPulse.halfPagePerDay")
                  : t("plans.heartPulse.pagesPerDay")
              }
              value={quantities.hifz}
              onValueChange={(v) => handleQuantityChange("hifz", v)}
              min={0.5}
              step={0.5}
              max={20}
            />

            <TrackCard
              id="track-motafallit"
              checked={activeTracks.motafallit}
              disabled={!hasSlipping}
              onToggle={() => toggleTrack("motafallit")}
              activeClassName={
                hasSlipping
                  ? "border-yellow-500/50 bg-yellow-500/5"
                  : "border-primary/50 bg-primary/5"
              }
              icon={<RotateCcw className="size-3.5 text-yellow-600 dark:text-yellow-500 flex-none" />}
              title={t("plans.tracks.motafallit")}
              description={
                hasSlipping
                  ? t("plans.heartPulse.motafallitDesc")
                  : t("plans.heartPulse.noSlippingPages")
              }
              showStepper={activeTracks.motafallit && hasSlipping}
              unitLabel={
                quantities.motafallit === 0.5
                  ? t("plans.heartPulse.halfPagePerDay")
                  : t("plans.heartPulse.pagesPerDay")
              }
              value={quantities.motafallit}
              onValueChange={(v) => handleQuantityChange("motafallit", v)}
              min={0.5}
              step={0.5}
              max={20}
            />

            <TrackCard
              id="track-qareeb"
              checked={activeTracks.qareeb}
              disabled={!canUseHifzDependents}
              onToggle={() => toggleTrack("qareeb")}
              icon={<RefreshCw className="size-3.5 text-primary flex-none" />}
              title={t("plans.tracks.qareeb")}
              description={
                !hasUnmemorized
                  ? t("plans.heartPulse.requiresUnmemorized")
                  : !activeTracks.hifz
                    ? t("plans.heartPulse.requiresHifzTrack")
                    : t("plans.heartPulse.qareebDesc")
              }
              unitLabel={
                quantities.qareeb === 0.5
                  ? t("plans.heartPulse.trailingHalfPage")
                  : quantities.qareeb === 1
                    ? t("plans.heartPulse.trailingOnePage")
                    : quantities.qareeb === 1.5
                      ? t("plans.heartPulse.trailingPageAndHalf")
                      : quantities.qareeb === 2
                        ? t("plans.heartPulse.trailingTwoPages")
                        : t("plans.heartPulse.trailingPages")
              }
              value={quantities.qareeb}
              onValueChange={(v) => handleQuantityChange("qareeb", v)}
              min={0.5}
              step={0.5}
              max={50}
            />

            <TrackCard
              id="track-tahdeer"
              checked={activeTracks.tahdeer}
              disabled={!canUseHifzDependents}
              onToggle={() => toggleTrack("tahdeer")}
              icon={<Headphones className="size-3.5 text-primary flex-none" />}
              title={t("plans.tracks.tahdeer")}
              description={
                !hasUnmemorized
                  ? t("plans.heartPulse.requiresUnmemorized")
                  : !activeTracks.hifz
                    ? t("plans.heartPulse.requiresHifzTrack")
                    : t("plans.heartPulse.tahdeerDesc")
              }
              unitLabel={t("plans.heartPulse.repeatPasses")}
              value={quantities.tahdeer}
              onValueChange={(v) => handleQuantityChange("tahdeer", v)}
              min={1}
              max={10}
            />
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-destructive px-1">{errorMsg}</p>
        )}

        <DialogFooter className="gap-2 pt-3 border-t border-border/40 mt-1 flex-row justify-end">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors fq-focus-ring cursor-pointer"
          >
            {t("plans.heartPulse.cancel", { default: "إلغاء" })}
          </button>
          <button
            type="button"
            disabled={isSubmitting || isLoadingMap || isFullyMastered || enabledTrackKeys.length === 0}
            onClick={handleSubmit}
            className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 fq-focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {(isSubmitting || isLoadingMap) && <Loader2 className="size-4 animate-spin" />}
            {existingPlan
              ? t("plans.heartPulse.saveChanges", { default: "حفظ التعديلات" })
              : t("plans.heartPulse.startPlan", { default: "بدء الخطة" })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}