"use client";

import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { recitedVerseLabelParts } from "@/app/utils/recitation";
import { REPEAT_COUNT_MAX } from "@/app/constants/recitation";
import { RepeatCount } from "@/app/types/recitation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleUserRound,
  Pause,
  Play,
  Repeat,
  Settings as SettingsIcon,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useIsReaderRoute } from "@/app/hooks/use-is-reader-route";
import useTranslations from "@/app/hooks/use-translations";
import { ReciterCombobox } from "@/app/components/recitation/ReciterCombobox";
import { cn } from "@/lib/utils";

// Fixed bottom bar, mounted app-wide in app/[locale]/layout.tsx. On reader
// routes (self + grant) it's a permanent fixture — even idle, so its play
// button can start playback of the current Safha — mirroring the nav, which
// it must always follow. Off the reader route it renders nothing: playback
// keeps running (ADR 0050 — no more hard stop), and the way back to a detached
// session lives in RecitationReturnStrip (a second nav row), not here.
// On tablet/mobile reader routes it also mirrors the nav overlay's show/hide
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
    recitedPage,
    chapters,
    reciters,
    settings,
    updateSettings,
    pageFirstVerseKey,
    play,
    togglePlayPause,
    stop,
    skipToNextVerse,
    skipToPreviousVerse,
    canSkipNext,
    canSkipPrevious,
    skipToNextWord,
    skipToPreviousWord,
    canSkipNextWord,
    canSkipPreviousWord,
    resetPerAyahRepeat,
    openSettings,
    playbackError,
  } = useRecitation();
  const { isOverlayMode, overlayVisible } = useNavOverlay();
  const isOnReaderRoute = useIsReaderRoute();
  const locale = useLocale();
  const t = useTranslations();
  const tRich = useNextIntlTranslations("recitation");

  const isIdle = status === "idle";

  // Reader-only chrome. Playback is app-wide now (ADR 0050) and never stops on
  // navigation — the "return to recited page" affordance for a detached session
  // lives in RecitationReturnStrip (a second nav row), not here.
  if (!isOnReaderRoute) return null;
  if (isIdle && !pageFirstVerseKey) return null;

  const reciter = reciters.find((r) => r.id === settings.reciterId);
  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  const verseLabelParts = recitedVerseLabelParts(currentVerseKey, recitedPage, chapters, locale);

  const handlePlayPause = () => {
    if (isIdle) {
      if (pageFirstVerseKey) play(pageFirstVerseKey);
      return;
    }
    togglePlayPause();
  };

  // Per-ayah repeat cycle (#391): 1 → 2 → … → REPEAT_COUNT_MAX → ∞ → 1,
  // derived from the same shared ceiling the sheet's steppers use so bar and
  // sheet always agree on one model. Persisted immediately
  // via updateSettings (the engine reads the count live at each verse
  // boundary); mid-session the reset makes the in-flight pass count as
  // repetition 1 of the new cycle without seeking. The "1" rest state shows
  // no badge — only >1 is a state worth signalling. The {n} key goes through
  // next-intl's own useTranslations (not the project's value-less wrapper) —
  // ICU placeholders silently render the raw key path through the wrapper,
  // see docs/standards/i18n.md.
  const PER_AYAH_CYCLE: RepeatCount[] = [
    ...Array.from({ length: REPEAT_COUNT_MAX }, (_, i) => i + 1),
    "infinite",
  ];
  const repeatValue = settings.perAyahRepeatCount;
  const repeatActive = repeatValue !== 1;
  const repeatLabel =
    repeatValue === "infinite"
      ? t("recitation.repeatCycleInfinite", "Repeat current ayah endlessly")
      : repeatValue === 1
        ? t("recitation.repeatCycleOff", "No ayah repetition")
        : tRich("repeatCycleTimes", { n: toLocaleNumeral(repeatValue, locale) });
  const handleRepeatCycle = () => {
    const idx = PER_AYAH_CYCLE.indexOf(repeatValue);
    const next = PER_AYAH_CYCLE[(idx + 1) % PER_AYAH_CYCLE.length];
    updateSettings({ perAyahRepeatCount: next });
    resetPerAyahRepeat();
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
        // bar into a vertical rail fixed to the screen-right. The bar only ever
        // renders on the reader route now (early return above).
        "fq-recitation-bar-rail",
        isOverlayMode && "transition-transform duration-300",
        isOverlayMode && !overlayVisible && "translate-y-full",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        transitionTimingFunction: isOverlayMode ? "cubic-bezier(0.23, 1, 0.32, 1)" : undefined,
      }}
    >
      {/* Three zones: lead reciter identity, transport, and utilities.
          In bar form, fq-rail-lead is display: contents while transport and utils
          form real flex containers in the 3-section layout; in rail form
          globals.css turns them into absolutely-positioned vertical zones
          pinned to the rail's top, true midpoint and foot. */}
      {/* Two rows in horizontal bar mode; three vertical zones in rail mode.
          In bar form, Row 1 contains lead identity, info, and utilities,
          while Row 2 houses the centered 5-button transport cluster.
          In rail form, fq-recitation-row-lead has display: contents, so
          fq-rail-lead, fq-rail-transport, and fq-rail-utils position absolutely
          at top, center, and bottom of the rail column. */}
      <div className="mx-auto flex max-w-3xl flex-col px-3 py-1.5 md:px-4 md:py-2">
        {/* Row 1: Context (Identity & Verse) + Utilities */}
        <div className="fq-recitation-row-lead flex items-center justify-between border-b border-border/30 pb-1">
          {/* Identity for rail (hidden on horizontal bar) */}
          <div className="fq-rail-zone fq-rail-lead">
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
                  title={reciter?.translatedName ?? t("recitation.nowPlaying", "Recitation")}
                  className="fq-recitation-rail-reciter fq-recitation-lead-btn fq-focus-ring relative hidden items-center justify-center rounded-full"
                >
                  <CircleUserRound className="size-[18px]" strokeWidth={1.6} />
                </button>
              )}
            />
          </div>

          {/* Section 1: Info & Metadata (Start flank) */}
          <div className="fq-recitation-info flex min-w-0 flex-1 items-center gap-1.5">
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
                  className="fq-recitation-reciter-name fq-focus-ring flex min-w-0 items-center gap-1 truncate rounded-md text-xs font-normal text-foreground md:text-sm md:font-medium"
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
            ) : isIdle && playbackError === "playback-failed" ? (
              <p className="truncate text-xs text-destructive">
                {t("recitation.playbackFailed", "Playback failed")}
              </p>
            ) : (
              <>
                <span className="text-[10px] text-muted-foreground/60 select-none">·</span>
                <p className="fq-recitation-verse-key truncate text-[10px] leading-tight text-muted-foreground">
                  {verseLabelParts
                    ? tRich("recitedVerseLabel", verseLabelParts)
                    : (currentVerseKey ?? "")}
                </p>
              </>
            )}
          </div>

          {/* Section 2: Utilities (End flank) */}
          <div className="fq-rail-zone fq-rail-utils flex shrink-0 items-center gap-1 ps-2">
            <button
              type="button"
              aria-label={repeatLabel}
              title={repeatLabel}
              onClick={handleRepeatCycle}
              className="fq-chrome-btn fq-focus-ring relative size-7 md:size-8"
            >
              <Repeat className="size-3.5 md:size-4" strokeWidth={1.8} />
              {repeatActive ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -end-0.5 grid h-3 min-w-3 place-items-center rounded-full bg-primary px-0.5 text-[7px] font-semibold leading-none text-primary-foreground tabular-nums md:h-3.5 md:min-w-3.5 md:text-[8px]"
                >
                  {repeatValue === "infinite" ? "∞" : repeatValue}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label={t("recitation.settingsTitle", "Recitation settings")}
              title={t("recitation.settingsTitle", "Recitation settings")}
              onClick={() => openSettings()}
              className="fq-chrome-btn fq-focus-ring size-7 md:size-8"
            >
              <SettingsIcon className="size-3.5 md:size-4" strokeWidth={1.8} />
            </button>

            {!isIdle ? (
              <button
                type="button"
                aria-label={t("recitation.stop", "Stop")}
                title={t("recitation.stop", "Stop")}
                onClick={stop}
                className="fq-chrome-btn fq-focus-ring size-7 md:size-8"
              >
                <Square className="size-3.5 md:size-4" strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Row 2: 5-Button Centered Transport Cluster */}
        <div className="fq-rail-zone fq-rail-transport flex shrink-0 items-center justify-center gap-2 py-1 md:gap-3">
          <button
            type="button"
            aria-label={t("recitation.previousAyah", "Previous ayah")}
            title={t("recitation.previousAyah", "Previous ayah")}
            onClick={skipToPreviousVerse}
            disabled={!canSkipPrevious}
            className="fq-chrome-btn fq-focus-ring size-7 rtl:rotate-180 disabled:pointer-events-none disabled:opacity-30 md:size-8"
          >
            <SkipBack className="size-3.5 md:size-4" strokeWidth={1.8} />
          </button>

          <button
            type="button"
            aria-label={t("recitation.previousWord", "Previous word")}
            title={t("recitation.previousWord", "Previous word")}
            onClick={skipToPreviousWord}
            disabled={!canSkipPreviousWord}
            className="fq-chrome-btn fq-focus-ring size-7 rtl:rotate-180 disabled:pointer-events-none disabled:opacity-30 md:size-8"
          >
            <ChevronLeft className="size-3.5 md:size-4" strokeWidth={2} />
          </button>

          <button
            type="button"
            data-state={
              playbackError
                ? "error"
                : isLoading
                  ? "loading"
                  : isPlaying
                    ? "playing"
                    : "idle"
            }
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
            className="fq-recitation-play fq-focus-ring relative flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-60 md:size-10"
          >
            <span className="fq-recitation-play-ring" aria-hidden="true" />
            {isPlaying ? (
              <Pause className="size-3.5 fill-current md:size-[18px]" strokeWidth={1} />
            ) : (
              <Play className="size-3.5 translate-x-px fill-current md:size-[18px]" strokeWidth={1} />
            )}
          </button>

          <button
            type="button"
            aria-label={t("recitation.nextWord", "Next word")}
            title={t("recitation.nextWord", "Next word")}
            onClick={skipToNextWord}
            disabled={!canSkipNextWord}
            className="fq-chrome-btn fq-focus-ring size-7 rtl:rotate-180 disabled:pointer-events-none disabled:opacity-30 md:size-8"
          >
            <ChevronRight className="size-3.5 md:size-4" strokeWidth={2} />
          </button>

          <button
            type="button"
            aria-label={t("recitation.nextAyah", "Next ayah")}
            title={t("recitation.nextAyah", "Next ayah")}
            onClick={skipToNextVerse}
            disabled={!canSkipNext}
            className="fq-chrome-btn fq-focus-ring size-7 rtl:rotate-180 disabled:pointer-events-none disabled:opacity-30 md:size-8"
          >
            <SkipForward className="size-3.5 md:size-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
};
