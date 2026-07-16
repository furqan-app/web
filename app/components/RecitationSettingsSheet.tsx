"use client";

import { useState } from "react";
import {
  BookMarked,
  BookOpen,
  Check,
  ChevronsUpDown,
  CircleDashed,
  CircleDot,
  FileText,
  Gauge,
  Infinity as InfinityIcon,
  Minus,
  Plus,
  Play,
  Repeat2,
  Timer,
  Users,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRecitation } from "@/app/contexts/RecitationContext";
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
import { RepeatCount, Reciter, StopPoint } from "@/app/types/recitation";

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
    <Icon className="size-3.5 text-primary" strokeWidth={1.8} />
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
];

const ReciterCombobox = ({
  reciters,
  value,
  onChange,
  portalContainer,
}: {
  reciters: Reciter[];
  value: number | null;
  onChange: (id: number) => void;
  portalContainer: HTMLElement | null;
}) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const selected = reciters.find((r) => r.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between rounded-xl border-border bg-card font-normal h-auto py-2.5"
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
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        container={portalContainer}
      >
        <Command>
          <CommandInput
            placeholder={t("recitation.reciterSearchPlaceholder", "Search reciters…")}
          />
          <CommandList>
            <CommandEmpty>{t("recitation.reciterEmpty", "No reciter found.")}</CommandEmpty>
            <CommandGroup>
              {reciters.map((reciter) => (
                <CommandItem
                  key={reciter.id}
                  value={`${reciter.translatedName} ${reciter.style ?? ""}`}
                  onSelect={() => {
                    onChange(reciter.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={`me-2 size-4 ${reciter.id === value ? "opacity-100 text-primary" : "opacity-0"}`}
                  />
                  <span className="flex flex-col">
                    <span className="text-foreground">{reciter.translatedName}</span>
                    {reciter.style ? (
                      <span className="text-xs text-muted-foreground">{reciter.style}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const RepeatStepper = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RepeatCount;
  onChange: (value: RepeatCount) => void;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
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
    isSettingsOpen,
    settingsStartVerseKey,
    closeSettings,
    play,
  } = useRecitation();
  // Popovers rendered inside this Sheet (e.g. ReciterCombobox) must portal
  // here instead of document.body — see components/ui/popover.tsx.
  const [sheetContentEl, setSheetContentEl] = useState<HTMLDivElement | null>(null);

  const isStartMode = settingsStartVerseKey != null;

  const handlePlay = () => {
    if (!settingsStartVerseKey) return;
    play(settingsStartVerseKey);
    closeSettings();
  };

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
          <div>
            <SectionHeader icon={Users} label={t("recitation.reciter", "Reciter")} />
            <ReciterCombobox
              reciters={reciters}
              value={settings.reciterId}
              onChange={(id) => updateSettings({ reciterId: id })}
              portalContainer={sheetContentEl}
            />
          </div>

          <div>
            <SectionHeader icon={CircleDashed} label={t("recitation.stopPoint", "Stop at")} />
            <RadioGroup
              value={settings.stopPoint}
              onValueChange={(value) => updateSettings({ stopPoint: value as StopPoint })}
              className="grid grid-cols-2 gap-2"
            >
              {STOP_POINT_OPTIONS.map(({ value, icon: Icon, labelKey, fallback }) => {
                const isSelected = settings.stopPoint === value;
                return (
                  <label
                    key={value}
                    htmlFor={`stop-${value}`}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-card text-foreground hover:bg-accent"
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

          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Repeat2 className="size-3.5 text-primary" strokeWidth={1.8} />
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
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                <Gauge className="size-3.5 text-primary" strokeWidth={1.8} />
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
                <Timer className="size-3.5 text-primary" strokeWidth={1.8} />
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

          {isStartMode ? (
            <Button
              type="button"
              className="w-full flex items-center justify-center gap-2"
              disabled={settings.reciterId == null}
              onClick={handlePlay}
            >
              <Play className="size-4" strokeWidth={1.8} />
              {t("recitation.play", "Play")}
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
