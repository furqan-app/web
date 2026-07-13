# Mobile Swipe Page Animation

**Type:** feature
**Date:** 2026-07-08
**Status:** implemented

## Summary

Drag-to-reveal swipe animation on the mobile Quran reader. The current page follows the finger; on release above the commit threshold it flies off-screen and the router navigates. Below threshold: snap back. `prefers-reduced-motion` respected. A post-navigation flicker (browser compositor artifact, confirmed not a JS/React/font-loading issue) is accepted as a platform limitation — the only reliable fix is the View Transitions API (Safari 18+, experimental Next.js support, out of scope).

All logic is in `QuranSwipeNav.tsx` using imperative DOM mutations — no React state on every touchmove frame.

## Algorithm

**`onTouchStart`:** record `touchStartX`/`touchStartY`, reset `isDragging = false`, clear `stripRef.style.transition`.

**`onTouchMove`:**
```
deltaX = currentX - touchStartX
deltaY = currentY - touchStartY
if !isDragging AND |deltaX| ≤ |deltaY|: return  (vertical scroll)
if |deltaX| > |deltaY|: isDragging = true
if isDragging:
  stripRef.style.transition = 'none'
  stripRef.style.transform = `translateX(${deltaX}px)`
```

**`onTouchEnd`:**
```
if !isDragging: return
isDragging = false

if |deltaX| < 80px (COMMIT_THRESHOLD):
  → snap-back: transition 200ms ease-out → translateX(0)
  → return

goNext  = deltaX > 0   // swipe right = next page (Quran RTL convention, locale-independent)
href    = goNext ? nextHref : prevHref
commitX = goNext ? '100%' : '-100%'

if prefers-reduced-motion:
  router.push(href); return

stripRef.style.transition = 'transform 220ms cubic-bezier(0.23,1,0.32,1)'
stripRef.style.transform  = `translateX(${commitX})`
setTimeout(() => router.push(href), 220)
```

## Constants

| Constant | Value | Rationale |
|---|---|---|
| `COMMIT_THRESHOLD` | 80px | Higher than old 50px — avoids accidental commits now that drag gives visible feedback |
| `EXIT_MS` | 220ms | Snappy; matches snap-back feel |
| `SNAP_BACK_MS` | 200ms | Slightly faster — snap-back reads as more immediate |
| `EASE_OUT` | `cubic-bezier(0.23, 1, 0.32, 1)` | Strong ease-out for entering/exiting elements |

## Files Changed

- `app/components/QuranSwipeNav.tsx` — all swipe logic
- `app/components/reader/ReaderPage.tsx` — computes `prevPageNum`/`nextPageNum`, passes as `prevHref`/`nextHref` props

## Constraints

- Swipe right = next page regardless of UI locale — Quran text is always RTL.
- `prevHref`/`nextHref` are plain `pageId ± 1` (not `getNavigationHref()` — that helper is locale-aware and would reverse direction for RTL).
- Do not use `setState` on every touchmove frame — imperative DOM mutations only.
- Do not add adjacent page prefetches, `router.prefetch()`, `startTransition`, sessionStorage, or CSS fade/keyframe mechanisms — all were implemented and removed (see below).

## What Was Tried and Removed

The post-navigation flicker is confirmed as a **browser compositor artifact** — a rendering pipeline gap between the old DOM unmounting and the new DOM's first composited frame. Not a JS timing, React hydration, or font-loading problem (confirmed via 0 blank frames in 64 rAF samples, 0.9ms DOM gap via MutationObserver, pixel-identical screenshots).

Approaches tried and removed from the final implementation:
1. **sessionStorage entry animation** — caused "double swipe" perception (old strip completed visual swipe; new strip replayed it on mount).
2. **Three-page strip + adjacent page fetches** — extra DB round-trips and complexity, zero benefit on the post-navigation paint gap.
3. **`router.prefetch()` on touchstart** — no measurable improvement; costs two network hints per touch even for scroll gestures.
4. **CSS opacity fade via `useLayoutEffect`** — `useLayoutEffect` fires retroactively during App Router client navigation (browser paints RSC HTML before React attaches); users saw page appear → briefly disappear → fade in.
5. **CSS `@keyframes` via `document.documentElement` attribute** — animation selector can't match during the unmount/remount gap when no element exists.
6. **`startTransition` wrapping** — Next.js App Router already wraps its router dispatch in `startTransition` (confirmed in source); double-wrapping is a no-op.
