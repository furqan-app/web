---
title: Fix QuranSafha Swipe Flicker (font-ready flash + mark re-renders)
type: bug
date: 2026-07-22
status: implemented
area: reader
---

# Fix QuranSafha Swipe Flicker (font-ready flash + mark re-renders)

## Summary

On tablet in carousel mode, swiping to the next spread causes a visible one-frame
flash where the Quran text goes invisible (`visibility: hidden`) and then reappears.
A secondary issue: when marks data resolves, all `QuranWord` components re-render
even those with no mark changes. Both are caused by `QuranSafha` initializing state
conservatively (`fontReady = false`) without checking whether the font is already
loaded — something it always is for carousel neighbors.

## Root Cause

`QuranSwipeNav` is remounted on every navigation (per ADR 0027 — required so
`isCommitting` resets and the strip transform clears). All `QuranSafha` instances
inside it are therefore also remounted with fresh state.

`fontReady` hard-codes `false` as the initial value:

```tsx
const [fontReady, setFontReady] = useState(false);
```

With `fontReady = false`, the Quran text is forced to `visibility: hidden`. Then
`useEffect` fires, calls `document.fonts.check()`, finds the font already in the
browser's font cache (it was a carousel neighbor panel — all six fonts are `@font-face`
injected, so they were downloaded when visible), and calls `setFontReady(true)`.
Between mount and that `useEffect` callback there is at least one browser paint where
the text is invisible — the user sees the skeleton flash even though no font loading
is needed.

The mark re-render issue: `wordClicked` is re-created on every render (no `useCallback`),
so `React.memo` on `QuranWord` can never bail out — every `QuranSafha` re-render
(including the marks-load re-render) cascades through every word.

## Decision Tree / Algorithm

### Font-ready flash

Three approaches were tried before the final solution:

- `useState` lazy initializer: fires during client hydration; if the font is cached from
  a prior visit, returns `true` while the server returned `false` → Suspense boundary
  hydration error.
- `useState(false)` + `useIsomorphicLayoutEffect`: React 18 concurrent mode can yield
  to the browser between commit and layout effects, allowing a paint of `fontReady=false`
  before the layout effect corrects it — the flash persists.
- `useSyncExternalStore`: Next.js App Router's RSC navigation causes React to use
  `getServerSnapshot()` (→ `false`) instead of `getSnapshot()` on the client during
  navigation, so `fontReady` still starts `false` — the flash persists.

Fix: module-level `Set<string>` (`loadedFonts`) populated by `useEffect` when each
page font finishes downloading. Module-level state survives navigation remounts (unlike
component state), so the new `QuranSafha` instance reads the cached value synchronously
via a `useState` lazy initializer — no React timing or transport assumptions needed.

Hydration-safe: `loadedFonts` is always empty on first page load because `useEffect`
(which populates it) has not run yet. Both server and client start `false`. No Suspense
boundary mismatch. On subsequent client-only remounts (swipe navigation), the carousel
neighbor's `useEffect` has already run and populated `loadedFonts`, so the new instance
starts `fontReady=true` immediately.

| Mount context | `loadedFonts.has(fontSpec)` | `fontReady` init | User experience |
|---|---|---|---|
| Initial page load (cold) | `false` (useEffect hasn't run yet) | `false` | Skeleton → font downloads → text ✓ |
| Swipe (neighbor loaded font) | `true` (neighbor's useEffect ran) | `true` | Text immediately, no flash ✓ |
| Swipe, font not yet loaded | `false` (neighbor's useEffect pending) | `false` | Skeleton → font loads → text ✓ |

### Marks re-render

| Scenario | Before fix | After fix |
|---|---|---|
| Marks load, word has no mark | All words re-render | Word bails out (memo) |
| Marks load, word gained a mark | All words re-render | Only this word re-renders |
| Marks load, word's mark removed | All words re-render | Only this word re-renders |
| Page change (swipe) | All words re-render | All words re-render (words prop changed) |

Fix: `useCallback` on `wordClicked` + `React.memo` on `QuranWord`.

## Verified Test Cases

1. **Swipe on tablet with no marks**: new spread appears with text visible immediately,
   no skeleton flash.
2. **First page load (cold)**: skeleton shows while font downloads, then text appears.
3. **Swipe on tablet with marks on the destination page**: spread appears, marks
   highlights present without an extra re-render of unmarked words.
4. **Swipe on mobile** (single-panel path, ADR 0027): unaffected — `QuranSwipeNav`
   still remounts but the font behavior is the same; the carousel-specific fix
   (`fontReady` starting as `true`) also benefits mobile first-swipe when font is cached.

## Files to Change

- `app/components/QuranSafha.tsx`
  - Add module-level `const loadedFonts = new Set<string>()` (after imports).
  - Replace `useState(false)` for `fontReady` with `useState(() => loadedFonts.has(fontSpec))`.
  - `useEffect([fontSpec])`: calls `document.fonts.load(fontSpec)`, on resolve does
    `loadedFonts.add(fontSpec)` then `setFontReady(true)`. If already in `loadedFonts`,
    calls `setFontReady(true)` immediately and returns early.
  - Wrap `wordClicked` with `useCallback([lines])` — `lines` is the only closure
    variable that changes between page navigations (not between mark re-renders).

- `app/components/QuranWord.tsx`
  - Wrap the component export with `React.memo`. Default shallow comparison is
    sufficient: `category` (the only mark-derived prop) is a string or `undefined`,
    and `word` is stable (same object reference from the same `lines` prop).

- `app/hooks/use-is-tablet.ts`
  - Replace `useEffect` with `useIsomorphicLayoutEffect` (falls back to `useEffect`
    on the server). `useLayoutEffect` runs synchronously before the browser paints,
    so the `false → true` state update on swipe-navigation remounts happens
    pre-paint and no layout shift is visible.

## Constraints

- `loadedFonts` is populated only by `useEffect`, which does not run during SSR or
  hydration. So the lazy initializer always returns `false` on first page load, matching
  the server render — no Suspense boundary hydration mismatch.
- The `useEffect` async `document.fonts.load()` path must remain. The `loadedFonts` Set
  only short-circuits the `false → true` state bounce on remount; it does not replace
  the font download logic. On a genuinely cold load, `useEffect` still drives the wait.
- `wordClicked`'s `useCallback` deps must include `lines` (used via
  `Object.values(lines).flat()` in the `char_type_name === "end"` branch).
  Do not add `marks` — marks changing is exactly when we want the callback to stay
  stable so `React.memo(QuranWord)` can bail out.
- `QuranWord`'s `onWordClicked` prop passes a handler that receives `(e, word)` —
  the memo's default comparator compares by reference, so the `useCallback` on the
  caller side is the load-bearing piece.
- Slow 4G: if the carousel neighbor panel's font has not finished loading before the
  user commits the swipe, `loadedFonts` won't have it yet. The skeleton is shown while
  the download completes. This is correct behavior — the fix only eliminates the flash
  when the font is already ready.

## What NOT to Do

- Do not use a bare `useState` lazy initializer with `document.fonts.check()` directly
  — it fires during client hydration; if the font is cached from a prior page load, it
  returns `true` while the server returned `false`, causing a Suspense boundary hydration
  error. The `loadedFonts` Set is safe because `useEffect` (which populates it) has not
  run yet at hydration time.
- Do not use `useState(false)` + `useIsomorphicLayoutEffect` — React 18 concurrent
  mode can yield to the browser between commit and layout effects, allowing a paint of
  the skeleton state before the layout effect corrects it.
- Do not use `useSyncExternalStore` for this — Next.js App Router's RSC navigation
  causes React to use `getServerSnapshot()` (→ `false`) during navigation renders,
  defeating the purpose.
- Do not initialize `fontReady` as `true` unconditionally — that would skip the
  skeleton on first page load when the font is genuinely not ready.
- Do not memo `QuranLine` with a custom marks comparator — the `QuranWord` memo
  handles the expensive leaf re-renders; `QuranLine` re-rendering is cheap (one
  function call + reconciler bailout for each memo'd `QuranWord`). The custom
  comparator adds complexity for negligible gain.
- Do not add `marks` to `wordClicked`'s `useCallback` deps — that defeats the
  optimization (callback changes every time marks load → `QuranWord` memo is
  bypassed).

## Decisions Made

- Module-level `loadedFonts` Set for `fontReady`: lazy initializer with `document.fonts.check()`
  abandoned (hydration mismatch), `useIsomorphicLayoutEffect` abandoned (React 18 concurrent
  paint before layout effect), `useSyncExternalStore` abandoned (Next.js RSC navigation uses
  `getServerSnapshot` on client). Module-level state is the only mechanism that both survives
  remounts and is empty at hydration time.
- `QuranWord` memoized at the leaf level only (not `QuranLine`) — sufficient for the
  "only re-render words with marks" goal, less risk of comparator bugs.

## Addendum — 2026-08-23: fontReady flash regressed under the persistent pager (Issue #373)

**Date:** 2026-08-23
**Issue:** [#373](https://github.com/furqan-app/web/issues/373) (part of #371)

### Regression

The `loadedFonts` module-level Set from the fix above is no longer in `QuranSafha.tsx`. It was
removed once ADR 0028's persistent pager shipped: `FontFaceInjector` evicts a page's `@font-face`
`<style>` when it leaves the tracked window and re-injects (re-downloads) it if the page returns —
the Set had no way to know a previously-"loaded" font had since been evicted, so it reported
`fontReady=true` for a font that was actually re-downloading. `font-display: block` then rendered
invisible text with **no skeleton to cover it** — a blank page, worse than the flash the Set was
fixing. `QuranSafha.tsx:312-324`'s comment documents this trade-off explicitly.

The replacement is a plain `useState(false)` + `useEffect` that calls `document.fonts.check(fontSpec)`
— correct (never stale) but always starts `false`, guaranteeing at least one paint of the
skeleton/hidden-text state even when the font is genuinely already loaded and ready. This is the
flash issue #373 reports: "QuranSafha initializes fontReady=false ... causing a brief skeleton
shimmer/visibility toggle flash even if the font is in cache."

### Root cause of the regression

The Set went stale because it cached a *remembered* boolean ("this font was loaded at some point")
rather than *live* state. `document.fonts.check()` itself is never stale — the only reason it can't
be called directly in a `useState` lazy initializer (which runs synchronously during render, avoiding
the async `useEffect` delay) is the SSR/hydration mismatch risk described in the "What NOT to Do"
above: the server always renders `false`, so a lazy initializer that returns `true` on a bfcache'd
client would mismatch the very first hydration paint.

That mismatch risk applies **only to the initial hydration render**. Every `QuranSafha` mounted after
hydration — a pager panel created because a far-away page was navigated to (jump/search/edition-switch/
multi-step swipe) — is a pure client-side insertion with no server-rendered counterpart to mismatch
against. Calling `document.fonts.check()` directly and synchronously is safe there, and reads the true
current state instead of a remembered one — so it can never go stale the way the Set did.

### Fix

A module-level `let hasHydrated = false`, flipped to `true` by a `useEffect(() => { hasHydrated = true
}, [])` inside `QuranSafha` (idempotent — multiple instances mounting together on the initial paint may
all set it, harmlessly). `fontReady`'s `useState` becomes a lazy initializer:

```
const [fontReady, setFontReady] = useState(() =>
  hasHydrated ? document.fonts.check(fontSpec) : false,
);
```

The existing `useEffect` that calls `document.fonts.check()`/`.load()`/listens for `loadingdone` is
unchanged — it still corrects `fontReady` for the genuinely-loading case and re-syncs on every
`loadingdone` event, including a font that gets evicted-then-re-injected while its `QuranSafha`
instance stays mounted.

| Mount context | `hasHydrated` | Lazy initializer reads | Result |
|---|---|---|---|
| Initial SSR/hydration render | `false` | always `false` | matches server, no hydration mismatch (unchanged from the fix above) |
| Panel mounted after hydration, font genuinely loaded & still injected | `true` | `document.fonts.check()` → `true` | **no flash** — issue #373's target case |
| Panel mounted after hydration, font not yet loaded | `true` | `document.fonts.check()` → `false` | skeleton shows correctly, `useEffect` corrects once `.load()` resolves |
| Panel mounted after hydration, font evicted from FontFaceInjector's LRU and re-injected | `true` | `document.fonts.check()` → `false` (live, not stale) | skeleton shows correctly — the exact case that broke the original Set-based fix, now correct because nothing is *remembered* |

### Verified Test Cases

Confirmed with a headless Playwright trace against the implementation:
1. Cold load, font not cached (fresh hard navigation): `fq-quran-safha` starts with no `visibility`
   override missing/hidden as expected, settles to the loaded font — unchanged.
2. Swipe/jump to a page whose font is already loaded and still within FontFaceInjector's 24-page LRU:
   confirmed no flash — `document.fonts.check()` returns `true` synchronously at mount (no
   `visibility:hidden` observed on remount in the trace).
3. Bfcache'd/prior-session font on a fresh hydration: still starts `false` (matches SSR) — no
   hydration mismatch, per the still-active constraint from the fix above.

Reasoned through but not independently isolated in the trace (the LRU-eviction path requires
navigating past 24 distinct pages, out of scope for a quick verification run — the mechanism itself
is unchanged from the pre-existing, already-shipped `useEffect`/`document.fonts.check()` correction
path, which this addendum does not touch):
4. Swipe/jump to a page whose font left the LRU (needs re-download): skeleton shows correctly, no
   blank-page regression — `document.fonts.check()` is live, so it never falsely reports ready.

### Files to Change

- `app/components/QuranSafha.tsx` — module-level `hasHydrated` boolean; `fontReady`'s `useState(false)`
  → lazy initializer; one new mount-effect to flip `hasHydrated`.
- `docs/architecture/DECISIONS.md` — the `fontReady` bullet (currently describing the removed
  `loadedFonts` Set) needs updating to describe this mechanism instead.

### Constraints

- `hasHydrated` must stay a plain module-level boolean, never a `Set` or any structure that
  *remembers* a specific font's state — that's exactly the staleness failure mode this addendum
  fixes. It exists only to answer "has the SSR/hydration boundary passed", not "is this particular
  font loaded".
- Do not remove the existing `useEffect`'s `document.fonts.check()`/`.load()`/`loadingdone` logic —
  the lazy initializer only shortcuts the common case; genuinely-loading and re-eviction cases still
  depend on it.

### What NOT to Do

- Do not revive the `loadedFonts` module-level Set — it went stale under the persistent pager's font
  eviction/re-injection cycle (this addendum's whole reason for existing).
- Do not gate the lazy initializer on anything font-specific (a Set, a cache, a ref) — gate only on
  the hydration boundary; the per-font truth must always come from a live `document.fonts.check()`
  call.
- Do not call `document.fonts.check()` unconditionally in the lazy initializer without the
  `hasHydrated` guard — reintroduces the original hydration-mismatch bug the very first fix (above)
  discovered.

### Decisions Made

- `fontReady`'s initial-state check is gated on a hydration boundary (`hasHydrated`), not on a
  per-font memory. This fixes both known failure modes: the pre-fix flash (always starts `false`) and
  the earlier fix's staleness (a remembered Set going stale under font eviction).
