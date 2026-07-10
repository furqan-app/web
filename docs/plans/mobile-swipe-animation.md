# Mobile Swipe Page Animation

**Type:** feature  
**Date:** 2026-07-08  
**Status:** implemented

## Summary

Drag-to-reveal swipe animation on the mobile Quran reader. As the user drags horizontally, the current page follows their finger. On release above the commit threshold the page flies off-screen and the router navigates. Below the threshold the page snaps back. `prefers-reduced-motion` is respected throughout. All logic lives in `QuranSwipeNav.tsx`. A post-navigation flicker (browser compositor artifact) is accepted as a platform limitation.

## What Was Built

`QuranSwipeNav` is a single-slot wrapper: one `overflow-hidden` outer div with an inner `stripRef` div that holds only the current page content. Touch events on the outer div drive imperative `style` mutations on the `stripRef` — no React state updates on every touchmove frame.

**Files changed:**
- `app/components/QuranSwipeNav.tsx` — all swipe logic
- `app/components/reader/ReaderPage.tsx` — computes `prevPageNum`/`nextPageNum` and passes them as `prevHref`/`nextHref` props (plain page-order ±1, locale-independent)

## Algorithm

### `onTouchStart`
- Record `touchStartX`, `touchStartY`
- Reset `isDragging = false`
- Clear `stripRef.style.transition` (prevents lingering snap-back from fighting a new drag)

### `onTouchMove`
```
deltaX = currentX - touchStartX
deltaY = currentY - touchStartY

if !isDragging AND |deltaX| ≤ |deltaY|: skip (vertical — let browser scroll)
if |deltaX| > |deltaY|: isDragging = true

if isDragging:
  stripRef.style.transition = 'none'
  stripRef.style.transform = `translateX(${deltaX}px)`
```

### `onTouchEnd`
```
if !isDragging: no-op (vertical gesture, no snap-back)
isDragging = false

if |deltaX| < 80px (COMMIT_THRESHOLD):
  → snap-back: transition 200ms ease-out → translateX(0)
  → return

goNext  = deltaX > 0   // swipe right = next page (Quran RTL convention)
href    = goNext ? nextHref : prevHref
commitX = goNext ? '100%' : '-100%'

if prefers-reduced-motion:
  router.push(href)
  return

stripRef.style.transition = 'transform 220ms cubic-bezier(0.23,1,0.32,1)'
stripRef.style.transform  = `translateX(${commitX})`
setTimeout(() => router.push(href), 220)
```

## Constants

| Constant | Value | Rationale |
|---|---|---|
| `COMMIT_THRESHOLD` | 80 px | Above 50px to avoid accidental commits now that page gives visible drag feedback |
| `EXIT_MS` | 220 ms | Snappy; matches the snap-back feel |
| `SNAP_BACK_MS` | 200 ms | Slightly faster — snap-back reads as more immediate |
| `EASE_OUT` | `cubic-bezier(0.23, 1, 0.32, 1)` | Strong ease-out for entering/exiting elements |

## Constraints

- Swipe right = next page, swipe left = previous page — constant regardless of UI locale (Quran text is always RTL).
- `prevHref`/`nextHref` are plain `pageId ± 1` hrefs (with wrap-around), not `getNavigationHref()` — the existing nav helper is locale-aware and would reverse the direction for RTL. This is established by `fix-mobile-swipe-direction.md`.
- Do not use `setState` on every touchmove frame — imperative DOM manipulation only.
- Do not add adjacent page fetches, `router.prefetch()`, `startTransition`, sessionStorage, or any CSS fade/keyframe mechanism — all were investigated and removed (see below).
- Do not add a transform-based entry animation on mount — reads as a second swipe.

---

## What We Tried and Failed

Every mechanism below was fully implemented, tested on production builds, and then removed because it either didn't fix the root cause or introduced a worse regression.

### Root cause (confirmed)

The post-navigation flicker is a **browser compositor artifact on real mobile devices** — a rendering pipeline gap between the old DOM unmounting and the new DOM's first composited frame. It is not a JS timing problem, not a React hydration problem, and not a font-loading problem. Confirmed via:
- 0 blank frames in 64 rAF-sampled frames (rAF monitor)
- 0.9ms atomic DOM gap (MutationObserver)
- Pixel-identical mobile screenshots between adjacent-slot content and the newly mounted page

The only reliable fix would be the **View Transitions API**, which requires Safari 18+ and experimental Next.js support — out of scope for this branch.

---

### 1. sessionStorage entry animation (original approach)

On committed swipe, write `swipeDirection` to `sessionStorage`. On new page mount, `useLayoutEffect` positions the strip off-screen; `useEffect` + double-rAF animates it to `translateX(0)`.

**Failed because:** Superseded by the three-page strip (Addendum 2) — the strip approach was cleaner and didn't need a signal mechanism. Later re-introduced in Addendum 4 and caused a "double swipe" perception (old strip already completed the visual swipe; new strip replayed it on mount). Reverted in Addendum 5.

---

### 2. Three-page strip + adjacent page fetches (most complex attempt)

Pre-fetch `prevPageWords` and `nextPageWords` in `ReaderPage` (sequential, per ADR 0013). Render three sections — `[nextSlot | currentContent | prevSlot]` — as absolutely-positioned layers inside a `stripRef` div. All three translate as a unit on drag, so the destination page's content appears naturally from behind.

**Failed because:** The flicker occurred *after* navigation (on the new page's first paint), not during drag. The strip made drag feedback smoother but didn't touch the post-navigation paint gap at all. Removed in Addendum 9: extra DB round-trips, extra complexity, zero net benefit on the symptom users actually reported.

---

### 3. `router.prefetch()` on touch start

Call `router.prefetch(nextHref)` and `router.prefetch(prevHref)` in `onTouchStart` to cache the RSC payload before the user commits.

**Failed because:** Did not measurably close the paint gap on real devices. Next.js already prefetches on link hover; adding unconditional prefetch on every touch start costs two network hints per touch even when the user just scrolls. Removed in Addendum 9.

---

### 4. CSS opacity fade via `useLayoutEffect` + `sessionStorage`

`useLayoutEffect` sets `strip.style.opacity = '0'` before first paint; `useEffect` + double-rAF fades to `1`.

**Failed because:** `useLayoutEffect` fires "before browser paint" only for React-driven renders. During App Router client-side navigation, the incoming RSC HTML is injected and **painted by the browser before React attaches**. The opacity write was retroactive — users saw the page appear at full opacity, then briefly disappear, then fade in. Worse than the original flicker.

---

### 5. CSS `@keyframes` animation via `document.documentElement` attribute

Set `data-swipe-fade` on `<html>` before `router.push()`; CSS `@keyframes swipeFadeIn` starts the new `.swipe-strip` at `opacity:0` synchronously with element creation (before any JS runs). `useEffect` removes the attribute on mount.

**Failed because:** CSS animations can only cover frames where the `.swipe-strip` element **exists**. The blank frames occurred during the gap between the old `QuranSwipeNav` unmounting and the new one's first paint — no element, no animation selector match. The `@keyframes` started too late.

---

### 6. `startTransition` wrapping

Wrap `router.push(href)` in React 18's `startTransition` — keeps the old tree mounted until the new RSC payload is ready, eliminating the unmount/remount gap.

**Failed because:** Next.js App Router already wraps its internal router dispatch in `startTransition` (confirmed in `node_modules/next/dist/client/components/app-router.js` lines 279+). Adding it again is a double-wrap and a complete no-op. Removed in Addendum 9.
