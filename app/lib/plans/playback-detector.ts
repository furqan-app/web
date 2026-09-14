/**
 * Playback coverage detection engine for listening awrad assignments (Issue #598).
 *
 * Pure state machine — no audio element, no network, no clock side-effects.
 * Tracks recitation playback across assigned verse keys with strictly conservative thresholds:
 * - >= 90% coverage of assigned verses
 * - >= 0.85 * (totalTargetDuration / playbackSpeed) wall-clock listening time floor
 * - >= 80% verse duration playback required to mark a single verse as heard
 * - 100% of required K passes for repetition tracks (e.g. Husun tahdeer)
 * - Skips/seeks omit unplayed verses
 */

export const PLAYBACK_CONSTANTS = {
  COVERAGE_THRESHOLD: 0.90, // 90%
  SPEED_FACTOR_FLOOR: 0.85, // 85% of duration / speed
  VERSE_MIN_HEARD_FRACTION: 0.80, // 80% of verse duration
} as const;

export type PlaybackCoverageState = {
  /** Target verse keys for the assignment, e.g. ["2:1", "2:2"] */
  targetVerseKeys: string[];
  /** Map of verseKey -> accumulated seconds heard */
  versePlayedSeconds: Map<string, number>;
  /** Set of verse keys verified played >= 80% of their duration */
  verifiedVerseKeys: Set<string>;
  /** Total wall-clock time spent actively playing (seconds) */
  totalWallClockSeconds: number;
  /**
   * Estimated or actual duration of the full target range (seconds).
   * When 0 (unknown), the speed-factor floor in `isPlaybackCoverageMet` is
   * vacuously true BY DESIGN — the caller runs in coverage mode and the live
   * guards are verse coverage + full K passes. The floor is kept, not
   * deleted: it protects callers that do know the true audio duration.
   */
  totalTargetDurationSeconds: number;
  /** Required number of full range passes (repetitions) */
  requiredRepetitions: number;
  /** Completed full range passes */
  completedRepetitions: number;
  /** Current playback speed multiplier */
  playbackSpeed: number;
  /** True while a seek is in flight */
  isSeeking: boolean;
};

/**
 * Creates a fresh PlaybackCoverageState for an assigned audio range.
 */
export function createPlaybackState(params: {
  targetVerseKeys: string[];
  totalTargetDurationSeconds?: number;
  requiredRepetitions?: number;
  playbackSpeed?: number;
}): PlaybackCoverageState {
  return {
    targetVerseKeys: [...params.targetVerseKeys],
    versePlayedSeconds: new Map(),
    verifiedVerseKeys: new Set(),
    totalWallClockSeconds: 0,
    totalTargetDurationSeconds: params.totalTargetDurationSeconds ?? 0,
    requiredRepetitions: Math.max(1, params.requiredRepetitions ?? 1),
    completedRepetitions: 0,
    playbackSpeed: Math.max(0.25, params.playbackSpeed ?? 1.0),
    isSeeking: false,
  };
}

/**
 * Updates playback rate.
 */
export function setPlaybackSpeed(
  state: PlaybackCoverageState,
  speed: number,
): PlaybackCoverageState {
  return {
    ...state,
    playbackSpeed: Math.max(0.25, speed),
  };
}

/**
 * Marks that a user seek has started. While seeking, timeupdate ticks are ignored.
 */
export function recordSeekStart(state: PlaybackCoverageState): PlaybackCoverageState {
  return {
    ...state,
    isSeeking: true,
  };
}

/**
 * Marks that a seek has completed.
 */
export function recordSeekEnd(state: PlaybackCoverageState): PlaybackCoverageState {
  return {
    ...state,
    isSeeking: false,
  };
}

/**
 * Records playback progress for the active verse during normal (non-seeking) playback.
 */
export function recordPlaybackTick(
  state: PlaybackCoverageState,
  currentVerseKey: string,
  verseDurationSeconds: number,
  deltaSeconds: number,
): PlaybackCoverageState {
  if (state.isSeeking || deltaSeconds <= 0) {
    return state;
  }

  // Only accumulate for verses within the assignment range
  if (!state.targetVerseKeys.includes(currentVerseKey)) {
    return state;
  }

  const nextVerseMap = new Map(state.versePlayedSeconds);
  const nextVerified = new Set(state.verifiedVerseKeys);

  const prevPlayed = nextVerseMap.get(currentVerseKey) ?? 0;
  const nextPlayed = prevPlayed + deltaSeconds;
  nextVerseMap.set(currentVerseKey, nextPlayed);

  // If verse has played for >= 80% of its duration, verify it
  if (
    verseDurationSeconds > 0 &&
    nextPlayed >= verseDurationSeconds * PLAYBACK_CONSTANTS.VERSE_MIN_HEARD_FRACTION
  ) {
    nextVerified.add(currentVerseKey);
  }

  return {
    ...state,
    versePlayedSeconds: nextVerseMap,
    verifiedVerseKeys: nextVerified,
    totalWallClockSeconds: state.totalWallClockSeconds + deltaSeconds,
  };
}

/**
 * Records completion of one full pass through the target range.
 */
export function recordRepetitionCompleted(
  state: PlaybackCoverageState,
): PlaybackCoverageState {
  return {
    ...state,
    completedRepetitions: state.completedRepetitions + 1,
  };
}

export type PlaybackCoverageResult = {
  isMet: boolean;
  coverageFraction: number;
  isCoverageMet: boolean;
  isTimeMet: boolean;
  isRepetitionsMet: boolean;
};

/**
 * Evaluates whether listening criteria are satisfied.
 */
export function isPlaybackCoverageMet(
  state: PlaybackCoverageState,
): PlaybackCoverageResult {
  if (state.targetVerseKeys.length === 0) {
    return {
      isMet: false,
      coverageFraction: 0,
      isCoverageMet: false,
      isTimeMet: false,
      isRepetitionsMet: false,
    };
  }

  const coverageFraction = state.verifiedVerseKeys.size / state.targetVerseKeys.length;
  const isCoverageMet = coverageFraction >= PLAYBACK_CONSTANTS.COVERAGE_THRESHOLD;

  // Expected minimum listening time based on audio duration and playback speed
  const expectedMinTime =
    state.totalTargetDurationSeconds > 0
      ? PLAYBACK_CONSTANTS.SPEED_FACTOR_FLOOR *
        (state.totalTargetDurationSeconds / state.playbackSpeed)
      : 0;

  const isTimeMet =
    state.totalTargetDurationSeconds <= 0 || state.totalWallClockSeconds >= expectedMinTime;

  const isRepetitionsMet = state.completedRepetitions >= state.requiredRepetitions;

  const isMet = isCoverageMet && isTimeMet && isRepetitionsMet;

  return {
    isMet,
    coverageFraction,
    isCoverageMet,
    isTimeMet,
    isRepetitionsMet,
  };
}
