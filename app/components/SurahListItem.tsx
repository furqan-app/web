import Link from "next/link";
import { Surah } from "@types";
import useTranslations from "@hooks/use-translations";
import { getLanguageDirection } from "../utils/i18n";

type Props = {
  surah: Surah;
};

const getName = (language: string, surah: Surah) => {
  switch (language) {
    case "ar":
      return surah.name_arabic;
    case "en":
      return surah.name_simple;
    default:
      return surah.translated_name.text || surah.name_simple;
  }
};

export const SurahListItem = ({ surah }: Props) => {
  // const language = getLanguageFromPathname(pathname);
  const language = 'ar';
  const t = useTranslations();

  const surahStartingPage = surah.pages[0];
  return (
    <Link
      href={`/${language}/pages/${surahStartingPage}`}
      className="flex items-center p-4 border-b border-gray-200 dark:border-gray-800 
        hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
    >
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-full 
        border border-gray-300 dark:border-gray-700 
        bg-white dark:bg-gray-900 ${getLanguageDirection(language) === "rtl" ? "ml-4" : "mr-4"}`}
      >
        <span className="text-lg text-gray-900 dark:text-gray-100">
          {surah.id}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <div>
            <h2
              className={`text-lg font-semibold text-gray-900 dark:text-gray-100 
              ${getLanguageDirection(language) === "rtl" ? "font-surahnames text-2xl" : ""}`}
            >
              {getName(language, surah)}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {surah.revelation_place} • {surah.verses_count} {t('verses', 'Verses')}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

