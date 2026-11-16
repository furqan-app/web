---
title: "Smart Heart Pulse Wird Plan"
type: feature
date: 2026-11-12
status: implemented
area: awrad
issue: 652
adr: [0078]
---

# Smart Heart Pulse Wird Plan (#652)

> Architectural Decision Record: [`docs/architecture/adr/0078-heart-pulse-smart-wird.md`](../architecture/adr/0078-heart-pulse-smart-wird.md)  
> Foundational ADRs: [ADR 0030 (Plan Engine Derived Assignments)](../architecture/adr/0030-plan-engine-derived-assignments.md), [ADR 0077 (Quran Heart Memorization Map)](../architecture/adr/0077-quran-heart-memorization-map.md)

## Summary

Builds the "Heart Pulse" smart multi-track wird plan ("خطة أوراد نبض القلب الذكية") powered by the reader's real-time memorization diagnosis from `/heart`. The plan coordinates up to four parallel tracks: new memorization & gap filling (`hifz`), slipping review (`motafallit`), near review trailing window (`qareeb`), and recitation/preparation lookahead (`tahdeer`). An explicit launch button on `/heart` ("إنشاء أوراد نبض القلب" / "تعديل الورد") opens an interactive, accessible configuration dialog (`HeartPulsePlanDialog`) where users inspect their diagnostic breakdown (slipping pages, gaps, virgin territory), toggle their desired tracks, set daily quantities, and select their memorization trajectory (ascending from An-Nas 114→1 or descending from Al-Baqarah 2→114). The plan adheres strictly to ADR 0030: diagnosed page sequences are snapshotted in `UserPlan.params` so the derivation engine remains a 100% pure, clockless, DB-free function. When daily assignments are completed in `POST /api/plans/[planId]/progress`, completed pages in `user_surah_page_memorizations` are promoted to `status = "mastered"` within the same database transaction, immediately updating the visual heart map and progress stats in real time.

## Root Cause / Approach

### 1. Interactive Entry Points & UX Architecture (`/heart` & `/plans`)
- **Explicit User Control (No Automatic Activation):** The plan is never created or modified silently. The user retains complete agency over when to generate, customize, or edit their heart pulse wird.
- **Dedicated Trigger on `/heart`:** Inside the "حالة قلبي" progress card (or immediately below its metrics header), a high-visibility, accessible button is placed:
  - If no active heart-pulse plan exists: "إنشاء أوراد نبض القلب" ("Create Heart Pulse Wird") with a heart/sparkles icon.
  - If an active heart-pulse plan already exists: "تعديل الورد" ("Edit Heart Wird") displaying the active daily load summary (e.g. "٣ صفحات / يوم").
- **Catalog Integration on `/plans`:** Inside `PlansBrowseDialog.tsx`, a featured card "خطة نبض القلب الذكية" is introduced under the catalog views, routing directly to the configuration wizard or opening the existing plan.
- **Dedicated Configuration Dialog (`HeartPulsePlanDialog.tsx`):**
  - **Aesthetic Direction:** Follows Furqan's design system (`docs/design/design-principles.md` and `DESIGN.md`), utilizing brand tokens, subtle borders (`border-border/60`), card surfaces (`hsl(var(--card))`), and `fq-focus-ring`.
  - **Live Diagnostic Header:** Renders a compact 3-state visual summary card diagnosing current memorization health across all 604 mushaf pages: mastered pages (`متقنة`), slipping pages needing review (`تحتاج تعهداً`), and unmemorized pages (`غير محفوظة`).
  - **Direction Selection:** Two interactive selection cards with visual arrows and localized descriptions:
    - "من سورة الناس صعوداً (جزء عم فأعلى)" (`ascending`, 114→1) — skips 100% mastered surahs, targets unmemorized pages in reverse order.
    - "من سورة البقرة نزولاً" (`descending`, 2→114) — skips 100% mastered surahs, starts from the first unmemorized surah.
  - **Track Selection & Quantity Steppers:** Four modular track cards equipped with checkboxes/switches and `QuantityStepper` controls:
    1. **الحفظ الجديد وسد الفجوات (`hifz`):** Enabled by default; pace stepper (e.g. 1 page/day).
    2. **مراجعة المتفلت (`motafallit`):** Enabled by default if slipping pages exist; pace stepper (e.g. 2 pages/day). Disabled with an explanatory note if 0 pages need review.
    3. **مراجعة القريب (`qareeb`):** Optional trailing window (e.g. 5–10 pages) over recent new memorization.
    4. **التلاوة والتحضير (`tahdeer`):** Optional preview/recitation of tomorrow's memorization assignment.
  - **Save & Launch:** Submits to `POST /api/plans` (or `PATCH /api/plans/:planId`), invalidating `["/plans"]` and `["/api/plans/memorization"]` queries.

### 2. Diagnosis & Queue Generation Algorithm (ADR 0078)
When the user submits the dialog:
1. **Fetch current memorization map:** From `UserSurahPageMemorization` for the authenticated user.
2. **Resolve New Memorization Queue (`targetPages`):**
   - Iterate through surahs according to the chosen direction (`ascending`: 114 down to 1; `descending`: 2 up to 114, then 1).
   - For each surah:
     - If the surah is 100% mastered (`masteredPages === totalPages`), skip it completely.
     - If the surah has unmemorized pages (whether completely unmemorized or partially memorized with gaps):
       - Extract all page numbers where `status === undefined` (not in `mastered` or `needs_review`).
       - Order pages canonically (or in reverse if ascending within surah, though page-ascending per surah is natural for reading order).
       - Append to `targetPages`.
3. **Resolve Slipping Review Queue (`slippingPages`):**
   - Collect all physical pages where `status === "needs_review"`.
   - Order according to the chosen direction (e.g. 114→1 or 2→114).
   - Append to `slippingPages`.
4. **Snapshot into Plan Parameters:**
   - Saved into `UserPlan.params`:
     ```json
     {
       "direction": "ascending",
       "activeTracks": ["hifz", "motafallit", "qareeb"],
       "quantities": { "hifz": 1, "motafallit": 2, "qareeb": 5 },
       "targetPages": [603, 602, 601, ...],
       "slippingPages": [604, 590, ...]
     }
     ```

### 3. Read-Time Derivation in `app/lib/plans/engine.ts` (ADR 0030)
- `template_key = "heart-pulse"`:
  - Defines four potential tracks: `hifz`, `motafallit`, `qareeb`, `tahdeer`.
  - Only tracks present in `params.activeTracks` produce assignments.
- **`hifz` Track Derivation:**
  - Reads `params.targetPages`.
  - Determines completed count from progress log entries for track `hifz`.
  - Starting index = number of pages already logged.
  - If starting index >= `targetPages.length`: track is completed (yields empty assignment).
  - Daily assignment = slice of `targetPages` of size `quantities.hifz` (e.g. 1 page).
- **`motafallit` Track Derivation:**
  - Reads `params.slippingPages`.
  - If `slippingPages.length === 0`: yields empty assignment (track idles gracefully).
  - Determines completed count from progress log entries for track `motafallit`.
  - If completed count >= `slippingPages.length`: track is exhausted (yields empty assignment).
  - Daily assignment = slice of `slippingPages` of size `quantities.motafallit` (e.g. 2 pages).
- **`qareeb` Track Derivation:**
  - Trailing window rule over `hifz` completed history.
- **`tahdeer` Track Derivation:**
  - Lookahead rule previewing the next slice of `hifz`.

### 4. Progress Check-Off & Real-Time Heart Synchronization
- In `POST /api/plans/[planId]/progress`:
  - When progress is logged for a `heart-pulse` plan:
    - If `track_key === "hifz"`:
      - For each page in the completed assignment:
        - Determine `chapter_id` from `SURAH_PAGE_BOUNDS`.
        - Upsert into `user_surah_page_memorizations` with `status: "mastered"`.
    - If `track_key === "motafallit"`:
      - For each page in the completed assignment:
        - Update in `user_surah_page_memorizations` from `needs_review` to `mastered`.
    - Both progress entry creation and memorization upserts execute in the same `appPrisma.$transaction`.
- In `DELETE /api/plans/[planId]/progress`:
  - Removes the progress entry. Heart cells remain in their earned mastered state (as confirmed: only completed wirds transition heart cells, and partial/incomplete wirds do not mutate heart cells).

## Decision Tree / Algorithm

```
[User clicks "إنشاء أوراد نبض القلب" in /heart or /plans]
  │
  ▼
[HeartPulsePlanDialog opens]
  │
  ├─► 1. Display diagnostic counts (Slipping: X, Gaps: Y, Virgin: Z)
  ├─► 2. User selects Direction:
  │      ├─ "من سورة الناس صعوداً" (114 → 1)
  │      └─ "من سورة البقرة نزولاً" (2 → 114)
  ├─► 3. User toggles Active Tracks & Sets Quantities:
  │      ├─ [x] الحفظ الجديد وسد الفجوات (default 1 page/day)
  │      ├─ [x] مراجعة المتفلت (default 2 pages/day; disabled if X === 0)
  │      ├─ [ ] مراجعة القريب (trailing window, e.g. 5 pages)
  │      └─ [ ] التلاوة والتحضير (lookahead, e.g. 1 page)
  │
  ▼
[User clicks "حفظ وبدء الخطة"]
  │
  ▼
[Backend: Resolve targetPages & slippingPages]
  │
  ├─ Filter out 100% mastered surahs
  ├─ For partial surahs: extract unmemorized gap pages first
  ├─ For virgin surahs: extract all pages
  └─ Save UserPlan with template_key="heart-pulse" & snapshot params
  │
  ▼
[Daily Engine Derivation (app/lib/plans/engine.ts)]
  │
  ├─ hifz: slice next N pages from targetPages
  ├─ motafallit: if slippingPages remaining > 0, slice next M pages; else return []
  ├─ qareeb: trailing window over hifz history
  └─ tahdeer: next slice of hifz
  │
  ▼
[Daily Check-Off (POST /api/plans/[planId]/progress)]
  │
  ├─ If hifz checked off: upsert page records in user_surah_page_memorizations as "mastered"
  ├─ If motafallit checked off: update page records from "needs_review" to "mastered"
  └─ Invalidate React Query caches: /heart instantly reflects emerald green!
```

## Verified Test Cases

### Case 1: Gap Closing in Partial Surah
- **Input:** User selects "من سورة الناس صعوداً" (114→1). Surah Al-Ikhlas (112, page 604) is `mastered`. Surah Al-Masad (111, page 603) is `unmemorized`. Surah Al-Falaq (113, page 604) is `mastered`.
- **Derivation Output:** `targetPages` starts with page 603 (Al-Masad). Pages 604 for Al-Ikhlas and Al-Falaq are skipped because they are already mastered.
- **Check-off Output:** Checking off page 603 promotes Al-Masad page 603 to `mastered`. Al-Masad immediately turns solid emerald green on the heart map.

### Case 2: Slipping Pages Exhaustion
- **Input:** User has 3 pages marked `needs_review` (pages 562, 563, 564 in Surah Al-Mulk). `motafallit` pace is 2 pages/day.
- **Day 1 Output:** `motafallit` assigns pages 562–563. Check-off promotes them to `mastered`.
- **Day 2 Output:** `motafallit` assigns page 564. Check-off promotes it to `mastered`.
- **Day 3 Output:** Zero pages remaining in `slippingPages`. `motafallit` yields empty assignment (`[]`). `hifz` continues with its daily portion.

### Case 3: Mixed Tracks Selection
- **Input:** User enables ONLY `hifz` (1 page/day) and unchecks `motafallit`, `qareeb`, and `tahdeer`.
- **Output:** Daily wird displays exactly 1 assignment per day for `hifz`. No review or listening assignments are generated.

### Case 4: Direction Trajectory from Al-Baqarah
- **Input:** User selects "من سورة البقرة نزولاً" (2→114). User already has Surah Al-Baqarah (pages 2–49) 100% `mastered`. Surah Al-Imran (pages 50–76) is `unmemorized`.
- **Output:** `targetPages` skips pages 2–49 and begins immediately at page 50 (Al-Imran).

## UI/UX & Accessibility Concerns

- **Design System Cohesion:** Uses Radix `Dialog`, Tailwind semantic colors (`bg-card`, `text-foreground`, `border-border`, `primary`), and `.fq-rule-mark` styling.
- **Touch Targets:** Stepper buttons (`QuantityStepper`), checkboxes, and direction cards maintain minimum 44px hit targets.
- **RTL / LTR Parity:** Direction arrows (`rtl:rotate-180`), localized Arabic numerals (`toLocaleNumeral`), and next-intl ICU strings.
- **Reduced Motion:** Modal transitions and card highlight rings respect `prefers-reduced-motion: reduce`.
- **Responsive Layout:** Dialog sizes smoothly on mobile (`w-[calc(100vw-2rem)] sm:max-w-lg`) with `fq-scroll-nice` vertical scrolling when content exceeds viewport height.

## Files to Change

### 1. Plan Engine & Constants
- `app/constants/plans.ts` — Add `"heart-pulse"` template definition and `HeartPulsePlanParams` type.
- `app/constants/plan-ui.ts` — Add UI display metadata and Lucide icon for `heart-pulse` template.
- `app/lib/plans/engine.ts` — Implement `heart-pulse` derivation logic for `hifz` and `motafallit` snapshot queues.
- `app/lib/plans/heart-pulse-algorithm.ts` — Pure diagnostic function computing target and slipping queues from memorization state and chosen direction. Backed by unit tests.

### 2. API Routes
- `app/api/plans/route.ts` — Validate and accept `heart-pulse` template enrollment and edit requests.
- `app/api/plans/[planId]/progress/route.ts` — On progress check-off for `heart-pulse`, atomically upsert/update completed pages in `UserSurahPageMemorization` within the Prisma transaction.

### 3. UI Components & Dialogs
- `app/components/plans/HeartPulsePlanDialog.tsx` — New dedicated configuration & edit wizard with diagnostic summary, direction cards, track toggles, and quantity steppers.
- `app/components/plans/QuranHeartMapTab.tsx` — Add "إنشاء أوراد نبض القلب" / "تعديل الورد" action button inside the "حالة قلبي" progress card.
- `app/components/plans/PlansBrowseDialog.tsx` — Add featured "خطة نبض القلب" card under template browsing.

### 4. Translations
- `messages/ar.json` & `messages/en.json` — Add keys for `plans.heartPulse.*` (title, direction options, track descriptions, diagnostic badges).

### 5. Architectural Records
- `docs/architecture/adr/0078-heart-pulse-smart-wird.md` — Record architecture and read-time derivation invariants.
- `docs/architecture/decisions/plans.md` — Add active decision entry.

## Constraints

- **ADR 0008 (Two-DB Split):** All memorization records and plan entries reside strictly within `furqan_app`. No cross-database foreign keys.
- **ADR 0030 (Pure Read-Time Derivation):** `engine.ts` must never perform database queries or inspect system clocks during daily assignment derivation. Target queues are stored in `params`.
- **ADR 0077 (Surah-Page Independence):** Progress updates to `UserSurahPageMemorization` must maintain surah-page granularity with scalar references.
- **No Automatic Activation:** Creation and modification require deliberate user confirmation in the dialog.

## What NOT to Do

- Do NOT execute live database queries inside `engine.ts` to discover unmemorized pages on every read.
- Do NOT activate or generate the plan automatically without explicit user confirmation.
- Do NOT mutate `user_surah_page_memorizations` on uncompleted or partial wird days.
- Do NOT force manual surah-by-surah ordering in v1 (user confirmed direction-based sequencing 114→1 or 2→114 is the approved scope).
- Do NOT hardcode track combinations; the user must be able to select any combination of the four tracks.

## Decisions Made

- Adopted ADR 0078: Snapshot target queues in `UserPlan.params` with write-time synchronization to `UserSurahPageMemorization` in `POST /api/plans/[planId]/progress`.
- Dedicated entry button located in `/heart` ("حالة قلبي" card) with edit support when a plan is active.
- Direction-based sequencing: "من سورة الناس صعوداً" (114→1) or "من سورة البقرة نزولاً" (2→114), skipping 100% mastered surahs.
- Gap-filling priority: partially memorized surahs along the chosen path have their unmemorized pages assigned first before advancing.
- Graceful idling: when slipping pages reach 0, the `motafallit` track produces empty assignments while memorization continues.
