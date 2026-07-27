# Arrow Controls on Desktop

**Type:** feature
**Date:** 2026-07-27
**Status:** implemented
**Trello:** #92 https://trello.com/c/rHb2aJxd/92-arrow-controls-on-desktop

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
