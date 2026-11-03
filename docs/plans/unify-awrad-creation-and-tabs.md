---
title: Unify Awrad Creation Flow and Consolidate Main Plans Tabs
type: feature
date: 2026-10-17
status: implemented
area: awrad
---

# Unify Awrad Creation Flow and Consolidate Main Plans Tabs

## Summary

Consolidate the duplicated Awrad creation paths ("الورد اليومي" vs "الورد المخصص") into a single smart wizard with an upfront choice between a personal wird, ready-made presets with smart dedicated reminders, and the structured Al-Husun Al-Khamsa program, and merge the redundant "مهام اليوم" (Today's Tasks) and "إدارة الخطط" (Plan Management) tabs in `/plans` into a unified primary tab ("أورادي") alongside "التقدّم" and "التنبيهات". As part of the unified form, fix the surah-resolution bug in `StartPointPicker` by tracking the explicitly selected surah ID so that choosing a surah on a shared page (such as Az-Zalzalah on page 599) displays the correct surah name and applies the selection checkmark strictly to the chosen item.

## Root Cause / Approach

### 1. Creation Flow Duplication
Historically, `daily-wird` was implemented first as a full-mushaf (pages 1–604) khatma template. Later, `custom` wirds were introduced to support arbitrary ranges (surah, juz, page, verse) and diverse cadences (deadline, daily-recurring, weekly-recurring). This created redundant top-level options where "الورد المخصص" is a superset of "الورد اليومي", confusing users who expect any recurring daily reading to be their daily wird.
**Approach:** In `PlansBrowseDialog`, present a clean 2-choice entry:
1. **ورد جديد (New Wird):** Opens the unified creation form (powered by `CustomWirdForm`), supporting all range modes (Whole Mushaf with optional start point, By Surah, By Juz, By Page, By Verse), all 4 activities (read, listen, memorize, review), and all cadences (daily pace, deadline, recurring).
2. **الحصون الخمسة (Al-Husun Al-Khamsa):** Retained as the dedicated structured 5-track memorization program (`husun-overview` / `husun-settings`).

### 2. Ready-Made Presets & Smart Dedicated Reminders
Users frequently seek common recurring practices (e.g. Surat Al-Kahf on Fridays, Surat Al-Mulk every night) without needing to manually configure range and cadence from scratch.
**Approach:**
- Introduce `READY_MADE_PRESETS` in `app/constants/plan-presets.ts` (Surat Al-Kahf weekly, Surat Al-Mulk daily, Tayseer 0.5-page khatma, Monthly 20-page khatma).
- Support 1-click quick-enroll directly from `PlansBrowseDialog` or customizing via `CustomWirdForm`.
- Pre-configure sensible `defaultReminderTime` for specific presets (`kahf-weekly` at 10:00 AM, `mulk-daily` at 10:00 PM).
- Automatically bind dedicated reminders upon enrollment via `bindDedicatedReminderSafe` (`POST /api/notifications/daily-reminder`), wrapped in error boundaries so notification failures never abort plan enrollment.

### 3. Main Surface Tab Fragmentation
Currently, `/plans` renders 4 separate tabs: `tab-today` ("مهام اليوم"), `tab-progress` ("التقدّم"), `tab-plans` ("إدارة الخطط"), and `tab-reminders` ("التنبيهات"). Users with active plans see their tasks in tab 1, but must switch to tab 3 to edit, pause, view history, or manage dedicated reminders for those exact same plans.
**Approach:** Consolidate the 4 tabs into 3 streamlined tabs:
1. **أورادي (My Awrad) (`tab-today`):** Merges `PlansTodayHero` (the completion ring and today's reading tasks) at the top, followed immediately by the active/paused plan cards (`PlanCard`) with their inline controls (Edit, Actions menu, History accordion, dedicated reminder), plus the `AddPlanButton`.
2. **التقدّم (Progress) (`tab-progress`):** Retains `PlansProgressTab` for streaks, cumulative stats, and 365-day heatmap.
3. **التنبيهات (Reminders) (`tab-reminders`):** Retains `DailyWirdReminderSection` unchanged.

### 4. StartPointPicker Surah Resolution Bug
In `StartPointPicker.tsx`, selecting a surah invoked `onChange(chapterStartPage)` without persisting `selectedSurahId`. The component re-derived the active surah using `chapters.find((c) => value >= start && value <= end)`, which returns the first chapter spanning that page (e.g. Al-Bayyinah 598–599 when selecting Az-Zalzalah 599). Additionally, `isSelected = value === chapterStartPage` multi-selected every surah starting on that page (e.g. both Az-Zalzalah and Al-Adiyat on 599, or all three on 604).
**Approach:**
- Add `selectedSurahId: number | null` state in `StartPointPicker`.
- On surah select: set `selectedSurahId = chapter.id`.
- On trigger display: use `selectedSurahId` when valid for `value`; otherwise prefer a chapter where `startPage === value` before falling back to spanning.
- In Command list: mark selected strictly when `chapter.id === activeSurahId`.

## Decision Tree / Algorithm

### Creation Flow Selection
- IF user clicks `AddPlanButton` THEN open `PlansBrowseDialog`.
- Dialog root view presents:
  - Option A: "ورد جديد" (`custom`) → loads unified `CustomWirdForm`.
  - Option B: Ready-made presets list with 1-click "اشتراك" (quick enroll) or click card to customize.
  - Option C: "برنامج الحصون الخمسة" (`husun-overview`) → loads Husun overview.

### Dedicated Reminder Auto-Binding
- IF enrolled via preset with `defaultReminderTime`:
  - After successful plan enrollment, call `bindDedicatedReminderSafe`.
  - Invalidate `["daily-wird-reminder"]` query key.
  - Failures logged without interrupting enrollment success.

### Unified Range Mode & Start Point
- IF range mode is `"mushaf"`:
  - Default range is pages 1–604.
  - Render `StartPointPicker` with `value={startPage}` to allow starting mid-mushaf.
  - Fix `StartPointPicker` to maintain `selectedSurahId` so surah selection is deterministic.
- IF range mode is `"surah"` | `"juz"` | `"page"` | `"verse"`:
  - Render corresponding range bounds controls from `CustomWirdForm`.

### Tab Consolidation in `MyPlansList.tsx`
- Active tabs are reduced from 4 to 3:
  1. `today` ("أورادي" / `plans.tabs.myAwrad`):
     - Renders `PlansTodayHero` (if active plans exist).
     - Renders `PlanCard` list for active and paused/completed plans.
     - Renders `AddPlanButton`.
     - Supports `data-testid="tab-today"` and maintains backward compatibility for test hooks expecting `tab-plans`.
  2. `progress` ("التقدّم"):
     - Renders `PlansProgressTab` (unchanged).
  3. `reminders` ("التنبيهات"):
     - Renders `DailyWirdReminderSection` (unchanged).

## Verified Test Cases

| Scenario | Input | Expected Behavior |
|---|---|---|
| Pick shared-page surah as start point | Select "الزلزلة" in By Surah picker | Trigger displays "الزلزلة (صفحة ٥٩٩)", only Az-Zalzalah is checked in dropdown, `startPage` becomes 599. |
| Pick shared-page surah on page 604 | Select "الناس" in By Surah picker | Trigger displays "الناس (صفحة ٦٠٤)", only An-Nas is checked, Al-Ikhlas and Al-Falaq are unchecked. |
| Open Add Plan dialog | User clicks "+ إضافة ورد" | Dialog presents "ورد جديد", ready-made presets list, and "الحصون الخمسة". |
| Select "ورد جديد" | User chooses "ورد جديد" | Unified form opens supporting mushaf (with start point), surah, juz, page, verse + activity + cadence. |
| Quick-enroll Al-Kahf preset | Click "اشتراك" on Al-Kahf preset | Enrolls weekly Friday plan and auto-binds dedicated reminder at 10:00 AM. |
| Quick-enroll Al-Mulk preset | Click "اشتراك" on Al-Mulk preset | Enrolls daily plan and auto-binds dedicated reminder at 10:00 PM. |
| Visit `/plans` main page | User navigates to `/plans` | 3 tabs shown: "أورادي", "التقدّم", "التنبيهات". Tab "أورادي" displays both today's tasks hero and the plan cards with edit/pause/history. |
| Dedicated reminder interaction | User toggles reminder on plan card in "أورادي" | Dedicated reminder opens time picker directly on the card without switching tabs. |
| Reminder tab navigation | User clicks "التنبيهات" or hero reminder link | Third tab displays `DailyWirdReminderSection` exactly as before. |

## Files to Change

- `app/constants/plan-presets.ts`:
  - Define `READY_MADE_PRESETS` and `PlanPreset` type with optional `defaultReminderTime`.
- `app/lib/plans/custom-wird-form-helpers.ts`:
  - Add `bindDedicatedReminderSafe` helper for safe non-blocking reminder binding.
- `app/components/plans/StartPointPicker.tsx`:
  - Add `selectedSurahId` state.
  - Update `currentSurah` resolution to prioritize `selectedSurahId` then exact `startPage === value` over loose range span.
  - Fix dropdown `isSelected` to check `chapter.id === selectedSurahId`.
- `app/components/plans/CustomWirdForm.tsx`:
  - Integrate `StartPointPicker` into `rangeMode === "mushaf"` so full-mushaf wirds support choosing an optional start point.
  - Support hydrating existing `daily-wird` preset plans for seamless editing.
  - Bind dedicated reminder when enrolling a preset with `defaultReminderTime`.
- `app/components/plans/PlansBrowseDialog.tsx`:
  - Restructure root `list` view to present "ورد جديد", ready-made presets, and "الحصون الخمسة".
  - Deprecate separate `daily-wird` / `listening-wird` / `memorizing-wird` / `reviewing-wird` view tabs in favor of the unified form.
- `app/components/plans/MyPlansList.tsx`:
  - Merge `tab-today` and `tab-plans` into a single primary tab ("أورادي" / `plans.tabs.myAwrad`).
  - Render `PlansTodayHero` followed by the `PlanCard` list in the unified tab.
  - Retain `tab-progress` and `tab-reminders` tabs.
  - Retain `data-testid="tab-plans"` compatibility alias to preserve existing e2e test expectations.
- `messages/ar.json` & `messages/en.json`:
  - Add `plans.tabs.myAwrad` ("أورادي" / "My Awrad").
  - Add ready-made preset titles and descriptions.

## Constraints

- **ADR 0008 (Two-DB split):** No cross-database joins or foreign keys.
- **ADR 0030 / ADR 0038 / ADR 0067:** Plan derivations remain pure functions of stored definitions/params; no schema migrations.
- **ADR 0037 (Notification Dispatch):** Safe non-blocking reminder dispatch; reminder failures must never fail plan enrollment.
- **Existing Enrollments:** Pre-existing `template_key = "daily-wird"` rows must remain fully supported in history, streaks, and editing.
- **Accessibility & Design:** 44px touch targets minimum, full RTL/LTR parity, semantic theme tokens.

## What NOT to Do

- **DO NOT alter the Prisma database schema:** No changes to `UserPlan` or `PlanProgressEntry`.
- **DO NOT change the reminders mechanism:** Tab 3 remains identical; dedicated reminders stay on `PlanCard`.
- **DO NOT delete existing preset templates in `constants/plans.ts`:** Engine derivation for legacy rows must continue to function.

## Decisions Made

1. **Clean Dialog Entry:** Separate individual customizable wirds ("ورد جديد") and ready-made presets from the 5-track structured curriculum ("الحصون الخمسة").
2. **Unified Form Covers Whole Mushaf + Range:** `CustomWirdForm` handles whole mushaf (with optional start point via `StartPointPicker`) alongside surah, juz, page, and verse modes.
3. **Three-Tab Main Surface:** Merged "مهام اليوم" and "إدارة الخطط" into "أورادي" to give users a single home for daily completion and plan management, keeping "التقدّم" and "التنبيهات" intact.
4. **Smart Dedicated Reminders for Presets:** Presets automatically bind sensible dedicated reminders (`kahf-weekly` at Friday 10:00, `mulk-daily` at 22:00) safely upon enrollment.

## Revision History

- 2026-10-24 — folded Addendum 1: smart dedicated reminders for ready-made presets (Al-Kahf Friday 10:00, Al-Mulk daily 22:00) with safe auto-binding via `bindDedicatedReminderSafe`.

