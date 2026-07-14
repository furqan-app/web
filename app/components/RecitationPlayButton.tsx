"use client";

import { Play, Pause } from "lucide-react";
import { useRecitation } from "@/app/contexts/RecitationContext";
import useTranslations from "@/app/hooks/use-translations";
import { cn } from "@/lib/utils";

type Props = {
  // verse_key of the current page's first word. Optional: when omitted (Nav
  // mobile usage), falls back to pageFirstVerseKey from RecitationContext,
  // which RecitationPageSync keeps current as the reader navigates.
  // Explicit null means "page has no words" — do not fall back to context.
  firstVerseKey?: string | null;
  className?: string;
};

export const RecitationPlayButton = ({ firstVerseKey: firstVerseKeyProp, className }: Props) => {
  const { status, currentVerseKey, pageFirstVerseKey, play, togglePlayPause } = useRecitation();
  const t = useTranslations();

  // Distinguish absent prop (fall back to context) from explicit null (no words on page → hide).
  const firstVerseKey = firstVerseKeyProp !== undefined ? firstVerseKeyProp : pageFirstVerseKey;

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
      className={cn("flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60", className)}
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
