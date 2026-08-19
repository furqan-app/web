# Verse & Fractional-Page Granularity for Awrad

**Type:** feature
**Date:** 2026-08-02
**Status:** implemented
**Trello:** #181 — https://trello.com/c/ZJEicZhz

## Summary

The plan engine (`docs/plans/awrad-learning-plans.md`, ADR 0030) is page-canonical: every quantity is whole pages/day. Users want finer granularity — a fixed verse count/day ("3 ayah/day") or a fractional-page pace ("half a page/day") — without pages disappearing as an option. Unit becomes a **per-track** choice (`"page"` or `"verse"`) for each independently-advancing track, not a global cutover: existing page-unit enrollments and their history are untouched; the engine gains a parallel verse-native math path. See [ADR 0038](../architecture/adr/0038-plan-engine-per-enrollment-verse-unit.md) for the page-vs-verse-canonical trade-off this supersedes from ADR 0030.

**2026-08-19 widening:** the first shipped cut (still unmerged at the time) made unit a single enrollment-wide field. Revisited for max per-user flexibility before merge (no production data existed yet, so no migration cost): unit is now chosen **independently per `fixed_cycle`/`cursor_advance` track** — husun's `tilawa` (reading pace) and `hifz` (memorization pace) can each be in a different unit within the same enrollment. `tahdeer`/`qareeb`/`baeed` (all `sourceTrack: "hifz"`) always inherit `hifz`'s resolved unit rather than getting their own choice — their range math slices `hifz`'s own logged numbers directly, so a separate unit for them would be a display relabeling of someone else's data, not a real choice. `tahdeer`'s repetitions and `qareeb`'s windowSize also became user-editable in this pass (previously template-fixed constants), as plain-integer overrides in their inherited unit — never the fractional-page form, which stays reserved for daily-pace quantities. See "Decisions Made" below for the two verified design questions this raised.

## Approach

**Unit choice.** `PlanProgressEntry.unit` already exists (`String @default("page")`, added in the foundation plan for exactly this). `PlanUnit` widens to `"page" | "verse"`. At enroll time the user picks a unit **per independent track** (`fixed_cycle`/`cursor_advance` — e.g. husun's `tilawa` and `hifz` separately); it's written into `UserPlanParams.trackUnits` (`Record<trackKey, PlanUnit>`) and used to interpret that track's `quantities` override and to pick which math branch the engine runs, for the life of the enrollment. A dependent track (`trailing_window`/`completed_cycle`/`lookahead`) never appears in `trackUnits` — it always inherits its `sourceTrack`'s resolved unit (`resolveTrackUnit`, `constants/plans.ts`), since its range math slices that source's own logged numbers directly and could never sensibly disagree with them. Editing a plan (`PATCH`) can change quantities but not any track's unit — switching units means a fresh enrollment (mirrors the existing "no retro-apply" constraint).

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

**Enroll form (`PlanEnrollForm.tsx` / `PlansBrowseDialog.tsx`).** A template's editable quantity fields are grouped by `UNIT_GROUPS` (new, `PlanEnrollForm.tsx`): each group has one `independentTrackKey` (the track the pages/verses/fraction toggle actually controls) and zero or more `dependentTrackKeys` (fields that render in the group and share its unit label, but never get their own toggle). `daily-wird`/`listening-wird` have one group each (unchanged UX, single toggle). `husun` has two: `tilawa` alone, and `hifz` with `baeed`/`tahdeer`/`qareeb` as dependents — so the form shows two independent pages/verses/fraction toggles, one for reading pace and one for the whole memorization+review+lookahead cluster. `tahdeer`'s repetitions field is unit-agnostic (a plain count) even inside the `hifz` group — it never takes the fraction step or a verses/pages suffix, just "repetitions". `qareeb`'s windowSize field takes the group's page-or-verse unit but never its fraction mode (see "Fraction support" below). Toggling a group's unit resets every field in that group (except repetitions fields) to that mode's own sensible default, rather than reinterpreting the same number under a new unit.

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

- `app/constants/plans.ts` — `PlanUnit` widens to `"page" | "verse"`; new `PlanQuantity = number | { unit: "pages"; amount: number }`; `UserPlanParams` gains `quantities?: Record<string, PlanQuantity>` and (2026-08-19 widening) `trackUnits?: Record<string, PlanUnit>`, keyed per independent track (see Decisions Made — this replaced an initial single enrollment-wide `unit` field before merge); `toVerseEquivalent(pages)` helper for husun's verse-equivalent defaults; `resolveTrackUnit`/`independentTrackUnit`/`independentTrackKeys` helpers.
- `app/lib/plans/verse-index.ts` (new) — `pageOfVerse`, `verseKeyOfOrdinal`, `pageVerseCount`, `pageFirstVerseOrdinal`, `pageLastVerseOrdinal`, all reading the two static JSON files (module-scope cached, synchronous `fs.readFileSync`).
- `app/lib/plans/verse-index.test.ts` (new) — round-trip tests, boundary pages (1, 604), total-verse-count sanity (`MUSHAF_LAST_VERSE === 6236`), out-of-range throws.
- `app/lib/plans/engine.ts` — every rule-kind branch gains the verse-unit path (`fixedCycleBounds`, `cursorAdvanceTarget`, `unitsPerDay`'s `{unit:"pages"}` resolution) reading from `verse-index.ts`; unit resolved per track via `resolveTrackUnit`/`independentTrackUnit` (2026-08-19: replaced the single `params.unit ?? "page"` read). Existing page-unit branches verified unchanged. `resolveFixedQuantity`/`resolveRepetitions` (2026-08-19) make `qareeb`'s windowSize and `tahdeer`'s repetitions overridable via `params.quantities`, same pattern as `unitsPerDay`'s default-vs-override resolution.
- `app/lib/plans/engine.test.ts` — "verse-unit (ADR 0038)" describe block covering all 5 rule kinds in verse mode, the fractional-page live-recompute case, and (2026-08-19) independent per-track units plus the two new overridable quantities.
- `app/lib/plans/validate-params.ts` (`resolvePlanParams`) — now takes `template` (to know which track keys are independently unit-choosable and which is the `cursor_advance` target); validates `params.trackUnits` per independent track key; converts juz-picked target ranges to verse ordinals using the `cursor_advance` track's own resolved unit; validates `{unit:"pages"}` quantity overrides (only on the fractional-eligible tracks, only when that track's resolved unit is `"verse"`); rejects a `PATCH` that changes any independent track's unit (`422`).
- `app/constants/plans.ts` — husun's verse-equivalent default constants (table above), applied by `engine.ts`'s `toVerseEquivalent` conversion at read time (no separate stored table).
- `app/components/plans/PlanEnrollForm.tsx` — a 3-way pages/verses/fraction segmented control **per unit group** (2026-08-19: was enrollment-wide, one toggle for the whole template — see Decisions Made); "fraction" mode allows 0.5 steps in `QuantityStepper` for non-repetitions fields; edit mode locks each group's control to that group's existing unit.
- `app/components/plans/QuantityStepper.tsx` — `step` prop (0.5 for fractional-pages mode, 1 otherwise).
- `app/components/plans/PlanAssignmentRow.tsx` — verse-unit rows render `surah:verse–surah:verse` and resolve their `/pages/{page}` link + playback bounds via the new client verse index instead of `usePageVerseBounds`.
- `app/hooks/use-plan-verse-index.ts` (new) — client-side (`fetch`-based) mirror of `verse-index.ts`'s ordinal↔page↔verse-key math, since the server-only module can't be imported into a client component.
- `messages/ar.json` / `messages/en.json` — `plans.versesPerDay`, `plans.quantityMode.{pages,verses,fraction}`.
- `docs/architecture/adr/0038-plan-engine-per-enrollment-verse-unit.md` — written.
- `docs/architecture/DECISIONS.md` — updated.
- `docs/architecture/COMPONENTS.md` — `PlanEnrollForm` and `PlanAssignmentRow` entries updated for the new unit toggle and verse-unit display/link behavior.
- (2026-08-19) `app/api/plans/route.ts` — `POST` passes `template` to `resolvePlanParams`; `withTargetJuz` resolves the `cursor_advance` track's own unit (via `getPlanTemplate` + `independentTrackUnit`) instead of a single `item.params.unit`.
- (2026-08-19) `app/api/plans/[planId]/route.ts` — `PATCH` looks up the plan's template, reads `existingTrackUnits` from `plan.params.trackUnits`, passes both to `resolvePlanParams`.
- (2026-08-19) `app/api/plans/[planId]/progress/route.ts` — the check-off range bound and the `PlanProgressEntry.unit` written now come from `resolveTrackUnit(template, params, track_key)`, not a single plan-wide unit.

## Constraints

- All ADR 0030 constraints not explicitly superseded here still hold: derived-at-read-time (never materialize schedule rows), append-only progress log, online-only check-off, no cross-domain FK, source-bearing rule kinds only reference `fixed_cycle`/`cursor_advance` tracks.
- A track's unit is fixed for the life of its enrollment. No mid-plan unit switching; no migration of existing rows.
- `verse-index.ts` stays a pure, zero-DB-call module — reads only the two committed static JSON files, cached at module scope. Do not add a `quranPrisma` call here even for a "just this once" lookup.
- The `{unit:"pages"}` fractional quantity form is only valid on the three pace tracks (`reading`/`listening`/`tilawa`/`hifz`/`baeed`) when their resolved unit is `"verse"` — reject it at validation time otherwise (page-unit tracks are already whole-page precision; `tahdeer`/`qareeb` are plain-integer-only regardless of unit).
- husun's verse-equivalent constants are a documented best-effort approximation (average verses/page), not a sourced table — same framing and same editability as the original page defaults.
- (2026-08-19) A dependent track (`trailing_window`/`completed_cycle`/`lookahead`) never gets its own `trackUnits` entry and never gets its own enroll-form unit toggle — it always inherits its `sourceTrack`'s resolved unit. Do not add a per-dependent-track unit picker; the range values it displays/writes are its source's own logged numbers, not an independently convertible quantity.

## What NOT to Do

- Do not migrate existing `PlanProgressEntry` rows to verse ordinals — they stay page-unit forever, unchanged (ADR 0038 supersedes the earlier global-cutover approach explicitly for this reason).
- Do not make unit an editable `PATCH` field — changing pace/quantity is fine, changing unit requires a new enrollment.
- Do not add a new Quran-data generator script — `chapters.json` and `verse-pages/2.json` already exist and already cover everything `verse-index.ts` needs.
- Do not lock "half a page" to a fixed verse count at enroll time — it must recompute from the actual current page every day (confirmed, reverses an earlier draft of this plan).
- Do not derive husun's verse-equivalent constants by scaling off the entered hifz pace — keep them static, editable defaults, mirroring the existing page-default precedent (`docs/plans/daily-awrad-ui.md`'s "Do not derive tilawa/baeed quantities from the entered hifz pace").
- Do not infer a track's unit from the magnitude of stored numbers (e.g. "large number must be verses") — always read the explicit `unit` column/param.
- (2026-08-19) Do not give `qareeb`/`tahdeer` their own independent unit choice — their numbers are `hifz`'s own logged data; a separate toggle would just relabel it, not change what's stored, and risks the UI implying a conversion that doesn't exist.
- (2026-08-19) Do not let `qareeb`'s windowSize or `tahdeer`'s repetitions take the `{unit:"pages"}` fractional form — fractional pacing is a *daily-recompute* mechanism (ADR 0038's core "half a page" behavior) and doesn't mean anything for a review-window size or a repeat count.

## Decisions Made

- Unit (`page` | `verse`) is a per-**track** choice (2026-08-19; originally shipped as per-enrollment, widened before merge — see below), not a global engine cutover — supersedes ADR 0030's page-canonical decision via ADR 0038, chosen specifically to avoid migrating existing `PlanProgressEntry` data.
- Verse-ordinal/page-lookup math is built on the already-committed static `chapters.json` + `verse-pages/2.json`, not a new generated data file and not live DB queries — keeps the engine's zero-DB-call purity.
- "N ayah/day" is a fixed daily quantity (not a randomized min–max range).
- "Half a page/day" is a fractional-page quantity resolved fresh every day from the actual page the day's cursor starts on (not locked at enroll time, not based on remaining verses on that page).
- Enroll-form UX: an explicit pages/verses toggle per unit group, not a verses-only input.
- husun's page-based rule constants get a parallel verse-equivalent default table (average verses/page), same "unsourced, editable" framing as the original husun sign-off.

**Widening decisions (2026-08-19, before merge — issue #262 / PR 195 review):**
- **Derived-track unit inheritance, not independent choice.** `tahdeer`/`qareeb`/`baeed` (all `sourceTrack: "hifz"`) automatically use `hifz`'s resolved unit — no separate unit picker for them. Their range math (`source.minStart`/`source.lastEnd` slicing) reads `hifz`'s own logged numbers directly; a track that could disagree with its source's unit would just be redisplaying the same numbers under a label that doesn't match what's stored. Confirmed over the alternative (fully independent per-track units with live conversion) — rejected as correctness risk with no real benefit, since "the range" is definitionally `hifz`'s own history.
- **Plain-integer-only for the newly-editable `tahdeer`/`qareeb` quantities.** `repetitions` (tahdeer) is unit-agnostic already — a count, never converted by page/verse scale. `windowSize` (qareeb) is a plain override in whichever unit `hifz` natively resolves to — never the `{unit:"pages"}` fractional form, which stays reserved for the three daily-pace tracks where "live recompute from today's page" has meaning.
- **Storage shape: `params.trackUnits` replaces `params.unit` outright**, rather than keeping `params.unit` as an enrollment-wide default with a `trackUnits` override map. Chosen because PR 195 was still unmerged when this widening happened — zero production enrollments existed under the old `params.unit` shape, so there was no backward-compatibility cost to a clean replacement, and a single source of truth (`trackUnits` only) is simpler to validate/lock on `PATCH` than a default-plus-override precedence chain.

**Worked example (verified):** husun enrollment with `tilawa` in pages (20/day, unchanged) and `hifz` in fraction mode (0.5 pages/day, verse-unit). Day 1: `tilawa` → pages 1–20. `hifz` cursor starts at verse 1 (page 1, Al-Fatiha, 7 verses) → `round(0.5×7)=4` → verses 1–4. `tahdeer` (repetitions overridden to 5) → verses 5–8, `repetitions: 5`, unit **verse** (inherited from `hifz`, not its own setting). `qareeb` (windowSize overridden to 15, still no `hifz` history on day 1) → absent, same as today's "no history yet" behavior; once history exists, window = last 15 **verses** (plain integer, `hifz`'s unit, not fractional even though `hifz` itself is in fraction mode). `baeed` → same pattern as before, pace entered in verses. `PlanProgressEntry.unit` written per track at check-off: `page` for `tilawa`'s rows, `verse` for `hifz`/`tahdeer`/`qareeb`/`baeed`'s rows, same enrollment, no cross-contamination.

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
- Minor: `engine.ts`'s fractional-page resolution now guards `unit === "verse"` before treating a cursor position as a verse ordinal; removed an unused `QuantityStepper` prop; fixed a stale DECISIONS.md sentence that still said the engine was "page-canonical only"; corrected ADR 0038's own description of the unit model (it originally described a per-track `units` record that was never built — see the enrollment-wide clarification above).
