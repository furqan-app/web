"use client";

import { SurahResult } from "@types";
import useTranslations from "@hooks/use-translations";
import { useLocale } from "next-intl";
import { toLocaleNumeral } from "@utils/i18n";
import { Link } from "@/i18n/routing";
import { useReaderBasePath } from "@hooks/use-reader-base-path";

type Props = {
  surah: SurahResult;
};

export const SurahListItem = ({ surah }: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  const basePath = useReaderBasePath();

  const surahStartingPage = surah.pages.split("-")[0];
  const glyphCode = String(surah.id).padStart(3, "0");

  return (
    <Link
      locale={locale}
      href={`${basePath}/${surahStartingPage}`}
      className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
    >
      <div className="flex-none w-10 h-10 rounded-full bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground font-bold text-sm">
        {toLocaleNumeral(surah.id, locale)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-foreground leading-tight">
          {surah.name_simple}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {surah.translated_name}
        </div>
      </div>

      <div className="flex-none flex flex-col items-end gap-0.5">
        <div className="font-surahnames text-2xl text-foreground leading-none">
          {glyphCode}
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {toLocaleNumeral(surah.verses_count, locale)}{" "}
          {surah.verses_count > 10
            ? t("count_verses", "Verses")
            : t("verses", "Verses")}
        </div>
      </div>
    </Link>
  );
};

