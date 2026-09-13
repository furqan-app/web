# ADR 0070: Weekly-Recurring Custom Wirds as a Weekday-Gated `fixed_cycle`

**Status:** active

## Context

#628 asks for a custom wird that is due on exactly one weekday (e.g. Surah Al-Kahf every Friday),
with a matching weekly reminder. The engine (ADR 0030) only knows two missed-day policies —
`cursor` (shift forward) and `calendar` (recompute daily quantity toward a fixed end date) — and
has no weekday concept at all. `ScheduledNotification.recurrence` only ever advances by exactly
one calendar day (`daily`).

## Decision

**A weekly custom wird is not a new track-rule kind.** It is the existing `fixed_cycle` rule with
two additions: an optional `weekday` gate on the rule, and `onComplete: "wrap"` with
`defaultUnitsPerDay` set to the *entire* range span (`rangeEnd - rangeStart + 1`) instead of an
incremental daily pace.

Mechanically, this reuses `fixed_cycle`'s existing khatma-wrap logic verbatim: completing the full
range on the due day sets `state.lastEnd = boundEnd`; the following week, `deriveSourceFreeTrack`
computes `start = lastEnd + 1 > boundEnd` and wraps back to `boundStart` — the same "khatma
restart" path a daily-wird's page cycle already takes, just gated to fire on one weekday instead
of every day. No new `TrackRule` kind, no new engine branch beyond the weekday gate itself.

**The weekday gate lives in `deriveSourceFreeTrack`'s `fixed_cycle` branch**, checked *after* the
existing `todayEntryAssignment` echo (an already-logged day always echoes verbatim regardless of
weekday — the invariant from `docs/architecture/decisions/plans.md` holds unconditionally) and
*before* computing `start`: on a non-matching local weekday, the track produces no assignment at
all. This is also the entire missed-day policy: a due weekday that passes uncompleted is simply a
gap — next week's due day computes its `start` from whatever `lastEnd` was last set to, with no
separate "recompute" or "shift" branch needed. A new `missedDayPolicy: "weekly"` value exists on
`PlanTemplate` purely for type-level documentation; no engine logic branches on it (the weekday
gate is what actually governs recurrence, not `missedDayPolicy`).

**Reminder recurrence is a separate `"weekly"` value on `ScheduledNotification.recurrence`,
advanced by seven single-day DST-corrected steps** (reusing `advanceOneDay` from
`reminders.ts`), not a new date-math primitive — advancing by exactly 7 calendar days preserves
the target weekday indefinitely without tracking it in `nextOccurrence` itself.

**Canonical weekday storage is asymmetric by reminder shape**, because a dedicated (per-plan)
reminder always has exactly one plan to source from and a general reminder slot never does:
- A **dedicated** reminder's `weekday` is derived from `CustomWirdDefinition.cadence.weekday` and
  mirrored onto the `ScheduledNotification.weekday` column when the row is created/recreated —
  never independently user-edited on the reminder itself. If the plan's weekday changes, the row
  is recreated at the new weekday (same dedupe key, upsert semantics already established by D1).
- A **general** reminder slot has no parent plan; its `weekday` column is the row's own
  authoritative value, set directly by the user in `DailyWirdReminderSection`.

**`weekday` is a new typed column on `ScheduledNotification`, not a `payload` JSON field** —
`timezone` and `locale` already establish the convention that scheduling metadata (as opposed to
notification *content*, which `payload` is reserved for per ADR 0037/D2) lives in first-class
columns on this model. `weekday` is the same class of field.

## Consequences

- `app/constants/plans.ts`: `CustomWirdCadence` gains a `{ type: "weekly"; weekday: number }`
  variant; `TrackRule`'s `fixed_cycle` variant gains an optional `weekday?: number`;
  `MissedDayPolicy` gains `"weekly"` (documentation-only, see above).
- `app/lib/plans/engine.ts`: one gate check in the `fixed_cycle` branch of
  `deriveSourceFreeTrack`, using a new UTC-anchored weekday helper consistent with
  `dayCountInclusive`'s existing `"${date}T00:00:00Z"` parsing (the date string is already the
  user's local calendar day; parsing it as UTC avoids server-timezone contamination).
- `prisma/app/schema.prisma`: `ScheduledNotification.weekday Int?` — migration required.
- The existing "weekly pace" (`pacePeriod: "week"`, fractional `amount / 7` spread across every
  day) is untouched and stays a distinct concept from this weekly-recurrence cadence — same word,
  different mechanism, and the UI must not conflate them.
- A weekly wird's `UserPlan.status` never auto-transitions to `"completed"` (unlike the existing
  `onComplete: "stop"` custom-wird path) — `"wrap"` has no terminal state, matching the
  always-recurring nature the issue asks for.

See `docs/plans/weekly-custom-wirds.md` for the full implementation plan and worked examples.
