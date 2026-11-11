"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, Check, Eraser } from "lucide-react";
import { Link } from "@/i18n/routing";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { SURAH_PAGE_BOUNDS } from "@/app/constants/surah-page-bounds";
import {
  getSurahPageList,
  type MemorizationStatus,
} from "@/app/lib/plans/memorization-derivation";
import { MicroMushafGrid } from "./MicroMushafGrid";
import { cn } from "@/lib/utils";

interface SurahInspectorProps {
  chapterId: number;
  surahRecords?: Record<number, MemorizationStatus>;
  onUpdateBatch: (updates: Array<{ page_number: number; status: "mastered" | "needs_review" | "unmemorized" }>) => void;
  isUpdating?: boolean;
  variant?: "default" | "embedded";
}

export function SurahInspector({
  chapterId,
  surahRecords,
  onUpdateBatch,
  isUpdating,
  variant = "default",
}: SurahInspectorProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [activeTool, setActiveTool] = useState<"mastered" | "needs_review" | "unmemorized">("mastered");

  const bounds = SURAH_PAGE_BOUNDS[chapterId];

  if (!bounds) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {t("plans.heart.inspector.selectSurahPrompt")}
      </div>
    );
  }

  const pages = getSurahPageList(chapterId);
  const masteredCount = pages.filter((p) => surahRecords?.[p] === "mastered").length;
  const needsReviewCount = pages.filter((p) => surahRecords?.[p] === "needs_review").length;

  const handlePageClick = (pageNumber: number) => {
    const currentStatus = surahRecords?.[pageNumber];
    // If the page already matches activeTool, clicking it resets it to unmemorized
    const nextStatus = currentStatus === activeTool ? "unmemorized" : activeTool;
    onUpdateBatch([{ page_number: pageNumber, status: nextStatus }]);
  };

  const handleApplyToAll = () => {
    onUpdateBatch(pages.map((p) => ({ page_number: p, status: activeTool })));
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        variant === "embedded"
          ? "p-0 bg-transparent border-0 shadow-none"
          : "p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-sm"
      )}
    >
      {/* Surah Header */}
      <div className="flex items-start justify-between gap-2.5 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-7.5 h-7.5 px-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center select-none flex-none",
                locale === "ar" && "font-tajawal"
              )}
            >
              <span className="leading-none pt-0.5">
                {toLocaleNumeral(chapterId, locale)}
              </span>
            </span>
            <h2
              className={cn(
                "text-lg sm:text-xl font-bold text-foreground",
                locale === "ar" && "font-tajawal"
              )}
            >
              {t("plans.heart.inspector.surahPrefix")}{" "}{locale === "ar" ? bounds.nameArabic : bounds.nameSimple}
            </h2>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {bounds.revelationPlace === "makkah"
                ? t("plans.heart.inspector.makkah")
                : t("plans.heart.inspector.madinah")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>
              {toLocaleNumeral(bounds.versesCount, locale)} {t("plans.heart.inspector.versesCount")}
            </span>
            <span className="opacity-40">•</span>
            <span>
              {toLocaleNumeral(bounds.totalPages, locale)} {t("plans.heart.inspector.totalPages")}
            </span>
            {(masteredCount > 0 || needsReviewCount > 0) && (
              <>
                <span className="opacity-40">•</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  {masteredCount > 0 && (
                    <span className={cn("inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-500", locale === "ar" && "font-tajawal")}>
                      <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                      {t("plans.heart.inspector.retentionMastered", { count: toLocaleNumeral(masteredCount, locale) })}
                    </span>
                  )}
                  {masteredCount > 0 && needsReviewCount > 0 && <span className="opacity-40">·</span>}
                  {needsReviewCount > 0 && (
                    <span className={cn("inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-500", locale === "ar" && "font-tajawal")}>
                      <span className="size-1.5 rounded-full bg-yellow-500" />
                      {t("plans.heart.inspector.retentionNeedsReview", { count: toLocaleNumeral(needsReviewCount, locale) })}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Read in Mushaf Link */}
        <Link
          href={`/pages/${bounds.startPage}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors fq-focus-ring"
        >
          <BookOpen className="size-3.5" />
          <span>{t("plans.heart.inspector.readInMushaf")}</span>
        </Link>
      </div>

      {/* Unified Controls Bar: Horizontal Minimalist Tool Circles + Apply to All Button */}
      <div className="flex flex-col gap-1 pb-1.5 border-b border-border/40">
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Tool selector: 3 pure circles without container background or padding */}
          <div
            role="radiogroup"
            aria-label={t("plans.heart.inspector.toolsTitle")}
            className="flex items-center gap-1 select-none"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground me-1">
              {t("plans.heart.inspector.toolsTitle")}:
            </span>

            {/* Mastered */}
            <button
              type="button"
              role="radio"
              aria-checked={activeTool === "mastered"}
              onClick={() => setActiveTool("mastered")}
              className="size-9 sm:size-9.5 flex items-center justify-center cursor-pointer fq-focus-ring rounded-full"
              title={t("plans.heart.inspector.toolMastered")}
              aria-label={t("plans.heart.inspector.toolMastered")}
            >
              <span
                className={cn(
                  "size-6 sm:size-6.5 rounded-full bg-emerald-600 dark:bg-emerald-500 border border-emerald-700/40 dark:border-emerald-400/50 transition-all duration-150 shadow-xs",
                  activeTool === "mastered"
                    ? "ring-2 ring-offset-2 ring-emerald-600 dark:ring-emerald-400 ring-offset-background scale-110 shadow-sm"
                    : "opacity-80 hover:opacity-100"
                )}
              />
            </button>

            {/* Needs Review */}
            <button
              type="button"
              role="radio"
              aria-checked={activeTool === "needs_review"}
              onClick={() => setActiveTool("needs_review")}
              className="size-9 sm:size-9.5 flex items-center justify-center cursor-pointer fq-focus-ring rounded-full"
              title={t("plans.heart.inspector.toolNeedsReview")}
              aria-label={t("plans.heart.inspector.toolNeedsReview")}
            >
              <span
                className={cn(
                  "size-6 sm:size-6.5 rounded-full bg-amber-400 dark:bg-yellow-400 border border-amber-600/50 dark:border-yellow-200/60 transition-all duration-150 shadow-xs",
                  activeTool === "needs_review"
                    ? "ring-2 ring-offset-2 ring-amber-500 dark:ring-yellow-400 ring-offset-background scale-110 shadow-sm"
                    : "opacity-85 hover:opacity-100"
                )}
              />
            </button>

            {/* Eraser / Unmemorized */}
            <button
              type="button"
              role="radio"
              aria-checked={activeTool === "unmemorized"}
              onClick={() => setActiveTool("unmemorized")}
              className="size-9 sm:size-9.5 flex items-center justify-center cursor-pointer fq-focus-ring rounded-full"
              title={t("plans.heart.inspector.toolEraser")}
              aria-label={t("plans.heart.inspector.toolEraser")}
            >
              <span
                className={cn(
                  "size-6 sm:size-6.5 rounded-full border border-muted-foreground/60 bg-muted/40 flex items-center justify-center text-muted-foreground transition-all duration-150 shadow-xs",
                  activeTool === "unmemorized"
                    ? "ring-2 ring-offset-2 ring-foreground text-foreground border-foreground scale-110 shadow-sm"
                    : "opacity-75 hover:opacity-100"
                )}
              >
                <Eraser className="size-3.5 sm:size-4" />
              </span>
            </button>
          </div>

          {/* Quick Action: Apply active tool to all pages of the surah */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleApplyToAll}
            className="h-8 px-3 py-1 rounded-xl text-xs font-semibold bg-muted/70 hover:bg-muted text-foreground border border-border shadow-2xs active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer fq-focus-ring"
            title={t("plans.heart.inspector.applyToAll")}
          >
            <Check className="size-3.5 stroke-[2.2] text-foreground" />
            <span>{t("plans.heart.inspector.applyToAll")}</span>
          </button>
        </div>

        {/* Instructive Tool Hint */}
        <p className="text-[10px] sm:text-[11px] text-muted-foreground/75">
          {t("plans.heart.inspector.toolHint")}
        </p>
      </div>

      {/* Full-width Micro Mushaf Grid */}
      <div className="w-full">
        <MicroMushafGrid
          chapterId={chapterId}
          surahRecords={surahRecords}
          onPageClick={handlePageClick}
        />
      </div>
    </div>
  );
};
