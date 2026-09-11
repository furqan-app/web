/**
 * Dwell detection engine for reading, memorizing, and reviewing awrad assignments (Issue #598).
 *
 * Pure state machine — no React, no DOM, no clock side-effects.
 * Tracks active presence across Mushaf pages with strictly conservative thresholds:
 * - 60s active dwell floor per page
 * - 45s idle inactivity timeout (pauses accumulation when no user input is received)
 * - 5s bounce filter (discards visits < 5s)
 * - 15min maximum cap per page
 * - 100% page coverage required for multi-page assignments
 */

export const DWELL_CONSTANTS = {
  PAGE_THRESHOLD_SECONDS: 60,
  IDLE_TIMEOUT_SECONDS: 45,
  BOUNCE_THRESHOLD_SECONDS: 5,
  PAGE_MAX_CAP_SECONDS: 900, // 15 minutes
} as const;

export type PageDwellState = {
  /** Map of pageNumber -> total committed active dwell in seconds */
  pageSeconds: Map<number, number>;
  /** Timestamp (ms) of the last detected user interaction */
  lastInteractionAt: number;
  /** Whether the document/window is in foreground and focused */
  isForeground: boolean;
  /** Currently visible page numbers */
  activePages: number[];
  /** Timestamp (ms) when current visit to activePages started */
  visitStartedAt: number;
  /** Seconds accumulated in the current visit before bounce threshold is reached */
  provisionalSeconds: number;
  /** Timestamp (ms) of the last tick */
  lastTickAt: number;
};

/**
 * Creates a fresh, empty PageDwellState.
 */
export function createDwellState(
  now = Date.now(),
  initialPages: number[] = [],
): PageDwellState {
  return {
    pageSeconds: new Map(),
    lastInteractionAt: now,
    isForeground: true,
    activePages: [...initialPages],
    visitStartedAt: now,
    provisionalSeconds: 0,
    lastTickAt: now,
  };
}

/**
 * Records a user interaction (touch, pointer, scroll, keydown),
 * resetting the idle timeout window.
 */
export function recordUserInteraction(
  state: PageDwellState,
  now = Date.now(),
): PageDwellState {
  return {
    ...state,
    lastInteractionAt: now,
  };
}

/**
 * Updates tab/window visibility. When hidden or blurred, accumulation pauses.
 */
export function setVisibility(
  state: PageDwellState,
  isForeground: boolean,
  now = Date.now(),
): PageDwellState {
  return {
    ...state,
    isForeground,
    lastTickAt: now,
  };
}

/**
 * Updates currently active (visible) pages when user turns a page.
 * If previous page visit lasted < BOUNCE_THRESHOLD_SECONDS, provisional time is discarded.
 */
export function setActivePages(
  state: PageDwellState,
  pages: number[] | null,
  now = Date.now(),
): PageDwellState {
  const nextPages = pages ? [...pages].sort((a, b) => a - b) : [];
  const currentPages = [...state.activePages].sort((a, b) => a - b);

  const isSame =
    nextPages.length === currentPages.length &&
    nextPages.every((p, idx) => p === currentPages[idx]);

  if (isSame) {
    return state;
  }

  // Handle previous visit bounce:
  // If previous visit reached bounce threshold, it was already committed incrementally.
  // If it did NOT reach bounce threshold (< 5s), any provisionalSeconds are simply discarded.
  return {
    ...state,
    activePages: nextPages,
    visitStartedAt: now,
    provisionalSeconds: 0,
    lastTickAt: now,
  };
}

/**
 * Advances the dwell accumulator by the elapsed time between `state.lastTickAt` and `now`.
 * Pure state transition: computes creditable seconds based on foreground status,
 * idle timeout, bounce threshold, and page max cap.
 */
export function tickDwell(
  state: PageDwellState,
  now = Date.now(),
): PageDwellState {
  const deltaSeconds = Math.max(0, (now - state.lastTickAt) / 1000);

  // Clone map for immutability
  const nextMap = new Map(state.pageSeconds);

  if (!state.isForeground || state.activePages.length === 0 || deltaSeconds <= 0) {
    return {
      ...state,
      lastTickAt: now,
    };
  }

  // Compute creditable active time considering idle timeout
  const idleSinceSeconds = Math.max(0, (now - state.lastInteractionAt) / 1000);
  const idleBeforeDeltaSeconds = Math.max(0, idleSinceSeconds - deltaSeconds);

  let creditableSeconds = 0;
  if (idleBeforeDeltaSeconds < DWELL_CONSTANTS.IDLE_TIMEOUT_SECONDS) {
    // Some or all of this tick was within the active window
    const availableActiveInTick = DWELL_CONSTANTS.IDLE_TIMEOUT_SECONDS - idleBeforeDeltaSeconds;
    creditableSeconds = Math.min(deltaSeconds, availableActiveInTick);
  }

  if (creditableSeconds <= 0) {
    return {
      ...state,
      lastTickAt: now,
    };
  }

  const prevProvisional = state.provisionalSeconds;
  const nextProvisional = prevProvisional + creditableSeconds;

  if (prevProvisional < DWELL_CONSTANTS.BOUNCE_THRESHOLD_SECONDS) {
    if (nextProvisional >= DWELL_CONSTANTS.BOUNCE_THRESHOLD_SECONDS) {
      // Crossed bounce threshold! Commit all provisional seconds accumulated so far
      for (const page of state.activePages) {
        const cur = nextMap.get(page) ?? 0;
        const updated = Math.min(cur + nextProvisional, DWELL_CONSTANTS.PAGE_MAX_CAP_SECONDS);
        nextMap.set(page, updated);
      }
    }
  } else {
    // Already past bounce threshold; credit the delta directly
    for (const page of state.activePages) {
      const cur = nextMap.get(page) ?? 0;
      const updated = Math.min(cur + creditableSeconds, DWELL_CONSTANTS.PAGE_MAX_CAP_SECONDS);
      nextMap.set(page, updated);
    }
  }

  return {
    ...state,
    pageSeconds: nextMap,
    provisionalSeconds: nextProvisional,
    lastTickAt: now,
  };
}

/**
 * Checks if a single page has met the 60-second active dwell floor.
 */
export function isPageDwellMet(state: PageDwellState, page: number): boolean {
  return (state.pageSeconds.get(page) ?? 0) >= DWELL_CONSTANTS.PAGE_THRESHOLD_SECONDS;
}

export type AssignmentDwellResult = {
  isMet: boolean;
  completedPages: number[];
  remainingPages: number[];
  progressFraction: number;
};

/**
 * Evaluates whether an assignment's target pages have fulfilled active dwell.
 * Strict conservative rule: 100% of pages in `targetPages` must independently
 * achieve >= 60s dwell. Reading 1 page of a 5-page assignment yields isMet: false.
 */
export function isAssignmentDwellMet(
  state: PageDwellState,
  targetPages: number[],
): AssignmentDwellResult {
  if (targetPages.length === 0) {
    return {
      isMet: false,
      completedPages: [],
      remainingPages: [],
      progressFraction: 0,
    };
  }

  const completedPages: number[] = [];
  const remainingPages: number[] = [];

  for (const page of targetPages) {
    if (isPageDwellMet(state, page)) {
      completedPages.push(page);
    } else {
      remainingPages.push(page);
    }
  }

  const isMet = remainingPages.length === 0;
  const progressFraction = completedPages.length / targetPages.length;

  return {
    isMet,
    completedPages,
    remainingPages,
    progressFraction,
  };
}
