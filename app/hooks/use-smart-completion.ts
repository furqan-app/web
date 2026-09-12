"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getLocalDateString } from "@/app/server/actions/plans";
import {
  recordAutoWritten,
  clearAutoWritten,
  isAutoWriteEnabled,
} from "@/app/lib/plans/auto-write-log";
import {
  createDwellState,
  setVisibility,
  setActivePages,
  tickDwell,
  isAssignmentDwellMet,
  type PageDwellState,
} from "@/app/lib/plans/dwell-detector";
import {
  createPlaybackState,
  recordPlaybackTick,
  recordRepetitionCompleted,
  setPlaybackSpeed,
  isPlaybackCoverageMet,
  type PlaybackCoverageState,
} from "@/app/lib/plans/playback-detector";
import type { TrackAssignment } from "@/app/lib/plans/engine";
import type { TodayPlanAssignments } from "@/app/api/plans/today/route";
import {
  planPlaybackSessionId,
  type PageRelevantAssignment,
} from "@/app/lib/plans/assignment-range";
import type { PlanVerseIndex } from "@hooks/use-plan-verse-index";

export type ActiveOffer = {
  planId: number;
  planName?: string | null;
  assignment: TrackAssignment;
};

export type AutoWriteNotice = {
  planId: number;
  trackKey: string;
  activity: TrackAssignment["activity"];
};

export type UseSmartCompletionOptions = {
  enabled: boolean;
  visiblePages: number[] | null;
  relevant: PageRelevantAssignment<TodayPlanAssignments>[];
  recitationStatus: string;
  currentVerseKey: string | null;
  activeOverrideId: string | null;
  playbackSpeed: number;
  verseIndex?: PlanVerseIndex;
  onCheckOff: (input: {
    planId: number;
    trackKey: string;
    rangeStart: number;
    rangeEnd: number;
  }) => void;
  onUncheckOff: (input: { planId: number; trackKey: string }) => void;
  onStartFlourish: () => void;
};

/**
 * Identity of one offer's suppression slot: per plan, per track, per page.
 * Confirm, dismiss, and the criterion check must all stamp/check the
 * identical key, or a tick racing the check-off refetch resurrects a stale
 * offer for an already-recorded assignment.
 */
export function getOfferCooldownKey(
  planId: number,
  trackKey: string,
  visiblePages: number[] | null,
): string {
  return `${planId}:${trackKey}:${visiblePages?.join(",") ?? ""}`;
}

/**
 * True when an active offer has nothing left to offer: its assignment reads
 * as completed (recorded via sheet, hub, or a confirm whose refetch has
 * landed) or no longer overlaps this page. Pure predicate behind the
 * stale-offer clearing effect below.
 */
export function isOfferStale(
  relevant: PageRelevantAssignment<TodayPlanAssignments>[],
  offer: ActiveOffer | null,
): boolean {
  if (!offer) return false;
  return !relevant.some(
    (r) =>
      r.plan.planId === offer.planId &&
      r.assignment.trackKey === offer.assignment.trackKey &&
      !r.assignment.completed,
  );
}

/**
 * Resolves target Mushaf pages for an assignment.
 */
export function getTargetPagesForAssignment(
  assignment: TrackAssignment,
  verseIndex?: PlanVerseIndex,
): number[] {
  if (assignment.unit === "verse") {
    if (!verseIndex) return [];
    const startPage = verseIndex.pageOf(assignment.rangeStart);
    const endPage = verseIndex.pageOf(assignment.rangeEnd);
    if (startPage == null || endPage == null) return [];
    const min = Math.min(startPage, endPage);
    const max = Math.max(startPage, endPage);
    const pages: number[] = [];
    for (let p = min; p <= max; p++) {
      pages.push(p);
    }
    return pages;
  }

  // Page unit
  const pages: number[] = [];
  const min = Math.min(assignment.rangeStart, assignment.rangeEnd);
  const max = Math.max(assignment.rangeStart, assignment.rangeEnd);
  for (let p = min; p <= max; p++) {
    pages.push(p);
  }
  return pages;
}

/**
 * Resolves target verse keys for a listening assignment.
 */
export function getTargetVerseKeysForAssignment(
  assignment: TrackAssignment,
  verseIndex?: PlanVerseIndex,
): string[] {
  if (!verseIndex) return [];

  if (assignment.unit === "verse") {
    const keys: string[] = [];
    const min = Math.min(assignment.rangeStart, assignment.rangeEnd);
    const max = Math.max(assignment.rangeStart, assignment.rangeEnd);
    for (let ord = min; ord <= max; ord++) {
      const vk = verseIndex.verseKeyOf(ord);
      if (vk) keys.push(vk);
    }
    return keys;
  }

  // Page unit: span of first page to last page
  const startSpan = verseIndex.pageVerseSpan(assignment.rangeStart);
  const endSpan = verseIndex.pageVerseSpan(assignment.rangeEnd);
  if (!startSpan || !endSpan) return [];

  const keys: string[] = [];
  const firstOrd = Math.min(startSpan.first, endSpan.first);
  const lastOrd = Math.max(startSpan.last, endSpan.last);
  for (let ord = firstOrd; ord <= lastOrd; ord++) {
    const vk = verseIndex.verseKeyOf(ord);
    if (vk) keys.push(vk);
  }
  return keys;
}

export function useSmartCompletion({
  enabled,
  visiblePages,
  relevant,
  recitationStatus,
  currentVerseKey,
  activeOverrideId,
  playbackSpeed,
  verseIndex,
  onCheckOff,
  onUncheckOff,
  onStartFlourish,
}: UseSmartCompletionOptions) {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: number } | undefined)?.id;

  const [activeOffer, setActiveOffer] = useState<ActiveOffer | null>(null);
  const [autoWriteNotice, setAutoWriteNotice] = useState<AutoWriteNotice | null>(null);

  const dismissedOffersRef = useRef<Map<string, number>>(new Map());
  const dwellStateRef = useRef<PageDwellState>(createDwellState(Date.now(), visiblePages ?? []));
  const playbackStateRef = useRef<PlaybackCoverageState | null>(null);
  const playbackTrackKeyRef = useRef<string | null>(null);
  const lastVerseKeyRef = useRef<string | null>(null);
  const autoWriteNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dwellDayRef = useRef<string>(getLocalDateString());

  // Synchronize visible pages with dwell state
  useEffect(() => {
    if (!enabled) return;
    dwellStateRef.current = setActivePages(dwellStateRef.current, visiblePages, Date.now());
    // Dismiss active offer and auto-write notice on page turn
    setActiveOffer(null);
    setAutoWriteNotice(null);
  }, [enabled, visiblePages]);

  // Window interaction listeners for dwell foreground detection
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      const isFg =
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        document.hasFocus();
      dwellStateRef.current = setVisibility(dwellStateRef.current, isFg, Date.now());
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("blur", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("blur", handleVisibility);
    };
  }, [enabled]);

  const handleCriterionMet = useCallback(
    (planId: number, planName: string | undefined | null, assignment: TrackAssignment) => {
      const cooldownKey = getOfferCooldownKey(planId, assignment.trackKey, visiblePages);
      const dismissedAt = dismissedOffersRef.current.get(cooldownKey);
      if (dismissedAt && Date.now() - dismissedAt < 30 * 60 * 1000) {
        // Suppressed for 30 minutes on this page
        return;
      }

      // Per-user opt-in; an unknown user (signed-out or transient session)
      // reads as OFF, never as whatever another account stored.
      const autoWriteEnabled = isAutoWriteEnabled(userId);

      if (autoWriteEnabled) {
        // Option B: Opt-in automatic completion
        onCheckOff({
          planId,
          trackKey: assignment.trackKey,
          rangeStart: assignment.rangeStart,
          rangeEnd: assignment.rangeEnd,
        });

        const todayDate = getLocalDateString();
        recordAutoWritten(userId, planId, assignment.trackKey, todayDate);

        setAutoWriteNotice({
          planId,
          trackKey: assignment.trackKey,
          activity: assignment.activity,
        });

        onStartFlourish();

        // Acknowledgement pill stays visible through flourish
        if (autoWriteNoticeTimerRef.current) {
          clearTimeout(autoWriteNoticeTimerRef.current);
        }
        autoWriteNoticeTimerRef.current = setTimeout(() => {
          setAutoWriteNotice(null);
          autoWriteNoticeTimerRef.current = null;
        }, 5000);
      } else {
        // Option A: Smart nudge offer
        setActiveOffer({
          planId,
          planName,
          assignment,
        });
      }
    },
    [visiblePages, userId, onCheckOff, onStartFlourish],
  );

  const checkDwellCriteria = useCallback(() => {
    if (!enabled || !visiblePages || visiblePages.length === 0) return;
    if (activeOffer || autoWriteNotice) return;

    const uncompletedReadingAssignments = relevant.filter(
      (r) => !r.assignment.completed && r.assignment.activity !== "listen",
    );

    for (const item of uncompletedReadingAssignments) {
      const { plan, assignment } = item;
      const targetPages = getTargetPagesForAssignment(assignment, verseIndex);
      if (targetPages.length === 0) continue;

      if (!visiblePages.some((p) => targetPages.includes(p))) continue;

      const result = isAssignmentDwellMet(dwellStateRef.current, targetPages);
      if (result.isMet) {
        handleCriterionMet(plan.planId, plan.name, assignment);
        break;
      }
    }
  }, [enabled, visiblePages, activeOffer, autoWriteNotice, relevant, verseIndex, handleCriterionMet]);

  // Testing hook: allow E2E tests to fast-forward dwell accumulation deterministically
  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as unknown as {
          __advanceDwellTimeForTesting?: (seconds: number) => void;
        }
      ).__advanceDwellTimeForTesting = (seconds: number) => {
        if (!visiblePages || visiblePages.length === 0) return;
        for (const p of visiblePages) {
          const cur = dwellStateRef.current.pageSeconds.get(p) ?? 0;
          dwellStateRef.current.pageSeconds.set(p, cur + seconds);
        }
        checkDwellCriteria();
      };
    }
  }, [visiblePages, checkDwellCriteria]);

  // Dwell accumulation interval
  useEffect(() => {
    if (!enabled || !visiblePages || visiblePages.length === 0) return;

    const interval = setInterval(() => {
      // Local-midnight rollover (ADR 0030): assignments belong to a new day,
      // so yesterday's accumulated dwell must never complete today's wird.
      if (getLocalDateString() !== dwellDayRef.current) {
        dwellDayRef.current = getLocalDateString();
        dwellStateRef.current = createDwellState(Date.now(), visiblePages ?? []);
        dismissedOffersRef.current.clear();
      }
      dwellStateRef.current = tickDwell(dwellStateRef.current, Date.now());
      checkDwellCriteria();
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, visiblePages, checkDwellCriteria]);

  // Recitation playback detection
  useEffect(() => {
    if (!enabled) return;

    const uncompletedListenAssignments = relevant.filter(
      (r) => !r.assignment.completed && r.assignment.activity === "listen",
    );

    if (uncompletedListenAssignments.length === 0) {
      playbackStateRef.current = null;
      playbackTrackKeyRef.current = null;
      return;
    }

    // Find active listening assignment matching current recitation session
    const activeItem = uncompletedListenAssignments.find(
      (r) => activeOverrideId === planPlaybackSessionId(r.plan.planId, r.assignment.trackKey),
    );

    if (!activeItem || recitationStatus === "idle") {
      // If playback stopped or session ended, check if criteria were met
      if (playbackStateRef.current && activeItem) {
        const result = isPlaybackCoverageMet(playbackStateRef.current);
        if (result.isMet) {
          handleCriterionMet(activeItem.plan.planId, activeItem.plan.name, activeItem.assignment);
        }
      }
      return;
    }

    const { plan, assignment } = activeItem;
    const sessionTrackKey = assignment.trackKey;

    // Initialize playback state if new session
    if (playbackTrackKeyRef.current !== sessionTrackKey || !playbackStateRef.current) {
      const targetKeys = getTargetVerseKeysForAssignment(assignment, verseIndex);
      // No totalTargetDurationSeconds: the true range duration is reciter
      // verse timings, which live inside RecitationContext as unexposed refs
      // and would otherwise cost per-chapter network fetches from this
      // offline-capable hook. The detector therefore runs in coverage mode
      // here — the live guards are ≥90% verse coverage + full K passes.
      playbackStateRef.current = createPlaybackState({
        targetVerseKeys: targetKeys,
        requiredRepetitions: assignment.repetitions ?? 1,
        playbackSpeed,
      });
      playbackTrackKeyRef.current = sessionTrackKey;
      lastVerseKeyRef.current = null;
    }

    if (playbackSpeed !== playbackStateRef.current.playbackSpeed) {
      playbackStateRef.current = setPlaybackSpeed(playbackStateRef.current, playbackSpeed);
    }

    // Record verse transition / time update
    if (currentVerseKey && currentVerseKey !== lastVerseKeyRef.current) {
      lastVerseKeyRef.current = currentVerseKey;
      // Credit 5s default per verse advance
      playbackStateRef.current = recordPlaybackTick(
        playbackStateRef.current,
        currentVerseKey,
        5,
        5,
      );
      // A full pass completes when playback enters the final target verse.
      // RecitationContext loops range repeats via seek-back to the range start,
      // so each re-entry into the last verse counts one more pass toward K.
      // (Skipping straight to the end still counts a pass here, but coverage
      // stays < 90% so the criterion cannot be met — seek/skip safe.)
      const targetKeys = playbackStateRef.current.targetVerseKeys;
      if (targetKeys.length > 0 && currentVerseKey === targetKeys[targetKeys.length - 1]) {
        playbackStateRef.current = recordRepetitionCompleted(playbackStateRef.current);
      }
    }

    // Check if criteria met during active playback
    const result = isPlaybackCoverageMet(playbackStateRef.current);
    if (result.isMet && !activeOffer && !autoWriteNotice) {
      handleCriterionMet(plan.planId, plan.name, assignment);
    }
  }, [
    enabled,
    relevant,
    activeOverrideId,
    recitationStatus,
    currentVerseKey,
    playbackSpeed,
    verseIndex,
    activeOffer,
    autoWriteNotice,
    handleCriterionMet,
  ]);

  const handleConfirmOffer = useCallback(() => {
    if (!activeOffer) return;
    const { planId, assignment } = activeOffer;
    onCheckOff({
      planId,
      trackKey: assignment.trackKey,
      rangeStart: assignment.rangeStart,
      rangeEnd: assignment.rangeEnd,
    });
    // Stamp the same per-assignment-per-page cooldown as a dismissal: the
    // check-off mutation's invalidation refetch lands after this render, and
    // without it a dwell tick in between would resurrect a stale offer for an
    // assignment that is already recorded (nothing else clears it — the
    // completed filter only gates future triggers). Same conservative
    // trade-off as dismiss: a confirm-then-undo stays quiet for 30 minutes.
    const cooldownKey = getOfferCooldownKey(planId, assignment.trackKey, visiblePages);
    dismissedOffersRef.current.set(cooldownKey, Date.now());
    setActiveOffer(null);
    onStartFlourish();
  }, [activeOffer, onCheckOff, onStartFlourish, visiblePages]);

  const handleDismissOffer = useCallback(() => {
    if (!activeOffer) return;
    const { planId, assignment } = activeOffer;
    const cooldownKey = getOfferCooldownKey(planId, assignment.trackKey, visiblePages);
    dismissedOffersRef.current.set(cooldownKey, Date.now());
    setActiveOffer(null);
  }, [activeOffer, visiblePages]);

  // Clear a stale offer once its assignment reads as completed (recorded via
  // the sheet, the hub, or a confirm whose refetch has landed) or stops
  // overlapping this page — otherwise the pill would sit beside a finished
  // dial with nothing left to ever dismiss it.
  useEffect(() => {
    if (isOfferStale(relevant, activeOffer)) setActiveOffer(null);
  }, [relevant, activeOffer]);

  const handleUndoAutoWrite = useCallback(() => {
    if (!autoWriteNotice) return;
    const { planId, trackKey } = autoWriteNotice;
    onUncheckOff({ planId, trackKey });
    const todayDate = getLocalDateString();
    clearAutoWritten(userId, planId, trackKey, todayDate);
    setAutoWriteNotice(null);
    if (autoWriteNoticeTimerRef.current) {
      clearTimeout(autoWriteNoticeTimerRef.current);
      autoWriteNoticeTimerRef.current = null;
    }
  }, [autoWriteNotice, userId, onUncheckOff]);

  return {
    activeOffer,
    autoWriteNotice,
    handleConfirmOffer,
    handleDismissOffer,
    handleUndoAutoWrite,
    isOffering: Boolean(activeOffer),
  };
}
