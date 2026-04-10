import { SurahResult } from "@types";
import { SurahListItem } from "@components/SurahListItem";

type Props = {
  surahs: SurahResult[];
};

export const SurahList = ({ surahs }: Props) => (
  <div className="bg-white dark:bg-black shadow-md rounded-lg border border-gray-200 dark:border-none">
    {surahs.map((surah) => (
      <SurahListItem key={surah.id} surah={surah} />
    ))}
  </div>
);

