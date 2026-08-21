"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Pause, Play, Settings as SettingsIcon, Square } from "lucide-react";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import useTranslations from "@/app/hooks/use-translations";
import { ReciterCombobox } from "@/app/components/recitation/ReciterCombobox";
import { cn } from "@/lib/utils";

// Fixed bottom bar, mounted app-wide in app/[locale]/layout.tsx. On reader
// routes (self + grant) it's a permanent fixture — even idle, so its play
// button can start playback of the current Safha — mirroring the nav, which
// it must always follow. Off the reader route, recitation is stopped (hard
// stop, ADR 0021 Addendum 2026-08-02) so the bar never appears there. On tablet/mobile
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
    updateSettings,
    pageFirstVerseKey,
    play,
    togglePlayPause,
    stop,
    openSettings,
    playbackError,
  } = useRecitation();
  const { isOverlayMode, overlayVisible } = useNavOverlay();
  const pathname = usePathname();
  const t = useTranslations();

  const isOnReaderRoute = Boolean(pathname?.includes("/pages/"));
  // The lab renders its own rail, so this bar never appears there — but it is
  // still a reader route for the hard-stop below, or merely entering the lab
  // would kill playback the user started in the production reader.
  const isReaderLabRoute = Boolean(pathname?.includes("/reader-lab/"));
  const isAnyReaderRoute = isOnReaderRoute || isReaderLabRoute;
  const isIdle = status === "idle";

  // Hard-stop recitation when the user navigates away from any reader route.
  // Supersedes ADR 0021's background mini-player behavior (Trello #152).
  // Must sit before the early return — React rules forbid hooks after conditionals.
  useEffect(() => {
    if (!isAnyReaderRoute && !isIdle) stop();
  }, [isAnyReaderRoute, isIdle, stop]);

  if (isReaderLabRoute) return null;
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
        // Same opaque chrome treatment as Nav, from one rule — the two bars
        // read as one surface because they ARE one surface definition.
        // fq-chrome-bar-bottom moves the closing hairline to the edge that
        // faces the page. fq-recitation-bar stays as a marker class for the
        // rail transform below.
        "fq-recitation-bar fq-chrome-bar fq-chrome-bar-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/50",
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
          // The one live control on this bar. Keeps fq-icon-chip's --primary
          // fill: playback is state, which is precisely what that accent is
          // for — every other control here is dimmed and grouped around it.
          className="fq-icon-chip fq-focus-ring flex items-center justify-center w-9 h-9 rounded-full shrink-0 disabled:opacity-60"
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
          <ReciterCombobox
            reciters={reciters}
            value={settings.reciterId}
            onChange={(id) => updateSettings({ reciterId: id })}
            portalContainer={null}
            contentClassName="w-64 p-0"
            side="top"
            trigger={({ open }) => (
              <button
                type="button"
                aria-expanded={open}
                className="fq-recitation-reciter-name fq-focus-ring flex min-w-0 items-center gap-1 truncate rounded-md text-sm font-medium text-foreground"
              >
                <span className="truncate">
                  {reciter?.translatedName ?? t("recitation.nowPlaying", "Recitation")}
                </span>
                <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
              </button>
            )}
          />
          {isIdle && playbackError === "offline-unavailable" ? (
            <p className="truncate text-xs text-destructive">
              {t("recitation.offlineUnavailable", "Not available offline")}
            </p>
          ) : (
            <p className="fq-recitation-verse-key truncate text-xs text-muted-foreground">{currentVerseKey ?? ""}</p>
          )}
        </div>

        {isOnReaderRoute ? (
          <ReciterCombobox
            reciters={reciters}
            value={settings.reciterId}
            onChange={(id) => updateSettings({ reciterId: id })}
            portalContainer={null}
            contentClassName="w-64 p-0"
            side="left"
            trigger={({ open }) => (
              <button
                type="button"
                aria-expanded={open}
                aria-label={reciter?.translatedName ?? t("recitation.nowPlaying", "Recitation")}
                className="fq-recitation-rail-reciter fq-focus-ring hidden flex-col items-center gap-0.5 rounded-md text-foreground"
              >
                <span className="fq-recitation-rail-reciter-name w-full truncate text-center text-[10px] font-medium leading-tight">
                  {reciter?.translatedName ?? t("recitation.nowPlaying", "Recitation")}
                </span>
                <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
              </button>
            )}
          />
        ) : null}

        <button
          type="button"
          aria-label={t("recitation.settingsTitle", "Recitation settings")}
          onClick={() => openSettings()}
          className="fq-chrome-btn fq-focus-ring size-8"
        >
          <SettingsIcon className="size-4" strokeWidth={1.8} />
        </button>

        {!isIdle ? (
          <button
            type="button"
            aria-label={t("recitation.stop", "Stop")}
            onClick={stop}
            className="fq-chrome-btn fq-focus-ring size-8"
          >
            <Square className="size-4" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
};
