# Loading Placeholder Toggles the Scrollbar, Reflowing the Whole Document

**Type:** bug
**Date:** 2026-07-30
**Status:** ready-to-implement
**Trello:** #157 https://trello.com/c/AyKqCjdY/157-bug-loading-placeholder-toggles-the-scrollbar-reflowing-the-whole-document-on-every-page-turn
**Related:** ADR 0028 (persistent pager), `docs/plans/reader-persistent-pager.md`, `docs/plans/arrow-controls-desktop.md` (#156 depends on this)

## Summary

On a reader page turn where the incoming far-neighbour panel is not yet cached, the whole document
visibly jumps ~19px sideways and back within ~100ms. Users describe it as "the whole page re-renders
while only the safhas change" — which is close to literally true: a vertical scrollbar appears and
disappears, and every element in the document reflows twice.

The cause is a loading placeholder that is taller than the content it stands in for. It is a
pre-existing latent bug, independent of what triggers the commit.

## Root Cause

`Panel` in `app/components/reader/ReaderPager.tsx` renders a placeholder while its page JSON is in
flight, carrying `min-h-[calc(100dvh-5.5rem)]`. That is ~72px taller than a real rendered spread:

1. A commit mounts the new far-neighbour panel with no cached data → the placeholder renders.
2. Document height goes 1125 → 1197 against a 1125 viewport → a **vertical scrollbar appears**.
3. The scrollbar consumes 19px of layout width (`documentElement.clientWidth` 1800 → 1781) → the
   **entire document reflows**. The pager strip's resting `translateX(-100%)` is a percentage of its
   own now-narrower width, so the visible page shifts ~19px with it.
4. ~100ms later the JSON arrives, the placeholder is replaced by the real spread, height returns to
   1125, the scrollbar goes, and everything reflows back.

Two full-document reflows and two ~19px horizontal jumps per page turn.

The panel does not need the placeholder's `min-h` to hold its size: the enclosing `.fq-reader-outer`
already carries `min-h-[calc(100dvh-3.5rem)]`, so the panel stays full height either way. The
placeholder's own `min-h` only adds height the layout never wanted.

## Why it shows up now

Nothing changed in this code path. Whether the reflow is *visible* depends on whether something is
covering the fetch window:

| Commit trigger | Fetch window covered by | Visible? |
|---|---|---|
| Swipe release | the 300ms slide animation | usually not — but yes on a slow connection |
| Arrow click / keyboard (#156) | nothing (instant commit) | **yes, every time** |
| Recitation-follow, edition switch | nothing (instant `commitTo`/`jumpTo`) | yes |

#156 (instant arrow/keyboard commit) removed the slide that was covering it for those inputs, which
is how it surfaced. This is also a likely contributor to the "post-commit blank on slow 4G" reports
recorded in `reader-persistent-pager.md`.

## Decision Tree / Algorithm

No branching logic. One declarative change: the placeholder must not contribute height beyond what
the panel wrapper already reserves.

| Condition | Before | After |
|---|---|---|
| Panel data present | renders `<QuranSpread>`; doc height == viewport | unchanged |
| Panel data in flight | renders placeholder with `min-h-[calc(100dvh-5.5rem)]`; doc height exceeds viewport → scrollbar → global reflow | renders placeholder with no `min-h`; panel height still comes from `.fq-reader-outer`; doc height unchanged → no scrollbar → no reflow |

## Verified Test Cases

Measured live at 1800×1125 on `/ar/pages/*`, sampling every animation frame across one commit.

**Before — 1:1 correlation between the placeholder and the scrollbar:**

| frame | placeholder | doc height | overflows | scrollbar | clientWidth |
|---|---|---|---|---|---|
| before | no | 1125 | no | 0 | 1800 |
| f0–f1 | yes | 1197 | yes | 19px | 1781 |
| f2+ | no | 1125 | no | 0 | 1800 |

Also observed pre-fix: for ~42ms two different spreads sit inside the viewport at once (the visible
seam), and a 76ms long task on the first commit after load.

**After (probed by injecting the equivalent CSS):** across 10 consecutive commit frames,
`clientWidth` stays 1800, strip width stays 1800, scrollbar stays 0px, and never more than one panel
is inside the viewport.

## Files to Change

- `app/components/reader/ReaderPager.tsx` — the `Panel` loading placeholder drops
  `min-h-[calc(100dvh-5.5rem)]`, keeping `w-full`. One line.

## Constraints

- The panel must still occupy full width and full height while loading — that comes from the panel
  wrapper and `.fq-reader-outer`, which are not touched.
- Do not change `commitTo`/`animateCommit`/the gesture code or any ADR 0028 pager invariant; this is
  a layout fix, not a navigation fix.
- Verify at mobile and tablet widths too, where the reveal during a drag can legitimately show the
  placeholder — it must still read as an empty page, not a collapsed panel.

## What NOT to Do

- Do not use `html { scrollbar-gutter: stable }` — measured, it does **not** fix this (the scrolling
  container is not `html` here), and it would reserve a permanent gutter on every page app-wide.
- Do not mask it by keeping the far-neighbour panel unmounted until data arrives — panel count is
  load-bearing for the strip's `translateX(-100%)` geometry; dropping to two panels shifts the strip
  by a whole viewport.
- Do not chase this as a font problem. All `quran-p*` faces stay `loaded` across the commit and there
  are zero `<style>` mutations, so ADR 0029's mechanism is not involved.
- Do not treat this as a fix for Trello #153 (rapid swipes dropped by the 300ms commit lock) — a
  separate bug in a separate mechanism.

## Decisions Made

- Fix the placeholder height rather than the scrollbar behaviour — the placeholder is the thing that
  is wrong; the scrollbar is behaving correctly given a document that genuinely overflows.
- Split out of #156 into its own ticket (user's call): the bug is pre-existing and independent of the
  arrow-nav change, even though #156 is what exposed it and depends on it.
