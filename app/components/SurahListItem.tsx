import { SurahResult } from "@types";
import useTranslations from "@hooks/use-translations";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

type Props = {
  surah: SurahResult;
};

export const SurahListItem = ({ surah }: Props) => {
  const locale = useLocale();
  const t = useTranslations();

  const getSurahName = (locale: string) => {
    switch (locale) {
      case "ar":
        return surah.name_arabic;
      case "en":
        return surah.name_simple;
      default:
        return surah.name_simple;
    }
  };

  const surahStartingPage = surah.pages.split("-")[0];
  return (
    <Link
      locale={locale}
      href={`/pages/${surahStartingPage}`}
      className="flex gap-4 items-center p-4 border-b border-border last:border-none
        hover:bg-accent transition-colors"
    >
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-full
        border border-border
        bg-card`}
      >
        <span className="text-lg text-foreground">
          {surah.id}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <div>
            <h2
              className={`text-lg font-semibold text-foreground
              ${getLanguageDirection(locale) === "rtl" ? "font-surahnames text-2xl" : ""}`}
            >
              {getSurahName(locale)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {surah.revelation_place} • {surah.verses_count}{" "}
              {t("verses", "Verses")}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

