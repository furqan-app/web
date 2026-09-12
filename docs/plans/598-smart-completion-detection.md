---
title: "Awrad Smart Completion: Dwell time & recitation playback detection with smart nudge and opt-in auto-write"
type: feature
date: 2026-09-11
status: implemented
area: awrad
issue: 598
---

# Awrad Smart Completion: Dwell time & recitation playback detection with smart nudge and opt-in auto-write

> Visual mockup: [`598-smart-completion-detection.mockup.html`](598-smart-completion-detection.mockup.html)

---

## 1. Current State & Gap Analysis

### 1.1 What #597 Built in the Reader
In [#597](597-reader-wird-checkoff.md), the floating reader widget (`app/components/plans/PlansWidget.tsx`) was refined from an omnipresent daily-summary pill into an unobtrusive, page-scoped check-off dial:
- **Mount Predicate:** Renders `null` unless on a self-reader route (`isSelfReaderRoute`), authenticated (`sessionStatus === "authenticated"`), with visible pages (`visiblePages !== null`), and overlapping $\ge 1$ uncompleted today-assignment (`totalCount > 0` and `pendingCount > 0`).
- **Visual Design:** A 42px progress dial (44×44px hit target) at `fixed z-40 bottom-24 end-4`. Constructed with a fully opaque card face (`hsl(var(--card))`), 1px border (`border-border`), and an inset catch-light (`shadow-[inset_0_1px_0_hsl(var(--surface-rim)/var(--surface-rim-alpha))]`). On dark themes, depth is carried strictly by the warm rim without drop shadows or `backdrop-blur` (ADR 0032).
- **Dial Indicator:** Continuous ring ($N=1$), segmented arcs ($2 \le N \le 4$, clockwise from 12 o'clock in both LTR and RTL), or proportional arc ($N > 4$). Center label displays `"wird"` / `"ورد"` (`fontSize="7.5"`, `fill="hsl(var(--muted-foreground))"`).
- **Interaction Model:** Tapping the widget opens a bottom `Sheet` displaying page-relevant assignments via `PlanAssignmentRow.tsx`.
- **Completion Flourish:** When the last page-relevant assignment is checked off, the ring seals solid `--primary` with a gentle ~1.05 scale pulse for 1.2s, announces completion via `aria-live`, fades out (300ms), and unmounts.

### 1.2 The Manual Check-Off Write Path
The current write path is purely manual:
1. User opens the sheet from `PlansWidget` or visits the `/plans` hub.
2. User taps the check button on `PlanAssignmentRow`.
3. `PlanAssignmentRow` triggers `useTodayAssignments.checkOff.mutate({ planId, trackKey, rangeStart, rangeEnd })`.
4. Executes `POST /api/plans/:planId/progress` with `{ track_key, date, range_start, range_end }`.
5. On HTTP 200, React Query invalidates `["/plans"]`.
6. Pure engine derivation (`app/lib/plans/engine.ts`: `deriveAssignments`) marks the track assignment `completed: true` for the date.

### 1.3 What Contexts Expose Today
- **`ReaderPageContext` (`app/contexts/ReaderPageContext.tsx`):**
  - `visiblePages: number[] | null`: Mushaf page numbers currently rendered on screen (single page on mobile, double spread `[rightPage, leftPage]` on tablet/desktop).
- **`RecitationContext` (`app/contexts/RecitationContext.tsx`):**
  - `recitedPage: number | null`: Mushaf page of the active recitation audio.
  - `currentVerseKey: string | null`: Currently reciting verse (e.g. `"2:142"`).
  - `status: RecitationStatus`: `"idle" | "loading" | "playing" | "paused"`.
  - `activeOverride: ActiveOverride | null`: `{ id, label }` where `id === planPlaybackSessionId(planId, trackKey)`.
  - `settings: RecitationSettings`: `playbackSpeed`, `reciterId`, repeat counts.
- **`app/lib/plans/assignment-range.ts`:**
  - `getPageRelevantAssignments(...)`: Pure helper mapping visible pages and recitation position to overlapping plan assignments.

### 1.4 What Is Genuinely Missing
1. **Zero Reading Presence Detection:** No mechanism monitors active presence or reading duration on assigned mushaf pages. Leaving a page open does nothing; the user must remember to open the sheet and tick the button manually.
2. **Zero Listening Coverage Detection:** Even when an assignment is played inline via `RecitationContext` with bounded stop points, reaching the end of the audio simply halts playback; no completion offer or check-off occurs.
3. **No Non-Intrusive Completion Offer (Option A):** No affordance signals to the user that they have met their daily reading or listening target and can check off in 1 tap.
4. **No User Preference for Automatic Completion (Option B):** No opt-in toggle exists in Settings for users who prefer silent background check-offs without confirmation prompts.

---

## 2. Dwell Detection (Reading / Memorizing / Reviewing)

The dwell detector tracks active reading presence for assignments with activities `read`, `memorize`, and `review`. It runs entirely in the client reader session as an ephemeral state machine.

### 2.1 The Conservative Thresholds & Reasoning (D3)

To prevent false streaks and inflated totals (critical given #599's progress dashboard), thresholds must be strictly conservative:

| Threshold Parameter | Value | Rationale & Defense |
|---|---|---|
| **Page Active Dwell ($T_{page}$)** | **`60 seconds`** | Standard Quranic reading pace averages 1.5–2.5 minutes per 15-line page (~130 words). 60s represents a conservative floor: fast readers or reviewers can achieve it, while rapid skimming or accidental stops do not qualify. |
| **Bounce Filter ($T_{bounce}$)** | **`5 seconds`** | Flipping rapidly through pages to find a reference (e.g. flipping past pages 20–25) must not accumulate dwell on traversed pages. Accumulated time on a page is discarded if total duration is $< 5\text{s}$. |
| **Single-Page Accumulation Cap ($T_{cap}$)** | **`15 minutes`** | Prevents runaway accumulation. |
| **Multi-Page Assignment Coverage** | **`100% of pages`** | For a multi-page assignment (e.g. 5 pages: 1–5), reading 3 minutes on page 2 must **never** complete the 5-page assignment. Every individual page in the assigned range must independently satisfy $T_{page} \ge 60\text{s}$ on the local date. |

### 2.2 Active Presence State Machine

```
              User lands on page (visiblePages includes P)
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │     PAGE MOUNTED      │
                     │      elapsed = 0      │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
       ┌─────────────►│    ACTIVE TICKING     │◄────────────┐
       │              │ (every 1s interval)   │             │
       │              └───────────┬───────────┘             │
       │                          │                         │
       │                          │ document.hidden         │ Tab gains focus
       │                          ▼                         │
       │              ┌───────────────────────┐             │
       └──────────────┤    PAUSED / FROZEN    ├─────────────┘
                      │ Accumulation stopped  │
                      └───────────────────────┘
```

#### Module Signature:
```ts
// app/lib/plans/dwell-detector.ts

export type PageDwellState = {
  /** Map of pageNumber -> accumulated active seconds */
  pageSeconds: Map<number, number>;
  /** True if tab is currently visible and has focus */
  isForeground: boolean;
};

export interface DwellCriterionInput {
  visiblePages: number[] | null;
  targetPages: number[];
  dwellState: PageDwellState;
  now: number;
}

export interface DwellCriterionResult {
  isMet: boolean;
  completedPages: number[];
  remainingPages: number[];
  progressFraction: number; // 0.0 to 1.0
}
```

#### Signals Monitored:
1. **Window / Tab Visibility:**
   - Listens to `document.addEventListener("visibilitychange", ...)` and `window.addEventListener("focus" / "blur", ...)`.
   - If `document.visibilityState !== "visible"` or `!document.hasFocus()`, the accumulator halts immediately.
   - Backgrounded tabs, minimized windows, and split-screen switches freeze accumulation with 0ms delay.
2. **Foreground Focus:**
   - While the tab is visible and focused, every second is accumulated.
3. **Overnight & Long-Idle Protection:**
   - Overnight false-positives are now a known and accepted trade-off (idle timeout was removed since it penalized silent reading). A focused, foregrounded tab will accumulate up to the 15-minute cap per page even if unattended.

### 2.3 Ephemeral Lifecycle & Boundary Transitions (D3)

Detection state is **strictly ephemeral**:
- **Storage:** In-memory `Map<number, number>` (`pageDwellMapRef.current` mapping `pageNumber -> accumulatedActiveSeconds`). Never written to `localStorage`, IndexedDB, or MySQL.
- **Page Turns:**
  - When the user turns pages (`visiblePages` changes), active accumulation on previous pages pauses.
  - Accumulated seconds on visited pages **remain in memory** for the duration of the reader session. For example: if a user reads page 2 for 40s, visits page 3, and returns to page 2, page 2 resumes at 40s and needs only 20s more to reach 60s.
  - This respects genuine human reading behavior (re-checking cross-references, pausing to reflect).
- **Session Navigation & Reload:**
  - Navigating off reader routes or reloading the browser discards the ephemeral map.
  - Per D3, detection state is never reconstructed as "proof" after the fact.
- **Midnight Boundary:**
  - At local midnight (00:00 local time), assignments rollover. The in-memory dwell map clears completely.

### 2.4 Reduced-Motion & Low-Power Handling
- Dwell accumulation relies on a 1-second interval or delta timestamps (`performance.now()`).
- In low-power mode or background throttling, browsers clamp timers to $\ge 1\text{s}$; delta-time math ensures accumulated active seconds remain mathematically accurate regardless of execution cadence.
- Under `prefers-reduced-motion: reduce`, all visual transitions of the resulting offer bypass spring animations and render instantly.

---

## 3. Playback Coverage Detection (Listening Modality)

For `activity: "listen"`, completion detection monitors audio playback through `RecitationContext`.

### 3.1 Listening Coverage Thresholds & Defense

| Parameter | Value | Rationale & Defense |
|---|---|---|
| **Coverage Fraction** | **`≥ 90%` of verses/duration** | Recitation audio has brief silent gaps at surah/verse boundaries and timing clamps. Requiring 100% exact duration causes false negatives due to browser timing rounding; 90% ensures genuine complete listening while strictly preventing skipped verses. |
| **Speed Factor Floor** | **`≥ 0.85 × (Duration / Speed)`** | Playback speeds from 0.75x to 2.0x are legitimate. Wall-clock listening time must equal at least 85% of the expected duration at the chosen speed, preventing artificially accelerated completion. |
| **Repetition Requirement** | **`100% of K passes`** | Tracks specifying repetitions (e.g. Husun tahdeer $\times 10$) require completing all $K$ full cycles. |

### 3.2 Seek & Skip Resilience
A simplistic detector checking `currentTime >= duration` or `recitedVerse === endVerse` would be trivially fooled by seeking directly to the end. The playback detector implements **verse-level interval tracking**:

```ts
// app/lib/plans/playback-detector.ts

export type VersePlaybackState = {
  /** Map of verseKey -> accumulated playback seconds */
  versePlaySeconds: Map<string, number>;
  /** Set of verse keys verified played >= 80% */
  verifiedVerses: Set<string>;
  /** Total cycles completed */
  completedCycles: number;
};
```

1. **Assigned Target Universe:**
   - When a listen assignment is active, its bounds are resolved:
     - Page-unit: verses spanning `rangeStart` to `rangeEnd` via `/api/quran/pages/[id]/bounds`.
     - Verse-unit: verse ordinals from `rangeStart` to `rangeEnd`.
   - The set of target verse keys is compiled: $V_{target} = \{v_1, v_2, \dots, v_n\}$.
2. **Verse Heard Verification:**
   - A verse $v_i$ is added to $V_{heard}$ only if playback played through $\ge 80\%$ of that specific verse's duration without an interrupting seek.
   - On `seeking` / `seeked` events: any skipped verses are omitted from $V_{heard}$.
3. **Completion Criterion:**
   - Criteria are fulfilled when $|V_{heard}| / |V_{target}| \ge 0.90$ AND all required range repetitions ($K$) have finished naturally via `RecitationContext`'s `handleChapterEnded` / `isStopVerse` halt.

---

## 4. The Offer (Smart Nudge — Option A, Default)

### 4.1 Visual Integration with #597's Dial (D5)

Per **D5**, the smart nudge must **not** introduce a competing banner, toast, or snackbar that fights the sacred text or #597's progress dial. Instead, **the offer lives inside #597's established dial surface**:

```
                                 DESKTOP / MOBILE READER CANVAS
                                 (Clean edge-to-edge mushaf text)

                                            ┌──────────────────────────────────────────────┐
                                            │                 OFFER STATE                  │
                                            │  ┌─────────────────────────┐  ┌───────────┐  │
                                            │  │ أتممت ورد القراءة اليوم؟ │  │   ( ✓ )   │  │
                                            │  │ [تأكيد]        [ليس الآن] │  │   ورد     │  │
                                            │  └─────────────────────────┘  └───────────┘  │
                                            │   Subtle Callout Pill          Dial (42px)   │
                                            └──────────────────────────────────────────────┘
                                                                       fixed bottom-24 end-4
```

1. **At-Rest State (Unfinished):**
   - The dial sits quietly at `fixed z-40 bottom-24 end-4` with segmented arcs and the `"wird"` / `"ورد"` label.
2. **Criterion Met (Offer State):**
   - The dial ring transitions to a soft emerald pulse (`hsl(var(--primary))`, 1.05 scale breathing animation).
   - An inline **callout pill** expands smoothly inward from the dial toward the screen center (`end-16` / `start-auto`).
   - The pill is fully opaque `hsl(var(--card))` with `border-border` and inset `--surface-rim` catch-light (identical surface tokens as the dial, ADR 0032).
   - **Pill Content:**
     - Title: `"أتممت ورد القراءة؟"` / `"Finished reading wird?"` (or listening equivalent).
     - Action button: `"تأكيد"` / `"Confirm"` (1-tap check-off, `bg-primary text-primary-foreground`, min 44px touch target).
     - Dismiss button: `"ليس الآن"` / `"Not now"` (subtle text button).
3. **Dial Tap Interaction in Offer State:**
   - Tapping `"تأكيد"` immediately executes the check-off.
   - Tapping the dial circular face opens the bottom sheet as before, where the assignment is highlighted with a prominent check button.

### 4.2 Dismissal Semantics & Suppression Rules
- **Tapping "Not now" (`ليس الآن`):**
  - The callout pill collapses smoothly into the dial (200ms ease-out).
  - The dial reverts to its normal unobtrusive state with center label.
  - **Cooldown:** The offer for that specific assignment is suppressed on the current page for **30 minutes**. (Shipped without the re-entry-after-≥5-minutes lift — full suppression is the more conservative choice.)
- **Multiple Assignments on Same Page:**
  - If a page carries both a reading assignment and a memorizing assignment, dismissing the offer for reading does **not** suppress an offer for memorizing when memorizing criteria are met. Each assignment's offer state is independently tracked by `planId:trackKey`.
- **Page Turn While Offer Visible:**
  - Navigating to another page immediately closes the callout pill without animation delay.

### 4.3 Copy & i18n Specification

All strings use exact translations, zero inline ternaries, and no placeholder replacement bugs:

| Key | Arabic (`messages/ar.json`) | English (`messages/en.json`) |
|---|---|---|
| `plans.detection.readingOfferTitle` | `"أتممت ورد القراءة اليوم؟"` | `"Finished today's reading?"` |
| `plans.detection.listeningOfferTitle` | `"أتممت ورد الاستماع اليوم؟"` | `"Finished today's recitation?"` |
| `plans.detection.memorizeOfferTitle` | `"أتممت ورد الحفظ اليوم؟"` | `"Finished today's memorization?"` |
| `plans.detection.reviewOfferTitle` | `"أتممت ورد المراجعة اليوم؟"` | `"Finished today's review?"` |
| `plans.detection.confirm` | `"تأكيد"` | `"Confirm"` |
| `plans.detection.dismiss` | `"ليس الآن"` | `"Not now"` |

*(Shipped copy: `تأكيد` / `Confirm` rather than the longer label above, and three activity-specific notice keys — `autoWriteNoticeReading`, `autoWriteNoticeListening`, `autoWriteNoticeGeneric` — rather than the single `autoWriteNotice` in §7.)*

---

## 5. Opt-In Auto-Write (Option B)

### 5.1 The Setting & Its Home in SettingsSidebar (D6)

Per **D6**, the auto-write toggle is housed in `app/components/SettingsSidebar.tsx`, positioned within the Reading or Device settings section directly beside `DailyWirdReminderSection.tsx` (#600 pattern):

- **Component:** `app/components/plans/AutoWriteSettingSection.tsx`.
- **UI Structure:**
  - Title: `"التأشير التلقائي للورد"` / `"Automatic Wird Completion"`.
  - Description: `"تسجيل إنجاز ورد القراءة أو الاستماع تلقائياً فور استيفاء وقت القراءة أو التلاوة دون طلب تأكيد."` / `"Automatically record reading or listening progress once dwell or playback criteria are met, without prompting."`.
  - Control: Radix `<Switch>` (default: `false` / OFF).
  - Auth Gating: Hidden or disabled when unauthenticated (`sessionStatus !== "authenticated"`).

### 5.2 Storage Strategy (D6 & Section 6 Analysis)

We evaluated storage approaches against project constraints:
1. **Server DB Column / Table (Rejected):** Adding a new table or column in `prisma/app/schema.prisma` requires migrations, API routes, and network waterfalls. Furqan has no generic user-settings table; only `ScheduledNotification` uses server storage because a cron runner needs it offline.
2. **Client `app/utils/storage.ts` (Selected):**
   - All other reader preferences (`theme`, `keepScreenAwake`, `desktopQuranFontSize`, `quranSafhaView`, `recitationSettings`) live in `app/utils/storage.ts` via typed `StorageKey`.
   - Adding `awradAutoWriteCompletion: boolean` to `StorageKey` provides instant synchronous reads, offline availability, zero database migrations, and zero API endpoints.
   - To prevent cross-account contamination on shared browsers, the setting is keyed as `awradAutoWrite:${userId}`.

### 5.3 Write Execution & Immediate Feedback (No Silent Surprises)

When Option B is ON and criteria are fulfilled:
1. **Direct Write:** The client immediately calls `useTodayAssignments.checkOff.mutate(...)`, sending `POST /api/plans/:planId/progress`.
2. **Visual Notification with Undo:**
   - The dial immediately triggers #597's completion flourish (arcs seal solid `--primary`, 1.05 scale pulse).
   - An auto-write pill surfaces beside the dial:
     - AR: `"تم تسجيل ورد القراءة تلقائياً"`
     - EN: `"Reading wird auto-recorded"`
     - Action: `"تراجع"` / `"Undo"` button (min 44px hit target).
    - **Aria-live announcement:** `"تم تسجيل ورد اليوم تلقائياً"` / `"Today's wird was automatically recorded"`.
    - **Durable reversal (supersedes the original 5-second grace period):** the entry stays visibly marked as automatic (an `auto-recorded` badge in `PlanAssignmentRow`) and reversible for the rest of the local day through the existing `DELETE /api/plans/<planId>/progress` with `{ track_key, date }` — no schema change. Tapping `"Undo"` (reader pill) or untoggling the row clears the marker and deletes the entry.
    - The reader acknowledgement pill still fades after 5 seconds, but reversal does not expire with it.

---

## 6. API / Data Architecture

### Architectural Decision: PREFER NOTHING (Zero Changes)
- **Database Schemas (`prisma/app/`, `prisma/quran/`):** **NO CHANGES.** No new columns, no new tables. Detection state is strictly ephemeral (D3 holds).
- **API Endpoints:** **NO NEW ROUTES.**
  - Check-off continues through `POST /api/plans/:planId/progress`.
  - Undo continues through `DELETE /api/plans/:planId/progress`.
  - Assignments continue to derive purely at read time via `app/lib/plans/engine.ts` (`deriveAssignments`).
- **Data Flow:**
  - `ReaderPageContext` + `RecitationContext` $\to$ `useDwellDetector` / `usePlaybackDetector` $\to$ Triggers Offer (Option A) or Auto-Write (Option B) $\to$ Existing React Query `checkOffTrack` mutation.

---

## 7. Internationalization (i18n)

All new strings in both locales. All counts use ICU plural objects with all six Arabic categories (`zero`, `one`, `two`, `few`, `many`, `other`). Numerals pre-formatted via `toLocaleNumeral`.

### `messages/ar.json`
```json
{
  "plans": {
    "detection": {
      "readingOfferTitle": "أتممت ورد القراءة اليوم؟",
      "listeningOfferTitle": "أتممت ورد الاستماع اليوم؟",
      "memorizeOfferTitle": "أتممت ورد الحفظ اليوم؟",
      "reviewOfferTitle": "أتممت ورد المراجعة اليوم؟",
      "confirm": "تأكيد",
      "dismiss": "ليس الآن",
      "autoWriteNoticeReading": "تم تسجيل ورد القراءة تلقائياً",
      "autoWriteNoticeListening": "تم تسجيل ورد الاستماع تلقائياً",
      "autoWriteNoticeGeneric": "تم تسجيل إنجاز الورد تلقائياً",
      "undo": "تراجع",
      "pagesRemaining": "{count, plural, zero {اكتملت جميع الصفحات} one {تبقى صفحة واحدة ({n})} two {تبقت صفحتان ({n})} few {تبقت {n} صفحات} many {تبقت {n} صفحة} other {تبقت {n} صفحة}}"
    },
    "settings": {
      "autoWriteTitle": "التأشير التلقائي للورد",
      "autoWriteDescription": "تسجيل إنجاز ورد القراءة أو الاستماع تلقائياً فور استيفاء وقت القراءة أو التلاوة دون طلب تأكيد"
    }
  }
}
```

### `messages/en.json`
```json
{
  "plans": {
    "detection": {
      "readingOfferTitle": "Finished today's reading?",
      "listeningOfferTitle": "Finished today's recitation?",
      "memorizeOfferTitle": "Finished today's memorization?",
      "reviewOfferTitle": "Finished today's review?",
      "confirm": "Confirm",
      "dismiss": "Not now",
      "autoWriteNoticeReading": "Reading wird auto-recorded",
      "autoWriteNoticeListening": "Listening wird auto-recorded",
      "autoWriteNoticeGeneric": "Wird completion automatically recorded",
      "undo": "Undo",
      "pagesRemaining": "{count, plural, =0 {All pages completed} one {1 page remaining} other {{count} pages remaining}}"
    },
    "settings": {
      "autoWriteTitle": "Automatic Wird Completion",
      "autoWriteDescription": "Automatically record reading or listening progress once dwell or playback criteria are met, without prompting"
    }
  }
}
```

---

## 8. Testing Strategy

### 8.1 Pure Unit Tests (Colocated `*.test.ts`, Vitest)
No mocks of React components or network; test the pure state machines.

1. **`app/lib/plans/dwell-detector.test.ts`:**
   - **Threshold Boundary:** Dwell of 59s returns `met: false`; dwell of 60s returns `met: true`.
   - **Bounce Rejection:** Visits of 3s across pages 1, 2, 3 accumulate 0s; page visits $< 5\text{s}$ are purged.
   - ~~**Idle Timeout:** 40s active + 60s idle accumulates exactly 40s, not 100s.~~ Removed — see §11 Revision History (2026-09-13): the idle timeout no longer exists, this test was deleted.
   - **Backgrounded Tab:** When `document.visibilityState === "hidden"`, ticking advances 0s.
   - **Multi-Page Assignment:** 5-page assignment requires all 5 pages to have $\ge 60\text{s}$; 4 pages at 60s + 1 page at 0s returns `met: false`.
   - ~~**Overnight Simulation:** 8 hours with zero interaction accumulates at most 45s (stops before 60s threshold).~~ Removed — see §11 Revision History (2026-09-13): an unattended foregrounded+focused tab is now an accepted trade-off, this test was deleted.

2. **`app/lib/plans/playback-detector.test.ts`:**
   - **Coverage Fraction:** 89% verses heard returns `met: false`; 90% returns `met: true`.
   - **Seek / Skip Rejection:** Skipping from verse 1 to verse 20 records only 2 verses heard; coverage remains $< 10\%$.
   - **Speed Scaling:** 2.0x playback requires wall-clock time $\ge 0.85 \times (\text{duration} / 2.0)$.
   - **Repetition Cycles:** Track with $K=3$ repeats returns `met: false` after 2 passes, `met: true` only after pass 3 finishes.

### 8.2 End-to-End Specification (`e2e/tests/awrad-smart-completion.spec.ts`)
- Target strictly by `data-testid`, **never** localized text or `aria-label` substrings.
- **Unconditional assertions only** (no `if (await x.isVisible())`).
- Deterministic seeding via `createTestPlan` and `clearUserPlans` (`e2e/helpers/auth.ts`).

```ts
test("Option A: smart nudge appears on meeting dwell threshold and checks off in 1 tap", async ({ page }) => {
  await clearUserPlans(userId);
  await createTestPlan(userId, "daily-wird", { quantities: { reading: 1 } });
  // Single-page seed is load-bearing: under the 100% per-page coverage rule a
  // single-page dwell can never complete a multi-page assignment, so the spec
  // must not seed one and expect an offer on the first page.

  await page.goto("/ar/pages/1");
  await expect(page.getByTestId("plans-widget-trigger")).toBeVisible();

  // Fast-forward simulated active dwell
  await page.evaluate(() => window.__advanceDwellTimeForTesting(61));

  // Smart nudge offer pill must appear unconditionally
  const offerPill = page.getByTestId("smart-completion-offer");
  await expect(offerPill).toBeVisible();
  await expect(page.getByTestId("smart-completion-confirm")).toBeVisible();

  // 1-tap confirm
  await page.getByTestId("smart-completion-confirm").click();

  // Completion flourish plays, then widget unmounts
  await expect(page.getByTestId("plans-widget-trigger")).not.toBeVisible({ timeout: 3000 });

  // Verify progress logged via API
  const res = await page.request.get(`/api/plans/${testPlanId}/progress`);
  const json = await res.json();
  expect(json.data.length).toBe(1);
  expect(json.data[0].range_start).toBe("1");
});
```

---

## 9. Decisions Record Amendments

### Proposed Replacement Wording for `docs/architecture/decisions/plans.md:19`
*(Note: Do NOT edit `docs/architecture/decisions/plans.md` in this plan phase; this is recorded for retrospect time).*

> **Current wording:**
> `- Completion is manual per-track check-off; reader/playback-aware shortcuts may *offer* check-off but must never auto-write it.`
>
> **Proposed replacement wording:**
> `- Completion is manual per-track check-off by default; reader/playback-aware shortcuts may *offer* check-off (Option A), but must never silently auto-write progress unless the user has explicitly enabled automatic completion in settings (Option B, default off). The setting must clearly disclose that fulfilling dwell or playback criteria will automatically record a progress entry on their behalf without a confirmation prompt.`

### Additional Bullet to Record under Awrad Invariants:
> `- Smart completion detection (2026-09-11, #598): Dwell detection requires ≥60s active presence per assigned page with a 45s idle timeout; playback detection requires ≥90% range coverage at verified speed. Detection state is strictly ephemeral in client memory and never persisted as a database table or column. Option B auto-write provides an immediate visual completion flourish, an aria-live announcement, and a durable all-local-day reversal (auto-recorded badge + existing DELETE progress path), not a 5-second undo grace period.`
>
> **Superseded (2026-09-13, see §11 Revision History):** the "45s idle timeout" clause above is no longer accurate — the idle timeout was removed. `decisions/plans.md` carries the current wording; don't copy the quote above into it verbatim.

---

## 10. Risks & Open Questions

### 10.1 The Single Biggest False-Positive Risk
The **"Distracted Reading Desk"**:
- A user enables "Keep screen awake" in settings and leaves Furqan open on page 1 on their desk while eating, taking a call, or working on another monitor.
- Because the idle timeout was removed, the 60-second active dwell threshold is reached, triggering completion on a page the user never actually read.
- **Mitigation:**
  - This is an accepted trade-off. Normal silent reading was being penalized by the idle timeout. We accept that a foregrounded and focused tab left unattended will accumulate completion time.
  - Option A (default) completely prevents false writes: the offer displays quietly, and if unconfirmed, expires harmlessly without altering progress logs or streaks.
  - Option B (auto-write) warns the user explicitly before activation, marks the entry as automatic, and keeps it reversible for the rest of the local day (no expiring undo window).

### 10.2 Out of Scope / Undeliverable Items
- **Cross-session / Closed-tab reconstruction:** If a user closes the browser tab before a page reaches the 60s threshold, that partial time is discarded. Software cannot reconstruct unpersisted reading time without heavy tracking infrastructure, which Furqan's privacy-first architecture explicitly forbids.
- **Physical Eye Gaze Tracking:** True gaze tracking is impossible without webcam access, which Furqan will never employ. Foreground + focus remains the sole privacy-preserving presence heuristic (interaction proxies were removed — see Revision History).

## 11. Revision History
- **2026-09-13**: Interaction-based idle timeout removed by product decision — normal silent reading was being penalized (idle window had to be shorter than the 60s completion threshold to be effective at all, which meant any real quiet reading session tripped it); accepted trade-off is that a foregrounded+focused-but-unattended tab can now complete a wird after 60s.
