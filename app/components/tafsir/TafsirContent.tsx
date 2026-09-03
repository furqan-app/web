"use client";

import React, { useMemo } from "react";
import { AlertCircle, FileQuestion, RotateCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseTafsirSegments } from "@/app/utils/tafsir-formatter";
import { useOnlineStatus } from "@/app/hooks/use-online-status";
import { TafsirSegment } from "@/app/types/tafsir";
import { cn } from "@/lib/utils";

export interface TafsirContentProps {
  text?: string | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  direction?: "rtl" | "ltr";
  className?: string;
}

export function TafsirContent({
  text,
  isLoading = false,
  isError = false,
  onRetry,
  direction = "rtl",
  className,
}: TafsirContentProps) {
  const t = useTranslations("tafsir");
  const isOnline = useOnlineStatus();

  const segments: TafsirSegment[] = useMemo(() => {
    if (!text) return [];
    return parseTafsirSegments(text);
  }, [text]);

  if (isLoading) {
    return (
      <div className={cn("space-y-3.5 py-3 animate-pulse", className)} aria-busy="true" aria-live="polite">
        <div className="h-4 bg-primary/15 rounded-md w-3/4" />
        <div className="h-4 bg-muted-foreground/15 rounded-md w-full" />
        <div className="h-4 bg-muted-foreground/15 rounded-md w-5/6" />
        <div className="h-4 bg-muted-foreground/15 rounded-md w-full" />
        <div className="h-4 bg-muted-foreground/15 rounded-md w-2/3" />
        <div className="pt-3 space-y-3.5">
          <div className="h-4 bg-muted-foreground/15 rounded-md w-4/5" />
          <div className="h-4 bg-muted-foreground/15 rounded-md w-full" />
          <div className="h-4 bg-muted-foreground/15 rounded-md w-3/5" />
        </div>
      </div>
    );
  }

  if (!isOnline && (isError || !text)) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-card/60 p-6 text-center my-4 space-y-3",
          className
        )}
        aria-live="polite"
      >
        <div className="flex justify-center">
          <WifiOff className="size-6 text-muted-foreground shrink-0" strokeWidth={1.8} />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t("error")}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center my-4 space-y-3",
          className
        )}
        aria-live="polite"
      >
        <div className="flex justify-center">
          <AlertCircle className="size-6 text-destructive shrink-0" strokeWidth={1.8} />
        </div>
        <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
          {t("error")}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <RotateCw className="size-3.5" />
            <span>{t("retry")}</span>
          </button>
        ) : null}
      </div>
    );
  }

  if (!text || segments.length === 0) {
    return (
      <div
        className={cn("rounded-xl border border-border bg-card/50 p-6 text-center my-4 space-y-2", className)}
        aria-live="polite"
      >
        <div className="flex justify-center">
          <FileQuestion className="size-6 text-muted-foreground/70 shrink-0" strokeWidth={1.8} />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none leading-loose selection:bg-primary/20",
        direction === "rtl" ? "text-justify" : "text-start",
        className
      )}
      dir={direction}
    >
      <div
        className={cn(
          "text-[15px] sm:text-base text-foreground leading-[2.1] whitespace-pre-line font-normal",
          direction === "rtl" && "text-justify"
        )}
      >
        {segments.map((seg, idx) => {
          if (seg.type === "quran") {
            return (
              <span
                key={idx}
                className="font-uthmanic text-primary text-lg sm:text-xl font-medium px-1 align-baseline inline"
                dir="rtl"
              >
                {seg.text}
              </span>
            );
          }

          if (seg.type === "reference") {
            return (
              <span
                key={idx}
                className="text-muted-foreground text-xs sm:text-sm font-normal px-1 align-baseline inline opacity-90"
                dir={direction}
              >
                {seg.text}
              </span>
            );
          }

          return (
            <span key={idx} className="text-foreground align-baseline inline">
              {seg.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
