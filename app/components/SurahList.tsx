import { Surah } from "@types";
import { SurahListItem } from "@components/SurahListItem";
// import { useLanguage } from '@contexts/LanguageContext';

type Props = {
  surahs: Surah[];
};

export const SurahList = ({ surahs }: Props) => (
  <div className="bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
    {surahs.map((surah) => (
      <SurahListItem key={surah.id} surah={surah} />
    ))}
  </div>
);

