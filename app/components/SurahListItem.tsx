"use client";

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

  const revelationLabel =
    surah.revelation_place === "makkah"
      ? t("revelation.makkah", "Meccan")
      : t("revelation.madinah", "Medinan");

  return (
    <Link
      locale={locale}
      href={`${basePath}/${surahStartingPage}`}
      onClick={(e) => {
        notifyNavigating?.();
        setOpen(false);
        if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        setPinnedSurahId(surah.id);
        jumpTo(surahStartingPage);
      }}
      data-surah-id={surah.id}
      className={cn(
        "group flex flex-col rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all duration-150 relative overflow-hidden shadow-sm dark:shadow-none",
        isActive && "border-primary/50 bg-primary/5",
      )}
    >
      {/* Upper Stage: Star Medallion + Calligraphic Name + Revelation Tag */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-1 min-w-0">
        {/* Authentic 8-pointed Islamic geometric star rosette medallion */}
        <div className="relative size-10 flex-none grid place-items-center">
          <svg
            viewBox="0 0 36 36"
            className="absolute inset-0 size-full text-primary/70 group-hover:text-primary transition-colors duration-150"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="5.5"
              y="5.5"
              width="25"
              height="25"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.25"
              className="fill-[hsl(var(--well)/var(--well-alpha))]"
            />
            <rect
              x="5.5"
              y="5.5"
              width="25"
              height="25"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.25"
              transform="rotate(45 18 18)"
              className="fill-[hsl(var(--well)/var(--well-alpha))]"
            />
          </svg>
          <span className="relative z-10 text-xs font-bold text-foreground">
            {toLocaleNumeral(surah.id, locale)}
          </span>
        </div>

        {/* Surah Name */}
        <div className="flex-1 min-w-0">
          {isRTL ? (
            <div className="font-surahnames text-[26px] sm:text-[28px] text-foreground leading-none pt-0.5">
              {glyphCode}
            </div>
          ) : (
            <div className="font-bold text-sm text-foreground leading-tight">
              {surah.name_simple}
            </div>
          )}
        </div>

        {/* Revelation Tag */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-border/60 bg-[hsl(var(--well)/var(--well-alpha))] text-muted-foreground leading-none shrink-0">
          {revelationLabel}
        </span>
      </div>

      {/* Recessed Footer Well: Verse Count & Starting Page Landmark */}
      <div className="px-3.5 py-1.5 border-t border-border/50 bg-[hsl(var(--well)/var(--well-alpha))] flex items-center justify-between text-[11px] text-muted-foreground/80">
        <span>
          {toLocaleNumeral(surah.verses_count, locale)}{" "}
          {surah.verses_count > 10
            ? t("count_verses", "Verses")
            : t("verses", "Verses")}
        </span>
        <span>
          {t("page", "Page")} {toLocaleNumeral(surahStartingPage, locale)}
        </span>
      </div>
    </Link>
  );
};
