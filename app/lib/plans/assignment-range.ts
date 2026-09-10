import type { TrackAssignment } from "./engine";

/**
 * True when `page` falls inside the assignment's inclusive span. The one home
 * for this comparison — PlansWidget's "in range" highlight and anything else
 * must call it rather than re-inlining the range check.
 *
 * For a page-unit assignment this is a direct page-to-page-range comparison.
 * For a verse-unit assignment (ADR 0038) `rangeStart`/`rangeEnd` are verse
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

export type PlanVerseSpanResolver = {
  pageVerseSpan: (page: number) => { first: number; last: number } | undefined;
};

/**
 * Checks whether an assignment's range overlaps the current reader position.
 * - For "listen" activities with live playback, uses recitedPage.
 * - Otherwise (or if idle), checks against visiblePages.
 * - For verse-unit assignments, resolves page bounds via verseIndex.pageVerseSpan(page).
 */
export const isAssignmentInRange = (
  assignment: TrackAssignment,
  visiblePages: number[] | null,
  recitedPage: number | null,
  isPlaybackActive: boolean,
  verseIndex?: PlanVerseSpanResolver,
): boolean => {
  const span = (page: number) =>
    assignment.unit === "verse" ? verseIndex?.pageVerseSpan(page) : undefined;
  if (assignment.activity === "listen" && isPlaybackActive && recitedPage != null) {
    return isPageInAssignmentRange(assignment, recitedPage, span(recitedPage));
  }
  if (!visiblePages) return false;
  return visiblePages.some((p) => isPageInAssignmentRange(assignment, p, span(p)));
};

export type PageRelevantAssignment<
  TPlan extends { assignments: TrackAssignment[] } = { assignments: TrackAssignment[] }
> = {
  plan: TPlan;
  assignment: TrackAssignment;
};

export type PageRelevantResult<
  TPlan extends { assignments: TrackAssignment[] } = { assignments: TrackAssignment[] }
> = {
  relevant: PageRelevantAssignment<TPlan>[];
  pendingCount: number;
  totalCount: number;
  doneFraction: number;
};

/**
 * Filters today's plan assignments to those relevant to the current reader position,
 * computing totalCount, pendingCount, and doneFraction.
 * Pure function: no React, no hooks, no component imports.
 */
export const getPageRelevantAssignments = <
  TPlan extends { assignments: TrackAssignment[] } = { assignments: TrackAssignment[] }
>(
  todayPlans: TPlan[] | undefined | null,
  visiblePages: number[] | null,
  recitedPage: number | null,
  isPlaybackActive: boolean,
  verseIndex?: PlanVerseSpanResolver,
): PageRelevantResult<TPlan> => {
  if (!todayPlans || todayPlans.length === 0) {
    return {
      relevant: [],
      pendingCount: 0,
      totalCount: 0,
      doneFraction: 0,
    };
  }

  const relevant: PageRelevantAssignment<TPlan>[] = [];
  for (const plan of todayPlans) {
    for (const assignment of plan.assignments) {
      if (
        isAssignmentInRange(
          assignment,
          visiblePages,
          recitedPage,
          isPlaybackActive,
          verseIndex,
        )
      ) {
        relevant.push({ plan, assignment });
      }
    }
  }

  const totalCount = relevant.length;
  const pendingCount = relevant.filter((r) => !r.assignment.completed).length;
  const doneFraction = totalCount > 0 ? (totalCount - pendingCount) / totalCount : 0;

  return {
    relevant,
    pendingCount,
    totalCount,
    doneFraction,
  };
};

