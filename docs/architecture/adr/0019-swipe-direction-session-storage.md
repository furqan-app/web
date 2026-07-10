# ADR 0019: sessionStorage Key for Cross-Page Swipe Animation Direction

**Date:** 2026-07-08  
**Status:** Superseded — the sessionStorage direction key was removed in Addendum 2 (replaced by three-page strip), briefly re-introduced in Addenda 4/6 as a boolean fade signal under a different key, and fully removed in Addendum 9 (final state). No sessionStorage is used in the swipe flow.

## Context

The mobile Quran reader uses `router.push()` to navigate between pages on swipe. Each navigation destroys the current React tree and mounts a fresh one. To coordinate a full enter/exit animation (current page slides out, new page slides in from the correct edge), the incoming page component needs to know which direction the swipe came from — but `router.push()` carries no such payload, and the URL cannot be used (the page URL encodes only the page id, not how the user arrived at it).

## Options Considered

**Option A — sessionStorage key**  
Before calling `router.push()`, write the swipe direction (`'left'` | `'right'`) to `sessionStorage` under a fixed key (`'swipeDirection'`). The new `QuranSwipeNav` mount reads and immediately deletes the key, then animates accordingly.

**Option B — URL search param (`?swipe=right`)**  
Append `?swipe=right` to the navigation href so the new page receives direction as a URL parameter.

**Option C — React Context / global state**  
Store direction in a Zustand store or React context that survives navigation.

## Decision

Option A — `sessionStorage` with key `'swipeDirection'`. Values: `'right'` (user swiped right, new page slides in from the left) | `'left'` (user swiped left, new page slides in from the right). The key is read and deleted on the first mount of `QuranSwipeNav`.

## Consequences

- **+** Zero URL pollution — the page URL stays clean (`/ar/pages/42`), shareable, and cacheable.
- **+** No context provider changes — the animation is self-contained inside `QuranSwipeNav`.
- **+** The key is consumed exactly once (deleted on read), so a hard refresh or bookmarked URL never triggers a spurious animation.
- **-** Any future navigation trigger that wants a coordinated entry animation (arrow click, keyboard shortcut, sidebar link) must also write this key before navigating, or the new page will appear without an animation. This contract is invisible from the call site.
- **-** `sessionStorage` is not available during SSR — reading it must happen in a `useEffect` / `useLayoutEffect`, not in the render body.

---

> Key name: `'swipeDirection'`  
> Values: `'right'` | `'left'`  
> Written by: `QuranSwipeNav` `onTouchEnd` (before `router.push()`)  
> Read & deleted by: `QuranSwipeNav` `useLayoutEffect` on mount  
> Scope: mobile swipe only; other nav triggers do not write this key and arrive with no entry animation, which is intentional for now.
