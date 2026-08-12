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
  const { setOpen } = useSidebar();
  const { jumpTo } = useReaderNavigation();

  const isRTL = getLanguageDirection(locale) === "rtl";
  const surahStartingPage = Number(surah.pages.split("-")[0]);
  const glyphCode = String(surah.id).padStart(3, "0");

  return (
    <Link
      locale={locale}
      href={`${basePath}/${surahStartingPage}`}
      onClick={(e) => {
        setOpen(false);
        // A reader is already mounted (this list is open from within it, e.g.
        // the nav sidebar) — move it client-side instead of navigating, same
        // as swipe/arrows. Works offline for any precached page. Plain
        // left-click only; modified/middle clicks fall through to the href.
        if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        jumpTo(surahStartingPage);
      }}
      data-surah-id={surah.id}
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200",
        isActive
          ? "bg-primary/10 border border-primary/30"
          : "bg-card border border-border",
      )}
    >
      <div className="flex-none w-10 h-10 rounded-full bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground font-bold text-sm">
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
