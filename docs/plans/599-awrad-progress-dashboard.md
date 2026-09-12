---
title: "Awrad Dashboard: Dedicated motivation & progress hub with per-activity streaks"
type: feature
date: 2026-09-11
status: implemented
area: awrad
issue: 599
adr: []
---

# Awrad Dashboard: Dedicated motivation & progress hub with per-activity streaks (#599)

> Visual mockup: [`599-awrad-progress-dashboard.mockup.html`](599-awrad-progress-dashboard.mockup.html)

## 1. Current State & Gap Analysis

### What `app/lib/plans/streak.ts` Computes Today

Today's streak calculation is governed by [ADR 0030](../adr/0030-plan-engine-derived-assignments.md) and the Companion visual redesign:
- **Pure read-time derivation**: Streaks and week strips are computed at read time by replaying `deriveAssignments` against past calendar dates (`YYYY-MM-DD`). Nothing is persisted: no streak columns, no streak table, and no cached aggregates exist in `prisma/app/schema.prisma`.
- **Global All-or-Nothing Completeness**: `dayStatus(plans, date)` iterates across all active plans where `date >= plan.startDate`. For each plan, it re-derives assignments using `deriveAssignments(plan.template, plan.params, entriesUpToDate, date)`. If assignments exist, it returns `"done"` only if **every** assignment across all plans was completed (`assignments.every(a => a.completed)`). If any assignment was missed, the day evaluates to `"missed"`. If no assignment was due, it evaluates to `"none"`.
- **Backward Walk**: `deriveStreak(plans, today)` walks backward from `today` (or `yesterday` if today's assignments are not yet completed) up to `MAX_LOOKBACK_DAYS = 400`, stopping as soon as a `"missed"` day is encountered.
- **Week Strip**: A 7-day array of `DayStatus` (`"done"` | `"missed"` | `"none"`) ending on `today`, rendered in `PlansTodayHero.tsx`.

### What the Progress Log Actually Contains

In `furqan_app` (`prisma/app/schema.prisma`):
- `UserPlan`:
  - `id`: Scalar primary key (`Int`).
  - `user_id`: Scalar user reference (`Int`).
  - `name`: User-defined custom title (`String?`).
  - `template_key`: TS constant key (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`, `husun`, `custom`).
  - `definition`: JSON for custom wirds (`CustomWirdDefinition`).
  - `params`: JSON configuration (`UserPlanParams`, containing `quantities`, `trackUnits`, `startPage`, `endDate`).
  - `start_date`: Client-local enrollment date (`DateTime @db.Date`).
  - `status`: `"active"` | `"paused"` | `"completed"` | `"abandoned"`.
- `PlanProgressEntry`:
  - `id`: Scalar primary key.
  - `user_plan_id`: Relation to `UserPlan`.
  - `track_key`: Track identifier (`String`, e.g. `"reading"`, `"tilawa"`, `"hifz"`, `"tahdeer"`, `"custom"`).
  - `date`: Completion date (`DateTime @db.Date`, stored as client-local day).
  - `unit`: Unit string (`"page"` | `"verse"`).
  - `range_start`: String representing starting mushaf page or verse ordinal (1–6236).
  - `range_end`: String representing ending mushaf page or verse ordinal (1–6236).
  - `completed_at`: Timestamp (`DateTime @default(now())`).
  - Constraint: `@@unique([user_plan_id, track_key, date])` — at most one check-off per track per local calendar day.

### What is Derivable vs. Undeliverable (D4)

| Metric Requested in #599 | Derivable from Current Schema & Constants? | Derivation Method / Cut Rationale |
|---|---|---|
| **Global streak & 7-day strip** | **Yes** | Existing `deriveStreak(plans, date)` in `app/lib/plans/streak.ts`. |
| **Per-activity streaks (read, listen, memorize, review)** | **Yes** | Derivable by grouping plan tracks by their static `activity: PlanActivity` and evaluating daily completion per modality (D3). |
| **Total pages & verses read** | **Yes** | Derivable by summing `range_end - range_start + 1` across all progress entries belonging to `activity: "read"`, reconciled via `verse-index.ts`. |
| **Units memorized (verses & pages)** | **Yes** | Derivable by summing completed spans for tracks with `activity: "memorize"`. |
| **Pages & verses reviewed** | **Yes** | Derivable by summing completed spans for tracks with `activity: "review"` (e.g. husun `qareeb`/`baeed`, reviewing wird). |
| **Pages & verses listened** | **Yes** | Derivable by summing completed spans for tracks with `activity: "listen"` (e.g. listening-wird, husun `tahdeer`). |
| **Interactive 365-day calendar heatmap** | **Yes** | Derivable by aggregating completed entries per client-local date `YYYY-MM-DD` over a 52-week rolling window. |
| **"Hours listened"** | **CUT (Undeliverable in v1)** | **D4 holds:** `PlanProgressEntry` records only scalar track keys and range bounds. No playback duration, start/stop timestamps, or dwell times are stored anywhere in the database. Computing "hours" would require inventing an arbitrary playback speed multiplier (e.g. guessing seconds per verse/page). Per **D4**, true playback duration requires smart dwell-time and audio telemetry, which is the exact scope of issue **#598**. In v1, listening progress is reported purely in physical units (pages and verses listened). |

---

## 2. Derivation Layer

All dashboard metrics are derived through pure, deterministic functions residing in `app/lib/plans/dashboard.ts` (with streak math extended in `app/lib/plans/streak.ts`). Zero database calls, zero system clock queries, and zero side effects.

### Data Types

```ts
import type { PlanActivity, PlanUnit } from "@/app/constants/plans";
import type { StreakPlanInput, StreakResult, DayStatus } from "@/app/lib/plans/streak";
import type { ProgressLogEntry } from "@/app/lib/plans/engine";

export type ActivityStreakResult = {
  streakLength: number;
  /** Whether the user completed an assignment for this activity on client 'today'. */
  completedToday: boolean;
  /** Earliest start date across active plans containing this activity ("YYYY-MM-DD" | null). */
  startDate: string | null;
  /** Total active days for this activity in the last 365 days. */
  activeDaysCount: number;
};

export type ActivityTotals = {
  pages: number;
  verses: number;
  /** Complete mushaf passes (pages / 604) for cyclical reading. */
  khatmat?: number;
};

export type DashboardHeatmapDay = {
  date: string; // "YYYY-MM-DD"
  count: number; // total completed assignments on this day
  activities: PlanActivity[]; // distinct activities completed on this day
  intensity: 0 | 1 | 2 | 3 | 4; // 0 = none, 1 = 1 task, 2 = 2 tasks, 3 = 3 tasks, 4 = 4+ tasks
};

export type DashboardHeatmapData = {
  startDate: string; // 52 weeks ago ("YYYY-MM-DD")
  endDate: string; // client "today" ("YYYY-MM-DD")
  days: DashboardHeatmapDay[];
  totalActiveDays: number;
};

export type AwradDashboardData = {
  streaks: {
    global: StreakResult;
    byActivity: Record<PlanActivity, ActivityStreakResult>;
  };
  totals: Record<PlanActivity, ActivityTotals>;
  heatmap: DashboardHeatmapData;
};
```

### Extending `app/lib/plans/streak.ts` (D3)

Per **D3**, the signature and return type of `deriveStreak` are preserved unchanged so that `PlansTodayHero.tsx` and `GET /api/plans/streak` remain completely undisturbed:

```ts
// Existing export preserved intact:
export const deriveStreak = (plans: StreakPlanInput[], today: string): StreakResult;
```

We introduce `deriveActivityStreaks` alongside `deriveStreak`:

```ts
/**
 * Derives per-activity streaks grouped by PlanActivity ("read" | "listen" | "memorize" | "review").
 *
 * Rule (D3): A day counts toward an activity's streak when at least one assignment
 * belonging to that activity was completed on that local date.
 *
 * Walking logic mirrors deriveStreak:
 * - If today has >= 1 completed assignment for this activity, walk starts from today.
 * - If today has 0 completed assignments for this activity, walk starts from yesterday
 *   (today's unfinished tasks do not retroactively break an active streak).
 * - Walks backward day-by-day until hitting a day with 0 completed assignments for this activity
 *   or reaching the earliest plan start date containing this activity.
 */
export const deriveActivityStreaks = (
  plans: StreakPlanInput[],
  today: string
): Record<PlanActivity, ActivityStreakResult>;
```

### Derivation Pipeline in `app/lib/plans/dashboard.ts`

```ts
export type DashboardInputPlan = {
  id: number;
  startDate: string; // "YYYY-MM-DD"
  status: "active" | "paused" | "completed" | "abandoned";
  template: PlanTemplate;
  params: UserPlanParams;
  entries: (ProgressLogEntry & { unit: PlanUnit })[];
};

/**
 * Pure root function computing the entire dashboard state.
 */
export const deriveAwradDashboard = (
  plans: DashboardInputPlan[],
  today: string
): AwradDashboardData => {
  // 1. Filter active plans for streak calculations (ADR 0030)
  const activeStreakInputs: StreakPlanInput[] = plans
    .filter((p) => p.status === "active")
    .map((p) => ({
      startDate: p.startDate,
      template: p.template,
      params: p.params,
      entries: p.entries,
    }));

  const globalStreak = deriveStreak(activeStreakInputs, today);
  const byActivityStreaks = deriveActivityStreaks(activeStreakInputs, today);

  // 2. Derive totals across ALL plans (active, paused, completed) so completed
  // khatmas and archived wirds remain part of user's lifetime record.
  const totals = deriveActivityTotals(plans);

  // 3. Derive 365-day rolling heatmap buckets ending on client `today`
  const heatmap = deriveHeatmapBuckets(plans, today);

  return {
    streaks: {
      global: globalStreak,
      byActivity: byActivityStreaks,
    },
    totals,
    heatmap,
  };
};
```

---

## 3. Totals & Double-Counting Rules

### What is Counted Per Activity

Every completed `PlanProgressEntry` records a concrete portion accomplished by the user. Each track maps to an `activity: PlanActivity`:
1. **`read`**: Daily wird reading tracks, Husun `tilawa`, custom reading wirds.
2. **`listen`**: Listening wird tracks, Husun `tahdeer` (pre-listening), custom listening wirds.
3. **`memorize`**: Memorizing wird tracks, Husun `hifz`, custom memorization wirds.
4. **`review`**: Reviewing wird tracks, Husun `qareeb` (near review), Husun `baeed` (distant review), custom review wirds.

### Unit Reconciliation: Pages ↔ Verses

Tracks in Furqan operate in either `"page"` or `"verse"` units (ADR 0038). To report coherent numbers:
- **Exact Static Verse Indexing**: We use `app/lib/plans/verse-index.ts` (`pageFirstVerseOrdinal`, `pageLastVerseOrdinal`, `pageVerseCount`). No database calls, no approximations.
- **Page-Unit Entry Conversion**:
  - Pages: $P = \text{range\_end} - \text{range\_start} + 1$.
  - Exact Verses: $V = \text{pageLastVerseOrdinal}(\text{range\_end}) - \text{pageFirstVerseOrdinal}(\text{range\_start}) + 1$.
- **Verse-Unit Entry Conversion**:
  - Exact Verses: $V = \text{range\_end} - \text{range\_start} + 1$.
  - Equivalent Pages: $P = \text{pageOfVerse}(\text{range\_end}) - \text{pageOfVerse}(\text{range\_start}) + 1$ (spanned pages) or fractional verse sum $\sum \frac{1}{\text{pageVerseCount}(page)}$. For whole-number presentation in stat cards, we report exact verses as the primary metric for verse-first activities (like memorization), alongside the exact page span.

### Double-Counting Policy & Explicit Rules

The dashboard implements **Cumulative Completed Volume** rather than a capped unique-span set:

1. **Re-reads and Khatmat Wrap-Around**:
   - *Rule*: When a user completes the Mushaf (pages 1–604) and starts a second or third Khatma, every re-read page increments the total pages read.
   - *Reasoning*: A user who has recited the Quran 3 times has recited $1,812$ pages. Capping their total at 604 unique pages would contradict Islamic devotional practice and penalize consistency. Khatma count is explicitly derived as $\lfloor \text{totalPages} / 604 \rfloor$.
2. **Multiple Plans Covering Overlapping Ranges**:
   - *Rule*: If a user enrolls in both a `daily-wird` (reading pages 1–5 today) and a `custom` wird (reading Surah Al-Kahf, pages 293–304 on Friday), both logged entries contribute their respective pages to the `read` total.
   - *Reasoning*: Each plan represents a separate, deliberate act of devotion and dedicated reading time checked off by the user. Deduplicating across distinct plans would imply one of those sessions never occurred.
3. **Multi-Track Plans (Al-Husun Al-Khamsa)**:
   - *Rule*: In Husun, `tilawa` (pages 1–20, `read`), `hifz` (page 100, `memorize`), `tahdeer` (page 101, `listen`), and `qareeb` (pages 80–99, `review`) are partitioned strictly into their respective activity totals.
   - *Reasoning*: Because totals are segmented by `activity`, there is zero cross-activity collision. Tahdeer is categorized under `listen`, hifz under `memorize`, and tilawa under `read`.
4. **Intra-Day Single-Track Updates**:
   - *Rule*: Re-checking or adjusting a track's check-off on the same date updates the single `PlanProgressEntry` row via the database unique constraint `@@unique([user_plan_id, track_key, date])`. A track can never record two entries on the same day.

---

## 4. Calendar & Heatmap Data

### 365-Day Rolling Window (Why 52 Weeks)

- **Range**: Exactly 52 full weeks (364 days) plus remaining days leading to client `today` (365–371 days depending on week alignment).
- **Justification**:
  1. Islamic reading habits are inherently cyclical and annual (Ramadan-to-Ramadan khatmas, annual reading awrad).
  2. The issue specifically targets celebrating milestones and year-round consistency.
  3. In a horizontal scroll container with `fq-scroll-nice`, 52 columns of 7 days (~12px cell + 3px gap = ~780px wide) fits comfortably on desktop containers and scrolls cleanly on mobile viewports.

### Timezone & Local Date Handling

- All dates stored in `PlanProgressEntry.date` represent the client-local calendar date (`YYYY-MM-DD`) supplied at check-off time (ADR 0030).
- The client passes its current local date (`?date=YYYY-MM-DD`) to the dashboard API.
- The server builds the 52-week calendar grid walking backward from that date string using `addDays(today, -i)`.
- **Zero Timezone Drift**: Because both stored dates and queried dates are date-only ISO strings (`YYYY-MM-DD`), no UTC shift or offset conversion can ever cause a check-off to slip into yesterday or tomorrow.

### Intensity Scale Thresholds

To maintain a calm, quiet atmosphere (D6) without aggressive gamification:

| Intensity Level | Completed Tasks in Day | Light Theme Fill | Gold Theme Fill | Dark Theme Fill |
|---|---|---|---|---|
| **0** (No activity) | 0 tasks | `bg-muted/40` | `bg-muted/40` | `dark:bg-white/[0.07]` |
| **1** (Light) | 1 task | `bg-primary/20` | `bg-primary/20` | `dark:bg-primary/35` |
| **2** (Moderate) | 2 tasks | `bg-primary/45` | `bg-primary/45` | `dark:bg-primary/60` |
| **3** (Deep) | 3 tasks | `bg-primary/70` | `bg-primary/70` | `dark:bg-primary/80` |
| **4** (Full) | 4+ tasks | `bg-primary` | `bg-primary` | `dark:bg-primary` |

*(Note on dark theme: `bg-muted/40` on dark cards resolved to `rgba(20,25,31,0.4)` over `rgb(20,25,31)`, rendering level-0 cells completely invisible. Dark level 0 steps up in brightness to `dark:bg-white/[0.07]`, with calibrated primary alpha steps 35/60/80 above it).*

Cells have a subtle 2.5px rounded corner (`rounded-[2.5px]`) and no dropshadows or borders.

### RTL-Correct Layout (D6) & Scroll Alignment

- In Arabic (`dir="rtl"`), the week grid flows from right to left:
  - Week columns arrange horizontally with the **current week on the far right** (the reading start edge, accomplished by reversing the 52-week array in RTL) and older weeks stretching to the left.
  - Days of the week arrange vertically (7 rows: Saturday/السبت down to Friday/الجمعة).
- In English (`dir="ltr"`), columns run left-to-right from 52 weeks ago to the current week on the far right.
- **Scroll Alignment (`app/lib/plans/heatmap-scroll.ts`)**: Because browser engines handle RTL `scrollLeft` via three different conventions (`negative`, `positive-descending`, `positive-ascending`), and in LTR `scrollLeft = 0` opens 52 weeks in the past, the client probes the engine's convention once, computes the target offset to pin to the current week, assigns `element.scrollLeft` directly without animation, and re-pins on viewport resize via `ResizeObserver`.

---

## 5. API Specification (D5)

A single consolidated endpoint supplies all dashboard data in one round-trip, keeping `PlansTodayHero.tsx` and `GET /api/plans/streak` completely isolated.

### Route Details

- **Path**: `GET /api/plans/dashboard`
- **Method**: `GET`
- **Query Parameter**:
  - `date`: Required string matching `/^\d{4}-\d{2}-\d{2}$/` (`PLAN_DATE_RE`). Represents the user's local date at request time.
- **Authentication**: Required via NextAuth session cookie (`extractUser(request)`).
- **HTTP Status Codes**:
  - `200 OK`: Valid request, returns dashboard payload.
  - `401 Unauthorized`: No authenticated session found.
  - `422 Unprocessable Entity`: Missing `date` parameter or invalid `YYYY-MM-DD` format.

### Response JSON Shape

```json
{
  "data": {
    "streaks": {
      "global": {
        "streakLength": 14,
        "week": ["done", "done", "done", "done", "done", "done", "done"]
      },
      "byActivity": {
        "read": {
          "streakLength": 14,
          "completedToday": true,
          "startDate": "2026-08-01",
          "activeDaysCount": 42
        },
        "listen": {
          "streakLength": 3,
          "completedToday": false,
          "startDate": "2026-08-15",
          "activeDaysCount": 18
        },
        "memorize": {
          "streakLength": 0,
          "completedToday": false,
          "startDate": "2026-09-01",
          "activeDaysCount": 5
        },
        "review": {
          "streakLength": 7,
          "completedToday": true,
          "startDate": "2026-08-01",
          "activeDaysCount": 35
        }
      }
    },
    "totals": {
      "read": { "pages": 145, "verses": 1520, "khatmat": 0 },
      "listen": { "pages": 30, "verses": 320 },
      "memorize": { "verses": 48, "pages": 4 },
      "review": { "pages": 80, "verses": 840 }
    },
    "heatmap": {
      "startDate": "2025-09-12",
      "endDate": "2026-09-11",
      "totalActiveDays": 58,
      "days": [
        {
          "date": "2026-09-11",
          "count": 2,
          "activities": ["read", "review"],
          "intensity": 2
        }
      ]
    }
  }
}
```

### Route Handler Implementation Outline (`app/api/plans/dashboard/route.ts`)

```ts
import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { PLAN_DATE_RE, getEnrollmentTemplate, type UserPlanParams, type PlanUnit } from "@/app/constants/plans";
import { deriveAwradDashboard, type DashboardInputPlan } from "@/app/lib/plans/dashboard";

export async function GET(request: NextRequest): Promise<Response> {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !PLAN_DATE_RE.test(date)) {
    return jsonResponse({ code: 422, message: "Missing or invalid date" });
  }

  // Load user plans including progress entries
  const plans = await appPrisma.userPlan.findMany({
    where: { user_id: user.id },
    include: { progress: true },
    orderBy: { start_date: "asc" },
  });

  const dashboardInputs: DashboardInputPlan[] = [];
  for (const plan of plans) {
    const template = getEnrollmentTemplate(plan);
    if (!template) continue;

    dashboardInputs.push({
      id: plan.id,
      startDate: plan.start_date.toISOString().slice(0, 10),
      status: plan.status as DashboardInputPlan["status"],
      template,
      params: (plan.params ?? {}) as UserPlanParams,
      entries: plan.progress.map((entry) => ({
        track_key: entry.track_key,
        date: entry.date.toISOString().slice(0, 10),
        unit: (entry.unit ?? "page") as PlanUnit,
        range_start: entry.range_start,
        range_end: entry.range_end,
      })),
    });
  }

  const data = deriveAwradDashboard(dashboardInputs, date);
  return jsonResponse({ data });
}
```

---

## 6. UI Architecture & Component Hierarchy

### Third Tab on `/plans` (D1)

The `/plans` hub page tab strip in `app/components/plans/MyPlansList.tsx` is extended from a dual-view tab into a three-segment navigation:
- Tab 1: **مهام اليوم** / **Today's Tasks** (`value: "today"`)
- Tab 2: **التقدّم** / **Progress** (`value: "progress"`) *(New)*
- Tab 3: **إدارة الخطط** / **My Plans** (`value: "plans"`)

```tsx
<div className="flex p-1 rounded-2xl bg-muted/50 border border-border text-xs font-semibold" role="tablist">
  <button role="tab" id="tab-today" aria-selected={activeTab === "today"} ...>
    {t("plans.tabs.today")}
  </button>
  <button role="tab" id="tab-progress" aria-selected={activeTab === "progress"} ...>
    {t("plans.tabs.progress")}
  </button>
  <button role="tab" id="tab-plans" aria-selected={activeTab === "plans"} ...>
    {t("plans.tabs.manage")}
  </button>
</div>
```

### Component Tree for `PlansProgressTab.tsx`

```
app/components/plans/
├── PlansProgressTab.tsx                # Master tab container (data fetch + layout)
│   ├── ProgressHeaderSummary.tsx      # High-level reflection banner (active days & global streak)
│   ├── ActivityStreaksGrid.tsx        # 2x2 or 4x1 grid of modality streaks
│   │   └── ActivityStreakCard.tsx     # Single activity card (Read, Listen, Memorize, Review)
│   ├── ProgressTotalsCard.tsx         # Hairline lattice card showing cumulative totals
│   │   ├── TotalStatRow.tsx           # Single stat row (pages read, verses memorized, etc.)
│   │   └── KhatmaPillBadge.tsx        # Subtle milestone indicator (e.g. "ختمة كاملة")
│   ├── ActivityHeatmapCard.tsx        # 52-week rolling activity calendar
│   │   ├── HeatmapHeader.tsx          # Section overline + active days count
│   │   ├── HeatmapGrid.tsx            # Scrollable 52x7 week lattice (`fq-scroll-nice`)
│   │   │   ├── HeatmapMonthLabels.tsx # Month headers (reversed between RTL & LTR)
│   │   │   ├── HeatmapDayColumn.tsx   # 7 day cells per week
│   │   │   └── HeatmapDayCell.tsx     # Single cell with quiet hover/tap popover
│   │   └── HeatmapLegend.tsx          # Intensity scale indicator (أقل → أكثر)
│   ├── ProgressEmptyState.tsx         # Quiet, dignified empty state when 0 plans enrolled
│   └── ProgressSkeleton.tsx           # Skeleton loading state
```

### Mobile & Desktop Responsive Composition

- **Container**: Sits inside `/plans`'s canonical `max-w-2xl mx-auto px-4`.
- **Activity Streaks Grid**:
  - Desktop / Tablet (`sm:` and up): 2×2 grid of balanced cards (`grid-cols-2 gap-3`).
  - Mobile (`< 640px`): 2-column compact grid with touch-friendly 44px hit targets.
- **Totals Section**: Grouped into a single `.fq-section-group` hairline card (`rounded-[20px] bg-card border border-border fq-panel-cast`) with hairline row dividers rather than multiple disjointed cards.
- **Heatmap Container**: Carries `overflow-x-auto fq-scroll-nice` with `pb-2`.
  - In Arabic: starts aligned to the right so recent days are immediately visible.
  - In English: starts aligned to the left (or scrolled to the rightmost current week).

### Motion & Accessibility (`prefers-reduced-motion`)

In strict adherence to `docs/standards/styling.md`:
- All interactive feedback across the dashboard respects `@media (prefers-reduced-motion: reduce)`:
  - **Press Compression**: `active:scale-[0.97]` on streak cards and tab buttons is disabled (`motion-reduce:transform-none`).
  - **Heatmap Hover Scaling**: Hover transformation on calendar cells (`transform: scale(1.3)`) is suppressed under reduced motion; visual feedback switches to an instant border catch-light outline without spatial motion.
  - **Radix Popovers**: Enter and exit transitions for day detail tooltips drop `translate` and `scale` keyframes, using instant opacity fades (`duration-75 opacity-100`).
  - **Tab Switching**: Content switching between "Today", "Progress", and "Plans" mounts instantaneously without slide or cross-fade transitions.

### Empty & Sparse States (D6)

- **Zero Plans Enrolled (`items.length === 0`)**:
  - Calm, dignified prompt emphasizing the blessing of beginning Quran study.
  - Reuses the warm icon well pattern: `Target` icon inside `.fq-well`.
  - Clean CTA: `AddPlanButton` ("اختر خطة أو ورداً وابدأ رحلتك").
- **Enrolled with 0 or 1 Day Logged (Sparse State)**:
  - Streak cards display `٠ يوم` / `0 days` or `١ يوم` / `1 day` without alarmist red text, broken-chain icons, or negative phrasing.
  - Heatmap renders the full 52-week quiet grid with one gentle emerald dot (`bg-primary/20`) representing the inaugural session.
  - Header displays an encouraging, dignified reflection: `"بداية مباركة — كل خطوة في مدارسة القرآن أجر وثبات"` ("A blessed beginning — every step in reciting the Qur'an brings reward and steadfastness").

---

## 7. Internationalization (i18n)

Both `messages/ar.json` and `messages/en.json` receive complete, mirrored keys. All count-bearing strings use next-intl ICU plurals containing **all six Arabic categories** (`zero`, `one`, `two`, `few`, `many`, `other`) per project standards.

### Client Component i18n Rule
Client components call `useTranslations("plans.dashboard")` from `next-intl` directly, passing `{ count, n: toLocaleNumeral(count, locale) }`.
**Strict Rule**: Never invoke `t(key).replace(...)` or use the project wrapper for ICU strings, which silently falls back to English defaults.

### `messages/ar.json` Keys

```json
{
  "plans": {
    "tabs": {
      "today": "مهام اليوم",
      "progress": "التقدّم",
      "manage": "إدارة الخطط"
    },
    "dashboard": {
      "title": "سجل الإنجاز والتقدّم",
      "subtitle": "متابعة الاستمرار في التلاوة والاستماع والحفظ والمراجعة",
      "streaks": {
        "title": "سلاسل الالتزام",
        "globalTitle": "الالتزام العام",
        "read": "التلاوة",
        "listen": "الاستماع",
        "memorize": "الحفظ",
        "review": "المراجعة",
        "daysCount": "{count, plural, zero {ولا يوم} one {يوم واحد} two {يومان} few {{n} أيام} many {{n} يوماً} other {{n} يوم}}",
        "completedToday": "أُنجز اليوم",
        "pendingToday": "متبقٍ لليوم",
        "noActivePlan": "لا توجد خطة مفعلة"
      },
      "totals": {
        "title": "إجمالي ما أتممته",
        "readPages": "صفحات تمت قراءتها",
        "readVerses": "آيات تمت قراءتها",
        "listenedPages": "صفحات تم الاستماع إليها",
        "listenedVerses": "آيات تم الاستماع إليها",
        "memorizedVerses": "آيات تم حفظها",
        "memorizedPages": "صفحات تم حفظها",
        "reviewedPages": "صفحات تمت مراجعتها",
        "reviewedVerses": "آيات تمت مراجعتها",
        "pagesCount": "{count, plural, zero {ولا صفحة} one {صفحة واحدة} two {صفحتان} few {{n} صفحات} many {{n} صفحة} other {{n} صفحة}}",
        "versesCount": "{count, plural, zero {ولا آية} one {آية واحدة} two {آيتان} few {{n} آيات} many {{n} آية} other {{n} آية}}",
        "khatmatCount": "{count, plural, zero {ولا ختمة} one {ختمة واحدة} two {ختمتان} few {{n} ختمات} many {{n} ختمة} other {{n} ختمة}}"
      },
      "heatmap": {
        "title": "خريطة النشاط والمدارسة",
        "summary": "{activeDays, plural, zero {لم تسجل نشاطاً بعد} one {يوم واحد من المدارسة في آخر سنة} two {يومان من المدارسة في آخر سنة} few {{activeDaysFormatted} أيام من المدارسة في آخر سنة} many {{activeDaysFormatted} يوماً من المدارسة في آخر سنة} other {{activeDaysFormatted} يوم من المدارسة في آخر سنة}}",
        "legendLess": "أقل",
        "legendMore": "أكثر",
        "tooltipTasks": "{count, plural, zero {لا مهام} one {مهمة واحدة منجزة} two {مهمتان منجزتان} few {{n} مهام منجزة} many {{n} مهمة منجزة} other {{n} مهمة منجزة}}"
      },
      "empty": {
        "title": "لا توجد خطط مسجلة بعد",
        "hint": "اختر ورداً يومياً أو خطة مخصصة لتبدأ متابعة إنجازك وتثبيت التزامك.",
        "cta": "ابدأ ورداً جديداً"
      },
      "sparse": {
        "encouragement": "بداية مباركة — كل خطوة في مدارسة القرآن أجر وثبات."
      }
    }
  }
}
```

### `messages/en.json` Keys

```json
{
  "plans": {
    "tabs": {
      "today": "Today's Tasks",
      "progress": "Progress",
      "manage": "My Plans"
    },
    "dashboard": {
      "title": "Progress & Milestones",
      "subtitle": "Track your consistency across recitation, listening, memorization, and review",
      "streaks": {
        "title": "Activity Streaks",
        "globalTitle": "Overall Consistency",
        "read": "Reading",
        "listen": "Listening",
        "memorize": "Memorization",
        "review": "Review",
        "daysCount": "{count, plural, =0 {0 days} one {1 day} other {{n} days}}",
        "completedToday": "Completed today",
        "pendingToday": "Pending today",
        "noActivePlan": "No active plan"
      },
      "totals": {
        "title": "Cumulative Accomplishments",
        "readPages": "Pages read",
        "readVerses": "Verses read",
        "listenedPages": "Pages listened",
        "listenedVerses": "Verses listened",
        "memorizedVerses": "Verses memorized",
        "memorizedPages": "Pages memorized",
        "reviewedPages": "Pages reviewed",
        "reviewedVerses": "Verses reviewed",
        "pagesCount": "{count, plural, =0 {0 pages} one {1 page} other {{n} pages}}",
        "versesCount": "{count, plural, =0 {0 verses} one {1 verse} other {{n} verses}}",
        "khatmatCount": "{count, plural, =0 {0 khatmas} one {1 complete khatma} other {{n} khatmas}}"
      },
      "heatmap": {
        "title": "Study & Habit Calendar",
        "summary": "{activeDays, plural, =0 {No activity recorded yet} one {1 active day in the past year} other {{activeDaysFormatted} active days in the past year}}",
        "legendLess": "Less",
        "legendMore": "More",
        "tooltipTasks": "{count, plural, =0 {No tasks} one {1 completed task} other {{n} completed tasks}}"
      },
      "empty": {
        "title": "No plans enrolled yet",
        "hint": "Enroll in a daily wird or custom plan to begin tracking your progress.",
        "cta": "Start a new wird"
      },
      "sparse": {
        "encouragement": "A blessed beginning — every single step in the study of the Qur'an brings reward."
      }
    }
  }
}
```

---

## 8. Testing Strategy

Colocated unit tests test all pure derivation functions. Functional Playwright tests verify UI transitions using stable `data-testid` locators and unconditional assertions.

### 1. Colocated Vitest Unit Tests (`app/lib/plans/dashboard.test.ts`)

No `__tests__/` directory. All unit tests live in `app/lib/plans/dashboard.test.ts` and `app/lib/plans/streak.test.ts`:

1. **Per-Activity Streak Derivation**:
   - Continuous daily check-offs for `read`: streak equals total days.
   - Gap in check-offs: streak terminates at the gap.
   - Today's assignment unfinished: streak counts up to yesterday without breaking.
   - Multi-activity plan (Husun): checks that completing only `tilawa` advances `read` streak while leaving `memorize` streak broken/idle if `hifz` was missed.
2. **Timezone Boundary Consistency**:
   - Verifies that check-offs logged under client date `YYYY-MM-DD` match the dashboard walk across midnight boundaries.
3. **Zero-Entry & Sparse Plans**:
   - Activity with zero entries yields `streakLength: 0`, `activeDaysCount: 0`.
   - Single-day user yields `streakLength: 1`, `intensity: 1` on today, `intensity: 0` on remaining 364 days.
4. **Cumulative Totals & Double-Counting**:
   - Verifies that two completed khatmas sum to $1,208$ pages read and `khatmat: 2`.
   - Verifies that overlapping ranges across two separate plans sum cumulative volume.
   - Verifies that verse-unit tracks reconcile into exact verses and page spans via `verse-index.ts`.
5. **Heatmap Aggregation**:
   - Verifies that multiple tasks completed on the same date roll into a single day bucket with appropriate intensity (1 to 4).

### 2. Playwright E2E Spec (`e2e/tests/plans-progress-dashboard.spec.ts`)

Per testing invariants in `docs/architecture/decisions/testing.md`:
- Locators use `data-testid` only, never localized `aria-label` substrings.
- Every assertion is **unconditional** — no `if (await x.isVisible())` guards.
- Prerequisite data is seeded deterministically using `createTestPlan` and MySQL queries in `beforeEach`.

```ts
import { test, expect } from "@playwright/test";
import { authenticateAsUser, clearUserPlans, createTestPlan } from "../helpers/auth";

test.describe("Plans Page: Progress Dashboard Tab (#599)", () => {
  test.beforeEach(async ({ context }) => {
    await clearUserPlans(1);
    await authenticateAsUser(context);
  });

  test.afterEach(async () => {
    await clearUserPlans(1);
  });

  test("unconditionally switches to Progress tab and renders dashboard sections", async ({ page }) => {
    // 1. Seed active plan
    await createTestPlan(1, "daily-wird", { quantities: { reading: 5 } });

    await page.goto("/ar/plans");

    // 2. Select Progress tab via stable test ID
    const progressTab = page.locator('[data-testid="tab-progress"]');
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await expect(progressTab).toHaveAttribute("aria-selected", "true");

    // 3. Unconditionally assert visibility of dashboard sections
    const dashboardPanel = page.locator('[data-testid="tabpanel-progress"]');
    await expect(dashboardPanel).toBeVisible();

    const streaksGrid = page.locator('[data-testid="progress-streaks-grid"]');
    await expect(streaksGrid).toBeVisible();

    const totalsCard = page.locator('[data-testid="progress-totals-card"]');
    await expect(totalsCard).toBeVisible();

    const heatmap = page.locator('[data-testid="progress-heatmap-card"]');
    await expect(heatmap).toBeVisible();
  });

  test("renders calm empty state when user has zero plans", async ({ page }) => {
    await page.goto("/ar/plans");

    // Click progress tab on empty state
    const progressTab = page.locator('[data-testid="tab-progress"]');
    await expect(progressTab).toBeVisible();
    await progressTab.click();

    // Unconditionally assert presence of dignified empty state CTA
    const emptyState = page.locator('[data-testid="progress-empty-state"]');
    await expect(emptyState).toBeVisible();

    const addPlanCta = emptyState.locator('[data-testid="add-plan-button"]');
    await expect(addPlanCta).toBeVisible();
  });
});
```

---

## 9. Architectural Decisions Record (Proposed Additions)

The following text has been recorded in `docs/architecture/decisions/plans.md` upon implementation:

```markdown
- **Awrad Progress Dashboard & Per-Activity Streaks (2026-09-11, #599):**
  - **Third tab on `/plans`:** Rendered as a dedicated tab ("التقدّم" / "Progress") between "مهام اليوم" and "إدارة الخطط", keeping `/plans` as the unified awrad hub without route fragmentation.
  - **Read-time pure derivation (ADR 0030 holds):** All dashboard data (per-activity streaks, cumulative accomplishments, and 365-day heatmap buckets) is derived purely at read time via `GET /api/plans/dashboard?date=YYYY-MM-DD` from `plan_progress_entries` and static templates. No streak counts, totals tables, or cached aggregates are stored in the database.
  - **Deliberate streak vs. totals asymmetry:** Streaks walk **active** plans only (matching `deriveStreak`), while cumulative totals and the 365-day heatmap aggregate across **all** plans (`active`, `paused`, `completed`, `abandoned`) so past milestones are never erased when plans pause, finish, or are abandoned.
  - **Per-activity streak semantics must match `deriveStreak`'s:** An activity streak groups tracks by static `activity` (`read`, `listen`, `memorize`, `review`) and replays `deriveAssignments` across past dates. A day with no derived assignment for that activity is neutral (`"none"`, streak-continuing), never a break. Only a day where an assigned task was due and uncompleted (`"missed"`) breaks the streak walk. The walk is anchored by actual completion (`hasDone`), preventing non-zero streaks when zero entries have been checked off.
  - **Unit resolution must reuse `resolveTrackUnit`:** Cumulative totals reconciliation must resolve track units via `resolveTrackUnit(plan.template, plan.params, entry.track_key)` whenever `entry.unit` is absent, never re-deriving units from `track.unit ?? "page"`. Ignoring `params.trackUnits` causes older unannotated verse-unit rows to be miscalculated as pages (e.g. al-Fatihah 1–7 reported as 7 pages instead of 7 verses / 1 page).
  - **Cumulative volume & khatmat counting:** Re-reads count in full: two complete mushaf cycles is 1,208 pages read, not 604. Completed khatmas derive as `Math.floor(pages / 604)`. Pages and verses reconcile statically through `verse-index.ts`.
  - **No "hours listened" without duration telemetry:** Listening progress is reported strictly in physical units (pages and verses). `PlanProgressEntry` records only range bounds without playback duration or timestamps; estimating hours by guessing playback speeds is prohibited until true audio telemetry lands in #598.
  - **Corrupt row resilience:** A corrupt, mislabelled, or out-of-range progress row (`start < 1 || end > 604` for pages; `start < 1 || end > 6236` for verses) must log a `console.warn` and degrade only that row — never throw and take the whole dashboard route down with HTTP 500. Date query parameters must validate through `isValidCalendarDate` and return 422 on invalid calendar dates.
  - **Engine-independent RTL/LTR horizontal scroll alignment:** Never rely on the browser's default RTL `scrollLeft` position to open a horizontal container at its intended end. Browser engines implement three conflicting RTL `scrollLeft` conventions (`negative` in modern Chromium/Firefox/WebKit, `positive-descending` in legacy WebKit, `positive-ascending` in legacy IE). A horizontally-scrolling container that must open pinned to a specific end (such as the 52-week heatmap pinned to current week) must probe the runtime's convention once via a DOM probe (`app/lib/plans/heatmap-scroll.ts`), assign `element.scrollLeft` directly without animation (`behavior: "instant"` is non-standard across older engines), re-pin on resize via a `ResizeObserver`, and must be verified in **both** RTL (`/ar`) and LTR (`/en`) directions.
```

---

## 10. Risks & Open Questions

1. **Active vs. Archived Plans in Streaks**:
   - *Question*: If a user completes a custom 30-day Surah Al-Baqarah memorization plan, should their memorization streak continue if they have no other active memorization plan?
   - *Resolution*: Streaks walk across **active** plans only (matching `deriveStreak` and ADR 0030), while Cumulative Totals and the Heatmap aggregate across **all** plans (`active`, `paused`, `completed`, `abandoned`) so accomplished milestones are never erased.
2. **Heatmap Touch Targets & Mobile Ergonomics**:
   - *Risk*: A 52-week calendar grid contains $364$ discrete cells. Expanding each $12\text{px}$ visual cell to a physical $\ge 44\text{px}$ hit bounding box is geometrically impossible without severe hit-area collisions across neighboring days.
   - *Resolution*: Heatmap cells are treated as an ambient, non-essential visual overview affordance (covered under WCAG 2.5.8 data visualization exceptions). The primary accessible mechanism for inspecting granular day-by-day logs is the dedicated **Plan History Timeline** in the adjacent "إدارة الخطط" / "My Plans" tab (`PlanHistorySection` in `MyPlansList.tsx`), which provides full-width, keyboard-accessible rows exceeding the $\ge 44\text{px}$ touch target standard. On mobile touch viewports, heatmap cells use an expanded $20\times16\text{px}$ pseudo-element tap zone, opening a quiet popover on tap with an accessible deep-link button jumping directly to that day in the Plan History timeline.
3. **Performance of 365-Day Historical Derivation**:
   - *Risk*: Replaying `deriveAssignments` across 365 days for per-activity streaks could increase CPU latency if a user has many entries.
   - *Resolution*: Replaying `deriveAssignments` is required so that days where an activity had no assignments due evaluate to `"none"` (neutral/streak-continuing) rather than false breaks. To avoid super-linear overhead, `matchingTrackKeys` sets are hoisted per plan per activity outside the probed date loop, and the walk terminates upon the first missed day or plan start date. All computation runs purely in memory in <1ms without database roundtrips.
