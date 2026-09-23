---
title: "Awrad Reader UX: Refine PlansWidget into an unobtrusive, page-scoped check-off shortcut"
type: feature
date: 2026-09-10
status: implemented
area: awrad
issue: 597
---

# Awrad Reader UX: Refine PlansWidget into an unobtrusive, page-scoped check-off shortcut

> Visual mockup: [`597-reader-wird-checkoff.mockup.html`](597-reader-wird-checkoff.mockup.html)

## 1. Problem & Context

Today, `app/components/plans/PlansWidget.tsx` renders an always-mounted floating action pill over the Mushaf reader canvas:
```tsx
// app/components/plans/PlansWidget.tsx:97
className={cn(
  "fixed z-40 bottom-20 end-4 size-[50px]",
  isOverlayMode && "transition-transform duration-300",
  isOverlayMode && !overlayVisible && "translate-y-24 opacity-0 pointer-events-none",
)}
```
The current widget is a 50px circle with an SVG circular progress ring, a solid `bg-primary` inner disc displaying the user's total pending assignment count for the day as a raw number (`toLocaleNumeral`), an "in range" box-shadow glow (`shadow-[0_0_0_4px_hsl(var(--primary)/0.25)]`), and a tap handler opening a bottom `Sheet` that lists every active plan's assignments for today via `PlanAssignmentRow`.

While `PlansWidget` already mirrors the nav overlay show/hide (`useNavOverlay`) and hides when chrome is dismissed on mobile/tablet, three fundamental design problems remain:
1. **It is visually heavy and competitive:** A 50px solid-color filled disc carrying a numeric badge and shadow glow pulls the eye constantly away from the sacred text. As codified in [`docs/design/design-principles.md`](../design/design-principles.md:15):
   > *"The page is the thing; chrome is the room around it. When the two compete, the room loses."*
   Furthermore, `docs/design/design-principles.md:61` dictates: *"Never add a drop shadow to a dark surface expecting lift — including floating dark chrome..."* The widget's box-shadow glow highlight looks uncalibrated on dark and gold backgrounds.
2. **It mounts on pages completely unrelated to any wird:** Even if the user's daily assignment is Surah Al-Baqarah (pages 2–49), opening Surah Al-Kahf (page 293) still displays the floating pill and badge.
3. **It remains visible when there is nothing left to do:** Once all assignments are checked off, the widget lingers as an inert floating object showing "0" (or 100% complete) over the reading surface.
4. **Architectural spillover:** `app/components/offline/OfflineInstallPrompt.tsx:23-26` had to explicitly anchor at `bottom-24 start-4` to dodge `PlansWidget`'s permanent footprint at `bottom-20 end-4`.

### The Decision: Refine in place, do not relocate
Relocating the control to the top navbar, a second nav row, or the safha header was evaluated and **rejected** (see Section 3). The widget already handles touch dismissals, overlay synchronization, and floating clearance. The solution is to **refine `PlansWidget.tsx` in place**:
- Mount **only** on pages where an uncompleted today-assignment is active (or while sheet is open / flourish is running).
- Auto-hide completely once page-relevant assignments are completed (after sheet close and a brief completion flourish).
- Redesign the indicator from a heavy solid numeric disc into a delicate, segmented progress dial with a quiet centered label ("wird" / "ورد").
- Scope the bottom sheet strictly to page-relevant assignments, leaving `/plans` as the sole all-day overview surface.

---

## 2. Goal / Done State

The reader widget transitions from an omnipresent daily-summary pill into a lightweight, ephemeral **"you are reading here, tick it"** shortcut:

### Mobile / Compact (`<1024px`, single page, full-bleed)
- **On pages outside today's wird (or when all relevant assignments are completed):** The widget returns `null`. The canvas has zero floating objects. Pure edge-to-edge mushaf.
- **On pages overlapping an uncompleted wird:** A quiet, opaque circular ring (42px outer size, 44×44px touch target) appears at `bottom-24 end-4`. It carries a 3px segmented ring showing progress for the current page only, with a quiet ~7.5px centered label ("wird" / "ورد"). Tapping the widget always opens the bottom `Sheet`.
- **On checking off the last page-relevant assignment:** If sheet is open, widget stays mounted in background; upon closing the sheet (or immediately if already closed), a brief, elegant completion flourish plays (ring segments seal solid + gentle ~1.05 scale pulse for ~1.2s; label remains visible), then smoothly fades out (300ms) and unmounts.
- **Immersion Mode:** Tapping the page hides the widget in lockstep with the nav and `RecitationPlayerBar` (`translateY` exit).

### Tablet (`1024px–1366px`, double-page spread, full-bleed)
- Same page-relevance gating and ephemeral lifecycle as mobile.
- Ring accounts for both facing pages in the visible pair (`visiblePages = [rightPage, leftPage]`).
- Tapping opens the bottom `Sheet` scoped to the current spread's assignments, clearing the bottom `RecitationPlayerBar` without covering the text.

### Desktop Desk (`≥1367px` and `≥800px`, double-page spread on reading desk)
- On pages outside active wird ranges, the reading desk and outer margins remain 100% clean and empty.
- When an uncompleted wird overlaps the spread, the refined widget rests quietly at `bottom-24 end-4` over the desk margin, well clear of the vertical recitation rail (`fq-recitation-bar-rail` pinned to screen-right, 96px wide).
- Zero layout shift (CLS = 0) on page turns.

---

## 3. Placement: Rejected Alternatives

Before deciding to refine `PlansWidget` in place, alternative locations were thoroughly evaluated and rejected:

| Candidate Placement | Evaluation & Core Reason for Rejection |
|---|---|
| **Nav-Bar Affordance (`Nav.tsx`)** | **Rejected:** Navbar space is tightly constrained on mobile (<375px screens in Arabic with Surah title + logo + settings + account); adds competing icons to the top chrome; divorces the wird action from reading flow. |
| **Second Nav Row (`RecitationReturnStrip` style)** | **Rejected:** Consumes 44px of vertical reading height across mobile; conditional mounting on page turn causes jarring layout shifts (CLS) on the desktop reading desk; complex stacking collisions with recitation return strip. |
| **Safha Header Inline Glyph (`ViewingChip` style)** | **Rejected:** Violates the mandatory `≥44×44px` touch target rule within a 16–20px header; competes with `ViewingChip` on shared-mushaf grant routes; creates tap dead-zones that interfere with swipe gestures. |
| **Settings / Navigation Sidebar** | **Rejected:** Hiding the daily wird shortcut behind a multi-step drawer defeats its purpose as a quick reader tick-off affordance. |
| **Recitation Player Bar** | **Rejected:** Mixing plan progress into the audio recitation bar violates separation of concerns; the bottom bar transforms into a vertical rail on desktop (`≥1367px`), which would orphan or distort the check-off UI. |

**Conclusion:** The floating position at `bottom-24 end-4` is ergonomically sound, leaves generous 20px clearance above the 76px player bar, and already synchronizes with the nav overlay. Refining its mount predicate, visual weight, and lifecycle resolves all design violations without introducing architectural regressions.

---

## 4. Progress Indicator Redesign

The widget's visual presentation is completely overhauled to align with `docs/design/design-principles.md`:

```
           CURRENT (Rejected)                            REFINED (New)
        ┌───────────────────────┐                  ┌───────────────────────┐
        │   50px solid disc     │                  │  42px progress dial   │
        │   Heavy SVG ring      │                  │  Segmented arcs (1-4) │
        │   Numeric count ("2") │   ─────────►     │  Opaque card face     │
        │   Box-shadow glow     │                  │  Center text ("wird") │
        │   Always present      │                  │  Ephemeral / in-range │
        └───────────────────────┘                  └───────────────────────┘
```

### Visual Specifications
1. **Dimensions & Hit Target:**
   - Outer visual diameter: `42px` (`size-[42px]`), with an interactive hit target of `44×44px` (`size-11` container).
   - Base position: `fixed z-40 bottom-24 end-4` (96px baseline, providing 20px clearance above the 76px player bar).
2. **Surface & Depth:**
   - Drop the solid `bg-primary` disc.
   - **Strict Surface Rule:** FULLY OPAQUE `hsl(var(--card))` in all three themes (`bg-card`). **NO translucent glass, NO `backdrop-filter` / `backdrop-blur` anywhere.**
     - Applied universally across all three themes: fully opaque `bg-card` + `border border-border` + a universal inset `--surface-rim` catch-light (`shadow-[inset_0_1px_0_hsl(var(--surface-rim)/var(--surface-rim-alpha))]`, consistent with `.fq-chrome-bar`).
     - On **Light & Gold**, `--surface-rim` is near-white so it is essentially invisible, letting the 1px border define the edge.
     - On **Dark**, `--surface-rim` resolves to a warm catch-light (`hsl(39 44% 58%)` at `--surface-rim-alpha` `0.32`) along the top edge, carrying depth from a measured brightness step with zero drop shadows (ADR 0032 / `docs/design/design-principles.md:61`).
   - Drop the box-shadow glow (`shadow-[0_0_0_4px_...]` removed): The widget's appearance on screen is itself the signal that the user is in their wird range.
3. **Centre Label (~7.5px):**
   - In the center of the dial sits a quiet, localized text label: `"wird"` in English, `"ورد"` in Arabic (`t("plans.widget.dialLabel")`).
   - Rendered as an SVG `<text>` element with ~7.5px font size (`fontSize="7.5"`), `fontWeight="500"`, `letterSpacing="-0.02em"`, `fill="hsl(var(--muted-foreground))"`, and `aria-hidden="true"` (the button trigger already has a descriptive accessible label).
   - Stays calm, legible, and constant across all states (pending, partially done, flourishing).
4. **Segmented Progress Ring:**
   - Total radius: $R = 17\text{px}$, stroke width: $3\text{px}$ (viewBox `0 0 40 40`).
   - Let $N$ be the number of **page-relevant** assignments for today ($1 \le N \le 4$, typically 1 to 2):
     - **For $N = 1$:** A continuous circle. At rest, an unfilled primary track (`hsl(var(--primary) / 0.6)`). When completed, animates to a solid `--primary` stroke (`strokeDashoffset: 0`).
     - **For $2 \le N \le 4$:** A **segmented ring** divided into $N$ equal arcs separated by small visual gaps ($8^\circ$ to $12^\circ$ gap per seam, or $\approx 2.5\text{px}$ arc gap).
       - Each arc represents one specific relevant assignment.
       - As each assignment is checked off, its corresponding arc transitions from the at-rest track (`hsl(var(--primary) / 0.6)`) to solid `--primary`.
       - Instantly communicates "1 of 2 done" or "2 of 3 done" at a glance without displaying any numbers.
     - **For $N > 4$ (edge case):** Reverts to a smooth proportional arc (`strokeDashoffset = CIRCUMFERENCE * (1 - doneFraction)`).
5. **RTL Parity & Arc Direction:**
   - Arcs start at 12 o'clock (`-90deg`) and fill **CLOCKWISE** in BOTH `/en` (LTR) and `/ar` (RTL).
   - Circular progress is a universal cross-directional convention; mirroring progress arcs counter-clockwise in RTL reads as visually broken rather than localized.
6. **Interaction:**
   - Tapping the widget **always** opens the bottom `Sheet`, regardless of $N$. There is no direct tap-to-toggle path, keeping the interaction model 100% predictable.
7. **Theme Calibrations:**
   - **Light & Gold:** Opaque card face with 1px border; filled segments use vibrant emerald `--primary`; at-rest tracks use `hsl(var(--primary) / 0.6)`.
   - **Dark:** Opaque card face (`bg-card`) with warm rim; zero drop shadows; at-rest primary tracks (`hsl(var(--primary) / 0.6)`).

---

## 5. Mount / Unmount Lifecycle & Flourish

### The Mount Predicate
`PlansWidget` renders **only** when all of the following evaluate to `true`:
1. `isSelfReaderRoute`: `useIsReaderRoute()` is true AND `!pathname.includes("/mushaf/")` (ADR 0012).
2. `isSignedIn`: `sessionStatus === "authenticated"`.
3. `hasReaderPage`: `visiblePages !== null` (excludes `/pages/vertical` where no pager exists).
4. `hasRelevantAssignments`: At least one active today-assignment overlaps the current reader position (`totalCount > 0`).
5. `hasPendingOrActiveSheet`: At least one page-relevant assignment is uncompleted (`pendingCount > 0`), **OR** the bottom `Sheet` is open (`sheetOpen === true`), **OR** completion flourish is pending / executing (`completionPendingRef.current` or `flourishState !== "idle"`).

If any condition fails, `PlansWidget` returns `null`.

### Lifecycle State Transitions
```
                User lands on in-range page
                           │
                           ▼
                    ┌─────────────┐
                    │   MOUNTED   │◄──────── Check-off undone (via query invalidation)
                    └──────┬──────┘
                           │ All page-relevant assignments
                           │ checked off (pendingCount -> 0)
                           │
              ┌────────────┴────────────┐
              │                         │
     Sheet is OPEN              Sheet is CLOSED
              │                         │
              ▼                         │
   ┌───────────────────────┐            │
   │  STAY MOUNTED (QUIET) │            │
   │  completionPending    │            │
   └──────────┬────────────┘            │
              │ User closes             │
              │ sheet                   │
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │ FLOURISHING │◄──────────┤ FLOURISHING │  Ring seals solid + pulses (~1.05 scale)
       │  (~1200ms)  │           │  (~1200ms)  │  Center label ("wird"/"ورد") remains visible
       └──────┬──────┘           └──────┬──────┘
              │ Timer expires           │
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │  FADE-OUT   │           │  FADE-OUT   │  opacity-0 scale-95 (300ms)
       └──────┬──────┘           └──────┬──────┘
              │                         │
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │  UNMOUNTED  │           │  UNMOUNTED  │  Returns null
       └──────┬──────┘           └──────┬──────┘
```

1. **Entrance:**
   - When mounting as the user navigates into an uncompleted wird range, the widget fades and scales in gently (`opacity-0 scale-90` $\to$ `opacity-100 scale-100` in 200ms).
2. **Page Navigation (Page Turn):**
   - As the user turns pages (`visiblePages` updates), `pageRelevantAssignments` re-evaluates synchronously.
   - If the new page has **no** uncompleted assignments, the widget unmounts immediately (no flourish, since the user simply navigated away; any pending completion is canceled).
3. **No Sheet Auto-Close:**
   - The widget **never** auto-closes the sheet on completion. The sheet is an explicit user-opened surface and stays open until dismissed by the user.
4. **Completion Flourish Deferral:**
   - If all page-relevant assignments are checked off while the sheet is **open**:
     - The widget stays mounted in the background without flourishing (`completionPendingRef.current = true`).
     - When the user closes the sheet (`sheetOpen` becomes `false`), the completion flourish triggers immediately.
   - If all page-relevant assignments are completed while the sheet is **closed** (e.g. via an external action), the flourish plays immediately.
   - **Flourish animation:**
     - The segmented ring fills completely to 100% solid `--primary`.
     - The entire ring executes a gentle pulse / scale (~1.05 scale). The center label remains visible.
     - A screen-reader announcement is dispatched via aria-live: `t("plans.widget.completed", "Today's wird on this page is done")`.
     - After **1200ms**, the widget fades out (`opacity-0 scale-95`, 300ms) and unmounts.
5. **Undo / Re-evaluation:**
   - If the check-off is undone (e.g. from the Sheet or hub), `pendingCount` becomes $> 0$, `completionPendingRef` is cleared, flourish is canceled, and the widget resets to idle.
6. **Reduced Motion (`prefers-reduced-motion: reduce`):**
   - Transitions collapse to 0ms; the flourish timer is skipped or reduced to a brief 100ms/200ms static check before unmounting.

---

## 6. "Relevant to this Page" Derivation

The definition of "page-relevant" is derived via a pure helper function extracted to `app/lib/plans/assignment-range.ts`:

```ts
export type PageRelevantResult = {
  relevant: Array<{ plan: UserPlanWithAssignments; assignment: TrackAssignment }>;
  pendingCount: number;
  totalCount: number;
  doneFraction: number;
};

export const getPageRelevantAssignments = (
  todayPlans: UserPlanWithAssignments[] | undefined,
  visiblePages: number[] | null,
  recitedPage: number | null,
  isPlaybackActive: boolean,
  verseIndex?: PlanVerseIndex,
): PageRelevantResult => {
  if (!todayPlans || todayPlans.length === 0) {
    return { relevant: [], pendingCount: 0, totalCount: 0, doneFraction: 0 };
  }

  const relevant = todayPlans.flatMap((plan) =>
    plan.assignments
      .filter((assignment) =>
        inRange(assignment, visiblePages, recitedPage, isPlaybackActive, verseIndex)
      )
      .map((assignment) => ({ plan, assignment }))
  );

  const totalCount = relevant.length;
  const pendingCount = relevant.filter((r) => !r.assignment.completed).length;
  const doneFraction = totalCount > 0 ? (totalCount - pendingCount) / totalCount : 0;

  return { relevant, pendingCount, totalCount, doneFraction };
};
```

### Derivation Details:
- **`read` / `memorize` / `review` tracks:** Checked against `visiblePages` (e.g., `[15]` on mobile single-page; `[14, 15]` on desktop spread).
  - Page-unit: Direct inclusion `p >= rangeStart && p <= rangeEnd`.
  - Verse-unit: Verse span lookup via `verseIndex.pageVerseSpan(p)`.
- **`listen` tracks:** When recitation playback is active (`status !== "idle"`) and `recitedPage != null`, checked against `recitedPage`. Otherwise falls back to `visiblePages`.
- **Special Routes & Guards:**
  - `/pages/vertical`: `ReaderPager` is not mounted, so `useReaderPage().visiblePages` returns `null`. `relevant` is empty $\to$ widget returns `null`.
  - `/mushaf/[grant]/pages/[id]`: Pathname includes `/mushaf/` $\to$ widget returns `null` (ADR 0012).

---

## 7. Bottom Sheet Scoping

Tapping the widget opens the existing bottom `Sheet` (`components/ui/sheet.tsx`), but its contents are now strictly scoped:

1. **Only Page-Relevant Assignments:**
   - The sheet displays **strictly** the assignments overlapping the current page. There is no "rest of today" overflow section in the sheet.
   - Example: If the user has an active Daily Reading wird (pages 10–15) and a Hifz wird (Surah Al-Mulk, page 562):
     - On page 12, the sheet shows *only* the Daily Reading track.
     - It does *not* show Al-Mulk.
2. **Reusing `PlanAssignmentRow`:**
   - Each row is rendered using the existing `PlanAssignmentRow.tsx` component without forking.
   - Retains all capabilities: jump-to-page links, custom wird names (#610), inline listening audio override buttons (`planPlaybackSessionId`), and check-off / uncheck-off mutations.
3. **Hub Link Footer:**
   - At the bottom of the sheet, a quiet link is rendered:
     ```tsx
     <Link href="/plans" className="text-xs text-muted-foreground hover:text-primary transition-colors text-center block pt-2">
       {t("plans.widget.viewAllPlans", "View all today's plans in Hub →")}
     </Link>
     ```
   - Reinforces the architectural separation: the reader widget is for quick in-context check-off; the `/plans` hub is the comprehensive planner.
4. **Offline Guard:**
   - Retains `useOnlineStatus()`. When offline, check-off buttons are disabled with the notice: `t("plans.offlineNotice", "Connect to the internet to check off progress")`.

---

## 8. File-Change List

The implementation is contained within existing files plus pure helper extraction:

### 1. `app/components/plans/PlansWidget.tsx` [MODIFY]
- Implement page-relevance mount gating (`getPageRelevantAssignments`).
- Replace the 50px solid disc with a 42px progress dial carrying a quiet ~7.5px centered text label ("wird" / "ورد", `aria-hidden="true"`).
- Stroke width: 3px; at-rest track: `hsl(var(--primary) / 0.6)`.
- Anchor updated to `bottom-24 end-4`.
- Surface updated to fully opaque `hsl(var(--card))` with `border border-border` and universal inset `--surface-rim` catch-light, zero drop shadows.
- Arcs fill clockwise from 12 o'clock in both LTR and RTL.
- Eliminate sheet auto-close on completion. Widget stays mounted while sheet is open.
- Defer completion flourish until the sheet is closed (or trigger immediately if sheet was closed). Flourish seals arcs to solid primary with a ~1.05 scale pulse for 1200ms, then fades out in 300ms.
- Use `useIsomorphicLayoutEffect` for lifecycle transitions to eliminate 1-frame paint flash.
- Close sheet quietly on page navigation away so it does not spontaneously reopen on returning.
- Scope the `SheetContent` list to page-relevant assignments only, adding the link to `/plans`.
- Drop the box-shadow glow styling.

### 2. `app/lib/plans/assignment-range.ts` [MODIFY]
- Extract and export `getPageRelevantAssignments` and `isAssignmentInRange` logic for shared, pure computation.

### 3. `app/lib/plans/assignment-range.test.ts` [NEW]
- Colocated unit tests for `getPageRelevantAssignments` and `isAssignmentInRange` covering page-unit, verse-unit, listen playback, and multi-track scenarios.

### 4. `app/components/offline/OfflineInstallPrompt.tsx` [MODIFY]
- Lines 23–26: Update the comment explaining that `PlansWidget` is now ephemeral and page-gated rather than an always-present corner obstacle. Both fixtures share the `bottom-24` vertical baseline on opposing sides (`start-4` vs `end-4`), with collisions eliminated.

### 5. `messages/en.json` & `messages/ar.json` [MODIFY]
- Revise `plans.widget.*` keys:
  - `plans.widget.open`: "Check off today's wird" / "أشّر ورد اليوم"
  - `plans.widget.completed`: "Today's wird on this page is done" / "تم إنجاز ورد اليوم في هذه الصفحة"
  - `plans.widget.viewAllPlans`: "View all today's plans in Hub →" / "عرض كل خطط اليوم في المركز ←"
  - `plans.widget.dialLabel`: "wird" / "ورد"
  - Update `plans.widget.description` to reflect page scoping.

### 6. `e2e/tests/shared-mushaf.spec.ts` [MODIFY]
- Line 130: Update selector `button[aria-label*="خطط"]` to match the revised aria-label (e.g. `button[aria-label*="ورد"]` in Arabic or `[data-testid="plans-widget-trigger"]`), ensuring the test continues to assert the widget is hidden on grant routes.

### 7. `docs/architecture/decisions/plans.md` [MODIFY]
- Add an entry under `## Awrad & Learning Plans Engine` documenting:
  - Widget is page-relevance-gated (uncompleted assignments overlapping reader position only).
  - Sheet stays open on completion (no auto-close).
  - Flourish is deferred until sheet is closed.
  - Ring displays 3px segmented arcs with a quiet ~7.5px centered label ("wird" / "ورد").
  - Sheet is scoped to page-relevant tracks; `/plans` hub is the all-day overview surface.

---

## 9. i18n Keys

In compliance with `docs/standards/i18n.md`:
- All strings loaded via direct `useTranslations` from `next-intl` where interpolation is needed.
- Numerals formatted via `toLocaleNumeral`.

### Key Definitions:

#### English (`messages/en.json` under `"plans"."widget"`):
```json
{
  "plans": {
    "widget": {
      "open": "Check off today's wird",
      "title": "Today's wird",
      "description": "Assignments for the page you are reading.",
      "completed": "Today's wird on this page is done",
      "viewAllPlans": "View all today's plans in Hub →",
      "dialLabel": "wird"
    }
  }
}
```

#### Arabic (`messages/ar.json` under `"plans"."widget"`):
```json
{
  "plans": {
    "widget": {
      "open": "أشّر ورد اليوم",
      "title": "ورد اليوم",
      "description": "المهام الخاصة بالصفحة الحالية.",
      "completed": "تم إنجاز ورد اليوم في هذه الصفحة",
      "viewAllPlans": "عرض كل خطط اليوم في المركز ←",
      "dialLabel": "ورد"
    }
  }
}
```

---

## 10. Testing & Verification

### Automated Unit Tests (`vitest`)
Run `npx vitest run app/lib/plans/assignment-range.test.ts`:
1. `getPageRelevantAssignments` with single page-unit track: returns relevant when page in range, empty when outside.
2. `getPageRelevantAssignments` with verse-unit track: returns relevant when page overlaps verse span.
3. `getPageRelevantAssignments` with active listening track: uses `recitedPage` when playing.
4. Segment count and `pendingCount` derivations for multi-track plans.
5. All assignments completed: returns `pendingCount === 0`, `doneFraction === 1`.

### Manual Browser Verification Matrix
Test across both locales (`ar` RTL, `en` LTR), all 3 themes (Light, Gold, Dark), and mobile/tablet/desktop:

| Test Case | Viewport & Route | Condition | Expected Result |
|---|---|---|---|
| **1. Out-of-Range Page** | Mobile `390px`, Page 100 | User's wird covers Pages 1–5 | `PlansWidget` is completely absent from DOM (`null`). Canvas is clean. |
| **2. In-Range Page** | Mobile `390px`, Page 3 | User's wird covers Pages 1–5 (uncompleted) | Widget mounts at `bottom-24 end-4`. Opaque card background, 3px segmented ring, centered label ("wird"/"ورد"). |
| **3. Multi-Track Segmentation** | Desktop `1440px`, Page 20 | 2 active tracks cover Page 20 | Widget displays exactly 2 ring segments with subtle gap. |
| **4. Check-Off in Sheet & Deferred Flourish** | Mobile `390px`, Page 3 | User checks off last track inside open sheet | Sheet stays open; widget remains mounted in background; on closing sheet, ring seals solid and executes gentle pulse (~1.05 scale, center label visible); after 1.2s, fades out and unmounts. |
| **5. Overlay Sync** | Mobile `390px`, In-range page | User taps Quran page | Widget translates away with nav overlay (`translate-y-24 opacity-0`). Tapping reveals it. |
| **6. Shared Mushaf Gate** | Desktop `/ar/mushaf/[grant]/pages/1` | In-range page for user | Widget is completely absent on grant route (ADR 0012). |
| **7. Desktop Rail Clearance** | Desktop `≥1367×800px`, In-range | Recitation rail active | Widget sits cleanly at `bottom-24 end-4` over desk margin without colliding with 96px right rail. |
| **8. Offline State** | Any, In-range page | Network disconnected | Tapping opens sheet; offline notice displays; check-off disabled. |

---

## 11. Out of Scope

- **Automatic check-off / Smart position detection (#599):** The widget strictly *offers* check-off; it never automatically writes progress on scroll or audio end (D5 invariant).
- **Plan Engine & Storage:** No changes to `app/lib/plans/engine.ts`, Prisma schemas, or DB migrations.
- **Plans Hub Page (`/[locale]/plans`):** `PlansTodayHero` and `MyPlansList` remain the comprehensive daily view.
- **Grant Reader Integration:** Shared mushaf readers remain excluded (ADR 0012).

---

## 12. Risks & Open Questions for the Human

### Decisions Locked:
- **Centre Label:** Quiet ~7.5px text label (`"wird"` / `"ورد"`, `fontSize="7.5"`, `fontWeight="500"`, `aria-hidden="true"`, `fill="hsl(var(--muted-foreground))"`) visible across all states.
- **Stroke & Track:** 3px stroke width, `hsl(var(--primary) / 0.6)` at-rest track color, solid `--primary` completed.
- **Sheet Lifetime:** Sheet never auto-closes; widget stays mounted while sheet is open.
- **Flourish Timing:** Flourish deferred until sheet is closed.
- **Sheet Scope:** Strictly page-relevant assignments + quiet `/plans` hub link. No "rest of today" overflow section.
- **Arc Direction:** Fills clockwise from 12 o'clock in both LTR and RTL.
- **Surface & Depth:** Fully opaque `hsl(var(--card))` with `border border-border` and universal inset `--surface-rim` catch-light in all themes (visible on dark, no glass, no drop shadows).
- **Direct Check-off:** Rejected. Tapping the widget always opens the bottom Sheet.
- **Base Anchor:** Pinned at `bottom-24 end-4` (96px baseline).

### Remaining Open Question:
1. **Confirm `bottom-24` clearance against the mockup on a 390px viewport.**
   - With `bottom-24` (96px from bottom), the widget has 20px clearance above the 76px bottom `RecitationPlayerBar`.
   - The visual mockup demonstrates this scale in State 1. Confirm whether 20px clearance feels comfortable on mobile.
