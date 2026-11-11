"use client";

import React, { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QURAN_HEART_SURAHS } from "@/app/constants/quran-heart-data";
import {
  deriveSurahMemorization,
  type MemorizationMap,
} from "@/app/lib/plans/memorization-derivation";
import { cn } from "@/lib/utils";

interface QuranHeartMapProps {
  selectedSurahId: number | null;
  onSelectSurah: (chapterId: number) => void;
  memorizationMap: MemorizationMap;
  className?: string;
}

export function QuranHeartMap({
  selectedSurahId,
  onSelectSurah,
  memorizationMap,
  className,
}: QuranHeartMapProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  // Pre-derive data for all 114 surahs to avoid per-render lag
  const surahsDerived = useMemo(() => {
    return QURAN_HEART_SURAHS.map((surah) => {
      const derived = deriveSurahMemorization(surah.id, memorizationMap[surah.id]);
      return {
        ...surah,
        derived,
      };
    });
  }, [memorizationMap]);

  return (
    <div
      className={cn(
        "relative w-full aspect-[576/728] select-none",
        className
      )}
    >
      <svg
        id="quran-heart-svg"
        viewBox="0 144 576 728"
        className="w-full h-full block"
        role="region"
        aria-label={t("heart.mapAriaLabel")}
      >
        <defs>
          {/* Mastered gradient: Living Quranic emerald green */}
          <linearGradient id="heartMasteredGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.98" />
          </linearGradient>

          {/* Needs Review gradient: Regal golden yellow */}
          <linearGradient id="heartNeedsReviewGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.98" />
          </linearGradient>

          {/* Unmemorized: Theme-compatible card fill */}
          <linearGradient id="heartUnmemorizedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.35" />
          </linearGradient>

          {/* Dynamic multi-state liquid gradients for partial surahs */}
          {surahsDerived.map((surah) => {
            if (surah.derived.status !== "partial") return null;
            const masteredPct = surah.derived.masteredPercentage;
            const needsReviewPct = surah.derived.needsReviewPercentage;
            const totalPct = Math.min(100, masteredPct + needsReviewPct);

            return (
              <linearGradient
                key={`liquid-${surah.id}`}
                id={`liquid-grad-${surah.id}`}
                x1="0%"
                y1="100%"
                x2="0%"
                y2="0%"
              >
                {/* Layer 1: Mastered (green) at bottom if present */}
                {masteredPct > 0 && (
                  <>
                    <stop offset="0%" stopColor="#047857" stopOpacity="0.98" />
                    <stop offset={`${masteredPct}%`} stopColor="#10b981" stopOpacity="0.95" />
                  </>
                )}

                {/* Layer 2: Needs Review (gold yellow) stacked above mastered if present */}
                {needsReviewPct > 0 && (
                  <>
                    <stop offset={`${masteredPct}%`} stopColor="#ca8a04" stopOpacity="0.98" />
                    <stop offset={`${totalPct}%`} stopColor="#facc15" stopOpacity="0.95" />
                  </>
                )}

                {/* Layer 3: Unmemorized fill for the remainder */}
                <stop offset={`${totalPct}%`} stopColor="hsl(var(--card))" stopOpacity="0.95" />
                <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.35" />
              </linearGradient>
            );
          })}

          {/* Selected cell glow - crisp sky-blue ring that never collides with gold or emerald */}
          <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#0284c7" floodOpacity="0.75" />
          </filter>

          {/* Text drop shadow for filled cells */}
          <filter id="textLightShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.65" />
          </filter>
        </defs>

        {/* Surahs Interactive Polygon Layer */}
        <g id="surahs-polygon-layer">
          {surahsDerived.map((surah) => {
            const isSelected = selectedSurahId === surah.id;
            const { status } = surah.derived;
            const statusKey = status === "needs_review" ? "needsReview" : status;

            let fill = "url(#heartUnmemorizedGrad)";
            if (status === "mastered") {
              fill = "url(#heartMasteredGrad)";
            } else if (status === "needs_review") {
              fill = "url(#heartNeedsReviewGrad)";
            } else if (status === "partial") {
              fill = `url(#liquid-grad-${surah.id})`;
            }

            return (
              <path
                key={surah.id}
                id={`cell-${surah.id}`}
                d={surah.path}
                fill={fill}
                stroke={isSelected ? "#0284c7" : "rgba(100, 116, 139, 0.45)"}
                strokeWidth={isSelected ? 2.2 : 0.8}
                strokeLinejoin="round"
                filter={isSelected ? "url(#selectedGlow)" : undefined}
                className={cn(
                  "cursor-pointer transition-all duration-150 motion-reduce:transition-none focus:outline-none fq-focus-ring",
                  isSelected ? "brightness-105" : "hover:brightness-110 active:scale-[0.99]"
                )}
                role="button"
                tabIndex={0}
                aria-label={`${isAr ? surah.name : surah.nameSimple} - ${t(`plans.heart.legend.${statusKey}`)}`}
                onClick={() => onSelectSurah(surah.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSurah(surah.id);
                  }
                }}
              >
                <title>{`${isAr ? surah.name : surah.nameSimple} • ${t(`plans.heart.legend.${statusKey}`)}`}</title>
              </path>
            );
          })}
        </g>

        {/* Surah Labels Layer - 100% of 114 surahs rendered with optimal readability */}
        <g id="surahs-labels-layer" pointerEvents="none">
          {surahsDerived.map((surah) => {
            const { status } = surah.derived;
            const isMastered = status === "mastered";
            const isNeedsReview = status === "needs_review";
            const isPartial = status === "partial";

            // WCAG AA contrast:
            // - Mastered (emerald): crisp white text with dark drop shadow
            // - Needs review (gold): dark ink text
            // - Partial: theme foreground with protective halo so it never vanishes against the unmemorized light area
            // - Unmemorized: theme foreground
            const textColor = isMastered
              ? "#ffffff"
              : isNeedsReview
              ? "#1c1917"
              : "hsl(var(--foreground))";

            const displayName = isAr ? surah.name : surah.nameSimple;
            const fontSize = isAr
              ? 9.2
              : displayName.length > 11
              ? 5.8
              : displayName.length > 8
              ? 6.8
              : displayName.length > 5
              ? 7.8
              : 8.8;

            return (
              <text
                key={`label-${surah.id}`}
                x={surah.cx}
                y={surah.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fill={textColor}
                fontWeight="700"
                stroke={isPartial ? "hsl(var(--card))" : undefined}
                strokeWidth={isPartial ? 2.2 : undefined}
                strokeLinejoin="round"
                paintOrder="stroke fill"
                filter={isMastered ? "url(#textLightShadow)" : undefined}
                className={cn(
                  isAr ? "font-tajawal" : "font-sans tracking-tight",
                  "select-none pointer-events-none"
                )}
              >
                {displayName}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
