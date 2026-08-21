"use client";

import {
  CircleUserRound,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Heart,
  Volume2,
  ListMusic,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { useRecitation } from "@/app/contexts/RecitationContext";
import useTranslations from "@/app/hooks/use-translations";
import { cn } from "@/lib/utils";

// Every rail control is a design affordance: focusable and named, but with no
// handler. The rail may *display* RecitationContext state; it never drives it.
const UTILITIES: ReadonlyArray<{ key: string; Icon: LucideIcon; label: string }> = [
  { key: "repeat", Icon: Repeat, label: "readerLab.repeat" },
  { key: "favorite", Icon: Heart, label: "readerLab.favorite" },
  { key: "volume", Icon: Volume2, label: "readerLab.volume" },
  { key: "queue", Icon: ListMusic, label: "readerLab.queue" },
  { key: "tuning", Icon: SlidersHorizontal, label: "readerLab.audioTuning" },
];

export function ReaderLabRecitationRail() {
  const t = useTranslations();
  const { status, reciters, settings, playbackError } = useRecitation();

  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const isError = Boolean(playbackError);
  // One token drives the play control's ring, glow and colour, so the rail
  // cannot show two different readings of the same state.
  const visualState = isError
    ? "error"
    : isLoading
      ? "loading"
      : isPlaying
        ? "playing"
        : "idle";

  const reciter = reciters.find((r) => r.id === settings.reciterId);
  const reciterName =
    reciter?.translatedName ?? reciter?.name ?? t("readerLab.reciterDefault", "القارئ الحالي");

  const statusText = isPlaying
    ? t("readerLab.recitationPlaying", "قيد التشغيل")
    : isLoading
      ? t("readerLab.recitationLoading", "جارٍ التحميل")
      : isError
        ? t("readerLab.recitationError", "خطأ في التشغيل")
        : status === "paused"
          ? t("readerLab.recitationPaused", "مؤقت")
          : t("readerLab.recitationIdle", "متوقف");

  const tooltipText = `${t("readerLab.recitationTooltip", "التلاوة")}: ${reciterName} (${statusText})`;
  const playLabel = isPlaying
    ? t("readerLab.pause", "إيقاف مؤقت")
    : t("readerLab.play", "تشغيل");

  return (
    <aside
      aria-label={t("readerLab.recitationTooltip", "التلاوة")}
      // `right` is deliberate and must not become `inset-inline-end`: the rail
      // stays physically right even though the composition is RTL.
      // Desk band only: a fixed 72px column on the physical right. In the
      // compact and spread bands globals.css relays the same three zones into
      // a bottom transport bar — the affordance moves, the book is never inset.
      className="fq-reader-lab-rail fixed right-0 bottom-0 w-[72px] z-20 select-none"
    >
      {/* Top — who is reciting, and whether anything is happening. */}
      <div className="fq-reader-lab-rail-lead absolute inset-x-0 top-7 flex justify-center">
        <div
          className="fq-reader-lab-medallion relative grid place-items-center"
          title={tooltipText}
          aria-label={tooltipText}
          tabIndex={0}
        >
          <CircleUserRound className="size-[18px]" strokeWidth={1.6} />
          <span
            className={cn(
              "absolute -bottom-px -right-px size-2 rounded-full ring-2 ring-[hsl(var(--rl-stage))]",
              isPlaying && "bg-[hsl(var(--rl-emerald))]",
              isLoading && "bg-[hsl(var(--rl-emerald)/0.7)] animate-pulse",
              isError && "bg-[hsl(var(--rl-danger))]",
              !isPlaying && !isLoading && !isError && "bg-[hsl(var(--rl-line))]",
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Centre — transport, pinned to the rail's true vertical midpoint so it
          does not drift when the zones above or below change height. */}
      <div className="fq-reader-lab-rail-transport absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5">
        <button
          type="button"
          aria-disabled="true"
          title={t("readerLab.prevVerse", "الآية السابقة")}
          aria-label={t("readerLab.prevVerse", "الآية السابقة")}
          className="fq-reader-lab-btn"
        >
          <SkipBack className="size-4" strokeWidth={1.8} />
        </button>

        <button
          type="button"
          aria-disabled="true"
          data-state={visualState}
          title={playLabel}
          aria-label={playLabel}
          className="fq-reader-lab-play"
        >
          <span className="fq-reader-lab-play-ring" aria-hidden="true" />
          {isPlaying ? (
            <Pause className="size-[18px] fill-current" strokeWidth={0} />
          ) : (
            <Play className="size-[18px] fill-current translate-x-px" strokeWidth={0} />
          )}
        </button>

        <button
          type="button"
          aria-disabled="true"
          title={t("readerLab.nextVerse", "الآية التالية")}
          aria-label={t("readerLab.nextVerse", "الآية التالية")}
          className="fq-reader-lab-btn"
        >
          <SkipForward className="size-4" strokeWidth={1.8} />
        </button>
      </div>

      {/* Bottom — tertiary utilities, separated from transport by empty desk
          rather than by a divider stack. */}
      <div className="fq-reader-lab-rail-utils absolute inset-x-0 bottom-7 flex flex-col items-center gap-1">
        {UTILITIES.map(({ key, Icon, label }) => {
          const text = t(label, "");
          return (
            <button
              key={key}
              type="button"
              aria-disabled="true"
              title={text}
              aria-label={text}
              className="fq-reader-lab-btn"
            >
              <Icon className="size-4" strokeWidth={1.8} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
