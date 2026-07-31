# Fix QuranSafha Swipe Flicker (font-ready flash + mark re-renders)

**Type:** bug  
**Date:** 2026-07-22  
**Status:** implemented

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
