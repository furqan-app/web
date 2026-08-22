"use client";

import { useLocale } from "next-intl";
import { Check, Loader2, Pause, Play, RotateCw } from "lucide-react";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { PLAN_TRACK_UI, PLAN_ACTIVITY_UI } from "@constants/plan-ui";
import type { TrackAssignment } from "@/app/lib/plans/engine";
import { planPlaybackSessionId } from "@/app/lib/plans/assignment-range";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { usePageVerseBounds } from "@hooks/use-page-verse-bounds";
import { usePlanVerseIndex } from "@hooks/use-plan-verse-index";
import { cn } from "@/lib/utils";

type Props = {
  /** Owning plan — with trackKey, forms this row's playback session identity. */
  planId: number;
  assignment: TrackAssignment;
  /** Check off when not yet completed, undo the check-off when it is. */
  onToggle: () => void;
  isPending: boolean;
  disabled: boolean;
};

const formatRange = (start: number, end: number, locale: string) =>
  start === end
    ? toLocaleNumeral(start, locale)
    : `${toLocaleNumeral(start, locale)}–${toLocaleNumeral(end, locale)}`;

// Verse-unit ranges (ADR 0038) display as surah:verse, not a raw ordinal.
const formatVerseRange = (startKey: string, endKey: string) =>
  startKey === endKey ? startKey : `${startKey}–${endKey}`;

// One track's today-assignment: icon + label + page range + check-off. Shared
// between the hub's MyPlansList and the reader's PlansWidget sheet so the two
// surfaces never drift apart.
export const PlanAssignmentRow = ({ planId, assignment, onToggle, isPending, disabled }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const { activeOverride, status, play, togglePlayPause } = useRecitation();

  const trackUi = PLAN_TRACK_UI[assignment.trackKey];
  const activityUi = PLAN_ACTIVITY_UI[assignment.activity];
  const Icon = trackUi?.icon;

  const { rangeStart, rangeEnd } = assignment;
  const isVerseUnit = assignment.unit === "verse";
  const isListen = assignment.activity === "listen";
  const isSinglePage = rangeStart === rangeEnd;
  const sessionId = planPlaybackSessionId(planId, assignment.trackKey);

  // Verse-unit ranges display as surah:verse and deep-link to the page the
  // *start* verse falls on — resolved client-side from the same static
  // assets the engine uses server-side (ADR 0038), not re-derived here.
  // Gated: page-unit rows (the majority) never fetch/build the index.
  const verseIndex = usePlanVerseIndex({ enabled: isVerseUnit });
  const linkPage = isVerseUnit ? verseIndex.data?.pageOf(rangeStart) : rangeStart;
  // While the verse index is still loading (or failed), a verse-unit row has
  // no reliable page to link to — never guess by treating the raw ordinal as
  // a page number.
  const linkReady = !isVerseUnit || linkPage !== undefined;

  // Page-unit tracks resolve playback bounds via /bounds (page -> verse
  // range); verse-unit tracks already ARE verse ordinals, so bounds come
  // straight from the verse index instead — no /bounds call needed.
  const startBounds = usePageVerseBounds(rangeStart, { enabled: isListen && !isVerseUnit });
  const endBounds = usePageVerseBounds(rangeEnd, {
    enabled: isListen && !isSinglePage && !isVerseUnit,
  });

  // Whichever query supplies the range's END bounds — the same one as the
  // start when the assignment is a single page (no second request fired).
  const endBoundsQuery = isSinglePage ? startBounds : endBounds;

  const verseUnitBounds = (() => {
    if (!isListen || !isVerseUnit) return null;
    const firstVerseKey = verseIndex.data?.verseKeyOf(rangeStart);
    const lastVerseKey = verseIndex.data?.verseKeyOf(rangeEnd);
    if (!firstVerseKey || !lastVerseKey) return null;
    return { firstVerseKey, lastVerseKey, lastChapterId: Number(lastVerseKey.split(":")[0]) };
  })();

  const bounds = isVerseUnit
    ? verseUnitBounds
    : startBounds.data && endBoundsQuery.data
      ? {
          firstVerseKey: startBounds.data.firstVerseKey,
          lastVerseKey: endBoundsQuery.data.lastVerseKey,
          lastChapterId: endBoundsQuery.data.lastChapterId,
        }
      : null;
  // A failed /bounds fetch (or verse-index fetch) must not spin forever —
  // surface it as a retry affordance instead.
  const boundsError = isListen && (isVerseUnit ? verseIndex.isError : startBounds.isError || endBoundsQuery.isError);
  const boundsLoading = isListen && !bounds && !boundsError;

  // Identity, not page overlap: an unrelated session (player bar, MarkModal)
  // drifting into this row's pages is not this row's session, and two
  // overlapping listen rows must never both claim "active".
  const isActiveRow = isListen && status !== "idle" && activeOverride?.id === sessionId;
  const isRowPlaying = isActiveRow && status === "playing";
  const isRowLoading = boundsLoading || (isActiveRow && status === "loading");

  // Verse-unit: "surah:verse–surah:verse" (falls back to the raw ordinal
  // range while the client-side verse index is still loading). Page-unit:
  // "Page N–M", unchanged.
  const formatRangeText = (start: number, end: number) => {
    if (!isVerseUnit) return `${t("page", "Page")} ${formatRange(start, end, locale)}`;
    const s = verseIndex.data?.verseKeyOf(start);
    const e = verseIndex.data?.verseKeyOf(end);
    return s && e ? formatVerseRange(s, e) : formatRange(start, end, locale);
  };
  const rangeLabel = formatRangeText(assignment.rangeStart, assignment.rangeEnd);

  const handlePlayTap = () => {
    if (isRowLoading) return;
    if (boundsError) {
      if (isVerseUnit) verseIndex.refetch();
      else {
        startBounds.refetch();
        if (!isSinglePage) endBounds.refetch();
      }
      return;
    }
    if (!bounds) return;
    if (isActiveRow && (status === "playing" || status === "paused")) {
      togglePlayPause();
      return;
    }
    const trackLabel = trackUi ? t(trackUi.labelKey, trackUi.defaultLabel) : assignment.trackKey;
    play(bounds.firstVerseKey, {
      stopVerseKey: bounds.lastVerseKey,
      stopChapterId: bounds.lastChapterId,
      rangeRepeatCount: assignment.repetitions ?? 1,
      id: sessionId,
      label: `${trackLabel} · ${rangeLabel}`,
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      {isListen ? (
        <button
          type="button"
          onClick={handlePlayTap}
          // Offline blocks STARTING playback (needs /bounds + QDC audio) but
          // must not block pausing a session that's already running on
          // buffered audio.
          disabled={(disabled && !isActiveRow) || isRowLoading}
          aria-label={
            isRowLoading
              ? t("plans.playback.loading", "Loading")
              : boundsError
                ? t("plans.playback.retry", "Retry loading")
                : isRowPlaying
                  ? t("plans.playback.pause", "Pause")
                  : t("plans.playback.play", "Play")
          }
          className="grid place-items-center size-8 rounded-lg bg-primary/10 text-primary flex-none disabled:cursor-default disabled:opacity-50"
        >
          {isRowLoading ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.7} />
          ) : boundsError ? (
            <RotateCw className="size-4" strokeWidth={1.7} />
          ) : isRowPlaying ? (
            <Pause className="size-4" strokeWidth={1.7} />
          ) : (
            <Play className="size-4" strokeWidth={1.7} />
          )}
        </button>
      ) : null}

      {(() => {
        const content = (
          <>
            {!isListen ? (
              <span className="grid place-items-center size-8 rounded-lg bg-primary/10 text-primary flex-none">
                {Icon ? <Icon className="size-4" strokeWidth={1.7} /> : null}
              </span>
            ) : null}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {trackUi ? t(trackUi.labelKey, trackUi.defaultLabel) : assignment.trackKey}
              </div>
              <div className="text-xs text-muted-foreground">
                {activityUi ? t(activityUi.labelKey, activityUi.defaultLabel) : assignment.activity}
                {" · "}
                {rangeLabel}
                {assignment.repetitions ? ` · ×${toLocaleNumeral(assignment.repetitions, locale)}` : ""}
              </div>
              {assignment.completed && assignment.next ? (
                <div className="text-xs text-muted-foreground/70">
                  {t("plans.nextAssignment", "Next")}:{" "}
                  {formatRangeText(assignment.next.rangeStart, assignment.next.rangeEnd)}
                  {assignment.next.repetitions
                    ? ` · ×${toLocaleNumeral(assignment.next.repetitions, locale)}`
                    : ""}
                </div>
              ) : null}
            </div>
          </>
        );
        // Not yet resolvable to a real page (verse index still loading/
        // errored) — render inert rather than link to a guessed page.
        return linkReady ? (
          <Link href={`/pages/${linkPage}`} locale={locale} className="flex items-center gap-3 flex-1 min-w-0">
            {content}
          </Link>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">{content}</div>
        );
      })()}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isPending}
        aria-label={
          assignment.completed
            ? t("plans.undoCheckOff", "Undo check-off")
            : t("plans.checkOff", "Check off")
        }
        aria-pressed={assignment.completed}
        className={cn(
          "grid flex-none place-items-center size-8 rounded-full transition-[background-color,box-shadow] duration-200",
          assignment.completed
            ? "bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.22)] hover:shadow-none"
            : "border-[1.5px] border-border bg-transparent hover:border-primary/50",
          "disabled:cursor-default disabled:hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.22)]",
        )}
      >
        {assignment.completed ? (
          <Check className="size-4 text-primary-foreground" strokeWidth={2.6} />
        ) : null}
      </button>
    </div>
  );
};
