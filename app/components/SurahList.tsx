import { SurahResult } from "@types";
import { SurahListItem } from "@components/SurahListItem";
import { cn } from "@/lib/utils";

type Props = {
  surahs: SurahResult[];
  className?: string;
};

export const SurahList = ({ surahs, className }: Props) => (
  <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
    {surahs.map((surah) => (
      <SurahListItem key={surah.id} surah={surah} />
    ))}
  </div>
);
