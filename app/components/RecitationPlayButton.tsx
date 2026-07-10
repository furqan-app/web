"use client";

import { Play, Pause } from "lucide-react";
import { useRecitation } from "@/app/contexts/RecitationContext";
import useTranslations from "@/app/hooks/use-translations";

type Props = {
  // verse_key of the current page's first word — the header quick-play
  // button always starts here when idle. Null when the page has no words
  // (shouldn't happen in practice, but keeps this defensive).
  firstVerseKey: string | null;
};

export const RecitationPlayButton = ({ firstVerseKey }: Props) => {
  const { status, currentVerseKey, play, togglePlayPause } = useRecitation();
  const t = useTranslations();

  if (!firstVerseKey) return null;

  const isActiveSession = status !== "idle" && currentVerseKey != null;
  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  const handleClick = () => {
    if (isActiveSession) {
      togglePlayPause();
    } else {
      play(firstVerseKey);
    }
  };

  return (
    <button
      type="button"
      aria-label={isPlaying ? t("recitation.pause", "Pause") : t("recitation.listen", "Listen")}
      aria-pressed={isPlaying}
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
    >
      {isLoading ? (
        <span className="size-[18px] animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : isPlaying ? (
        <Pause className="w-[18px] h-[18px]" strokeWidth={1.8} />
      ) : (
        <Play className="w-[18px] h-[18px]" strokeWidth={1.8} />
      )}
    </button>
  );
};
