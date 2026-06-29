"use client";

import { SurahResult } from "@types";
import useTranslations from "@hooks/use-translations";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { FQListItem } from "./ui/FQListItem";
import { FQBadge } from "./ui/FQBadge";

type Props = {
  surah: SurahResult;
  variant?: "grid" | "list";
};

export const SurahListItem = ({ surah, variant = "list" }: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";

  const getSurahName = () => {
    switch (locale) {
      case "ar": return surah.name_arabic;
      default: return surah.name_simple;
    }
  };

  const surahStartingPage = surah.pages.split("-")[0];
  const meta = `${surah.revelation_place} • ${surah.verses_count} ${t("verses", "Verses")}`;

  if (variant === "grid") {
    return (
      <Link
        locale={locale}
        href={`/pages/${surahStartingPage}`}
        dir={isRTL ? "rtl" : "ltr"}
        className="flex items-center gap-3.5 p-[18px] bg-card border border-border rounded-2xl shadow-sm cursor-pointer hover:bg-card-2 hover:-translate-y-0.5 transition-[background,transform,box-shadow] duration-200"
      >
        <FQBadge className="shrink-0 w-11 h-11 text-sm font-bold">
          {surah.id}
        </FQBadge>
        <div className="flex-1 min-w-0">
          <div
            className={`font-extrabold text-foreground leading-tight truncate ${isRTL ? "text-xl font-surahnames" : "text-base"}`}
          >
            {getSurahName()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{meta}</div>
        </div>
      </Link>
    );
  }

  return (
    <FQListItem
      href={`/pages/${surahStartingPage}`}
      locale={locale}
      leading={
        <FQBadge>
          <span className="text-lg">{surah.id}</span>
        </FQBadge>
      }
      title={
        <h2
          className={`text-lg font-semibold text-foreground ${isRTL ? "font-surahnames text-2xl" : ""}`}
        >
          {getSurahName()}
        </h2>
      }
      subtitle={meta}
    />
  );
};
