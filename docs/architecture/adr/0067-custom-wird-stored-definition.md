# ADR 0067: Custom wird stored definition and engine derivation

**Date:** 2026-09-09
**Status:** Accepted

## Context

Plan templates in Furqan are hardcoded TypeScript constants (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`, `husun`) in `app/constants/plans.ts`. Users cannot author their own wird. [ADR 0030](./0030-plan-engine-derived-assignments.md) explicitly deferred user-authored plans:

> _"If user-authored plans become real later, a DB overlay instantiates the same track/rule shapes (hybrid — decided with the user)."_

Users require custom reading, listening, memorization, or review goals over bounded Quran ranges (e.g. "Read Surah Maryam in 5 days", "Memorize Juz Amma at 1 page/day", "Review Juz 28–30 twice before Ramadan"). Unlike presets that wrap continuously across the whole mushaf, a custom wird covers its bounded range and then completes.

All user state must live in `furqan_app` with scalar Quran references only ([ADR 0008](./0008-quran-app-database-split.md)), assignments must remain pure functions derived at read time without materialized schedule rows (ADR 0030), and per-track units (`page` | `verse`) must be preserved ([ADR 0038](./0038-plan-engine-per-enrollment-verse-unit.md)).

## Options Considered

**Option A — Shared custom-template table (`custom_plan_templates`)**
Templates authored by users are stored as rows in a shared table, referenced by `UserPlan.custom_template_id`. Rejected: custom wirds are personal, non-social, and ephemeral study goals. A shared table introduces relational join overhead, cross-user privacy boundaries, template lifecycle complexity (deleting/modifying a template that has active enrollments), and copy-on-write versioning without any product benefit.

**Option B — Materialized assignment schedule rows**
Enrollment precomputes a row per day until completion. Rejected: directly contradicts ADR 0030. Any pause, missed day, or pace recomputation would require deleting and regenerating future schedule rows, breaking offline safety and unit testability.

**Option C — Per-enrollment stored definition (`UserPlan.definition Json`) + pure read-time derivation (chosen)**
`UserPlan` gains nullable `name String?` and `definition Json?`. `template_key = "custom"` selects this path. The stored definition is a self-contained, immutable snapshot of the user-authored single track `{ activity, unit, rangeStart, rangeEnd, cadence }`. At read time, the engine instantiates a standard `PlanTemplate` via a pure function `planTemplateFromDefinition(definition)` with zero database calls.

## Decision

Option C. Concretely:

1. **Storage model:**
   - `UserPlan` schema in `prisma/app/schema.prisma` gains:
     - `name String?` — user's own display title (e.g. "حفظ سورة الكهف", i18n-neutral).
     - `definition Json?` — the canonical single-track definition.
   - `template_key = "custom"` identifies custom enrollments.
   - Nullable and purely additive: existing enrollments (`daily-wird`, `husun`, etc.) retain `name = null` and `definition = null`. Zero data migration.

2. **Definition shape:**
   ```typescript
   export type CustomWirdCadence =
     | {
         type: "pace";
         unitsPerDay: number;
       }
     | {
         type: "deadline";
         endDate: string; // "YYYY-MM-DD"
         repetitions?: number; // K repeats of the bounded range (K >= 1, default 1)
       };

   export type CustomWirdDefinition = {
     activity: PlanActivity; // "read" | "listen" | "memorize" | "review"
     unit: PlanUnit;         // "page" | "verse"
     rangeStart: number;     // canonical page (1..604) or verse ordinal (1..6236)
     rangeEnd: number;       // canonical page (1..604) or verse ordinal (1..6236)
     cadence: CustomWirdCadence;
   };
   ```

3. **Rule derivation:**
   - `memorize` maps to `cursor_advance` with `rule.targetStart = rangeStart`, `rule.targetEnd = rangeEnd`, and `rule.boundsUnit = unit` (immutable snapshot on the rule, not user-editable params).
   - `read`, `listen`, `review` map to `fixed_cycle` with `rangeStart`, `rangeEnd`, `boundsUnit = unit`, and a new rule property: `onComplete: "stop"`.
   - `boundsUnit?: PlanUnit` is added to BOTH `fixed_cycle` and `cursor_advance` rules — load-bearing for keeping a native verse pace out of `toVerseEquivalent`.
   - Missed-day policy maps directly from cadence: `pace` → `missedDayPolicy: "cursor"`; `deadline` → `missedDayPolicy: "calendar"`.

4. **`onComplete: "stop"` and Repeat Count K semantics:**
   - Standard `fixed_cycle` wraps indefinitely (`if (start > boundEnd) start = boundStart`).
   - With `onComplete: "stop"`, the engine tracks completed passes over `[boundStart, boundEnd]`.
   - For `repetitions = K`:
     - While `completedPasses < K`: when `lastEnd === boundEnd`, the next start wraps to `boundStart` for pass `k + 1`.
     - When `completedPasses >= K`: when `start > boundEnd`, the engine returns `null` (exhausted assignment, identical to an exhausted `cursor_advance`).
   - Under `missedDayPolicy: "calendar"` with repeat count K, remaining units across all uncompleted passes are dynamically spread across remaining calendar days:
     `remainingUnits = (K - completedPasses - 1) * (boundEnd - boundStart + 1) + (boundEnd - start + 1)`.

5. **Completion lifecycle:**
   - Pure derivation in `engine.ts` performs **zero database writes**. It returns `[]` when all assignments are exhausted.
   - The database transition `UserPlan.status → "completed"` is executed in `POST /api/plans/[planId]/progress`:
     - When a progress entry is logged that satisfies completion (`completedPasses >= K` for `fixed_cycle`, or `range_end >= targetEnd` for `cursor_advance`), `user_plans.status` is updated to `"completed"` in the same request.
     - Symmetrically, `DELETE /api/plans/[planId]/progress` (undo check-off) transitions a `"completed"` plan back to `"active"` if the deleted entry drops progress below completion.
   - `GET /api/plans/today` queries `where: { status: "active" }` and derives assignments; if an active plan returns empty assignments, it is omitted from due items.

## Consequences

- **+** Fulfills ADR 0030's deferred "DB overlay" without altering the pure derive-at-read-time engine architecture.
- **+** Zero migration risk; existing enrollments (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`, `husun`) are byte-for-byte untouched.
- **+** Snapshot immutability: each enrollment owns its definition; changes to future presets or other plans cannot corrupt active enrollments.
- **+** Clean separation of concerns: input validation and surah/juz resolution belong to C2 (`POST /api/plans`), UI belongs to C3; the engine only consumes canonical page/verse ranges.
- **-** Definitions are duplicated per enrollment rather than shared or normalized (accepted: user study goals are personal and single-user).
- **-** `fixed_cycle` branching now accounts for `onComplete: "stop"` and pass count tracking in `engine.ts`.
