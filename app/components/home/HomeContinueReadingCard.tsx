"use client";

import { Bookmark, ArrowRight, ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SurahResult } from "@types";
import { Link } from "@/i18n/routing";
import { useLastReadPage } from "@/app/contexts/LastReadPageContext";
import { useReaderBasePath } from "@/app/hooks/use-reader-base-path";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";

type Props = {
  surahs: SurahResult[];
  className?: string;
};

export const HomeContinueReadingCard = ({ surahs, className }: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  const basePath = useReaderBasePath();
  const { lastReadPage } = useLastReadPage();
  const { jumpTo } = useReaderNavigation();
  const isRTL = getLanguageDirection(locale) === "rtl";

  // Find the surah containing lastReadPage
  const currentSurah =
    surahs.find((s) => {
      const [start, end] = s.pages.split("-").map(Number);
      return lastReadPage >= start && lastReadPage <= end;
    }) ?? surahs[0];

  const glyphCode = currentSurah ? String(currentSurah.id).padStart(3, "0") : "001";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div
      className={cn(
        "mb-6 p-4 sm:p-4.5 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card transition-colors duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-sm dark:shadow-none relative overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="size-10 rounded-xl bg-primary/15 text-primary border border-primary/30 grid place-items-center shrink-0">
          <Bookmark className="size-5" strokeWidth={2} />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-primary uppercase">
            {t("home.continueReading")}
          </span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {isRTL ? (
              <span className="font-surahnames text-2xl leading-none text-foreground pt-0.5">
                {glyphCode}
              </span>
            ) : (
              <span className="text-base font-bold text-foreground">
                {currentSurah?.name_simple}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              • {t("page")} {toLocaleNumeral(lastReadPage, locale)}
            </span>
          </div>
        </div>
      </div>

      <Link
        href={`${basePath}/${lastReadPage}`}
        locale={locale}
        onClick={(e) => {
          if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          jumpTo(lastReadPage);
        }}
        className="fq-focus-ring w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-sm dark:shadow-none shrink-0"
      >
        <span>{t("home.resumeReading")}</span>
        <ArrowIcon className="size-4" strokeWidth={2} />
      </Link>
    </div>
  );
};
