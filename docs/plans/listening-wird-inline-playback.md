---
title: "Listening Wird: Inline Playback on Assignment Rows"
type: feature
date: 2026-07-30
status: implemented
area: recitation
---

# Listening Wird: Inline Playback on Assignment Rows

## Summary

`PlanAssignmentRow` (`app/components/plans/PlanAssignmentRow.tsx`) currently wraps every track's row — listening or otherwise — in a `Link` to `/pages/{rangeStart}`, so a listening-wird track only navigates to the reader instead of actually starting playback. The foundation plan (`docs/plans/awrad-learning-plans.md`, Verified Test Case #3) originally envisioned deep-linking listening tracks into the existing recitation engine (ADR 0021); the daily-awrad-ui.md implementation shipped the simpler navigate-only version instead. This task closes that gap: any `activity: "listen"` row (`listening-wird`'s own track, and husun's `tahdeer` track) gets an inline play/pause control that plays the assignment's exact page range directly through `RecitationContext`, honoring the track's configured repeat count (husun `tahdeer`'s `repetitions: 10`) as a whole-range repeat — without touching the user's persisted recitation settings.

The completion nudge (toast inviting a check-off once playback finishes) is explicitly out of scope — tracked separately as Trello #161, since no toast/notification system exists in the repo yet and that's its own decision to make.

**Settings-sheet indicator (added after manual testing, 2026-07-30):** the override never touched `settings`, so `RecitationSettingsSheet` — which only ever renders the user's own persisted `settings` — looked completely disconnected from an active wird session: opening it mid-playback showed unrelated, possibly stale values (e.g. a leftover "custom" stop point from earlier testing) with nothing indicating a wird override was actually driving playback. This is closed with a small read-only banner in the sheet **plus** disabling the two controls the override actually supersedes (Stop-at and Repeat-whole-range) while it is active — the banner alone did not read as strong enough differentiation (2026-08-01, deliberate reversal of the original "fully editable, no disabled states" constraint — see Constraints and Revision History).

## Approach

**The core problem:** `RecitationContext`'s existing stop-point scopes (`page`/`surah`/`rub`/`hizb`/`juz`/`none`) all resolve from the *starting verse's own* structural boundary. A wird assignment's range (e.g. pages 11–15 at 5 pages/day) is an arbitrary page span that doesn't align to any of those — so playing a wird needs an explicit stop target, not one of the existing scopes.

**Page-bounds resolution.** Between planning and implementation, `main` gained ADR 0033 (mushaf editions): page numbers became edition-relative, and a `GET /api/quran/pages/[pageId]/bounds?mushaf=X` route was added (resolving a page's last verse via `mushaf_word_layouts`, for the "custom" stopPoint's page-type "to" target). Rather than the originally-planned standalone `verse-bounds` route (which would have read `Verse.page_number` directly — now only correct for the default edition, and duplicating the existing route's last-verse half), that route was extended to also return `firstVerseKey`. Plan assignments (`rangeStart`/`rangeEnd`) are page-canonical against `DEFAULT_MUSHAF_ID` only (D3 of the Awrad & Learning Plans Engine decision predates ADR 0033) — always resolved against the default edition, not the reader's currently-active one. A page's first/last word can belong to a verse that starts on the previous page or ends on the next, so `firstVerseKey`/`lastVerseKey` can spill one verse past the page boundary — intentional, since audio is addressable per verse, never per word; consecutive wird days can therefore overlap by at most one verse at each seam (accepted).

**`RecitationContext.play` gains an optional override.** `play(verseKey, overrides?)` where `overrides: PlaybackOverride` (`app/types/recitation.ts`) — `{ stopVerseKey: string; stopChapterId: number; rangeRepeatCount: number; id: string; label: string }`. When present, `play` skips `resolveStopTarget` entirely and uses the given stop target directly; a new `rangeRepeatOverrideRef` holds the repeat count. Both existing `resolveRepeatTarget(settings.rangeRepeatCount)` call sites (`handleTimeUpdate`, `handleChapterEnded`) become `resolveRepeatTarget(rangeRepeatOverrideRef.current ?? settings.rangeRepeatCount)`. Existing callers (`RecitationPlayButton`, `MarkModal`) call `play(verseKey)` with no second argument — unaffected. `decideChapterEnd` (`app/utils/recitation.ts`) takes an `isRepeatableRange: boolean` rather than the raw `settings.stopPoint`, computed at the `handleChapterEnded` call site as `rangeRepeatOverrideRef.current != null || settings.stopPoint !== "none"` — an active override is always a bounded, repeatable range regardless of the user's persisted stop-point, and this is byte-identical to the original rule for non-override sessions (fixes a bug where a husun tahdeer override with `repetitions: 10` silently played once and stopped if the user's persisted `stopPoint` happened to be `"none"`).

Two separate mid-session effects end an override's framing, kept deliberately apart because they have different side effects. The existing "stop-point changed" effect (keyed on `settings.stopPoint`/`settings.rangeTo`) re-resolves the stop target from the currently-playing verse *and* clears `rangeRepeatOverrideRef.current = null`. A second effect keyed only on `settings.rangeRepeatCount` clears the override without re-resolving the stop target. **Since 2026-08-01 the sheet disables the Stop-at and Repeat-whole-range controls while an override is active, so neither effect can fire from the UI any more** — they stay as a defensive backstop against any future non-sheet caller of `updateSettings` for those keys, and removing them buys nothing.

**Disabled controls during an override.** While `activeOverride != null`, `RecitationSettingsSheet` disables exactly the two controls the override supersedes: the "Stop at" `RadioGroup` (all 6 pills; `disabled` cascades from the Radix root, and each pill's `<label>` className branch adds the disabled visual state), `CustomRangePicker`'s four controls when `stopPoint === "custom"` was already selected (Page/Verse toggle, page `Input`, `SurahCombobox` trigger, ayah `Input` — via a new `disabled?: boolean` prop), and the "Repeat whole range" `RepeatStepper` (new `disabled?: boolean` prop on both `+`/`-` buttons). Reciter, "Repeat each ayah", playback speed, and pause-between-repeats stay interactive — none touch `rangeRepeatOverrideRef`/`stopVerseKeyRef`. With these disabled, **Stop is the only way to end an override session** (confirmed with the user; no "release" affordance, no explanatory microcopy beyond the existing banner).

**Row UI.** For `activity === "listen"` rows only, the leading icon slot becomes a tappable button (pulled outside the `Link`, mirroring how the check-off button already sits outside the `Link` on the trailing side) showing play/pause/loading state. Non-listen rows are unchanged. The row label continues to link to `/pages/{rangeStart}`.

**Bounds prefetch.** `PlanAssignmentRow` prefetches `usePageVerseBounds(rangeStart)` and `usePageVerseBounds(rangeEnd)` — a thin wrapper around `fetchPageBounds(pageId, DEFAULT_MUSHAF_ID)` (React Query, `staleTime: Infinity` — Quran content is immutable) — on mount, only for listen-activity rows, skipping the second query when `rangeStart === rangeEnd`.

**Settings-sheet indicator.** `overrides` carries `id: string` and `label: string` fields (`id` e.g. `planPlaybackSessionId(planId, trackKey)` from `app/lib/plans/assignment-range.ts`; `label` e.g. `"Listening · Page 1–5"`, built by `PlanAssignmentRow` from the same `trackUi`/`rangeLabel` it already computes for the row). `RecitationContext` exposes this as new React state `activeOverride: { id, label } | null` (state, not a ref — the sheet and the row both need a re-render when it changes), set optimistically right after `setStatus("loading")` in `play()` (so a UI row recognizes "this is my session" during the load window too — see finding 5/re-entry guard below) and cleared on both of `play()`'s failure paths, on `stop()`, and by the two mid-session effects described above. `RecitationSettingsSheet` renders a small read-only banner (icon + `activeOverride.label`) directly under the `SheetTitle` when non-null; nothing else in the sheet changes — every control stays exactly as interactive as before, and touching Stop-at/Repeat still silently ends the override the same way it already does. `PlanAssignmentRow` reads `activeOverride?.id` to decide whether *it* is the active session, rather than comparing `recitedPage` against its own page range — a page-range overlap doesn't mean the override was launched by this row (see Decision Tree).

## Decision Tree / Algorithm

**Tap behavior:**

| State | Tap action |
|---|---|
| Bounds not yet loaded | Button shows a spinner; tap is a no-op |
| Bounds fetch failed | Button shows a retry icon; tap refetches |
| This row is the active session (`activeOverride?.id === planPlaybackSessionId(planId, trackKey)`, `status !== "idle"`) and `status === "playing"` | `togglePlayPause()` → pause |
| This row is the active session and `status === "paused"` | `togglePlayPause()` → resume |
| Otherwise (idle, or a different row/session is active) | `play(firstVerseKey, { stopVerseKey: lastVerseKey, stopChapterId, rangeRepeatCount: assignment.repetitions ?? 1, id: sessionId, label })` — takes over the shared `<audio>` element immediately, same as the existing "play from here" behavior in `MarkModal` |

The active-row check is an **identity** comparison against `activeOverride?.id`, not a page-range overlap — a page range comparison (`recitedPage` inside `rangeStart..rangeEnd`) can't distinguish "this row's own session" from an unrelated session (player bar, `MarkModal`) that happens to be reciting inside the same pages, and two overlapping listen rows (e.g. listening-wird + husun tahdeer sharing a page) would otherwise both claim "active" at once. `PlansWidget`'s separate `inRange` highlight (a progress hint, not a control) intentionally stays page-based — see `app/lib/plans/assignment-range.ts`.

**`play()` override resolution:**

| Call | Behavior |
|---|---|
| `play(verseKey)` (no overrides) | Existing behavior — `resolveStopTarget` resolves from `settings.stopPoint`; `rangeRepeatOverrideRef.current = null` |
| `play(verseKey, { stopVerseKey, stopChapterId, rangeRepeatCount, id, label })` | Skips `resolveStopTarget`; `stopVerseKeyRef`/`stopChapterIdRef` set directly from the override; `rangeRepeatOverrideRef.current = rangeRepeatCount` |
| Mid-session, user changes `settings.stopPoint`/`settings.rangeTo` via the settings sheet | Existing effect recomputes `stopVerseKeyRef`/`stopChapterIdRef` from the current verse; also clears the override |
| Mid-session, user changes `settings.rangeRepeatCount` via the settings sheet | New, separate effect clears the override only — the stop target is left exactly where it was, since a repeat-count edit must not silently move where the range ends |

**`activeOverride` (settings-sheet indicator + row identity) resolution:**

| Event | `activeOverride` |
|---|---|
| `play(verseKey, overrides)` with `overrides.id`/`overrides.label` | Set to `{ id, label }` immediately after `setStatus("loading")` — before the network awaits, so a row recognizes its own session (spinner + re-entry guard) during the load window too |
| `play(verseKey)` — no overrides (existing `MarkModal`/`RecitationPlayerBar` callers) | Cleared to `null` at the same point |
| `play()` fails (`!startTiming`/`!audio`, or the `catch` on a rejected `audio.play()`) | Cleared to `null` — the optimistic set above must not survive a failed attempt, or the sheet keeps showing "Playing: …" with nothing playing |
| Mid-session "stop-point changed" effect fires (user edits Stop-at in the sheet) | Cleared to `null`, alongside the existing `rangeRepeatOverrideRef.current = null` |
| Mid-session "repeat changed" effect fires (user edits Repeat in the sheet) | Cleared to `null` only — stop target untouched |
| `stop()` (Stop button, or the range naturally finishes) | Cleared to `null` |
| `togglePlayPause()` (pause/resume) | Unchanged — indicator stays visible through pause, since the override framing hasn't ended |
| Tap a different listening row while one plays | New `play()` call overwrites `activeOverride` to the new track's `{ id, label }`, same as it already overwrites the stop target |

## Verified Test Cases

Walked through with the user (2026-07-30):

1. **`listening-wird`, pages 11–15, no `repetitions` on that rule kind** (`fixed_cycle` carries no repeat param) → `rangeRepeatCount = assignment.repetitions ?? 1 = 1`. Plays verse-bounds(11).firstVerseKey → verse-bounds(15).lastVerseKey once, then stops.
2. **husun `tahdeer`, single page (e.g. 32), `repetitions: 10`** → `rangeStart === rangeEnd`, one bounds fetch reused for both first and last verse key. Plays the page's range, repeats the whole range 10 times total (via existing `rangeRepeatCount`/`seekToRangeStart` machinery), then stops.
3. **Tap a different listening row while one is playing** → `play()` is called again immediately, takes over the shared `<audio>` element (existing behavior for switching chapters/verses — no session teardown needed first). The previous row's "active" highlight clears once `recitedPage` moves outside its range.
4. **Tap the active row again while playing** → pauses via `togglePlayPause()`; row stays "active" since pause doesn't null `recitedPage` (existing rule) — button shows a resume icon.
5. **Mid-playback, user opens the settings sheet and changes "Stop at"** → session keeps playing but is no longer bounded to the wird's original range/repeat count; falls back to plain settings-driven playback from the current verse. Confirmed: leave the settings sheet fully editable during a wird session (no disabling of stop-point/range-repeat controls). The indicator banner disappears in the same tick.
5b. **Mid-playback, user changes "Repeat whole range" instead** → the override's repeat count falls back to the user's own setting, but the stop target is untouched — the range still ends where the wird's `lastVerseKey` was, it just no longer repeats a wird-specific number of times. The indicator banner disappears here too.
6. **Range spans a surah boundary** (e.g. rangeStart page 106, rangeEnd page 108) → handled by the existing cross-chapter chaining (`decideChapterEnd`/`chainToNextChapter`) with no new logic — we pass an explicit stop target exactly the way the existing `hizb`/`juz`/`"none"` scopes already do.
7. **Manual verification (2026-07-30):** enrolled a real user, drove the listening-wird row's Play button through a real browser, and confirmed the override itself is correct — chains chapter 1→2 across the page-1–5 range and stops exactly at the range's last verse, honoring `rangeRepeatCount: 1`, even with an unrelated stale `"custom"` stop-point sitting in the user's persisted settings the whole time. The only real gap found was the settings sheet showing no indication an override was active.
8. **Review fixes (2026-07-31):** a code review (`/review-fq-work`) against the shipped implementation found `decideChapterEnd` still silently disabled whole-range repeat for an override session whenever the user's persisted `stopPoint` was `"none"` — fixed by passing an explicit `isRepeatableRange` boolean instead of the raw stop point. It also found `PlanAssignmentRow`'s "am I active" check compared page ranges, not identity, letting an unrelated session (or two overlapping listen rows) falsely claim "active" — fixed by giving overrides a stable `id` (`planPlaybackSessionId(planId, trackKey)`) and comparing that instead. See `docs/plans/listening-wird-inline-playback-fixes.md` for the full finding list and fix plan.

## Files to Change

- `app/api/quran/pages/[pageId]/bounds/route.ts` (existing, extended) — now also resolves and returns `firstVerseKey` alongside its existing `lastVerseKey`/`lastChapterId`, via a second `quranPrisma.mushafWordLayout.findFirst` ordered ascending (mirrors the existing descending query for the last verse).
- `app/utils/recitation-api.ts` — `fetchPageBounds`'s return type widened to include `firstVerseKey`.
- `app/hooks/use-page-verse-bounds.ts` (new) — `usePageVerseBounds(pageId: number, { enabled }: { enabled: boolean })`, wraps `fetchPageBounds(pageId, DEFAULT_MUSHAF_ID)`, React Query, `staleTime: Infinity`.
- `app/types/recitation.ts` — `PlaybackOverride` (`{ stopVerseKey, stopChapterId, rangeRepeatCount, id, label }`) and `ActiveOverride = Pick<PlaybackOverride, "id" | "label">`.
- `app/utils/recitation.ts` — `decideChapterEnd`'s third param is `isRepeatableRange: boolean` (was the raw `stopPoint`).
- `app/contexts/RecitationContext.tsx`:
  - `play` signature: `play(verseKey: string, overrides?: PlaybackOverride): void` — when `overrides` present, skip `resolveStopTarget`, set `stopVerseKeyRef.current = overrides.stopVerseKey`, `stopChapterIdRef.current = overrides.stopChapterId`, `rangeRepeatOverrideRef.current = overrides.rangeRepeatCount`; `activeOverride` set optimistically right after `setStatus("loading")`, cleared on both failure paths.
  - New `rangeRepeatOverrideRef = useRef<number | null>(null)`.
  - New `activeOverride` state: `const [activeOverride, setActiveOverride] = useState<ActiveOverride | null>(null)`.
  - `handleTimeUpdate`: `resolveRepeatTarget(settings.rangeRepeatCount)` → `resolveRepeatTarget(rangeRepeatOverrideRef.current ?? settings.rangeRepeatCount)`.
  - `handleChapterEnded`: `decideChapterEnd`'s third argument becomes `rangeRepeatOverrideRef.current != null || settings.stopPoint !== "none"`.
  - The mid-session "stop-point changed" effect (keyed on `settings.stopPoint`/`settings.rangeTo`): clears `rangeRepeatOverrideRef.current = null; setActiveOverride(null);`.
  - New, separate effect keyed on `settings.rangeRepeatCount` only: clears the override the same way, without touching the stop target.
  - `stop()`: clears `rangeRepeatOverrideRef.current = null; setActiveOverride(null);`.
  - `RecitationContextType`: `play` typed with `PlaybackOverride`; `activeOverride: ActiveOverride | null`.
- `app/lib/plans/assignment-range.ts` (new) — `isPageInAssignmentRange(assignment, page)` (shared with `PlansWidget`'s `inRange`) and `planPlaybackSessionId(planId, trackKey)`.
- `app/components/RecitationSettingsSheet.tsx`: read `activeOverride` from `useRecitation()`; when non-null, render a small read-only banner (icon + `activeOverride.label`) directly under `SheetTitle`/`SheetDescription`, above the Reciter section. **Also, when `activeOverride != null`:** pass `disabled` to the "Stop at" `RadioGroup` (each pill's className branch adds the disabled visual state); thread a new `disabled?: boolean` prop through `CustomRangePicker` (Page/Verse toggle, page `Input`, `SurahCombobox` trigger, ayah `Input`) and through `RepeatStepper` (both buttons), passing it only at the "Repeat whole range" call site, not "Repeat each ayah". Reciter / speed / pause-between-repeats unchanged.
- `app/components/plans/PlanAssignmentRow.tsx`:
  - New required `planId: number` prop; `sessionId = planPlaybackSessionId(planId, assignment.trackKey)`.
  - For `assignment.activity === "listen"`, prefetch `usePageVerseBounds(assignment.rangeStart, { enabled: true })` and, when `rangeEnd !== rangeStart`, `usePageVerseBounds(assignment.rangeEnd, { enabled: true })`; a single `bounds` object plus `boundsError`/`boundsLoading` distinguish pending from failed, with a retry affordance on error.
  - Replace the leading icon `<span>` with a tappable button (pulled outside the `Link`, same pattern as the trailing check-off button) for listen-activity rows only, rendering play/pause/loading/retry state per the decision tree above, wired to `useRecitation()`; honors the row's `disabled` prop for starting playback (not for pausing an already-active session).
  - "Is this row's session active" is `activeOverride?.id === sessionId`, not a page-range comparison.
  - Build `overrides.label` from the same `trackUi`/`rangeLabel` already computed for the row: `` `${t(trackUi.labelKey, trackUi.defaultLabel)} · ${t("page","Page")} ${rangeLabel}` `` (e.g. `"Listening · Page 1–5"`); `overrides.id` is `sessionId`.
- `app/components/plans/PlansWidget.tsx` / `PlansTodayHero.tsx` / `MyPlansList.tsx` — pass `planId` to `PlanAssignmentRow`; `PlansWidget`'s `inRange` uses the shared `isPageInAssignmentRange`.
- `messages/ar.json` / `messages/en.json` — aria-labels for the new play/pause/loading/retry button states (mirrors the existing check-off button's `aria-label` pattern), plus copy for the settings-sheet indicator banner.
- `.gitignore` — `/app/generated/` → `/app/generated` (trailing slash only matches a directory, not the worktree symlink of that name).
- `docs/architecture/DECISIONS.md` — the Recitation Playback decision's override paragraph: the sheet disables Stop-at + Repeat-whole-range (+ `CustomRangePicker`) during an active override; Stop is the only way out.

## Constraints

- No toast/nudge/check-off-on-completion logic in this task — tracked as Trello #161.
- `rangeRepeatOverrideRef` must never leak into a plain (non-override) `play()` call — always reset to `null` when `play()` is called without `overrides`.
- While `activeOverride != null` the sheet disables exactly the Stop-at `RadioGroup`, `CustomRangePicker`'s four controls, and the Repeat-whole-range stepper — nothing else. Stop is the only way out of an override session. No new "following your wird" microcopy beyond the existing "Playing: {label}" banner. (This reverses the original "fully editable, no disabled states" constraint — see Revision History.)
- "Is this row active" is an identity check (`activeOverride?.id === planPlaybackSessionId(planId, trackKey)`), not a page-range comparison — a page overlap alone doesn't mean this row launched the session (revised 2026-07-31, see Verified Test Case 8). `PlansWidget`'s separate `inRange` highlight is a progress hint and legitimately stays page-based; the shared page-range comparison it uses lives in `app/lib/plans/assignment-range.ts` — do not re-inline it.
- Bounds resolution always passes `DEFAULT_MUSHAF_ID` to `fetchPageBounds`/the `/bounds` route — never the reader's currently-active edition — since plan assignments are page-canonical against the default edition only (predates ADR 0033).
- Bounds queries are prefetched only for listen-activity rows, not every row — avoid firing 2 extra requests per non-listening track.
- The indicator banner is read-only/informational — it must not add tooltips or any interaction change beyond the deliberate disabling of the Stop-at and Repeat-whole-range controls described above.

## What NOT to Do

- Do not build a completion nudge/toast, or add a toast library, in this task — deferred to Trello #161.
- Do not invent a new "range playback" concept/context separate from `RecitationContext` — extend the existing `play()` with an optional override, reusing all existing chaining/repeat machinery.
- Do not resolve page bounds by reusing the existing verseKey-driven `/api/quran/verses/[verseKey]/stop-point` route — it requires a starting verse, not a bare page number; `/pages/[pageId]/bounds` is the page-number-only lookup.
- Do not resolve page bounds against `Verse.page_number` directly — that column only reflects the default edition (ADR 0033); always resolve through `mushaf_word_layouts` (the `/bounds` route already does this).
- Do not treat husun's `tahdeer` repetitions as per-ayah repeat — confirmed whole-range repeat (play start→end once per pass, repeat the whole pass N times).
- Do not disable Reciter, "Repeat each ayah", playback speed, or pause-between-repeats during an override — none of them conflict with it.
- Do not add a "release"/"take over" affordance — Stop is the only way out of an override session (confirmed with the user).
- Do not add explanatory copy next to the disabled controls — the existing "Playing: {label}" banner is the only context.
- Do not remove the two "clears the override" effects — since the sheet no longer lets those settings change while an override is live, they can't fire from the UI, but they stay as a defensive backstop, not dead code.

## Decisions Made

- Inline play/pause applies to every `activity: "listen"` row (listening-wird's track and husun's tahdeer), not just listening-wird.
- `assignment.repetitions` (when set) means whole-range repeat, not per-verse repeat.
- Page-bounds resolution (extending the existing edition-aware `/bounds` route, fixed to `DEFAULT_MUSHAF_ID`) + `play()` override mechanism, rather than a new parallel playback API — reuses all of `RecitationContext`'s existing chaining/repeat logic.
- Reconciled 2026-07-30 (merge with `main`): `main` had gained ADR 0033 (mushaf editions) since this plan was written. The originally-planned standalone `verse-bounds` route was dropped in favor of extending the pre-existing `/bounds` route — see "Page-bounds resolution" in Approach.
- During an active override the sheet disables exactly the Stop-at and Repeat-whole-range controls (and `CustomRangePicker` when `stopPoint === "custom"`); everything else stays interactive. Stop is the only way to end an override session. (2026-08-01 — deliberate reversal of the original "fully editable, no disabled states" decision, confirmed with the user; the read-only banner alone was not enough differentiation.)
- Completion nudge/toast deferred to a separate ticket (Trello #161) since no toast system exists yet and picking one is its own decision.
- Settings-sheet indicator: track name + page range (e.g. "Listening · Page 1–5"), placed as a banner directly under the sheet title, informational only — no change to control interactivity or a warning note (2026-07-30, prompted by manual testing surfacing the disconnect).
- Review fixes (2026-07-31, see `docs/plans/listening-wird-inline-playback-fixes.md`): overrides carry a stable `id` (`activeOverride: { id, label } | null`) so a row's "active" state is an identity check, not a page-range comparison; `decideChapterEnd` takes `isRepeatableRange` instead of the raw `stopPoint` so an override's whole-range repeat is never silently gated by an unrelated persisted `"none"` setting; editing "Repeat whole range" mid-session now clears the override via its own effect (separate from the stop-point effect, so it never re-resolves the stop target); `activeOverride` is set optimistically before the network awaits in `play()` and cleared on both its failure paths, fixing a stale banner leak; `PlanAssignmentRow`'s bounds handling distinguishes pending from failed with a retry affordance, and honors the row's `disabled` prop for starting (not pausing) playback; the page-range comparison duplicated between `PlanAssignmentRow` and `PlansWidget` is now shared via `app/lib/plans/assignment-range.ts`.

## Revision History

- 2026-08-01 — folded Addendum "Disable Stop-at/Repeat During an Override". **Supersedes the original "settings sheet stays fully editable at all times, no new disabled states" constraint** — the read-only banner alone was not enough visual differentiation. While `activeOverride != null` the sheet now disables the "Stop at" `RadioGroup`, `CustomRangePicker`'s four controls (when `stopPoint === "custom"`), and the "Repeat whole range" `RepeatStepper` — via a new `disabled?: boolean` prop on `CustomRangePicker` and `RepeatStepper`. Reciter, "Repeat each ayah", speed, and pause-between-repeats stay interactive. Stop becomes the only way to end an override session; no "release" affordance, no explanatory microcopy. The two "clears the override" effects can no longer fire from the sheet but stay as a defensive backstop.
