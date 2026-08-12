# Fix Reader Navigation Infinite Render Loop

**Type:** bug
**Date:** 2026-08-12
**Status:** implemented

## Summary

Trello #194 ("download offline works but sidebar/home navigation doesn't")
was supposedly fixed by PR #205 (`520fe60`), which introduced
`ReaderNavigationContext` and wired `jumpTo` into `SurahListItem`,
`RubList`, and `ContinueReadingLink`. That fix itself has a bug: it
provides `setJumpTo` as a new function identity on every render, which
feeds into a `useEffect` dependency array in `ReaderPager` that never
settles — the effect re-fires every render, calls `setJumpTo` again,
which updates state, which re-renders, forever. React logs "Maximum
update depth exceeded" continuously and the reader page becomes
non-interactive: no click (sidebar, rub, home logo, anything) resolves,
because the tab is stuck in a continuous re-render storm.

This is not a merge-conflict regression from a later PR (`ReaderNavigationContext.tsx`
has exactly one commit in its history) — the loop has been present since
`520fe60` landed, so the original symptom (sidebar/home nav "doesn't work")
has never actually been resolved; it just changed root cause.

## Root Cause

`app/contexts/ReaderNavigationContext.tsx`:

```
const setJumpTo = (fn: JumpTo | null) => setJumpToState(() => fn);
```

`setJumpTo` is a plain arrow function, recreated every render of
`ReaderNavigationProvider` — never memoized, and the `Provider`'s `value`
object is a new object every render too.

`app/components/reader/ReaderPager.tsx:448-451`:

```
useEffect(() => {
  setJumpTo(() => jumpTo);
  return () => setJumpTo(null);
}, [jumpTo, setJumpTo]);
```

`jumpTo` is stable (`useCallback`), but `setJumpTo` is not. Every time the
effect runs, it calls `setJumpTo`, which triggers a state update on
`ReaderNavigationProvider`, which re-renders, which produces a new
`setJumpTo` reference, which re-triggers this effect. Confirmed live: on
`/en/pages/1`, the console floods with React's "Maximum update depth
exceeded" warning immediately on mount, and clicks on the sidebar trigger,
the home logo, and sidebar list items all silently no-op (`window.location.href`
never changes).

## Fix

Two independent bugs, both in the same `jumpTo` plumbing:

**1. Infinite render loop.** Memoize `setJumpTo` with `useCallback`
(stable identity, no deps — it only calls the `useState` setter) and
memoize the context `value` with `useMemo` so consumers don't re-render on
every provider render either.

**2. `jumpTo` never actually runs (found during live verification after
fixing #1).** `ReaderNavigationContext`'s exposed `setJumpTo` already
wraps its argument (`setJumpToState(() => fn)`) to satisfy `useState`'s
"function values are treated as updaters" rule. `ReaderPager.tsx`'s
registration effect called `setJumpTo(() => jumpTo)` — wrapping *again*.
The double-wrap meant the context's stored `jumpTo` was a function that
*returns* the real `jumpTo` instead of one that calls it. Confirmed live
via a temporary debug log: `SurahListItem`'s `onClick` read
`jumpTo = () => jumpTo`, so `jumpTo(surahStartingPage)` just returned the
real function and discarded it — no navigation, no error, nothing in the
console. This explains why sidebar/rub navigation never worked even
before the infinite-loop symptom existed: the render loop broke *all*
interactivity (masking this bug too), but even with interactivity
restored, `jumpTo` calls were silent no-ops. Fix: call `setJumpTo(jumpTo)`
directly at the registration site — `setJumpTo` already provides the
required wrapping.

Both fixes are single, obvious changes with no branching logic — no
decision tree/verification loop needed per the planning skill's "simple
task" criteria; the second was found empirically through browser
verification rather than static review, which caught what a code read
alone had missed.

## Files to Change

- `app/contexts/ReaderNavigationContext.tsx` — wrap `setJumpTo` in
  `useCallback(..., [])`; wrap the `Provider`'s `value` in
  `useMemo(() => ({ jumpTo, setJumpTo }), [jumpTo, setJumpTo])`.
- `app/components/reader/ReaderPager.tsx` — registration effect calls
  `setJumpTo(jumpTo)` instead of `setJumpTo(() => jumpTo)`.

## Constraints

- Must not change `jumpTo`'s public shape/behavior (still `(page: number) => void`,
  still nulled on unmount) — `SurahListItem`, `RubList`, `ContinueReadingLink`,
  and `MushafSwitchSync`'s `onReanchor={jumpTo}` all consume it as-is.

## What NOT to Do

- Do not touch `SurahListItem.tsx` / `RubList.tsx` — their `jumpTo` wiring
  from `520fe60` is correct and untouched by this bug.
- Do not treat this as a merge-conflict regression from PR #206 — verified
  `ReaderNavigationContext.tsx` has a single-commit history; nothing else
  ever edited it.
- Do not add a `useEffect` dependency-array workaround (e.g. dropping
  `setJumpTo` from deps with an eslint-disable) — that masks the real bug
  (unstable identity) instead of fixing it, and it would still break if a
  future consumer legitimately reacts to `setJumpTo` changing.

## Decisions Made

- Reused existing Trello card #194 (still open, in Testing list) rather
  than filing a new one — this is a fix for the same reported symptom
  under its real root cause, not a distinct bug.
