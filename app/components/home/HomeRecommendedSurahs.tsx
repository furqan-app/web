"use client";

import { useLocale, useTranslations } from "next-intl";
import { SurahResult } from "@types";
import { Link } from "@/i18n/routing";
import { useReaderBasePath } from "@/app/hooks/use-reader-base-path";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { getLanguageDirection } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";

type Props = {
  surahs: SurahResult[];
  className?: string;
};

// High-frequency, frequently recited chapters
const RECOMMENDED_SURAH_IDS = [1, 18, 36, 55, 56, 67];

export const HomeRecommendedSurahs = ({ surahs, className }: Props) => {
  const locale = useLocale();
  const t = useTranslations("home");
  const tGlobal = useTranslations();
  const basePath = useReaderBasePath();
  const { jumpTo } = useReaderNavigation();
  const isRTL = getLanguageDirection(locale) === "rtl";

  const recommendedList = RECOMMENDED_SURAH_IDS.map((id) =>
    surahs.find((s) => s.id === id),
  ).filter((s): s is SurahResult => Boolean(s));

  if (recommendedList.length === 0) return null;

  return (
    <section className={cn("mb-7 text-center", className)} aria-label={t("recommendedSurahs")}>
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="h-px w-8 sm:w-12 bg-border" aria-hidden="true" />
        <span className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
          {t("recommendedSurahs")}
        </span>
        <span className="h-px w-8 sm:w-12 bg-border" aria-hidden="true" />
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {recommendedList.map((surah) => {
          const startingPage = Number(surah.pages.split("-")[0]);
          const glyphCode = String(surah.id).padStart(3, "0");

          return (
            <Link
              key={surah.id}
              href={`${basePath}/${startingPage}`}
              locale={locale}
              // RTL pills show only the glyph — same accessible-name fix as
              // SurahListItem.
              aria-label={
                isRTL
                  ? `${tGlobal("surah")} ${surah.name_arabic}`
                  : `Surah ${surah.name_simple}`
              }
              onClick={(e) => {
                if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                jumpTo(startingPage);
              }}
              className="fq-focus-ring flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-[hsl(var(--well)/var(--well-alpha))] hover:border-primary/40 transition-colors duration-150 shrink-0 text-foreground"
            >
              {isRTL ? (
                <span className="font-surahnames text-xl leading-none text-foreground pt-0.5">
                  {glyphCode}
                </span>
              ) : (
                <span className="text-xs font-semibold text-foreground">
                  {surah.name_simple}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
};
