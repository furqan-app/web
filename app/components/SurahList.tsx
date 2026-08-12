import { SurahResult } from "@types";
import { SurahListItem } from "@components/SurahListItem";
import { cn } from "@/lib/utils";

type Props = {
  surahs: SurahResult[];
  className?: string;
  activeSurahId?: number;
};

export const SurahList = ({ surahs, className, activeSurahId }: Props) => (
  <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3", className)}>
    {surahs.map((surah) => (
      <SurahListItem key={surah.id} surah={surah} isActive={surah.id === activeSurahId} />
    ))}
  </div>
);
