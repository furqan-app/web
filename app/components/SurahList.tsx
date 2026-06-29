import { SurahResult } from "@types";
import { SurahListItem } from "@components/SurahListItem";

type Props = {
  surahs: SurahResult[];
  variant?: "grid" | "list";
};

export const SurahList = ({ surahs, variant = "list" }: Props) => {
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {surahs.map((surah) => (
          <SurahListItem key={surah.id} surah={surah} variant="grid" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      {surahs.map((surah) => (
        <SurahListItem key={surah.id} surah={surah} />
      ))}
    </div>
  );
};
