"use client";

import { Minus, Plus, Play } from "lucide-react";
import { useLocale } from "next-intl";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { getLanguageDirection } from "@/app/utils/i18n";
import useTranslations from "@/app/hooks/use-translations";
import { Button } from "@/components/ui/button";
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
import { RepeatCount, StopPoint } from "@/app/types/recitation";

const nextRepeatCount = (value: RepeatCount, direction: 1 | -1): RepeatCount => {
  if (direction === 1) {
    if (value === "infinite") return "infinite";
    return value >= REPEAT_COUNT_MAX ? "infinite" : ((value + 1) as RepeatCount);
  }
  if (value === "infinite") return REPEAT_COUNT_MAX;
  return value <= REPEAT_COUNT_MIN ? REPEAT_COUNT_MIN : ((value - 1) as RepeatCount);
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

  const isStartMode = settingsStartVerseKey != null;

  const handlePlay = () => {
    if (!settingsStartVerseKey) return;
    play(settingsStartVerseKey);
    closeSettings();
  };

  return (
    <Sheet open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <SheetContent side={isRTL ? "left" : "right"} dir={getLanguageDirection(locale)}>
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
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("recitation.reciter", "Reciter")}
            </h3>
            <RadioGroup
              value={settings.reciterId != null ? String(settings.reciterId) : undefined}
              onValueChange={(value) => updateSettings({ reciterId: Number(value) })}
              className="max-h-48 overflow-y-auto rounded-lg bg-muted p-2 gap-0"
            >
              {reciters.map((reciter) => (
                <label
                  key={reciter.id}
                  htmlFor={`reciter-${reciter.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent cursor-pointer"
                >
                  <RadioGroupItem value={String(reciter.id)} id={`reciter-${reciter.id}`} />
                  <span className="flex flex-col">
                    <span className="text-foreground">{reciter.translatedName}</span>
                    {reciter.style ? (
                      <span className="text-xs text-muted-foreground">{reciter.style}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("recitation.stopPoint", "Stop at")}
            </h3>
            <RadioGroup
              value={settings.stopPoint}
              onValueChange={(value) => updateSettings({ stopPoint: value as StopPoint })}
              className="flex gap-4 rounded-lg bg-muted p-3"
            >
              <label htmlFor="stop-page" className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="page" id="stop-page" />
                {t("recitation.stopPointPage", "End of page")}
              </label>
              <label htmlFor="stop-surah" className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="surah" id="stop-surah" />
                {t("recitation.stopPointSurah", "End of surah")}
              </label>
            </RadioGroup>
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-3">
            <RepeatStepper
              label={t("recitation.repeatEachAyah", "Repeat each ayah")}
              value={settings.perAyahRepeatCount}
              onChange={(value) => updateSettings({ perAyahRepeatCount: value })}
            />
            <RepeatStepper
              label={t("recitation.repeatRange", "Repeat whole range")}
              value={settings.rangeRepeatCount}
              onChange={(value) => updateSettings({ rangeRepeatCount: value })}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
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
              <span className="text-sm text-foreground">
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
