---
title: "Custom wird creation & edit UI in /plans (two-decision form: range + cadence)"
type: feature
date: 2026-09-09
status: implemented
area: awrad
issue: 610
adr: []
---

# Custom wird creation & edit UI in /plans (two-decision form: range + cadence)

## Summary

Builds the user-facing creation and edit UI for custom wirds within `/plans`, enabling users to define a personalized Quran study plan through two core decisions plus a name and activity: **What** (whole mushaf, or a bounded range by surah, juz, page, or verse) and **How** (by pace per day/week, or by calendar deadline with optional repeat count $K$). The form connects directly to the backend contracts shipped in #609 (`POST /api/plans` with `CreateCustomPlanBody` and `PATCH /api/plans/:planId` with `PatchCustomPlanBody`), renders a real-time display-only derived estimate line, enforces strict backend invariants (such as freezing range modifications once progress is logged and disallowing weekly pace for verses), maintains first-class RTL/LTR parity with 44px mobile touch ergonomics, and activates the existing "Custom wird" placeholder in `PlansBrowseDialog`.

---

## UI Structure

### 1. Component Tree Architecture: Dedicated `CustomWirdForm.tsx`

**Recommendation:** Create a new dedicated sibling component `app/components/plans/CustomWirdForm.tsx` rather than branching inside `PlanEnrollForm.tsx`.

**Rationale:**
1. **Divergent Domain Models:** `PlanEnrollForm.tsx` is structurally coupled to static preset templates (`daily-wird` activity flavours and Al-Husun Al-Khamsa). Its entire architecture revolves around multi-track unit groups (`UNIT_GROUPS`), dependent tracks (`trailing_window`, `completed_cycle`, `lookahead`), fractional page steppers (`FRACTION_ELIGIBLE_TRACKS`), and husun juz sliders, submitting `{ params: UserPlanParams, target_juz_start, target_juz_end }`.
2. **Distinct API Contract:** Custom wirds author a user-defined single-track definition using `CreateCustomPlanBody` (`name`, `activity`, `range`, `cadence`) and `PatchCustomPlanBody`. They do not use `params.quantities`, `params.trackUnits`, or `target_juz_start/end`.
3. **Zero State Pollution:** Branching inside `PlanEnrollForm.tsx` would require large conditional blocks across every hook, state initializer, and submit handler, introducing significant cyclomatic complexity and risking regressions in existing preset enrollment flows.
4. **Clean Component Reuse:** `CustomWirdForm.tsx` can cleanly reuse existing lower-level building blocks (`QuantityStepper`, `JuzRangeSlider`, Radix Popover/Command, and Lucide icons) without carrying `PlanEnrollForm`'s preset template baggage.

```
PlansBrowseDialog
├── ViewHeader (Back button + DialogTitle)
└── [view === "custom"] -> CustomWirdForm
    ├── Wird Name Input (text, 1..100 chars)
    ├── Activity Segmented Picker (Read | Listen | Memorize | Review)
    ├── Range Card ("What")
    │   ├── Range Mode Segmented Tabs ([ Whole Quran | Surah | Juz | Page | Verse ])
    │   ├── Mode-Specific Range Controls:
    │   │   ├── "mushaf": Read-only span chip (Pages 1–604)
    │   │   ├── "surah": Start Surah combobox + End Surah combobox
    │   │   ├── "juz": JuzRangeSlider (dual-thumb, 1–30) or dual dropdowns
    │   │   ├── "page": Start Page input + End Page input (1–604)
    │   │   └── "verse": Start (Surah + Ayah) + End (Surah + Ayah)
    │   └── Range-Freeze Banner (shown when hasProgress === true in edit mode)
    ├── Cadence Card ("How")
    │   ├── Cadence Type Segmented Tabs ([ By Pace | By Deadline ])
    │   ├── Sub-Form: Pace
    │   │   ├── Period Toggle ([ Day | Week ]) — (Week disabled for Verse mode)
    │   │   └── QuantityStepper (Amount per day/week)
    │   ├── Sub-Form: Deadline
    │   │   ├── Target Date Picker (<input type="date">) OR Quick Presets ("in N days")
    │   │   └── Repetitions Stepper K (1..100) — (Hidden/locked to 1 for Memorize)
    │   └── Live Derived Estimate Line (display-only preview)
    └── Submit CTA Button ("Start wird" / "Save changes")
```

---

### 2. Form Layout & Wireframe Sketches

#### Section A: Name & Modality (Activity)
- **Name Field:** A clean text input with floating or top label `اسم الورد` / `Wird name`, placeholder `مثال: ورد سورة البقرة` / `e.g. Surah Al-Baqarah memorization`. Max length 100 characters.
- **Activity Picker:** 4 horizontal segmented buttons matching `PLAN_ACTIVITIES`:
  - `read` (BookOpen icon, "قراءة" / "Read")
  - `listen` (Headphones icon, "استماع" / "Listen")
  - `memorize` (Brain icon, "حفظ" / "Memorize")
  - `review` (RotateCcw icon, "مراجعة" / "Review")
  - *Edit Mode Behavior:* Disabled / read-only with a subtle lock indicator (activity cannot be modified after enrollment).

#### Section B: Range Sub-Forms ("What")
The range section begins with a segmented mode selector:
`[ المصحف كامل | بالسورة | بالجزء | بالصفحة | بالآية ]` / `[ Whole Quran | By Surah | By Juz | By Page | By Verse ]`.

1. **Whole Quran (`mushaf`):**
   - Shows an informational banner/chip: `كامل المصحف الشريف (٦٠٤ صفحات)` / `The entire Quran (604 pages)`.
   - No start/end pickers needed. Maps to `{ mode: "page", startPage: 1, endPage: 604 }`.
2. **By Surah (`surah`):**
   - Two searchable popover comboboxes (reusing the `Command` pattern from `StartPointPicker.tsx` with `fetchChapters`):
     - `من سورة` / `From surah`: Dropdown (default: Al-Fatihah, 1).
     - `إلى سورة` / `To surah`: Dropdown (defaults to the selected start surah for single-surah wirds).
   - If `startSurah` is set greater than `endSurah`, `endSurah` auto-advances to match `startSurah`.
   - Submits `{ mode: "surah", startSurah, endSurah }`.
3. **By Juz (`juz`):**
   - Integrates the existing `JuzRangeSlider.tsx` (or dual juz selectors):
     - Slider spanning 1 to 30 with native RTL track support.
     - Live label display: `الجزء ١ – الجزء ٣٠` / `Juz 1 – Juz 30`.
   - Submits `{ mode: "juz", startJuz, endJuz }`.
4. **By Page (`page`):**
   - Two numeric inputs or stepper popovers (1–604):
     - `من صفحة` / `From page` (min 1, max 604).
     - `إلى صفحة` / `To page` (min `startPage`, max 604).
   - Submits `{ mode: "page", startPage, endPage }`.
5. **By Verse (`verse`):**
   - Surah and Ayah dual selectors for both start and end:
     - `البداية`: Surah select (1..114) + Ayah number stepper (1..`chapter.verses_count`).
     - `النهاية`: Surah select (1..114) + Ayah number stepper (1..`chapter.verses_count`).
   - Defaults to single ayah or entire surah's verses.
   - Submits `{ mode: "verse", startVerse: "s1:a1", endVerse: "s2:a2" }`.

#### Section C: Cadence Sub-Forms ("How")
Segmented toggle: `[ بالمعدل | بتاريخ انتهاء ]` / `[ By Pace | By Deadline ]`.

1. **By Pace (`type: "pace"`):**
   - Period segmented pill: `[ يوميًا | أسبوعيًا ]` / `[ Daily | Weekly ]`.
     - *Guard:* If range mode is `verse`, the `Weekly` pill is disabled and unselectable, with helper microcopy: *"Weekly pace is not available for verse wirds; specify daily verses or set a deadline."*
   - Pace Stepper: Centered `QuantityStepper` (default 1 page or 5 verses).
   - Live Preview: Displays `≈ 40 يومًا للإتمام` / `≈ 40 days to complete`.
2. **By Deadline (`type: "deadline"`):**
   - Deadline Date Picker: `<input type="date" min={today} className="fq-focus-ring ...">` with native mobile datepicker ergonomics. Optional preset chips: `+30 days`, `+60 days`, `+90 days` for quick selection.
   - Repetitions Stepper $K$: Stepper for number of khatmas (default 1, min 1, max 100).
     - *Guard (C2 Contract #3):* If `activity === "memorize"`, the repetitions field is hidden or locked to 1 with an informational note: *"Memorization plans track a single pass."*
   - Live Preview: Displays `≈ 3 صفحات/يوم (يُعاد حسابه تلقائيًا عند التعويض)` / `≈ 3 pages/day (re-adjusts on missed days)`.

---

## State Model

### 1. Component State Interface

```typescript
export type CustomWirdFormMode = "mushaf" | "surah" | "juz" | "page" | "verse";
export type CustomCadenceType = "pace" | "deadline";

export type CustomWirdFormState = {
  name: string;
  activity: PlanActivity;
  // Range selection
  rangeMode: CustomWirdFormMode;
  startSurah: number;
  endSurah: number;
  startJuz: number;
  endJuz: number;
  startPage: number;
  endPage: number;
  startVerse: { surah: number; ayah: number };
  endVerse: { surah: number; ayah: number };
  // Cadence selection
  cadenceType: CustomCadenceType;
  pacePeriod: "day" | "week";
  paceAmount: number;
  deadlineEndDate: string; // "YYYY-MM-DD"
  repetitions: number; // K >= 1
};
```

### 2. Request Body Serialization

#### Create Submission (`CreateCustomPlanBody`)
```typescript
const buildCreateBody = (state: CustomWirdFormState): CreateCustomPlanBody => {
  let range: CustomWirdRangeInput;
  switch (state.rangeMode) {
    case "mushaf":
      range = { mode: "page", startPage: 1, endPage: 604 };
      break;
    case "surah":
      range = { mode: "surah", startSurah: state.startSurah, endSurah: state.endSurah };
      break;
    case "juz":
      range = { mode: "juz", startJuz: state.startJuz, endJuz: state.endJuz };
      break;
    case "page":
      range = { mode: "page", startPage: state.startPage, endPage: state.endPage };
      break;
    case "verse":
      range = {
        mode: "verse",
        startVerse: `${state.startVerse.surah}:${state.startVerse.ayah}`,
        endVerse: `${state.endVerse.surah}:${state.endVerse.ayah}`,
      };
      break;
  }

  let cadence: CustomWirdCadenceInput;
  if (state.cadenceType === "pace") {
    cadence = {
      type: "pace",
      period: state.pacePeriod,
      amount: state.paceAmount,
    };
  } else {
    cadence = {
      type: "deadline",
      endDate: state.deadlineEndDate,
      ...(state.repetitions > 1 && state.activity !== "memorize" ? { repetitions: state.repetitions } : {}),
    };
  }

  return {
    template_key: "custom",
    name: state.name.trim(),
    activity: state.activity,
    range,
    cadence,
  };
};
```

#### Edit Submission (`PatchCustomPlanBody`)
```typescript
const buildPatchBody = (
  state: CustomWirdFormState,
  hasProgress: boolean
): PatchCustomPlanBody => {
  const body: PatchCustomPlanBody = {
    name: state.name.trim(),
  };

  // Range is sent ONLY if zero progress has been logged
  if (!hasProgress) {
    body.range = buildRangeInput(state);
  }

  if (state.cadenceType === "pace") {
    body.cadence = {
      type: "pace",
      period: state.pacePeriod,
      amount: state.paceAmount,
    };
  } else {
    body.cadence = {
      type: "deadline",
      endDate: state.deadlineEndDate,
      ...(state.repetitions > 1 && state.activity !== "memorize" ? { repetitions: state.repetitions } : {}),
    };
  }

  return body;
};
```

### 3. Edit Hydration & Invariant Enforcement

When `existingPlan` is passed to `CustomWirdForm`:
1. **Name:** Prefilled from `existingPlan.name ?? ""`.
2. **Activity:** Prefilled from `existingPlan.definition.activity`. Permanently locked/read-only (cannot be mutated via PATCH).
3. **Unit Immutability:** `existingPlan.definition.unit` dictates whether the plan is page-based or verse-based:
   - If `unit === "page"`, the range mode selector permits `mushaf`, `surah`, `juz`, or `page`, but locks out `verse`.
   - If `unit === "verse"`, the range mode selector is locked to `verse`.
4. **Range Freezing:**
   - If `hasProgress === true`: The entire Range section is disabled. A lock banner explains that range bounds cannot be edited because readings have already been logged.
   - If `hasProgress === false`: Range inputs are interactive, allowing correction of initial enrollment typos.
5. **Cadence Hydration:**
   - If `existingPlan.definition.cadence.type === "pace"`: Hydrates `cadenceType = "pace"`, `pacePeriod = "day"`, `paceAmount = cadence.unitsPerDay`.
   - If `existingPlan.definition.cadence.type === "deadline"`: Hydrates `cadenceType = "deadline"`, `deadlineEndDate = cadence.endDate`, `repetitions = cadence.repetitions ?? 1`.

---

## Derived Estimate Line

### 1. Display-Only Architecture

> [!IMPORTANT]
> The derived estimate is strictly **DISPLAY-ONLY**. The client computes this value solely to give the user immediate feedback while tuning the form. The computed daily pace or estimated duration is never sent to the server. The server remains the single source of truth for assignments and calendar-based derivations.

### 2. Client Helper Module (`app/lib/plans/custom-wird-estimate.ts`)

```typescript
export type EstimateResult = {
  type: "days" | "pace";
  numericValue: number;
  unit: "page" | "verse";
  textKey: string;
};

/**
 * Computes total units (pages or verses) spanned by the current range selection.
 * Uses static chapters metadata already fetched in the client.
 */
export const computeRangeTotalUnits = (
  mode: CustomWirdFormMode,
  params: {
    startPage?: number;
    endPage?: number;
    startJuz?: number;
    endJuz?: number;
    startSurah?: number;
    endSurah?: number;
    verseCount?: number;
  },
  chapters: SurahResult[]
): { totalUnits: number; unit: "page" | "verse" } => {
  if (mode === "mushaf") {
    return { totalUnits: 604, unit: "page" };
  }
  if (mode === "page") {
    const s = params.startPage ?? 1;
    const e = params.endPage ?? s;
    return { totalUnits: Math.max(1, e - s + 1), unit: "page" };
  }
  if (mode === "juz") {
    // 30 juz page spans from juz-starts.json
    const s = params.startJuz ?? 1;
    const e = params.endJuz ?? s;
    const startPage = JUZ_START_PAGES[s];
    const endPage = e === 30 ? 604 : JUZ_START_PAGES[e + 1] - 1;
    return { totalUnits: Math.max(1, endPage - startPage + 1), unit: "page" };
  }
  if (mode === "surah") {
    const s = params.startSurah ?? 1;
    const e = params.endSurah ?? s;
    const startPage = Number(chapters[s - 1]?.pages.split("-")[0] ?? 1);
    const endPage = Number(chapters[e - 1]?.pages.split("-")[1] ?? startPage);
    return { totalUnits: Math.max(1, endPage - startPage + 1), unit: "page" };
  }
  // Verse mode
  return { totalUnits: Math.max(1, params.verseCount ?? 1), unit: "verse" };
};

/**
 * Computes the live preview estimate matching engine.ts rules.
 */
export const computeCadenceEstimate = ({
  totalUnits,
  unit,
  cadenceType,
  pacePeriod,
  paceAmount,
  startDate,
  endDate,
  repetitions = 1,
}: {
  totalUnits: number;
  unit: "page" | "verse";
  cadenceType: "pace" | "deadline";
  pacePeriod?: "day" | "week";
  paceAmount?: number;
  startDate: string;
  endDate?: string;
  repetitions?: number;
}): EstimateResult => {
  if (cadenceType === "pace") {
    const amount = paceAmount && paceAmount > 0 ? paceAmount : 1;
    const unitsPerDay = pacePeriod === "week" ? amount / 7 : amount;
    const estimatedDays = Math.ceil(totalUnits / unitsPerDay);
    return {
      type: "days",
      numericValue: estimatedDays,
      unit,
      textKey: "plans.custom.estimate.days",
    };
  }

  // Deadline cadence
  const days = Math.max(1, dayCountInclusive(startDate, endDate ?? startDate));
  const effectiveReps = Math.max(1, repetitions);
  const dailyPace = Math.ceil((totalUnits * effectiveReps) / days);
  return {
    type: "pace",
    numericValue: dailyPace,
    unit,
    textKey: "plans.custom.estimate.pace",
  };
};
```

---

## Picker Wiring (`PlansBrowseDialog.tsx`)

1. **Activate "Custom wird" Card:**
   - In `app/components/plans/PlansBrowseDialog.tsx`:
     - Extend `PlansBrowseView`:
       ```typescript
       export type PlansBrowseView =
         | "list"
         | "daily-wird"
         | "listening-wird"
         | "memorizing-wird"
         | "reviewing-wird"
         | "husun-overview"
         | "husun-settings"
         | "custom";
       ```
     - Remove `disabled`, `aria-disabled="true"`, and the "Soon" (`plans.browse.comingSoon`) badge from the Custom wird button (lines 157–182).
     - Add `onClick={() => setView("custom")}`.
2. **Render Custom Wird View:**
   - Add `renderCustomWird()` inside `PlansBrowseDialog`:
     ```tsx
     const renderCustomWird = () => (
       <>
         <ViewHeader
           title={editingPlan ? t("plans.custom.editTitle", "Edit custom wird") : t("plans.custom.newTitle", "New custom wird")}
           srDescription={t("plans.custom.description", "Create a personalized reading or memorization plan")}
           onBack={() => setView("list")}
           backLabel={backLabel}
         />
         <CustomWirdForm
           existingPlan={editingPlan ?? activePlanFor("custom")}
           onDone={close}
         />
       </>
     );
     ```
3. **Template UI Constants:**
   - In `app/constants/plan-ui.ts`, register the template entry:
     ```typescript
     custom: {
       labelKey: "plans.templates.custom.label",
       defaultLabel: "Custom wird",
       descriptionKey: "plans.templates.custom.description",
       defaultDescription: "A personalized goal with custom range and cadence.",
       icon: Sparkles,
     }
     ```

---

## Data & Hook Layer

### 1. Server Actions (`app/server/actions/plans.ts`)

Add dedicated, strongly typed actions for custom enrollments and edits:

```typescript
export const enrollCustomPlan = async (
  body: CreateCustomPlanBody
): Promise<UserPlanListItem | null> => {
  try {
    const { data, success } = await fetch("/api/plans", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }).then((r) => r.json());
    return success ? data : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const updateCustomPlan = async ({
  planId,
  ...body
}: { planId: number } & PatchCustomPlanBody): Promise<boolean> => {
  try {
    const { success } = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }).then((r) => r.json());
    return Boolean(success);
  } catch (e) {
    console.error(e);
    return false;
  }
};
```

### 2. React Query Hook (`app/hooks/use-plans.ts`)

Export the new mutations:
```typescript
const enrollCustom = useMutation({
  mutationFn: enrollCustomPlan,
  onSuccess: reload,
});

const updateCustom = useMutation({
  mutationFn: updateCustomPlan,
  onSuccess: reload,
});

return { ...query, reload, enroll, enrollCustom, setStatus, updateParams, updateCustom };
```

### 3. Progress Detection on Edit (`UserPlanListItem`)

**Recommendation:** Expose `has_progress: boolean` on `UserPlanListItem` in `GET /api/plans` (`app/api/plans/route.ts`).
- In `appPrisma.userPlan.findMany`:
  ```typescript
  include: { _count: { select: { progress: true } } }
  ```
- In `serializePlan`:
  ```typescript
  has_progress: (plan._count?.progress ?? 0) > 0
  ```
- *Benefit:* Immediate synchronous hydration of range lock state without an extra network request waterfall when opening the edit dialog.
- *Fallback:* If backend query modification is discouraged, `CustomWirdForm` invokes `usePlanHistory(existingPlan.id)` (mirroring `PlanEnrollForm.tsx` line 153).

---

## Internationalization (i18n)

### New Translation Keys (`messages/ar.json` & `messages/en.json`)

Namespace: `plans.custom.*`

| Key | Arabic (`ar`) | English (`en`) |
|---|---|---|
| `plans.browse.customWirdType.description` | اختيار مقدار مخصص أو سورة أو تحديد موعد للختم | Choose a custom range, surah, or target completion date |
| `plans.custom.newTitle` | ورد مخصص جديد | New custom wird |
| `plans.custom.editTitle` | تعديل الورد المخصص | Edit custom wird |
| `plans.custom.description` | حدد المقدار والوتيرة المناسبة لك | Set a custom range and cadence |
| `plans.custom.nameLabel` | اسم الورد | Wird name |
| `plans.custom.namePlaceholder` | مثال: حفظ سورة البقرة | e.g. Surah Al-Baqarah memorization |
| `plans.custom.activityLabel` | نوع الورد | Activity |
| `plans.custom.rangeLabel` | المقدار | Target range |
| `plans.custom.rangeMode.wholeMushaf` | كامل المصحف | Whole Quran |
| `plans.custom.rangeMode.surah` | بالسورة | By surah |
| `plans.custom.rangeMode.juz` | بالجزء | By juz |
| `plans.custom.rangeMode.page` | بالصفحة | By page |
| `plans.custom.rangeMode.verse` | بالآية | By verse |
| `plans.custom.fromSurah` | من سورة | From surah |
| `plans.custom.toSurah` | إلى سورة | To surah |
| `plans.custom.fromJuz` | من الجزء | From juz |
| `plans.custom.toJuz` | إلى الجزء | To juz |
| `plans.custom.fromPage` | من صفحة | From page |
| `plans.custom.toPage` | إلى صفحة | To page |
| `plans.custom.fromVerse` | من آية | From verse |
| `plans.custom.toVerse` | إلى آية | To verse |
| `plans.custom.cadenceLabel` | الوتيرة | Schedule |
| `plans.custom.cadenceType.pace` | بمعدل ثابت | By pace |
| `plans.custom.cadenceType.deadline` | بتاريخ إتمام | By deadline |
| `plans.custom.period.day` | يوميًا | Daily |
| `plans.custom.period.week` | أسبوعيًا | Weekly |
| `plans.custom.targetDate` | موعد الختم | Target date |
| `plans.custom.repetitions` | عدد الختمات | Repetitions |
| `plans.custom.estimate.days` | ≈ {count} يومًا للإتمام | ≈ {count} days to complete |
| `plans.custom.estimate.pace` | ≈ {amount} {unit}/يوم (يُعاد حسابه تلقائيًا) | ≈ {amount} {unit}/day (re-adjusts on missed days) |
| `plans.custom.rangeFrozen` | تم تثبيت المقدار لتسجيل قراءات سابقة | Target range is locked because progress has been logged |
| `plans.custom.verseWeeklyUnavailable` | المعدل الأسبوعي غير متاح للآيات؛ حدد معدلًا يوميًا أو تاريخ انتهاء | Weekly pace is not available for verses; specify daily verses or set a deadline |
| `plans.custom.memorizeRepetitionsLocked` | خطط الحفظ تقتصر على ختمة واحدة | Memorization plans track a single completion |
| `plans.custom.submit` | ابدأ الورد | Start wird |
| `plans.custom.save` | حفظ التعديلات | Save changes |

---

## Testing Plan

### 1. Unit Tests (`app/lib/plans/custom-wird-estimate.test.ts`)
- **Pace Calculation:**
  - 604 pages at 5 pages/day -> 121 days.
  - 604 pages at 14 pages/week (2 pages/day) -> 302 days.
  - 10 verses at 2 verses/day -> 5 days.
- **Deadline Calculation:**
  - 30 pages within 10 days -> 3 pages/day.
  - 604 pages within 30 days with $K=1$ -> 21 pages/day.
  - 604 pages within 30 days with $K=3$ -> 61 pages/day.
  - Dynamic re-adjustment with past/today date offsets.

### 2. State Mapping & Validation Tests (`app/components/plans/custom-wird-form.test.ts`)
- Serialization of `mushaf` mode into `{ mode: "page", startPage: 1, endPage: 604 }`.
- Serialization of `verse` mode into `"surah:ayah"` strings.
- Enforcement: Range omitted in PATCH when `hasProgress === true`.
- Enforcement: Weekly pace disallowed when `rangeMode === "verse"`.
- Enforcement: Repetitions hidden/forced to 1 when `activity === "memorize"`.

### 3. E2E Verification (`e2e/tests/plans-custom-wird.spec.ts`)
- Clicking "ورد مخصص" in `PlansBrowseDialog` opens the custom wird creation form.
- Filling Name, choosing Surah range (Al-Kahf, 18), setting pace 2 pages/day, and creating the plan.
- Verifying the newly created custom wird card appears in `/plans` under "My Plans" with correct parameters summary.
- Clicking "Edit" on the custom plan card, changing pace from 2 to 4 pages/day, saving, and verifying updated params.

---

## Resolved Decisions

1. **Repetitions (K):** Option A — visible stepper inside the "By Deadline" sub-form, hidden entirely (not just locked) when `activity === "memorize"` and omitted from payload because memorization tracks a single completion pass.
2. **Edit-mode range freeze:** Option A — when the plan has progress, the Range section stays visible but fully disabled with a lock icon and explanatory notice so users can inspect their bounds without corrupting engine cursor state.
3. **Verse-mode weekly pace:** Option A — the Weekly period pill is disabled whenever `rangeMode === "verse"` with helper microcopy, silently resetting to daily if switching from page mode, avoiding server 422 errors.
4. **Whole-Quran affordance:** Option A — dedicated first tab "Whole Quran" / "كامل المصحف" displaying a read-only 1–604 page chip that serializes to `{ mode: "page", startPage: 1, endPage: 604 }` without requiring manual page typing.
5. (was part of 2) covered above.
6. **Progress detection:** Option A — added `has_progress: boolean` to `UserPlanListItem` via Prisma `_count.progress` on `UserPlan` to eliminate dialog-open network waterfalls.
7. **Multi-plan edit routing:** Option A — added `initialPlan?: UserPlanListItem` prop to `PlansBrowseDialog` passed by `MyPlansList` so multiple custom wirds route edits to their respective plan instances.
8. **Standing design rules enforced (#610 review):**
   - **No raw number inputs:** Page (1–604) and ayah pickers use searchable `NumberCombobox` with `toLocaleNumeral` and bilingual digit search instead of `<input type="number">`.
   - **Nice scrollbars (`fq-scroll-nice`):** Applied to `DialogContent` and all nested `CommandList` containers.
   - **i18n parameter interpolation:** `CustomWirdForm` imports `useTranslations` directly from `next-intl` for ICU parameters (`{ count }`, `{ amount }`, `{ unit }`), eliminating manual `.replace()` calls. Documented in `docs/design/design-principles.md` and `DESIGN.md`.
9. **Human verse range formatting (`formatVerseRange`):** Created shared `formatVerseRange` in `app/lib/plans/ui-helpers.ts` formatting ranges with surah names and localized numerals (`"النساء ١–١٢"` / `"An-Nisa 1–12"`, cross-surah, single-ayah) across `PlanAssignmentRow` (hub hero + reader widget) and `MyPlansList` summary; redundant `{activity} ·` prefix dropped when a custom `planName` is shown.
10. **Arabic plural grammar & date localization (manual QA polish):** Added ICU plural message keys (`pagesCount`, `versesCount`, `daysCount`, `pagesPerDay`, `versesPerDay`, `pagesPerWeek`) using `{count, plural, ...}` with numeric `count` for selector logic and pre-localized `{n}` for Arabic-Indic numerals (avoiding Latin digit output from `#`). Forced `ar-u-nu-arab` in `toLocaleDateString` for Arabic dates. Updated picker description to omit khatma implication.

---

## Out of Scope

- Daily reminder time picker (#600) — slots into this form later.
- Reader-surface check-off (#597) — reader interaction layer.
- Backend validation & resolution — completed and shipped in #609.
- Smart completion transitions (#598).
- Multi-track custom wirds — custom wirds are strictly single-track (ADR 0067).

---

## File-by-File Change List

| File | Nature of Change | Est. Lines |
|---|---|---|
| `app/lib/plans/custom-wird-estimate.ts` | **NEW**: Pure client-side estimate helper mirroring `engine.ts` calculations for pace and deadline previews. | +110 lines |
| `app/lib/plans/custom-wird-estimate.test.ts` | **NEW**: Vitest unit tests for range unit resolution and cadence preview calculations. | +140 lines |
| `app/components/plans/CustomWirdForm.tsx` | **NEW**: Dedicated creation and edit form for custom wirds with 4 range modes + whole mushaf, 2 cadence sub-forms, and range freezing. | +380 lines |
| `app/components/plans/PlansBrowseDialog.tsx` | **MODIFY**: Add `"custom"` view, activate Custom wird button, wire `CustomWirdForm`, accept optional `initialPlan` prop. | +45 lines |
| `app/components/plans/MyPlansList.tsx` | **MODIFY**: Add `"custom"` to `EDIT_VIEW_FOR_TEMPLATE`, pass `initialPlan` to edit dialog, format custom plan summary in card. | +35 lines |
| `app/constants/plan-ui.ts` | **MODIFY**: Add `custom` template UI entry with `Sparkles` icon and i18n keys. | +15 lines |
| `app/server/actions/plans.ts` | **MODIFY**: Export `enrollCustomPlan` and `updateCustomPlan` actions. | +35 lines |
| `app/hooks/use-plans.ts` | **MODIFY**: Export `enrollCustom` and `updateCustom` React Query mutations. | +20 lines |
| `app/api/plans/route.ts` | **MODIFY**: Include `has_progress` flag on `UserPlanListItem` via `_count.progress`. | +15 lines |
| `messages/en.json` | **MODIFY**: Add `plans.custom.*` namespace and update custom wird card description. | +45 lines |
| `messages/ar.json` | **MODIFY**: Add `plans.custom.*` Arabic keys and update custom wird card description. | +45 lines |
| `e2e/tests/plans-custom-wird.spec.ts` | **NEW**: Playwright E2E testing creation, preview, and edit flows for custom wirds. | +120 lines |

---

## Constraints

- **Two-DB Invariant (ADR 0008):** Read Quran data statically or via existing read endpoints. No cross-database joins or relations.
- **Display-Only Estimate:** The client preview is purely for user guidance; the server remains the sole authority for scheduling.
- **Unit Immutability (ADR 0038):** A custom wird's unit (`page` or `verse`) is fixed at creation and cannot be changed on edit.
- **Range Immutability Post-Progress:** Once progress entries exist, range bounds are frozen to protect engine cursor continuity (`state.lastEnd + 1`).
- **Verse Weekly Pace Prohibition:** Weekly pace is strictly rejected for verse-level wirds.
- **Memorize Single-Pass Rule:** Repetitions $K > 1$ are disallowed when activity is `memorize`.
- **RTL & Design First:** All pickers, inputs, and sliders must maintain full RTL parity, 44px min touch targets, and conform to the reader-lab design tokens.

---

## What NOT to Do

- **Do NOT merge custom wird state into `PlanEnrollForm.tsx`** — keep them separated as dedicated sibling components.
- **Do NOT persist or submit computed pace or derived estimates** — the server derives all assignments at read time.
- **Do NOT allow range editing when `hasProgress` is true** — will trigger server 422 and corrupt engine derivations.
- **Do NOT allow weekly pace on verse mode** — fractional verses do not exist.
- **Do NOT permit $K > 1$ for `memorize` activity** — violated C2 Contract #3.
- **Do NOT alter existing database schemas or create Prisma migrations** — storage columns already shipped in #608.
- **Do NOT touch reader surface check-off code** — reserved for #597.

---

## Decisions Made

1. **Dedicated Sibling Component:** Decided on `CustomWirdForm.tsx` instead of expanding `PlanEnrollForm.tsx` to maintain clear boundaries between static presets and custom user definitions.
2. **Whole Mushaf as a Range Mode:** Modeled "Whole Quran" as a UI mode that maps cleanly to `{ mode: "page", startPage: 1, endPage: 604 }`.
3. **Pace Estimate as Pure Client Helper:** Placed preview math in `app/lib/plans/custom-wird-estimate.ts` using static chapters data, ensuring zero network latency for preview updates.
4. **Synchronous Progress Detection:** Recommended exposing `has_progress: boolean` on `UserPlanListItem` so edit forms hydrate lock state instantaneously.
5. **Targeted Multi-Plan Edit:** Added `initialPlan` prop to `PlansBrowseDialog` to support editing specific instances when multiple custom plans exist.
6. **No ADR Needed:** The architectural foundations (ADR 0067, ADR 0038, ADR 0030) are already active; this is a pure UI feature consuming existing APIs.

---

## Implementation Notes

- **Form Helpers Extraction:** State serialization and request body builder functions (`buildCustomCreateBody`, `buildCustomPatchBody`) were extracted to `app/lib/plans/custom-wird-form-helpers.ts`. This allows Vitest unit tests to test form mapping invariants as pure functions without requiring JSX compilation plugins in `vitest.config.ts`.
- **Prisma Relation Name Verification:** Verified in `prisma/app/schema.prisma` that the progress relation on `UserPlan` is named `progress` (`progress PlanProgressEntry[]`). Queried via `_count: { select: { progress: true } }` in `app/api/plans/route.ts` and `app/api/plans/[planId]/route.ts`.
- **Custom Plan Name in Card Title:** `MyPlansList.tsx`'s `PlanCard` renders `plan.name` as the main title for custom wirds when present, falling back to the localized template label `plans.templates.custom.label`.
- **Pace Hydration Weekly Framing:** Pace hydration recovers weekly framing for fractional stored `unitsPerDay` (`period="week", amount=round(unitsPerDay*7)`) — an intentional improvement over the plan's §5 ("hydrate as day"); an integer weekly rate like 14/week stores as `unitsPerDay: 2` and reopens as "2/day" (same rate, different label).
- **Surah/Juz Range Persistence:** Surah/juz range modes are not persisted (D3), so editing such a wird reopens in "By page" mode with canonical page numbers.
- **Manual QA Fix Round Notes:**
  - **Dialog Ergonomics & Scrolling:** The dialog was widened for the custom view (`w-[calc(100vw-2rem)] sm:max-w-lg`) with `fq-scroll-nice` and expanded vertical rhythm to prevent claustrophobic layouts on mobile/desktop.
  - **Surah Combobox Layout:** Applied `min-w-0 flex-1` on the surah name element in `SurahCombobox` to prevent name truncation and zero-width collapse.
  - **Name Flow in Today Assignments:** Extended `TodayPlanAssignments` in `app/api/plans/today/route.ts` to include `name: plan.name`, propagating it to `PlanAssignmentRow`, `PlansWidget`, and `PlansTodayHero`, accompanied by `PLAN_TEMPLATE_UI.custom` and `PLAN_TRACK_UI.custom` with `Sparkles` icon.
  - **Human Verse Range Labels:** `formatVerseRange` was extracted to `app/lib/plans/ui-helpers.ts` and integrated into `PlanAssignmentRow` (both hub and widget) and `MyPlansList.tsx` (`PlanParametersSummary`), replacing bare `"4:1–4:12"` strings with localized `"النساء ١–١٢"` / `"An-Nisa 1–12"`.
  - **Manage-Plans Page Range Summary:** Shortened from verbose `"من صفحة ٧٧ – إلى صفحة ١٠٦"` to `"صفحات ٧٧–١٠٦"` / `"Pages 77–106"` (`plans.custom.pagesRange`) and `"صفحة ٧٧"` / `"Page 77"` (`plans.custom.singlePage`).
  - **ICU Plurals & Numeral Localization:** All count/unit strings (`pagesCount`, `versesCount`, `daysCount`, `pagesPerDay`, `versesPerDay`, `pagesPerWeek`) use ICU plurals with numeric `count` and pre-localized `{n}`. Date formatting across plan cards and history uses `ar-u-nu-arab` to render Arabic-Indic numerals.
