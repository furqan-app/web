---
title: Daily-Recurring Custom Wirds with Full-Range Wrap
type: feature
date: 2026-09-23
status: implemented
area: awrad
issue: 661
adr: [0073]
---

# Daily-Recurring Custom Wirds with Full-Range Wrap

## Summary

Users can create a custom wird that repeats its entire chosen range every single day (e.g. Surah Al-Mulk every night, Surah Al-Waqi'ah, or specific ayah/page ranges) without fragmenting into daily paces or stopping upon completion. This adds a fourth cadence option alongside pace, deadline, and weekly recurrence, organizing the creation UI schedule into goal-oriented paces/deadlines and perpetual recurring habits (daily vs weekly). The wird recurs indefinitely via `fixed_cycle` wrap semantics, is exempt from terminal plan completion, maintains streak continuity without backlog accumulation on missed days, and works seamlessly with smart completion and opt-in auto-write dwell/playback tracking. See [ADR 0073](../architecture/adr/0073-daily-recurring-custom-wirds.md).

## Root Cause / Approach

Prior to this feature, custom wirds only supported terminal completion (`onComplete: "stop"` for pace and deadline) or weekly recurrence on one specific day of the week (ADR 0070). A user wanting to read Surah Al-Mulk daily could only set a daily pace of the full surah, which immediately marked the plan as `"completed"` upon the first day's check-off, permanently stopping the wird.

### 1. Engine: Full-Range `fixed_cycle` with `onComplete: "wrap"`

A daily-recurring custom wird reuses the existing `fixed_cycle` engine:
- `CustomWirdCadence` gains variant `{ type: "daily" }`.
- `planTemplateFromDefinition` constructs a single track with `kind: "fixed_cycle"`, `defaultUnitsPerDay: definition.rangeEnd - definition.rangeStart + 1` (the full range), and `onComplete: "wrap"`.
- Unlike weekly custom wirds (ADR 0070), `weekday` is omitted (`undefined`), so the track produces an assignment on every calendar day.
- On each new day after completion, `start = state.lastEnd + 1 > boundEnd ? boundStart : ...` wraps `start` back to `boundStart`.
- On days following a missed day, `state.lastEnd` retains its previous value, and `start` still wraps back to `boundStart`, assigning today's full range without backlog or double-assignment.

### 2. Completion Exemption

- In `app/lib/plans/custom-plan-completion.ts`: `isCustomPlanCompleted` returns `false` unconditionally when `definition.cadence.type === "daily"`, matching `"weekly"`.
- The plan status remains `"active"` forever until the user explicitly pauses or abandons it.

### 3. UI Hierarchy & Mobile Layout

In `app/components/plans/CustomWirdForm.tsx`:
- The schedule section organizes into three top-level tabs:
  1. **بالمعدل / By pace**
  2. **بتاريخ إنجاز / By deadline**
  3. **تكرار دوري / Recurring**
- Under **Recurring**, a clean sub-toggle allows choosing between:
  - **يومي / Daily**: Displays a subtle hint "يتكرر كامل النطاق كل يوم" / "The entire range repeats every day".
  - **أسبوعي / Weekly**: Displays the existing 7-day pill selector (Sun–Sat) to select the due weekday.
- This prevents horizontal overcrowding on narrow screens (320px–360px mobile viewports) and provides a clean conceptual distinction between finite goals and perpetual habits.

### 4. Smart Completion & Auto-Write Compatibility

- Smart completion (`useSmartCompletion`) listens to assignments derived via `GET /api/plans/today`.
- For reading, active dwell (60s floor per page, 100% of target pages) evaluates `getTargetPagesForAssignment`. For verse-unit wirds (e.g. Surah Al-Mulk), verses resolve to pages via `verseIndex`.
- Meeting criteria triggers `onCheckOff`, logging `POST /api/plans/:planId/progress` for today.
- Because `isCustomPlanCompleted` returns `false`, auto-write completes today's check-off, plays the flourish notice, and leaves the plan active for tomorrow.
- Local midnight rollover resets dwell accumulation, allowing the next day's reading to trigger auto-write anew.

### 5. Dedicated Reminders

- `dedicatedRecurrenceForDefinition` returns `{ recurrence: "daily" }` with `weekday: undefined` for daily custom wirds.
- Uses existing daily notification dispatch without schema changes or new migrations.

## Decision Tree / Algorithm

See [ADR 0073](../architecture/adr/0073-daily-recurring-custom-wirds.md).

For daily recurring track assignment on date `D`:

1. **Today Already Logged:** If `state.todayEntry` exists for date `D`, echo that entry's range verbatim (`completed: true`).
2. **First Day (No Prior Progress):** `state.lastEnd === null` -> `start = boundStart`. Assignment is `boundStart` to `boundEnd` (`completed: false`).
3. **Prior Day Completed:** `state.lastEnd === boundEnd` -> `start = boundEnd + 1 > boundEnd` -> wrap to `boundStart`. Assignment is `boundStart` to `boundEnd` (`completed: false`).
4. **Prior Day Missed:** `state.lastEnd` is earlier -> `start = boundStart`. Assignment is `boundStart` to `boundEnd` (`completed: false`). The missed day shows as uncompleted in streaks and heatmap.
5. **Progress Logged:** `POST /api/plans/:planId/progress` checks `isCustomPlanCompleted`. Returns `false`; `user_plans.status` remains `"active"`.

## Verified Test Cases

### Case 1: Surah Al-Mulk Daily Reading (Verses 5214–5243)
- Range: Surah Al-Mulk (30 verses). Cadence: Recurring -> Daily.
- Day 1 (Wednesday): Assignment is verses 5214–5243. User completes it. `status` remains `"active"`.
- Day 2 (Thursday): Assignment is verses 5214–5243 afresh. User misses it.
- Day 3 (Friday): Assignment is verses 5214–5243 without accumulation. Thursday registers as a missed day in activity streak.

### Case 2: Smart Completion Auto-Write on Daily Wird
- User with `autoWriteEnabled = true` reads pages 562–564 (Surah Al-Mulk).
- Dwell time reaches >= 60s active on all 3 pages.
- Smart completion auto-writes check-off via `POST /api/plans/:planId/progress`.
- Plan remains `"active"` with check-off dial filled.
- Day rolls over at local midnight: dial resets, and new day's assignment is ready for auto-write.

### Case 3: Form State & Validation
- Selecting "تكرار دوري" and "يومي" submits `cadence: { type: "daily" }`.
- Switching between Daily and Weekly toggles between weekday picker and daily hint.
- Editing an existing daily recurring plan preserves the daily cadence.

## Files to Change

- `app/constants/plans.ts` — Add `{ type: "daily" }` to `CustomWirdCadence`. Update `planTemplateFromDefinition` to return full-range `fixed_cycle` with `onComplete: "wrap"`.
- `app/lib/plans/custom-plan-completion.ts` — Return `false` in `isCustomPlanCompleted` for `cadence.type === "daily"`.
- `app/lib/plans/validate-custom-definition.ts` — Allow and validate `cadence.type === "daily"`.
- `app/lib/plans/custom-wird-estimate.ts` — Add estimate support for daily recurring wirds (`estimate.type = "daily"`).
- `app/components/plans/CustomWirdForm.tsx` — Restructure schedule toggle into Pace, Deadline, and Recurring (Daily / Weekly).
- `app/lib/plans/custom-wird-form-helpers.ts` — Update `buildCustomCreateBody` and `buildCustomPatchBody` for daily cadence.
- `messages/ar.json` & `messages/en.json` — Add translation keys for recurring schedule UI.
- `app/lib/plans/custom-plan-completion.test.ts` — Test that daily recurring wirds never complete.
- `app/lib/plans/engine-daily.test.ts` — Test engine wrap and rollover for daily recurring custom wirds.
- `app/lib/plans/validate-custom-definition.test.ts` — Test validation of daily cadence.
- `app/components/plans/custom-wird-form.test.ts` — Test form helpers with daily recurring cadence.

## Constraints

- Zero database schema migrations: `ScheduledNotification` already supports `recurrence: "daily"`, and `UserPlan.definition` is JSON.
- Strictly pure derivation in `engine.ts` (ADR 0030): assignments are derived at read time, never persisted as calendar rows.
- No backlog accumulation: a missed day never doubles tomorrow's quantity.
- Activity flexibility: daily recurrence applies to read, listen, and review (and memorize if chosen) using full-range wrap.

## What NOT to Do

- Do NOT create a new `TrackRule` kind — reuse `fixed_cycle` with `onComplete: "wrap"`.
- Do NOT add a 4th top-level button on the schedule segmented bar — group into Pace, Deadline, and Recurring to preserve mobile layout.
- Do NOT alter `UserPlan.status` to `"completed"` upon finishing a daily recurring wird.
- Do NOT alter `ScheduledNotification.weekday` for daily recurring wirds — it must remain `null`.

## Decisions Made

- Consolidate weekly and daily recurrence under a single "تكرار دوري" / "Recurring" segmented tab to prevent mobile viewport button squishing and maintain clean UX hierarchy.
- Re-use `onComplete: "wrap"` with full-range `defaultUnitsPerDay`, identical to weekly recurrence minus the weekday gate.
- Verified that `useSmartCompletion` requires zero changes to support daily recurring custom wirds.
