"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { getSurahPageList, type MemorizationStatus } from "@/app/lib/plans/memorization-derivation";
import { cn } from "@/lib/utils";

interface MicroMushafGridProps {
  chapterId: number;
  surahRecords?: Record<number, MemorizationStatus>;
  onPageClick: (pageNumber: number) => void;
}

export function MicroMushafGrid({
  chapterId,
  surahRecords,
  onPageClick,
}: MicroMushafGridProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pages = getSurahPageList(chapterId);

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => {
          const status = surahRecords?.[p];
          const isMastered = status === "mastered";
          const isNeedsReview = status === "needs_review";

          const statusLabel = isMastered
            ? t("plans.heart.legend.mastered")
            : isNeedsReview
            ? t("plans.heart.legend.needsReview")
            : t("plans.heart.legend.unmemorized");

          const pageText = t("plans.heart.inspector.pageNumber", {
            page: toLocaleNumeral(p, locale),
          });

          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageClick(p)}
              className={cn(
                "size-8 sm:size-8.5 rounded-full border flex items-center justify-center transition-all duration-150 fq-focus-ring select-none text-xs font-bold cursor-pointer",
                locale === "ar" && "font-tajawal",
                isMastered &&
                  "bg-emerald-600 dark:bg-emerald-700 border-emerald-700 dark:border-emerald-600 text-white shadow-xs hover:brightness-105 active:scale-95",
                isNeedsReview &&
                  "bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-500 text-stone-950 shadow-xs hover:brightness-105 active:scale-95",
                !isMastered &&
                  !isNeedsReview &&
                  "bg-card hover:bg-muted border-border text-muted-foreground hover:text-foreground font-medium shadow-2xs active:scale-95"
              )}
              title={pageText}
              aria-label={`${pageText} - ${statusLabel}`}
            >
              <span className="leading-none pt-0.5">
                {toLocaleNumeral(p, locale)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
