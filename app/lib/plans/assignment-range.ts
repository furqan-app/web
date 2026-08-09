import type { TrackAssignment } from "./engine";

/**
 * True when `page` falls inside the assignment's inclusive span. The one home
 * for this comparison — PlansWidget's "in range" highlight and anything else
 * must call it rather than re-inlining the range check.
 *
 * For a page-unit assignment this is a direct page-to-page-range comparison.
 * For a verse-unit assignment (ADR 0037) `rangeStart`/`rangeEnd` are verse
 * ordinals, not pages, so a raw `page` can't be compared to them directly —
 * the caller must supply `pageVerseSpan`, the verse-ordinal span of that
 * page's own verses (from the client verse index), and this checks whether
 * that span overlaps the assignment's range. Returns `false` (no highlight)
 * for a verse-unit assignment when the span isn't available yet, rather than
 * guessing.
 */
export const isPageInAssignmentRange = (
  assignment: Pick<TrackAssignment, "rangeStart" | "rangeEnd" | "unit">,
  page: number,
  pageVerseSpan?: { first: number; last: number },
): boolean => {
  if (assignment.unit === "verse") {
    if (!pageVerseSpan) return false;
    return pageVerseSpan.last >= assignment.rangeStart && pageVerseSpan.first <= assignment.rangeEnd;
  }
  return page >= assignment.rangeStart && page <= assignment.rangeEnd;
};

/**
 * Stable identity for one plan-track's inline playback session — passed as
 * `play()`'s override `id` and compared against `activeOverride.id` so a row
 * can tell its own session from any other session reciting the same pages.
 */
export const planPlaybackSessionId = (planId: number, trackKey: string): string =>
  `plan:${planId}:${trackKey}`;
