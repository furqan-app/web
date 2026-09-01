"use client";

import { type MouseEvent, useEffect } from "react";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { Link } from "@/i18n/routing";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { recitedVerseLabelParts } from "@/app/utils/recitation";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import useTranslations from "@/app/hooks/use-translations";

// A second row of the nav (rendered as the last child of `<nav>`), shown while a
// recitation session is live but the reader is no longer tracking it — the user
// paged/jumped away, left the reader route, or started the session off-reader
// (ADR 0050). Offers play/pause, "back to page N", and stop.
//
// Being a flow child of the nav is what makes it correct on every surface:
//   • mobile/tablet reader — the nav is a `fixed` overlay that hides with
//     `translateY(-100%)`; a taller nav still hides completely, so the strip
//     toggles with the chrome exactly like the rest of the nav.
//   • desktop reader + every non-reader route — the nav is `relative` in flow,
//     so the strip pushes content down instead of covering it.
// While shown it sets `--fq-nav-extra` on <html> so the desktop reader's
// `min-height` calc can give back the strip's band and stay scroll-free.
export function RecitationReturnStrip() {
  const { status, currentVerseKey, recitedPage, isFollowing, chapters, stop, togglePlayPause } =
    useRecitation();
  const { jumpTo } = useReaderNavigation();
  const locale = useLocale();
  const t = useTranslations();
  const tRich = useNextIntlTranslations("recitation");

  const visible = status !== "idle" && !isFollowing && recitedPage != null;

  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.classList.add("fq-recitation-strip-open");
    return () => root.classList.remove("fq-recitation-strip-open");
  }, [visible]);

  if (!visible || recitedPage == null) return null;

  const isPlaying = status === "playing";
  const isPaused = status === "paused";

  const labelParts = recitedVerseLabelParts(currentVerseKey, recitedPage, chapters, locale);

  const handleReturn = (e: MouseEvent) => {
    // Reader mounted → move its pager client-side (works for the grant reader
    // too). Off-reader `jumpTo` is null → let the <Link> navigate.
    if (jumpTo && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      e.preventDefault();
      jumpTo(recitedPage);
    }
  };

  const returnLabel = labelParts
    ? tRich("returnToRecitedVerse", labelParts)
    : tRich("returnToRecitedPage", { page: toLocaleNumeral(recitedPage, locale) });

  return (
    <div className="fq-recitation-return-strip flex h-11 items-center gap-2 border-t border-border/60">
      <Link
        href={`/pages/${recitedPage}`}
        locale={locale}
        onClick={handleReturn}
        className="fq-focus-ring inline-flex min-w-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium leading-tight text-primary transition-colors hover:bg-primary/15"
      >
        <RotateCcw className="size-3 shrink-0" strokeWidth={1.8} />
        <span className="truncate">{returnLabel}</span>
      </Link>

      <div className="flex-1" />

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
  );
}
