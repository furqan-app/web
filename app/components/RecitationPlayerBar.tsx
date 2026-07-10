"use client";

import { Pause, Play, Settings as SettingsIcon, X } from "lucide-react";
import { useRecitation } from "@/app/contexts/RecitationContext";
import useTranslations from "@/app/hooks/use-translations";

// Fixed bottom bar, mounted app-wide in app/[locale]/layout.tsx — visible
// whenever a recitation session is active/paused, including after the user
// has navigated away from the reader entirely (background playback, ADR 0021).
export const RecitationPlayerBar = () => {
  const { status, currentVerseKey, reciters, settings, togglePlayPause, stop, openSettings } =
    useRecitation();
  const t = useTranslations();

  if (status === "idle") return null;

  const reciter = reciters.find((r) => r.id === settings.reciterId);
  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          aria-label={isPlaying ? t("recitation.pause", "Pause") : t("recitation.resume", "Resume")}
          aria-pressed={isPlaying}
          onClick={togglePlayPause}
          disabled={isLoading}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shrink-0 disabled:opacity-60"
        >
          {isLoading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="size-4" strokeWidth={2} />
          ) : (
            <Play className="size-4" strokeWidth={2} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {reciter?.translatedName ?? t("recitation.nowPlaying", "Recitation")}
          </p>
          <p className="truncate text-xs text-muted-foreground">{currentVerseKey ?? ""}</p>
        </div>

        <button
          type="button"
          aria-label={t("recitation.settingsTitle", "Recitation settings")}
          onClick={() => openSettings()}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        >
          <SettingsIcon className="size-4" strokeWidth={1.8} />
        </button>

        <button
          type="button"
          aria-label={t("recitation.stop", "Stop")}
          onClick={stop}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        >
          <X className="size-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
};
