---
title: Arrow Controls on Desktop
type: feature
date: 2026-07-27
status: implemented
area: reader
---

# Arrow Controls on Desktop

**Trello (Addendum 1):** #156 https://trello.com/c/YtVG0F3M/156-bug-arrow-keyboard-page-nav-replays-the-swipe-slide-animation

## Summary

Pressing the physical `ArrowLeft`/`ArrowRight` keyboard keys should flip Mushaf pages, same as the
existing click nav arrows and swipe gesture. Active at any breakpoint (arrow keys only fire from an
actual keyboard, which is rare on touch devices, so no breakpoint gate is needed).

## Approach

`ReaderPager` (ADR 0028) already owns page navigation via `animateCommit(goNext: boolean)`, shared by
swipe-commit and the in-spread click arrows (`onArrowNavigate`/`navRef`). Add a `keydown` listener in
`ReaderPager` that calls the same `animateCommit`.

**Direction mapping is locale-independent.** Traced through `computeSpreadNav` (`ReaderPager.tsx`) and
`NavigationArrow`'s `showLeft = isRTL ? isNext : !isNext` (`QuranSpread.tsx`): the click arrow rendered
at the physical-left position always resolves to `animateCommit(true)` (forward/`nextAnchor`), and the
physical-right arrow always resolves to `animateCommit(false)` (backward/`prevAnchor`) — in both `ar`
and `en` locales. This makes sense: the Quran's page order is fixed regardless of UI language, so a
physical spatial mapping (left key → left arrow's action) doesn't need to flip with locale. Confirmed
by user 2026-07-27.

## Decision Tree (verified)

| Key event | Condition | Action |
|---|---|---|
| `keydown`, key not `ArrowLeft`/`ArrowRight` | — | ignore |
| `ArrowLeft`/`ArrowRight` | `e.target` is input/textarea/select/`[contenteditable]` | ignore (typing/cursor movement) |
| `ArrowLeft`/`ArrowRight` | any of `metaKey`/`ctrlKey`/`altKey`/`shiftKey` held | ignore (browser back/forward, other shortcuts) |
| `ArrowLeft`/`ArrowRight` | `isCommitting.current` is true | ignore (key-repeat during an in-flight turn is a no-op — same guard `onTouchStart`/`navRef.current` already use) |
| `ArrowLeft` | none of the above | `animateCommit(true)` — forward page |
| `ArrowRight` | none of the above | `animateCommit(false)` — backward page |

## Verified Test Cases

- `ar` locale, page 300: Left → page 301 (forward), Right → page 299 (backward) — matches existing
  click-arrow physical positions.
- `en` locale, page 300: Left → page 301 (forward), Right → page 299 (backward) — same mapping,
  confirming direction is locale-independent.
- Focus in the search bar (or any text input): arrow keys move the text cursor; page does not flip.
- `Cmd+ArrowLeft` (browser back gesture): not intercepted, falls through to the browser.
- Holding `ArrowLeft` (OS key-repeat): advances one page per completed commit animation; no
  skip/double-fire mid-animation.
- `prefers-reduced-motion`: `animateCommit` already short-circuits to an instant `commitTo` in this
  case — unchanged, reused as-is.

## Files to Change

- `app/components/reader/ReaderPager.tsx` — add a `useEffect` registering a `window` `keydown`
  listener (added/removed on mount/unmount) that implements the decision tree above, calling the
  existing `animateCommit`. No new state; reuses `isCommitting` ref already in scope.

## Constraints

- Must reuse `animateCommit`/`commitTo` — do not duplicate the flushSync/recenter/reduced-motion
  logic (ADR 0028's pager invariants).
- Must not fire while `isDragging.current` or `isCommitting.current` (swipe/animation in flight).
- Must not intercept modifier-held arrow combos (browser navigation) or arrow keys while a text input
  has focus.
- No breakpoint gating (works at all viewport widths) — user-confirmed, since arrow keys are inert
  without a physical keyboard.

## What NOT to Do

- Do not gate the listener behind `isLgUp`/desktop breakpoint — user explicitly chose all-breakpoints
  over a desktop-only gate.
- Do not derive the direction mapping from `isRTL` per-keypress — the mapping is locale-independent
  (verified above); branching on `isRTL` here would be redundant and risks getting the direction
  backwards.
- Do not allow queued/interrupting rapid-fire page turns on key-repeat — user chose the
  ignore-while-committing behavior to match existing swipe/click semantics.

## Decisions Made

- All breakpoints, not desktop-only (user-confirmed).
- Guard both input-focus and modifier-key combos (user-confirmed).
- Ignore key-repeat while committing, matching existing guard pattern (user-confirmed).
- No ADR needed — this is an additive use of the ADR 0028 pager's existing `animateCommit`, not a new
  architectural invariant.

## Implementation Notes

Implemented as specified: a `useEffect` in `ReaderPager` registers a `window` `keydown` listener
(added/removed on mount/unmount, deps `[animateCommit]`) implementing the decision tree exactly —
guards on `ArrowLeft`/`ArrowRight` only, input/textarea/select/contenteditable focus, any modifier
key, and `isCommitting.current`. `npm run lint` and `npx tsc --noEmit` both pass clean.

Verified live via Playwright against the worktree dev server (`localhost:3001`):
- `ar` locale, double-view (default, `lg` viewport): Left 300→301, Right 301→299 — correct ±2 pair
  stepping (`nextAnchor`/`prevAnchor` already account for `isDouble`, per ADR 0013; this looked like a
  bug on first glance until the default double-view was accounted for).
- `ar` locale, single-view (mobile viewport, forced single below `lg`): Left 300→301, Right 301→300 —
  correct ±1 stepping.
- `en` locale, double-view: Left 300→301 — same direction as `ar`, confirming the mapping is
  locale-independent as predicted.
- Input focus guard: a focused `<input>` swallows `ArrowLeft` — page stays put.
- Modifier guard: `Meta+ArrowLeft` does not flip the page.

---

## Addendum 1 (2026-07-30) — Arrow/keyboard nav must not replay the swipe animation

**Type:** bug
**Status:** ready-to-implement
**Trello:** #156 https://trello.com/c/YtVG0F3M/156-bug-arrow-keyboard-page-nav-replays-the-swipe-slide-animation

### The bug

Clicking the next/previous nav arrows on desktop animates the page turn as a horizontal slide — the
same motion a finger swipe produces. Swipe motion belongs to the swipe gesture; a click has no drag
to continue, so replaying the drag's release animation reads wrong.

### Root Cause

`ReaderPager` funnels all three navigation inputs through the single `animateCommit(goNext)`, which
slides the 3-panel strip to `translateX(0%)`/`-200%` over `EXIT_MS = 300ms` with `EASE_OUT` and then
swaps the anchor:

| Caller | Site |
|---|---|
| swipe release (≥`COMMIT_THRESHOLD`) | `onTouchEnd` |
| click nav arrows | `onArrowNavigate` → `navRef.current` (arrows are `hidden md:flex` in `QuranSpread`, so 768px+) |
| keyboard `ArrowLeft`/`ArrowRight` | the `keydown` effect added by this plan's original scope |

That slide exists to *continue the drag's live transform* from wherever the finger released — it is
the gesture's completion, not a generic page-turn animation. Clicks and keypresses have no transform
in flight, so the slide is unmotivated for them.

### Approach — gate the slide on input source, not breakpoint

Drag release keeps the slide. Arrow clicks and keypresses commit instantly through the existing
`commitTo`, which is the same branch `prefers-reduced-motion` already takes — a proven code path, not
new machinery.

Gating on input source rather than a breakpoint (`isLgUp`) was chosen deliberately, and the choice is
load-bearing: a breakpoint gate would leave *tablet arrow-taps* still sliding (the arrows render from
`md`, 768px, so tablet has them too) and would kill swipe on a touch laptop at `lg+`. Input source
also needs no `matchMedia`/breakpoint signal at all in the commit path.

Shape: `animateCommit(goNext: boolean, animate = true)`. Target resolution (`nextAnchor`/`prevAnchor`,
which already account for `isDouble` per ADR 0013) and the `isCommitting` bookkeeping stay in one
place; the `!animate` branch falls into the identical `commitTo(target)` the reduced-motion branch
uses. Swipe keeps the default; the arrow and keyboard callers pass `false`. The keyboard effect's deps
stay `[animateCommit]`.

### Key-repeat consequence — must be handled in the same change

The 300ms slide is currently an **accidental rate limiter**: `isCommitting` stays true for the
animation's duration and drops any trigger arriving inside it. That is exactly what this plan's
original Verified Test Cases relied on — *"Holding `ArrowLeft` (OS key-repeat): advances one page per
completed commit animation."* Instant commit clears `isCommitting` synchronously, so nothing throttles
anything, and a held arrow key would flip pages at the OS repeat rate (~30/s), each one a `flushSync`
+ `replaceState` + two neighbor prefetches.

Fix: `if (e.repeat) return;` in the `keydown` handler — a held key flips exactly one page, and you
must release and press again for the next. This **preserves** the original plan's intent (no
rapid-fire page turns) under the new timing; it does not contradict its "What NOT to Do" entry, which
ruled out *queued/interrupting* rapid-fire turns. Discrete presses stay as fast as the user can tap.

Rapid arrow *clicking* is left unthrottled — it is hand-limited, and each click now landing (instead
of being swallowed mid-animation) is an improvement.

### Decision Tree (user-verified)

| Trigger | Today | After |
|---|---|---|
| Touch drag release, ≥80px | 300ms slide → swap | **unchanged** — the slide completes the gesture |
| Touch drag release, <80px | 200ms snap-back | **unchanged** — the gesture returning |
| Click nav arrow (md+, any device) | 300ms slide | **instant** `commitTo` |
| Cmd/Ctrl/Shift/Alt-click an arrow | falls through to the `<Link>` (real route nav) | **unchanged** |
| Keyboard `ArrowLeft`/`ArrowRight`, discrete press | 300ms slide | **instant** |
| Keyboard arrow, OS key-repeat (`e.repeat`) | dropped by `isCommitting` during the animation | **dropped by an explicit `e.repeat` guard** |
| `onNavigate` target that is neither `nextAnchor` nor `prevAnchor` | already `commitTo` | **unchanged** |
| Recitation-follow (`followTo`) | already `commitTo` | **unchanged** |
| `prefers-reduced-motion`, any trigger | already `commitTo` | **unchanged** (`!animate` short-circuits before the `matchMedia` check — no double-handling) |
| Mouse drag | no handlers exist (touch-only) | **unchanged** — nothing to gate |

### Verified Test Cases

Targets below were traced through `nextAnchor`/`prevAnchor` and `computeSpreadNav` in
`ReaderPager.tsx`, not assumed.

| # | Setup | Trigger | Expected |
|---|---|---|---|
| 1 | Desktop 1440px, `/ar/pages/300`, double-view (pair 299/300) | physical-left arrow → href `/pages/301` = `nextAnchor` | instant swap to pair 301/302, no slide |
| 2 | Same | physical-right arrow → href `/pages/297` = `prevAnchor` | instant swap to pair 297/298 |
| 3 | `/en/pages/300` desktop double-view | physical-left arrow → href `/pages/301` (`en` flips the prev/next *label*, not the physical position) = `nextAnchor` | instant, same direction as `ar` — target resolution untouched |
| 4 | Mobile 390px, `/ar/pages/300` | swipe right 120px | 300ms slide → 301. Unchanged |
| 5 | Tablet 820px (`md`, forced single-view, touch device) | tap left arrow | instant → 301. A breakpoint gate would have kept the slide here |
| 6 | Same tablet | swipe right | 300ms slide. Both behaviors coexist on one device — that is the input-source split |
| 7 | Desktop `lg+`, view manually toggled to single | left arrow | instant ±1 → 301 |
| 8 | Desktop | hold `ArrowLeft` ~2s | exactly one page (301); repeat events dropped |
| 9 | Anchor 1, single-view | prev arrow → href `604` = `prevAnchor` | instant wrap to 604. Wrap logic untouched |
| 10 | Recitation playing on 300 | click prev arrow | instant → 297, then `RecitationFollow`'s microtask `followTo(300)` → instant back. Today this is a 300ms slide away plus a snap back, so this is strictly less jarring |
| 11 | Any | Cmd-click an arrow | not intercepted; real `<Link>` navigation / new tab |
| 12 | `prefers-reduced-motion` on, touch laptop | swipe | instant (as today) |

### Files to Change

- `app/components/reader/ReaderPager.tsx` — add the `animate = true` parameter to `animateCommit` and
  short-circuit to `commitTo(target)` when it is false; pass `false` from `navRef.current`'s two
  `animateCommit` calls and from the `keydown` handler; add `if (e.repeat) return;` to that handler.
  Update the comment above `animateCommit` (currently "Shared by swipe commit and the in-spread
  arrows") to record that only swipe animates, and why.

No other file changes. `QuranSpread`/`NavigationArrow` are untouched — they already hand the pager a
target page and know nothing about motion.

### Constraints

- `commitTo` stays the single in-reader navigation primitive (ADR 0028). Do not add a second
  commit path, new state, or new timing machinery for the instant case — reuse the existing branch.
- Do not touch target resolution (`nextAnchor`/`prevAnchor`, `computeSpreadNav`, wrap-around, or the
  `isDouble` pair stepping). This change is about *motion only*; direction and destination are
  already correct and locale-independent (verified in the original plan above).
- Do not touch the `flushSync`/recenter sequence inside `commitTo`, or `followTo`'s microtask
  deferral — ADR 0028's pager invariants.
- Keep the swipe path byte-for-byte behaviorally identical: drag transform, `COMMIT_THRESHOLD`,
  `SNAP_BACK_MS`, `EXIT_MS`, `EASE_OUT`.
- Verify on both `/ar` and `/en` (project triage guidance), and at mobile, tablet (`md`), and desktop
  widths — the input-source split means device and input vary independently.

### What NOT to Do

- Do not gate on `isLgUp` or any breakpoint — explicitly rejected by the user in favor of input
  source. A breakpoint gate leaves tablet arrow-taps sliding and kills swipe on touch laptops.
- Do not add a cross-fade or any other transition for the arrow/keyboard case — the user chose a
  plain instant swap. A new opacity/transition on the commit path is precisely the area ADR 0029 and
  the flicker sessions in `reader-persistent-pager.md` warn against touching.
- Do not merely shorten `EXIT_MS` for arrows — a faster slide still reads as a swipe and does not fix
  the report.
- Do not throttle arrow *clicks* — only key-repeat needed a guard.
- Do not remove or weaken the `isCommitting` guard itself; the swipe path still depends on it.
- Do not assume this fixes Trello #153 (*rapid swipes silently dropped on tablet, 300ms commit lock*).
  Swipe keeps both the animation and the lock, so #153 is untouched and stays open.
- Out of scope, noticed while tracing: on tablet/mobile an arrow tap also bubbles to the strip
  container's `onClick` → `toggleOverlay()`, so tapping an arrow flips the page *and* toggles the nav
  overlay (`toggleOverlay` no-ops on desktop, so it is a tablet/mobile-only quirk). Pre-existing and
  unrelated to motion — do not fix it here.

### Decisions Made

- **Gate on input source, not breakpoint** (user-confirmed): drag → slide, click/key → instant, at
  every breakpoint and on every device.
- **Instant swap, not a cross-fade or a shorter slide** (user-confirmed): reuse `commitTo`, the path
  reduced-motion already takes; zero new machinery.
- **Held arrow key flips one page** via an `e.repeat` guard (user-confirmed), replacing the rate limit
  the removed animation was accidentally providing.
- **No ADR needed.** This is a scoping change to an existing ADR 0028 primitive — `commitTo` remains
  the single navigation primitive, `animateCommit` remains the only slide path, and no new state or
  timing behavior is introduced. It does not contradict ADR 0028, ADR 0013, or ADR 0029.
- **The `ui-motion` skill independently backs this**, which is why the rule was recorded in
  `DECISIONS.md` rather than left as a one-off: its frequency table puts high-frequency actions at
  "remove or drastically reduce", it states outright that keyboard-initiated actions must never
  animate, and its review checklist carries the row *"Animation on a keyboard-triggered action →
  Remove it → Repeated actions should feel instant."*

### Implementation Notes

Implemented as specified, entirely within `app/components/reader/ReaderPager.tsx` (three edits, no
other source file touched):

1. `animateCommit(goNext: boolean, animate = true)` — the early-return condition became
   `if (!animate || !strip || matchMedia("(prefers-reduced-motion: reduce)").matches)`, so the
   instant path is the *same* `commitTo(target)` branch reduced-motion already used. Target
   resolution and the `isCommitting` bookkeeping stayed put. The comment above it now records that
   the gate is input-source (and why not `isLgUp`).
2. `navRef.current` — its two `animateCommit(true)` / `animateCommit(false)` calls now pass `false`.
   The non-neighbor `commitTo(targetPage)` fallback is unchanged.
3. The `keydown` effect — passes `false`, and gained `if (e.repeat) return;` placed immediately after
   the key-name check (before the modifier and focus guards, since a repeat is cheap to reject).
   Deps stay `[animateCommit]`.

`QuranSpread`/`NavigationArrow` were not touched, as planned — they hand the pager a target page and
know nothing about motion.

Docs updated: the `ReaderPager` entry in `COMPONENTS.md` (both the `animateCommit` description and
the ArrowLeft/ArrowRight clause, which previously claimed the keydown effect "calls animateCommit
directly"), and a new Constraints bullet under "Reader Navigation — Persistent Client Pager" in
`DECISIONS.md` recording the input-source rule plus the `e.repeat` coupling, so a future refactor
that "unifies the nav paths" has to argue with it explicitly.

`npm run lint` and `npx tsc --noEmit` both pass clean.

### Dependency discovered during verification — Trello #157

First live run surfaced a visible flicker on every arrow/keyboard commit: the whole document jumped
~19px sideways and back within ~100ms. Instrumented rather than guessed (the flicker history in
`reader-persistent-pager.md` is a 24-attempt cautionary tale), and it turned out **not** to be caused
by this change:

- The commit's cost is inherent to `commitTo`. A swipe commit produces a comparable long task (51ms
  vs 76ms); the 300ms slide was simply covering it.
- The flicker itself was a **pre-existing latent bug**: the pager `Panel`'s loading placeholder
  carried `min-h-[calc(100dvh-5.5rem)]`, ~72px taller than a real spread. Whenever the incoming
  far-neighbour panel was uncached, the document overflowed the viewport, the vertical scrollbar
  appeared, and 19px of layout width vanished and returned — reflowing the whole document twice, and
  moving the strip with it (its resting `translateX(-100%)` is a percentage of its own width).
- Fonts were ruled out: all `quran-p*` faces stayed `loaded` across commits with zero `<style>`
  mutations, so ADR 0029's mechanism is not involved. `scrollbar-gutter: stable` was measured and
  does **not** fix it.

Split into Trello #157 (`docs/plans/fix-panel-placeholder-reflow.md`, PR
https://github.com/furqan-app/web/pull/152) at the user's direction, since the bug is independent of
arrow nav and also fires on swipe over a slow connection. That branch is merged into this one — this
change is not shippable without it, because instant commit is exactly what removes the cover.

### Verified

Combined verification at 1440-wide desktop, `/ar`, 6 consecutive instant arrow commits, 228 frames
sampled, with the placeholder path exercised in 14 of them:

| Metric | Before #157 | After |
|---|---|---|
| `documentElement.clientWidth` | 1800 ↔ 1781 | 1800 constant |
| Scrollbar width | 0 ↔ 19px | 0 constant |
| Panels inside viewport | up to 2 (visible seam) | 1 |
| Long tasks | 76ms on first commit | none |

Direction/stepping (test cases 1–3, 7, 9) were confirmed by URL after each commit: pages advance one
per discrete press with no skips, and `ar`/`en` agree. Test case 8 (held key) is covered by the
`e.repeat` guard; the remaining swipe-vs-arrow cases were exercised via synthetic touch events, which
confirmed swipe still animates (300ms slide, 51ms commit task) while arrows do not.
