"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, BookOpen, FileText, Lock } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { fetchChapters } from "@/app/utils/recitation-api";
import type { SurahResult } from "@/app/types";
import { MUSHAF_FIRST_PAGE, MUSHAF_LAST_PAGE } from "@/app/constants/plans";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type PickerMode = "page" | "surah";

const PAGES = Array.from(
  { length: MUSHAF_LAST_PAGE - MUSHAF_FIRST_PAGE + 1 },
  (_, i) => MUSHAF_FIRST_PAGE + i
);

type Props = {
  value: number; // Page number 1–604
  onChange: (page: number) => void;
  portalContainer?: HTMLElement | null;
  disabled?: boolean;
};

export const StartPointPicker = ({
  value,
  onChange,
  portalContainer,
  disabled = false,
}: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const [mode, setMode] = useState<PickerMode>("page");
  const [openPage, setOpenPage] = useState(false);
  const [openSurah, setOpenSurah] = useState(false);

  const { data: chapters = [] } = useQuery({
    queryKey: ["quran-chapters"],
    queryFn: fetchChapters,
    staleTime: Infinity,
  });

  const surahName = (c: SurahResult) => (locale === "ar" ? c.name_arabic : c.name_simple);

  // Find the surah that starts on or spans the current value
  const currentSurah = useMemo(() => {
    return chapters.find((c) => {
      const [start, end] = c.pages.split("-").map(Number);
      return value >= start && value <= end;
    }) ?? null;
  }, [chapters, value]);

  const handlePageSelect = (page: number) => {
    onChange(page);
    setOpenPage(false);
  };

  const handleSurahSelect = (chapter: SurahResult) => {
    const startPage = Number(chapter.pages.split("-")[0]);
    onChange(startPage);
    setOpenSurah(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">
          {t("plans.startPoint.label", "Start point (optional)")}
        </span>
        <span className="text-xs font-medium text-primary">
          {value === 1
            ? t("plans.startPoint.fromBeginning", "From page 1")
            : `${t("plans.startPoint.pagePrefix", "Page")} ${toLocaleNumeral(value, locale)}`}
        </span>
      </div>

      {disabled ? (
        <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5 flex-none" />
          <span>
            {t(
              "plans.startPoint.lockedNotice",
              "Wird is already active — reading resumes from where you left off"
            )}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Picker Mode Toggle: [ By page | By surah ] */}
          <div className="flex gap-1 rounded-full bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("page")}
              className={cn(
                "min-h-[44px] flex-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                mode === "page"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="size-3.5" />
              <span>{t("plans.startPoint.byPage", "By page")}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("surah")}
              className={cn(
                "min-h-[44px] flex-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                mode === "surah"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="size-3.5" />
              <span>{t("plans.startPoint.bySurah", "By surah")}</span>
            </button>
          </div>

          {/* Mode 1: By page searchable dropdown */}
          {mode === "page" ? (
            <div className="flex flex-col gap-1.5">
              <Popover open={openPage} onOpenChange={setOpenPage}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-expanded={openPage}
                    className="fq-focus-ring min-h-[44px] flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-muted/30"
                  >
                    <span className="truncate">
                      {value
                        ? `${t("plans.startPoint.pagePrefix", "Page")} ${toLocaleNumeral(value, locale)}`
                        : t("plans.startPoint.choosePage", "Choose a page")}
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                  container={portalContainer}
                >
                  <Command>
                    <CommandInput
                      placeholder={t("plans.startPoint.searchPages", "Search pages…")}
                    />
                    <CommandList className="fq-scroll-nice max-h-60">
                      <CommandEmpty>
                        {t("plans.startPoint.noPageFound", "No page found.")}
                      </CommandEmpty>
                      <CommandGroup>
                        {PAGES.map((p) => {
                          const isSelected = value === p;
                          return (
                            <CommandItem
                              key={p}
                              value={`${p} ${toLocaleNumeral(p, locale)}`}
                              onSelect={() => handlePageSelect(p)}
                              className="min-h-[44px] cursor-pointer text-xs flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <Check
                                  className={cn(
                                    "size-3.5",
                                    isSelected ? "text-primary opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="font-medium text-foreground">
                                  {t("plans.startPoint.pagePrefix", "Page")}{" "}
                                  {toLocaleNumeral(p, locale)}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {currentSurah ? (
                <span className="text-xs text-muted-foreground px-1">
                  {toLocaleNumeral(value, locale)} — {surahName(currentSurah)}
                </span>
              ) : null}
            </div>
          ) : (
            /* Mode 2: By surah combobox */
            <Popover open={openSurah} onOpenChange={setOpenSurah}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-expanded={openSurah}
                  className="fq-focus-ring min-h-[44px] flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-muted/30"
                >
                  <span className="truncate">
                    {currentSurah
                      ? `${surahName(currentSurah)} (${t("plans.startPoint.pagePrefix", "Page")} ${toLocaleNumeral(Number(currentSurah.pages.split("-")[0]), locale)})`
                      : t("plans.startPoint.chooseSurah", "Choose a surah")}
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                container={portalContainer}
              >
                <Command>
                  <CommandInput
                    placeholder={t("plans.startPoint.searchSurahs", "Search surahs…")}
                  />
                  <CommandList className="fq-scroll-nice max-h-60">
                    <CommandEmpty>
                      {t("plans.startPoint.noSurahFound", "No surah found.")}
                    </CommandEmpty>
                    <CommandGroup>
                      {chapters.map((chapter) => {
                        const chapterStartPage = Number(chapter.pages.split("-")[0]);
                        const isSelected = value === chapterStartPage;
                        return (
                          <CommandItem
                            key={chapter.id}
                            value={`${surahName(chapter)} ${chapter.id} ${chapter.name_arabic} ${chapter.name_simple}`}
                            onSelect={() => handleSurahSelect(chapter)}
                            className="min-h-[44px] cursor-pointer text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  "size-3.5",
                                  isSelected ? "text-primary opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-medium text-foreground">
                                {surahName(chapter)}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {t("plans.startPoint.pagePrefix", "Page")}{" "}
                              {toLocaleNumeral(chapterStartPage, locale)}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
};
