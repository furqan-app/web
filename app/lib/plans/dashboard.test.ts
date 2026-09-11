import { describe, expect, it } from "vitest";
import { PLAN_TEMPLATES, type PlanTemplate } from "@/app/constants/plans";
import {
  deriveAwradDashboard,
  deriveActivityTotals,
  deriveHeatmapBuckets,
  type DashboardInputPlan,
} from "@/app/lib/plans/dashboard";
import { deriveActivityStreaks, type StreakPlanInput } from "@/app/lib/plans/streak";
import type { ProgressLogEntry } from "@/app/lib/plans/engine";

const TODAY = "2026-09-11";
const wird = PLAN_TEMPLATES["daily-wird"];
const husun = PLAN_TEMPLATES["husun"];
const listening = PLAN_TEMPLATES["listening-wird"];

const makeEntry = (
  track_key: string,
  date: string,
  start: number,
  end: number,
  unit = "page"
): ProgressLogEntry & { unit: string } => ({
  track_key,
  date,
  unit,
  range_start: String(start),
  range_end: String(end),
});

describe("deriveActivityStreaks", () => {
  it("computes 0 streak and false completedToday when activity has zero entries", () => {
    const plans: StreakPlanInput[] = [
      {
        startDate: "2026-09-01",
        template: wird,
        params: {},
        entries: [],
      },
    ];

    const streaks = deriveActivityStreaks(plans, TODAY);
    expect(streaks.read.streakLength).toBe(0);
    expect(streaks.read.completedToday).toBe(false);
    expect(streaks.read.activeDaysCount).toBe(0);
    expect(streaks.read.startDate).toBe("2026-09-01");

    // Other activities have no active plans containing them
    expect(streaks.listen.streakLength).toBe(0);
    expect(streaks.listen.startDate).toBeNull();
    expect(streaks.memorize.streakLength).toBe(0);
    expect(streaks.memorize.startDate).toBeNull();
    expect(streaks.review.streakLength).toBe(0);
    expect(streaks.review.startDate).toBeNull();
  });

  it("calculates continuous streak and completedToday when check-offs exist including today", () => {
    const entries: ProgressLogEntry[] = [
      makeEntry("reading", "2026-09-09", 1, 5),
      makeEntry("reading", "2026-09-10", 6, 10),
      makeEntry("reading", "2026-09-11", 11, 15),
    ];
    const plans: StreakPlanInput[] = [
      {
        startDate: "2026-09-09",
        template: wird,
        params: {},
        entries,
      },
    ];

    const streaks = deriveActivityStreaks(plans, TODAY);
    expect(streaks.read.streakLength).toBe(3);
    expect(streaks.read.completedToday).toBe(true);
    expect(streaks.read.activeDaysCount).toBe(3);
  });

  it("counts streak up to yesterday when today is not yet completed", () => {
    const entries: ProgressLogEntry[] = [
      makeEntry("reading", "2026-09-09", 1, 5),
      makeEntry("reading", "2026-09-10", 6, 10),
    ];
    const plans: StreakPlanInput[] = [
      {
        startDate: "2026-09-09",
        template: wird,
        params: {},
        entries,
      },
    ];

    const streaks = deriveActivityStreaks(plans, TODAY);
    expect(streaks.read.streakLength).toBe(2);
    expect(streaks.read.completedToday).toBe(false);
    expect(streaks.read.activeDaysCount).toBe(2);
  });

  it("breaks the streak across a missed day", () => {
    const entries: ProgressLogEntry[] = [
      makeEntry("reading", "2026-09-07", 1, 5),
      makeEntry("reading", "2026-09-08", 6, 10),
      // 2026-09-09 skipped
      makeEntry("reading", "2026-09-10", 11, 15),
      makeEntry("reading", "2026-09-11", 16, 20),
    ];
    const plans: StreakPlanInput[] = [
      {
        startDate: "2026-09-07",
        template: wird,
        params: {},
        entries,
      },
    ];

    const streaks = deriveActivityStreaks(plans, TODAY);
    // Walking back from 09-11 (today), 09-10 (yesterday) are done. 09-09 missing -> streak stops at 2.
    expect(streaks.read.streakLength).toBe(2);
    expect(streaks.read.completedToday).toBe(true);
    expect(streaks.read.activeDaysCount).toBe(4);
  });

  it("partitions activities correctly in multi-track plans (Husun)", () => {
    const entries: ProgressLogEntry[] = [
      // Only tilawa (read) and hifz (memorize) completed today; tahdeer (listen) and review missed
      makeEntry("tilawa", TODAY, 1, 20),
      makeEntry("hifz", TODAY, 100, 100),
    ];
    const plans: StreakPlanInput[] = [
      {
        startDate: TODAY,
        template: husun,
        params: {},
        entries,
      },
    ];

    const streaks = deriveActivityStreaks(plans, TODAY);
    expect(streaks.read.streakLength).toBe(1);
    expect(streaks.read.completedToday).toBe(true);

    expect(streaks.memorize.streakLength).toBe(1);
    expect(streaks.memorize.completedToday).toBe(true);

    expect(streaks.listen.streakLength).toBe(0);
    expect(streaks.listen.completedToday).toBe(false);

    expect(streaks.review.streakLength).toBe(0);
    expect(streaks.review.completedToday).toBe(false);
  });

  it("treats assignment-less days for an activity as neutral (none) continuing the streak", () => {
    // Plan 1: Reading goal of 5 pages with onComplete: "stop" completed on day 1
    const finishedTemplate: PlanTemplate = {
      key: "finished-plan",
      missedDayPolicy: "cursor",
      tracks: [
        {
          key: "reading-finished",
          activity: "read",
          unit: "page",
          rule: {
            kind: "fixed_cycle",
            rangeStart: 1,
            rangeEnd: 5,
            defaultUnitsPerDay: 5,
            onComplete: "stop",
          },
        },
      ],
    };

    const plans: StreakPlanInput[] = [
      {
        startDate: "2026-09-09",
        template: finishedTemplate,
        params: {},
        entries: [makeEntry("reading-finished", "2026-09-09", 1, 5)],
      },
      {
        startDate: TODAY, // 2026-09-11
        template: wird,
        params: {},
        entries: [makeEntry("reading", TODAY, 6, 10)],
      },
    ];

    const streaks = deriveActivityStreaks(plans, TODAY);
    // Day 1 (09-09): Plan 1 completed (done)
    // Day 2 (09-10): Plan 1 stopped (none), Plan 2 not yet started (none) -> activity day status is "none"
    // Day 3 (09-11 / today): Plan 2 completed (done)
    // The neutral day (09-10) must continue the activity streak: streakLength = 3
    expect(streaks.read.streakLength).toBe(3);
    expect(streaks.read.completedToday).toBe(true);
  });
});

describe("deriveActivityTotals", () => {
  it("computes cumulative pages read, exact verses, and khatmat wrap-around count", () => {
    // 2 complete passes of 604 pages = 1208 pages
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-01-01",
        status: "active",
        template: wird,
        params: {},
        entries: [
          makeEntry("reading", "2026-05-01", 1, 604),
          makeEntry("reading", "2026-09-01", 1, 604),
        ],
      },
    ];

    const totals = deriveActivityTotals(plans);
    expect(totals.read.pages).toBe(1208);
    expect(totals.read.khatmat).toBe(2);
    // 6236 verses * 2 = 12472 verses
    expect(totals.read.verses).toBe(12472);
  });

  it("sums cumulative volume across multiple concurrent plans without deduplication penalty", () => {
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-09-01",
        status: "active",
        template: wird,
        params: {},
        entries: [makeEntry("reading", "2026-09-11", 1, 5)],
      },
      {
        id: 2,
        startDate: "2026-09-11",
        status: "active",
        template: wird, // second plan covering overlapping pages 1–10
        params: {},
        entries: [makeEntry("reading", "2026-09-11", 1, 10)],
      },
    ];

    const totals = deriveActivityTotals(plans);
    // Plan 1 contributed 5 pages, Plan 2 contributed 10 pages -> Total 15 pages read
    expect(totals.read.pages).toBe(15);
  });

  it("reconciles verse-unit tracks into verses and equivalent pages", () => {
    // Surah Al-Fatihah: verses 1 to 7 (page 1)
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-09-01",
        status: "active",
        template: husun,
        params: {},
        entries: [makeEntry("hifz", "2026-09-11", 1, 7, "verse")],
      },
    ];

    const totals = deriveActivityTotals(plans);
    expect(totals.memorize.verses).toBe(7);
    // Page 1 has exactly 7 verses, so 7 verses = 1.0 page -> Math.round is 1 page
    expect(totals.memorize.pages).toBe(1);
  });

  it("aggregates totals across completed and paused plans alongside active ones", () => {
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-01-01",
        status: "completed", // finished plan
        template: listening,
        params: {},
        entries: [makeEntry("listening", "2026-02-01", 1, 20)],
      },
      {
        id: 2,
        startDate: "2026-03-01",
        status: "active",
        template: listening,
        params: {},
        entries: [makeEntry("listening", "2026-09-11", 21, 30)],
      },
    ];

    const totals = deriveActivityTotals(plans);
    expect(totals.listen.pages).toBe(30);
  });

  it("resolves track unit from params.trackUnits when entry.unit is missing", () => {
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-09-01",
        status: "active",
        template: wird,
        params: {
          trackUnits: {
            reading: "verse",
          },
        },
        // Entry without unit property, covering verses 1–7 (Surah Al-Fatihah)
        entries: [
          {
            track_key: "reading",
            date: "2026-09-11",
            range_start: "1",
            range_end: "7",
          },
        ],
      },
    ];

    const totals = deriveActivityTotals(plans);
    // Should resolve as verse: 7 verses and 1 page (Al-Fatihah is page 1)
    // NOT 7 pages (which would happen if params.trackUnits was ignored and defaulted to "page")
    expect(totals.read.verses).toBe(7);
    expect(totals.read.pages).toBe(1);
  });

  it("gracefully skips corrupt out-of-range entries with warning without throwing", () => {
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-09-01",
        status: "active",
        template: wird,
        params: {},
        entries: [
          // Corrupt page entry: end exceeds 604 (e.g. verse range mislabelled as page)
          makeEntry("reading", "2026-09-10", 1, 6236, "page"),
          // Corrupt verse entry: end exceeds 6236
          makeEntry("reading", "2026-09-10", 1, 99999, "verse"),
          // Valid entry
          makeEntry("reading", "2026-09-11", 1, 5, "page"),
        ],
      },
    ];

    expect(() => deriveActivityTotals(plans)).not.toThrow();
    const totals = deriveActivityTotals(plans);
    expect(totals.read.pages).toBe(5);
  });
});

describe("deriveHeatmapBuckets", () => {
  it("produces exactly 365 day buckets ending on client today", () => {
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-09-01",
        status: "active",
        template: wird,
        params: {},
        entries: [makeEntry("reading", TODAY, 1, 5)],
      },
    ];

    const heatmap = deriveHeatmapBuckets(plans, TODAY);
    expect(heatmap.days.length).toBe(365);
    expect(heatmap.endDate).toBe(TODAY);
    expect(heatmap.days[364].date).toBe(TODAY);
    expect(heatmap.days[364].count).toBe(1);
    expect(heatmap.days[364].intensity).toBe(1);
    expect(heatmap.days[364].activities).toEqual(["read"]);
    expect(heatmap.totalActiveDays).toBe(1);

    // Day before today has 0 count and 0 intensity
    expect(heatmap.days[363].count).toBe(0);
    expect(heatmap.days[363].intensity).toBe(0);
  });

  it("scales intensity thresholds correctly (0: none, 1: 1, 2: 2, 3: 3, 4: 4+ tasks)", () => {
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-09-01",
        status: "active",
        template: husun,
        params: {},
        entries: [
          makeEntry("tilawa", TODAY, 1, 20),
          makeEntry("hifz", TODAY, 100, 100),
          makeEntry("tahdeer", TODAY, 101, 101),
          makeEntry("qareeb", TODAY, 80, 99),
        ],
      },
    ];

    const heatmap = deriveHeatmapBuckets(plans, TODAY);
    const todayCell = heatmap.days[364];
    expect(todayCell.count).toBe(4);
    expect(todayCell.intensity).toBe(4);
    expect(todayCell.activities.sort()).toEqual(["listen", "memorize", "read", "review"].sort());
  });
});

describe("deriveAwradDashboard", () => {
  it("restricts streak calculation to active plans while including completed plans in totals", () => {
    const plans: DashboardInputPlan[] = [
      {
        id: 1,
        startDate: "2026-01-01",
        status: "completed",
        template: wird,
        params: {},
        entries: [makeEntry("reading", "2026-01-01", 1, 5)],
      },
      {
        id: 2,
        startDate: TODAY,
        status: "active",
        template: listening,
        params: {},
        entries: [makeEntry("listening", TODAY, 1, 5)],
      },
    ];

    const dashboard = deriveAwradDashboard(plans, TODAY);

    // Active listening plan has streak 1
    expect(dashboard.streaks.byActivity.listen.streakLength).toBe(1);
    // Completed reading plan is NOT active, so reading streak is 0
    expect(dashboard.streaks.byActivity.read.streakLength).toBe(0);

    // BUT completed reading plan is included in lifetime totals
    expect(dashboard.totals.read.pages).toBe(5);
    expect(dashboard.totals.listen.pages).toBe(5);
  });
});
