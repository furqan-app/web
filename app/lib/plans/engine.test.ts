import { describe, expect, it } from "vitest";
import {
  deriveAssignments,
  type ProgressLogEntry,
  type TrackAssignment,
} from "@/app/lib/plans/engine";
import {
  MUSHAF_LAST_PAGE,
  PLAN_TEMPLATES,
  type PlanTemplate,
} from "@/app/constants/plans";

const TODAY = "2026-07-24";

const wird = PLAN_TEMPLATES["daily-wird"];

const entry = (
  track_key: string,
  date: string,
  start: number,
  end: number
): ProgressLogEntry => ({
  track_key,
  date,
  range_start: String(start),
  range_end: String(end),
});

const byTrack = (assignments: TrackAssignment[], key: string) =>
  assignments.find((a) => a.trackKey === key);

/** الحصون الخمسة-shaped template exercising all five rule kinds. */
const husun: PlanTemplate = {
  key: "husun",
  missedDayPolicy: "cursor",
  tracks: [
    {
      key: "tilawa",
      activity: "read",
      unit: "page",
      rule: {
        kind: "fixed_cycle",
        rangeStart: 1,
        rangeEnd: MUSHAF_LAST_PAGE,
        defaultUnitsPerDay: 20,
      },
    },
    {
      key: "hifz",
      activity: "memorize",
      unit: "page",
      rule: { kind: "cursor_advance", defaultUnitsPerDay: 1 },
    },
    {
      key: "tahdeer",
      activity: "listen",
      unit: "page",
      rule: { kind: "lookahead", sourceTrack: "hifz", repetitions: 10 },
    },
    {
      key: "qareeb",
      activity: "review",
      unit: "page",
      rule: { kind: "trailing_window", sourceTrack: "hifz", windowSize: 20 },
    },
    {
      key: "baeed",
      activity: "review",
      unit: "page",
      rule: {
        kind: "completed_cycle",
        sourceTrack: "hifz",
        defaultUnitsPerDay: 5,
        excludeTrailingWindow: 20,
      },
    },
  ],
};

describe("fixed_cycle", () => {
  it("assigns the first N pages on day one", () => {
    const [a] = deriveAssignments(wird, {}, [], TODAY);
    expect(a).toMatchObject({
      trackKey: "reading",
      activity: "read",
      rangeStart: 1,
      rangeEnd: 5,
      completed: false,
    });
  });

  it("honors the enrollment quantity override", () => {
    const [a] = deriveAssignments(wird, { quantities: { reading: 10 } }, [], TODAY);
    expect(a).toMatchObject({ rangeStart: 1, rangeEnd: 10 });
  });

  it("honors startPage on a fresh enrollment", () => {
    const [a] = deriveAssignments(wird, { startPage: 100 }, [], TODAY);
    expect(a).toMatchObject({ rangeStart: 100, rangeEnd: 104 });
  });

  it("resumes after the last logged entry regardless of missed days (cursor policy, D4)", () => {
    // Last check-off was 10 days ago — the plan shifts, no debt.
    const log = [entry("reading", "2026-07-14", 6, 10)];
    const [a] = deriveAssignments(wird, {}, log, TODAY);
    expect(a).toMatchObject({ rangeStart: 11, rangeEnd: 15 });
  });

  it("clamps the assignment at the end of the range", () => {
    const log = [entry("reading", "2026-07-23", 597, 601)];
    const [a] = deriveAssignments(wird, {}, log, TODAY);
    expect(a).toMatchObject({ rangeStart: 602, rangeEnd: MUSHAF_LAST_PAGE });
  });

  it("wraps to the start after completing the range (next khatma)", () => {
    const log = [entry("reading", "2026-07-23", 598, MUSHAF_LAST_PAGE)];
    const [a] = deriveAssignments(wird, {}, log, TODAY);
    expect(a).toMatchObject({ rangeStart: 1, rangeEnd: 5 });
  });

  it("advances through the second khatma from the latest entry, not the peak", () => {
    // A completed first khatma (…–604) plus a later wrap entry (1–5): the
    // cursor must resume from the latest position, not the highest ever logged.
    const log = [
      entry("reading", "2026-07-01", 600, MUSHAF_LAST_PAGE),
      entry("reading", "2026-07-23", 1, 5),
    ];
    const [a] = deriveAssignments(wird, {}, log, TODAY);
    expect(a).toMatchObject({ rangeStart: 6, rangeEnd: 10 });
  });

  it("marks the track completed when today's entry exists", () => {
    const log = [entry("reading", TODAY, 1, 5)];
    const [a] = deriveAssignments(wird, {}, log, TODAY);
    expect(a.completed).toBe(true);
  });

  it("ignores malformed (non-numeric) log entries", () => {
    const log: ProgressLogEntry[] = [
      { track_key: "reading", date: "2026-07-20", range_start: "x", range_end: "y" },
    ];
    const [a] = deriveAssignments(wird, {}, log, TODAY);
    expect(a).toMatchObject({ rangeStart: 1, rangeEnd: 5 });
  });
});

describe("calendar missed-day policy", () => {
  const calendarWird: PlanTemplate = {
    ...wird,
    key: "calendar-wird",
    missedDayPolicy: "calendar",
  };

  it("spreads the remaining range over the remaining days", () => {
    // 30 pages left (575–604), 3 days including today → 10/day.
    const log = [entry("reading", "2026-07-22", 570, 574)];
    const [a] = deriveAssignments(
      calendarWird,
      { endDate: "2026-07-26" },
      log,
      TODAY
    );
    expect(a).toMatchObject({ rangeStart: 575, rangeEnd: 584 });
  });

  it("assigns everything remaining when past the end date", () => {
    const log = [entry("reading", "2026-07-20", 1, 594)];
    const [a] = deriveAssignments(
      calendarWird,
      { endDate: "2026-07-23" },
      log,
      TODAY
    );
    expect(a).toMatchObject({ rangeStart: 595, rangeEnd: MUSHAF_LAST_PAGE });
  });

  it("falls back to the default quantity when endDate is missing", () => {
    const [a] = deriveAssignments(calendarWird, {}, [], TODAY);
    expect(a).toMatchObject({ rangeStart: 1, rangeEnd: 5 });
  });

  it("falls back to the base quantity when endDate is malformed", () => {
    const [a] = deriveAssignments(
      calendarWird,
      { endDate: "not-a-date" },
      [],
      TODAY
    );
    expect(a).toMatchObject({ rangeStart: 1, rangeEnd: 5 });
  });
});

describe("cursor_advance", () => {
  it("bounds the cursor by targetStart/targetEnd params", () => {
    const assignments = deriveAssignments(
      husun,
      { targetStart: 582, targetEnd: 604 },
      [],
      TODAY
    );
    expect(byTrack(assignments, "hifz")).toMatchObject({
      rangeStart: 582,
      rangeEnd: 582,
    });
  });

  it("clamps at targetEnd", () => {
    const log = [entry("hifz", "2026-07-23", 600, 603)];
    const assignments = deriveAssignments(
      husun,
      { targetEnd: 604, quantities: { hifz: 5 } },
      log,
      TODAY
    );
    expect(byTrack(assignments, "hifz")).toMatchObject({
      rangeStart: 604,
      rangeEnd: 604,
    });
  });

  it("is omitted once the target is fully memorized", () => {
    const log = [entry("hifz", "2026-07-23", 600, 604)];
    const assignments = deriveAssignments(husun, { targetEnd: 604 }, log, TODAY);
    expect(byTrack(assignments, "hifz")).toBeUndefined();
  });
});

describe("trailing_window", () => {
  it("is absent before the source track has any progress", () => {
    const assignments = deriveAssignments(husun, {}, [], TODAY);
    expect(byTrack(assignments, "qareeb")).toBeUndefined();
  });

  it("covers the last W pages the source completed", () => {
    const log = [entry("hifz", "2026-07-01", 1, 30)];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "qareeb")).toMatchObject({
      rangeStart: 11,
      rangeEnd: 30,
    });
  });

  it("clamps at the source's earliest page when less than W is memorized", () => {
    const log = [entry("hifz", "2026-07-01", 1, 8)];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "qareeb")).toMatchObject({
      rangeStart: 1,
      rangeEnd: 8,
    });
  });
});

describe("completed_cycle", () => {
  it("is absent while everything memorized is still inside the trailing window", () => {
    const log = [entry("hifz", "2026-07-01", 1, 15)];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "baeed")).toBeUndefined();
  });

  it("cycles through the region behind the trailing window", () => {
    const log = [entry("hifz", "2026-07-01", 1, 30)]; // region = 1–10
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "baeed")).toMatchObject({
      rangeStart: 1,
      rangeEnd: 5,
    });
  });

  it("advances its own cursor and clamps at the region end", () => {
    const log = [
      entry("hifz", "2026-07-01", 1, 30), // region = 1–10
      entry("baeed", "2026-07-23", 1, 8),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "baeed")).toMatchObject({
      rangeStart: 9,
      rangeEnd: 10,
    });
  });

  it("wraps within the region after covering it", () => {
    const log = [
      entry("hifz", "2026-07-01", 1, 30), // region = 1–10
      entry("baeed", "2026-07-23", 6, 10),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "baeed")).toMatchObject({
      rangeStart: 1,
      rangeEnd: 5,
    });
  });

  it("re-cycles from the latest position after wrapping the region", () => {
    // First pass reached 6–10, then wrapped to 1–5 on a later date: the next
    // assignment must continue at 6–10, not restart from the region top.
    const log = [
      entry("hifz", "2026-07-01", 1, 30), // region = 1–10
      entry("baeed", "2026-07-10", 6, 10),
      entry("baeed", "2026-07-23", 1, 5),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "baeed")).toMatchObject({
      rangeStart: 6,
      rangeEnd: 10,
    });
  });
});

describe("lookahead", () => {
  it("previews tomorrow's source portion with repetitions", () => {
    const log = [entry("hifz", "2026-07-23", 30, 30)];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    // hifz today = 31, so tahdeer prepares 32.
    expect(byTrack(assignments, "tahdeer")).toMatchObject({
      rangeStart: 32,
      rangeEnd: 32,
      repetitions: 10,
      activity: "listen",
    });
  });

  it("starts after the logged range when the source was already checked off today", () => {
    const log = [entry("hifz", TODAY, 31, 31)];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "tahdeer")).toMatchObject({
      rangeStart: 32,
      rangeEnd: 32,
    });
  });

  it("is absent when there is nothing left to prepare", () => {
    const log = [entry("hifz", TODAY, 603, 604)];
    const assignments = deriveAssignments(husun, { targetEnd: 604 }, log, TODAY);
    expect(byTrack(assignments, "tahdeer")).toBeUndefined();
  });
});

describe("full الحصون الخمسة derivation", () => {
  it("matches the plan's verified 30-days-of-hifz scenario", () => {
    const log = Array.from({ length: 30 }, (_, i) =>
      entry("hifz", `2026-06-${String(i + 1).padStart(2, "0")}`, i + 1, i + 1)
    );
    const assignments = deriveAssignments(husun, {}, log, TODAY);

    expect(byTrack(assignments, "tilawa")).toMatchObject({ rangeStart: 1, rangeEnd: 20 });
    expect(byTrack(assignments, "hifz")).toMatchObject({ rangeStart: 31, rangeEnd: 31 });
    expect(byTrack(assignments, "tahdeer")).toMatchObject({
      rangeStart: 32,
      rangeEnd: 32,
      repetitions: 10,
    });
    expect(byTrack(assignments, "qareeb")).toMatchObject({ rangeStart: 11, rangeEnd: 30 });
    expect(byTrack(assignments, "baeed")).toMatchObject({ rangeStart: 1, rangeEnd: 5 });
  });

  it("has no review/lookahead noise on day one", () => {
    const assignments = deriveAssignments(husun, {}, [], TODAY);
    expect(assignments.map((a) => a.trackKey).sort()).toEqual([
      "hifz",
      "tahdeer",
      "tilawa",
    ]);
  });
});
