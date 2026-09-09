---
title: "Daily wird presets: add memorize & review flavours, reframe as \"Daily wird — <activity>\" + optional start point"
type: feature
date: 2026-09-09
status: implemented
area: awrad
issue: 607
---

# Daily wird presets: add memorize & review flavours, reframe as "Daily wird — <activity>" + optional start point

## Summary

Today the "daily wird" preset exists in two separate activity templates (`daily-wird` for reading, `listening-wird` for listening) with hardcoded start points at page 1. This task reframes the preset into a single unified product concept — **"Daily wird — <activity>"** — available across all four core activities (`read`, `listen`, `memorize`, `review`). A daily wird is a repeating full-mushaf khatma cycling pages 1–604 with no deadlines or custom ranges. In addition, the enroll form exposes an optional start point (`params.startPage`, already present in the engine and validated), allowing users to begin their khatma from a specific page or surah, solving the first half of #250. The plans catalog dialog (`PlansBrowseDialog`) is restructured around a 3-choice wird-type picker ("Daily wird", "Custom wird" [future placeholder], "الحصون الخمسة"), with the Daily wird view featuring an activity sub-picker (`read | listen | memorize | review`).

## Root Cause / Approach

### 1. The Architectural Choice: New Template Entries vs. Parameterised Template

The issue asks to evaluate whether to add new `PLAN_TEMPLATES` entries or use one template parameterised by activity.

**Recommendation: Dedicated `PLAN_TEMPLATES` entries (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`) behind a unified UI concept.**

RATIONALE:
1. **Zero Data Migration & Zero Breaking Changes:**
   - The production database in `furqan_app` contains existing `user_plans` rows with `template_key = 'daily-wird'` and `template_key = 'listening-wird'`, and `plan_progress_entries` rows with `track_key = 'reading'` and `track_key = 'listening'`.
   - Parameterising into a single `daily-wird` template would require either migrating existing `listening-wird` rows via an SQL migration (`UPDATE user_plans SET template_key = 'daily-wird', params = JSON_SET(...)`), or maintaining permanent backward-compatibility branches in `getPlanTemplate`, `PlanEnrollForm`, and `resolvePlanParams`.
   - Furthermore, `plan_progress_entries` rows are keyed by `(user_plan_id, track_key, date)`. Keeping dedicated track keys (`reading`, `listening`, `memorizing`, `reviewing`) ensures existing check-off history remains 100% valid and untouched.
2. **Concurrent Multi-Wird Portfolios (ADR 0030):**
   - Users frequently maintain simultaneous daily habits in different modalities (e.g. a daily reading wird alongside a daily review or listening wird).
   - The UI currently maps each template to at most one active enrollment (`activePlanFor(templateKey)`).
   - If all flavours were merged under `template_key = "daily-wird"`, a user could not easily hold an active reading wird and an active listening wird concurrently without overhauling how plans are indexed, identified, and edited across the entire UI.
3. **Purity of Template Definitions:**
   - In Furqan, `PlanTrack` carries an immutable `activity: PlanActivity`.
   - Having 4 clean template constants (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`) preserves the engine invariant that templates are static code constants (ADR 0030) rather than dynamically synthesised objects.
4. **Unified Presentation:**
   - The product reframing happens in the UI layer: the user sees a single card titled "Daily wird", and chooses the activity inside. The fact that the backend resolves this to one of four typed template keys is an internal implementation detail that provides complete isolation and zero migration risk.

### 2. Backward Compatibility & `template_key` Strategy

**Recommendation: Keep existing `template_key`s verbatim; do not rename or migrate existing rows.**

- `daily-wird`: activity `read`, track key `reading`.
- `listening-wird`: activity `listen`, track key `listening`.
- `memorizing-wird`: activity `memorize`, track key `memorizing`.
- `reviewing-wird`: activity `review`, track key `reviewing`.

No database schema change, no Prisma migration, and no data backfill needed.

### 3. Exposing `params.startPage` and Resolving the Verse-Unit Engine Gap

The foundation plan (`awrad-learning-plans.md`) and engine already defined `startPage?: number` in `UserPlanParams`.

#### The End-to-End Trace & Discovered Gap:
- In `app/lib/plans/engine.ts`:
  ```typescript
  if (rule.kind === "fixed_cycle") {
    const { start: boundStart, end: boundEnd } = fixedCycleBounds(rule, unit);
    let start =
      state.lastEnd !== null
        ? state.lastEnd + 1
        : Math.min(Math.max(params.startPage ?? boundStart, boundStart), boundEnd);
    if (start > boundEnd) start = boundStart; // wrap: next khatma
  ```
- In `app/lib/plans/validate-params.ts`:
  ```typescript
  const primaryUnit = independentTrackUnit(params, independentKeys[0] ?? "");
  if (params.startPage !== undefined && !isInRange(params.startPage, primaryUnit)) {
    return { error: "Invalid params.startPage" };
  }
  ```
- **Discovered Gap:**
  When `unit === "verse"` (e.g. user selected verses/day or fractional page mode):
  `fixedCycleBounds` produces `boundStart = 1, boundEnd = 6236` (verse ordinals).
  If the user chooses "Page 10" in the UI and the client sends `params.startPage = 10`, `engine.ts` assigns `start = 10`, which is **verse ordinal 10** (Surah Al-Baqarah, ayah 3) — NOT page 10!
  Page 10's verses start at ordinal 65.
  Furthermore, `validate-params.ts` checks `isInRange(params.startPage, primaryUnit)` which accepts 1–6236 for verse units.
- **Resolution:**
  - `startPage` is strictly a mushaf **page number** (1..604). Users choose a start page or start surah; nobody picks a global verse ordinal like 3,421.
  - In `validate-params.ts`: Validate `params.startPage` against `[MUSHAF_FIRST_PAGE, MUSHAF_LAST_PAGE]` (1..604) regardless of whether the track's unit is page or verse.
  - In `engine.ts`: When deriving a `fixed_cycle` track with `unit === "verse"`, if `params.startPage` is provided and `state.lastEnd === null`, translate it to the starting verse ordinal using `pageFirstVerseOrdinal(params.startPage)`.
  - In `engine.ts` wrap behavior: Khatma completion wrap (`start > boundEnd`) correctly wraps to `boundStart` (page 1 or verse ordinal 1), preserving khatma continuity.
  - On existing enrollments with progress (`state.lastEnd !== null`): `params.startPage` is ignored because `state.lastEnd + 1` takes precedence. In `PlanEnrollForm`, when editing an existing active plan that has at least one progress entry, the start point control is disabled with an informative note.

### 4. Wird-Type Picker on `/plans` (`PlansBrowseDialog.tsx`)

The top-level view of `PlansBrowseDialog` ("list") is updated from listing all template keys directly to listing the three top-level wird types:
1. **الورد اليومي (Daily wird):**
   - Icon: `BookOpen`
   - Title: `plans.browse.dailyWird.title` ("الورد اليومي" / "Daily wird")
   - Description: `plans.browse.dailyWird.description` ("ختمة كاملة متكررة للمصحف بنشاط ومعدل تختارهما" / "A repeating full-mushaf khatma with your choice of activity and pace.")
   - Action: Navigates to `view = "daily-wird"`.
2. **ورد مخصص (Custom wird):**
   - Icon: `Sparkles`
   - Title: `plans.browse.customWird.title` ("ورد مخصص" / "Custom wird")
   - Description: `plans.browse.customWird.description` ("حدد سورة أو جزءاً أو موعداً للختم (قريباً)" / "Choose a custom range, surah, or target completion date (coming soon).")
   - Badge: `plans.browse.comingSoon` ("قريباً" / "Soon")
   - State: Disabled (non-interactive placeholder preparing for issues #608–#610).
3. **الحصون الخمسة (Al-Husun Al-Khamsa):**
   - Icon: `Castle`
   - Title: `plans.templates.husun.label` ("الحصون الخمسة")
   - Description: `plans.templates.husun.description` ("برنامج حفظ متكامل من خمسة مسارات.")
   - Action: Navigates to `view = "husun-overview"`.

### 5. Daily Wird View with Activity Sub-Picker & Optional Start Point

When `view === "daily-wird"`:
- **Activity Sub-Picker:**
  A segmented control with 4 options:
  - `read` (قراءة) -> `templateKey = "daily-wird"`
  - `listen` (استماع) -> `templateKey = "listening-wird"`
  - `memorize` (حفظ) -> `templateKey = "memorizing-wird"`
  - `review` (مراجعة) -> `templateKey = "reviewing-wird"`
- **Active Plan Detection:**
  Selecting an activity checks `activePlanFor(templateKey)`.
  - If the user already has an active plan for that activity, the form opens in edit mode prefilled with that plan's values, and the CTA is "Save changes".
  - If no active plan exists for that activity, the form opens in create mode with defaults, and the CTA is "Start plan".
- **Pace & Unit Stepper:**
  Reuses `QuantityStepper` and `QuantityMode` toggle (`[ Pages | Verses | Fraction ]`).
- **Start Point Selector:**
  An optional, clean selector allowing the user to start from a chosen page or surah:
  - Toggle / Checkbox: "ابدأ من موضع محدد" ("Start from a specific point") — unchecked by default (defaults to page 1).
  - When checked, shows two tab/pill options:
    - **By Page:** Number input or combobox (1–604, default 1).
    - **By Surah:** Searchable combobox listing the 114 surahs. Selecting a surah resolves to its first page (`surah.startPage`).
  - Sets `params.startPage` on submit (omitted or undefined if unchecked / page 1).

## Decision Tree / Algorithm

### 1. Activity to Template Key Mapping

```
Selected Activity | Template Key       | Track Key    | Default Pace | Default Unit
------------------|--------------------|--------------|--------------|-------------
read              | "daily-wird"       | "reading"    | 5 pages/day  | page
listen            | "listening-wird"   | "listening"  | 5 pages/day  | page
memorize          | "memorizing-wird"  | "memorizing" | 1 page/day   | page
review            | "reviewing-wird"   | "reviewing"  | 1 page/day   | page
```

### 2. Derivation Algorithm with `startPage` (`engine.ts`)

```
For a fixed_cycle track:
  If state.todayEntry exists:
    Return todayEntry verbatim (existing invariant)

  boundStart = unit === "page" ? rule.rangeStart : pageFirstVerseOrdinal(rule.rangeStart)
  boundEnd   = unit === "page" ? rule.rangeEnd   : pageLastVerseOrdinal(rule.rangeEnd)

  If state.lastEnd !== null:
    // Continuing an in-progress plan
    start = state.lastEnd + 1
  Else if params.startPage is defined:
    // Fresh enrollment with optional start page
    clampedPage = clamp(params.startPage, 1, 604)
    start = unit === "page"
      ? clampedPage
      : pageFirstVerseOrdinal(clampedPage)
  Else:
    start = boundStart

  If start > boundEnd:
    // Wrap to beginning on khatma completion
    start = boundStart

  units = unitsPerDay(...)
  rangeEnd = min(start + units - 1, boundEnd)

  Return assignRange(track, start, rangeEnd, state, unit)
```

### 3. Params Validation Algorithm (`validate-params.ts`)

```
If params.startPage is defined:
  If params.startPage is not an integer OR params.startPage < 1 OR params.startPage > 604:
    Return error: "Invalid params.startPage"

// Fractional quantity support:
Update FRACTIONAL_QUANTITY_TRACKS = new Set([
  "reading",
  "listening",
  "memorizing",
  "reviewing",
  "tilawa",
  "hifz",
  "baeed"
])
```

### 4. Dialog View Navigation State Machine

```
State: view: "list" | "daily-wird" | "husun-overview" | "husun-settings"
SelectedActivity: "read" | "listen" | "memorize" | "review"

[Open from "New wird" button] -> view = "list"
  - Click "Daily wird" -> view = "daily-wird", selectedActivity = "read" (or first non-active activity)
  - Click "Custom wird" -> (Disabled, no-op)
  - Click "Husun" -> view = "husun-overview"

[Open from Plan Card "Edit" button] ->
  - If template_key in ("daily-wird", "listening-wird", "memorizing-wird", "reviewing-wird"):
      view = "daily-wird", selectedActivity = matched activity
  - If template_key === "husun":
      view = "husun-settings"

In view === "daily-wird":
  - Back button -> view = "list"
  - Switching activity tab -> updates selectedActivity and reloads activePlanFor(templateKey)
  - Form submit -> calls enroll (or updateParams) then closes dialog
```

## Verified Test Cases

### Case 1: Fresh Reading Wird with Default Start (Page 1)
- **Input:** template: `daily-wird`, pace: 5 pages/day, unit: `page`, startPage: `undefined`, log: `[]`.
- **Derivation:** `start = 1`, `end = 5`.
- **Output:** `{ rangeStart: 1, rangeEnd: 5, completed: false }`.

### Case 2: Fresh Reading Wird with Start Page 100
- **Input:** template: `daily-wird`, pace: 5 pages/day, unit: `page`, startPage: `100`, log: `[]`.
- **Derivation:** `start = 100`, `end = 104`.
- **Output:** `{ rangeStart: 100, rangeEnd: 104, completed: false }`.

### Case 3: Fresh Reading Wird in Verse Unit with Start Page 100
- **Input:** template: `daily-wird`, pace: 10 verses/day, unit: `verse`, startPage: `100`, log: `[]`.
- **Derivation:**
  - `pageFirstVerseOrdinal(100)` resolves to verse ordinal `1409` (Surah Al-An'am 6:111).
  - `start = 1409`, `end = 1418`.
- **Output:** `{ rangeStart: 1409, rangeEnd: 1418, unit: "verse", completed: false }`.

### Case 4: Fresh Listening Wird Starting from Surah Maryam (Page 305)
- **Input:** template: `listening-wird`, pace: 5 pages/day, unit: `page`, startPage: `305`, log: `[]`.
- **Derivation:** `start = 305`, `end = 309`.
- **Output:** `{ rangeStart: 305, rangeEnd: 309, activity: "listen", completed: false }`.
- **Playback row:** `PlanAssignmentRow` displays playback audio controls for pages 305–309.

### Case 5: Fresh Memorization Wird (`memorizing-wird`)
- **Input:** template: `memorizing-wird`, pace: 1 page/day, unit: `page`, startPage: `1`, log: `[]`.
- **Derivation:** `start = 1`, `end = 1`.
- **Output:** `{ rangeStart: 1, rangeEnd: 1, activity: "memorize", completed: false }`.
- **Reader widget:** `inRange` checks `visiblePages` against page 1.

### Case 6: Khatma Wrap-Around on Plan with Initial `startPage`
- **Input:** template: `daily-wird`, startPage: `100`, last entry in log: `range_start: "601", range_end: "604"`.
- **Derivation:** `state.lastEnd = 604`. `start = 605 > 604` -> wraps to `boundStart = 1`.
- **Output:** `{ rangeStart: 1, rangeEnd: 5, completed: false }`.
- **Verification:** Initial `startPage` does not break subsequent wrap-around khatmat.

### Case 7: Plan with Progress Edits Quantity
- **Input:** Active `daily-wird` plan, log has `[ { range_start: "100", range_end: "104" } ]`. User PATCHes quantity from 5 to 10.
- **Derivation:** `state.lastEnd = 104`. `start = 105`, `units = 10`, `end = 114`.
- **Output:** `{ rangeStart: 105, rangeEnd: 114 }`. `startPage` is not re-applied once history exists.

### Case 8: Multi-Wird Concurrency
- **Input:** User is simultaneously enrolled in `daily-wird` (active) and `listening-wird` (active).
- **Result:** Both appear in `/api/plans/today`, both render rows in `PlansTodayHero` and `PlansWidget`, each can be checked off independently without ID or track key collisions.

## Files to Change

### 1. Engine & Constants
- `app/constants/plans.ts`:
  - Add `memorizing-wird` to `PLAN_TEMPLATES`:
    - `key: "memorizing-wird"`, `missedDayPolicy: "cursor"`, tracks: `[{ key: "memorizing", activity: "memorize", unit: "page", rule: { kind: "fixed_cycle", rangeStart: 1, rangeEnd: 604, defaultUnitsPerDay: 1 } }]`.
  - Add `reviewing-wird` to `PLAN_TEMPLATES`:
    - `key: "reviewing-wird"`, `missedDayPolicy: "cursor"`, tracks: `[{ key: "reviewing", activity: "review", unit: "page", rule: { kind: "fixed_cycle", rangeStart: 1, rangeEnd: 604, defaultUnitsPerDay: 1 } }]`.
- `app/constants/plan-ui.ts`:
  - Add UI metadata for new templates to `PLAN_TEMPLATE_UI`:
    - `memorizing-wird`: label `plans.templates.memorizingWird.label`, description `plans.templates.memorizingWird.description`, icon `Brain`.
    - `reviewing-wird`: label `plans.templates.reviewingWird.label`, description `plans.templates.reviewingWird.description`, icon `RotateCcw`.
  - Add track UI metadata to `PLAN_TRACK_UI`:
    - `memorizing`: label `plans.tracks.memorizing`, icon `Brain`.
    - `reviewing`: label `plans.tracks.reviewing`, icon `RotateCcw`.
- `app/lib/plans/engine.ts`:
  - In `deriveSourceFreeTrack` (`fixed_cycle` branch):
    - When `state.lastEnd === null` and `params.startPage` is provided:
      - If `unit === "verse"`, resolve `start` via `pageFirstVerseOrdinal(params.startPage)`.
      - If `unit === "page"`, resolve `start` directly as `params.startPage`.
- `app/lib/plans/validate-params.ts`:
  - Validate `params.startPage` against `[MUSHAF_FIRST_PAGE, MUSHAF_LAST_PAGE]` (1..604).
  - Add `"memorizing"` and `"reviewing"` to `FRACTIONAL_QUANTITY_TRACKS`.

### 2. UI Components
- `app/components/plans/PlanEnrollForm.tsx`:
  - Add `UNIT_GROUPS` entries for `"memorizing-wird"` and `"reviewing-wird"`.
  - Add `"memorizing"` and `"reviewing"` to `FRACTION_ELIGIBLE_TRACKS`.
  - Add optional start point state and input:
    - Expose "Start from page / surah" toggle + selectors (Page number input / SurahCombobox).
    - If `existingPlan` already has progress entries, disable the start point input with an explanatory note.
    - Include `startPage` in `params` passed to `enroll` / `updateParams`.
- `app/components/plans/PlansBrowseDialog.tsx`:
  - Update `PlansBrowseView` type: `"list" | "daily-wird" | "husun-overview" | "husun-settings"`.
  - Reframe root `renderList()` into the 3-item wird-type picker:
    1. Daily wird (الورد اليومي)
    2. Custom wird (ورد مخصص) [disabled + "Soon" badge]
    3. Al-Husun Al-Khamsa (الحصون الخمسة)
  - Reframe `renderDailyWird()`:
    - Add Activity Sub-Picker tabs (`read | listen | memorize | review`).
    - Resolve template key from active tab.
    - Render `PlanEnrollForm` with resolved `templateKey` and corresponding `activePlanFor(templateKey)`.
- `app/components/plans/MyPlansList.tsx`:
  - Update `EDIT_VIEW_FOR_TEMPLATE` to map `"daily-wird"`, `"listening-wird"`, `"memorizing-wird"`, `"reviewing-wird"` to `"daily-wird"`.
  - Update `PlanParametersSummary` to cleanly summarize pace for `memorizing-wird` and `reviewing-wird` (or generic single-track pace extraction).
  - Pass initial activity to `PlansBrowseDialog` when editing from a `PlanCard`.
- `app/components/plans/StartPointPicker.tsx` (new helper):
  - Extracted helper for "Start from page / surah" affordance used in `PlanEnrollForm`, cleanly reusing `SurahCombobox` and accessible numeric inputs.

### 3. Translations
- `messages/ar.json` & `messages/en.json`:
  - Add template labels and descriptions:
    - `plans.templates.dailyWird.label`: "الورد اليومي — قراءة" / "Daily Wird — Reading"
    - `plans.templates.listeningWird.label`: "الورد اليومي — استماع" / "Daily Wird — Listening"
    - `plans.templates.memorizingWird.label`: "الورد اليومي — حفظ" / "Daily Wird — Memorization"
    - `plans.templates.memorizingWird.description`: "احفظ عددًا من الصفحات يوميًا، وتدور على كامل المصحف." / "Memorize N pages a day, cycling the whole mushaf."
    - `plans.templates.reviewingWird.label`: "الورد اليومي — مراجعة" / "Daily Wird — Review"
    - `plans.templates.reviewingWird.description`: "راجع عددًا من الصفحات يوميًا، وتدور على كامل المصحف." / "Review N pages a day, cycling the whole mushaf."
  - Add tracks:
    - `plans.tracks.memorizing`: "الحفظ" / "Memorizing"
    - `plans.tracks.reviewing`: "المراجعة" / "Reviewing"
  - Add wird-type picker keys:
    - `plans.browse.dailyWirdType.title`: "الورد اليومي" / "Daily Wird"
    - `plans.browse.dailyWirdType.description`: "ختمة كاملة متكررة للمصحف بنشاط ومعدل تختارهما" / "A repeating full-mushaf khatma with your choice of activity and pace."
    - `plans.browse.customWirdType.title`: "ورد مخصص" / "Custom Wird"
    - `plans.browse.customWirdType.description`: "حدد سورة أو جزءاً أو موعداً للختم (قريباً)" / "Choose a custom range, surah, or target completion date (coming soon)."
    - `plans.browse.comingSoon`: "قريباً" / "Soon"
  - Add start point keys:
    - `plans.startPoint.label`: "نقطة البداية (اختياري)" / "Start point (optional)"
    - `plans.startPoint.fromBeginning`: "من بداية المصحف" / "From the beginning"
    - `plans.startPoint.custom`: "تحديد موضع البدء" / "Choose start point"
    - `plans.startPoint.byPage`: "بالصفحة" / "By page"
    - `plans.startPoint.bySurah`: "بالسورة" / "By surah"
    - `plans.startPoint.pageNumber`: "رقم الصفحة" / "Page number"
    - `plans.startPoint.chooseSurah`: "اختر السورة" / "Choose surah"
    - `plans.startPoint.lockedNotice`: "بدأ الورد بالفعل — تُستأنف القراءة تلقائياً من حيث توقفت" / "Wird is already active — resumes from where you left off"

### 4. Tests
- `app/lib/plans/engine.test.ts`:
  - Unit tests for `memorizing-wird` and `reviewing-wird` template shapes and derivations.
  - Unit test verifying `params.startPage` on a verse-unit `fixed_cycle` track starts at `pageFirstVerseOrdinal(startPage)`.
  - Unit test verifying wrap-around khatma wraps to 1 even when `startPage` was specified.
- `app/components/plans/plans-ui.test.ts`:
  - Verify parameter summaries for memorizing and reviewing templates.

## Constraints

- **ADR 0030 / ADR 0038:** Plan templates remain immutable TypeScript constants; assignments are derived at read time and never materialized. Unit choice remains per-track via `params.trackUnits`.
- **Database & Schema Invariants:** No foreign keys across databases (ADR 0008). No new database migrations or schema alterations required for this task.
- **No Regressions on Existing Enrollments:** Existing database rows referencing `daily-wird` and `listening-wird` must continue resolving without failure.
- **Design & Styling (docs/design/design-principles.md):**
  - Minimum touch target 44x44px for all controls, tabs, and buttons.
  - Full RTL/LTR parity (Arabic default RTL; icons use `rtl:rotate-180`).
  - Strict adherence to semantic color tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`).
  - No reader-side regressions; reader widget (`PlansWidget`) and inline listening playback continue working seamlessly.

## What NOT to Do

- **DO NOT create a database migration:** All changes are backward-compatible with existing schema and rows.
- **DO NOT delete or rename `daily-wird` or `listening-wird` template keys:** Existing user plans depend on these exact string keys.
- **DO NOT implement custom range / deadline / custom name logic:** Those belong to sibling tasks #608–#610 (Custom Wird).
- **DO NOT implement retroactive progress-log backfilling:** Historical backfill of already-logged entries is out of scope for #607.
- **DO NOT modify `husun` template or rules:** Husun is completely untouched.
- **DO NOT permit editing `startPage` on plans with existing progress entries:** `engine.ts` resumes from `state.lastEnd + 1`; allowing changes to `startPage` on active plans with progress would give users false expectations.

## Decisions Made

1. **Dedicated Template Entries over Single Parameterised Template:**
   Chose dedicated typed template constants (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`) to ensure zero database migrations, maintain multi-plan concurrency per user, and keep track-key-to-UI associations pure, while presenting a unified "Daily wird — <activity>" interface in the UI.
2. **`params.startPage` is Always a Mushaf Page Number (1..604):**
   Fixed the engine gap where verse-unit tracks treated `startPage` as a raw verse ordinal. The engine now resolves page number to `pageFirstVerseOrdinal(startPage)` for verse-unit tracks, maintaining consistent page-level semantics across all modes.
3. **Wird-Type Picker Hierarchy:**
   Restructured `PlansBrowseDialog` into a clean 3-choice selector ("Daily wird", "Custom wird" [disabled placeholder], "الحصون الخمسة") rather than a flat dump of all template keys.
4. **Locking `startPage` in Edit Mode with Progress:**
   Because `engine.ts` derives assignments from `lastEnd + 1` once any progress entry is logged, `startPage` is editable only on brand-new enrollments or plans with zero logged history.
5. **Reviewing-Wird Default Pace (1 page/day):**
   The `reviewing-wird` default pace is 1 page/day (mirroring husun `baeed`), per the decision to take new flavour defaults directly from Al-Husun Al-Khamsa (`PLAN_TEMPLATES.husun`), rather than defaulting to 5.
6. **Self-Contained StartPointPicker Combobox:**
   Because `SurahCombobox` in `RecitationSettingsSheet.tsx` is an internal, unexported component, `StartPointPicker` constructs its own Popover+Command combobox rather than coupling to the recitation feature. A shared combobox extraction is left as an optional future cleanup.
7. **Dialog Navigation via Direct Template Views:**
   `PlansBrowseDialog` uses dedicated views (`daily-wird`, `listening-wird`, `memorizing-wird`, `reviewing-wird`) where tab-selection directly updates `view`, rather than a single `daily-wird` view + separate `SelectedActivity` state. This is functionally equivalent and allows `key={templateKey}` to cleanly remount form state per tab.
