# Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle

**Type:** bug  
**Date:** 2026-07-18  
**Status:** implemented  
**Trello:** https://trello.com/c/YVdrjhtl/119

## Summary

Two related font-loading bugs fixed together. First: when the user navigates to a new Quran page pair, the new page's per-page font isn't cached yet. `font-display: block` makes the text invisible for ~3 seconds, then the browser falls back to the system font. Because the Quran page fonts use custom codepoint encoding, the system font renders garbled isolated Arabic letter forms instead of Quran text (reported via screenshot of page 7). The fix is a skeleton loading state in `QuranSafha` — the Quran text area shows shimmer lines until `document.fonts.load()` confirms the font is ready, so garbled text is never visible on any device or connection speed. Second: the PWA service worker's `precacheAllPages()` downloads all 604 fonts with no delay between iterations, saturating bandwidth and making the first bug worse for PWA-installed users. The fix is a small inter-iteration delay that spaces the precache requests out without affecting the total amount cached.

## Root Cause

**Bug 1 (garbled text):**
- `FontFaceInjector` injects `@font-face` rules for the current page pair with `font-display: block`.
- `font-display: block` makes text invisible during font download (~3 s block period), then falls back to the system font.
- System font cannot render the custom `code_v1` codepoints — shows isolated letter forms (garbled characters).
- `ReaderPage` only preloads one font (`p${pageId}.ttf`) via `<link rel="preload">`, and the pair partner's font has no preload by design (ADR 0013: partner font not preloaded to avoid downloading a hidden card in single-page view).
- On client-side navigation (`router.push()`), the new page's font is never in the browser cache → always requires a fresh download → always hits the block window.

**Bug 2 (PWA precache bandwidth, #119 scope):**
- `app/sw.ts`:`precacheAllPages()` fetches all 604 pages + 604 fonts sequentially with no delay.
- Triggered via `START_PRECACHE` from `use-pwa-precache.ts` whenever the app opens in `display-mode: standalone`.
- Continuous back-to-back fetches saturate the network, causing active navigation font downloads to queue behind the precache requests.
- Only affects PWA-installed users, but worsens Bug 1 on those devices.

## Decision Tree

**Font readiness gate (per-render in `QuranSafha`):**

| Condition | Initial state | After `useEffect` fires |
|---|---|---|
| Font is already cached (return visit / same pair re-render) | `fontReady = false` → skeleton shown | `document.fonts.check()` returns `true` → `setFontReady(true)` immediately, skeleton disappears |
| Font is not yet cached (fresh navigation) | `fontReady = false` → skeleton shown | `document.fonts.check()` returns `false` → `document.fonts.load()` called → resolves when download completes → `setFontReady(true)`, skeleton disappears |
| `page` or `tajweedMode` prop changes | `fontReady` reset to `false` on dependency change → skeleton shown | Same as above for the new font |

**Why `false` as initial state (not `true`):**
Both server and client start at `false`, so server-rendered HTML and the hydrated client agree — no hydration mismatch. For cached fonts, the skeleton is visible only for the tiny gap between React DOM paint and the `useEffect` running (sub-frame on fast devices). This is acceptable.

**Why `document.fonts.load()` (not polling or a timer):**
The Web Fonts API resolves the returned Promise exactly when the font finishes downloading, with no waste and no artificial delay. `document.fonts.check()` is synchronous and handles the cached-font fast path without creating a Promise.

**`font-display: block` pairs correctly with this approach:**
During the block period text is invisible (not garbled) AND the skeleton overlays the hidden text elements, so there is nothing garbled to peek through. The font becomes usable exactly when `document.fonts.load()` resolves — the two signals are synchronized.

**SW throttle decision tree (per `precacheAllPages()` iteration):**

```
for each page id 1..604:
  fetch page HTML if not cached
  fetch font if not cached
  report progress
  await 200ms   ← NEW
```

200ms was chosen as it paces 604 iterations over ~2 minutes total (acceptable for a background offline-install task) while leaving the network free between requests for any active navigation fetch to complete.

## Verified Test Cases

| Scenario | Before fix | After fix |
|---|---|---|
| First visit to page 7 (font not cached) | Text invisible 3 s → garbled Arabic characters | Skeleton shimmer lines shown → correct Quran text appears when font ready |
| Return visit to page 7 (font cached) | Text visible immediately | Skeleton disappears instantly (`document.fonts.check()` hits the fast path) |
| Navigate to page 7, then page 9 (different font) | Page 9 shows garbled text | Page 9 shows skeleton, then correct text |
| Tajweed mode on, navigate to new page | Garbled text (COLRv1 fallback) | Skeleton shown while COLRv1 font downloads |
| PWA standalone, first open | 604 font requests fire rapidly, congesting bandwidth | 604 font requests spaced 200ms apart; no competition with active page navigation |
| PWA standalone, return open (fonts cached) | SW iterates but `cache.match()` returns hit, no re-fetch | Same — existing idempotent behavior unchanged |

## Files to Change

- `app/components/QuranSafha.tsx`
  - Add `fontReady: boolean` state, initialized to `false`.
  - Add `useEffect([page, tajweedMode])` that calls `document.fonts.check()` for the fast path and `document.fonts.load()` for the download path, setting `fontReady` when the font is available.
  - In the `.fq-quran-safha` div: replace `<Suspense>` + `renderItems.map(...)` with a conditional — skeleton when `!fontReady`, real content when `fontReady`.
  - Skeleton: 15 `<div>` elements with `h-[1em] w-full rounded-sm bg-muted/60 animate-pulse` — they fill the flex container exactly as real line elements do (they are direct children of `.fq-quran-safha`, so the existing `space-between` / `gap` rhythm applies).

- `app/sw.ts`
  - In `precacheAllPages()`: add `await new Promise((r) => setTimeout(r, 200));` at the end of each loop iteration, after `reportProgress`.

## Skeleton Width Collapse Fix

During skeleton loading on desktop, the card is `md:w-auto` so its width is driven by intrinsic content width. The skeleton bars use `w-full` (a percentage), which creates a circular dependency with a `w-auto` parent — browsers resolve it to zero, collapsing the card to minimum width. When the font loads and real Arabic text renders, it expands the card to the correct width — causing a layout jump.

`minWidth: calc(var(--fq-word-base) * 14.42)` is NOT the right fix: `14.42` is the worst-case (widest) page, so most pages would show skeleton wider than content, then shrink — the opposite jump.

Correct fix: keep the real content always in the DOM (it provides the correct intrinsic width even when invisible) and use `visibility: hidden` on `.fq-quran-safha` to hide it, while the skeleton is an `absolute inset-0` overlay with `visibility: visible` (CSS visibility can be overridden on a child even when the parent is hidden). Add `relative` to `.fq-quran-safha` so the overlay is positioned within the text area, not the entire `.fq-content` box. This replaces the previous "conditionally render skeleton OR content" pattern with "always render content + conditionally show overlay".

## Constraints

- Do not change `font-display: block` to `swap` — `swap` would immediately show garbled system-font text, which is exactly what the skeleton is designed to prevent. `block` keeps text invisible during download, which is correct to pair with a skeleton overlay strategy.
- Do not add a `<link rel="preload">` for the pair-partner's font. DECISIONS.md (Mushaf Double-Page Spread section, ADR 0013) documents this as intentional: the partner font is not preloaded so that single-page view does not download a font for a `display:none` card. This constraint still holds — the skeleton handles the brief delay instead.
- `document.fonts.load()` must be called from inside a `useEffect`, not at render time or in an SSR context. `document` is undefined on the server.
- The `fontReady` `useEffect` depends on `[page, tajweedMode]` — both are required. Tajweed mode uses a completely different font family (`quran-p${page}-tajweed`) and switching modes while on the same page must re-check the new font.
- The 15-line skeleton count is a fixed constant (not derived from `lineKeys.length`). Pages 1–2 have fewer real lines but use `fq-safha-center` (gap layout, not `space-between`), so showing 15 skeleton bars looks slightly different for those pages — acceptable given the skeleton is transient.
- The 200ms SW delay applies to every iteration, including those where `cache.match()` returns a hit and no fetch is made. This is acceptable: hit iterations are ~1ms each even with the sleep, and the consistent pacing is simpler than conditional throttling.
- Do not increase the SW delay beyond 300ms — the precache needs to complete in reasonable time (~3 minutes) so it doesn't leave installed users with only a partially-cached set if they close the app.
- Pre-caching tajweed fonts is out of scope per the PWA & Offline constraint in DECISIONS.md (would nearly triple cache size against iOS quota). The SW delay fix applies only to base fonts, which is the current SW behavior.

## What NOT to Do

- Do not use `font-display: optional` — it suppresses font loading entirely after the first paint, leaving text permanently invisible on cold loads.
- Do not replace the entire `QuranSafha` card (header + text + footer) with a skeleton — the header and footer use `sura_names.ttf` and `Tajawal`, both of which are globally loaded and always available. Only the `.fq-quran-safha` text area needs the gate.
- Do not replace the real content with the skeleton (`!fontReady ? skeleton : content`) — removing the text from the DOM causes the `md:w-auto` card to collapse to zero width, then jump to the correct width when the font loads. Instead use `visibility: hidden` on `.fq-quran-safha` + an overlay with `visibility: visible`, so the text stays in DOM and provides the correct intrinsic width throughout.
- Do not use a `FontFaceObserver` npm package — the Web Fonts API (`document.fonts.check`/`document.fonts.load`) is available in all modern browsers (Chrome 35+, Firefox 41+, Safari 10+) and adds zero bundle weight.
- Do not add any `prefetch` hints for next-pair fonts — the skeleton approach makes the wait invisible, and preloading additional fonts adds unnecessary bandwidth consumption at page load time.
- Do not `await Promise.all([fontBase, fontTajweed])` — only the active mode's font affects rendering. Check and load only the font family that `getPageFontFamily(page, tajweedMode)` returns.

## Decisions Made

- **Skeleton line count: fixed 15.** Using `lineKeys.length` would require computing `activeLines` before the font check (already done), but adds complexity to the condition path. 15 is a good visual match for full pages (the common case) and the difference on short opening pages is acceptable.
- **SW delay: 200ms.** Balances precache completion time (~2 min total) with meaningful idle windows between requests.
- **No prefetch for next pair.** The skeleton eliminates the user-visible problem; adding prefetch would be a separate performance optimization with its own bandwidth trade-offs. Deferred.
- **Trello #119 expanded** to cover both the skeleton bug and the original "all pages fonts loading" performance issue — they share the same root cause (no loading state + unthrottled precache) and the same plan.
