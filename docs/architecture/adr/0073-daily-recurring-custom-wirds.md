# ADR 0073: Daily-Recurring Custom Wirds as an Indefinite Full-Range `fixed_cycle`

**Status:** active

## Context

Following #628 (ADR 0070) for weekly recurring custom wirds (e.g. Surah Al-Kahf every Friday),
users need custom wirds that repeat their full range daily (e.g. Surah Al-Mulk every night,
Surah Al-Waqi'ah, or specific passages). The existing engine (ADR 0030, ADR 0067) only supported
terminal completion (`onComplete: "stop"`) for pace and deadline custom wirds, marking `status: "completed"`
upon logging the end of the range.

## Decision

**A daily-recurring custom wird is not a new track-rule kind.** It is the existing `fixed_cycle` rule
with `onComplete: "wrap"` and `defaultUnitsPerDay` set to the entire range span (`rangeEnd - rangeStart + 1`),
with no weekday gate (i.e. `weekday: undefined`), so it recurs every single calendar day.

Mechanically, completing the full range on any day sets `state.lastEnd = boundEnd`. On the following day,
`deriveSourceFreeTrack`'s wrap logic (`start = lastEnd + 1 > boundEnd ? boundStart : ...`) wraps `start`
back to `boundStart`, assigning the full range afresh. If a day passes uncompleted, `lastEnd` remains at
its last recorded position, still wrapping `start` back to `boundStart` for today. In streaks and dashboard,
an uncompleted past due day is counted as missed (breaking the streak), matching standard daily wird behavior.

**Terminal completion exemption:** `isCustomPlanCompleted` returns `false` unconditionally for `cadence.type === "daily"`,
matching `cadence.type === "weekly"`. The plan's `UserPlan.status` never auto-transitions to `"completed"`,
recurring indefinitely until explicitly paused or abandoned.

**Reminders:** Dedicated reminders for a daily recurring wird use the default `{ recurrence: "daily" }`
with `weekday = null`, reusing the existing daily reminder schedule and notification pipeline without
any schema changes.

**UI Cadence Hierarchy:** In `CustomWirdForm`, schedule choices are structured into three primary modes:
By pace (`"pace"`), By deadline (`"deadline"`), and Recurring (`"recurring"`). Under Recurring, the user selects
between Daily (`"daily"`) and Weekly (`"weekly"`). When `"daily"` is chosen, a clean explanatory note is shown:
"كامل النطاق يتكرر كل يوم" / "The entire range repeats every day".

## Consequences

- `app/constants/plans.ts`: `CustomWirdCadence` gains a `{ type: "daily" }` variant. `planTemplateFromDefinition`
  constructs a `fixed_cycle` track with `onComplete: "wrap"` and `defaultUnitsPerDay = rangeEnd - rangeStart + 1`.
- `app/lib/plans/custom-plan-completion.ts`: `isCustomPlanCompleted` exempts `definition.cadence.type === "daily"`.
- `app/lib/plans/validate-custom-definition.ts`: accepts `cadence: { type: "daily" }`.
- `app/lib/plans/custom-wird-estimate.ts`: preview line explains that the entire range repeats daily.
- `app/components/plans/CustomWirdForm.tsx`: UI organizes schedule into Pace, Deadline, and Recurring (Daily / Weekly).
- Zero schema migrations needed — reuses existing `fixed_cycle` engine and `ScheduledNotification` daily recurrence.
- Smart completion / auto-write (`useSmartCompletion`) functions automatically because assignments are derived
  through `GET /api/plans/today` and check-offs are recorded via `POST /api/plans/:planId/progress` without terminal completion.
