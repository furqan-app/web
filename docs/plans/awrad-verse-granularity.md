# Verse & Fractional-Page Granularity for Awrad

**Type:** feature
**Date:** 2026-08-02
**Status:** implemented
**Trello:** #181 — https://trello.com/c/ZJEicZhz

## Summary

The plan engine (`docs/plans/awrad-learning-plans.md`, ADR 0030) is page-canonical: every quantity is whole pages/day. Users want finer granularity — a fixed verse count/day ("3 ayah/day") or a fractional-page pace ("half a page/day") — without pages disappearing as an option. Unit becomes a **per-enrollment** choice (`"page"` or `"verse"`), not a global cutover: existing page-unit enrollments and their history are untouched; the engine gains a parallel verse-native math path. See [ADR 0037](../architecture/adr/0037-plan-engine-per-enrollment-verse-unit.md) for the page-vs-verse-canonical trade-off this supersedes from ADR 0030.

## Approach

**Unit choice.** `PlanProgressEntry.unit` already exists (`String @default("page")`, added in the foundation plan for exactly this). `PlanUnit` widens to `"page" | "verse"`. At enroll time the user picks a unit per track (or one unit for the whole template, per the enroll-form UX below); it's written into `UserPlanParams` and used to interpret every `quantities` override and to pick which math branch the engine runs for that track, for the life of the enrollment. Editing a plan (`PATCH`) can change quantities but not unit — switching units means a fresh enrollment (mirrors the existing "no retro-apply" constraint).

**Verse-index module** (`app/lib/plans/verse-index.ts`, new, pure, zero DB calls) — built entirely from two already-committed static files:
- `public/quran/chapters.json` (114 surahs, `verses_count` each) → cumulative sums give verse-ordinal ↔ (surah, verse-in-surah) math. `MUSHAF_LAST_VERSE = 6236` (sum of all `verses_count`), `MUSHAF_FIRST_VERSE = 1`.
- `public/quran/verse-pages/2.json` (mushaf 2 = `DEFAULT_MUSHAF_ID`, verse_key → page_number) → the page for any verse ordinal.

Exports (module-scope cached, same convention as `app/hooks/get-surahs.ts`):
- `pageOfVerse(ordinal: number): number`
- `pageVerseCount(page: number): number`
- `pageFirstVerseOrdinal(page: number): number`
- `pageLastVerseOrdinal(page: number): number`

**Quantity shape widens.** `UserPlanParams.quantities[trackKey]` becomes:
```
number                              // fixed units/day, in the track's chosen unit (pages or verses)
| { unit: "pages"; amount: number } // only valid on a verse-unit track: fractional/whole pages,
                                     // recomputed live each day from the current page's verse count
```
A plain `number` on a page-unit track means pages/day (today's behavior, unchanged). A plain `number` on a verse-unit track means verses/day. The `{unit:"pages"}` form only makes sense on a verse-unit track (that's how "half a page" produces a sub-page-precision range); a page-unit track never needs it since its native granularity is already whole pages.

**Fractional-page resolution (confirmed with user):** "half a page" always means half of *whatever page today's cursor starts on*, recomputed fresh every day — not locked at enroll time, not "remaining verses on the page". `round(amount × pageVerseCount(pageOfVerse(cursorStart)))`, clamped to ≥1.

**Engine changes** (`app/lib/plans/engine.ts`) — every rule kind that currently does page-integer math gets a parallel verse-integer branch, selected by the track's stored unit (read off `PlanProgressEntry.unit` / `UserPlanParams`, never inferred from magnitude):

| Rule kind | Page-unit (unchanged) | Verse-unit (new) |
|---|---|---|
| `fixed_cycle` | range `1–604`, wrap at 604 | range `1–6236`, wrap at 6236 |
| `cursor_advance` | `targetStart`/`targetEnd` = pages (from juz picker via `getJuzPageRange`) | same juz picker, then converted to `pageFirstVerseOrdinal(startPage)`/`pageLastVerseOrdinal(endPage)` at enroll/edit time |
| `trailing_window` | `windowSize` = pages | `windowSize` = verses (verse-equivalent constant, see below) |
| `completed_cycle` | `excludeTrailingWindow`/quantity = pages | verse-equivalent constants |
| `lookahead` | `repetitions` = a count, unit-agnostic | unchanged — repetitions isn't a range size |

`unitsPerDay` gains the `{unit:"pages"}` branch: resolve `pageVerseCount(pageOfVerse(cursorStart))` before applying the multiplier; everything downstream (clamping, calendar-policy spreading) operates on the resulting verse count exactly as it does today for a plain number.

**husun verse-equivalent defaults.** No authoritative source exists (same caveat as the original page defaults). Using the mushaf average (6236 verses / 604 pages ≈ 10.3 verses/page, rounded per constant):

| Track | Page default | Verse-equivalent default |
|---|---|---|
| `tilawa` (fixed_cycle) | 20 pages/day | 206 verses/day |
| `hifz` (cursor_advance) | 1 page/day | 10 verses/day |
| `qareeb` (trailing_window) | windowSize 20 pages | windowSize 206 verses |
| `baeed` (completed_cycle) | 1 page/day, exclude 20 | 10 verses/day, exclude 206 |
| `tahdeer` (lookahead) | 10 repetitions | unchanged (not a range) |

All still overridable per-enrollment via `quantities`, same as today — this table is only the seed default for a verse-unit husun enrollment.

**Enroll form (`PlanEnrollForm.tsx` / `PlansBrowseDialog.tsx`).** Add a unit toggle (pages / verses) per quantity field, using `QuantityStepper`. Pages mode allows fractional steps (0.5 increments, e.g. `0.5, 1, 1.5, 2, …`); verses mode is whole-number-only (existing stepper behavior, min 1). Toggling the unit resets the field to that unit's own sensible default (e.g. reading defaults to 5 pages or ~50 verses) rather than reinterpreting the same number under a new unit.

**Display.** `PlanAssignmentRow` and friends already render `rangeStart`–`rangeEnd`; for a verse-unit track, render as a verse reference (`surah:verse–surah:verse`, via `pageOfVerse`'s inverse lookups already in `verse-index.ts` — reuse the ordinal↔(surah,verse) math) instead of a page number, and the `/pages/{rangeStart}` deep-link resolves the *page* for that verse ordinal (`pageOfVerse(rangeStart)`) so tapping a verse-unit row still lands the reader on the right page.

## Decision Tree / Algorithm

**Which math branch does a track use?**

| Condition | Behavior |
|---|---|
| `PlanProgressEntry.unit === "page"` for this track (or no entries yet and enrollment chose "page") | All range/cursor/window math in page integers — byte-for-byte today's engine, unchanged |
| `unit === "verse"` | Same rule-kind algorithms, operating on verse ordinals; whole-mushaf bounds become `1–6236`; juz targets are page→verse-converted once at enroll/edit time |

**Fractional-page quantity resolution (verse-unit tracks only), evaluated fresh each day:**

| Input | Resolution |
|---|---|
| `quantities[track] = N` (plain number) | `N` verses/day, no page lookup needed |
| `quantities[track] = { unit: "pages", amount: A }` | `round(A × pageVerseCount(pageOfVerse(cursorStart)))`, clamped ≥1 — `cursorStart` is the verse ordinal the day's assignment would start from (post-wrap, post-`lastEnd+1`), so it reflects whichever page today actually begins on |

## Verified Test Cases

Walked through with the user (2026-08-02):

1. **Plain verse quantity, daily-wird, verse-unit**: enrolled today, 6 verses/day, no history → day 1 = verse ordinals 1–6 (1:1–1:6). Day 2 (day 1 not yet checked off, re-queried) → still 1–6 (`todayEntry` null, no advance — matches existing today-entry-echo behavior). After check-off, day 2 → 7–12 (1:7–2:5), correctly crossing the surah boundary since verse ordinals are surah-agnostic integers.
2. **Fractional page, dynamic recompute**: enrolled starting page 1 (Al-Fatiha, 7 verses), 0.5 pages/day → day 1 quantity = `round(7×0.5) = 4` → assignment 1–4. Day 2, cursor at verse 5 (still page 1, which has 7 verses total) → quantity = `round(7×0.5) = 4` again (always the *full* page's count, not remaining) → range 5–8, rolling 1 verse onto page 2 — matches the confirmed "half of the page's total count, may spill onto the next page" rule.
3. **husun, verse-unit, hifz cursor_advance with juz target**: user picks juz 30 (pages 582–604) via the slider; resolved server-side to page range, then converted to verse ordinals `pageFirstVerseOrdinal(582)`–`pageLastVerseOrdinal(604)` and stored in `params.targetStart/targetEnd` — `cursor_advance` then runs identically to the page-unit case, just in verse space.
4. **Mixed portfolio, no cross-contamination**: a user with an existing page-unit `daily-wird` enrollment (started before this feature) enrolls in a *second*, verse-unit `listening-wird`. Each enrollment's `PlanProgressEntry` rows carry their own `unit`; `deriveAssignments` is called once per enrollment (existing per-plan loop in `/api/plans/today`), so there is no path where one call mixes units — confirmed by inspection of the existing `today` route's per-`UserPlan` iteration.
5. **Editing quantities without changing unit**: `PATCH` on a verse-unit `daily-wird` enrollment changes verses/day from 6 to 10 — allowed (mirrors today's quantity-edit behavior). Attempting to also flip the unit itself is rejected (`422`) — the plan doc's constraint that unit is enrollment-lifetime-fixed, not a "field like any other."

## Files to Change

- `app/constants/plans.ts` — `PlanUnit` widens to `"page" | "verse"`; new `PlanQuantity = number | { unit: "pages"; amount: number }`; `UserPlanParams` gains `quantities?: Record<string, PlanQuantity>` and a single enrollment-wide `unit?: PlanUnit` (not per-track — see Decisions Made); `toVerseEquivalent(pages)` helper for husun's verse-equivalent defaults.
- `app/lib/plans/verse-index.ts` (new) — `pageOfVerse`, `verseKeyOfOrdinal`, `pageVerseCount`, `pageFirstVerseOrdinal`, `pageLastVerseOrdinal`, all reading the two static JSON files (module-scope cached, synchronous `fs.readFileSync`).
- `app/lib/plans/verse-index.test.ts` (new) — round-trip tests, boundary pages (1, 604), total-verse-count sanity (`MUSHAF_LAST_VERSE === 6236`), out-of-range throws.
- `app/lib/plans/engine.ts` — every rule-kind branch gains the verse-unit path (`fixedCycleBounds`, `cursorAdvanceTarget`, `unitsPerDay`'s `{unit:"pages"}` resolution) reading from `verse-index.ts`; `unit` read once per `deriveAssignments` call (`params.unit ?? "page"`). Existing page-unit branches verified unchanged (42 pre-existing tests pass with zero edits).
- `app/lib/plans/engine.test.ts` — new "verse-unit (ADR 0037)" describe block covering all 5 rule kinds in verse mode plus the fractional-page live-recompute case.
- `app/lib/plans/validate-params.ts` (`resolvePlanParams`) — accept enrollment-wide `params.unit`; convert juz-picked target ranges to verse ordinals when resolved; validate `{unit:"pages"}` quantity overrides (positive finite number, only when `unit === "verse"`); reject a `PATCH` whose resolved unit differs from the plan's existing unit (`422`).
- `app/constants/plans.ts` — husun's verse-equivalent default constants (table above), applied by `engine.ts`'s `toVerseEquivalent` conversion at read time (no separate stored table).
- `app/components/plans/PlanEnrollForm.tsx` — a 3-way pages/verses/fraction segmented control (enrollment-wide, not per-field — see Decisions Made); "fraction" mode allows 0.5 steps in `QuantityStepper`; edit mode locks the control to the plan's existing unit group.
- `app/components/plans/QuantityStepper.tsx` — `step` prop (0.5 for fractional-pages mode, 1 otherwise) and an optional `unitLabel` display suffix.
- `app/components/plans/PlanAssignmentRow.tsx` — verse-unit rows render `surah:verse–surah:verse` and resolve their `/pages/{page}` link + playback bounds via the new client verse index instead of `usePageVerseBounds`.
- `app/hooks/use-plan-verse-index.ts` (new) — client-side (`fetch`-based) mirror of `verse-index.ts`'s ordinal↔page↔verse-key math, since the server-only module can't be imported into a client component.
- `messages/ar.json` / `messages/en.json` — `plans.versesPerDay`, `plans.quantityMode.{pages,verses,fraction}`.
- `docs/architecture/adr/0037-plan-engine-per-enrollment-verse-unit.md` — written.
- `docs/architecture/DECISIONS.md` — updated.
- `docs/architecture/COMPONENTS.md` — `PlanEnrollForm` and `PlanAssignmentRow` entries updated for the new unit toggle and verse-unit display/link behavior.

## Constraints

- All ADR 0030 constraints not explicitly superseded here still hold: derived-at-read-time (never materialize schedule rows), append-only progress log, online-only check-off, no cross-domain FK, source-bearing rule kinds only reference `fixed_cycle`/`cursor_advance` tracks.
- A track's unit is fixed for the life of its enrollment. No mid-plan unit switching; no migration of existing rows.
- `verse-index.ts` stays a pure, zero-DB-call module — reads only the two committed static JSON files, cached at module scope. Do not add a `quranPrisma` call here even for a "just this once" lookup.
- The `{unit:"pages"}` fractional quantity form is only valid on verse-unit tracks — reject it at validation time on a page-unit track (redundant: page-unit tracks are already whole-page precision).
- husun's verse-equivalent constants are a documented best-effort approximation (average verses/page), not a sourced table — same framing and same editability as the original page defaults.

## What NOT to Do

- Do not migrate existing `PlanProgressEntry` rows to verse ordinals — they stay page-unit forever, unchanged (ADR 0037 supersedes the earlier global-cutover approach explicitly for this reason).
- Do not make unit an editable `PATCH` field — changing pace/quantity is fine, changing unit requires a new enrollment.
- Do not add a new Quran-data generator script — `chapters.json` and `verse-pages/2.json` already exist and already cover everything `verse-index.ts` needs.
- Do not lock "half a page" to a fixed verse count at enroll time — it must recompute from the actual current page every day (confirmed, reverses an earlier draft of this plan).
- Do not derive husun's verse-equivalent constants by scaling off the entered hifz pace — keep them static, editable defaults, mirroring the existing page-default precedent (`docs/plans/daily-awrad-ui.md`'s "Do not derive tilawa/baeed quantities from the entered hifz pace").
- Do not infer a track's unit from the magnitude of stored numbers (e.g. "large number must be verses") — always read the explicit `unit` column/param.

## Decisions Made

- Unit (`page` | `verse`) is a per-enrollment choice, not a global engine cutover — supersedes ADR 0030's page-canonical decision via ADR 0037, chosen specifically to avoid migrating existing `PlanProgressEntry` data.
- Verse-ordinal/page-lookup math is built on the already-committed static `chapters.json` + `verse-pages/2.json`, not a new generated data file and not live DB queries — keeps the engine's zero-DB-call purity.
- "N ayah/day" is a fixed daily quantity (not a randomized min–max range).
- "Half a page/day" is a fractional-page quantity resolved fresh every day from the actual page the day's cursor starts on (not locked at enroll time, not based on remaining verses on that page).
- Enroll-form UX: an explicit pages/verses toggle per quantity field, not a verses-only input.
- husun's page-based rule constants get a parallel verse-equivalent default table (average verses/page), same "unsourced, editable" framing as the original husun sign-off.

**Implementation-time clarifications (2026-08-08):**
- `UserPlanParams.unit` is a single enrollment-wide field, not a per-track record — every track in one enrollment shares the same unit (`deriveAssignments` reads `params.unit ?? "page"` once). The plan's draft text discussed "per track" phrasing during scoping, but nothing in the verified test cases required different tracks within one enrollment to disagree on unit, and a single field is simpler to validate/lock on edit. `husun`'s hifz/tilawa/baeed fields all move together.
- The enroll form implements the "pages or verses" toggle as a 3-way segmented control — **pages** / **verses** / **fraction of a page** — rather than a per-field toggle. "Fraction" writes the `{unit:"pages",amount}` quantity form for every editable field in the template at once; switching modes resets all fields to that mode's own default (per the plan's existing "reset, don't reinterpret" rule). Editing an existing plan locks the control to its current unit group (pages-only, or verses/fraction together) since PATCH rejects a unit change — switching between "verses" and "fraction" during an edit is allowed (same underlying unit).
- Client-side verse-key display (`PlanAssignmentRow`, verse-unit rows) and the `/pages/{page}` deep-link resolve through a new `app/hooks/use-plan-verse-index.ts` — a browser-fetch mirror of `app/lib/plans/verse-index.ts`'s algorithm (same two static JSON assets, fetched over HTTP instead of `fs`, cached via React Query `staleTime: Infinity`) — since the server-only module can't be imported into a client component.

**Post-implementation review fixes (2026-08-09, `/review-fq-work` opus pass before shipping):** the initial implementation only changed the engine, validation, and the "today" UI surfaces — it missed several call sites that also assume page semantics, all fixed before merge:
- `app/api/plans/[planId]/progress/route.ts` POST validated every check-off range against `MUSHAF_FIRST_PAGE`/`MUSHAF_LAST_PAGE` unconditionally, rejecting any verse-unit assignment past ordinal 604 with a 422 — the plan's own worked example (verse 205–410+ for husun's tilawa at 206 verses/day) would have been un-checkable from day one. Now reads the plan's own `params.unit` and validates against the matching bound; also now writes `PlanProgressEntry.unit` (previously never written, so every row silently defaulted to `"page"` regardless of the enrollment's real unit).
- `app/api/plans/route.ts`'s `withTargetJuz` called the page-based `getPageJuzNumber` directly on `targetStart`/`targetEnd`, which are verse ordinals for a verse-unit husun enrollment — converts through `pageOfVerse` first now. Un-fixed, this would have corrupted a verse-unit husun plan's target range on any quantity-only edit (the edit form always resends the juz fields it was prefilled with).
- `app/lib/plans/assignment-range.ts`'s `isPageInAssignmentRange` (the reader widget's "in range" highlight) compared a page number directly against verse-ordinal ranges. Now takes an optional `pageVerseSpan` (the page's own verse-ordinal span, from the client verse index) and does an interval-overlap check for verse-unit assignments.
- `app/components/plans/MyPlansList.tsx`'s history timeline rendered every entry as `"Page {range}"` regardless of unit. Now branches on the per-entry `unit` (added to `GET /api/plans/:planId/progress`'s response) and renders `surah:verse` for verse-unit rows.
- `app/hooks/use-plan-verse-index.ts` was rewritten to reuse the existing `fetchChapters`/`fetchVersePages` helpers (was re-fetching the same static files under a second React Query key) and to accept an `enabled` flag so page-unit rows — the majority — never build the 6236-entry index at all; it also gained `pageVerseSpan` for the highlight fix above. `PlanAssignmentRow`'s loading/error state no longer falls back to treating a raw verse ordinal as a page number for its deep-link — it renders inert (no link) until the index resolves.
- Minor: `engine.ts`'s fractional-page resolution now guards `unit === "verse"` before treating a cursor position as a verse ordinal; removed an unused `QuantityStepper` prop; fixed a stale DECISIONS.md sentence that still said the engine was "page-canonical only"; corrected ADR 0037's own description of the unit model (it originally described a per-track `units` record that was never built — see the enrollment-wide clarification above).
