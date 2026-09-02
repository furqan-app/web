---
title: Daily Awrad UI
type: feature
date: 2026-07-27
status: implemented
area: awrad
---

# Daily Awrad UI

## Summary

The plan-engine foundation (#140, PR #139, `docs/plans/awrad-learning-plans.md`, ADR 0030) shipped storage, the derivation engine, protected API routes, and the client hooks (`usePlans`, `useTodayAssignments`) — but only one template (`daily-wird`) and no UI. This task ships the UI surfaces deferred by that plan — a plans hub page and a reader widget — plus two more templates: `listening-wird` (a simple listening khatma) and `husun` (الحصون الخمسة, the forcing case for all five rule kinds).

**Supersedes** the foundation plan's "Do not block the engine on الحصون الخمسة level quantities — husun lands when quantities are sourced from the book's tables." No authoritative table was found; the user accepted documented best-effort defaults instead (all overridable per-enrollment). Every other constraint of that plan and ADR 0030 stands.

## Approach

**Templates** (`app/constants/plans.ts`):
- `daily-wird` — unchanged.
- `listening-wird` — new. Same shape as `daily-wird` (`fixed_cycle`, whole mushaf, `defaultUnitsPerDay: 5`) but `activity: "listen"`, `missedDayPolicy: "cursor"`.
- `husun` — new, `missedDayPolicy: "cursor"`, five tracks mapping to the five rule kinds:

| Track key | حصن | `activity` | Rule kind | Rule params |
|---|---|---|---|---|
| `tilawa` | القراءة المستمرة | `read` | `fixed_cycle` | `rangeStart: 1`, `rangeEnd: 604`, `defaultUnitsPerDay: 20` (1 juz/day) |
| `hifz` | الحفظ الجديد | `memorize` | `cursor_advance` | `defaultUnitsPerDay: 1`; target range comes from `params.targetStart`/`targetEnd` (the enroll juz picker) |
| `tahdeer` | التحضير | `listen` | `lookahead` | `sourceTrack: "hifz"`, `repetitions: 10` |
| `qareeb` | مراجعة القريب | `review` | `trailing_window` | `sourceTrack: "hifz"`, `windowSize: 20` |
| `baeed` | مراجعة البعيد | `review` | `completed_cycle` | `sourceTrack: "hifz"`, `excludeTrailingWindow: 20`, `defaultUnitsPerDay: 1` |

Shape check against the engine: all three source-bearing tracks point at `hifz`, a `cursor_advance` (source-free) track — satisfying the engine's two-pass restriction (ADR 0030 / `engine.ts` pass 1). `qareeb` covers `[lastEnd-19, lastEnd]` and `baeed`'s region ends at `lastEnd-20`, so the two are contiguous with no overlap or gap. `baeed` and `qareeb` only appear once `hifz` has log history; `baeed` additionally needs >20 memorized pages (`regionEnd < regionStart` → track omitted). `tahdeer` appears on day one (it derives from `hifz`'s *derived* assignment, not its history). All of this is already covered by `engine.test.ts`'s husun-shaped fixture.

**Quantity sourcing.** No authoritative book table was available; the table above is a documented best-effort default confirmed with the user, not a verbatim source. `baeed`'s 1 page/day in particular is an unsourced judgment call mirroring `hifz`'s pace. All are overridable per-enrollment via `params.quantities`.

**Resolved sign-off** (2026-07-27): the review's two recommendations were accepted — `tilawa` is `20` (1 juz/day, not 40), `tahdeer.repetitions` is `10` (not 1), both matching `engine.test.ts`'s husun fixture and pairing more coherently with a 1 page/day hifz default.

A third option raised during review — scaling `tilawa`/`baeed` defaults off the entered hifz pace — is **not** adopted: the engine has no derived-quantity mechanism, so it would mean computing quantities in the enroll form and writing them into `params.quantities`, which then silently diverges from the template defaults on any later pace change. Defaults stay static and editable.

**Hub page** (`app/[locale]/plans/page.tsx`): server component mirroring `app/[locale]/marks/page.tsx` — `setRequestLocale`, `Promise.all([getServerSession, getTranslations])`, same `<main>`/header shell, `PlansSignedOutPrompt` when signed out. Body is a client `MyPlansList` (enrollments grouped by status, active plans showing today's assignments with check-off and pause/resume/abandon) plus a `TemplateCatalog` (3 cards, each expanding into an enroll form). A new always-visible nav link (`PlansLink`, mirrors `MarksLink`) opens it.

**Reader widget** (`PlansWidget`): a compact floating pill mounted in `app/[locale]/layout.tsx` alongside `RecitationPlayerBar`, shown only on reader routes for signed-in users with ≥1 active plan. Tapping it opens a `components/ui/sheet.tsx` sheet listing every active plan's today-assignments with the same check-off action as the hub. The pill highlights when the current reading/recitation position falls inside any track's assigned range — a visual hint, never an auto-check-off (D5).

## Decision Tree / Algorithm

### Enroll form fields, by template

| Template | Fields (all numeric inputs prefilled with the template default, all editable) |
|---|---|
| `daily-wird` | pages/day → `params.quantities.reading` (default 5) |
| `listening-wird` | pages/day → `params.quantities.listening` (default 5) |
| `husun` | hifz pages/day → `params.quantities.hifz` (default 1); tilawa pages/day → `params.quantities.tilawa` (default per table); baeed pages/day → `params.quantities.baeed` (default per table); target-from juz + target-to juz (two `1–30` selects, both required) |

Exposing `tilawa`/`baeed` as editable fields (rather than hardcoding) is deliberate: the defaults are unsourced, so the user must be able to correct them without a deploy. No preset "levels" anywhere — free numeric entry only (the engine is page-canonical; sub-page levels aren't representable).

Client-side: quantities must be positive integers; `target_juz_start ≤ target_juz_end`; the juz selects default to **1–30** (the whole mushaf — narrower targets like Juz Amma are the user's choice, not the default). Submit is disabled until valid.

### `POST /api/plans` changes

Insert after the existing `endDate`/`missedDayPolicy` validation (which is untouched — none of the three templates use `calendar`, so that branch stays dead for now), before `appPrisma.userPlan.create`:

1. If `body.target_juz_start` / `body.target_juz_end` are present, both must be integers in `1..30` with `start ≤ end` → else `422`.
2. Resolve each via `getJuzPageRange` (`app/lib/plans/resolve-units.ts`, currently unused). `null` from either → `422 "Unknown juz"`. Run the two lookups in `Promise.all`.
3. Set `params.targetStart = startRange.startPage`, `params.targetEnd = endRange.endPage` — **overwriting** any client-supplied `targetStart`/`targetEnd`. Juz numbers are never persisted (page-canonical, D3).
4. Harden the rest of the client-supplied `params` while here, since the enroll form is the first real caller: `startPage`/`targetStart`/`targetEnd` must be integers within `MUSHAF_FIRST_PAGE..MUSHAF_LAST_PAGE` and `targetStart ≤ targetEnd`; every value in `quantities` must be a finite integer `≥ 1`. Reject with `422` otherwise. (Today an out-of-range `targetEnd` would let `cursor_advance` assign pages past 604, and a `NaN` quantity would poison `clampQuantity` — `Math.max(1, NaN)` is `NaN`.)

No new endpoint, no juz values in `UserPlanParams`, no change to `resolve-units.ts` itself.

### Publishing the reader's current page

The reader's current page is not published anywhere today: `RecitationContext` exposes only `pageFirstVerseKey` (a verse key, set by `RecitationPageSync`) and `recitedPage` (a page number, but non-null only during a playback session). So:

- **`app/contexts/ReaderPageContext.tsx` (new)** — holds `visiblePages: number[] | null` + `setVisiblePages`. Nothing else; no recitation state, and `RecitationContext` gains no new field.
- **`app/components/reader/ReaderPageSync.tsx` (new)** — null-rendering effect leaf, mirroring `RecitationPageSync`: sets `visiblePages` on mount/prop change and **clears to `null` on unmount**, so leaving the reader doesn't strand a stale page.
- **`ReaderPager`** mounts it next to `RecitationPageSync`: `<ReaderPageSync anchor={pageNumber} isDouble={isDouble} />`.

`anchor` alone is **not** sufficient — in double-page/tablet layouts (`view === "double" && isLgUp`) two pages are on screen. `ReaderPageSync` computes the same set `RecitationFollow` already uses:

```
const { rightPage, leftPage } = getPagePair(anchor);
visiblePages = isDouble ? [rightPage, leftPage] : [anchor];
```

### Reader widget "in range" check, per track's `activity`

| Activity | Comparison |
|---|---|
| `read` / `memorize` / `review` | any page in `visiblePages` ∈ `[rangeStart, rangeEnd]` |
| `listen` | `recitedPage` ∈ `[rangeStart, rangeEnd]` when `status !== "idle"` and `recitedPage != null`; otherwise fall back to the `visiblePages` check |

(`stop()` nulls `recitedPage`; pause does not — so a paused session keeps its position, matching the user's call.) The pill's highlight is on if **any** active track matches; the sheet marks matching rows individually. Routes where `ReaderPager` isn't mounted (e.g. `/pages/vertical`) simply yield `visiblePages === null` → no highlight, pill still usable.

### Widget visibility and placement

- Reader-route detection: `pathname?.includes("/pages/")`, identical to `RecitationPlayerBar` — covers both self (`/pages/:id`) and grant (`/mushaf/:grant/pages/:id`) readers.
- Hidden when signed out (`useSession`) or when `useTodayAssignments` returns no active plans. Gate the query with React Query's `enabled` on session presence so signed-out reader sessions don't fire a guaranteed 401 on every page.
- It must mirror the nav overlay exactly as `RecitationPlayerBar` does: `const { isOverlayMode, overlayVisible } = useNavOverlay()`, same `transition-transform duration-300` + `cubic-bezier(0.23, 1, 0.32, 1)` + translate-away when hidden. Otherwise the pill floats over the mushaf after the user taps to hide the chrome.
- Positioning: `fixed`, `bottom-20` (clear of the player bar's ~56px height), `end-4` (never `right-4` — RTL), `z-40`; the sheet renders above at the primitive's own z-index.

### Check-off, offline, and completion

- Check-off uses the existing `useTodayAssignments().checkOff` mutation (`{ planId, trackKey, rangeStart, rangeEnd }`; the hook supplies the local date). Its `onSuccess` already invalidates the whole `["/plans"]` prefix, so hub and widget stay in sync.
- Online-only v1: disable check-off with a notice when `useOnlineStatus()` is false, same as `MarkModal`.
- No auto-completion in this task. A finished `cursor_advance` target just drops out of the assignment list; the user marks the plan `completed` themselves via the status action. Non-`active` plans render with no assignments (`GET /api/plans/today` only returns active enrollments) — show their status and a resume action only.

## Verified Test Cases

Walked through with the user (this session, 2026-07-27):

1. **Scope**: generic multi-track hub/widget (not daily-wird-only), since husun ships in this task too. ✓ confirmed.
2. **Husun quantities**: no exact book table available — proposed set (table above) walked through and confirmed, with `baeed`'s quantity flagged as an assumption. Two coherence concerns raised in review are flagged above for sign-off.
3. **Level input**: rejected preset levels in favor of free numeric pages/day entry for `hifz` — matches `daily-wird`'s existing pattern, and the page-canonical engine can't represent sub-page "levels" anyway.
4. **Teacher-assigned level**: explicitly out of scope — noted for later, no ADR 0012 grant wiring exists for plans.
5. **Listening wird**: confirmed in scope, added as a third template.
6. **Target range picker**: juz-dropdown (not a raw page-number input, not deferred to "whole mushaf only") — confirmed.
7. **Reader widget form factor**: compact floating pill → expandable sheet (not sidebar-only) — confirmed, to handle multiple concurrent multi-track plans without cluttering the reading view.
8. **Listen-activity hint**: wired to live `recitedPage` crossing detection now (not manual-only, not deferred) — confirmed, reuses existing `RecitationContext` state, no new event plumbing.

Engine behavior for the new templates is already covered by `engine.test.ts`'s husun-shaped fixture; the only new unit test needed is a guard that the shipped `PLAN_TEMPLATES.husun` matches the shape the engine supports (every `sourceTrack` resolves to a `fixed_cycle`/`cursor_advance` track in the same template) — worth adding for all templates, not just husun.

## Files to Change

- `app/constants/plans.ts` — add `listening-wird` and `husun` to `PLAN_TEMPLATES`; drop the now-stale "husun ships later" comment above it.
- `app/constants/plan-ui.ts` (new) — UI-only display metadata per template/track (i18n key, lucide icon) — kept out of `plans.ts` so the engine-facing template shape stays pure.
- `app/api/plans/route.ts` — `POST`: juz resolution + params validation per the algorithm above.
- `app/lib/plans/engine.test.ts` — add the template-shape guard described above.
- `app/lib/plans/resolve-units.ts` — no change; `getJuzPageRange` goes from unused to consumed.
- `app/hooks/use-plans.ts`, `app/hooks/use-today-assignments.ts`, `app/server/actions/plans.ts` — **already shipped in #140** (`usePlans` with `enroll`/`setStatus`, `useTodayAssignments` with `checkOff`, `getLocalDateString`). Only change: add an `enabled` option to `useTodayAssignments` so the widget can gate it on session presence.
- `app/contexts/ReaderPageContext.tsx` (new) — `visiblePages: number[] | null`.
- `app/components/reader/ReaderPageSync.tsx` (new) — effect leaf; props `{ anchor, isDouble }`.
- `app/components/reader/ReaderPager.tsx` — mount `<ReaderPageSync anchor={pageNumber} isDouble={isDouble} />` beside `RecitationPageSync`.
- `app/components/plans/` (new directory):
  - `TemplateCatalog.tsx` — 3 template cards + expand-to-form.
  - `PlanEnrollForm.tsx` — per-template fields per the table above. Juz-range defaults to **1–30** (whole mushaf), not a single juz — a narrower target (e.g. Juz Amma) is the user's choice, not the default (implementation feedback, 2026-07-27).
  - `MyPlansList.tsx` — enrollments grouped by status + today's assignments + check-off + status actions + a per-plan collapsible history section (see below).
  - `PlanAssignmentRow.tsx` (new, shared) — one track's assignment row (icon/label/range/check-off), used by both `MyPlansList` and `PlansWidget`. The label/range portion is a `Link` to `/pages/{rangeStart}` (implementation feedback, 2026-07-27) — clicking a track jumps to that page in the reader; the check-off button stays outside the link (mirrors `MyMarksList`'s row-link + separate remove-button pattern).
  - `PlansSignedOutPrompt.tsx` — copy of `MarksSignedOutPrompt`'s markup with plans copy/icon (it hardcodes marks strings and icon, so adapt rather than reuse).
  - `PlansWidget.tsx` — floating pill + sheet (reader routes only).
- `app/api/plans/[planId]/progress/route.ts` — add `GET` (implementation feedback, 2026-07-27): the plan's progress log, most recent first, capped at 50 entries — read-only, ownership-checked, never recomputed with current template params (ADR 0030). Small addition beyond the original plan scope, added directly rather than deferred since it's a straightforward additive read endpoint following the existing `GET`/`POST` split already used elsewhere (`api-conventions.md`).
- `app/hooks/use-plan-history.ts` (new) — `usePlanHistory(planId, { enabled })`, fetched on demand (only once a card's history section is expanded).
- `app/server/actions/plans.ts` — add `getPlanHistory`.
- `app/[locale]/plans/page.tsx` (new) — hub page, mirrors `app/[locale]/marks/page.tsx`.
- `app/components/nav/PlansLink.tsx` (new) — nav entry, mirrors `MarksLink.tsx` exactly (icon `size-5 md:size-4`, label `hidden md:inline`).
- `app/components/nav/Nav.tsx` — mount `PlansLink` next to `MarksLink` in the end cluster.
- `app/[locale]/layout.tsx` — wrap `{children}` + the bars in `<ReaderPageProvider>` (inside `NavOverlayProvider`, so both `ReaderPager` and `PlansWidget` are under it), and mount `<PlansWidget />` after `<RecitationPlayerBar />`.
- `messages/ar.json` / `messages/en.json` — `plans.*` keys (nav link, hub title/empty/signed-out, template names + descriptions, husun track names in Arabic, activity labels, enroll form labels/validation, widget sheet, status actions). `ar.json` must be complete.
- `docs/architecture/DECISIONS.md` — the #149 bullet under "Awrad & Learning Plans Engine" (already in this branch; updated by this review).

## Constraints

- All constraints from `docs/plans/awrad-learning-plans.md` and ADR 0030 carry forward unchanged (page-canonical, no materialized schedule rows, `activity` orthogonal to scheduling, manual check-off only, online-only v1, no cross-domain FK, source-bearing rules may only reference `fixed_cycle`/`cursor_advance` tracks).
- Reader routes stay statically generated — all plan data on the reader is client-fetched post-hydration via React Query. `PlansWidget` and everything it mounts is `"use client"`; no server data fetching on reader routes.
- Juz values are UI/enroll-time only — never stored in `UserPlanParams` or the progress log (D3).
- `ReaderPageContext` carries only visible page numbers — no recitation state duplicated into it, and `RecitationContext` gains no page-number field.
- The reader widget's highlight is a hint only — it must never auto-write a check-off (D5).
- Styling: semantic shadcn tokens only (no `bg-white`/`gray-*`), `ps-/pe-/ms-/me-`/`start-`/`end-` for anything that mirrors, `dir="rtl"` on any Quran text. `tailwindcss-animate` is not installed — use Radix `data-[state=...]` + `transition-*` with a `motion-reduce:` variant.
- i18n: client components use the repo's `@hooks/use-translations` (`t(key, fallback)`), server components `getTranslations()` after `setRequestLocale`. Locale-aware `Link` from `@/i18n/routing`; page/juz numbers rendered through `toLocaleNumeral`.
- API: `jsonResponse()` envelope + `extractUser` only. `^/api/plans` is already in `auth-middleware`'s `protectedRoutes` — no matcher change needed.

## What NOT to Do

- Do not add preset "levels" for husun's hifz pace — free numeric input only.
- Do not build teacher-assigned levels or any ADR 0012 grant UI in this task.
- Do not add a new API endpoint for juz→page resolution — resolve inline in `POST /api/plans`.
- Do not store juz numbers anywhere in `UserPlan.params` or `PlanProgressEntry` — resolve to pages immediately.
- Do not derive `tilawa`/`baeed` quantities from the entered hifz pace — keep template defaults static and editable (see the sign-off note).
- Do not make the reader widget a full-width bottom bar like `RecitationPlayerBar`, and do not let it ignore the nav-overlay hide/show on tablet/mobile reader routes.
- Do not treat `ReaderPager`'s `anchor` as "the visible page" — it is one of two in double-page view; always pair-expand via `getPagePair`.
- Do not wire playback-crossing detection through a new event system — read `RecitationContext.recitedPage` directly.
- Do not create new `usePlans`/`useTodayAssignments`/`checkOffTrack` implementations — they already exist from #140.
- Do not auto-mark a plan `completed`, and do not change `PATCH /api/plans/:id` (it already handles all four statuses with ownership re-verification).
- Do not block this task on sourcing an authoritative husun quantity table — ship the documented defaults, revisit if a canonical source surfaces.

## Decisions Made

- Generic multi-track hub/widget UI, not daily-wird-only.
- Husun ships in this task (not deferred further), superseding the foundation plan's "wait for sourced quantities" gate; quantities are a documented best-effort proposal, not a verbatim book quote, and are editable at enroll time.
- Hifz pace: free numeric pages/day input, no level presets. `tilawa`/`baeed` pace also exposed as editable numeric fields (review addition — the defaults are unsourced).
- Teacher-assigned levels: explicitly deferred, no scope here.
- `listening-wird` ships alongside `husun`.
- Target range: juz-dropdown picker, resolved server-side at enroll, overwriting any client-sent page targets.
- Reader widget: compact floating pill → expandable sheet, not sidebar-only; mirrors the nav overlay's show/hide.
- Listen-activity reader hint: wired to live `recitedPage` now, with a `visiblePages` fallback when no session is active.
- Reader page publishing: a new `ReaderPageContext` carrying a **pair-aware** `visiblePages` array (not a single `anchor`), fed by a new `ReaderPageSync` leaf — the same shape `RecitationFollow` already uses.
- Juz-range enroll default is **1–30** (whole mushaf), not a single juz — added after implementation feedback that a same-value "30 to 30" default read as an accidental range rather than an intentional one.
- Plan history: added in this task (not deferred) as a small per-plan collapsible list on the hub, reading the existing `PlanProgressEntry` log via a new `GET /api/plans/:planId/progress` (most-recent-first, capped at 50, read-only per ADR 0030). Added after implementation feedback identified it as a real gap — the hub only ever showed "today," with no way to see what was actually done on prior days.
- Track rows are clickable: `PlanAssignmentRow`'s label/range links to `/pages/{rangeStart}`, so tapping a track jumps to that page in the reader — added after implementation feedback, mirrors `MyMarksList`'s existing row-link pattern.

---

## Companion Redesign (visual refresh, 2026-07-27)

Imported from a Claude Design prototype (`Daily Awrad Companion.dc.html`, project "Daily Awards & Learning Plans") — a high-fidelity reference for colors/spacing/copy/RTL/timing, not code to port verbatim (inline-style JSX strings translate to Tailwind/shadcn tokens per `docs/standards/styling.md` and `docs/design/design-principles.md`). Continues on this same branch/PR (#146) rather than a new plan file, since the branch is still open.

The prototype turned out to need two things the shipped app doesn't have yet, confirmed with the user before writing this section: a **streak/week-strip** (new derived data, no UI today computes it) and **editing an active plan's params** (today only enroll-create and status-change exist). Both are in scope.

### Approach

**1. Hero "today" card** (`PlansTodayHero.tsx`, new, mounted above the plan-card list in `MyPlansList`): flattens every active plan's today-assignments into one row list (same `rows = todayData.flatMap(...)` shape `PlansWidget` already builds), each row = check-off control + track label + activity·range + `/pages/{rangeStart}` link. `doneCount === totalCount` (and `totalCount > 0`) swaps to the celebratory all-done state (filled circle + checkmark + streak sentence), matching the prototype's two `sc-if` branches. Week-strip + streak number come from a new hook (below). No hero card renders when the user has zero plans at all (existing empty state in `MyPlansList` is unchanged).

**2. Streak / week-strip — new derived data, computed at read time, nothing persisted** (mirrors ADR 0030's derivation-not-storage philosophy):
- **"Day complete"** = every assignment `deriveAssignments` would produce for that day, across the user's currently-**active** plans, has a progress entry (recomputed historically the same way `today` already is — `deriveAssignments(template, params, allEntries, historicalDate)`, just called with a past date). A day with **zero** assignments due (before a plan's `start_date`, or nothing left for a finished `cursor_advance`) counts as complete (a pass-through day, not a break).
- **Known, accepted limitation:** only currently-active plans count, and a plan is treated as due from its own `start_date` onward with no pause-history reconstruction (status-change timestamps aren't tracked) — a plan paused last month and resumed today will have last month's gap count against the streak. Revisit only if this becomes a real complaint.
- **Streak length:** walk backward day-by-day from today while every day is complete; stop at the first incomplete day. Lower-bounded by `min(start_date)` across active plans (a user with no active plans has streak `0`); hard safety cap at 400 days lookback (not expected to matter in practice).
- **Week strip:** a **rolling 7-day window ending today**, rendered as `[isComplete(today-6), …, isComplete(today)]` in DOM order with no manual RTL reversal — flexbox's own `row` direction already places index 0 at the reading-start and the last index at the reading-end for both directions, so today lands at the reading-end edge (left in RTL, right in LTR) automatically, not a fixed Sat–Fri calendar week.
- New pure module `app/lib/plans/streak.ts`: `deriveStreak(plans: { startDate: string; template: PlanTemplate; params: UserPlanParams; entries: ProgressLogEntry[] }[], today: string) => { streakLength: number; week: boolean[] }`. No DB, no clock — same style as `engine.ts`. Unit-tested (`streak.test.ts`) the same way `engine.test.ts` is: zero-plan (streak 0, week all-false-except-vacuous… see test cases below), single active plan with a gap, a `start_date` inside the window, and a currently-incomplete today (today itself never blocks the *count* since the walk starts from yesterday when today isn't done — see test case 4 below).
- **New endpoint** `GET /api/plans/streak?date=YYYY-MM-DD` (`app/api/plans/streak/route.ts`): same `appPrisma.userPlan.findMany({ where: { user_id, status: "active" }, include: { progress: true } })` query shape as `/api/plans/today`, feeds `deriveStreak`. New hook `usePlanStreak()` (`app/hooks/use-plan-streak.ts`), same React Query shape as `useTodayAssignments` (staleTime Infinity, no background refetch, date in the query key).

**3. Plan param editing** — extends the existing `PATCH /api/plans/:planId` (no new route) to optionally accept `params` / `target_juz_start` / `target_juz_end` alongside the existing optional `status`; at least one of `status` or a params field is required. The juz-resolution + params-hardening logic in `POST /api/plans` is extracted into a shared helper (`app/lib/plans/validate-params.ts`, `resolvePlanParams(body, template) => { params } | { error: string }`) used by both POST and PATCH, so the two don't drift. PATCH does a **full replace** of `params` (not a merge) — the edit form always submits the complete current shape (prefilled from the plan's existing `params`), same as enroll. No change to history/derivation: cursor state still reads the progress log verbatim (existing constraint holds — an edit never retro-applies to past entries).

**4. Consolidated entry point** — `TemplateCatalog`'s always-expanded accordion is replaced by a dashed-border `AddPlanButton` ("+ ورد جديد") opening `PlansBrowseDialog` (shadcn `Dialog`), which drills into per-template views:
- **List view**: one row per template (`daily-wird`, `listening-wird`, `husun`). If the user has an existing **active** enrollment of that template (`plans.find(p => p.template_key === key && p.status === "active")` — see edge case below), the row opens that template's view **pre-filled**, ending in a "save changes" CTA (PATCH); otherwise it opens empty, ending in "start plan" (POST, existing `enroll` mutation).
- **daily-wird / listening-wird**: single view — the same quantity-field form `PlanEnrollForm` already renders, just reached through the dialog's per-template step instead of an always-visible accordion.
- **husun**: two-step view (`husun-overview` → `husun-settings`), matching the prototype — overview is static explanatory copy, settings has the quantity fields **and** the new dual-handle juz-range slider (below).
- Dialog view state: `"list" | "daily-wird" | "listening-wird" | "husun-overview" | "husun-settings"`. Back buttons return to `"list"`; backdrop/outer click closes; inner click `stopPropagation`s.
- **Edge case, accepted as a deliberate simplification**: this collapses to one enrollment-or-edit slot per template per user. Enrolling in a *second* concurrent instance of the *same* template is no longer reachable from this UI (multiple *different*-template concurrent enrollments, per D6, are unaffected — the whole point of the flat template list). Nothing in the shipped feature's verified test cases required same-template duplicates; if ever needed, it's a distinct future affordance, not a gap in this redesign.

**5. Dual-handle juz-range slider** (husun's target range, replacing the two `<select>`s): new `components/ui/slider.tsx` (shadcn wrapper around `@radix-ui/react-slider`, new dependency — not currently installed), used as a controlled range (`value={[juzFrom, juzTo]}`, `min={1} max={30} step={1}`, `dir="rtl"` — Radix's own `dir` prop flips orientation, no hand-rolled pointer/`clientX` math needed unlike the prototype). `JuzRangeSlider.tsx` wraps it with the "١"/"٣٠" endpoint labels and the live "الجزء {from} – {to}" readout (`toLocaleNumeral`).

**6. Reader widget** (`PlansWidget.tsx`): visual-only change to the trigger — replace the flat pill (icon + count) with an SVG progress ring (`stroke-dasharray`/`stroke-dashoffset` scaled to `pendingCount / rows.length`) around a solid `bg-primary` circle showing `pendingCount`, matching the prototype's reader-widget mock. The `Sheet` body, `useReaderPage`/`useRecitation` in-range highlighting, nav-overlay show/hide, and all check-off wiring are unchanged — this is a trigger-visual change only, not a data or interaction change.

**7. Plan cards + history** (`MyPlansList.tsx`): mostly a Tailwind restyle to match the card shell (`rounded-[16px]`, the standard elevated shadow from `design-principles.md`) and the history section's timeline look (vertical line + dot per entry, replacing the current plain stacked-text list) — `PlanHistorySection`'s data/fetch-on-expand behavior (`usePlanHistory`, collapsed by default) is unchanged, only its expanded markup changes.

### Decision Tree / Algorithm

**Day-complete check** (used for both streak and week-strip; `plans` = currently-active only):

| Condition | Result |
|---|---|
| `date < plan.start_date` for a given plan | that plan contributes no assignments for `date` (excluded, not a failure) |
| A plan has assignments for `date` and any is not completed | day is **incomplete** — for the streak walk, stop here; for the week strip, that segment is `false` |
| Every plan's assignments for `date` (if any) are all completed, or no plan had any assignment that day | day is **complete** — `true` |

**Streak walk:**
```
streak = 0
cursor = today
while cursor >= min(active plan start_dates) and streak < 400:
  if isDayComplete(cursor): streak += 1; cursor -= 1 day
  else: break
```
(No active plans → `min(...)` is undefined → streak is `0` immediately.)

**Week strip:** `[isDayComplete(today-6), isDayComplete(today-5), …, isDayComplete(today)]` — always 7 entries, always ends at `today`, regardless of weekday.

### Verified Test Cases

1. **Brand-new user, zero plans**: no active plans → hero card doesn't render at all (existing empty state holds); if `usePlanStreak` were called anyway, `streak = 0`, `week = [true×7]` (vacuously — no plans, no due assignments, every day "complete") — but the hero never mounts to display it, so this is inert.
2. **One active `daily-wird`, enrolled 10 days ago, checked off every day including today**: `min(start_date)` = 10 days ago; walking back from today, every day has exactly the `reading` assignment completed → streak = 10 (capped at the plan's own age, not the 400-day safety cap) if today's check-off already happened; if today isn't yet checked off, the walk starts at *yesterday* (today is incomplete → for the *streak count* the walk must start from the last fully-complete day, i.e. today's incompleteness doesn't retroactively break yesterday's streak — the hero's own `doneCount === totalCount` today drives the celebratory-state swap independently of the historical streak number). Week strip = `[true,true,...,true]` for the 7 days ending today, with today's slot reflecting whether *today specifically* is done yet.
3. **Same plan, missed day 5 of 10 (no check-off that day, `cursor` policy)**: `deriveAssignments` for day 5 still returns the `reading` assignment (the range that *would* have been assigned that day) with `completed: false` → day 5 is incomplete → streak walk stops there; streak = however many days since day 6 (day 5 breaks it, days 1–4 don't matter — walk starts from today backward and stops at the first incomplete day, which is day 5 if days 6–10/today are all done, giving streak = 5 or 6 depending on whether today counts yet).
4. **Husun enrolled 3 days ago, `hifz` checked off all 3 days, `qareeb`/`baeed` not due yet (need >20 memorized pages, per the engine's existing `regionEnd < regionStart` guard)**: on each of those 3 days, `deriveAssignments` only returns `tilawa`+`hifz`+`tahdeer` (review tracks correctly absent, per the already-shipped engine behavior) — all completed → those days count as complete; days before `start_date` are excluded from the walk's lower bound, not counted as failures.
5. **Editing an active husun plan's target range narrower than already-memorized progress** (e.g. `hifz` cursor is at page 130 but the edited `targetEnd` resolves to page 125): allowed — `PATCH` doesn't validate against progress-log state (only against the juz/page-number shape itself, same as `POST`); the next day's `deriveAssignments` call for `hifz` (`cursor_advance`) sees `start > targetEnd` and correctly drops the track as complete (existing engine behavior, no change needed) — a "shrink to what you've already covered" edit is a valid way to mark a target done early.
6. **Browse dialog: user has an active `husun` and no `daily-wird`/`listening-wird`**: list view shows `husun`'s row opening pre-filled `husun-overview → husun-settings` (edit path); `daily-wird`/`listening-wird` rows open empty (enroll path). Clicking `husun`'s row a second time (already inside the edit flow) still targets the same single active husun enrollment — no ambiguity since only one active enrollment per template is reachable from this UI (accepted simplification above).

All six confirmed with the user (2026-07-27) alongside the two upstream scoping questions (streak: build it, all-assignments-done definition, zero-due-day pass-through, active-only/no-pause-history, rolling 7-day window; plan editing: build it, full-replace `params`).

### Files to Change

- `app/lib/plans/streak.ts` (new) — `deriveStreak` pure function.
- `app/lib/plans/streak.test.ts` (new) — cases 1–4 above as fixtures, vitest (existing infra from the foundation plan).
- `app/api/plans/streak/route.ts` (new) — `GET`, same query shape as `/api/plans/today`, feeds `deriveStreak`.
- `app/hooks/use-plan-streak.ts` (new) — React Query wrapper, mirrors `use-today-assignments.ts`.
- `app/server/actions/plans.ts` — add `getPlanStreak`.
- `app/lib/plans/validate-params.ts` (new) — `resolvePlanParams` extracted from `POST /api/plans`'s inline juz-resolution + params-hardening block, used by both POST and the extended PATCH.
- `app/api/plans/route.ts` — `POST` calls the extracted helper (behavior unchanged).
- `app/api/plans/[planId]/route.ts` — `PATCH` accepts optional `params`/`target_juz_start`/`target_juz_end` via the same helper; requires at least one of `status` or a params field.
- `app/server/actions/plans.ts` — add `updatePlanParams`.
- `app/hooks/use-plans.ts` — add `updateParams` mutation (mirrors `setStatus`).
- `components/ui/slider.tsx` (new) — shadcn Radix slider wrapper. `package.json` — add `@radix-ui/react-slider`.
- `app/components/plans/JuzRangeSlider.tsx` (new) — dual-handle wrapper with endpoint labels + live readout.
- `app/components/plans/PlansTodayHero.tsx` (new) — hero card, both states.
- `app/components/plans/PlansBrowseDialog.tsx` (new) — consolidated entry dialog, list + per-template views.
- `app/components/plans/AddPlanButton.tsx` (new) — dashed entry-point trigger.
- `app/components/plans/TemplateCatalog.tsx` — deleted, superseded by `PlansBrowseDialog`.
- `app/components/plans/PlanEnrollForm.tsx` — accepts an optional `existingPlan` prop (prefill + PATCH-via-`updateParams` instead of POST-via-`enroll` when present); husun's target-range fields switch from two `<select>`s to `JuzRangeSlider`.
- `app/components/plans/MyPlansList.tsx` — mount `PlansTodayHero` above the card list; swap `TemplateCatalog` for `AddPlanButton` + `PlansBrowseDialog`; restyle card shell + `PlanHistorySection` to the timeline look (data/fetch behavior unchanged).
- `app/components/plans/PlansWidget.tsx` — trigger becomes an SVG progress ring (visual only; `Sheet` body/highlight logic unchanged).
- `messages/ar.json` / `messages/en.json` — hero copy (all-done sentence, "N of M today", "N-day streak"), dialog copy (already mostly covered by existing `plans.templates.*`/`plans.tracks.*`), edit-vs-enroll CTA strings, juz-slider labels.
- `docs/architecture/DECISIONS.md` — append streak-derivation + params-editing bullets under "Awrad & Learning Plans Engine".

### Constraints

- All constraints from `docs/plans/awrad-learning-plans.md`, ADR 0030, and this file's original section carry forward unchanged (page-canonical, no materialized schedule rows, manual check-off only, online-only v1, no cross-domain FK, source-bearing rules reference only `fixed_cycle`/`cursor_advance`).
- Streak/week-strip are derived at read time, never persisted — same philosophy as assignments themselves. Do not add a `streak` column or cache table.
- `deriveStreak` takes pre-fetched plans+entries (like `deriveAssignments`) — no DB access inside the pure function; the route does the Prisma query.
- PATCH `params` is a full replace, not a merge — the client always sends the complete shape.
- Accent colors map to the shadcn `primary` token (`bg-primary`/`text-primary`/`border-primary`, including opacity variants like `bg-primary/12`) — never a hardcoded hex, so the redesign adapts across `theme-light`/`theme-gold`/`theme-dark` (the prototype's `#12896b` is a single-theme approximation only).
- `checkoffStyle` ("seal"/diamond variant) and `density` (compact spacing) from the prototype are **not** built — ship the ring check-off only, fixed comfortable spacing (per user decision).
- `accentColor` swapping is out of scope — the app already has theme switching; not a new control.

### What NOT to Do

- Do not port the prototype's inline-style/JSX-string markup — translate every value to Tailwind utilities/shadcn tokens.
- Do not persist streak or week-strip data — pure derivation only, consistent with ADR 0030.
- Do not reconstruct plan pause/resume history for the streak — no status-change timestamp table; accepted limitation, not a gap to fill here.
- Do not let a PATCH params edit retro-apply to past `PlanProgressEntry` rows — history stays exactly as logged.
- Do not build `checkoffStyle`/`density`/`accentColor` as real user-facing settings in this pass.
- Do not hand-roll the dual-handle slider's pointer/`clientX` math — use `@radix-ui/react-slider`'s `dir="rtl"` support.
- Do not add a second API endpoint for plan-param editing — extend the existing `PATCH /api/plans/:planId`.
- Do not preserve `TemplateCatalog`'s always-expanded-accordion pattern alongside the new dialog — it's fully superseded and deleted.

### Decisions Made

- Streak/week-strip: build it now (not deferred). "Day complete" = every that-day assignment (across active plans) checked off; a zero-assignment day is a pass-through, not a failure; only currently-active plans count, using their own `start_date` with no pause-history reconstruction; week strip is a rolling 7-day window ending today (today always last), not a fixed calendar week.
- Plan param editing: build it now via the existing PATCH endpoint (full-replace `params`), not a new route — reachable through the browse dialog's "already active → edit" path.
- Browse dialog collapses to one enroll-or-edit slot per template per user; creating a second concurrent same-template enrollment is no longer reachable from this UI (accepted; different-template concurrency per D6 is unaffected).
- Dual-handle juz slider: add `@radix-ui/react-slider` rather than hand-rolling pointer-capture math.
- Variant scope: ring check-off only, fixed comfortable density — `checkoffStyle`/`density`/`accentColor` from the prototype are not shipped as real settings.
- Abandoned plans are hidden entirely from `MyPlansList` (not shown behind a toggle) — `other` excludes `status === "abandoned"` alongside the existing active/other split. Paused/completed are unaffected.

## Bug fix: today's assignment range drifts past a logged entry (2026-07-28)

**Bug:** `deriveAssignments` computed a track's range purely from cursor state (`state.lastEnd + 1`) independently of `completed` (`state.todayEntry !== null`). Once *any* track logged an entry for today, the next recompute — triggered by checking off a different track, since `checkOff`'s `onSuccess` invalidates the whole `["/plans"]` query prefix — advanced the shown range to the next not-yet-done position while `completed` stayed `true` from the earlier check. User-visible: check off "القراءة" (pages ١–٦), then check off a second track in the same plan, and القراءة silently relabels itself "٧–١٢" while still showing the green checkmark.

**Fix:** every rule kind now checks `state.todayEntry` first — if the track already has an entry logged for the queried date, return that entry's own range as the assignment (`completed: true`) instead of recomputing anything. Verified against all 5 rule kinds (fixed_cycle, cursor_advance, trailing_window, completed_cycle, lookahead) and every existing `engine.test.ts` case — only one test exercises this exact scenario and it asserts `completed` only, never the range, so no existing test changes. `streak.ts`'s `isDayComplete` is unaffected (reads only `completed`, never the range).

**Files:**
- `app/lib/plans/engine.ts` — add a `todayEntryAssignment(track, state)` helper (guards non-numeric `range_start`/`range_end` the same way `trackState` already does for `lastEnd`/`minStart`); call it first in `deriveSourceFreeTrack` and at the top of the main per-track loop for the source-dependent kinds (trailing_window/completed_cycle/lookahead), short-circuiting to it when non-null.
- `app/lib/plans/engine.test.ts` — new cases: a self-advancing track (fixed_cycle) with today's own entry shows that entry's range, not the next cursor position; same for cursor_advance, trailing_window, completed_cycle, and lookahead's own today-entry (distinct from the existing "source already checked off today" case, which is unaffected).

**Constraint (folds into the ADR 0030 entry in DECISIONS.md):** once a track has a today-dated progress entry, its derived assignment must echo that entry's own range verbatim — never recompute a cursor position for an already-logged day. This is a correctness requirement of "derive at read time," not just this bug's specific fix; any future rule kind must honor it.

## Feature: "next assignment" preview on completed rows (2026-07-28)

**What:** now that a completed track's row stays pinned to what was actually logged (previous fix), add a small muted secondary line under it previewing what comes next — e.g. **القراءة ✓ · صفحة ١–٥** with a line below reading **التالي: صفحة ٦–١٠**. Generic "next" wording (not "tomorrow") since a lookahead track's (`tahdeer`) own preview is inherently two steps removed once it's itself completed today — see below.

**Approach:** no new derivation logic — `deriveAssignments` is already a pure function of `(template, params, entries, date)`. For a completed assignment, call it again with `date + 1` (same `template`/`params`/`entries`, nothing new logged) and read that track's result. Because `todayEntryAssignment` only short-circuits on an exact date match, `date + 1` naturally has no entry yet and falls through to normal cursor/window computation — so self-advancing tracks correctly preview their post-today cursor, and source-dependent tracks (qareeb/baeed/tahdeer) correctly preview against the source's *own* `date + 1` state (computed the same way, via the existing two-pass `sourceFree` resolution). No special-casing per rule kind needed.

**Decision tree:**

| Condition | Behavior |
|---|---|
| `assignment.completed === false` | no preview — only completed rows get one |
| `completed === true` and the track has an assignment for `date + 1` | render `assignment.next = { rangeStart, rangeEnd, repetitions? }`; row shows the muted "التالي: صفحة X–Y" line (+ `×N` if `repetitions` set, mirroring the existing range-line format) |
| `completed === true` but the track has **no** assignment for `date + 1` (cursor_advance exhausted, or a review track with no source history yet) | no preview line — row shows only the completed range, same as today |

**Verified test cases** (walked through against the engine, all consistent with the already-fixed today-entry behavior):
1. `daily-wird` reading checked off 1–5 today → `next` = 6–10 (fixed_cycle's normal next-cursor computation, now correctly offset by one real day instead of leaking into today's own display).
2. `husun` hifz `cursor_advance` checked off 604–604 with `targetEnd: 604` → `deriveAssignments` for `date+1` returns `null` for hifz (exhausted) → no preview line.
3. `husun` qareeb (`trailing_window`) checked off 11–30 today, hifz's own `date+1` preview advances to 32 → qareeb's `date+1` preview recomputes its window against hifz's `date+1` state → shows the correctly-shifted next window, not today's just-logged one.
4. `husun` tahdeer (`lookahead`) checked off 32–32 today → its `date+1` preview looks ahead of hifz's *own* `date+1` preview (33, assuming hifz's own cursor advances) → tahdeer's preview ends up being "33" (functionally two days of hifz progress ahead) — expected and why the label is generic "التالي", not "غداً".

**Files to Change:**
- `app/lib/plans/dates.ts` (new) — extract `addDays(date, delta)` (currently private to `streak.ts`) so both `streak.ts` and the `/today` route can use the identical date-math without duplicating it.
- `app/lib/plans/streak.ts` — import `addDays` from the new module instead of defining its own.
- `app/lib/plans/engine.ts` — `TrackAssignment` gains an optional `next?: { rangeStart: number; rangeEnd: number; repetitions?: number }`. `deriveAssignments` itself is unchanged; a small new exported helper (e.g. `withNextPreview`) takes the already-derived `assignments` array plus one extra `deriveAssignments` call for `date+1` and attaches `.next` to completed entries whose track has a `date+1` result.
- `app/api/plans/today/route.ts` — after deriving today's assignments per plan, call the new helper with `addDays(date, 1)` before pushing into the response.
- `app/lib/plans/engine.test.ts` — new cases per the decision tree above (all four scenarios).
- `app/components/plans/PlanAssignmentRow.tsx` — when `assignment.completed && assignment.next`, render the muted "التالي: …" line under the existing range line (same locale-numeral formatting helper, extracted or duplicated inline like the existing range line already is).
- `messages/ar.json` / `messages/en.json` — `plans.nextAssignment` ("التالي" / "Next").

**Constraints:**
- No new persisted data — the preview is derived at read time exactly like today's own assignment (ADR 0030 holds).
- Compute the `date+1` pass only for plans/tracks that actually have a completed assignment today — don't derive it unconditionally for every track (small, avoidable extra work).
- `next` is presentation-only — never affects `completed`, never writable, no check-off affordance on the preview line.

**What NOT to Do:**
- Do not label the preview "غداً" (tomorrow) — inaccurate for `lookahead` tracks whose own preview is inherently forward-shifted; use generic "التالي" everywhere for consistency.
- Do not add a second check-off control for the preview row — it's a read-only line, not an interactive assignment.
- Do not persist or cache the `date+1` derivation server-side beyond the single request — same derive-at-read-time model as everything else in this engine.

## Fix: quantity fields don't match the design reference (2026-07-28)

**Bug:** `PlanEnrollForm`'s quantity fields (hifz/tilawa/baeed for husun, reading/listening for the single-track templates) render as plain `<input type="number">` boxes, diverging from the Claude Design reference's `−`/`+` circular stepper (36px buttons, primary border+text, big centered 28px/800 number) used for every quantity field in the mockup (listening's pages/day, husun's hifz pages/day).

**Fix:** replace the `<input type="number">` with a `QuantityStepper` control (`−` / number / `+`, matching the mockup's stepper) for every quantity field across all three templates, for visual consistency — not just husun's three fields.

**Files:**
- `app/components/plans/QuantityStepper.tsx` (new) — `{ value, onChange, min? }`, 36px circular `−`/`+` buttons (primary border+text, mirrors `JuzRangeSlider`'s existing stepper-adjacent styling already used for husun2's juz endpoints in the mockup) flanking a centered `text-2xl font-extrabold` number.
- `app/components/plans/PlanEnrollForm.tsx` — swap the quantity `<input>` for `QuantityStepper` per track.

**Constraints:** min stays 1 (existing validation unchanged); no new dependency (plain buttons, no Radix primitive needed for a simple +/-1 stepper).

## Fix: inconsistent dialog structure + RTL title bug (2026-07-28)

**Bugs found (user-reported "buttons not aligned, title isn't RTL / not consistent"):**
1. `components/ui/dialog.tsx`'s shared `DialogHeader` used physical `sm:text-left` instead of logical `sm:text-start` — every dialog in the app (not just this one) centers its title on mobile then snaps to LTR-left alignment at `sm:` widths, wrong for RTL. Shared-primitive bug, fixed there directly.
2. `PlansBrowseDialog`'s 5 views didn't share one header structure: `list`/simple-template used a real `DialogTitle`; `husun-overview` used a plain styled `<div>` instead (no `DialogTitle` in the tree at all for that view — an accessibility gap, Radix expects one); `husun-settings` hid its `DialogHeader` with `sr-only` (the only step with no visible title).
3. `husun-settings`'s back navigation ("السابق") was a bottom, icon-less plain-text link — every other step's back control is a top, chevron+text `BackButton`.

**Fix:** one shared `ViewHeader` (optional `BackButton` + a real, visible `DialogTitle`+sr-only `DialogDescription`) used identically by all 5 views. `husun-overview`'s duplicate inline title is dropped (the shared header now provides it); its centered icon+explanatory-paragraph stays as body content below the header. `husun-settings` uses the same top `BackButton` pattern as every other step (label "السابق", going to `husun-overview` — the sub-flow-internal semantics are preserved, only the visual/structural pattern is unified).

**Files:** `components/ui/dialog.tsx` (one-line RTL fix), `app/components/plans/PlansBrowseDialog.tsx` (rewritten with `ViewHeader`).

**Follow-up fixes (2026-07-28):**
- `PlansBrowseDialog`'s `BackButton` used `ChevronRight` (rtl-rotated) — pointing left in RTL, backwards for a "back" affordance (should point toward reading-start, i.e. right in RTL). Swapped to `ChevronLeft` (rtl-rotated), matching universal back-arrow semantics in both directions.
- `PlansTodayHero`'s 7-day week strip sits directly under the "N of M today" line with no label, reading as if each pill were one of today's tracks (user reported "5 wirds but 6/7 pills" — verified via DOM inspection the strip always renders exactly 7, so this was a legibility/labeling gap, not a count bug). Added a small muted caption ("آخر ٧ أيام" / "Last 7 days") under the strip to make its unrelated 7-day-streak purpose explicit.
- **Real bug, same live-testing pass:** the week strip painted a filled/green pill for "none" days (before any plan's `start_date` — the pass-through case that doesn't break the streak *count*) exactly like a genuinely completed day, which reads as a false claim of having done something. `StreakResult.week` changed from `boolean[]` to a tri-state `("done" | "missed" | "none")[]` (`app/lib/plans/streak.ts`'s `dayStatus`, replacing `isDayComplete`) — only `"done"` (something was due and fully checked off) paints the pill; `"none"` and `"missed"` both render muted. The streak *length* walk is unchanged (`"none"` still doesn't break it, only `"missed"` does) — only the week strip's rendering honesty changed. `PlansTodayHero`'s celebratory all-done state no longer force-overrides every pill to green either — each day now always renders its real status.
- **Pill direction:** the week strip previously relied on the ambient `dir="rtl"` + plain flex-row order to position "today," which actually lands it at the reading-*end* (left in RTL) — user feedback wanted today explicitly on the right. `WeekStrip` now reverses the render order itself when `locale === "ar"` (`[...week].reverse()`) rather than depending on flex-direction/dir side effects, so the positioning is explicit and locale-driven, not incidental.

## Feature: undo a check-off (2026-07-28)

**Gap:** `PlanAssignmentRow`'s check-off button `disabled`s permanently once `assignment.completed` — no way to undo a mis-tap, and no DELETE path existed for a `PlanProgressEntry` at all.

**Fix:** `DELETE /api/plans/:planId/progress` (body `{ track_key, date }`) removes that one upserted row — same ownership/active-plan/known-track checks as the existing `POST`, no server-side "must be today" restriction (mirrors `POST`, which already trusts the client-supplied date; the UI is what scopes this to today's own row — `PlanHistorySection`'s past-day entries have no check-off control at all, so undo is never reachable for history). `PlanAssignmentRow` gets a single `onToggle` callback (replaces `onCheckOff`) — the button is never `disabled` by completion state anymore, only by `isPending`/offline; callers decide whether a tap means check-off or undo based on `assignment.completed`.

**Files:**
- `app/api/plans/[planId]/progress/route.ts` — add `DELETE`.
- `app/server/actions/plans.ts` — add `uncheckTrack`.
- `app/hooks/use-today-assignments.ts` — add `uncheckOff` mutation alongside `checkOff`, same `onSuccess: reload`.
- `app/components/plans/PlanAssignmentRow.tsx` — `onCheckOff` → `onToggle`; button always enabled unless `disabled`/`isPending`.
- `app/components/plans/PlansTodayHero.tsx`, `MyPlansList.tsx`, `PlansWidget.tsx` — the three `PlanAssignmentRow` call sites wire `onToggle` to `checkOff.mutate(...)` when not completed, `uncheckOff.mutate(...)` when completed.

**Constraints:** undo only removes the progress row for that one `(plan, track, date)` — never touches any other day's history (append-only history for finalized past days is unaffected, since the UI never exposes a control for them).

**Addendum 2 (2026-07-28):** editing an active plan is now also reachable directly from its own card's "⋮" menu (`plans.actions.edit`), not only via "ورد جديد" → the already-active row. `PlansBrowseDialog` gained an `initialView` prop (defaults to `"list"`); each `PlanCard` renders its own dialog instance (local `editOpen` state, no shared/lifted state needed — Radix `Dialog` is cheap when closed) opened straight to that template's edit view: `daily-wird`/`listening-wird` skip straight to their single-step form, `husun` jumps straight to `husun-settings` (skipping the static overview step, since an editor is already familiar with the template). Shown whenever the status-action menu itself would show (active/paused), reusing `STATUS_ACTIONS`'s existing active/paused-only condition.

**Addendum 1 (2026-07-28):** the centered number is directly editable (a borderless `<input>` in place of the static `<span>`, `min-w`-locked so the stepper buttons don't shift) — going from 40 to 20 via the buttons alone is a bad UX (20 clicks). Typing shows plain ASCII digits (matches the pre-redesign `PlanEnrollForm` inputs' existing convention, not Eastern Arabic numerals) with a local draft state that only commits (clamped to an integer ≥ `min`) on blur/Enter, so a mid-edit empty field doesn't clamp on every keystroke.
