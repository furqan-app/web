import { describe, expect, it } from "vitest";
import {
  deriveAssignments,
  withNextPreview,
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

  it("echoes today's own logged range instead of advancing the cursor", () => {
    // Without the fix this would show 6-10 (the next cursor position) while
    // still marked completed=true from the 1-5 entry.
    const log = [entry("reading", TODAY, 1, 5)];
    const [a] = deriveAssignments(wird, {}, log, TODAY);
    expect(a).toMatchObject({ rangeStart: 1, rangeEnd: 5, completed: true });
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

  it("echoes today's own logged range instead of advancing the cursor", () => {
    const log = [entry("hifz", TODAY, 31, 31)];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "hifz")).toMatchObject({
      rangeStart: 31,
      rangeEnd: 31,
      completed: true,
    });
  });

  it("still shows completed=true for the final entry even once the target is exhausted", () => {
    // Logging the final page today must not make the row vanish (would
    // happen if the "fully memorized -> null" branch ran before the
    // today-entry short-circuit).
    const log = [entry("hifz", TODAY, 604, 604)];
    const assignments = deriveAssignments(husun, { targetEnd: 604 }, log, TODAY);
    expect(byTrack(assignments, "hifz")).toMatchObject({
      rangeStart: 604,
      rangeEnd: 604,
      completed: true,
    });
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

  it("echoes today's own logged range instead of recomputing the window", () => {
    // hifz keeps advancing after qareeb's own check-off; qareeb's row must
    // stay put at what was actually logged, not shift with hifz.
    const log = [
      entry("hifz", "2026-07-01", 1, 30),
      entry("qareeb", TODAY, 11, 30),
      entry("hifz", TODAY, 31, 31),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "qareeb")).toMatchObject({
      rangeStart: 11,
      rangeEnd: 30,
      completed: true,
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

  it("echoes today's own logged range instead of advancing its own cursor", () => {
    const log = [
      entry("hifz", "2026-07-01", 1, 30), // region = 1–10
      entry("baeed", TODAY, 1, 5),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "baeed")).toMatchObject({
      rangeStart: 1,
      rangeEnd: 5,
      completed: true,
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

  it("echoes tahdeer's own logged range instead of recomputing from hifz", () => {
    // tahdeer was already checked off today (prepared 32); hifz then also
    // advances today. tahdeer's row must stay at what it actually logged,
    // not shift because its source moved.
    const log = [
      entry("hifz", "2026-07-23", 30, 30),
      entry("tahdeer", TODAY, 32, 32),
      entry("hifz", TODAY, 31, 31),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    expect(byTrack(assignments, "tahdeer")).toMatchObject({
      rangeStart: 32,
      rangeEnd: 32,
      completed: true,
    });
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

describe("withNextPreview", () => {
  it("attaches next=6-10 for a completed fixed_cycle row", () => {
    const log = [entry("reading", TODAY, 1, 5)];
    const assignments = deriveAssignments(wird, {}, log, TODAY);
    const withNext = withNextPreview(wird, {}, log, TODAY, assignments);
    expect(withNext[0]).toMatchObject({
      rangeStart: 1,
      rangeEnd: 5,
      completed: true,
      next: { rangeStart: 6, rangeEnd: 10 },
    });
  });

  it("omits next when cursor_advance is exhausted", () => {
    const log = [entry("hifz", TODAY, 604, 604)];
    const params = { targetEnd: 604 };
    const assignments = deriveAssignments(husun, params, log, TODAY);
    const withNext = withNextPreview(husun, params, log, TODAY, assignments);
    expect(byTrack(withNext, "hifz")).toMatchObject({ completed: true });
    expect(byTrack(withNext, "hifz")?.next).toBeUndefined();
  });

  it("previews qareeb's next window shifted by hifz's own next-day advance", () => {
    const log = [
      entry("hifz", "2026-07-01", 1, 30), // region so far: 1-30
      entry("qareeb", TODAY, 11, 30),
      entry("hifz", TODAY, 31, 31),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    const withNext = withNextPreview(husun, {}, log, TODAY, assignments);
    // trailing_window reads the source's actually-LOGGED lastEnd/minStart
    // (not a hypothetical D+1 cursor), so the preview reflects hifz's real
    // position today (31) that qareeb hasn't "reviewed" yet: window = 12-31.
    expect(byTrack(withNext, "qareeb")).toMatchObject({
      rangeStart: 11,
      rangeEnd: 30,
      completed: true,
      next: { rangeStart: 12, rangeEnd: 31 },
    });
  });

  it("previews tahdeer's next portion two steps ahead of today's hifz", () => {
    const log = [
      entry("hifz", "2026-07-23", 30, 30),
      entry("tahdeer", TODAY, 32, 32),
      entry("hifz", TODAY, 31, 31),
    ];
    const assignments = deriveAssignments(husun, {}, log, TODAY);
    const withNext = withNextPreview(husun, {}, log, TODAY, assignments);
    expect(byTrack(withNext, "tahdeer")).toMatchObject({
      rangeStart: 32,
      rangeEnd: 32,
      completed: true,
      next: { rangeStart: 33, rangeEnd: 33, repetitions: 10 },
    });
  });

  it("leaves incomplete rows untouched", () => {
    const assignments = deriveAssignments(wird, {}, [], TODAY);
    const withNext = withNextPreview(wird, {}, [], TODAY, assignments);
    expect(withNext[0].completed).toBe(false);
    expect(withNext[0].next).toBeUndefined();
  });
});

describe("PLAN_TEMPLATES shape", () => {
  it("every sourceTrack resolves to a fixed_cycle/cursor_advance track in the same template", () => {
    for (const template of Object.values(PLAN_TEMPLATES)) {
      const byKey = new Map(template.tracks.map((t) => [t.key, t]));
      for (const track of template.tracks) {
        const rule = track.rule;
        if (!("sourceTrack" in rule)) continue;
        const source = byKey.get(rule.sourceTrack);
        expect(
          source,
          `${template.key}.${track.key} sourceTrack "${rule.sourceTrack}" not found`
        ).toBeDefined();
        expect(
          source!.rule.kind === "fixed_cycle" || source!.rule.kind === "cursor_advance",
          `${template.key}.${track.key} sourceTrack "${rule.sourceTrack}" must be fixed_cycle/cursor_advance, got "${source!.rule.kind}"`
        ).toBe(true);
      }
    }
  });

  it("every fixed_cycle range stays within the mushaf", () => {
    for (const template of Object.values(PLAN_TEMPLATES)) {
      for (const track of template.tracks) {
        if (track.rule.kind !== "fixed_cycle") continue;
        expect(track.rule.rangeStart).toBeGreaterThanOrEqual(1);
        expect(track.rule.rangeEnd).toBeLessThanOrEqual(MUSHAF_LAST_PAGE);
        expect(track.rule.rangeStart).toBeLessThanOrEqual(track.rule.rangeEnd);
      }
    }
  });
});

// Verse-unit enrollments (ADR 0037) — same rule kinds, verse-ordinal math.
// params.unit: "verse" is enrollment-wide; every track in the enrollment
// shares it.
describe("verse-unit (ADR 0037)", () => {
  it("fixed_cycle: assigns the first N verses on day one, whole-mushaf bounds become 1-6236", () => {
    const [a] = deriveAssignments(wird, { unit: "verse", quantities: { reading: 6 } }, [], TODAY);
    expect(a).toMatchObject({ trackKey: "reading", unit: "verse", rangeStart: 1, rangeEnd: 6 });
  });

  it("fixed_cycle: crosses a surah boundary as a plain ordinal, no special-casing", () => {
    // Al-Fatiha has 7 verses (ordinals 1-7); a check-off of 1-6 leaves the
    // cursor at 7, so the next day's range (6/day) is 7-12 — verse 7 is
    // 1:7, verses 8-12 are 2:1-2:5.
    const log = [entry("reading", "2026-07-23", 1, 6)];
    const [a] = deriveAssignments(
      wird,
      { unit: "verse", quantities: { reading: 6 } },
      log,
      TODAY
    );
    expect(a).toMatchObject({ rangeStart: 7, rangeEnd: 12 });
  });

  it("fixed_cycle: today's own entry is echoed verbatim, not recomputed (unit carried through)", () => {
    const log = [entry("reading", TODAY, 1, 6)];
    const [a] = deriveAssignments(
      wird,
      { unit: "verse", quantities: { reading: 6 } },
      log,
      TODAY
    );
    expect(a).toMatchObject({ unit: "verse", rangeStart: 1, rangeEnd: 6, completed: true });
  });

  it("fixed_cycle: a {unit:'pages'} fractional override resolves from the current page's own verse count", () => {
    // Page 1 (Al-Fatiha) has 7 verses; 0.5 pages/day -> round(7*0.5) = 4 (Math.floor via clampQuantity).
    const [a] = deriveAssignments(
      wird,
      { unit: "verse", quantities: { reading: { unit: "pages", amount: 0.5 } } },
      [],
      TODAY
    );
    expect(a).toMatchObject({ rangeStart: 1, rangeEnd: 4 });
  });

  it("fixed_cycle: the fractional-page override recomputes from whichever page the cursor starts on next", () => {
    // Cursor now at verse 5 (still page 1, 7 verses) -> same page, same
    // 0.5-of-7 pace -> quantity stays 4, but only 3 verses remain on page 1
    // (5,6,7), so the range spills 1 verse onto page 2.
    const log = [entry("reading", "2026-07-23", 1, 4)];
    const [a] = deriveAssignments(
      wird,
      { unit: "verse", quantities: { reading: { unit: "pages", amount: 0.5 } } },
      log,
      TODAY
    );
    expect(a).toMatchObject({ rangeStart: 5, rangeEnd: 8 });
  });

  it("cursor_advance: target range resolved from pages to verse ordinals stays exhaustible the same way", () => {
    // hifz target = page 1 only (verse ordinals 1-7, Al-Fatiha).
    const params = { unit: "verse" as const, targetStart: 1, targetEnd: 7, quantities: { hifz: 7 } };
    const [first] = deriveAssignments(husun, params, [], TODAY).filter((a) => a.trackKey === "hifz");
    expect(first).toMatchObject({ rangeStart: 1, rangeEnd: 7 });

    const log = [entry("hifz", "2026-07-23", 1, 7)];
    const hifz = byTrack(deriveAssignments(husun, params, log, TODAY), "hifz");
    expect(hifz).toBeUndefined(); // target fully memorized
  });

  it("trailing_window: windowSize converts to a verse-equivalent default when no override is set", () => {
    // hifz cursor_advance with no explicit quantity -> default 1 page/day
    // becomes toVerseEquivalent(1) verses/day; qareeb's windowSize (20 pages)
    // becomes toVerseEquivalent(20) verses. Just assert the window is a
    // verse-scale number, not literally 20 (the page-mode constant).
    const log = [entry("hifz", "2026-07-01", 1, 100)];
    const params = { unit: "verse" as const, targetStart: 1, targetEnd: 500 };
    const qareeb = byTrack(deriveAssignments(husun, params, log, TODAY), "qareeb");
    expect(qareeb).toBeDefined();
    expect(qareeb!.rangeEnd).toBe(100);
    expect(qareeb!.rangeEnd - qareeb!.rangeStart + 1).toBeGreaterThan(20); // verse-scale, not page-scale
  });

  it("page-unit enrollments (no params.unit) are completely unaffected", () => {
    const [a] = deriveAssignments(wird, {}, [], TODAY);
    expect(a).toMatchObject({ unit: "page", rangeStart: 1, rangeEnd: 5 });
  });
});
