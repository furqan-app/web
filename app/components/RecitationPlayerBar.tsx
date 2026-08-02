"use client";

import { usePathname } from "next/navigation";
import { Pause, Play, Settings as SettingsIcon, Square } from "lucide-react";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import useTranslations from "@/app/hooks/use-translations";
import { cn } from "@/lib/utils";

// Fixed bottom bar, mounted app-wide in app/[locale]/layout.tsx. On reader
// routes (self + grant) it's a permanent fixture — even idle, so its play
// button can start playback of the current Safha — mirroring the nav, which
// it must always follow. Off the reader route it only shows during an
// active/paused session (background playback, ADR 0021). On tablet/mobile
// reader routes it also mirrors the nav overlay's show/hide
// (isOverlayMode/overlayVisible), same toggle, same transform pattern as
// Nav.tsx — see docs/plans/tablet-nav-overlay.md Addendum "Sync voice panel
// with nav overlay".
// At >=1367px + >=800px (Desktop Reading Group), globals.css transforms
// fq-recitation-bar-rail into a narrow vertical rail fixed to the screen-right.
// See docs/plans/recitation-bar-vertical-rail.md.
export const RecitationPlayerBar = () => {
  const {
    status,
    currentVerseKey,
    reciters,
    settings,
    pageFirstVerseKey,
    play,
    togglePlayPause,
    stop,
    openSettings,
  } = useRecitation();
  const { isOverlayMode, overlayVisible } = useNavOverlay();
  const pathname = usePathname();
  const t = useTranslations();

  const isOnReaderRoute = Boolean(pathname?.includes("/pages/"));
  const isIdle = status === "idle";

  if (isIdle && !(isOnReaderRoute && pageFirstVerseKey)) return null;

  const reciter = reciters.find((r) => r.id === settings.reciterId);
  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  const handlePlayPause = () => {
    if (isIdle) {
      if (pageFirstVerseKey) play(pageFirstVerseKey);
      return;
    }
    togglePlayPause();
  };

  return (
    <div
      className={cn(
        // Translucent glass everywhere (Correction Round — desktop included), and
        // matching Nav exactly (same base token, same opacity, same blur, same
        // border) so the two bars read as one consistent floating-chrome style.
        // fq-recitation-bar: marker class so globals.css can target this bar's
        // primary text specifically (dark-theme-only white override).
        "fq-recitation-bar fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/75 backdrop-blur-md",
        // Reader-only marker: at >=1367px and >=800px tall, globals.css turns the
        // bar into a vertical rail fixed to the screen-right. Off the reader route
        // there is no spread to anchor to, so the bar keeps its full-width form.
        isOnReaderRoute && "fq-recitation-bar-rail",
        isOverlayMode && "transition-transform duration-300",
        isOverlayMode && !overlayVisible && "translate-y-full",
      )}
      style={isOverlayMode ? { transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" } : undefined}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          aria-label={
            isPlaying
              ? t("recitation.pause", "Pause")
              : isIdle
                ? t("recitation.listen", "Listen")
                : t("recitation.resume", "Resume")
          }
          aria-pressed={isPlaying}
          onClick={handlePlayPause}
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

        <div className="fq-recitation-info min-w-0 flex-1">
          <p className="fq-recitation-reciter-name truncate text-sm font-medium text-foreground">
            {reciter?.translatedName ?? t("recitation.nowPlaying", "Recitation")}
          </p>
          <p className="fq-recitation-verse-key truncate text-xs text-muted-foreground">{currentVerseKey ?? ""}</p>
        </div>

        <button
          type="button"
          aria-label={t("recitation.settingsTitle", "Recitation settings")}
          onClick={() => openSettings()}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        >
          <SettingsIcon className="size-4" strokeWidth={1.8} />
        </button>

        {!isIdle ? (
          <button
            type="button"
            aria-label={t("recitation.stop", "Stop")}
            onClick={stop}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <Square className="size-4" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
};
