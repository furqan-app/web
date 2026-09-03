---
title: Fix QuranSafha Swipe Flicker (font-ready flash + mark re-renders)
type: bug
date: 2026-07-22
status: implemented
area: reader
---

# Fix QuranSafha Swipe Flicker (font-ready flash + mark re-renders)

## Summary

Swiping/jumping to a spread whose font is already loaded caused a visible one-frame flash — the Quran text painted invisible (`visibility: hidden` / skeleton) and then reappeared — because `QuranSafha` initialised `fontReady = false` without checking whether the font was already available. A secondary issue: when marks data resolved, every `QuranWord` re-rendered, not just the ones whose mark changed.

The fix has two parts:
1. **`fontReady` initial state is gated on a hydration boundary, then read live.** A module-level `hasHydrated` boolean (flipped by a mount effect) tells the `useState` lazy initializer whether the SSR/hydration render is behind it; if so it reads the true current state via `document.fonts.check(fontSpec)`, otherwise `false` (matching the server). No per-font memory is kept.
2. **`useCallback(wordClicked, [lines])` + `React.memo(QuranWord)`** so a marks-load re-render bails out for words with no mark change.

## Root Cause

`fontReady` hard-coded `false` as its initial value, forcing `visibility: hidden` on the Quran text. A `useEffect` then called `document.fonts.check()`, found the font cached (a pager-neighbour panel had already downloaded it — all page fonts are `@font-face` injected), and set `fontReady = true`. Between mount and that callback there was at least one paint of the invisible state — the flash, even when no font loading was needed.

The mark re-render: `wordClicked` was re-created every render (no `useCallback`), so `React.memo` on `QuranWord` could never bail — every `QuranSafha` re-render cascaded through every word.

## Decision Tree / Algorithm

### Font-ready flash

`document.fonts.check()` is never stale, but it cannot be called directly in a `useState` lazy initializer on the **initial hydration render**: the server always renders `false`, so returning `true` on a bfcache'd client mismatches the first hydration paint. That risk applies *only* to the initial render. Every `QuranSafha` mounted after hydration — a pager panel created because a far page was jumped/searched/edition-switched/multi-step-swiped to — is a pure client-side insertion with no server counterpart to mismatch.

`let hasHydrated = false` at module level, flipped by `useEffect(() => { hasHydrated = true }, [])` inside `QuranSafha` (idempotent — many instances may set it together on the first paint). Then:

```
const [fontReady, setFontReady] = useState(() =>
  hasHydrated ? document.fonts.check(fontSpec) : false,
);
```

The existing `useEffect` (`document.fonts.check()` / `.load()` / `loadingdone` listener) is unchanged — it still corrects `fontReady` for the genuinely-loading case and re-syncs on every `loadingdone`, including a font that FontFaceInjector evicts-then-re-injects while its `QuranSafha` stays mounted.

| Mount context | `hasHydrated` | Lazy initializer reads | Result |
|---|---|---|---|
| Initial SSR/hydration render | `false` | always `false` | matches server, no hydration mismatch |
| Panel mounted after hydration, font loaded & still injected | `true` | `document.fonts.check()` → `true` | **no flash** (issue #373's target case) |
| Panel mounted after hydration, font not yet loaded | `true` | `document.fonts.check()` → `false` | skeleton shows; `useEffect` corrects once `.load()` resolves |
| Panel mounted after hydration, font evicted from FontFaceInjector's LRU and re-injected | `true` | `document.fonts.check()` → `false` (live) | skeleton shows correctly — the case that broke the earlier Set-based fix, now correct because nothing is *remembered* |

### Marks re-render

| Scenario | Before | After |
|---|---|---|
| Marks load, word has no mark | all words re-render | word bails out (memo) |
| Marks load, word gained / lost a mark | all words re-render | only that word re-renders |
| Page change (swipe/jump) | all words re-render | all words re-render (`words` prop changed) |

Fix: `useCallback(wordClicked, [lines])` + `React.memo(QuranWord)`.

## Verified Test Cases

Confirmed with a headless Playwright trace:
1. Cold load, font not cached (fresh hard navigation): `fq-quran-safha` starts hidden as expected, settles to the loaded font — unchanged.
2. Swipe/jump to a page whose font is loaded and still within FontFaceInjector's LRU: no flash — `document.fonts.check()` returns `true` synchronously at mount (no `visibility:hidden` on remount).
3. Bfcache'd / prior-session font on a fresh hydration: still starts `false` (matches SSR) — no hydration mismatch.
4. Swipe/jump to a page whose font left the LRU (needs re-download): skeleton shows correctly, no blank-page regression — `document.fonts.check()` is live, never falsely "ready". (Reasoned through; the LRU-eviction path needs navigating past 24 distinct pages. The correcting `useEffect` this relies on is unchanged and already shipped.)
5. Swipe with marks on the destination page: highlights present without an extra re-render of unmarked words.

## Files to Change

- `app/components/QuranSafha.tsx`
  - Module-level `let hasHydrated = false`; one mount `useEffect` to flip it.
  - `fontReady`'s `useState(false)` → the lazy initializer above.
  - Leave the existing `document.fonts.load()` / `loadingdone` `useEffect` intact — the lazy initializer only shortcuts the common case.
  - Wrap `wordClicked` with `useCallback([lines])` — `lines` is the only closure variable that changes between page navigations (not between mark re-renders).
- `app/components/QuranWord.tsx` — wrap the export with `React.memo`. Default shallow comparison suffices: `category` (the only mark-derived prop) is a string or `undefined`, and `word` is stable (same object from the same `lines` prop).
- `docs/architecture/DECISIONS.md` — the `fontReady` bullet (describes this `hasHydrated` mechanism).

_(The original 2026-07-22 fix also switched `app/hooks/use-is-tablet.ts` to `useIsomorphicLayoutEffect`; that predates the ADR 0043 move to CSS-`@media`-gated breakpoints — check current state before touching it.)_

## Constraints

- `hasHydrated` must stay a plain module-level boolean — never a `Set` or any structure that *remembers* a specific font's state (that is the staleness failure mode this fixes). It answers only "has the SSR/hydration boundary passed", not "is this font loaded".
- Do not remove the existing `useEffect`'s `document.fonts.check()` / `.load()` / `loadingdone` logic — the lazy initializer only shortcuts the common case; genuinely-loading and re-eviction cases still depend on it.
- `wordClicked`'s `useCallback` deps must include `lines` (used via `Object.values(lines).flat()` in the `char_type_name === "end"` branch). Do not add `marks` — marks changing is exactly when the callback must stay stable so `React.memo(QuranWord)` can bail.
- `QuranWord`'s `onWordClicked` prop receives `(e, word)`; the memo's default comparator compares by reference, so the caller-side `useCallback` is the load-bearing piece.
- Slow connection: if the neighbour panel's font hasn't finished loading before the swipe commits, `document.fonts.check()` returns `false` and the skeleton shows while it downloads. Correct — the fix only removes the flash when the font is genuinely ready.

## What NOT to Do

- Do not revive the `loadedFonts` module-level Set — it went stale under the persistent pager's font eviction/re-injection cycle (it cached a *remembered* boolean, not *live* state), reporting `fontReady=true` for a font that was actually re-downloading, which `font-display: block` then rendered as a blank page.
- Do not gate the lazy initializer on anything font-specific (a Set, cache, or ref) — gate only on the hydration boundary; per-font truth must always come from a live `document.fonts.check()`.
- Do not call `document.fonts.check()` in the lazy initializer without the `hasHydrated` guard — reintroduces the hydration-mismatch bug (server renders `false`, a bfcache'd client returns `true`).
- Do not use `useState(false)` + `useIsomorphicLayoutEffect` for `fontReady` — React 18 concurrent mode can yield to the browser between commit and layout effects, painting the skeleton state first.
- Do not use `useSyncExternalStore` — Next.js App Router RSC navigation uses `getServerSnapshot()` (→ `false`) during navigation renders.
- Do not initialise `fontReady` as `true` unconditionally — skips the skeleton on a genuinely cold load.
- Do not memo `QuranLine` with a custom marks comparator — the `QuranWord` memo handles the expensive leaf re-renders; a `QuranLine` comparator adds complexity for negligible gain.
- Do not add `marks` to `wordClicked`'s `useCallback` deps — defeats the optimisation.

## Decisions Made

- `fontReady`'s initial-state check is gated on a hydration boundary (`hasHydrated`), not on a per-font memory. This fixes both known failure modes: the pre-fix flash (always started `false`) and the earlier fix's staleness (a remembered Set going stale under font eviction).
- `QuranWord` is memoised at the leaf level only (not `QuranLine`) — sufficient for "only re-render words with marks", less risk of comparator bugs.

## Revision History

- 2026-08-23 — folded Addendum (Issue #373, part of #371). **Supersedes the original `loadedFonts` module-level Set** — the Set was removed when ADR 0028's persistent pager shipped (`FontFaceInjector` evicts and re-injects page `@font-face` styles, and a *remembered* Set could not tell a re-downloading font from a loaded one, producing a blank page). Replaced by a `hasHydrated` boolean gate + live `document.fonts.check()` lazy initializer. The `useCallback` + `React.memo` marks-re-render fix is unchanged.
