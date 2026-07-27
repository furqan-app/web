# Daily Awrad UI

**Type:** feature
**Date:** 2026-07-27
**Status:** implemented
**Trello:** #149 — https://trello.com/c/lOqrIG3L

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
