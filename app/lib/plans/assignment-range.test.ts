import { describe, expect, it } from "vitest";
import {
  isPageInAssignmentRange,
  isAssignmentInRange,
  getPageRelevantAssignments,
  planPlaybackSessionId,
  type PlanVerseSpanResolver,
} from "./assignment-range";
import type { TrackAssignment } from "./engine";

const makeAssignment = (overrides: Partial<TrackAssignment> = {}): TrackAssignment => ({
  trackKey: "daily",
  activity: "read",
  unit: "page",
  rangeStart: 10,
  rangeEnd: 15,
  completed: false,
  ...overrides,
});

describe("isPageInAssignmentRange", () => {
  it("checks page-unit assignments against inclusive page range", () => {
    const assignment = makeAssignment({ unit: "page", rangeStart: 10, rangeEnd: 15 });
    expect(isPageInAssignmentRange(assignment, 9)).toBe(false);
    expect(isPageInAssignmentRange(assignment, 10)).toBe(true);
    expect(isPageInAssignmentRange(assignment, 13)).toBe(true);
    expect(isPageInAssignmentRange(assignment, 15)).toBe(true);
    expect(isPageInAssignmentRange(assignment, 16)).toBe(false);
  });

  it("checks single-page assignments", () => {
    const assignment = makeAssignment({ unit: "page", rangeStart: 25, rangeEnd: 25 });
    expect(isPageInAssignmentRange(assignment, 24)).toBe(false);
    expect(isPageInAssignmentRange(assignment, 25)).toBe(true);
    expect(isPageInAssignmentRange(assignment, 26)).toBe(false);
  });

  it("checks verse-unit assignments using pageVerseSpan", () => {
    const assignment = makeAssignment({ unit: "verse", rangeStart: 100, rangeEnd: 120 });
    // Page with verse span 90..105 overlaps 100..120
    expect(isPageInAssignmentRange(assignment, 10, { first: 90, last: 105 })).toBe(true);
    // Page with verse span 105..115 is fully contained in 100..120
    expect(isPageInAssignmentRange(assignment, 11, { first: 105, last: 115 })).toBe(true);
    // Page with verse span 115..130 overlaps 100..120
    expect(isPageInAssignmentRange(assignment, 12, { first: 115, last: 130 })).toBe(true);
    // Page with verse span 80..99 does not overlap
    expect(isPageInAssignmentRange(assignment, 8, { first: 80, last: 99 })).toBe(false);
    // Page with verse span 121..140 does not overlap
    expect(isPageInAssignmentRange(assignment, 13, { first: 121, last: 140 })).toBe(false);
  });

  it("returns false for verse-unit assignment if pageVerseSpan is undefined", () => {
    const assignment = makeAssignment({ unit: "verse", rangeStart: 100, rangeEnd: 120 });
    expect(isPageInAssignmentRange(assignment, 10, undefined)).toBe(false);
  });
});

describe("isAssignmentInRange", () => {
  const mockVerseIndex: PlanVerseSpanResolver = {
    pageVerseSpan: (p: number) => {
      if (p === 10) return { first: 90, last: 110 };
      if (p === 11) return { first: 111, last: 130 };
      return undefined;
    },
  };

  it("returns false when visiblePages is null and playback is idle", () => {
    const assignment = makeAssignment({ rangeStart: 10, rangeEnd: 15 });
    expect(isAssignmentInRange(assignment, null, null, false)).toBe(false);
  });

  it("checks read assignment against visiblePages", () => {
    const assignment = makeAssignment({ activity: "read", rangeStart: 10, rangeEnd: 15 });
    expect(isAssignmentInRange(assignment, [5], null, false)).toBe(false);
    expect(isAssignmentInRange(assignment, [10], null, false)).toBe(true);
    expect(isAssignmentInRange(assignment, [8, 9], null, false)).toBe(false);
    expect(isAssignmentInRange(assignment, [9, 10], null, false)).toBe(true);
  });

  it("checks listen track during active recitation against recitedPage", () => {
    const assignment = makeAssignment({
      activity: "listen",
      rangeStart: 20,
      rangeEnd: 25,
    });
    // While listening and active, recitedPage (22) is used even if visiblePages is [1]
    expect(isAssignmentInRange(assignment, [1], 22, true)).toBe(true);
    // If recitedPage is outside (30), false even if visiblePages has [1]
    expect(isAssignmentInRange(assignment, [1], 30, true)).toBe(false);
  });

  it("checks listen track when visiblePages is null and playback is active", () => {
    const assignment = makeAssignment({
      activity: "listen",
      rangeStart: 20,
      rangeEnd: 25,
    });
    // visiblePages is null, playback is active, recitedPage inside range -> true
    expect(isAssignmentInRange(assignment, null, 22, true)).toBe(true);
    // visiblePages is null, playback is active, recitedPage outside range -> false
    expect(isAssignmentInRange(assignment, null, 30, true)).toBe(false);
  });

  it("falls back to visiblePages for listen track when recitation is idle", () => {
    const assignment = makeAssignment({
      activity: "listen",
      rangeStart: 20,
      rangeEnd: 25,
    });
    // When idle (isPlaybackActive = false), visiblePages is checked
    expect(isAssignmentInRange(assignment, [21], 30, false)).toBe(true);
    expect(isAssignmentInRange(assignment, [5], 22, false)).toBe(false);
  });

  it("checks verse-unit assignment with verseIndex", () => {
    const assignment = makeAssignment({
      unit: "verse",
      rangeStart: 100,
      rangeEnd: 105,
    });
    expect(isAssignmentInRange(assignment, [10], null, false, mockVerseIndex)).toBe(true);
    expect(isAssignmentInRange(assignment, [11], null, false, mockVerseIndex)).toBe(false);
    expect(isAssignmentInRange(assignment, [12], null, false, mockVerseIndex)).toBe(false);
  });
});

describe("getPageRelevantAssignments", () => {
  const mockVerseIndex: PlanVerseSpanResolver = {
    pageVerseSpan: (p: number) => {
      if (p === 10) return { first: 90, last: 110 };
      if (p === 11) return { first: 111, last: 130 };
      return undefined;
    },
  };

  it("handles empty or null inputs gracefully", () => {
    expect(getPageRelevantAssignments(null, [10], null, false)).toEqual({
      relevant: [],
      pendingCount: 0,
      totalCount: 0,
      doneFraction: 0,
    });
    expect(getPageRelevantAssignments([], [10], null, false)).toEqual({
      relevant: [],
      pendingCount: 0,
      totalCount: 0,
      doneFraction: 0,
    });
    const plans = [
      {
        planId: 1,
        assignments: [makeAssignment({ rangeStart: 20, rangeEnd: 25 })],
      },
    ];
    expect(getPageRelevantAssignments(plans, null, null, false)).toEqual({
      relevant: [],
      pendingCount: 0,
      totalCount: 0,
      doneFraction: 0,
    });
  });

  it("filters page-unit assignments and tracks pending / done fraction", () => {
    const plans = [
      {
        planId: 1,
        assignments: [
          makeAssignment({ trackKey: "read-1", rangeStart: 10, rangeEnd: 15, completed: false }),
          makeAssignment({ trackKey: "read-out", rangeStart: 30, rangeEnd: 35, completed: false }),
        ],
      },
      {
        planId: 2,
        assignments: [
          makeAssignment({ trackKey: "read-2", rangeStart: 12, rangeEnd: 18, completed: true }),
        ],
      },
    ];

    const result = getPageRelevantAssignments(plans, [12], null, false);
    expect(result.totalCount).toBe(2);
    expect(result.pendingCount).toBe(1);
    expect(result.doneFraction).toBe(0.5);
    expect(result.relevant).toHaveLength(2);
    expect(result.relevant[0].assignment.trackKey).toBe("read-1");
    expect(result.relevant[1].assignment.trackKey).toBe("read-2");
  });

  it("correctly identifies all-done state (pendingCount === 0)", () => {
    const plans = [
      {
        planId: 1,
        assignments: [
          makeAssignment({ trackKey: "read-1", rangeStart: 10, rangeEnd: 15, completed: true }),
          makeAssignment({ trackKey: "read-2", rangeStart: 10, rangeEnd: 12, completed: true }),
        ],
      },
    ];

    const result = getPageRelevantAssignments(plans, [10], null, false);
    expect(result.totalCount).toBe(2);
    expect(result.pendingCount).toBe(0);
    expect(result.doneFraction).toBe(1);
  });

  it("handles verse-unit assignments via mock verseIndex", () => {
    const plans = [
      {
        planId: 1,
        assignments: [
          makeAssignment({
            trackKey: "hifz",
            unit: "verse",
            rangeStart: 100,
            rangeEnd: 105,
            completed: false,
          }),
        ],
      },
    ];

    // Page 10 has span 90..110 which overlaps 100..105
    const resOnPage10 = getPageRelevantAssignments(plans, [10], null, false, mockVerseIndex);
    expect(resOnPage10.totalCount).toBe(1);
    expect(resOnPage10.pendingCount).toBe(1);

    // Page 11 has span 111..130 which does not overlap 100..105
    const resOnPage11 = getPageRelevantAssignments(plans, [11], null, false, mockVerseIndex);
    expect(resOnPage11.totalCount).toBe(0);
    expect(resOnPage11.pendingCount).toBe(0);
  });

  it("prioritizes recitedPage for listen track during live recitation", () => {
    const plans = [
      {
        planId: 1,
        assignments: [
          makeAssignment({
            trackKey: "listen-track",
            activity: "listen",
            rangeStart: 50,
            rangeEnd: 55,
            completed: false,
          }),
        ],
      },
    ];

    // Reader looking at page 10, but recitedPage is 52 with active playback
    const result = getPageRelevantAssignments(plans, [10], 52, true);
    expect(result.totalCount).toBe(1);
    expect(result.pendingCount).toBe(1);
  });

  it("resolves listen track via recitedPage when visiblePages is null during live playback", () => {
    const plans = [
      {
        planId: 1,
        assignments: [
          makeAssignment({
            trackKey: "listen-track",
            activity: "listen",
            rangeStart: 50,
            rangeEnd: 55,
            completed: false,
          }),
        ],
      },
    ];

    // Inside range: recitedPage 52, visiblePages null -> relevant
    const resInside = getPageRelevantAssignments(plans, null, 52, true);
    expect(resInside.totalCount).toBe(1);
    expect(resInside.pendingCount).toBe(1);
    expect(resInside.relevant[0].assignment.trackKey).toBe("listen-track");

    // Outside range: recitedPage 60, visiblePages null -> not relevant
    const resOutside = getPageRelevantAssignments(plans, null, 60, true);
    expect(resOutside.totalCount).toBe(0);
    expect(resOutside.pendingCount).toBe(0);
    expect(resOutside.relevant).toHaveLength(0);
  });
});

describe("planPlaybackSessionId", () => {
  it("generates deterministic session identifier", () => {
    expect(planPlaybackSessionId(42, "tahdeer")).toBe("plan:42:tahdeer");
  });
});
