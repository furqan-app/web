import { SurahResult } from "@types";
import { SurahListItem } from "@components/SurahListItem";

type Props = {
  surahs: SurahResult[];
};

export const SurahList = ({ surahs }: Props) => (
  <div className="bg-card shadow-md rounded-lg border border-border">
    {surahs.map((surah) => (
      <SurahListItem key={surah.id} surah={surah} />
    ))}
  </div>
);

