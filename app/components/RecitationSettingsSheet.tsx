"use client";

import React, { forwardRef, useEffect, useState } from "react";
import {
  BookMarked,
  BookOpen,
  Check,
  ChevronsUpDown,
  CircleDashed,
  CircleDot,
  CircleUserRound,
  FileText,
  Gauge,
  Headphones,
  Infinity as InfinityIcon,
  MapPin,
  Minus,
  Plus,
  Repeat1,
  Repeat2,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { ReciterCombobox } from "@/app/components/recitation/ReciterCombobox";
import { getLanguageDirection } from "@/app/utils/i18n";
import useTranslations from "@/app/hooks/use-translations";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  PAUSE_BETWEEN_REPEATS_MAX_MS,
  PAUSE_BETWEEN_REPEATS_STEP_MS,
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  PLAYBACK_SPEED_STEP,
  REPEAT_COUNT_MAX,
  REPEAT_COUNT_MIN,
} from "@/app/constants/recitation";
import { RangePoint, RepeatCount, Reciter, StopPoint } from "@/app/types/recitation";
import { SurahResult } from "@/app/types";
import { MUSHAF_LAST_PAGE } from "@/app/constants/plans";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";
import { cn } from "@/lib/utils";

const nextRepeatCount = (value: RepeatCount, direction: 1 | -1): RepeatCount => {
  if (direction === 1) {
    if (value === "infinite") return "infinite";
    return value >= REPEAT_COUNT_MAX ? "infinite" : ((value + 1) as RepeatCount);
  }
  if (value === "infinite") return REPEAT_COUNT_MAX;
  return value <= REPEAT_COUNT_MIN ? REPEAT_COUNT_MIN : ((value - 1) as RepeatCount);
};

const SectionHeader = ({
  label,
}: {
  icon?: typeof Users;
  label: string;
}) => (
  <div className="fq-overline mb-2">{label}</div>
);

const STOP_POINT_OPTIONS: { value: StopPoint; icon: typeof Users; labelKey: string; fallback: string }[] = [
  { value: "page", icon: FileText, labelKey: "recitation.stopPointPage", fallback: "End of page" },
  { value: "rub", icon: CircleDot, labelKey: "recitation.stopPointRub", fallback: "End of rub" },
  { value: "hizb", icon: CircleDashed, labelKey: "recitation.stopPointHizb", fallback: "End of hizb" },
  { value: "juz", icon: BookOpen, labelKey: "recitation.stopPointJuz", fallback: "End of Juz'" },
  { value: "surah", icon: BookMarked, labelKey: "recitation.stopPointSurah", fallback: "End of surah" },
  { value: "none", icon: InfinityIcon, labelKey: "recitation.stopPointNone", fallback: "No stop" },
  { value: "custom", icon: MapPin, labelKey: "recitation.stopPointCustom", fallback: "Custom point" },
];

const RANGE_TYPE_OPTIONS: { value: RangePoint["type"]; icon: typeof Users; labelKey: string; fallback: string }[] = [
  { value: "page", icon: FileText, labelKey: "recitation.rangeTypePage", fallback: "Page" },
  { value: "verse", icon: BookMarked, labelKey: "recitation.rangeTypeVerse", fallback: "Verse" },
];

const ReciterTrigger = forwardRef<
  HTMLButtonElement,
  { selected: Reciter | null; open: boolean } & React.ComponentPropsWithoutRef<"button">
>(({ selected, open, ...props }, ref) => {
  const t = useTranslations();
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      className="fq-section-row fq-focus-ring w-full rounded-xl border border-border bg-card text-start transition-colors hover:bg-muted/30"
      {...props}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <CircleUserRound className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-foreground leading-tight block truncate">
            {selected ? selected.translatedName : t("recitation.reciterPlaceholder", "Choose a reciter")}
          </span>
          {selected?.style ? (
            <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block truncate">
              {selected.style}
            </span>
          ) : null}
        </div>
      </div>
      <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
    </button>
  );
});
ReciterTrigger.displayName = "ReciterTrigger";

const SurahCombobox = ({
  chapters,
  value,
  minSurah,
  onChange,
  portalContainer,
  disabled = false,
}: {
  chapters: SurahResult[];
  value: number | null;
  minSurah: number;
  onChange: (surah: number) => void;
  portalContainer: HTMLElement | null;
  disabled?: boolean;
}) => {
  const locale = useLocale();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const options = chapters.filter((c) => c.id >= minSurah);
  const selected = chapters.find((c) => c.id === value) ?? null;
  const displayName = (c: SurahResult) => (locale === "ar" ? c.name_arabic : c.name_simple);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          disabled={disabled}
          className="flex-1 fq-section-row rounded-xl border border-border bg-card text-start py-2 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
        >
          <span className="truncate">
            {selected ? displayName(selected) : t("recitation.surahPlaceholder", "Choose a surah")}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" container={portalContainer}>
        <Command>
          <CommandInput placeholder={t("recitation.surahSearchPlaceholder", "Search surahs…")} />
          <CommandList>
            <CommandEmpty>{t("recitation.surahEmpty", "No surah found.")}</CommandEmpty>
            <CommandGroup>
              {options.map((chapter) => (
                <CommandItem
                  key={chapter.id}
                  value={`${displayName(chapter)} ${chapter.id}`}
                  onSelect={() => {
                    onChange(chapter.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-[13px]"
                >
                  <Check
                    className={`me-2 size-3.5 ${chapter.id === value ? "opacity-100 text-primary" : "opacity-0"}`}
                  />
                  <span className="text-foreground">{displayName(chapter)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const CustomRangePicker = ({
  chapters,
  rangeTo,
  onChange,
  referenceSurah,
  referenceAyah,
  referencePage,
  portalContainer,
  disabled = false,
}: {
  chapters: SurahResult[];
  rangeTo: RangePoint | null;
  onChange: (rangeTo: RangePoint) => void;
  referenceSurah: number;
  referenceAyah: number;
  referencePage: number;
  portalContainer: HTMLElement | null;
  disabled?: boolean;
}) => {
  const t = useTranslations();

  useEffect(() => {
    if (!rangeTo) {
      onChange({ type: "page", page: referencePage });
      return;
    }
    if (rangeTo.type === "page" && rangeTo.page < referencePage) {
      onChange({ type: "page", page: referencePage });
      return;
    }
    if (rangeTo.type === "verse") {
      if (rangeTo.surah < referenceSurah) {
        onChange({ type: "verse", surah: referenceSurah, ayah: referenceAyah });
      } else if (rangeTo.surah === referenceSurah && rangeTo.ayah < referenceAyah) {
        onChange({ type: "verse", surah: referenceSurah, ayah: referenceAyah });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeTo, referencePage, referenceSurah, referenceAyah]);

  const type = rangeTo?.type ?? "page";
  const page = Math.max(rangeTo?.type === "page" ? rangeTo.page : referencePage, referencePage);
  const surah = Math.max(rangeTo?.type === "verse" ? rangeTo.surah : referenceSurah, referenceSurah);
  const ayahFloor = surah === referenceSurah ? referenceAyah : 1;
  const selectedChapter = chapters.find((c) => c.id === surah);
  const ayahCeil = selectedChapter?.verses_count ?? ayahFloor;
  const ayah = Math.min(
    Math.max(rangeTo?.type === "verse" ? rangeTo.ayah : ayahFloor, ayahFloor),
    ayahCeil,
  );

  const [pageInput, setPageInput] = useState(String(page));
  useEffect(() => setPageInput(String(page)), [page]);
  const commitPage = () => {
    const next = Number(pageInput);
    const clamped = Number.isNaN(next)
      ? page
      : Math.min(Math.max(next, referencePage), MUSHAF_LAST_PAGE);
    setPageInput(String(clamped));
    onChange({ type: "page", page: clamped });
  };

  const [ayahInput, setAyahInput] = useState(String(ayah));
  useEffect(() => setAyahInput(String(ayah)), [ayah]);
  const commitAyah = () => {
    const next = Number(ayahInput);
    const clamped = Number.isNaN(next) ? ayah : Math.min(Math.max(next, ayahFloor), ayahCeil);
    setAyahInput(String(clamped));
    onChange({ type: "verse", surah, ayah: clamped });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
      <SectionHeader label={t("recitation.rangeTo", "Stop at point")} />

      <div className="grid grid-cols-2 gap-2">
        {RANGE_TYPE_OPTIONS.map(({ value, icon: Icon, labelKey, fallback }) => {
          const isSelected = type === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(
                  value === "page"
                    ? { type: "page", page }
                    : { type: "verse", surah, ayah },
                )
              }
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-card text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))]"
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={1.8}
              />
              {t(labelKey, fallback)}
            </button>
          );
        })}
      </div>

      {type === "page" ? (
        <Input
          type="number"
          inputMode="numeric"
          min={referencePage}
          max={MUSHAF_LAST_PAGE}
          value={pageInput}
          disabled={disabled}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={commitPage}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-9 text-[13px]"
        />
      ) : (
        <div className="flex gap-2">
          <SurahCombobox
            chapters={chapters}
            value={surah}
            minSurah={referenceSurah}
            onChange={(nextSurah) => {
              const nextChapter = chapters.find((c) => c.id === nextSurah);
              const minAyah = nextSurah === referenceSurah ? referenceAyah : 1;
              const clampedAyah = Math.min(Math.max(ayah, minAyah), nextChapter?.verses_count ?? minAyah);
              onChange({ type: "verse", surah: nextSurah, ayah: clampedAyah });
            }}
            portalContainer={portalContainer}
            disabled={disabled}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={ayahFloor}
            max={ayahCeil}
            value={ayahInput}
            className="w-20 shrink-0 h-9 text-[13px]"
            disabled={disabled}
            onChange={(e) => setAyahInput(e.target.value)}
            onBlur={commitAyah}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </div>
      )}
    </div>
  );
};

const RepeatStepper = ({
  icon: Icon,
  label,
  value,
  onChange,
  disabled = false,
}: {
  icon?: LucideIcon;
  label: string;
  value: RepeatCount;
  onChange: (value: RepeatCount) => void;
  disabled?: boolean;
}) => (
  <div className="fq-section-row py-2.5 px-4">
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <Icon className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
      )}
      <span className="text-[13px] font-medium text-foreground leading-tight truncate">
        {label}
      </span>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        aria-label="Decrease"
        className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
        disabled={disabled}
        onClick={() => onChange(nextRepeatCount(value, -1))}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-[13px] font-semibold tabular-nums text-foreground">
        {value === "infinite" ? "∞" : value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
        disabled={disabled}
        onClick={() => onChange(nextRepeatCount(value, 1))}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  </div>
);

export const RecitationSettingsSheet = () => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const {
    settings,
    updateSettings,
    reciters,
    chapters,
    isSettingsOpen,
    closeSettings,
    currentVerseKey,
    pageFirstVerseKey,
    recitedPage,
    currentPageNumber,
    activeOverride,
  } = useRecitation();
  // Popovers rendered inside this Sheet (e.g. ReciterCombobox) must portal
  // here instead of document.body — see components/ui/popover.tsx.
  const [sheetContentEl, setSheetContentEl] = useState<HTMLDivElement | null>(null);

  // Floor for the "custom" stopPoint's "to" picker — the current
  // playing/viewed position, so an invalid (before-start) range can't be
  // entered. See docs/plans/recitation-playback.md Addendum 9.
  const referenceVerseKey = currentVerseKey ?? pageFirstVerseKey;
  const [referenceSurahRaw, referenceAyahRaw] = referenceVerseKey
    ? referenceVerseKey.split(":").map(Number)
    : [1, 1];
  const referenceSurah = referenceSurahRaw || 1;
  const referenceAyah = referenceAyahRaw || 1;
  const referencePage = recitedPage ?? currentPageNumber ?? 1;
  useCloseOnBackGesture(isSettingsOpen, closeSettings);

  return (
    <Sheet open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <SheetContent
        ref={setSheetContentEl}
        side={isRTL ? "left" : "right"}
        dir={getLanguageDirection(locale)}
        className="w-full sm:max-w-[408px] gap-0 p-0 flex flex-col"
      >
        <SheetHeader className="relative shrink-0 px-5 pb-3.5 pt-5 border-b border-border/70 text-start">
          <SheetTitle className="text-[15px] font-semibold leading-none text-foreground">
            {t("recitation.settingsTitle", "Recitation settings")}
          </SheetTitle>
          <SheetDescription className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t(
              "recitation.settingsDescription",
              "Choose a reciter and configure playback.",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {activeOverride ? (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-xs text-primary">
              <Headphones className="size-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate font-medium">
                {t("recitation.playingOverride", "Playing")}: {activeOverride.label}
              </span>
            </div>
          ) : null}

          <div>
            <SectionHeader label={t("recitation.reciter", "Reciter")} />
            <ReciterCombobox
              reciters={reciters}
              value={settings.reciterId}
              onChange={(id) => updateSettings({ reciterId: id })}
              portalContainer={sheetContentEl}
              trigger={({ selected, open }) => (
                <ReciterTrigger selected={selected} open={open} />
              )}
            />
          </div>

          <div>
            <SectionHeader label={t("recitation.stopPoint", "Stop at")} />
            <RadioGroup
              value={settings.stopPoint}
              onValueChange={(value) => updateSettings({ stopPoint: value as StopPoint })}
              disabled={activeOverride != null}
              className="grid grid-cols-2 gap-2"
            >
              {STOP_POINT_OPTIONS.map(({ value, icon: Icon, labelKey, fallback }) => {
                const isSelected = settings.stopPoint === value;
                const isDisabled = activeOverride != null;
                return (
                  <label
                    key={value}
                    htmlFor={`stop-${value}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] transition-all",
                      isDisabled
                        ? "cursor-not-allowed opacity-50 border-border bg-card"
                        : "cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))]"
                    )}
                  >
                    <RadioGroupItem value={value} id={`stop-${value}`} className="sr-only" />
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="truncate">{t(labelKey, fallback)}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {settings.stopPoint === "custom" ? (
            <CustomRangePicker
              chapters={chapters}
              rangeTo={settings.rangeTo}
              onChange={(rangeTo) => updateSettings({ rangeTo })}
              referenceSurah={referenceSurah}
              referenceAyah={referenceAyah}
              referencePage={referencePage}
              portalContainer={sheetContentEl}
              disabled={activeOverride != null}
            />
          ) : null}

          <div>
            <SectionHeader label={t("recitation.repeatSectionLabel", "Repeats & Speed")} />
            <div className="fq-section-group">
              <RepeatStepper
                icon={Repeat1}
                label={t("recitation.repeatEachAyah", "Repeat each ayah")}
                value={settings.perAyahRepeatCount}
                onChange={(value) => updateSettings({ perAyahRepeatCount: value })}
              />
              {settings.stopPoint !== "none" ? (
                <RepeatStepper
                  icon={Repeat2}
                  label={t("recitation.repeatRange", "Repeat whole range")}
                  value={settings.rangeRepeatCount}
                  onChange={(value) => updateSettings({ rangeRepeatCount: value })}
                  disabled={activeOverride != null}
                />
              ) : null}

              <div className="fq-section-row py-2.5 px-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Gauge className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium text-foreground leading-tight truncate">
                    {t("recitation.playbackSpeed", "Playback speed")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease speed"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      updateSettings({
                        playbackSpeed: Math.max(
                          PLAYBACK_SPEED_MIN,
                          Number((settings.playbackSpeed - PLAYBACK_SPEED_STEP).toFixed(2)),
                        ),
                      })
                    }
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-10 text-center text-[13px] font-semibold tabular-nums text-foreground">
                    {settings.playbackSpeed}x
                  </span>
                  <button
                    type="button"
                    aria-label="Increase speed"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      updateSettings({
                        playbackSpeed: Math.min(
                          PLAYBACK_SPEED_MAX,
                          Number((settings.playbackSpeed + PLAYBACK_SPEED_STEP).toFixed(2)),
                        ),
                      })
                    }
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="fq-section-row py-2.5 px-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Timer className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium text-foreground leading-tight truncate">
                    {t("recitation.pauseBetweenRepeats", "Pause between repeats")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease pause"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      updateSettings({
                        pauseBetweenRepeatsMs: Math.max(
                          0,
                          settings.pauseBetweenRepeatsMs - PAUSE_BETWEEN_REPEATS_STEP_MS,
                        ),
                      })
                    }
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-10 text-center text-[13px] font-semibold tabular-nums text-foreground">
                    {settings.pauseBetweenRepeatsMs / 1000}s
                  </span>
                  <button
                    type="button"
                    aria-label="Increase pause"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      updateSettings({
                        pauseBetweenRepeatsMs: Math.min(
                          PAUSE_BETWEEN_REPEATS_MAX_MS,
                          settings.pauseBetweenRepeatsMs + PAUSE_BETWEEN_REPEATS_STEP_MS,
                        ),
                      })
                    }
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Closes the inventory with the terminal identity mark */}
          <div className="flex justify-center pt-2">
            <span className="fq-rule-mark !inline-block" aria-hidden="true" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
