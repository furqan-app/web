---
title: "Custom wird enrollment API: range + cadence resolution & validation"
type: feature
date: 2026-09-09
status: implemented
area: awrad
issue: 609
adr: [0067]
---

# Custom wird enrollment API: range + cadence resolution & validation

## Summary

Builds the server-side enrollment and edit API for user-authored custom wirds on top of the engine and storage foundation shipped in [ADR 0067](../architecture/adr/0067-custom-wird-stored-definition.md) (#608). The user picks a Quran range one of four ways (by surah, juz, page, or verse — no mixing modes) and a cadence (per day, per week, or finish by deadline with optional K repetitions). The server resolves these inputs into a canonical numeric `CustomWirdDefinition` (mushaf page numbers or verse ordinals), hardens and validates all bounds and constraints so the engine keeps trusting its inputs, and stores `name`, `definition`, and derived `params` on `UserPlan`. In `PATCH`, edits replace cadence and name wholesale, while enforcing unit immutability and freezing range bounds once progress has been logged.

## Root Cause / Approach

### 1. Separation of Responsibilities & Sibling Module

**Recommendation: Create a dedicated sibling module `app/lib/plans/validate-custom-definition.ts` rather than expanding `app/lib/plans/validate-params.ts`.**

Rationale:
- `validate-params.ts` is explicitly built for static preset templates (`daily-wird`, `husun`). It accepts an already-instantiated `PlanTemplate` and hardens overrides inside `UserPlanParams` (`params.quantities`, `params.targetStart`, `params.startPage`).
- Custom wird enrollment represents an inverse flow: the user submits high-level domain selections (`range`, `cadence`, `name`, `activity`), from which the server must query Quran bounds, parse verse keys, convert weekly rates, construct the canonical `CustomWirdDefinition`, and derive `UserPlanParams`.
- Isolating this logic in `validate-custom-definition.ts` keeps `validate-params.ts` lean, avoids mixing preset and custom parameter types, and allows focused, fast unit testing in `validate-custom-definition.test.ts`.

### 2. Request Body vs. Stored Definition

The client submits a clean discriminated union designed for UI pickers:

```typescript
export type CustomWirdRangeInput =
  | {
      mode: "surah";
      startSurah: number;
      endSurah?: number; // defaults to startSurah
    }
  | {
      mode: "juz";
      startJuz: number;
      endJuz?: number; // defaults to startJuz
    }
  | {
      mode: "page";
      startPage: number;
      endPage?: number; // defaults to startPage
    }
  | {
      mode: "verse";
      // 1-based verse ordinal (1..6236) or "surah:ayah" verse key (e.g. "2:255")
      startVerse: number | string;
      endVerse?: number | string; // defaults to startVerse
    };

export type CustomWirdCadenceInput =
  | {
      type: "pace";
      period?: "day" | "week"; // defaults to "day"
      amount: number; // units per day or units per week
    }
  | {
      type: "deadline";
      endDate: string; // "YYYY-MM-DD"
      repetitions?: number; // K repeats of the bounded range (K >= 1, default 1)
    };

export type CreateCustomPlanBody = {
  template_key: "custom";
  name: string;
  activity: PlanActivity;
  range: CustomWirdRangeInput;
  cadence: CustomWirdCadenceInput;
  start_date?: string; // "YYYY-MM-DD", optional (defaults to today)
};

export type PatchCustomPlanBody = {
  name?: string;
  cadence?: CustomWirdCadenceInput;
  range?: CustomWirdRangeInput;
  status?: UserPlanStatus;
};
```

#### Differences from Stored `CustomWirdDefinition`:
1. **Range Storage (D3 / ADR 0030):** Surah and Juz numbers are UI/enroll-time concepts only. The stored `definition` contains only canonical `rangeStart: number` and `rangeEnd: number` (mushaf pages 1–604 or verse ordinals 1–6236) along with `unit: PlanUnit` ("page" | "verse"). Surah/juz numbers are never persisted.
2. **Weekly Pace Normalization:** The engine derivations (`deriveAssignments`, `unitsPerDay`) operate strictly on daily units. A weekly cadence (`period: "week"`, page-range modes only) is resolved server-side at enroll time to the exact fractional `unitsPerDay = amount / 7` and stored as `type: "pace", unitsPerDay`; the engine's `clampQuantity` floors it to >= 1 unit/day at daily derivation. "Per week" does not exist in `CustomWirdCadence` or `engine.ts`.
3. **Name Placement:** `name` is stored in the dedicated `UserPlan.name` column (ADR 0067), not inside the `definition` JSON blob.
4. **Derived Unit:** The client does not pass `unit`. The server derives `unit: "page"` for `surah`, `juz`, and `page` modes, and `unit: "verse"` for `verse` mode.

### 3. Verse-Unit Cadence: Restrict `per_week`

**Recommendation: Restrict `period: "week"` to page-based range modes (`surah`, `juz`, `page`), and require daily pace (`period: "day"`, integer >= 1) for `verse` mode.**

Rationale:
- Verses are discrete integer units (1..6236). Fractional verses (e.g. 5 verses/week = 0.714 verses/day) cannot be scheduled or marked in Furqan. The progress log only accepts integer boundaries.
- Rounding up (`Math.ceil(N / 7)`) or rounding down significantly distorts user pace (e.g., 1 verse/week rounds to 1 verse/day = 700% error; 5 verses/week rounds to 7 verses/week = 40% error).
- Page-unit tracks have a natural minimum of 1 page/day for fixed pace (`clampQuantity` enforces `Math.max(1, Math.floor(n))`).
- If a user has a weekly verse target (e.g. "memorize 10 verses this week"), they should use the `deadline` cadence ("finish by date D"), where the engine's calendar policy dynamically spreads remaining verses across remaining calendar days.
- Attempting to submit `period: "week"` with `mode: "verse"` returns a 422 error: `"Weekly pace is not supported for verse-level wirds; specify verses per day or use a deadline."`

### 4. Population of `UserPlan.params` for Custom Enrollments

**Recommendation: Populate `params.trackUnits.custom` and `params.endDate` (for deadline cadence only); do NOT populate `params.quantities.custom`.**

Rationale:
1. **Track Unit (ADR 0038 / C2 Contract #1):** `params.trackUnits` is set to `{ custom: definition.unit }`. This ensures any consumer inspecting `params.trackUnits` finds the custom track's unit without needing template fallback.
2. **Calendar End Date (C2 Contract #2):** For `cadence.type === "deadline"`, `params.endDate` is populated with `definition.cadence.endDate`. `engine.ts` (`unitsPerDay`) reads `params.endDate` directly to compute remaining calendar days. For `cadence.type === "pace"`, `params.endDate` is omitted.
3. **Pace Single Source of Truth:** In custom wirds, `planTemplateFromDefinition` (shipped in #608) assigns `rule.defaultUnitsPerDay = definition.cadence.unitsPerDay`. In `engine.ts`, when `params.quantities?.[track.key]` is undefined, `unitsPerDay` uses `rule.defaultUnitsPerDay`. Leaving `params.quantities` empty prevents duplicate state and eliminates drift risk between `definition.cadence` and `params.quantities`.

### 5. PATCH Edit Semantics

**Recommendation:**
- **Fully Editable:** `name`, `cadence` (pace amount/period, deadline end date, repeat count K, or switching cadence type), and `status`.
- **Permanently Frozen:** `activity` (altering activity changes rule kind between `cursor_advance` and `fixed_cycle`) and `unit` (ADR 0038 non-negotiable invariant).
- **Range Bounds (`rangeStart`, `rangeEnd`):** Editable ONLY if zero progress entries exist for this enrollment (`progressCount === 0`). Once any progress has been logged, any attempt to modify `range` is rejected with 422: `"Cannot change target range after progress has been logged; create a new custom wird instead."`
- **Progress Log Unmodified:** Under no circumstances does an edit delete, truncate, or mutate `plan_progress_entries` (ADR 0030 invariant).

Rationale:
- `engine.ts` derives the next assignment start from `state.lastEnd + 1`. If a user logs progress up to page 15 of Surah Al-Baqarah and then changes the wird range to Surah Maryam (pages 305–312), `lastEnd` remains 15, causing the engine to derive page 16 (outside Surah Maryam) or fail pass completion tracking (`state.completedPasses(boundEnd)`).
- A study goal over a different Quran range is a fundamentally distinct wird. Allowing range edits only before progress starts permits correcting initial enrollment typos, while protecting engine invariants once reading has begun.

### 6. Surah-Range Resolution

**Recommendation: Query `quranPrisma.verse.aggregate` filtering by `where: { chapter_id: { gte: startSurah, lte: endSurah } }` with `_min: { page_number: true }, _max: { page_number: true }`.**

Rationale:
- In `furqan_quran`, `verses.chapter_id` corresponds to the surah number (1–114) and is indexed in MySQL.
- `PageMetadata` (used by `getJuzPageRange`) is a legacy single-edition table scheduled to be superseded by `mushaf_page_metadata` (ADR 0033). Aggregating `verses` directly (the exact pattern used by `getHizbPageRange` in `resolve-units.ts`) avoids dependency on legacy page metadata and accurately resolves the minimum and maximum mushaf pages for any single surah or multi-surah span.
- Zero cross-domain foreign keys; reads read-only Quran data via `quranPrisma` (ADR 0008).

### 7. ADR Assessment

**An ADR is NOT warranted for #609.**
[ADR 0067](../architecture/adr/0067-custom-wird-stored-definition.md) already established the storage architecture (`UserPlan.name`, `UserPlan.definition`, `template_key = "custom"`), definition type, and engine lifecycle. Issue #609 executes the validation and resolution contract already specified in ADR 0067 and ADR 0038 without introducing new architectural patterns or schema modifications.

---

## Decision Tree / Algorithm

### 1. `resolveCustomPlanEnrollment(body: CreateCustomPlanBody)`

```
Input: body (parsed JSON)

1. Validate template_key === "custom".
2. Validate name:
   - Must be a non-empty string.
   - Trim whitespace. Must be between 1 and 100 characters inclusive.
3. Validate activity:
   - Must be one of PLAN_ACTIVITIES ("read" | "listen" | "memorize" | "review").
4. Validate start_date:
   - If provided, must match PLAN_DATE_RE (^\d{4}-\d{2}-\d{2}$).
   - Default: today UTC date string.
5. Resolve range:
   - Must have exactly one mode in ("surah", "juz", "page", "verse").
   - If range.mode === "surah":
     - Validate startSurah in 1..114.
     - endSurah = range.endSurah ?? startSurah.
     - Validate endSurah in 1..114 and startSurah <= endSurah.
     - [startPage, endPage] = await getSurahPageRange(startSurah, endSurah).
     - If null, return error "Unknown surah".
     - unit = "page", rangeStart = startPage, rangeEnd = endPage.
   - If range.mode === "juz":
     - Validate startJuz in 1..30.
     - endJuz = range.endJuz ?? startJuz.
     - Validate endJuz in 1..30 and startJuz <= endJuz.
     - [startRange, endRange] = await Promise.all([getJuzPageRange(startJuz), getJuzPageRange(endJuz)]).
     - If either null, return error "Unknown juz".
     - unit = "page", rangeStart = startRange.startPage, rangeEnd = endRange.endPage.
   - If range.mode === "page":
     - Validate startPage in 1..604.
     - endPage = range.endPage ?? startPage.
     - Validate endPage in 1..604 and startPage <= endPage.
     - unit = "page", rangeStart = startPage, rangeEnd = endPage.
   - If range.mode === "verse":
     - startOrdinal = parseVerseOrdinal(range.startVerse).
     - endOrdinal = parseVerseOrdinal(range.endVerse ?? range.startVerse).
     - If startOrdinal === null or endOrdinal === null:
       return error "Invalid verse range: use 1..6236 or 'surah:ayah'".
     - Validate startOrdinal <= endOrdinal.
     - unit = "verse", rangeStart = startOrdinal, rangeEnd = endOrdinal.
6. Resolve cadence:
   - If cadence.type === "pace":
     - period = cadence.period ?? "day".
     - If period === "week" and unit === "verse":
       return error "Weekly pace is not supported for verse-level wirds; specify verses per day or use a deadline".
     - Validate cadence.amount is a positive number (amount >= 1).
     - If period === "week":
       unitsPerDay = cadence.amount / 7 (exact fractional value stored; engine clampQuantity floors to >= 1 at daily derivation).
     - Else:
       If !Number.isInteger(cadence.amount): return error "Daily pace must be an integer".
       unitsPerDay = cadence.amount.
     - resolvedCadence = { type: "pace", unitsPerDay }.
     - resolvedEndDate = undefined.
   - If cadence.type === "deadline":
     - Validate cadence.endDate matches PLAN_DATE_RE.
     - Validate cadence.endDate >= startDate (deadline must not be in the past).
     - repetitions = cadence.repetitions ?? 1.
     - Validate Number.isInteger(repetitions) and repetitions >= 1.
     - If activity === "memorize" and repetitions > 1:
       return error "Memorize plans do not support multiple repetitions".
     - resolvedCadence = { type: "deadline", endDate: cadence.endDate, repetitions }.
     - resolvedEndDate = cadence.endDate.
   - Else:
     return error "Invalid cadence type".
7. Construct Definition & Params:
   - definition: CustomWirdDefinition = {
       activity,
       unit,
       rangeStart,
       rangeEnd,
       cadence: resolvedCadence,
     }
   - params: UserPlanParams = {
       trackUnits: { custom: unit },
       ...(resolvedEndDate ? { endDate: resolvedEndDate } : {}),
     }
8. Return { name, definition, params, startDate }.
```

### 2. `resolveCustomPlanEdit(body: PatchCustomPlanBody, plan: UserPlan, progressCount: number)`

```
Input: body, existing plan, progressCount

1. Validate ownership and plan.template_key === "custom".
2. Parse existing definition:
   currentDefinition = plan.definition as CustomWirdDefinition.
3. If body.status provided: validate against USER_PLAN_STATUSES.
4. If body.name provided:
   Validate non-empty string 1..100 chars, trimmed.
   updatedName = trimmedName.
5. If body.range provided:
   - If progressCount > 0:
     return error "Cannot change target range after progress has been logged; create a new custom wird instead".
   - Re-resolve range via Step 5 of enrollment algorithm.
   - If resolved unit !== currentDefinition.unit:
     return error "Track unit cannot change after enrollment".
   - updatedRangeStart = newRangeStart, updatedRangeEnd = newRangeEnd.
6. If body.cadence provided:
   - Re-resolve cadence using the plan's unit and activity via Step 6 of enrollment algorithm.
   - updatedCadence = resolvedCadence.
   - updatedEndDate = resolvedEndDate.
7. Construct new definition & params:
   - nextDefinition = {
       ...currentDefinition,
       rangeStart: updatedRangeStart ?? currentDefinition.rangeStart,
       rangeEnd: updatedRangeEnd ?? currentDefinition.rangeEnd,
       cadence: updatedCadence ?? currentDefinition.cadence,
     }
   - nextParams = {
       ...(plan.params as UserPlanParams),
       trackUnits: { custom: nextDefinition.unit },
     }
   - If nextDefinition.cadence.type === "deadline":
       nextParams.endDate = nextDefinition.cadence.endDate;
     Else:
       delete nextParams.endDate;
8. Return { name: updatedName, definition: nextDefinition, params: nextParams, status: body.status }.
```

---

## Verified Test Cases

### 1. Range Mode Resolution: Surah
- **Input:** `mode: "surah", startSurah: 18, endSurah: 18` (Al-Kahf)
- **Resolution:** `getSurahPageRange(18, 18)` returns `{ startPage: 293, endPage: 304 }`.
- **Output:** `unit: "page"`, `rangeStart: 293`, `rangeEnd: 304`.

### 2. Range Mode Resolution: Multi-Surah Span
- **Input:** `mode: "surah", startSurah: 112, endSurah: 114` (Al-Ikhlas to An-Nas)
- **Resolution:** `getSurahPageRange(112, 114)` returns `{ startPage: 604, endPage: 604 }`.
- **Output:** `unit: "page"`, `rangeStart: 604`, `rangeEnd: 604`.

### 3. Range Mode Resolution: Juz
- **Input:** `mode: "juz", startJuz: 30`
- **Resolution:** `getJuzPageRange(30)` returns `{ startPage: 582, endPage: 604 }`.
- **Output:** `unit: "page"`, `rangeStart: 582`, `rangeEnd: 604`.

### 4. Range Mode Resolution: Page
- **Input:** `mode: "page", startPage: 1, endPage: 20`
- **Resolution:** Static bounds verification.
- **Output:** `unit: "page"`, `rangeStart: 1`, `rangeEnd: 20`.

### 5. Range Mode Resolution: Verse Key ("surah:ayah")
- **Input:** `mode: "verse", startVerse: "2:255", endVerse: "2:257"`
- **Resolution:** `verseOrdinalOfKey("2:255") = 262`, `verseOrdinalOfKey("2:257") = 264`.
- **Output:** `unit: "verse"`, `rangeStart: 262`, `rangeEnd: 264`.

### 6. Range Mode Resolution: Verse Ordinal
- **Input:** `mode: "verse", startVerse: 1, endVerse: 7` (Al-Fatihah)
- **Resolution:** Static bounds verification (1 <= 1 <= 7 <= 6236).
- **Output:** `unit: "verse"`, `rangeStart: 1`, `rangeEnd: 7`.

### 7. Cadence: Fixed Pace Per Day
- **Input:** `type: "pace", amount: 4`
- **Output:** `cadence: { type: "pace", unitsPerDay: 4 }`, `params: { trackUnits: { custom: "page" } }` (`endDate` omitted).

### 8. Cadence: Pace Per Week (Page Unit)
- **Input:** `type: "pace", period: "week", amount: 14` over `mode: "page"`
- **Output:** `unitsPerDay = 14 / 7 = 2` (stored as exact fractional `amount / 7`; engine `clampQuantity` floors to >= 1 at daily derivation).
  `cadence: { type: "pace", unitsPerDay: 2 }`.

### 9. Cadence: Deadline with Multi-Repeat K
- **Input:** `type: "deadline", endDate: "2026-10-15", repetitions: 3`, `activity: "review"`
- **Output:** `cadence: { type: "deadline", endDate: "2026-10-15", repetitions: 3 }`, `params: { trackUnits: { custom: "page" }, endDate: "2026-10-15" }`.

### 10. Rejection: Memorize with Repetitions > 1 (C2 Contract #3)
- **Input:** `activity: "memorize"`, `cadence: { type: "deadline", endDate: "2026-10-01", repetitions: 2 }`
- **Output:** 422 error: `"Memorize plans do not support multiple repetitions"`.

### 11. Rejection: Verse Range with Weekly Pace
- **Input:** `mode: "verse"`, `cadence: { type: "pace", period: "week", amount: 10 }`
- **Output:** 422 error: `"Weekly pace is not supported for verse-level wirds; specify verses per day or use a deadline"`.

### 12. Rejection: Inverted Range
- **Input:** `mode: "surah", startSurah: 20, endSurah: 10`
- **Output:** 422 error: `"Invalid surah range: startSurah must be <= endSurah"`.

### 13. Rejection: Out-of-Bounds Surah/Juz/Page/Verse
- **Input:** `startSurah: 115` OR `startJuz: 31` OR `startPage: 605` OR `startVerse: 6237`
- **Output:** 422 error indicating out-of-bounds parameter.

### 14. Rejection: Past Deadline
- **Input:** `startDate: "2026-09-09"`, `cadence: { type: "deadline", endDate: "2026-09-01" }`
- **Output:** 422 error: `"endDate must be on or after start date"`.

### 15. Rejection: Invalid Activity Name
- **Input:** `activity: "chant"`
- **Output:** 422 error: `"Invalid activity"`.

### 16. Rejection: Invalid Name Length
- **Input:** `name: ""` or string > 100 characters
- **Output:** 422 error: `"name must be between 1 and 100 characters"`.

### 17. PATCH: Adjusting Cadence on Active Plan
- **Input:** Active plan with pace 2 pages/day updated to `cadence: { type: "deadline", endDate: "2026-12-31" }`.
- **Output:** Updates `definition.cadence` and adds `params.endDate = "2026-12-31"`.

### 18. PATCH: Attempted Unit or Activity Change
- **Input:** Attempting to alter `activity` or submitting a range with a different unit mode.
- **Output:** 422 error: `"Track unit cannot change after enrollment"`.

### 19. PATCH: Range Edit After Progress Logged
- **Setup:** User has logged 1 entry for custom wird.
- **Input:** `PATCH` with `range: { mode: "page", startPage: 50, endPage: 60 }`.
- **Output:** 422 error: `"Cannot change target range after progress has been logged; create a new custom wird instead"`.

### 20. PATCH: Range Edit When No Progress Logged
- **Setup:** Plan created, 0 entries in `plan_progress_entries`.
- **Input:** User corrects range typo before reading: `range: { mode: "surah", startSurah: 19, endSurah: 19 }`.
- **Output:** 200 OK; `definition.rangeStart` and `rangeEnd` updated cleanly.

---

## Files to Change

1. `app/lib/plans/resolve-units.ts`
   - Export `getSurahPageRange(startSurah: number, endSurah?: number): Promise<PageRange | null>` aggregating `quranPrisma.verse` over `chapter_id`.
2. `app/lib/plans/verse-index.ts`
   - Add `verseKeyToOrdinal` map populated during `buildIndex()`.
   - Export `verseOrdinalOfKey(verseKey: string): number | null` and `parseVerseOrdinal(input: unknown): number | null`.
3. `app/lib/plans/validate-custom-definition.ts` (NEW)
   - Define TypeScript types for input shapes (`CustomWirdRangeInput`, `CustomWirdCadenceInput`, `CreateCustomPlanBody`, `PatchCustomPlanBody`).
   - Implement `resolveCustomPlanEnrollment` and `resolveCustomPlanEdit` enforcing bounds, week-to-day conversion, C2 contracts, and single-source params population.
4. `app/lib/plans/validate-custom-definition.test.ts` (NEW)
   - Comprehensive Vitest unit tests for all 4 range modes, cadence modes, week→day conversion, K-times, rejection cases, and PATCH rules.
5. `app/api/plans/route.ts`
   - In `POST`: branch on `body.template_key === "custom"`, invoke `resolveCustomPlanEnrollment`, and persist `name`, `definition`, and `params` to `appPrisma.userPlan`.
6. `app/api/plans/[planId]/route.ts`
   - In `PATCH`: when `plan.template_key === "custom"`, query progress count, invoke `resolveCustomPlanEdit`, and update `name`, `definition`, `params`, and `status`.
7. `docs/architecture/decisions/plans.md`
   - Document custom wird enrollment API contracts and resolution rules.

---

## Constraints

- **Two-DB Invariant (ADR 0008):** `furqan_app` and `furqan_quran` are never joined. Surah range resolution is a scalar aggregate on seeded Quran data; `UserPlan` stores only scalar page/verse bounds.
- **Engine Purity & Trust (ADR 0030):** The engine trusts its inputs. All bound verification, integer checks, and dates must be strictly enforced at API ingress.
- **Per-Track Units Fixed for Life (ADR 0038):** A custom wird's unit ("page" or "verse") is locked at creation time and cannot be migrated or altered in PATCH.
- **Progress Log Append-Only (ADR 0030):** Edits never mutate, recompute, or delete `plan_progress_entries` rows.
- **No Engine Changes:** Derivations, `planTemplateFromDefinition`, and completion rules merged in #608 remain 100% untouched.

---

## What NOT to Do

- **Do NOT build any UI components** (`PlansBrowseDialog`, `PlanEnrollForm`, custom wird dialogs) — reserved strictly for #610 (C3).
- **Do NOT modify `engine.ts` or `app/constants/plans.ts`** — the engine and stored `definition` type are completed and tested in #608 (C1).
- **Do NOT persist surah or juz numbers in `UserPlan.definition` or `params`** — D3/ADR 0030 mandates page-canonical or verse-ordinal values only.
- **Do NOT allow multi-track custom wirds** — custom wird is strictly single-track.
- **Do NOT populate `params.quantities.custom`** — pace belongs canonically in `definition.cadence.unitsPerDay` to prevent duplicate state drift.
- **Do NOT allow range edits after progress has been logged** — changing bounds mid-plan corrupts `engine.ts`'s `lastEnd + 1` cursor derivation.
- **Do NOT support weekly pace on verse-unit wirds** — fractional verses do not exist; rounding distorts user intent.
- **Do NOT allow `activity === "memorize"` with repetitions K > 1** — rejected per C2 contract #3.
- **Do NOT create a database migration** — `UserPlan.name` and `UserPlan.definition` columns already shipped in PR #614 (#608).

---

## Decisions Made

1. **Dedicated Sibling Module:** Validation and resolution placed in `app/lib/plans/validate-custom-definition.ts` rather than extending `validate-params.ts`, separating custom definition synthesis from preset parameter hardening.
2. **Verse Weekly Pace Restriction & Fractional Page Pace:** Weekly pace (`period: "week"`) is restricted to page-based wirds. Verse wirds require daily pace (`period: "day"`) or a deadline, preventing fractional verse corruption and rounding distortions. For page-based wirds, weekly pace stores the exact fractional `amount / 7`, and daily derivation in the engine floors via `clampQuantity` to at least 1 unit/day.
3. **Pace Single Source of Truth:** `params.quantities` is omitted for custom enrollments; pace is stored only in `definition.cadence.unitsPerDay`, which `planTemplateFromDefinition` maps to `rule.defaultUnitsPerDay`.
4. **Range Immutability Post-Progress:** In `PATCH`, range bounds can only be modified if zero progress entries exist. Once progress is logged, range bounds are immutable to preserve engine cursor continuity.
5. **Direct Verse Aggregation for Surahs:** `getSurahPageRange` aggregates `quranPrisma.verse` by `chapter_id`, matching `getHizbPageRange` and avoiding deprecated `PageMetadata` tables.
6. **No ADR Needed:** ADR 0067 already established the architecture; #609 is standard API validation and resolution implementing ADR 0067's contract.
