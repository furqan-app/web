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
  const isListen = assignment.activity === "listen";
  const isSinglePage = rangeStart === rangeEnd;
  const sessionId = planPlaybackSessionId(planId, assignment.trackKey);

  const startBounds = usePageVerseBounds(rangeStart, { enabled: isListen });
  const endBounds = usePageVerseBounds(rangeEnd, { enabled: isListen && !isSinglePage });

  // Whichever query supplies the range's END bounds — the same one as the
  // start when the assignment is a single page (no second request fired).
  const endBoundsQuery = isSinglePage ? startBounds : endBounds;

  const bounds =
    startBounds.data && endBoundsQuery.data
      ? {
          firstVerseKey: startBounds.data.firstVerseKey,
          lastVerseKey: endBoundsQuery.data.lastVerseKey,
          lastChapterId: endBoundsQuery.data.lastChapterId,
        }
      : null;
  // A failed /bounds fetch must not spin forever — surface it as a retry
  // affordance instead.
  const boundsError = isListen && (startBounds.isError || endBoundsQuery.isError);
  const boundsLoading = isListen && !bounds && !boundsError;

  // Identity, not page overlap: an unrelated session (player bar, MarkModal)
  // drifting into this row's pages is not this row's session, and two
  // overlapping listen rows must never both claim "active".
  const isActiveRow = isListen && status !== "idle" && activeOverride?.id === sessionId;
  const isRowPlaying = isActiveRow && status === "playing";
  const isRowLoading = boundsLoading || (isActiveRow && status === "loading");

  const rangeLabel = formatRange(assignment.rangeStart, assignment.rangeEnd, locale);

  const handlePlayTap = () => {
    if (isRowLoading) return;
    if (boundsError) {
      startBounds.refetch();
      if (!isSinglePage) endBounds.refetch();
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
      label: `${trackLabel} · ${t("page", "Page")} ${rangeLabel}`,
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

      <Link
        href={`/pages/${assignment.rangeStart}`}
        locale={locale}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
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
            {t("page", "Page")} {rangeLabel}
            {assignment.repetitions ? ` · ×${toLocaleNumeral(assignment.repetitions, locale)}` : ""}
          </div>
          {assignment.completed && assignment.next ? (
            <div className="text-xs text-muted-foreground/70">
              {t("plans.nextAssignment", "Next")}: {t("page", "Page")}{" "}
              {formatRange(assignment.next.rangeStart, assignment.next.rangeEnd, locale)}
              {assignment.next.repetitions
                ? ` · ×${toLocaleNumeral(assignment.next.repetitions, locale)}`
                : ""}
            </div>
          ) : null}
        </div>
      </Link>

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
