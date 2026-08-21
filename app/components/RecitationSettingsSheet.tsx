"use client";

import React, { forwardRef, useEffect, useState } from "react";
import {
  BookMarked,
  BookOpen,
  Check,
  ChevronsUpDown,
  CircleDashed,
  CircleDot,
  FileText,
  Gauge,
  Headphones,
  Infinity as InfinityIcon,
  MapPin,
  Minus,
  Plus,
  Repeat2,
  Timer,
  Users,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { ReciterCombobox } from "@/app/components/recitation/ReciterCombobox";
import { getLanguageDirection } from "@/app/utils/i18n";
import useTranslations from "@/app/hooks/use-translations";
import { Button } from "@/components/ui/button";
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

const nextRepeatCount = (value: RepeatCount, direction: 1 | -1): RepeatCount => {
  if (direction === 1) {
    if (value === "infinite") return "infinite";
    return value >= REPEAT_COUNT_MAX ? "infinite" : ((value + 1) as RepeatCount);
  }
  if (value === "infinite") return REPEAT_COUNT_MAX;
  return value <= REPEAT_COUNT_MIN ? REPEAT_COUNT_MIN : ((value - 1) as RepeatCount);
};

const SectionHeader = ({
  icon: Icon,
  label,
}: {
  icon: typeof Users;
  label: string;
}) => (
  <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-2">
    <Icon className="size-3.5 text-gold" strokeWidth={1.8} />
    {label}
  </h3>
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
  { selected: Reciter | null; open: boolean } & React.ComponentPropsWithoutRef<typeof Button>
>(({ selected, open, ...props }, ref) => {
  const t = useTranslations();
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between rounded-xl border-border bg-card font-normal h-auto py-2.5"
      {...props}
    >
      {selected ? (
        <span className="flex flex-col items-start text-start">
          <span className="text-foreground">{selected.translatedName}</span>
          {selected.style ? (
            <span className="text-xs text-muted-foreground">{selected.style}</span>
          ) : null}
        </span>
      ) : (
        <span className="text-muted-foreground">
          {t("recitation.reciterPlaceholder", "Choose a reciter")}
        </span>
      )}
      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
    </Button>
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
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="flex-1 justify-between rounded-xl border-border bg-card font-normal h-auto py-2.5"
        >
          {selected ? (
            <span className="text-foreground truncate">{displayName(selected)}</span>
          ) : (
            <span className="text-muted-foreground">
              {t("recitation.surahPlaceholder", "Choose a surah")}
            </span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
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
                  className="cursor-pointer"
                >
                  <Check
                    className={`me-2 size-4 ${chapter.id === value ? "opacity-100 text-primary" : "opacity-0"}`}
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

// The "to" picker for stopPoint "custom". Bounds are always derived live from
// referencePage/referenceSurah/referenceAyah (the current playing/viewed
// position) rather than captured once — an effect corrects a stale rangeTo
// (from an earlier session, before the reference moved) the moment the
// reference changes, so the displayed value and the value actually used at
// resolve time never diverge. See docs/plans/recitation-playback.md Addendum 9.
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

  // Number inputs are buffered locally and only clamped/committed on blur —
  // clamping on every keystroke (the first cut of this component) fought
  // the user mid-type: typing "12" with a floor of 5 would snap to "5" after
  // the first digit, so the second digit landed on "5" instead of "1".
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
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <SectionHeader icon={MapPin} label={t("recitation.rangeTo", "Stop at point")} />

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
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : `border-border bg-card text-foreground ${disabled ? "" : "hover:bg-[hsl(var(--well)/var(--well-alpha))]"}`
              }`}
            >
              <Icon
                className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
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
            className="w-20 shrink-0"
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
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: RepeatCount;
  onChange: (value: RepeatCount) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={disabled}
        onClick={() => onChange(nextRepeatCount(value, -1))}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">
        {value === "infinite" ? "∞" : value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={disabled}
        onClick={() => onChange(nextRepeatCount(value, 1))}
      >
        <Plus className="size-3.5" />
      </Button>
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
      >
        <SheetHeader>
          <SheetTitle>{t("recitation.settingsTitle", "Recitation settings")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t(
              "recitation.settingsDescription",
              "Choose a reciter and configure playback.",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-6 mt-2 overflow-y-auto">
          {activeOverride ? (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm text-primary">
              <Headphones className="size-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">
                {t("recitation.playingOverride", "Playing")}: {activeOverride.label}
              </span>
            </div>
          ) : null}

          <div>
            <SectionHeader icon={Users} label={t("recitation.reciter", "Reciter")} />
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
            <SectionHeader icon={CircleDashed} label={t("recitation.stopPoint", "Stop at")} />
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
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      isDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    } ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : `border-border bg-card text-foreground ${isDisabled ? "" : "hover:bg-[hsl(var(--well)/var(--well-alpha))]"}`
                    }`}
                  >
                    <RadioGroupItem value={value} id={`stop-${value}`} className="sr-only" />
                    <Icon
                      className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                      strokeWidth={1.8}
                    />
                    {t(labelKey, fallback)}
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

          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Repeat2 className="size-3.5 text-gold" strokeWidth={1.8} />
              {t("recitation.repeatSectionLabel", "Repeats")}
            </div>
            <RepeatStepper
              label={t("recitation.repeatEachAyah", "Repeat each ayah")}
              value={settings.perAyahRepeatCount}
              onChange={(value) => updateSettings({ perAyahRepeatCount: value })}
            />
            {settings.stopPoint !== "none" ? (
              <RepeatStepper
                label={t("recitation.repeatRange", "Repeat whole range")}
                value={settings.rangeRepeatCount}
                onChange={(value) => updateSettings({ rangeRepeatCount: value })}
                disabled={activeOverride != null}
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                <Gauge className="size-3.5 text-gold" strokeWidth={1.8} />
                {t("recitation.playbackSpeed", "Playback speed")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
                </Button>
                <span className="w-10 text-center text-sm font-medium tabular-nums">
                  {settings.playbackSpeed}x
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                <Timer className="size-3.5 text-gold" strokeWidth={1.8} />
                {t("recitation.pauseBetweenRepeats", "Pause between repeats")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
                </Button>
                <span className="w-10 text-center text-sm font-medium tabular-nums">
                  {settings.pauseBetweenRepeatsMs / 1000}s
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
