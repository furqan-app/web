"use client";

import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { Link } from "@/i18n/routing";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useIsReaderRoute } from "@/app/hooks/use-is-reader-route";
import useTranslations from "@/app/hooks/use-translations";

// Off-reader recitation surface (ADR 0050). A live session that isn't being
// tracked by the reader — the user left the reader route, or started the session
// off-reader (a listening wird) — surfaces here as a small centered pill:
// play/pause, "back to page N", stop. ON the reader the same affordance lives
// inside RecitationPlayerBar instead, whose band the reader layout already
// reserves — so nothing ever floats over the mushaf.
//
// While shown it also renders a flow-level spacer (a sibling of the page in the
// app shell) so the document reserves its height — the pill floats over that
// gap, never over the last rows of a page.
export function RecitationReturnPanel() {
  const { status, currentVerseKey, recitedPage, isFollowing, stop, togglePlayPause } =
    useRecitation();
  const isOnReaderRoute = useIsReaderRoute();
  const locale = useLocale();
  const t = useTranslations();
  const tRich = useNextIntlTranslations("recitation");

  if (isOnReaderRoute || status === "idle" || isFollowing || recitedPage == null) {
    return null;
  }

  const isPlaying = status === "playing";
  const isPaused = status === "paused";

  return (
    <>
      {/* Flow-level spacer: a sibling of the page inside the app shell, so the
          scroll area grows by the pill's footprint and page content never ends
          up behind it. */}
      <div aria-hidden className="h-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] shrink-0" />
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] z-40 flex justify-center px-3 pointer-events-none">
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
    </>
  );
}
