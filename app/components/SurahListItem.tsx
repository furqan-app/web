"use client";

import { ChevronRight } from "lucide-react";
import { SurahResult } from "@types";
import useTranslations from "@hooks/use-translations";
import { useLocale } from "next-intl";
import { toLocaleNumeral, getLanguageDirection } from "@utils/i18n";
import { Link } from "@/i18n/routing";
import { useReaderBasePath } from "@hooks/use-reader-base-path";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { cn } from "@/lib/utils";

type Props = {
  surah: SurahResult;
  isActive?: boolean;
};

export const SurahListItem = ({ surah, isActive }: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  const basePath = useReaderBasePath();
  const { setOpen, setPinnedSurahId, notifyNavigating } = useSidebar();
  const { jumpTo } = useReaderNavigation();

  const isRTL = getLanguageDirection(locale) === "rtl";
  const surahStartingPage = Number(surah.pages.split("-")[0]);
  const glyphCode = String(surah.id).padStart(3, "0");

  return (
    <Link
      locale={locale}
      href={`${basePath}/${surahStartingPage}`}
      onClick={(e) => {
        // Must fire before setOpen(false), synchronously: tells
        // useCloseOnBackGesture's cleanup (armed by the sidebar being open on
        // standalone mobile/tablet) that a competing navigation is already
        // underway, so it skips its timing-based history.state check instead
        // of racing jumpTo's own replaceState for the guard's history entry —
        // same fix as #313 (NavOverflowMenu's <Link> rows), applied here too.
        // See docs/plans/close-overlays-on-back-swipe.md, Addendum.
        notifyNavigating?.();
        setOpen(false);
        // A reader is already mounted (this list is open from within it, e.g.
        // the nav sidebar) — move it client-side instead of navigating, same
        // as swipe/arrows. Works offline for any precached page. Plain
        // left-click only; modified/middle clicks fall through to the href.
        if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        // Tell Sidebar exactly which surah this was — page number alone can't
        // disambiguate a page that hosts more than one surah (see Sidebar.tsx).
        setPinnedSurahId(surah.id);
        jumpTo(surahStartingPage);
      }}
      data-surah-id={surah.id}
      // A lattice cell, not a card: no shadow, no radius, no lift on hover.
      // The two hardcoded rgba casts it carried drew a real shadow on light
      // and gold and nothing at all on dark (ADR 0032), and 114 of them made
      // the page read as 114 objects rather than one inventory. Motion never
      // signals hierarchy, so the hover translate goes too.
      className={cn(
        "flex items-center gap-3 p-4 transition-colors duration-150",
        isActive
          ? "bg-primary/10"
          : "hover:bg-[hsl(var(--well)/var(--well-alpha))]",
      )}
    >
      {/* Neutral, not --accent. 114 accented chips is an accent that signals
          nothing; the selected surah is the only entry allowed a state
          colour, and it gets it from the row fill above. */}
      <div className="flex-none w-10 h-10 rounded-full border border-border bg-[hsl(var(--well)/var(--well-alpha))] grid place-items-center text-[hsl(var(--control-live))] font-bold text-sm">
        {toLocaleNumeral(surah.id, locale)}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {isRTL ? (
          <div className="font-surahnames text-2xl text-foreground leading-none">
            {glyphCode}
          </div>
        ) : (
          <div className="font-bold text-sm text-foreground leading-tight">
            {surah.name_simple}
          </div>
        )}
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {toLocaleNumeral(surah.verses_count, locale)}{" "}
          {surah.verses_count > 10
            ? t("count_verses", "Verses")
            : t("verses", "Verses")}
        </div>
      </div>

      <ChevronRight
        className={cn("flex-none size-4 text-muted-foreground", isRTL && "rotate-180")}
      />
    </Link>
  );
};
