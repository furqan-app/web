"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_TAFSIR_ID, getTafsirEdition } from "@/app/constants/tafsir";
import { useTafsir } from "@/app/hooks/use-tafsir";
import { useVerseText } from "@/app/hooks/use-verse-text";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import {
  getNextAyahKey,
  getPreviousAyahKey,
  getSurahMeta,
  normalizeVerseKey,
} from "@/app/utils/quran-navigation";
import { formatVerseSnippet } from "@/app/utils/tafsir-formatter";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TafsirEditionSelect } from "./TafsirEditionSelect";
import { TafsirContent } from "./TafsirContent";
import { cn } from "@/lib/utils";

const TAFSIR_STORAGE_KEY = "fq_tafsir_edition_id";

export interface TafsirSheetProps {
  isOpen: boolean;
  onClose: () => void;
  verseKey?: string | null;
  verseText?: string | null;
  onNavigateVerseKey?: (nextVerseKey: string, nextVerseText?: string) => void;
}

export function TafsirSheet({
  isOpen,
  onClose,
  verseKey,
  verseText,
  onNavigateVerseKey,
}: TafsirSheetProps) {
  const locale = useLocale();
  const t = useTranslations("tafsir");
  const isRTL = getLanguageDirection(locale) === "rtl";

  // Reference for Radix Popover focus portal containment (ADR 0021 Addendum 5b)
  const [sheetContentEl, setSheetContentEl] = useState<HTMLDivElement | null>(null);

  // Scroll container reference to reset scroll on ayah navigation
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Selected Tafsir edition with localStorage persistence
  const [tafsirId, setTafsirId] = useState<number>(DEFAULT_TAFSIR_ID);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(TAFSIR_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed) && getTafsirEdition(parsed)) {
          setTafsirId(parsed);
        } else {
          localStorage.removeItem(TAFSIR_STORAGE_KEY);
        }
      }
    }
  }, []);

  const handleSelectEdition = (newId: number) => {
    setTafsirId(newId);
    if (typeof window !== "undefined") {
      localStorage.setItem(TAFSIR_STORAGE_KEY, String(newId));
    }
  };

  const selectedEdition = getTafsirEdition(tafsirId);

  // Active verse key normalized from props
  const activeVerseKey = normalizeVerseKey(verseKey) ?? "1:1";

  // Stepper calculations
  const previousKey = getPreviousAyahKey(activeVerseKey);
  const nextKey = getNextAyahKey(activeVerseKey);

  const handleNavigate = React.useCallback((targetKey: string | null) => {
    if (!targetKey) return;
    onNavigateVerseKey?.(targetKey);
  }, [onNavigateVerseKey]);

  // Reset scroll to top when active verse key changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeVerseKey]);

  // Keyboard navigation for desktop & tablet (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (isRTL) {
          if (previousKey) handleNavigate(previousKey);
        } else {
          if (nextKey) handleNavigate(nextKey);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (isRTL) {
          if (nextKey) handleNavigate(nextKey);
        } else {
          if (previousKey) handleNavigate(previousKey);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, isRTL, previousKey, nextKey, handleNavigate]);

  // Surah & Ayah metadata for header
  const [surahStr, ayahStr] = activeVerseKey.split(":");
  const surahNum = parseInt(surahStr, 10);
  const ayahNum = parseInt(ayahStr, 10);
  const surahMeta = getSurahMeta(surahNum);

  const surahName = surahMeta
    ? locale === "ar"
      ? surahMeta.nameArabic
      : surahMeta.nameSimple
    : "";
  const localizedAyah = toLocaleNumeral(ayahNum, locale);

  // Fetch commentary
  const { data, isLoading, isError, refetch } = useTafsir({
    tafsirId,
    verseKey: activeVerseKey,
    enabled: isOpen,
  });

  // Fetch authentic Uthmanic verse text for header snippet
  const { data: dbVerseText } = useVerseText(activeVerseKey, isOpen);

  const displayedVerseSnippet = useMemo(
    () => formatVerseSnippet(verseText || dbVerseText, 7),
    [verseText, dbVerseText]
  );

  useCloseOnBackGesture(isOpen, onClose);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={setSheetContentEl}
        side="bottom"
        dir={getLanguageDirection(locale)}
        hideDefaultClose
        overlayClassName="bg-overlay/60 backdrop-blur-xs"
        className={cn(
          "flex flex-col p-0 gap-0 bg-background fq-panel-cast overflow-hidden",
          "w-full h-[60dvh] rounded-t-2xl border-t border-border"
        )}
      >
        {/* Subtle decorative drag handle pill */}
        <div className="shrink-0 flex justify-center pt-2.5 pb-1 w-full" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Sheet Header */}
        <SheetHeader className="shrink-0 w-full border-b border-border/80 text-center">
          <div className="px-4 sm:px-6 pt-1 pb-3 space-y-2 max-w-3xl mx-auto w-full">
            {/* Main Stepper Row: Previous Button <-> Centered Surah/Ayah & Snippet <-> Next Button */}
            <div className="flex items-center justify-between gap-2">
              {/* Previous Ayah Arrow */}
              <button
                type="button"
                onClick={() => handleNavigate(previousKey)}
                disabled={!previousKey}
                aria-label={t("previousAyah")}
                className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:size-9 flex items-center justify-center rounded-xl border border-border/80 bg-card/60 text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0"
              >
                {isRTL ? <ChevronRight className="size-4.5" /> : <ChevronLeft className="size-4.5" />}
              </button>

              {/* Centered Title & Verse Snippet */}
              <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center px-1 sm:px-4">
                <SheetTitle className="text-sm sm:text-base font-semibold leading-tight text-foreground truncate tracking-tight">
                  {surahName
                    ? t("surahAyahHeader", { surah: surahName, ayah: localizedAyah })
                    : t("title")}
                </SheetTitle>

                {/* Verse snippet in authentic Uthmanic typography */}
                {displayedVerseSnippet ? (
                  <p
                    className="font-uthmanic text-xs sm:text-sm text-primary/80 truncate mt-0.5 max-w-full leading-normal"
                    dir="rtl"
                  >
                    {displayedVerseSnippet}
                  </p>
                ) : null}

                <SheetDescription className="sr-only">
                  {t("description")}
                </SheetDescription>
              </div>

              {/* Next Ayah Arrow */}
              <button
                type="button"
                onClick={() => handleNavigate(nextKey)}
                disabled={!nextKey}
                aria-label={t("nextAyah")}
                className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:size-9 flex items-center justify-center rounded-xl border border-border/80 bg-card/60 text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0"
              >
                {isRTL ? <ChevronLeft className="size-4.5" /> : <ChevronRight className="size-4.5" />}
              </button>
            </div>

            {/* Tafsir Edition Selection Dropdown */}
            <div className="pt-0.5 max-w-md mx-auto w-full">
              <TafsirEditionSelect
                selectedId={tafsirId}
                onSelect={handleSelectEdition}
                portalContainer={sheetContentEl}
              />
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Commentary Content Body */}
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 fq-scroll-nice scroll-smooth px-4 sm:px-6 md:px-8 py-5 w-full select-text"
        >
          <div className="max-w-3xl mx-auto w-full">
            <TafsirContent
              text={data?.text}
              isLoading={isLoading}
              isError={isError}
              direction={selectedEdition?.direction ?? (isRTL ? "rtl" : "ltr")}
              onRetry={() => refetch()}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
