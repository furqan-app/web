import { SurahResult } from "@types";
import { SurahListItem } from "@components/SurahListItem";

type Props = {
  surahs: SurahResult[];
};

export const SurahList = ({ surahs }: Props) => (
  <div className="bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
    {surahs.map((surah) => (
      <SurahListItem key={surah.id} surah={surah} />
    ))}
  </div>
);

