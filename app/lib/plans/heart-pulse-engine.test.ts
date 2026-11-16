import { describe, expect, it } from "vitest";
import { deriveAssignments, heartPulseStepRange } from "./engine";
import { resolvePlanParams } from "./validate-params";
import { getPlanTemplate } from "@/app/constants/plans";

describe("heart-pulse engine derivation", () => {
  const template = getPlanTemplate("heart-pulse")!;

  it("filters out inactive tracks based on activeTracks param", () => {
    const params = {
      activeTracks: ["hifz"],
      targetPages: [603, 602, 601],
      slippingPages: [604],
      quantities: { hifz: 1 },
    };

    const assignments = deriveAssignments(template, params, [], "2026-11-12");

    expect(assignments).toHaveLength(1);
    expect(assignments[0].trackKey).toBe("hifz");
    expect(assignments[0].rangeStart).toBe(603);
    expect(assignments[0].rangeEnd).toBe(603);
  });

  it("advances hifz through targetPages and completes when exhausted", () => {
    const params = {
      activeTracks: ["hifz"],
      targetPages: [603, 602],
      quantities: { hifz: 1 },
    };

    // Day 1
    const day1 = deriveAssignments(template, params, [], "2026-11-12");
    expect(day1[0].rangeStart).toBe(603);
    expect(day1[0].rangeEnd).toBe(603);

    // Day 2 (after day 1 is logged)
    const entries = [
      {
        track_key: "hifz",
        date: "2026-11-12",
        range_start: "603",
        range_end: "603",
      },
    ];
    const day2 = deriveAssignments(template, params, entries, "2026-11-13");
    expect(day2[0].rangeStart).toBe(602);
    expect(day2[0].rangeEnd).toBe(602);

    // Day 3 (after day 2 is logged: target exhausted)
    const entriesAll = [
      ...entries,
      {
        track_key: "hifz",
        date: "2026-11-13",
        range_start: "602",
        range_end: "602",
      },
    ];
    const day3 = deriveAssignments(template, params, entriesAll, "2026-11-14");
    expect(day3).toHaveLength(0);
  });

  it("idles motafallit when slippingPages is empty or exhausted", () => {
    const paramsEmpty = {
      activeTracks: ["hifz", "motafallit"],
      targetPages: [603],
      slippingPages: [],
    };

    const assignments = deriveAssignments(template, paramsEmpty, [], "2026-11-12");
    // motafallit yields nothing; only hifz produces an assignment
    expect(assignments).toHaveLength(1);
    expect(assignments[0].trackKey).toBe("hifz");

    // When slipping pages exist
    const paramsWithSlipping = {
      activeTracks: ["hifz", "motafallit"],
      targetPages: [603],
      slippingPages: [604, 590],
      quantities: { motafallit: 2 },
    };
    const day1 = deriveAssignments(template, paramsWithSlipping, [], "2026-11-12");
    expect(day1).toHaveLength(2);
    const motafallitDay1 = day1.find((a) => a.trackKey === "motafallit")!;
    expect(motafallitDay1.rangeStart).toBe(590);
    expect(motafallitDay1.rangeEnd).toBe(604);

    // After logging both slipping pages
    const entries = [
      {
        track_key: "motafallit",
        date: "2026-11-12",
        range_start: "590",
        range_end: "604",
      },
    ];
    const day2 = deriveAssignments(template, paramsWithSlipping, entries, "2026-11-13");
    // motafallit exhausted -> returns no assignment, hifz remains
    expect(day2.find((a) => a.trackKey === "motafallit")).toBeUndefined();
  });

  it("handles 0.5 page pace by advancing one page every 2 completed entries", () => {
    const params = {
      activeTracks: ["hifz"],
      targetPages: [604, 603],
      quantities: { hifz: 0.5 },
    };

    // Day 1: 0 entries -> assigned page 604
    const day1 = deriveAssignments(template, params, [], "2026-11-12");
    expect(day1[0].rangeStart).toBe(604);
    expect(day1[0].rangeEnd).toBe(604);

    // Day 2: 1 entry logged -> still on page 604 (second half)
    const entry1 = [
      {
        track_key: "hifz",
        date: "2026-11-12",
        range_start: "604",
        range_end: "604",
      },
    ];
    const day2 = deriveAssignments(template, params, entry1, "2026-11-13");
    expect(day2[0].rangeStart).toBe(604);
    expect(day2[0].rangeEnd).toBe(604);

    // Day 3: 2 entries logged -> page 604 completed, now advances to page 603
    const entry2 = [
      ...entry1,
      {
        track_key: "hifz",
        date: "2026-11-13",
        range_start: "604",
        range_end: "604",
      },
    ];
    const day3 = deriveAssignments(template, params, entry2, "2026-11-14");
    expect(day3[0].rangeStart).toBe(603);
    expect(day3[0].rangeEnd).toBe(603);
  });

  it("handles fractional quantities for qareeb trailing window (0.5 and 1.5 pages)", () => {
    const params05 = {
      activeTracks: ["hifz", "qareeb"],
      targetPages: [604, 603],
      quantities: { hifz: 1, qareeb: 0.5 },
    };

    const entries = [
      {
        track_key: "hifz",
        date: "2026-11-12",
        range_start: "604",
        range_end: "604",
      },
      {
        track_key: "hifz",
        date: "2026-11-13",
        range_start: "603",
        range_end: "603",
      },
    ];

    // qareeb with windowSize 0.5 -> covers Math.ceil(0.5) = 1 page (the latest completed page 603)
    const day1 = deriveAssignments(template, params05, entries, "2026-11-14");
    const qareeb05 = day1.find((a) => a.trackKey === "qareeb")!;
    expect(qareeb05.rangeStart).toBe(603);
    expect(qareeb05.rangeEnd).toBe(603);

    // qareeb with windowSize 1.5 -> covers Math.ceil(1.5) = 2 pages (pages 603 and 604)
    const params15 = {
      ...params05,
      quantities: { hifz: 1, qareeb: 1.5 },
    };
    const day2 = deriveAssignments(template, params15, entries, "2026-11-14");
    const qareeb15 = day2.find((a) => a.trackKey === "qareeb")!;
    expect(qareeb15.rangeStart).toBe(603);
    expect(qareeb15.rangeEnd).toBe(604);
  });

  it("advances step-by-step across shared physical pages and scattered motafallit pages", () => {
    const params = {
      activeTracks: ["hifz", "motafallit"],
      // Page 604 shared by 3 surahs (114, 113, 112), then 603
      targetPages: [604, 604, 604, 603],
      // Scattered slipping pages with dailyUnits=2
      slippingPages: [604, 590, 580],
      quantities: { hifz: 1, motafallit: 2 },
    };

    const day1 = deriveAssignments(template, params, [], "2026-11-12");
    expect(day1.find((a) => a.trackKey === "motafallit")).toMatchObject({
      rangeStart: 590,
      rangeEnd: 604,
    });

    // After 1 motafallit entry (2 queue items), the 3rd item (580) is still derived (does not jump 15)
    const entries = [
      { track_key: "hifz", date: "2026-11-12", range_start: "604", range_end: "604" },
      { track_key: "motafallit", date: "2026-11-12", range_start: "590", range_end: "604" },
    ];
    const day2 = deriveAssignments(template, params, entries, "2026-11-13");
    expect(day2.find((a) => a.trackKey === "hifz")).toMatchObject({
      rangeStart: 604,
      rangeEnd: 604,
    });
    expect(day2.find((a) => a.trackKey === "motafallit")).toMatchObject({
      rangeStart: 580,
      rangeEnd: 580,
    });
  });

  it("respects queueBaseline after re-snapshotting on edit so prior entries do not skip new pages", () => {
    const entriesBeforeEdit = [
      { track_key: "hifz", date: "2026-11-10", range_start: "604", range_end: "604" },
      { track_key: "hifz", date: "2026-11-11", range_start: "603", range_end: "603" },
    ];
    // Re-snapshotted params after editing: new queue starts at 602, baseline = 2
    const editedParams = {
      activeTracks: ["hifz"],
      targetPages: [602, 601],
      quantities: { hifz: 1 },
      queueBaseline: { hifz: 2 },
    };

    const nextDay = deriveAssignments(template, editedParams, entriesBeforeEdit, "2026-11-12");
    expect(nextDay).toHaveLength(1);
    expect(nextDay[0]).toMatchObject({ rangeStart: 602, rangeEnd: 602 });
  });

  it("keeps tahdeer lookahead in parity with 0.5 page/day hifz pace", () => {
    const params = {
      activeTracks: ["hifz", "tahdeer"],
      targetPages: [604, 603, 602],
      quantities: { hifz: 0.5, tahdeer: 3 },
    };

    // Day 1 (0 entries): hifz is on 604 (1st half), tomorrow is STILL 604 (2nd half)
    const day1 = deriveAssignments(template, params, [], "2026-11-12");
    expect(day1.find((a) => a.trackKey === "tahdeer")).toMatchObject({
      rangeStart: 604,
      rangeEnd: 604,
      repetitions: 3,
    });

    // Day 2 (1 entry): hifz is on 604 (2nd half), tomorrow advances to 603
    const day2Entries = [
      { track_key: "hifz", date: "2026-11-12", range_start: "604", range_end: "604" },
    ];
    const day2 = deriveAssignments(template, params, day2Entries, "2026-11-13");
    expect(day2.find((a) => a.trackKey === "tahdeer")).toMatchObject({
      rangeStart: 603,
      rangeEnd: 603,
    });
  });

  it("validates heart-pulse params at API boundary", async () => {
    const valid = await resolvePlanParams(
      {
        params: {
          direction: "ascending",
          activeTracks: ["hifz", "motafallit", "qareeb"],
          quantities: { hifz: 0.5, motafallit: 1.5, qareeb: 0.5 },
          targetPages: [604, 603],
          targetQueue: [
            { chapterId: 114, pageNumber: 604 },
            { chapterId: 111, pageNumber: 603 },
          ],
          slippingPages: [602],
          slippingQueue: [{ chapterId: 109, pageNumber: 602 }],
        },
      },
      template
    );
    expect("params" in valid).toBe(true);

    const badDir = await resolvePlanParams(
      { params: { direction: "sideways" as "ascending" } },
      template
    );
    expect("error" in badDir).toBe(true);

    const badUnit = await resolvePlanParams(
      { params: { trackUnits: { hifz: "verse" } } },
      template
    );
    expect("error" in badUnit).toBe(true);

    const badPage = await resolvePlanParams(
      { params: { targetPages: [999] } },
      template
    );
    expect("error" in badPage).toBe(true);

    const allMastered = await resolvePlanParams(
      {
        params: {
          activeTracks: ["hifz"],
          targetPages: [],
          slippingPages: [],
        },
      },
      template
    );
    expect("error" in allMastered).toBe(true);

    const qareebWithoutHifz = await resolvePlanParams(
      {
        params: {
          activeTracks: ["motafallit", "qareeb"],
          targetPages: [],
          slippingPages: [604],
        },
      },
      template
    );
    expect("error" in qareebWithoutHifz).toBe(true);

    const khatemWithSlippingOnly = await resolvePlanParams(
      {
        params: {
          activeTracks: ["motafallit"],
          targetPages: [],
          slippingPages: [604],
          slippingQueue: [{ pageNumber: 604, chapterId: 112 }],
        },
      },
      template
    );
    expect("params" in khatemWithSlippingOnly).toBe(true);

    const missingQueue = await resolvePlanParams(
      {
        params: {
          activeTracks: ["hifz"],
          targetPages: [604],
        },
      },
      template
    );
    expect("error" in missingQueue).toBe(true);

    const emptyTracks = await resolvePlanParams(
      {
        params: {
          activeTracks: [],
          targetPages: [604],
          targetQueue: [{ pageNumber: 604, chapterId: 112 }],
        },
      },
      template
    );
    expect("error" in emptyTracks).toBe(true);

    const dailyWirdTemplate = getPlanTemplate("daily-wird")!;
    const activeTracksOnDaily = await resolvePlanParams(
      { params: { activeTracks: ["reading"] } },
      dailyWirdTemplate
    );
    expect("error" in activeTracksOnDaily).toBe(true);
  });

  it("derives qareeb trailing window accurately in ascending direction across multiple daily entries", () => {
    const params = {
      activeTracks: ["hifz", "qareeb"],
      targetPages: [604, 603, 602, 601, 600],
      quantities: { hifz: 1, qareeb: 3 },
    };

    const entries = [
      { track_key: "hifz", date: "2026-11-12", range_start: "604", range_end: "604" },
      { track_key: "hifz", date: "2026-11-13", range_start: "603", range_end: "603" },
      { track_key: "hifz", date: "2026-11-14", range_start: "602", range_end: "602" },
    ];

    const day4 = deriveAssignments(template, params, entries, "2026-11-15");
    const qareeb = day4.find((a) => a.trackKey === "qareeb")!;
    expect(qareeb.rangeStart).toBe(602);
    expect(qareeb.rangeEnd).toBe(604);
  });

  it("handles 1.5 pages/day pace uniformly in both engine derivation and heartPulseStepRange sync", () => {
    const params = {
      activeTracks: ["hifz"],
      targetPages: [604, 603, 602, 601],
      quantities: { hifz: 1.5 },
    };

    // Day 1: 0 entries -> floor(1*1.5) - floor(0*1.5) = 1 page (604)
    const day1 = deriveAssignments(template, params, [], "2026-11-12");
    expect(day1[0]).toMatchObject({ rangeStart: 604, rangeEnd: 604 });
    expect(heartPulseStepRange(1, 1.5)).toEqual({ startIndex: 0, endIndex: 1 });

    // Day 2: 1 entry -> floor(2*1.5) - floor(1*1.5) = 2 pages (603, 602)
    const day1Entry = [{ track_key: "hifz", date: "2026-11-12", range_start: "604", range_end: "604" }];
    const day2 = deriveAssignments(template, params, day1Entry, "2026-11-13");
    expect(day2[0]).toMatchObject({ rangeStart: 602, rangeEnd: 603 });
    expect(heartPulseStepRange(2, 1.5)).toEqual({ startIndex: 1, endIndex: 3 });

    // Step range parity for 0.5 pace
    expect(heartPulseStepRange(1, 0.5)).toEqual({ startIndex: 0, endIndex: 0 });
    expect(heartPulseStepRange(2, 0.5)).toEqual({ startIndex: 0, endIndex: 1 });
  });

  it("does not fall back to descending math for qareeb when completedCount is 0 (0.5 pace or post-edit baseline)", () => {
    const params = {
      activeTracks: ["hifz", "qareeb"],
      targetPages: [604, 603, 602, 601, 600],
      quantities: { hifz: 0.5, qareeb: 5 },
    };
    const oneHalfEntry = [
      { track_key: "hifz", date: "2026-11-12", range_start: "604", range_end: "604" },
    ];
    const day2Half = deriveAssignments(template, params, oneHalfEntry, "2026-11-13");
    expect(day2Half.find((a) => a.trackKey === "qareeb")).toBeUndefined();

    const postEditParams = {
      activeTracks: ["hifz", "qareeb"],
      targetPages: [603, 602, 601],
      quantities: { hifz: 1, qareeb: 5 },
      queueBaseline: { hifz: 1 },
    };
    const dayAfterEdit = deriveAssignments(template, postEditParams, oneHalfEntry, "2026-11-13");
    expect(dayAfterEdit.find((a) => a.trackKey === "qareeb")).toBeUndefined();
  });
});
