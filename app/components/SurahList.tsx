import { SurahResult } from "@types";
import { SurahListItem } from "@components/SurahListItem";
import { cn } from "@/lib/utils";

type Props = {
  surahs: SurahResult[];
  className?: string;
  activeSurahId?: number;
};

// One surface with hairlines between entries, not 114 floating cards. The grid
// itself survives — a single hairline column of 114 rows scans worse than a
// six-column lattice at desktop width — and collapses to exactly that hairline
// list at one column.
export const SurahList = ({ surahs, className, activeSurahId }: Props) => (
  <div
    className={cn(
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 md:gap-4",
      className,
    )}
  >
    {surahs.map((surah) => (
      <SurahListItem
        key={surah.id}
        surah={surah}
        isActive={surah.id === activeSurahId}
      />
    ))}
  </div>
);
