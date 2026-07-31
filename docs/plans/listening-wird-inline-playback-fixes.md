# Listening Wird Inline Playback — Review Fix Plan

**Type:** bug
**Date:** 2026-07-31
**Status:** implemented
**Trello:** #162 — https://trello.com/c/20TSoSGg
**Source:** /review-fq-work findings on feature/162-listening-wird-inline-playback

## Summary

Sixteen review findings on the listening-wird inline playback branch. The substantive
ones cluster into three real defects and one refactor: (1) `decideChapterEnd`'s
`stopPoint !== "none"` guard silently disables whole-range repeat for override sessions
when the user's persisted stop-point is `"none"` — fixed by passing an explicit
`isRepeatableRange` boolean instead of the raw `StopPoint`; (2) the override's
identity is unknowable to the UI, so `PlanAssignmentRow` guesses "am I the active
session?" from a page-range overlap — fixed by giving the override a stable `id` and
surfacing it as `activeOverride: { id, label } | null`; (3) the override/banner leaks on
`play()` failure and never clears when "Repeat whole range" is edited; and (4) the row's
bounds handling conflates pending with failed and duplicates `PlansWidget`'s range
comparison. Three findings (#7, #15, #16) are docs/hygiene only. All fixes stay inside
`RecitationContext` / `PlanAssignmentRow` / `PlansWidget`; `play(verseKey)`'s plain
signature for `MarkModal`/`RecitationPlayerBar` is untouched, and no settings-sheet
control gains a disabled state.

## Fixes by Finding

### Finding 1 (critical) — `decideChapterEnd` gated on raw `settings.stopPoint`

**Fix:** Replace `decideChapterEnd`'s `stopPoint: StopPoint` parameter with an explicit
`isRepeatableRange: boolean`, and compute that at the call site in an override-aware way.

`app/utils/recitation.ts` (currently lines 10–34):

- Change the signature to:
  ```ts
  export const decideChapterEnd = (
    currentChapterId: number,
    stopChapterId: number | null,
    isRepeatableRange: boolean,
    rangeRepeatsDone: number,
    rangeRepeatTarget: number,
  ): ChapterEndDecision => {
    if (currentChapterId === stopChapterId) {
      if (isRepeatableRange && rangeRepeatsDone + 1 < rangeRepeatTarget) {
        return { action: "repeat-range" };
      }
      return { action: "stop" };
    }
    ...
  ```
  (body otherwise unchanged).
- Update the doc comment above it: keep the existing explanation of why `stopPoint:
  "none"` must never repeat a range (a stale `rangeRepeatCount` from a previous
  stopPoint could still be stored), but restate it in terms of the new parameter —
  "`isRepeatableRange` is false exactly when playback has no bounded range to repeat back
  to: `settings.stopPoint === "none"` with no `play()` override active. An explicit
  `play()` override (a wird's page range) always *is* a bounded range regardless of what
  the user's persisted stop-point happens to say."
- Remove `StopPoint` from the `@/app/types/recitation` import on line 2 — it becomes
  unused in this module (verify with `grep -n StopPoint app/utils/recitation.ts` after
  the edit).

`app/contexts/RecitationContext.tsx`, `handleChapterEnded` (currently lines 613–646):

- Replace the third argument at line 629 (`settings.stopPoint`) with:
  ```ts
  // An explicit play() override is always a bounded, repeatable range —
  // it carries its own stop target and repeat count, so the user's
  // persisted stopPoint ("none" or otherwise) must not gate it. Without
  // the override, fall back to the original rule.
  rangeRepeatOverrideRef.current != null || settings.stopPoint !== "none",
  ```
  This preserves the pre-existing behavior byte-for-byte for non-override sessions
  (`rangeRepeatOverrideRef.current` is `null` there, so the expression reduces to
  `settings.stopPoint !== "none"`).

There are no unit tests for `decideChapterEnd` (grep confirms `app/utils/recitation.ts`
has no `.test.ts`), so no test updates are needed — but the caller is the only call site,
so the compiler will catch any miss.

### Finding 2 (warning) — stale "Playing: …" banner after a failed `play()`

**Fix:** two changes in `app/contexts/RecitationContext.tsx`'s `play` (currently lines
294–365).

1. **Set the override state optimistically, at the start of the attempt** — move
   `setActiveOverride(...)` (today's `setActiveOverrideLabel(overrides.label)` at line
   346) up to immediately after `setStatus("loading")` (line 308):
   ```ts
   setStatus("loading");
   // Published before the awaits below so a UI row can recognise "this
   // session is mine" while it's still loading (re-entry guard) — cleared
   // again on every failure path.
   setActiveOverride(overrides ? { id: overrides.id, label: overrides.label } : null);
   ```
   Leave `rangeRepeatOverrideRef.current = overrides ? overrides.rangeRepeatCount : null;`
   where it is (line 345, inside the success path) — moving the *ref* early would apply
   the new repeat count to a still-playing previous session during the load window.
2. **Clear it on both failure paths.** Add
   `setActiveOverride(null); rangeRepeatOverrideRef.current = null;` to:
   - the `!startTiming || !audio` early return (lines 335–338), alongside the existing
     `setStatus("idle")`; and
   - the `catch` block (lines 360–362), alongside the existing `setStatus("idle")`.

   Add a comment on the catch: `// play() can reject (autoplay policy, network) — the
   optimistic override above must not survive it, or the settings sheet keeps showing
   "Playing: …" with nothing playing.`

### Finding 3 (warning) — editing "Repeat whole range" doesn't clear the override

**Fix:** Add a **new, separate** effect in `app/contexts/RecitationContext.tsx`,
immediately after the existing stop-point-changed effect (which ends at line 693). Do
**not** add `settings.rangeRepeatCount` to that effect's dependency array — doing so
would also re-run `resolveStopTarget` and move the stop target of *plain, non-override*
sessions forward whenever the user merely bumps a repeat count, which is a behavior
change to an already-shipped feature and is not what this finding is about.

```ts
// Editing "Repeat whole range" mid-session also ends an override's framing —
// that control is exactly what the override's rangeRepeatCount replaces, so
// touching it means the user is taking the session back. Deliberately kept
// separate from the stop-target effect above: a repeat-count edit must NOT
// re-resolve where the range ends (the wird's stop target stays put; only
// the repeat count falls back to the user's own setting). See
// docs/plans/listening-wird-inline-playback-fixes.md, finding 3.
useEffect(() => {
  if (status === "idle") return;
  rangeRepeatOverrideRef.current = null;
  setActiveOverride(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [settings.rangeRepeatCount]);
```

The `status === "idle"` guard makes the mount-time run (and the one extra run when
`getInitialSettings()` hydrates persisted settings, lines 204–206) a no-op — the same
guard the existing stop-point effect already relies on at line 667.

Also update the existing stop-point effect's clearing lines (683–684) to the new state
setter: `rangeRepeatOverrideRef.current = null; setActiveOverride(null);`.

### Finding 4 (warning) — `isActiveRow` has no identity check

**Fix:** give the override a stable identity and key the row off it, instead of off a
page-range overlap.

**a. `app/types/recitation.ts`** — add, next to `RecitationSettings`:
```ts
// An explicit, caller-supplied playback range that bypasses
// settings.stopPoint / resolveStopTarget entirely (listening-wird inline
// playback — see docs/plans/listening-wird-inline-playback.md). `id` is a
// stable identity for whatever launched the session, so a UI surface can
// tell "this is my session" apart from any other session that merely
// happens to be reciting inside the same pages. `label` is the
// human-readable form shown by RecitationSettingsSheet.
export type PlaybackOverride = {
  stopVerseKey: string;
  stopChapterId: number;
  rangeRepeatCount: number;
  id: string;
  label: string;
};

// The publicly observable part of an active PlaybackOverride.
export type ActiveOverride = Pick<PlaybackOverride, "id" | "label">;
```

**b. `app/contexts/RecitationContext.tsx`**
- Import `PlaybackOverride, ActiveOverride` from `@/app/types/recitation` (add to the
  existing import block, lines 37–44).
- Replace the `activeOverrideLabel` state (line 179) with:
  ```ts
  const [activeOverride, setActiveOverride] = useState<ActiveOverride | null>(null);
  ```
- `RecitationContextType` (lines 107–152): replace `activeOverrideLabel: string | null`
  with `activeOverride: ActiveOverride | null` (keep and adapt the existing explanatory
  comment at lines 147–150).
- Replace every remaining `setActiveOverrideLabel(...)` with `setActiveOverride(...)`:
  `stop()` (line 277 → `setActiveOverride(null)`), `play`'s success/failure paths
  (finding 2), the stop-point effect (line 684) and the new repeat effect (finding 3).
- Provider value (line 765): `activeOverrideLabel` → `activeOverride`.

**c. `app/components/RecitationSettingsSheet.tsx`**
- Line 457: destructure `activeOverride` instead of `activeOverrideLabel`.
- Lines 492 and 496: `{activeOverride ? (` and
  `{t("recitation.playingOverride", "Playing")}: {activeOverride.label}`.

**d. `app/components/plans/PlanAssignmentRow.tsx`**
- Add a required prop `planId: number` to `Props` (line 14–20), documented as
  `/** Owning plan — with trackKey, forms this row's playback session identity. */`.
- Compute `const sessionId = planPlaybackSessionId(planId, assignment.trackKey);`
  (helper from finding 8).
- Replace `isActiveRow` (lines 52–53) with:
  ```ts
  // Identity, not page overlap: an unrelated session (player bar, MarkModal)
  // drifting into this row's pages is not this row's session, and two
  // overlapping listen rows must never both claim "active".
  const isActiveRow = isListen && status !== "idle" && activeOverride?.id === sessionId;
  ```
  and read `activeOverride` from `useRecitation()` (line 33).
- Pass `id: sessionId` in the `play()` override object (lines 66–71).

**e. Call sites** — pass `planId`:
- `app/components/plans/PlansWidget.tsx` line 147: add `planId={plan.planId}`.
- `app/components/plans/PlansTodayHero.tsx` line 125: add `planId={plan.planId}`.
- `app/components/plans/MyPlansList.tsx` line 230: add `planId={plan.id}`.

Note the deliberate behavior change: if playback of this row's pages was started by the
player bar rather than by this row, the row now shows **Play**, and tapping it starts a
proper override session that takes over the shared `<audio>` element (existing takeover
behavior, Verified Test Case 3). That is correct and unambiguous.

### Finding 5 (warning) — no re-entry guard during `status === "loading"`

**Fix:** two parts, both in `app/components/plans/PlanAssignmentRow.tsx`, made possible
by finding 2's optimistic `setActiveOverride`:

1. `isRowLoading` now resolves correctly during the load window, because `activeOverride.id`
   is set before the awaits. Keep the shape:
   ```ts
   const isRowLoading = boundsLoading || (isActiveRow && status === "loading");
   ```
2. Guard the button itself. In `handlePlayTap`, add `if (isRowLoading) return;` as the
   first statement, and add `isRowLoading` to the button's `disabled` (see finding 11 for
   the final combined expression). Belt-and-braces: the early return protects against a
   double-tap landing in the same tick before React re-renders.

### Finding 6 (warning) — `boundsLoading` conflates pending with failed

**Fix:** distinguish the three states explicitly and offer a retry. In
`app/components/plans/PlanAssignmentRow.tsx`, replace lines 43–50 with:

```ts
const startBounds = usePageVerseBounds(rangeStart, { enabled: isListen });
const endBounds = usePageVerseBounds(rangeEnd, { enabled: isListen && !isSinglePage });

// Whichever query supplies the range's END bounds — the same one as the
// start when the assignment is a single page (no second request fired).
const endBoundsQuery = isSinglePage ? startBounds : endBounds;

const bounds =
  startBounds.data && endBoundsQuery.data
    ? {
        firstVerseKey: startBounds.data.firstVerseKey,
        lastVerseKey: endBoundsQuery.data.lastVerseKey,
        lastChapterId: endBoundsQuery.data.lastChapterId,
      }
    : null;
// A failed /bounds fetch must not spin forever — surface it as a retry
// affordance instead. (Note: a disabled React Query stays `isPending`
// forever, which is why these are all gated on isListen / read off .data.)
const boundsError = isListen && (startBounds.isError || endBoundsQuery.isError);
const boundsLoading = isListen && !bounds && !boundsError;
```

Then:
- `handlePlayTap` gains, before the pause/play branches:
  ```ts
  if (isRowLoading) return;
  if (boundsError) {
    startBounds.refetch();
    if (!isSinglePage) endBounds.refetch();
    return;
  }
  if (!bounds) return;
  ```
  and the `play()` call reads `bounds.firstVerseKey` / `bounds.lastVerseKey` /
  `bounds.lastChapterId`.
- Button rendering (lines 89–95) gains an error branch **before** the play branch:
  ```tsx
  {isRowLoading ? (
    <Loader2 className="size-4 animate-spin" strokeWidth={1.7} />
  ) : boundsError ? (
    <RotateCw className="size-4" strokeWidth={1.7} />
  ) : isRowPlaying ? (
    <Pause className="size-4" strokeWidth={1.7} />
  ) : (
    <Play className="size-4" strokeWidth={1.7} />
  )}
  ```
  Import `RotateCw` from `lucide-react` (line 4).
- `aria-label` (lines 80–86) gains a matching branch:
  `boundsError ? t("plans.playback.retry", "Retry loading") : …` — ordered
  loading → error → playing → play.
- `messages/en.json` (`plans.playback`, lines 146–150) gains `"retry": "Retry loading"`;
  `messages/ar.json` (lines 147–151) gains `"retry": "إعادة المحاولة"`.

### Finding 7 (note) — page-bounds verse spill at the seam

**No behavioral code change — reasoning:** this is inherent and correct, not a bug. The
`/bounds` route resolves the verse *owning* the first/last word on the page because audio
granularity is the verse: `chapterAudio.verseTimings` has one entry per verse and
playback seeks to `timestampFrom`, so there is no way to start or stop mid-verse. Any
alternative (skip a straddling verse) would drop content entirely, which is strictly
worse than hearing it twice. The real defect is that it is undocumented. Document it in
two places:

- `app/api/quran/pages/[pageId]/bounds/route.ts`, header comment (ends line 16) — append:
  `// A page's first/last WORD may belong to a verse that starts on the previous page or
  // ends on the next, so first/lastVerseKey can spill one verse past the page boundary.
  // That is intentional: recitation audio is addressable per verse, never per word, so a
  // straddling verse must be played in full. Consecutive wird days therefore overlap by
  // at most one verse at each seam — accepted (better a repeat than a gap).`
- `docs/plans/listening-wird-inline-playback.md`, end of the "Page-bounds resolution"
  paragraph (line 20) — add the same point in one sentence, and add a matching bullet to
  "Decisions Made".

### Finding 8 (warning) — duplicated range comparison with `PlansWidget`

**Fix:** create `app/lib/plans/assignment-range.ts` (new, client-safe: type-only import
from `./engine`, no server dependencies — matching how `PlansWidget`/`PlanAssignmentRow`
already type-import `TrackAssignment`):

```ts
import type { TrackAssignment } from "./engine";

/**
 * True when `page` falls inside the assignment's inclusive page span. The one
 * home for this comparison — PlansWidget's "in range" highlight and anything
 * else must call it rather than re-inlining `>= rangeStart && <= rangeEnd`.
 */
export const isPageInAssignmentRange = (
  assignment: Pick<TrackAssignment, "rangeStart" | "rangeEnd">,
  page: number,
): boolean => page >= assignment.rangeStart && page <= assignment.rangeEnd;

/**
 * Stable identity for one plan-track's inline playback session — passed as
 * `play()`'s override `id` and compared against `activeOverride.id` so a row
 * can tell its own session from any other session reciting the same pages.
 */
export const planPlaybackSessionId = (planId: number, trackKey: string): string =>
  `plan:${planId}:${trackKey}`;
```

- `app/components/plans/PlansWidget.tsx`: import `isPageInAssignmentRange` and rewrite
  `inRange` (lines 28–39) to use it for both comparisons:
  ```ts
  if (assignment.activity === "listen" && isPlaybackActive && recitedPage != null) {
    return isPageInAssignmentRange(assignment, recitedPage);
  }
  if (!visiblePages) return false;
  return visiblePages.some((p) => isPageInAssignmentRange(assignment, p));
  ```
  `inRange` itself stays in `PlansWidget` — it is widget-specific policy (visible pages
  *or* recited page) with a single call site; only the comparison is shared.
- `app/components/plans/PlanAssignmentRow.tsx`: the inline duplicate is **deleted
  outright** by finding 4 (the row no longer compares pages at all), and the row instead
  imports `planPlaybackSessionId`. This resolves the duplication by removal, which is
  strictly better than sharing it.

Note: `PlansWidget`'s highlight ring deliberately stays page-based for listen rows — it
means "something is being recited inside these pages", a genuine progress hint regardless
of who started it. Only the row's **play/pause control** needs identity.

### Finding 9 (note) — duplicated `!firstVerseKey || !lastVerseKey || …` guard

**Fix:** resolved by finding 6's refactor. The single `bounds` object replaces both
occurrences: `boundsLoading` is derived from `!bounds && !boundsError`, and
`handlePlayTap` guards with `if (!bounds) return;` (which also narrows the type, removing
the non-null assertions implicit in today's code).

### Finding 10 (note) — `endResult` is an unclear name

**Fix:** rename to `endBoundsQuery` as part of finding 6, with the comment
`// Whichever query supplies the range's END bounds — the same one as the start when the
assignment is a single page (no second request fired).`

### Finding 11 (note) — play button ignores the row's `disabled` prop

**Fix:** honor it, with one nuance. `disabled` is `!isOnline` at all three call sites, and
starting playback genuinely needs the network (a `/bounds` fetch plus QDC chapter audio) —
but *pausing* an already-running session does not, and taking that away offline would trap
the user. In `app/components/plans/PlanAssignmentRow.tsx`, the play button (line 77) gains:

```tsx
// Offline blocks STARTING playback (needs /bounds + QDC audio) but must not
// block pausing a session that's already running on buffered audio. Note this
// is the row-level `disabled` only — never `isPending`, which is the check-off
// mutation's concern and has nothing to do with playback.
disabled={(disabled && !isActiveRow) || isRowLoading}
```

Add the same `disabled:cursor-default disabled:opacity-50` classes to the button's
`className` so the state is visible, mirroring the check-off button's `disabled:` styling
convention (line 147).

### Finding 12 (note) — override shape spelled out twice

**Fix:** resolved by finding 4b — the `PlaybackOverride` type in
`app/types/recitation.ts` is referenced from both places:
- `RecitationContextType.play` (lines 132–140) becomes
  `play: (startVerseKey: string, overrides?: PlaybackOverride) => void;`
- the `play` implementation (lines 294–303) becomes
  `async (verseKey: string, overrides?: PlaybackOverride) => {`

`overrides` stays optional, so `MarkModal` / `RecitationPlayerBar`'s plain
`play(verseKey)` calls are unaffected — verify with
`grep -rn "play(" app/components | grep -v PlanAssignmentRow` that no other call site
passes a second argument.

### Finding 13 (note) — DECISIONS.md:606 omits `label`

**Fix:** rewrite the override description on `docs/architecture/DECISIONS.md` line 606.
Change `an optional \`{ stopVerseKey, stopChapterId, rangeRepeatCount }\` override` to
`an optional \`PlaybackOverride\` (\`{ stopVerseKey, stopChapterId, rangeRepeatCount, id,
label }\`, \`app/types/recitation.ts\`) override`, and append after the "without
persisting anything" sentence:

> `id` is a stable identity for whatever launched the session (`plan:{planId}:{trackKey}`
> for a wird row, via `app/lib/plans/assignment-range.ts`) — surfaced as
> `activeOverride: { id, label } | null` so a UI row can tell *its own* session apart from
> an unrelated session that merely happens to be reciting inside the same pages; a
> page-range overlap is not identity. `label` is the human-readable form the settings
> sheet shows as a read-only "Playing: …" banner.

Also update the Awrad decision paragraph (the line ending
`...every control below it stays exactly as interactive as before.`) — replace
`\`activeOverrideLabel: string | null\`` with `\`activeOverride: { id, label } | null\``.

### Finding 14 (warning) — docs claim editing "Repeat" clears the override

**Fix:** with finding 3 implemented, both do clear it — but by different mechanisms and
with different side effects, and the docs must say so precisely rather than lumping them
together.

- `docs/architecture/DECISIONS.md` line 606, final sentence: replace
  "The existing mid-session 'stop-point changed' effect clears this override when the user
  manually touches the settings sheet" with:
  > Two mid-session effects end an override's framing: the "stop-point changed" effect
  > (`settings.stopPoint` / `settings.rangeTo`) re-resolves the stop target from the
  > currently-playing verse *and* clears the override; a separate effect keyed on
  > `settings.rangeRepeatCount` clears the override only, deliberately leaving the stop
  > target where the override put it (a repeat-count edit must not silently move where the
  > range ends). Either way the sheet gains no disabled states — an override session is
  > not "protected" from it, by design.
- `docs/plans/listening-wird-inline-playback.md`:
  - "Approach" paragraph at line 24 — replace "The existing mid-session 'stop-point
    changed' effect (keyed on `settings.stopPoint`) additionally clears
    `rangeRepeatOverrideRef.current = null`" with a description of the two-effect split
    above.
  - `play()` override resolution table, row 3 (line 51) — split into two rows: "user
    changes `settings.stopPoint` / `settings.rangeTo`" → recomputes stop target + clears
    override; "user changes `settings.rangeRepeatCount`" → clears override only, stop
    target unchanged.
  - `activeOverrideLabel` table (lines 53–63) — retitle to `activeOverride`, and split the
    "Mid-session 'stop-point changed' effect fires (user edits Stop-at/Repeat in the sheet)"
    row (line 59) the same way.
  - Verified Test Case 5 (line 72) — amend to state that changing **Stop at** falls back
    to plain settings-driven playback from the current verse, while changing **Repeat**
    keeps the range's end where it is and only hands the repeat count back to the user's
    own setting; the banner disappears in both cases.
  - Add an "Addendum — Review Fixes (2026-07-31)" section at the end pointing at this file
    and summarising the `id`/`activeOverride`/`isRepeatableRange` changes; flip
    **Status** back to `implemented` only after the fixes land.

### Finding 15 (note) — untracked `app/generated` symlink

**Fix (one line, recommended):** `.gitignore` line 31 is `/app/generated/` — the trailing
slash means the pattern only matches a *directory*, and in this worktree `app/generated`
is a **symlink**, which is why `git status` still lists it as untracked (`?? app/generated`).
Change line 31 to `/app/generated` (no trailing slash), which matches both a directory and
a symlink of that name and still ignores the directory's contents. This makes the hygiene
rule enforced rather than remembered.

Independently: keep the standing rule of never running `git add -A` in this worktree —
`/ship-fq-task` stages explicitly. No further action.

### Finding 16 — otherwise clean

**No code change — reasoning:** confirms no TODOs, plan `Files to Change` matching the
diff, and accurate `COMPONENTS.md`. The only doc updates needed are those already
specified under findings 7, 13 and 14. One item to re-verify after implementation:
`COMPONENTS.md`'s `PlanAssignmentRow` entry must be updated for the new required `planId`
prop (`grep -n "PlanAssignmentRow" docs/architecture/COMPONENTS.md`).

## Files to Change

- **`app/types/recitation.ts`** — add exported `PlaybackOverride` (`{ stopVerseKey,
  stopChapterId, rangeRepeatCount, id, label }`) and `ActiveOverride =
  Pick<PlaybackOverride, "id" | "label">`. (#4, #12)
- **`app/utils/recitation.ts`** — `decideChapterEnd`'s third param becomes
  `isRepeatableRange: boolean`; update its doc comment; drop the now-unused `StopPoint`
  import. (#1)
- **`app/contexts/RecitationContext.tsx`** — `handleChapterEnded` passes
  `rangeRepeatOverrideRef.current != null || settings.stopPoint !== "none"` (#1); `play`
  sets `setActiveOverride` optimistically right after `setStatus("loading")` and clears it
  (plus the repeat ref) on both the `!startTiming || !audio` early return and the `catch`
  (#2, #5); new effect keyed on `[settings.rangeRepeatCount]` clearing the override (#3);
  `activeOverrideLabel` state/context field replaced by `activeOverride: ActiveOverride |
  null` throughout, including `stop()`, the stop-point effect and the provider value (#4);
  `play`'s parameter and `RecitationContextType.play` typed with `PlaybackOverride` (#12).
- **`app/components/RecitationSettingsSheet.tsx`** — destructure `activeOverride` instead
  of `activeOverrideLabel` (line 457); banner condition and text read
  `activeOverride`/`activeOverride.label` (lines 492, 496). (#4)
- **`app/lib/plans/assignment-range.ts`** *(new)* — `isPageInAssignmentRange(assignment,
  page)` and `planPlaybackSessionId(planId, trackKey)`. (#4, #8)
- **`app/components/plans/PlansWidget.tsx`** — `inRange` uses `isPageInAssignmentRange`
  for both comparisons (#8); pass `planId={plan.planId}` to `PlanAssignmentRow` (#4).
- **`app/components/plans/PlanAssignmentRow.tsx`** — new required `planId: number` prop
  and `sessionId` via `planPlaybackSessionId`; `isActiveRow` becomes an identity check
  against `activeOverride.id` (#4); `endResult` → `endBoundsQuery`, single `bounds`
  object, `boundsError`, retry-on-error path + `RotateCw` icon + `plans.playback.retry`
  aria-label (#6, #9, #10); `handlePlayTap` gains `isRowLoading` / `boundsError` / `!bounds`
  guards and passes `id: sessionId` in the override (#5, #6); play button gains
  `disabled={(disabled && !isActiveRow) || isRowLoading}` plus `disabled:` styling (#5, #11).
- **`app/components/plans/PlansTodayHero.tsx`** — pass `planId={plan.planId}` (line 125). (#4)
- **`app/components/plans/MyPlansList.tsx`** — pass `planId={plan.id}` (line 230). (#4)
- **`app/api/quran/pages/[pageId]/bounds/route.ts`** — header comment documents the
  one-verse seam spill and why it's intentional. (#7)
- **`messages/en.json` / `messages/ar.json`** — add `plans.playback.retry`. (#6)
- **`docs/architecture/DECISIONS.md`** — line 606 override description gains `id`/`label`
  and the two-effect clearing split; the Awrad inline-listening paragraph's
  `activeOverrideLabel` → `activeOverride`. (#13, #14)
- **`docs/plans/listening-wird-inline-playback.md`** — seam-overlap note in "Page-bounds
  resolution" + Decisions Made (#7); Approach paragraph, both resolution tables and
  Verified Test Case 5 corrected for the two-effect split (#14); new "Addendum — Review
  Fixes (2026-07-31)" section.
- **`docs/architecture/COMPONENTS.md`** — `PlanAssignmentRow`'s prop list gains `planId`. (#16)
- **`.gitignore`** — line 31 `/app/generated/` → `/app/generated`. (#15)

## Verification Checklist

- [x] **#1** Code fix verified by reading `decideChapterEnd`'s call site and `tsc`
      compiling clean (`rangeRepeatOverrideRef.current != null || settings.stopPoint !==
      "none"` reduces to the original expression when no override is active). Not
      live-tested with a real `stopPoint: "none"` + `repetitions: 10` combination —
      the reasoning is sound but this specific scenario wasn't driven through a browser.
- [x] **#2** Code fix verified by reading `play()`'s two failure paths — both clear
      `rangeRepeatOverrideRef`/`activeOverride`. Not live-tested by forcing a real
      `audio.play()` rejection.
- [x] **#3** Live-verified in browser: bumped "Repeat whole range" mid-session — banner
      disappeared immediately, `audio.paused === false` and `currentTime` kept advancing
      (session not interrupted).
- [x] **#4** Live-verified in browser: started playback from the reader's player bar on
      page 1 (confirmed `audio.paused === false`, `currentTime` advancing), navigated to
      `/plans` — both listening rows (hero + My Plans) showed **Play**, not Pause, despite
      `recitedPage` (1) falling inside their 1–5 range. Tapping the row then correctly took
      over the session (button flipped to Pause, player bar showed the row's session).
- [x] **#5** Code fix verified by reading `handlePlayTap`'s `isRowLoading` guard and the
      button's `disabled` prop. Not stress-tested with a real rapid double-tap.
- [x] **#6** Code fix verified by reading the `boundsError`/retry path and `tsc` compiling
      clean. Not live-tested against a real 404/offline `/bounds` response.
- [x] **#7** Route header comment and plan doc (`Approach` + `Decisions Made`) both state
      the one-verse seam overlap and why it's accepted. No behavior change, docs-only.
- [x] **#8** Verified via grep — no inline page-range comparison remains in
      `PlanAssignmentRow.tsx`; `PlansWidget.inRange` calls `isPageInAssignmentRange`.
- [x] **#9** Verified via grep — only one bounds-completeness guard remains (`!bounds`).
- [x] **#10** Verified via grep — no `endResult` identifier remains; `endBoundsQuery` is
      used, with the intended comment.
- [x] **#11** Code fix verified by reading the button's `disabled={(disabled &&
      !isActiveRow) || isRowLoading}` expression. Not live-tested offline.
- [x] **#12** Verified via grep — `PlaybackOverride` declared once in
      `app/types/recitation.ts`, referenced by both `RecitationContextType.play` and
      `play`'s implementation; `MarkModal`/`RecitationPlayerBar`'s plain `play(verseKey)`
      calls compile unchanged (confirmed via `tsc --noEmit`, exit 0).
- [x] **#13** DECISIONS.md:606 (Recitation Playback decision) lists `id` and `label` and
      explains both.
- [x] **#14** DECISIONS.md and the plan's tables/Test Case 5/5b describe the Stop-at vs
      Repeat clearing split accurately; neither claims a disabled control.
- [x] **#15** `.gitignore` line reads `/app/generated`; `git status --short` no longer
      lists `?? app/generated` (confirmed).
- [x] **#16** COMPONENTS.md's `PlanAssignmentRow` entry lists the `planId` prop and the
      identity-based active check; plan "Files to Change" matches the final diff;
      `npx tsc --noEmit` and `npm run lint` both clean (exit 0 / no warnings).
