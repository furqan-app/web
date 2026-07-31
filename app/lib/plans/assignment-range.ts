import type { TrackAssignment } from "./engine";

/**
 * True when `page` falls inside the assignment's inclusive page span. The one
 * home for this comparison — PlansWidget's "in range" highlight and anything
 * else must call it rather than re-inlining `>= rangeStart && <= rangeEnd`.
 */
export const isPageInAssignmentRange = (
  assignment: Pick<TrackAssignment, "rangeStart" | "rangeEnd">,
  page: number,
): boolean => page >= assignment.rangeStart && page <= assignment.rangeEnd;

/**
 * Stable identity for one plan-track's inline playback session — passed as
 * `play()`'s override `id` and compared against `activeOverride.id` so a row
 * can tell its own session from any other session reciting the same pages.
 */
export const planPlaybackSessionId = (planId: number, trackKey: string): string =>
  `plan:${planId}:${trackKey}`;
