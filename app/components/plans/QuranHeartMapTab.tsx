"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { useMemorizationMap } from "@/app/hooks/use-memorization-map";
import { QuranHeartMap } from "./QuranHeartMap";
import { SurahInspector } from "./SurahInspector";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function QuranHeartMapTab() {
  const t = useTranslations();
  const locale = useLocale();
  const {
    memorizationMap,
    globalStats,
    isLoading,
    isError,
    refetch,
    updateBatch,
    isUpdating,
  } = useMemorizationMap();

  const [selectedSurahId, setSelectedSurahId] = useState<number>(1); // Default to Al-Fatihah
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const handleSelectSurah = (chapterId: number) => {
    setSelectedSurahId(chapterId);
    // On mobile screens, open the bottom sheet
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSheetOpen(true);
    }
  };

  const handleUpdateBatch = (
    updates: Array<{
      page_number: number;
      status: "mastered" | "needs_review" | "unmemorized";
    }>
  ) => {
    updateBatch({
      chapter_id: selectedSurahId,
      updates,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse motion-reduce:animate-none">
        <div className="h-28 rounded-3xl bg-muted/50 border border-border" />
        <div className="w-full aspect-[576/600] rounded-3xl bg-muted/40 border border-border" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-destructive/30 bg-destructive/5 text-destructive gap-3">
        <p className="text-sm font-semibold">{t("error.title")}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-xs font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors fq-focus-ring"
        >
          {t("error.retryLink")}
        </button>
      </div>
    );
  }

  // Compact Circular / Donut Ring Geometry for 604 Physical Pages
  const R = 38;
  const C = 2 * Math.PI * R; // ~238.76
  const totalPages = 604;

  const masteredLen = (globalStats.totalMasteredPages / totalPages) * C;
  const needsReviewLen = (globalStats.totalNeedsReviewPages / totalPages) * C;

  const masteredOffset = 0;
  const needsReviewOffset = -masteredLen;

  const masteredPct = Math.round((globalStats.totalMasteredPages / totalPages) * 100);
  const needsReviewPct = Math.round((globalStats.totalNeedsReviewPages / totalPages) * 100);
  const unmemorizedPct = Math.max(0, 100 - masteredPct - needsReviewPct);

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      {/* Main Interactive Grid / View: Heart Map on one side, Inspector + Stats Card on the other */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* Column 1: Heart Map (6 cols on desktop) */}
        <div className="lg:col-span-6 w-full flex flex-col gap-2 lg:order-1">
          <QuranHeartMap
            selectedSurahId={selectedSurahId}
            onSelectSurah={handleSelectSurah}
            memorizationMap={memorizationMap}
            className="w-full"
          />
        </div>

        {/* Column 2: Surah Inspector (desktop) + Heart Stats Card (6 cols on desktop) */}
        <div className="lg:col-span-6 w-full flex flex-col gap-3 lg:order-2">
          {/* Section 1: Desktop Surah Inspector */}
          <div className="hidden lg:block">
            <SurahInspector
              chapterId={selectedSurahId}
              surahRecords={memorizationMap[selectedSurahId]}
              onUpdateBatch={handleUpdateBatch}
              isUpdating={isUpdating}
            />
          </div>

          {/* Section 2: Progress Stats Card: "حالة قلبي" / "My Heart's State" */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <h2 className={cn("text-xs sm:text-sm font-bold text-foreground", locale === "ar" && "font-tajawal")}>
                {t("heart.progressTitle")}
              </h2>
              <span className="text-[11px] text-muted-foreground font-medium">
                {toLocaleNumeral(globalStats.masteredSurahsCount, locale)} / {toLocaleNumeral(114, locale)} {t("plans.heart.inspector.surahPrefix")}
              </span>
            </div>

            {/* Donut Chart & Progress Info */}
            <div className="flex items-center gap-3.5 sm:gap-4 py-0.5">
              {/* Compact Donut Chart SVG */}
              <div className="relative size-20 sm:size-22 flex-none flex items-center justify-center">
                <svg className="size-full -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Background Track - clearly visible neutral */}
                  <circle
                    cx="50"
                    cy="50"
                    r={R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-muted/60 dark:text-muted/40"
                  />
                  {/* Mastered Arc */}
                  {masteredLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={R}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="9"
                      strokeDasharray={`${masteredLen} ${C}`}
                      strokeDashoffset={masteredOffset}
                      className="transition-all duration-500 motion-reduce:transition-none"
                    />
                  )}
                  {/* Needs Review Arc (Gold Yellow) */}
                  {needsReviewLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={R}
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="9"
                      strokeDasharray={`${needsReviewLen} ${C}`}
                      strokeDashoffset={needsReviewOffset}
                      className="transition-all duration-500 motion-reduce:transition-none"
                    />
                  )}
                </svg>

                {/* Center Completion Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className={cn("text-base sm:text-lg font-extrabold text-foreground leading-none", locale === "ar" && "font-tajawal")}>
                    {toLocaleNumeral(globalStats.completionPercentage, locale)}٪
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground font-medium mt-0.5">
                    {t("plans.heart.stats.completion")}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Colors with Percentages */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {/* Global Mushaf Progress Bar */}
                <div className="flex flex-col gap-1">
                  <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden flex">
                    {globalStats.totalMasteredPages > 0 && (
                      <div
                        style={{ width: `${(globalStats.totalMasteredPages / 604) * 100}%` }}
                        className="bg-emerald-600 h-full transition-all duration-300 motion-reduce:transition-none"
                      />
                    )}
                    {globalStats.totalNeedsReviewPages > 0 && (
                      <div
                        style={{ width: `${(globalStats.totalNeedsReviewPages / 604) * 100}%` }}
                        className="bg-yellow-500 h-full transition-all duration-300 motion-reduce:transition-none"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                    <span>
                      {toLocaleNumeral(globalStats.totalPagesMemorized, locale)} / {toLocaleNumeral(604, locale)} {t("plans.heart.stats.pagesMemorized")}
                    </span>
                    <span>
                      {t("plans.heart.stats.pagesRemaining", {
                        count: toLocaleNumeral(604 - globalStats.totalPagesMemorized, locale),
                      })}
                    </span>
                  </div>
                </div>

                {/* Clean 3-State Legend based on physical page coverage */}
                <div className="pt-1.5 border-t border-border/50 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="size-2 rounded-full bg-emerald-600 flex-none" />
                    <span className={cn("font-semibold text-foreground", locale === "ar" && "font-tajawal")}>
                      {toLocaleNumeral(masteredPct, locale)}٪
                    </span>
                    <span className="truncate">{t("plans.heart.legend.mastered")}</span>
                  </span>
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="size-2 rounded-full bg-yellow-500 flex-none" />
                    <span className={cn("font-semibold text-foreground", locale === "ar" && "font-tajawal")}>
                      {toLocaleNumeral(needsReviewPct, locale)}٪
                    </span>
                    <span className="truncate">{t("plans.heart.legend.needsReview")}</span>
                  </span>
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="size-2 rounded-full bg-muted-foreground/40 flex-none" />
                    <span className={cn("font-semibold text-foreground", locale === "ar" && "font-tajawal")}>
                      {toLocaleNumeral(unmemorizedPct, locale)}٪
                    </span>
                    <span className="truncate">{t("plans.heart.legend.unmemorized")}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Inspector */}
      <div className="lg:hidden">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent
            side="bottom"
            hideDefaultClose
            className="min-h-[48dvh] sm:min-h-[420px] max-h-[88dvh] overflow-y-auto rounded-t-[32px] px-5 sm:px-6 pt-3 pb-12 sm:pb-16 fq-scroll-nice border-t border-border/60 shadow-2xl"
          >
            {/* Grab handle & mobile dismiss header */}
            <div className="flex flex-col gap-2 pb-3 border-b border-border/40 mb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-5 px-5 sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="w-12 h-1.5 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors mx-auto cursor-pointer focus:outline-none"
                aria-label={t("close")}
              />
              <div className="flex items-center justify-between">
                <SheetTitle className={cn("text-base font-bold text-foreground", locale === "ar" && "font-tajawal")}>
                  {t("plans.heart.inspector.sheetTitle")}
                </SheetTitle>
                <SheetClose className="size-10 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors fq-focus-ring">
                  <X className="size-4" />
                  <span className="sr-only">{t("close")}</span>
                </SheetClose>
              </div>
            </div>
            <SheetDescription className="sr-only">
              {t("plans.heart.inspector.sheetDescription")}
            </SheetDescription>
            <SurahInspector
              chapterId={selectedSurahId}
              surahRecords={memorizationMap[selectedSurahId]}
              onUpdateBatch={handleUpdateBatch}
              isUpdating={isUpdating}
              variant="embedded"
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
