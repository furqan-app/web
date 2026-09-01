"use client";

import type { MouseEvent } from "react";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { Link } from "@/i18n/routing";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { useIsReaderRoute } from "@/app/hooks/use-is-reader-route";
import useTranslations from "@/app/hooks/use-translations";
import { cn } from "@/lib/utils";

// Small centered floating pill, mounted app-wide right after RecitationPlayerBar
// (ADR 0050). Shown whenever a recitation session is live but the reader is no
// longer tracking the recited page — the user swiped/jumped away, left the
// reader route, or started a session off-reader (a listening wird). Offers
// play/pause, a way back to the recited page, and stop.
//
// A pill, never a full-width bar, so it carries none of the content-overlap risk
// that forced the old hard stop (Trello #152). On the reader it floats above
// RecitationPlayerBar; off-reader (where the bar is hidden) it drops near the
// bottom edge.
export function RecitationReturnPanel() {
  const { status, currentVerseKey, recitedPage, isFollowing, stop, togglePlayPause } =
    useRecitation();
  const { jumpTo } = useReaderNavigation();
  const isOnReaderRoute = useIsReaderRoute();
  const locale = useLocale();
  const t = useTranslations();
  const tRich = useNextIntlTranslations("recitation");

  if (status === "idle" || isFollowing || recitedPage == null) return null;

  const isPlaying = status === "playing";
  const isPaused = status === "paused";

  const handleReturn = (e: MouseEvent) => {
    // Reader mounted → move its pager client-side (the same handoff
    // ContinueReadingLink / SurahListItem use; works for the grant reader too,
    // since its own pager registered jumpTo). The RecitationFollow leaf then
    // re-attaches once the recited page is visible. Reader unmounted → let the
    // <Link> do a real navigation to the self reader.
    if (jumpTo && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      e.preventDefault();
      jumpTo(recitedPage);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 flex justify-center px-3 pointer-events-none",
        // Above the ~76px player bar on the reader; near the bottom edge
        // elsewhere (the bar is hidden off-reader).
        isOnReaderRoute
          ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]"
          : "bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]",
      )}
    >
      <div className="fq-recitation-return-pill pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-full border border-border/60 py-1.5 pe-1.5 ps-1.5 text-xs">
        {(isPlaying || isPaused) && (
          <button
            type="button"
            onClick={togglePlayPause}
            aria-label={
              isPlaying ? t("recitation.pause", "Pause") : t("recitation.resume", "Resume")
            }
            title={
              isPlaying ? t("recitation.pause", "Pause") : t("recitation.resume", "Resume")
            }
            className="fq-chrome-btn fq-focus-ring size-7 shrink-0"
          >
            {isPlaying ? (
              <Pause className="size-3.5" strokeWidth={1.8} />
            ) : (
              <Play className="size-3.5 translate-x-px" strokeWidth={1.8} />
            )}
          </button>
        )}
        <span className="truncate px-1 text-muted-foreground">
          {currentVerseKey ?? t("recitation.nowPlaying", "Recitation")}
        </span>
        <Link
          href={`/pages/${recitedPage}`}
          locale={locale}
          onClick={handleReturn}
          className="fq-focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.8} />
          <span>
            {tRich("returnToRecitedPage", { page: toLocaleNumeral(recitedPage, locale) })}
          </span>
        </Link>
        <button
          type="button"
          onClick={stop}
          aria-label={t("recitation.stop", "Stop")}
          title={t("recitation.stop", "Stop")}
          className="fq-chrome-btn fq-focus-ring size-7 shrink-0"
        >
          <Square className="size-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
