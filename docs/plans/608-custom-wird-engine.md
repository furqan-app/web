---
title: "Custom wird engine + storage: user-authored single-track plan definitions"
type: feature
date: 2026-09-09
status: implemented
area: awrad
issue: 608
adr: [0067]
---

# Custom wird engine + storage: user-authored single-track plan definitions

## Summary

Today, plan templates in Furqan are hardcoded TypeScript constants (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`, `husun`) in `app/constants/plans.ts`. Users cannot author their own custom reading, listening, memorization, or review plans. This task implements the foundational engine and storage overlay deferred in [ADR 0030](../architecture/adr/0030-plan-engine-derived-assignments.md): storing user-defined single-track definitions per enrollment in `UserPlan`, resolving a pure `PlanTemplate` from the stored definition at read time without any database calls inside the engine, introducing `onComplete: "stop"` semantics on bounded `fixed_cycle` tracks, supporting calendar deadlines with repeat counts (K repeats), and handling the completion lifecycle when the bounded goal is fulfilled.

## Root Cause / Approach

### 1. Storage Model: Per-Enrollment JSON vs. Shared Template Table

**Recommendation: Store definitions per-enrollment in `UserPlan.definition Json?` with `UserPlan.name String?` and `template_key = "custom"`.**

Rationale:
1. **Personal and Ephemeral Scope:** A custom wird is created by an individual user for a specific personal study goal (e.g. "حفظ سورة الكهف", "ختمة في رمضان", "مراجعة جزء عم"). Users do not publish, browse, or share custom templates across accounts.
2. **Snapshot Immutability:** Storing `definition` directly on `UserPlan` creates an immutable snapshot of the track rules locked to that specific enrollment. If templates lived in a shared table, modifying or deleting a template would risk mutating or corrupting active enrollments, necessitating complex copy-on-write versioning.
3. **Purity and Performance:** `appPrisma.userPlan.findMany(...)` already retrieves `UserPlan` rows with their `params` and `progress`. Embedding `definition` in the same row requires zero additional joins or roundtrips, adhering strictly to ADR 0030 and [ADR 0008](../architecture/adr/0008-quran-app-database-split.md).

### 2. Definition Shape & Template Generation

**Recommendation: A strictly-typed, canonical single-track definition shape with unified cadence encoding and seamless reconciliation with `UserPlanParams`.**

```typescript
export type CustomWirdCadence =
  | {
      type: "pace";
      /** Units (pages or verses, depending on track unit) per day. */
      unitsPerDay: number;
    }
  | {
      type: "deadline";
      /** Target completion date in local "YYYY-MM-DD" format. */
      endDate: string;
      /** Repeat count: number of times the full range is covered (K >= 1). Default 1. */
      repetitions?: number;
    };

export type CustomWirdDefinition = {
  activity: PlanActivity; // "read" | "listen" | "memorize" | "review"
  unit: PlanUnit;         // "page" | "verse"
  rangeStart: number;     // canonical page (1..604) or verse ordinal (1..6236)
  rangeEnd: number;       // canonical page (1..604) or verse ordinal (1..6236)
  cadence: CustomWirdCadence;
};
```

#### Rule Kind Selection:
- **`memorize`**: Maps to `cursor_advance`. Memorization is intrinsically sequential; you memorize through the target range and stop when reaching the end (`targetEnd`).
- **`read` | `listen` | `review`**: Maps to `fixed_cycle` with `rangeStart`, `rangeEnd`, and a new rule property: `onComplete: "stop"`. Unlike presets which wrap indefinitely, custom wirds stop when the target range has been completed.

#### Reconciling `definition.unit` with ADR 0038 (`params.trackUnits`):
In ADR 0038, `resolveTrackUnit` inspects `params.trackUnits?.[trackKey] ?? "page"`.
For a custom wird:
1. `definition.unit` stores the author's choice (`"page"` | `"verse"`).
2. The generated single track has key `"custom"`.
3. At enroll time (C2), `params.trackUnits` is populated with `{ custom: definition.unit }`.
4. In `app/constants/plans.ts`, `planTemplateFromDefinition` constructs `PlanTrack` with `unit: definition.unit`.
5. As a safeguard, `resolveTrackUnit` falls back to `track.unit` if `params.trackUnits?.[trackKey]` is absent (`params.trackUnits?.[trackKey] ?? track.unit ?? "page"`), ensuring 100% agreement.

#### Crucial Engine Invariant: Verse-Unit Bounds in `fixed_cycle`:
In `app/lib/plans/engine.ts`:
```typescript
const fixedCycleBounds = (
  rule: Extract<TrackRule, { kind: "fixed_cycle" }>,
  unit: PlanUnit
): { start: number; end: number } =>
  unit === "page"
    ? { start: rule.rangeStart, end: rule.rangeEnd }
    : {
        start: pageFirstVerseOrdinal(rule.rangeStart),
        end: pageLastVerseOrdinal(rule.rangeEnd),
      };
```
Existing presets declare `rangeStart: 1, rangeEnd: 604` in mushaf pages. When `unit === "verse"`, `fixedCycleBounds` converts page numbers to verse ordinals (1..6236).
However, for a custom wird where `definition.unit === "verse"`, `definition.rangeStart` and `definition.rangeEnd` are **already canonical verse ordinals** (e.g. 5241..5270). Passing them through `pageFirstVerseOrdinal` would corrupt the range.
**Solution:** `TrackRule` for `fixed_cycle` gains an optional `boundsUnit?: PlanUnit`. When `rule.boundsUnit === "verse"`, `fixedCycleBounds` returns `{ start: rule.rangeStart, end: rule.rangeEnd }` without re-converting. When `boundsUnit` is omitted or `"page"`, existing presets maintain their exact behavior.

### 3. Completion Lifecycle: Mechanism and Trigger Point

**Recommendation: Atomic status transition in `POST /api/plans/[planId]/progress` with reversibility in `DELETE /api/plans/[planId]/progress`, keeping `engine.ts` 100% pure.**

1. **Engine Purity:** `engine.ts` (`deriveAssignments`) remains completely pure. It performs zero database writes. When a custom wird is finished, the engine simply returns `null` for the track (so `assignments` is empty `[]`), identical to how an exhausted `cursor_advance` behaves today.
2. **Write Trigger Point (`POST /api/plans/[planId]/progress`):**
   When a user marks an assignment complete, the progress entry is upserted. Immediately following the entry write, the endpoint checks if the enrollment is a custom wird (`plan.template_key === "custom"`):
   - For `memorize` (`cursor_advance`): checks if `Number(entry.range_end) >= targetEnd`.
   - For `read` / `listen` / `review` (`fixed_cycle` + `onComplete: "stop"`): checks if `completedPasses >= K`.
   - If satisfied, updates `user_plans.status = "completed"` in the database.
3. **Reversibility / Undo Trigger Point (`DELETE /api/plans/[planId]/progress`):**
   If a user undoes a check-off for a plan that is `"completed"`, the route deletes the progress entry and checks if progress has fallen below completion. If so, it restores `user_plans.status = "active"`.
4. **Read-Time Safety in `GET /api/plans/today`:**
   `GET /api/plans/today` filters `where: { status: "active" }`. If an active custom plan's assignments derive to empty `[]` (e.g. if completed outside the progress endpoint or in an edge case), it contributes no assignments to the today view.

### 4. `onComplete` Semantics and Repeat Count K

**Recommendation: Bounded stop at `rangeEnd` with explicit multi-pass tracking for K repeats and calendar pace recomputation.**

1. **At and Past `rangeEnd`:**
   - On any day where `start <= boundEnd`: assignment is generated as `[start, Math.min(start + units - 1, boundEnd)]`.
   - When the user checks off `boundEnd`, that pass is complete.
   - For next day's derivation (`state.lastEnd === boundEnd`):
     - If `completedPasses < K`: the track wraps to `boundStart` for pass `k + 1` (`start = boundStart`).
     - If `completedPasses >= K`: all K passes are finished! `start > boundEnd` triggers `onComplete: "stop"`, and the engine returns `null` (no assignment).
2. **Tracking `completedPasses` from Progress Log:**
   ```typescript
   const completedPasses = entries.filter(
     (e) => e.track_key === track.key && Number(e.range_end) === boundEnd
   ).length;
   ```
   Because assignments clamp to `boundEnd`, every completed pass ends with an entry where `range_end === String(boundEnd)`.
3. **Interaction with `missedDayPolicy`:**
   - **`pace` cadence (`missedDayPolicy: "cursor"`):**
     - Pace is fixed (`cadence.unitsPerDay`).
     - Missed days shift the cursor forward without altering the daily pace.
     - Runs for 1 pass (K = 1). When `rangeEnd` is completed, stops.
   - **`deadline` cadence (`missedDayPolicy: "calendar"`):**
     - Target end date is `cadence.endDate`, repeat count is `cadence.repetitions ?? 1`.
     - Missed days reduce `remainingDays = dayCountInclusive(date, endDate)`.
     - Daily units are dynamically recomputed to finish all remaining passes before the deadline:
       `remainingUnits = (K - completedPasses - 1) * (boundEnd - boundStart + 1) + (boundEnd - start + 1)`
       `units = clampQuantity(Math.ceil(remainingUnits / remainingDays))`
     - If `remainingDays <= 0`: user is at or past deadline, so `units = remainingUnits` (complete today).

#### Worked Example: K = 2 Deadline Cadence
- **Goal:** Review Surah Al-Mulk (pages 562..564 = 3 pages), 2 times (K = 2) in 3 days (2026-10-01 to 2026-10-03).
- **Day 1 (2026-10-01):**
  - Remaining days: 3.
  - Completed passes: 0. Range length = 3. Total units remaining = (2 - 0 - 1) * 3 + (564 - 562 + 1) = 6 pages.
  - Pace: `Math.ceil(6 / 3) = 2` pages/day.
  - Assignment: `562..563`. User logs `[562, 563]`.
- **Day 2 (2026-10-02):**
  - Remaining days: 2. `start = 564`.
  - Pass 1 remaining: 1 page (`564..564`). Pass 2 remaining: 3 pages. Total remaining = 4 pages.
  - Pace: `Math.ceil(4 / 2) = 2` pages/day.
  - Assignment clamps to pass 1 end: `564..564`. (Pass 1 complete!)
  - User logs `[564, 564]`. Now `completedPasses = 1`.
- **Day 3 (2026-10-03):**
  - Remaining days: 1. `completedPasses = 1 < 2`. `lastEnd === 564`, so next start wraps to `562`.
  - Pass 2 remaining: 3 pages. Total remaining = 3 pages.
  - Pace: `Math.ceil(3 / 1) = 3` pages/day.
  - Assignment: `562..564`. (Pass 2 complete!)
  - User logs `[562, 564]`. Now `completedPasses = 2`.
- **Day 4 (2026-10-04):**
  - `completedPasses = 2 >= K`. Engine returns `null`. Plan is marked `completed`.

### 5. Backward-Compatibility Proof

All existing template reads are additive and preserve 100% byte-for-byte behavior:

| File | Current Call | Custom Wird Handling | Compatibility Proof |
|---|---|---|---|
| `app/constants/plans.ts` | `getPlanTemplate(key)` | Added helper `getEnrollmentTemplate(plan)`. If `template_key === "custom"`, calls `planTemplateFromDefinition(plan.definition)`. Standard `getPlanTemplate` is unchanged. | Existing templates continue reading from `PLAN_TEMPLATES` object directly. |
| `app/api/plans/today/route.ts` | `const template = getPlanTemplate(plan.template_key)` | Uses `getEnrollmentTemplate(plan)` or resolves definition if `"custom"`. | Existing enrollments (`daily-wird`, `husun`, etc.) take the existing branch verbatim. |
| `app/api/plans/streak/route.ts` | `const template = getPlanTemplate(plan.template_key)` | Resolves template from definition if `"custom"`. | Existing enrollments execute existing streak derivation code untouched. |
| `app/api/plans/[planId]/progress/route.ts` | `const template = getPlanTemplate(plan.template_key)` | Resolves template from definition if `"custom"`. Checks completion transition on POST/DELETE. | Check-off logic for presets is identical; status update only executes for `template_key === "custom"`. |
| `app/api/plans/route.ts` | `serializePlan`, `withTargetJuz` | `serializePlan` passes `name` and `definition`. `withTargetJuz` resolves template via definition if `"custom"`. | Existing plans have `name: null, definition: null`; serialization is transparent. |
| `app/api/plans/[planId]/route.ts` | `const template = getPlanTemplate(plan.template_key)` | Resolves template from definition if `"custom"`. | Preserves existing param update behavior. |
| `app/lib/plans/engine.ts` | `deriveSourceFreeTrack` (`fixed_cycle`) | Wrap logic: `if (rule.onComplete === "stop") { if (start > boundEnd) return null; } else { if (start > boundEnd) start = boundStart; }` | Existing templates do NOT set `onComplete: "stop"`; they continue to wrap indefinitely. |

### 6. Database Migration Strategy

- Schema additions in `prisma/app/schema.prisma` under model `UserPlan`:
  ```prisma
  name       String?
  definition Json?
  ```
- Both columns are nullable (`NULL`), requiring no data backfill and zero downtime.
- Generated via standard repo command:
  ```bash
  npm run app-migrate-dev
  ```
- Creates migration file under `prisma/app/migrations/<timestamp>_add_user_plan_custom_definition/migration.sql`:
  ```sql
  ALTER TABLE `user_plans` ADD COLUMN `name` VARCHAR(191) NULL, ADD COLUMN `definition` JSON NULL;
  ```
- Complies strictly with ADR 0008 (no cross-DB relations, scalar IDs only).

### 7. C2 (#609) Contract — Enrollment API Hand-Off

- **Target bounds on rule:** Target bounds for `cursor_advance` custom plans live on `rule.targetStart` and `rule.targetEnd` (NOT on `params`). C2 must inject them when constructing the track rule.
- **Bounds unit indicator:** `rule.boundsUnit` must be set to `definition.unit` for both `fixed_cycle` and `cursor_advance` custom tracks so the engine avoids double-conversion.
- **Repetition constraint:** Memorize activity with repetitions > 1 is unsupported: C2 must reject `activity === "memorize"` if `cadence.repetitions && cadence.repetitions > 1`.

---

## Decision Tree / Algorithm

See [ADR 0067](../architecture/adr/0067-custom-wird-stored-definition.md) for full context and architectural decisions.

### 1. `planTemplateFromDefinition(definition: CustomWirdDefinition): PlanTemplate`

```
Input: CustomWirdDefinition { activity, unit, rangeStart, rangeEnd, cadence }

1. Determine policy:
   missedDayPolicy = cadence.type === "deadline" ? "calendar" : "cursor"

2. Construct rule:
   If activity === "memorize":
     rule = {
       kind: "cursor_advance",
       defaultUnitsPerDay: cadence.type === "pace" ? cadence.unitsPerDay : 1
     }
   Else (read | listen | review):
     rule = {
       kind: "fixed_cycle",
       rangeStart: definition.rangeStart,
       rangeEnd: definition.rangeEnd,
       boundsUnit: definition.unit,
       defaultUnitsPerDay: cadence.type === "pace" ? cadence.unitsPerDay : 1,
       onComplete: "stop",
       repetitions: cadence.type === "deadline" ? (cadence.repetitions ?? 1) : 1
     }

3. Return PlanTemplate:
   {
     key: "custom",
     missedDayPolicy,
     tracks: [
       {
         key: "custom",
         activity: definition.activity,
         unit: definition.unit,
         rule
       }
     ]
   }
```

### 2. Deriving `fixed_cycle` with `onComplete: "stop"` and Repeat Count K

```
In deriveSourceFreeTrack for fixed_cycle:
1. boundStart, boundEnd = fixedCycleBounds(rule, unit)
2. K = rule.repetitions ?? 1
3. completedPasses = count of entries where track_key === track.key and Number(range_end) === boundEnd

4. Determine start:
   If state.todayEntry exists:
     Return todayEntry verbatim (existing invariant)
   If state.lastEnd !== null:
     If state.lastEnd === boundEnd:
       If rule.onComplete === "stop" and completedPasses >= K:
         Return null (all passes complete!)
       Else:
         start = boundStart (wrap to next pass)
     Else:
       start = state.lastEnd + 1
   Else if params.startPage !== undefined:
     start = clamped startPage
   Else:
     start = boundStart

5. Guard end of range:
   If start > boundEnd:
     If rule.onComplete === "stop":
       Return null
     Else:
       start = boundStart

6. Calculate remaining units:
   If rule.onComplete === "stop" and template.missedDayPolicy === "calendar":
     remainingUnits = (K - completedPasses - 1) * (boundEnd - boundStart + 1) + (boundEnd - start + 1)
   Else:
     remainingUnits = boundEnd - start + 1

7. Calculate daily units:
   units = unitsPerDay(template, track, params, unit, date, remainingUnits, rule.defaultUnitsPerDay, start)

8. Return assignRange(track, start, Math.min(start + units - 1, boundEnd), state, unit)
```

### 3. Completion Check in Progress API (`POST /api/plans/[planId]/progress`)

```
After saving progress entry:
If plan.template_key === "custom" and plan.definition !== null:
  definition = plan.definition as CustomWirdDefinition
  If definition.activity === "memorize":
    isComplete = Number(entry.range_end) >= definition.rangeEnd
  Else:
    boundEnd = definition.rangeEnd
    K = definition.cadence.type === "deadline" ? (definition.cadence.repetitions ?? 1) : 1
    totalPasses = all entries for this track with Number(range_end) === boundEnd
    isComplete = totalPasses.length >= K

  If isComplete:
    await appPrisma.userPlan.update({
      where: { id: planId },
      data: { status: "completed" }
    })
```

---

## Verified Test Cases

### 1. Bounded `fixed_cycle` Stop-at-End (`onComplete: "stop"`)
- **Setup:** Custom read wird over pages 10..15. Pace 2 pages/day. `onComplete: "stop"`. K = 1.
- **Day 1:** `start = 10`. Assignment is `10..11`. User logs `[10, 11]`.
- **Day 2:** `start = 12`. Assignment is `12..13`. User logs `[12, 13]`.
- **Day 3:** `start = 14`. Assignment is `14..15`. User logs `[14, 15]`.
- **Day 4:** `lastEnd = 15 === boundEnd`. `completedPasses = 1 >= 1`.
- **Result:** Engine returns `null`. Assignment array is empty. Enrollment is not assigned new pages.

### 2. `cursor_advance` Custom Range (Memorize)
- **Setup:** Custom memorize wird over Surah Maryam (pages 305..312). Pace 1 page/day.
- **Day 1:** `start = 305`. Assignment is `305..305`.
- **Day 8:** User has logged up to page 311. `start = 312`. Assignment is `312..312`. User logs `[312, 312]`.
- **Day 9:** `lastEnd = 312 === targetEnd`. Next start is `313 > 312`.
- **Result:** Engine returns `null`. Target is fully memorized.

### 3. Missed-Day Cursor Continuity for a Bounded Wird (`missedDayPolicy: "cursor"`)
- **Setup:** Custom listening wird over pages 50..60. Pace 3 pages/day.
- **Day 1 (2026-10-01):** `start = 50`. Assignment is `50..52`. Logged `[50, 52]`.
- **Day 2 (2026-10-02):** User does not open app / misses day. No progress entry logged.
- **Day 3 (2026-10-03):** Engine derives assignment for 2026-10-03. `lastEnd = 52`.
- **Result:** Next `start = 53`. Assignment is `53..55`. Cursor shifted forward seamlessly without skipping pages or altering pace.

### 4. Calendar-Policy Pace Recompute for a Deadline Cadence (`missedDayPolicy: "calendar"`)
- **Setup:** Custom read wird over pages 1..30 (30 pages). Start date: 2026-10-01. Deadline: 2026-10-05 (5 days). K = 1.
- **Day 1 (2026-10-01):** 5 days remaining. Units remaining = 30. `ceil(30 / 5) = 6` pages/day. Assignment is `1..6`. Logged `[1, 6]`.
- **Day 2 (2026-10-02):** User misses the day.
- **Day 3 (2026-10-03):** 3 days remaining (Oct 3, 4, 5). `lastEnd = 6`, `start = 7`. Remaining units = `30 - 7 + 1 = 24` pages.
- **Result:** Recomputed pace = `ceil(24 / 3) = 8` pages/day. Assignment is `7..14`. Daily quantity increased dynamically to meet the target deadline.

### 5. Multi-Repeat Deadline Cadence (K = 2)
- **Setup:** Custom review wird over pages 582..584 (3 pages). 2 days deadline (2026-10-01 to 2026-10-02). K = 2 (6 pages total).
- **Day 1 (2026-10-01):** 2 days remaining. Total units remaining = `(2 - 0 - 1) * 3 + (584 - 582 + 1) = 6`. Pace = `ceil(6 / 2) = 3` pages.
  Assignment is `582..584`. Logged `[582, 584]`. `completedPasses = 1`.
- **Day 2 (2026-10-02):** 1 day remaining. `completedPasses = 1 < 2`. Next start wraps to `582`. Total units remaining = `3`. Pace = `ceil(3 / 1) = 3` pages.
  Assignment is `582..584`. Logged `[582, 584]`. `completedPasses = 2`.
- **Day 3 (2026-10-03):** `completedPasses = 2 >= K`.
- **Result:** Engine returns `null`.

### 6. Existing Presets Regression Verification
- **Setup:** Run `engine.test.ts` against `daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`, and `husun`.
- **Result:** All existing tests pass without modification. Bounded wrapping at page 604 continues to wrap to page 1 indefinitely.

---

## Files to Change

1. `prisma/app/schema.prisma`
   - Add `name String?` and `definition Json?` to model `UserPlan`.
2. `prisma/app/migrations/*_add_user_plan_custom_definition/migration.sql`
   - Generated Prisma migration adding nullable `name` and `definition` columns to `user_plans`.
3. `app/constants/plans.ts`
   - Define types `CustomWirdCadence` and `CustomWirdDefinition`.
   - Update `TrackRule` for `fixed_cycle` to add optional `onComplete?: "wrap" | "stop"`, `boundsUnit?: PlanUnit`, and `repetitions?: number`.
   - Add pure helper `planTemplateFromDefinition(definition: CustomWirdDefinition): PlanTemplate`.
   - Add helper `getEnrollmentTemplate(plan: { template_key: string; definition?: unknown }): PlanTemplate | null`.
   - Update `resolveTrackUnit` to check `track.unit` fallback.
4. `app/lib/plans/engine.ts`
   - In `fixedCycleBounds`: check `rule.boundsUnit === "verse"` to avoid invalid re-conversion of verse ordinals.
   - In `deriveSourceFreeTrack`: implement `onComplete: "stop"` check, pass count tracking (`completedPasses`), wrap for pass `< K`, and multi-pass remaining units calculation for calendar policy.
5. `app/lib/plans/engine.test.ts`
   - Add unit test suites for:
     - `fixed_cycle` with `onComplete: "stop"` (single pass completion).
     - `fixed_cycle` with deadline cadence and repeat count K > 1.
     - `cursor_advance` bounded target memorization.
     - Missed-day cursor continuity for bounded wird.
     - Missed-day calendar recomputation for deadline cadence.
     - Verse-unit custom wird bounds derivation.
6. `app/api/plans/today/route.ts`
   - Use `getEnrollmentTemplate(plan)` instead of `getPlanTemplate(plan.template_key)`.
7. `app/api/plans/streak/route.ts`
   - Use `getEnrollmentTemplate(plan)` instead of `getPlanTemplate(plan.template_key)`.
8. `app/api/plans/[planId]/progress/route.ts`
   - Use `getEnrollmentTemplate(plan)`.
   - On `POST`: check if custom wird reached completion, and update `status = "completed"`.
   - On `DELETE`: check if unchecking a completed custom wird drops progress below threshold, and revert `status = "active"`.
9. `app/api/plans/route.ts`
   - In `serializePlan`: include `name: plan.name` and `definition: plan.definition`.
   - In `withTargetJuz`: resolve template via `getEnrollmentTemplate(item)`.
10. `app/api/plans/[planId]/route.ts`
    - In `PATCH`: resolve template via `getEnrollmentTemplate(plan)`.
11. `docs/architecture/decisions/plans.md`
    - Add reference to ADR 0067 and document custom wird stored definition invariants.

---

## Constraints

- **Engine Purity (ADR 0030):** The engine (`deriveAssignments`) must remain a pure function of `(template, params, progress, date)`. Zero DB calls inside `app/lib/plans/engine.ts`.
- **Two-DB Invariant (ADR 0008):** No foreign keys or relations across `furqan_quran` and `furqan_app`. `UserPlan` lives in `furqan_app` and holds scalar Quran range values only.
- **Per-Track Units (ADR 0038):** Units (`page` or `verse`) are chosen per track at creation time and never migrated. Range math executes natively in the chosen unit.
- **Additive & Non-Breaking:** Existing preset enrollments (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`, `husun`) and their logged entries must remain 100% untouched.

---

## What NOT to Do

- **Do NOT implement enrollment API validation, surah/juz resolution, or `validate-params.ts` handling** — this belongs strictly to sibling issue #609 (C2).
- **Do NOT build or touch any UI components** (`PlansBrowseDialog`, `PlanEnrollForm`, `MyPlansList`, reader widgets) — this belongs strictly to sibling issue #610 (C3).
- **Do NOT support multi-track custom wirds** — custom wird is strictly single-track. Multi-track combinations (e.g. memorization + near review) remain the exclusive domain of structured templates like `husun`.
- **Do NOT implement daily-repeating fixed ranges** ("review the same surah every day") — explicitly cut from v1.
- **Do NOT implement "per week" cadence sugar in the engine** — the engine works exclusively in daily units. Week-to-day conversion is a C3 UI form concern.
- **Do NOT backfill the progress log** — out of scope.
- **Do NOT execute database writes inside `engine.ts`** — derivation is read-only.
- **Do NOT materialize schedule rows** in the database.
- **Do NOT allow memorize with repetitions > 1** — memorize + repetitions > 1 is not supported by this engine; C2 must reject it.

---

## Decisions Made

1. **Storage model:** Confirmed per-enrollment stored definition in `UserPlan.definition Json?` + `UserPlan.name String?`. Avoids relational overhead, preserves snapshot immutability, and upholds ADR 0030.
2. **Definition typing:** Unified `CustomWirdDefinition` and `CustomWirdCadence` with explicit `type: "pace"` vs `type: "deadline"`. Reconciled `definition.unit` with ADR 0038's `params.trackUnits` via clean template instantiation.
3. **Verse-unit bounds safety:** Identified that `fixedCycleBounds` converts page numbers to verse ordinals for verse-unit tracks. For custom wirds where range bounds are already verse ordinals, added `boundsUnit?: PlanUnit` to prevent double-conversion.
4. **Completion lifecycle trigger:** Selected atomic write in `POST /api/plans/[planId]/progress` upon checking off the terminal range, with symmetric restore on `DELETE /api/plans/[planId]/progress`. Keeps the engine pure while ensuring `user_plans.status` accurately reflects completion.
5. **Repeat count K recomputation:** Formalized the multi-pass formula for deadline cadence under calendar missed-day policy, ensuring pace dynamically accounts for all uncompleted passes across remaining days.
