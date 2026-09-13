---
title: Weekly-Recurring Custom Wirds with Matching Weekly Reminders
type: feature
date: 2026-09-13
status: implemented
area: awrad
issue: 628
adr: [0070]
---

# Weekly-Recurring Custom Wirds with Matching Weekly Reminders

## Summary

A user can create a custom wird that is due on exactly one weekday (e.g. Surah Al-Kahf, due every
Friday) instead of daily, and set a matching weekly reminder for that same weekday/time. This adds
a third `CustomWirdCadence` variant (`"weekly"`) alongside the existing `pace` and `deadline`
cadences, a new `"weekly"` recurrence for `ScheduledNotification`, and a day-of-week selector in
the three UI surfaces the issue names. See [ADR 0070](../architecture/adr/0070-weekly-recurring-custom-wirds.md)
for the full architectural rationale (reusing `fixed_cycle` rather than a new rule kind, the
weekday-storage split between dedicated and general reminders, and the new typed column).

This plan was produced by the `/orchestrate-fq-task` orchestrator running unattended (no Slack
escalation for this run, by explicit operator instruction). Two independent read-only align agents
proposed a direction first (see [issue #628 comment](https://github.com/furqan-app/web/issues/628#issuecomment-5649438862));
their divergences are reconciled here and in ADR 0070, with reasoning, rather than escalated.

## Approach

### Engine: weekday-gated `fixed_cycle`, not a new rule kind

A weekly custom wird reuses `fixed_cycle`'s existing khatma-wrap mechanics:
- `rule.weekday?: number` (0 = Sunday … 6 = Saturday, `Date.getUTCDay()` convention) gates the
  track: on a date whose local weekday doesn't match, the track produces no assignment.
- `rule.onComplete = "wrap"` and `rule.defaultUnitsPerDay = rangeEnd - rangeStart + 1` (the whole
  range, in the track's own unit) — the due day's assignment is the entire range in one shot, and
  completing it sets `state.lastEnd = boundEnd`, which naturally wraps `start` back to `boundStart`
  the following week via the existing `if (start > boundEnd) { start = boundStart }` wrap path.
- No new `TrackRule` kind, no new missed-day recompute branch. `MissedDayPolicy` gains a `"weekly"`
  value purely so `planTemplateFromDefinition` can label the template accurately; nothing in
  `engine.ts` reads it — the weekday gate is what actually governs the schedule.

### Reminders: a `"weekly"` recurrence advancing by 7 DST-corrected days

- `ScheduledNotification.recurrence` accepts `"weekly"`. `nextOccurrence`'s weekly branch calls the
  existing `advanceOneDay` seven times in a row (not a new date-math primitive) — this preserves
  the target weekday indefinitely without needing to know it.
- `ScheduledNotification.weekday Int?` is a new column (migration required) — the same class of
  scheduling metadata as the existing `timezone`/`locale` columns, not `payload` JSON.
- **Dedicated (per-plan) reminders** derive their weekday from the plan's
  `CustomWirdDefinition.cadence.weekday` — never independently editable on the reminder row.
  Changing the plan's weekday recreates the reminder row (same dedupe key) at the new weekday.
- **General reminder slots** have no parent plan; their `weekday` is the row's own user-set value,
  chosen directly in `DailyWirdReminderSection`.
- `app/api/cron/reminders/route.ts`'s three reschedule branches must treat `"weekly"` exactly like
  `"daily"` — this is a **live bug fix**, not just new-feature plumbing: today, any recurrence
  value other than `"daily"` (including a bare `"weekly"` string, if one existed) falls into the
  `else` branch and gets **terminally completed/failed after one send**, never rescheduled.

## Decision Tree — Engine Weekday Gate

`deriveSourceFreeTrack`'s `fixed_cycle` branch, in order:

| Step | Condition | Result |
|---|---|---|
| 1 | Entry already logged for the queried date (`state.todayEntry`) | Echo that entry's range verbatim (existing `todayEntryAssignment` — checked before rule-kind dispatch, unconditional on weekday) |
| 2 | `rule.weekday !== undefined` **and** `dateWeekday(date) !== rule.weekday` | No assignment (`null`) — not due today |
| 3 | `rule.weekday !== undefined` **and** `dateWeekday(date) === rule.weekday` | Proceed with existing `fixed_cycle` start/wrap logic, using `rule.defaultUnitsPerDay` (= full range span for a weekly wird) |
| 4 | `rule.weekday === undefined` | Existing behavior, unchanged (daily-wird, husun, pace/deadline custom wirds) |

`dateWeekday(date: string)`: `new Date(\`${date}T00:00:00Z\`).getUTCDay()` — parses the
already-local-calendar-day string as UTC to avoid server-timezone contamination, consistent with
`dayCountInclusive`'s existing `Date.parse(\`${to}T00:00:00Z\`)` pattern in the same file.

## Decision Tree — Reminder Recurrence Advance

| `recurrence` | `nextOccurrence` behavior |
|---|---|
| `"daily"` | Unchanged: `advanceOneDay` once, loop while `<= now` |
| `"weekly"` | `advanceOneDay` **seven times** in sequence (each DST-corrected), loop the whole 7-step block while result `<= now` |
| anything else (`null`, one-shot) | Unchanged: return `scheduledFor` as-is |

## Decision Tree — Canonical Weekday Source

| Reminder shape | Weekday source | User-editable directly? |
|---|---|---|
| Dedicated (per-plan) | `CustomWirdDefinition.cadence.weekday`, mirrored onto the row at upsert | No — editing the plan's cadence recreates the row |
| General slot | The row's own `weekday` column | Yes — set in `DailyWirdReminderSection` |

## Verified Test Cases

**Case 1 — Al-Kahf every Friday, first three occurrences.** `rangeStart=294, rangeEnd=297` (example
page span), `weekday=5` (Friday), no progress logged yet, enrolled on a Tuesday.
- Tue/Wed/Thu: `dateWeekday !== 5` → no assignment (streak/dashboard read these as `"none"`).
- Fri (first due day): `state.lastEnd === null`, `weekday` matches → `start = boundStart = 294`,
  `units = 297 - 294 + 1 = 4` → assignment `294–297`. User checks it off → `todayEntry` logged,
  `completed: true`.
- Sat/Sun/Mon/Tue/Wed/Thu: not due → no assignment.
- Next Fri: `state.lastEnd = 297 = boundEnd` → `start = 298 > boundEnd(297)` → wraps to
  `boundStart = 294`. Assignment is `294–297` again. Matches "every Friday, same range,
  indefinitely."

**Case 2 — missed Friday.** Same setup; user does not check off the Friday assignment.
- Following Mon–Thu: not due, no assignment, streak reads `"none"` (not `"missed"` — #599 pass-through).
- Following Fri: `state.lastEnd` is still `null` (nothing was ever logged) → `start = boundStart =
  294` again, same range re-offered. This *is* "wait for next week" — there is no separate
  catch-up day and no cursor shift; the gate simply didn't let the assignment exist on the 6
  intervening days, so nothing needed to "wait."

**Case 3 — reminder recurrence advance across a DST boundary.** `scheduledFor` = a Friday
08:00 in `Africa/Cairo` (EET, UTC+2, no DST in Egypt currently, but this must hold generally for a
timezone that does observe DST — e.g. `Europe/London`). Each of the 7 `advanceOneDay` calls
individually re-derives the UTC offset before/after that single day and corrects for any DST shift
that specific day crossed, exactly as the existing daily branch already does one day at a time —
running it 7 times back-to-back composes correctly with no additional logic, since each step is
independently DST-safe.

**Case 4 — dedicated reminder follows a plan's weekday edit.** A dedicated reminder exists for a
plan with `cadence.weekday = 5` (Friday), `time = "18:00"`. The user edits the plan's cadence to
`weekday = 0` (Sunday) via `PATCH /api/plans/:planId`. The route (see Files to Change) re-derives
the dedicated reminder from the updated plan, calling `setDedicatedWirdReminder` again with
`recurrence: "weekly", weekday: 0` — `upsertScheduledReminder`'s existing dedupe-key upsert
replaces the row's `scheduled_for`/`weekday` in place; no orphaned Friday row remains.

**Case 5 — general slot due-day skip is silent, not a failure.** A general reminder slot has
`recurrence: "weekly", weekday: 3` (Wednesday). The cron fires on a Wednesday when the bound plan's
assignment was already completed earlier that day. `resolveGeneralWirdDispatch` calls
`deriveAssignments`, gets a completed assignment, filters it out of `pending`, returns
`shouldSend: false`. The route's skip-guard branch must reschedule (not fail) — confirmed by the
`"daily" || "weekly"` fix above — landing on the following Wednesday.

## Files to Change

- `app/constants/plans.ts` — add `{ type: "weekly"; weekday: number }` to `CustomWirdCadence`; add
  optional `weekday?: number` to the `fixed_cycle` `TrackRule` variant; add `"weekly"` to
  `MissedDayPolicy` (type-only); in `planTemplateFromDefinition`, branch on
  `definition.cadence.type === "weekly"` to build a `fixed_cycle` rule with
  `weekday: definition.cadence.weekday`, `onComplete: "wrap"`,
  `defaultUnitsPerDay: definition.rangeEnd - definition.rangeStart + 1`, `boundsUnit:
  definition.unit` — regardless of `activity` (no `isMemorize` branch for this cadence: a weekly
  memorize wird is still "the same range, once a week," not an ongoing cursor march).
- `app/lib/plans/engine.ts` — add a `dateWeekday(date: string): number` helper; in
  `deriveSourceFreeTrack`'s `fixed_cycle` branch, after the existing `todayEntryAssignment` check
  and before computing `start`, return `null` when `rule.weekday !== undefined &&
  dateWeekday(date) !== rule.weekday`.
- `app/lib/plans/validate-custom-definition.ts` — add `"weekly"` to `CustomWirdCadenceInput`
  (`{ type: "weekly"; weekday: number }`) and `ALLOWED_CADENCE_KEYS_BY_TYPE`; validate `weekday` is
  an integer 0–6; in `resolveCustomCadence`, return `{ cadence: { type: "weekly", weekday } }`. In
  `resolveCustomPlanEdit`, the existing `hasDefinitionEdit`/`b.cadence` path already re-resolves
  through `resolveCustomCadence` unchanged — no special-casing needed there.
- `app/lib/plans/custom-wird-estimate.ts` — add a `"weekly"` case to `CustomCadenceType` and
  `computeCadenceEstimate`: returns a `type: "weekly"` result carrying the weekday index (display
  text resolved by the caller via i18n, e.g. "Every Friday" / "كل جمعة" — no day-name strings live
  in this pure helper).
- `app/components/plans/CustomWirdForm.tsx` — add a third cadence-type option ("Weekly
  recurrence") alongside "By pace" / "By deadline", with a 7-pill weekday selector (Sun–Sat, or
  locale-ordered) replacing the pace/deadline inputs when selected. Wire through
  `buildCustomCreateBody`/`buildCustomPatchBody` (in `custom-wird-form-helpers.ts`) to send
  `cadence: { type: "weekly", weekday }`.
- `app/lib/notifications/reminders.ts` — extend `nextOccurrence`'s recurrence check to `"daily" |
  "weekly"`; for `"weekly"`, advance via 7 sequential `advanceOneDay` calls per iteration instead
  of 1; add `computeInitialWeeklyScheduledFor(time, weekday, timeZone, now)` mirroring
  `computeInitialScheduledFor`'s DST-safe target-time construction, but seeking the next date whose
  local weekday matches `weekday` (today, if it already matches and the time hasn't passed; else
  the next matching date) before applying the target hour/minute.
- `app/lib/notifications/wird-reminder.ts` — `SetGeneralWirdReminderInput` and
  `SetDedicatedWirdReminderInput` gain optional `recurrence?: "daily" | "weekly"` and `weekday?:
  number`; `setGeneralWirdReminder`/`setDedicatedWirdReminder` pick
  `computeInitialScheduledFor`/`computeInitialWeeklyScheduledFor` based on `recurrence`, and pass
  `recurrence`/`weekday` through to `upsertScheduledReminder`. `GeneralWirdReminderSlot` and
  `DedicatedWirdReminder` gain `recurrence`/`weekday` fields, read from the row.
- `app/lib/notifications/types.ts` (or wherever `NotificationStore.upsertScheduledReminder`'s input
  type lives) — add `weekday?: number | null` alongside the existing `recurrence`/`timezone`
  fields; the Prisma-backed implementation passes it straight through to the new column.
- `app/lib/notifications/wird-reminder-resolver.ts` — no functional change required (weekday
  gating already makes `deriveAssignments` return `[]` on non-due days, which both resolvers
  already treat as "nothing pending"); rename/add a `"not_due_today"` reason distinct from
  `"all_completed"` for accurate cron logs (cheap, improves observability, not required for
  correctness).
- `app/api/cron/reminders/route.ts` — change all three `if (reminder.recurrence === "daily")`
  checks to `if (reminder.recurrence === "daily" || reminder.recurrence === "weekly")`. This is
  the live-bug fix described above.
- `app/api/notifications/daily-reminder/route.ts` — `validateReminderFields` accepts optional
  `recurrence` (`"daily" | "weekly"`, default `"daily"`) and `weekday` (integer 0–6, required iff
  `recurrence === "weekly"`) for **general** reminders only. For a **dedicated** reminder POST, the
  route ignores any client-sent `recurrence`/`weekday` and instead reads the target plan's
  `definition.cadence` to derive them server-side (never trusts the client for a value that must
  match the plan). The GET response includes `recurrence`/`weekday` on both `general` and
  `dedicated` rows.
- `app/api/plans/[planId]/route.ts` (the existing `PATCH` handler, per D5 in
  `decisions/plans.md`) — after a cadence edit that changes `weekday` on an active weekly custom
  wird with an existing dedicated reminder, re-derive and re-`setDedicatedWirdReminder` with the
  new weekday (Case 4 above). Read the file to find the exact post-update hook before wiring this.
- `app/components/plans/MyPlansList.tsx` — when the plan's cadence is `"weekly"`, render a
  read-only weekday badge next to the dedicated-reminder `TimeCombobox` (derived from the plan,
  matching the "no plan variance to trust past the source" model
  above) instead of letting the user pick a day directly on this surface.
- `app/components/notifications/DailyWirdReminderSection.tsx` — each general slot gets a
  recurrence toggle (Daily / Weekly); when Weekly is selected, a weekday pill selector appears next
  to that slot's `TimeCombobox`. Wire through `handleSlotTimeChange`-equivalent state to the POST
  body's new `recurrence`/`weekday` fields.
- `prisma/app/schema.prisma` — add `weekday Int?` to `ScheduledNotification`; update the model's
  leading comment to mention `"weekly"` alongside `"daily"`. Run
  `npm run app-migrate-dev -- --name add_scheduled_notification_weekday`.
- `messages/ar.json` / `messages/en.json` — new i18n keys for the weekly cadence type, the weekday
  picker (7 day names, both locales already need Arabic weekday names for date displays elsewhere —
  reuse if a shared source exists, otherwise add), and the "Every <weekday>" estimate/reminder copy.
- `app/lib/plans/*.test.ts` (colocated, per the repo's vitest convention) — unit tests for the new
  `dateWeekday` helper, the `fixed_cycle` weekday-gate branch (all 5 verified cases above), and
  `resolveCustomCadence`'s new `"weekly"` branch.

## Constraints

- Assignments stay derived at read time (ADR 0030) — no schedule rows, no persisted "next due"
  date beyond the reminder's own `scheduled_for`.
- `todayEntryAssignment`'s verbatim-echo invariant holds unconditionally, including on a
  non-matching weekday (Decision Tree step 1 runs before the weekday gate).
- A non-due weekday must read as `"none"` (neutral), never `"missed"`, in streaks/heatmap/dashboard
  — already true by construction since those all replay `deriveAssignments`, verified above, no
  separate fix needed in `streak.ts` or the dashboard route.
- The existing "weekly pace" (`pacePeriod: "week"` on the `"pace"` cadence type) is untouched — do
  not merge, rename, or otherwise conflate it with the new `"weekly"` cadence type.
- No cross-domain FK (ADR 0008) — `weekday` is a scalar column on `ScheduledNotification` only.
- Reminder wall-clock correctness: reuse `advanceOneDay`/`toSafeTimeZone`/`getTimezoneOffsetMs` —
  do not reimplement DST handling for the weekly branch.
- A plan bound to a dedicated reminder stays excluded from general dispatch (existing invariant,
  unaffected by this change — the bound-plan-id exclusion in `resolveGeneralWirdDispatch` doesn't
  need to know about weekday at all).

## What NOT to Do

- Do not add a new `TrackRule` kind (e.g. `"weekly_cycle"`) — the weekday-gated `fixed_cycle` reuse
  is deliberate (ADR 0070); a new kind would duplicate the wrap/stop/start logic for no benefit.
- Do not implement missed-day "catch-up" (offering last Friday's uncompleted wird on Saturday) or
  "shift" (moving the due day) — both align proposals and the reconciliation agreed on "wait for
  next week," and the weekday-gate design makes any other behavior require *more* code, not less.
- Do not let a dedicated reminder's weekday be independently user-edited — it must always mirror
  the plan's cadence, or the two can drift (the exact failure mode the issue's Q2 warns against).
- Do not store `weekday` in `payload` JSON — it is scheduling metadata, matching
  `timezone`/`locale`'s existing column treatment, not notification content (D2).
- Do not touch `pacePeriod: "week"` (the existing fractional weekly-pace math) — it is a separate,
  unrelated concept that happens to share the word "weekly" in casual description only.
- Do not extend this to biweekly, monthly, or multi-day-per-week — explicitly out of scope per the
  issue; a `weekday: number` (singular) is the whole contract.
- Do not migrate or convert existing daily-pace/deadline custom wirds to the weekly cadence.

## Decisions Made

- Missed-day policy: wait for next week, no forward shift or catch-up (issue Q1) — see ADR 0070
  and Verified Test Case 2.
- Canonical weekday storage: split by reminder shape — plan-derived for dedicated, row-native for
  general (issue Q2) — see ADR 0070 and the Canonical Weekday Source decision tree.
- Schema: new `ScheduledNotification.weekday Int?` column, not `payload` JSON (issue Q3) — matches
  the existing `timezone`/`locale` convention; see ADR 0070.
- Engine mechanism: weekday-gated `fixed_cycle` with `onComplete: "wrap"`, not a new `TrackRule`
  kind — chosen because it reuses the existing khatma-wrap logic verbatim and requires only a
  4-line gate, versus a parallel implementation of start/wrap/stop for a new kind.
- `onComplete` for a weekly wird is always `"wrap"`, never `"stop"` — a weekly wird recurs
  indefinitely and must never auto-transition `UserPlan.status` to `"completed"` the first time its
  one weekly range is finished (a risk both align agents flagged independently).
