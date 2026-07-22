# Tablet Nav Overlay Effect

**Type:** feature  
**Date:** 2026-07-20  
**Status:** ready-to-implement

## Summary

On tablet landscape (1024px–1366px, covering iPad landscape through iPad Pro 12.9"), the navbar is hidden by default on the Quran reader page, giving the full viewport to the mushaf. Tapping anywhere on the reader that is NOT Quran text toggles the navbar, which slides in from the top as a fixed overlay. The nav auto-hides after 3 seconds. On mobile and desktop the navbar behavior is unchanged.

## Approach

**Scope:** tablet only (`md` to `lg-1`), pages route only (`/pages/`). All other breakpoints and routes: nav always visible, static in flow — no change.

**Overlay mechanism:** On tablet + pages route, the nav switches from `position: static` (in document flow) to `position: fixed; top: 0; inset-x: 0; z-50`. When hidden, `translateY(-100%)` slides it above the viewport. When visible, `translateY(0)` slides it down. A CSS `transition-transform duration-300 ease-in-out` animates both directions.

**Toggle trigger:** `QuranSwipeNav` (a client component that already wraps the entire reader page) gets an `onClick` handler. When clicked, it calls `toggleOverlay()`. Word clicks call `e.stopPropagation()` so they never reach `QuranSwipeNav`'s handler — the mark modal opens normally with no nav toggle.

**Auto-hide:** 3 seconds after `overlayVisible` becomes `true`, a `setTimeout` calls `hideOverlay()`. The timer is stored in a `useRef` and cleared on every toggle/hide so rapid taps reset cleanly.

**Height:** When the nav is `fixed` on tablet, it leaves the document flow. The reader's outer wrapper (`min-h-[calc(100dvh-3.5rem)]`) remains — since the wrapper now starts at `y=0`, it occupies the full usable viewport while the nav overlays on top. The `md:justify-center` centering on the wrapper ensures the Safha card is centered in that space. The 56px at the bottom is `bg-background` — visually seamless.

## Decision Tree

| Condition | Nav behavior |
|---|---|
| Desktop (`lg+`) | Static, always visible — no change |
| Tablet (`md`–`lg-1`), non-pages route | Static, always visible — no change |
| Tablet (`md`–`lg-1`), pages route, `overlayVisible=false` | Fixed, `translateY(-100%)` (hidden above viewport) |
| Tablet (`md`–`lg-1`), pages route, `overlayVisible=true` | Fixed, `translateY(0)` (overlaid at top) |
| Mobile (below `md`) | Unchanged (future work) |

## Verified Test Cases

| Scenario | Expected |
|---|---|
| Load reader page on tablet | Nav hidden, full viewport for mushaf |
| Tap on background / padding area | Nav slides down, timer starts (3s) |
| Tap again while nav visible | Nav slides up immediately, timer reset |
| Wait 3s with nav visible | Nav auto-slides up |
| Tap on a Quran word | Mark modal opens, nav state unchanged |
| Tap on verse-end marker | Verse display text shown, nav state unchanged |
| On desktop (`lg+`) | Nav always visible, static — reader unchanged |
| On mobile (below `md`) | Unchanged — future ticket |
| On non-pages route (tablet) | Nav always visible, static |

## Tablet Full-Screen Safha Sizing

On tablet (1024px–1366px), the Quran safha cards fill the full screen edge-to-edge (width) and full viewport height, mirroring the reference mushaf app. Nav is already a fixed overlay so 100dvh is available.

**Layout changes (implemented, working):**
- `globals.css` — `@media (min-width: 1024px) and (max-width: 1366px)` block: `.fq-reader-outer` full dvh, no pb; `.fq-reader-spread-container` no inline padding; `.fq-nav-arrow` hidden; `.fq-spread` width 100% + 0.5rem binding gap; `.fq-full-safha > div` height 100dvh + width 100%; `.fq-full-safha .fq-stack-layer` hidden
- `app/components/reader/ReaderPage.tsx` — `fq-reader-outer` / `fq-reader-spread-container` CSS class hooks
- `app/components/reader/QuranSpread.tsx` — `fq-nav-arrow` class on NavigationArrow
- `app/components/QuranSafha.tsx` — `useIsTablet()`: no card chrome, no minWidth, no stack layers, `px-3 py-3` padding

**Font sizing — RESOLVED.**

Root cause of the empty-bottom-space bug: the QPC v1 font is drawn so each line's
glyphs span the full mushaf page width, so the font is bounded by a **width cap**
`(50vw − 28px) / 14.7` (largest font before the widest line wraps). Attempt 4's
`min(max(26px, 3.2dvh), widthCap)` floored the font at 26px — well *below* that
~31–33px width cap — so lines neither reached the card edges (horizontal gap) nor
filled the height (large bottom gap).

Key geometry: a real mushaf page's aspect ratio ≈ the tablet half-screen card's
aspect ratio, so a font sized to fill the width also roughly fills the height with
the mushaf's designed line spacing. The fix is to size to the smaller of two caps:

```css
--fq-t-word: min(calc((50vw - 28px) / 14.7), calc((100dvh - 78px) / 22.1));
```

- **width cap** `(50vw − 28px) / 14.7` — never-wrap divisor (as before).
- **height cap** `(100dvh − 78px) / 22.1` — largest font before 15 lines + gaps +
  header/footer overflow 100dvh. Budget: 15 rows × f + 15 gaps × 0.417f = 21.26f,
  plus ~78px fixed chrome (py-3 + header + footer); −78px is slightly generous so
  the footer is never clipped.

Because the two caps land close on real tablets, the **height cap binds**, content
fills 100dvh exactly, and the footer pins to the card bottom with negligible dead
space. On wide-short viewports the height cap prevents overflow. Verified sizes:
iPad 1024×768 → 31.2px; iPad Pro 1366×1024 → 42.8px; 1280×800 → 32.9px (height-bound).

Also added `flex: 1 1 auto; min-height: 0` to `.fq-quran-safha` in the tablet block
so the footer stays pinned to the bottom even when the width cap binds and the text
block is a touch shorter than 100dvh — any residual sits as card background above the
footer (matches the reference app's "background fills remaining space below").

**No scroll / perfect fit — verified in-browser.** Two issues surfaced under
measurement and were fixed:

1. **16px page scroll.** `.fq-reader-outer` carries a JSX `pb-4` (16px) utility, and
   the tablet `padding-bottom: 0` sat in `@layer base` — which loses to the utility
   layer. Added `!important` to the tablet `padding-bottom`/`min-height` so the
   reader is exactly 100dvh (docScroll 784 → 768).
2. **~61px dead gap above the footer.** The line-gap is pinned to the flat 9.6px
   floor (`--fq-line-gap-base`), not `0.417f`, so 15 lines top-packed and left a big
   gap. Fixed by adding `justify-content: space-between` to `.fq-quran-safha` (tablet
   only) so the lines distribute evenly across the flex:1 height — an authentic
   printed-mushaf look. The height cap on `--fq-t-word` guarantees the glyphs always
   fit, so space-between only ever adds positive spacing.

Measured results (dev server, in-app browser):
- 1024×768: font 31.2px, 15 rows, even 12px gaps, no scroll, no clip.
- 1366×1024: font 42.8px, 15 rows, even 17px gaps, no scroll, no clip.
- Pages 1–2 (Al-Fatiha, 7 lines): airy/balanced opening-page look, fits, no scroll.

**Font-scale control hidden on tablet.** Since `--fq-t-word` auto-fits the font to
the page, the manual `QuranFontScaleControls` in `SettingsSidebar` does nothing on
tablet. It was inside `hidden lg:block` (visible ≥1024px, which includes the tablet
range), so it now renders only when `!useIsTablet()` — still shown on desktop lg+.
Verified: the tablet Settings sheet shows Account, Language, Page View, Appearance,
Tajweed Colors — no Quran Font Size.

**Status: implemented and verified in-browser — lint clean.**

Attempts that failed (kept for the record):
1. **Direct width formula** `(50vw - 28px) / 14.7` alone — overflowed/clipped on
   wide-short viewports (no height cap).
2. **Desktop min() passthrough** — too small: `--fq-word-base` floors at 24px.
3. **Height formula** `100dvh / 24` with `space-between` — distributed lines with
   uneven oversized gaps.
4. **`min(max(26px, 3.2dvh), widthCap)`** with flex-start — font capped at 26px →
   large empty bottom space (see root cause above).

**Status: implemented — lint clean. Pending visual confirmation in the browser.**

## Tablet refinements — binding divider, compact chrome, book-stack

Three follow-up tweaks to the tablet full-screen safha (all in `globals.css`
tablet block + `QuranSafha.tsx`):

1. **Binding divider (intended design element).** A 1px `hsl(var(--border))` line
   centred between the two facing pages via `:root[data-safha-view="double"]
   .fq-spread::after` (`left: 50%`, `.fq-spread { position: relative }`). Reads as
   the book spine; tracks the theme like every other divider.

2. **Compact header/footer.** The shared safha header (surah glyph) and footer
   (page number) are tall for a full-screen tablet page, so they're shrunk *on
   tablet only* via new class hooks — `fq-safha-header` / `fq-safha-surah-glyph`
   (glyph 1.1rem → 0.95rem, `pb-2` → 0.25rem) and `fq-safha-footer` (`pt-2` →
   0.25rem, `text-sm` → 0.75rem). `!important` beats the JSX utilities and the
   inline glyph font-size (base layer loses to utilities/inline). The reclaimed
   ~12px is returned to the text: height-cap chrome budget 78px → 66px.

3. **Book-stack restored on both sides (like desktop).** The decorative stacked-
   page layers were hidden on tablet; they're now shown (`hidden md:block`, the
   `isTablet` hide removed in both JSX and the deleted `.fq-stack-layer { display:
   none }` rule). Each page's stack peeks toward its *outer* edge (left page left,
   right page right — `stackPeekSide`), so the spread reads as an open book with
   page-stacks on both sides. Two enablers: the tablet card regains its opaque
   paper background (`isTablet ? "bg-card"`) so the stacks only show as peek edges,
   not through the text; and the spread container regains a 10px inline clearance
   (was 0) so the outer 8px `translate-x` peek isn't clipped at the viewport edge.
   Width-cap chrome 28px → 38px to account for that 10px. (Bottom `translate-y`
   peek is clipped by the 100dvh card — the side peek is the book-stack read.)

4. **Fitting constants re-tightened to reclaim slack.** After design edits stripped
   real chrome (content `py-3 → py-1`, footer lost `pt-2`/border, header lost border,
   footer `0.75 → 0.65rem`, quran `padding-block 0.5em → 0.2em`), the caps over-
   reserved and under-sized the font. Retuned:
   `--fq-t-word: min((50vw − 16px)/14.7, (100dvh − 50px)/21.9)`.
   - width chrome 38 → 16px: content no longer has `px-3` on tablet, so true
     horizontal chrome is 4px half-gap + 10px clearance (+2px margin).
   - height fixed 66 → 50px: true fixed chrome ≈43px (py-1 + header pb-2 + glyph +
     footer) + 7px cushion. Content-independent → safe for all pages.
   - height divisor 22.1 → 21.9: reclaims part of the padding-block saving only.
     **Deliberately NOT lowered further:** the binding case is a surah-START page
     (~13 rows + a 2.417f banner via `--fq-heading-h`, QuranLine.tsx), which needs
     ~21.9f. A plain page needs ~21.2f; that difference is banner headroom, not
     reclaimable slack — lowering toward 21.2 would clip Quran text (overflow-hidden).

5. **Swipe steps a whole pair in double view.** The swipe always moved ±1 page,
   but `getPagePair` groups pages (1,2)(3,4)…, so from a spread one swipe landed on
   the same spread's other member — the reader had to swipe twice to advance.
   `QuranSwipeNav` now takes `singleStep` + `pairStep` href sets and picks pair-step
   when `view === "double" && isLgUp` (same condition as QuranSpread's arrows).
   `ReaderPage` computes page-order pair hrefs (`nextPairPageNum = leftPageId + 1`,
   `prevPairPageNum = rightPageId − 2`, wrapping at the ends). Single view / mobile
   still steps one page. Swipe can't fire pre-hydration, so the hook read is safe.

6. **Airier line spacing via a slightly smaller font (height divisor 21.9 → 23).**
   With the printed-mushaf redesign in place, the user wanted a more open, spacious
   page. Font size and visible line spacing are a zero-sum pair here: the 15 rows are
   laid out `justify-content: space-between`, so *any* vertical surplus is distributed
   as inter-line gap. Shrinking the font frees surplus → `space-between` opens the gaps.
   The font shrink is done purely by raising the height divisor:
   `--fq-t-word: min((50vw − 16px)/14.7, (100dvh − 50px)/23)`.
   - `21.9 → 23` ≈ −5% font (≈34.3px → 32.6px at 1280×800). Chosen "moderate" of
     subtle(22.4)/moderate(23)/pronounced(24). Starting value — tune in-browser.
   - **Width cap (14.7) untouched:** a *smaller* font can never wrap, so no line-break
     risk. Height cap still binds (it already did), so the font genuinely shrinks.
   - `--fq-heading-h` (2.417f) and the `--fq-line-gap` floor (0.417f) auto-scale down
     with the font, so **this also clears the pre-existing ~7px surah-start clip**
     (page 151 measured scrollHeight 751 > clientHeight 743) — raising the divisor adds
     banner headroom, the opposite of the earlier "don't *lower* it" concern.
   - This **supersedes** the earlier "Do not touch the height-fit formula 21.9"
     constraint below: raising it (smaller font, more headroom) is safe and intended;
     the still-standing rule is only "never *lower* it toward 21.2" (that clips banners).

**Status: implemented — lint clean. Pending visual confirmation in-browser, especially
a surah-start page (banner is the binding height case) and the airier line spacing.**

## Tablet swipe — real 3-panel carousel (double-view only)

**Goal:** on the tablet spread, swiping should slide the **real next spread (2 safha)** into
view following the finger, instead of sliding the current spread over blank space and popping
the new one in after navigation. See [ADR 0027](../architecture/adr/0027-tablet-swipe-carousel.md).
This is a **tablet-scoped exception** to the "Swipe Animation — Core Gesture Only" decision;
mobile / single-view swipe stays byte-for-byte unchanged.

**Scope decided with user:** tablet double-view only for now. Desktop double-view and mobile are
explicitly deferred ("we will work on the others later").

### Structure
- `ReaderPage` (server, static) fetches **three** spreads — prev-pair, current-pair, next-pair —
  via `getPageWords`, kept **sequential** (ADR 0013, DB connection limit at build). It renders three
  `<QuranSpread>` panels and passes them to `QuranSwipeNav` as `prevPanel` / `currentPanel` /
  `nextPanel` (the existing single-`children` slot is kept for the mobile/single path).
- `QuranSwipeNav` lays the three panels in a horizontal flex strip, each panel viewport-width
  (`min-w-full flex-shrink-0`). Physical left→right order is **fixed regardless of UI locale**
  (matches the existing physical-pixel deltaX convention):

  `[ NEXT spread ] [ CURRENT spread ] [ PREV spread ]`

### Transform geometry (the crux)
| State | Strip transform | Then |
|---|---|---|
| Rest (tablet double) | `translateX(-100%)` (current centered) | — |
| Dragging | `translateX(calc(-100% + Δx))` | follows finger |
| Commit **next** (Δx > +80) | animate → `translateX(0)` (next centered) | `router.push(nextHref)` |
| Commit **prev** (Δx < −80) | animate → `translateX(-200%)` (prev centered) | `router.push(prevHref)` |
| Snap-back (\|Δx\| < 80) | animate → `translateX(-100%)` | — |

Swipe right (Δx>0) reveals the left panel = **next** (keeps "swipe right = next", Quran RTL).
On landing, the new route renders its own strip statically centered with **no entry animation**
(entry animations caused the mobile "double-swipe" — ADR 0019 / mobile Addenda 4–5). Because the
centered content is identical across the route swap, the old post-nav pop is largely eliminated.

### CSS-gated so there is no pre-hydration flash and mobile is untouched
- The `-100%` rest offset **and** neighbor-panel `display` live in the tablet
  `@media (1024–1366px)` + `[data-safha-view="double"]` scope (same mechanism as the rest of the
  tablet reader styling). JS writes an inline `transform` only during an active drag/commit, then
  clears it to fall back to the CSS base.
- **Below the tablet scope** (mobile, single-view, non-tablet widths): neighbor panels are
  `display:none` → no layout space, strip rests at `translateX(0)`, **their page-fonts never
  download**, and the current-page fly-off swipe behaves exactly as today.

### RTL (ar locale) — the strip must be dir="ltr"
Flex row order follows `direction`. Under the `ar` locale the reader inherits `dir="rtl"`, so the
panels lay out right-to-left and `translateX(-100%)` pushes the current panel off-screen → **blank
page** (only caught after shipping; the initial implementation tested `/en` only). Fix: force the
strip `dir="ltr"` (stable physical order `[next][current][prev]` + direction-independent transform
in both locales) and restore `dir={isRTL ? "rtl" : "ltr"}` on each panel so the Arabic content
still lays out rtl. Gesture mapping stays "swipe right = next" in both locales. **Always verify the
carousel on `/ar/pages/N`, not just `/en`.**

### Fonts / reduced motion
- All six page-fonts get `@font-face` injected (via `FontFaceInjector`) so a neighbor is painted
  before it can be reached on a fast swipe; only the **current** page keeps `<link rel="preload">`.
- `prefers-reduced-motion`: no strip animation — instant `router.push` (as today).

### Edge cases
- **Ends wrap:** page 1's prev = last pair, page 604's next = pair 1 (hrefs already wrap; the
  wrapped neighbor renders as a normal spread).
- **Nav-overlay tap** (`onClick` → `toggleOverlay`) stays on the touch-boundary div.
- Hydration: server renders all three panels always; visibility/offset is pure CSS, so server and
  client markup match (no `useState`-on-touchmove; imperative transforms only).

### Files to change
- `app/components/reader/ReaderPage.tsx` — fetch prev/next spreads (sequential), render three
  `<QuranSpread>` panels, pass them to `QuranSwipeNav`; inject all six page-fonts, preload only
  current.
- `app/components/QuranSwipeNav.tsx` — accept the three panels; render the single-slot path
  (mobile/single) OR the 3-panel strip (tablet double) using the same `view === "double" && isLgUp`
  test already present; implement the transform table above.
- `app/globals.css` — tablet `[data-safha-view="double"]` scope: strip base `translateX(-100%)`,
  neighbor panels `display:block`; hidden/`0` elsewhere.

### What NOT to do
- Do not touch the mobile / single-view swipe path — it stays single-slot (DECISIONS.md
  "Core Gesture Only" still governs it).
- Do not add an entry/mount animation on the landed page — incoming route renders statically
  centered.
- Do not `setState` on touchmove; imperative DOM transforms only (mobile-swipe constraint holds).
- Do not fetch neighbor spreads on the client / lazy — user chose real, server-rendered content
  (eager). Do not add `router.prefetch()`.
- Do not apply the `-100%` base offset via JS (pre-hydration flash) — it must be CSS.
- Do not reintroduce adjacent panels on mobile under cover of this decision — ADR 0027 is tablet-only.

### Swipe-feel tuning (post-implementation, user feedback)
Three refinements after on-device feel testing:
- **Drag gain `1.5×`** (`CAROUSEL_DRAG_GAIN` in `QuranSwipeNav.tsx`, **tablet carousel only**).
  Native/standard carousels track the finger 1:1 (Swiper's `touchRatio` default = 1); the wide tablet
  spread made 1:1 feel like too little reveal per drag. Amplify the *visual* transform only
  (`deltaX * dragGain`, where `dragGain = carousel ? 1.5 : 1`); `COMMIT_THRESHOLD` stays on raw
  `deltaX`, so commit still fires at the same finger travel. The mobile/desktop single-panel swipe
  stays 1:1 (ADR 0027 — the single-slot path is unchanged outside the tablet scope).
- **Exit duration** — the tablet carousel commit uses `380ms` (`CAROUSEL_EXIT_MS`) for a calmer,
  book-like turn; the mobile/desktop single-panel fly-off keeps its original `220ms`
  (`SINGLE_EXIT_MS`). Gated by `carousel` so only the tablet path slows down.
- **Stale-nav guard** (`isCommitting` ref). Once a commit's `router.push` is pending, a second swipe
  is blocked from starting so it can't fire a stale navigation before the route change lands.
- **Skeleton lines match the real spread.** The loading skeleton overlay was hardcoded to
  `justify-between` + `0.5em` padding (correct for the mobile `space-between` layout) but the
  `.fq-spread` real layout is `flex-start` + `var(--fq-line-gap)` + `0.2em`, so on the spread the
  placeholder lines sat in the wrong places and jumped when the font loaded. Fix: full-page skeleton
  overlay gets class `fq-skeleton-lines`; a `.fq-spread .fq-skeleton-lines` rule (in the
  `min-width:768px` block, beside the real layout it mirrors) forces flex-start + same `--fq-line-gap`
  + `0.2em`. Scoped to `.fq-spread` so it tracks the real layout wherever the spread shows (tablet
  and desktop double view); mobile single view keeps the Tailwind `space-between` skeleton unchanged.

**Status: implemented — lint + tsc clean. Verified in-browser at 1280×800: current panel centered
at x:0, neighbors parked at ∓1280, content visible, in BOTH `/en` (ltr) and `/ar` (rtl, after the
dir="ltr" strip fix above). Pending on-device swipe-feel verification (drag-reveal, font-ready-on-
reveal, seam) and the known post-nav flicker (deferred by user).**

## Files to Change

### NEW: `app/contexts/NavOverlayContext.tsx`
Client context. Uses `usePathname()` and a `useIsTablet()` hook to compute `isOverlayMode: boolean` (true when tablet AND `/pages/` route). Exports:
- `isOverlayMode: boolean`
- `overlayVisible: boolean`
- `toggleOverlay(): void` — flips visibility; when turning on, starts 3s auto-hide timer; when turning off, clears timer
- `hideOverlay(): void` — sets `overlayVisible=false`, clears timer

Auto-hide timer: `timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`. On `toggleOverlay()` to visible: `clearTimeout(timerRef.current); timerRef.current = setTimeout(hideOverlay, 3000)`. On hide: `clearTimeout(timerRef.current)`.

### NEW: `app/hooks/use-is-tablet.ts`
Mirror of `use-is-lg-up.ts`. Query: `(min-width: 768px) and (max-width: 1023px)`. Returns `boolean`. Initializes to `false` (SSR-safe).

### `app/[locale]/layout.tsx`
Wrap the existing `<SidebarProvider>` tree in `<NavOverlayProvider>` (or add `NavOverlayProvider` as a sibling wrapper at the same level — outermost provider wins).

### `app/components/nav/Nav.tsx`
Import `useNavOverlay` and `useIsTablet`. Compute `isOverlayMode` from context. Apply classes:
```
cn(
  "bg-background text-foreground px-4 shadow h-14 flex items-center",
  isOverlayMode && "fixed top-0 inset-x-0 z-50 transition-transform duration-300 ease-in-out",
  isOverlayMode && !overlayVisible && "-translate-y-full",
)
```
No other changes to Nav's content or structure.

### `app/components/QuranSwipeNav.tsx`
Import `useNavOverlay`. Add `onClick={toggleOverlay}` to the outer `div` (the `w-full overflow-hidden` div). The click will NOT reach this handler for word clicks because `wordClicked` will call `e.stopPropagation()`.

### `app/components/QuranSafha.tsx`
In `wordClicked`, add `e.stopPropagation()` as the very first line — before the `if (word.char_type_name === "word")` check — so ANY click on a word element (word, end marker, etc.) stops bubbling to the `QuranSwipeNav` overlay toggle handler.

## Constraints

- Mobile behavior is explicitly out of scope for this ticket — do not add `sm:` or any below-`md:` logic.
- Desktop behavior is unchanged — the nav must remain static and always visible at `lg+`.
- Non-pages routes at tablet must also show nav statically — the `isOverlayMode` guard covers this.
- Do not reduce `FONT_V1` or touch any vh-budget formula — the reader's vertical sizing is unchanged.
- The Sidebar trigger button inside Nav remains in place — it is still accessible when the nav is shown.
- Do not add `stopPropagation` selectively per char_type — call it for all cases in `wordClicked` so future word types are covered automatically.

## What NOT to Do

- Do not apply the overlay behavior to mobile (below `md`) — future work.
- Do not make the nav `fixed` globally — only on tablet + pages route.
- Do not use CSS-only toggling (e.g. `max-lg:` responsive utilities for the hidden state) — the toggle state is JS-driven and must be managed in a React context.
- Do not skip `e.stopPropagation()` in `wordClicked` — without it, every word tap also toggles the nav.
- Do not change `min-h-[calc(100dvh-3.5rem)]` in ReaderPage — the layout is correct as-is for overlay mode (nav is out of flow; wrapper starts at y=0 and covers full viewport).

## Decisions Made

- Auto-hide timer: 3 seconds (matches common video-player conventions).
- Toggle semantics: first tap shows, second tap hides (not always-show-on-tap).
- Slide direction: translateY(-100%) → translateY(0), 300ms ease-in-out.
- `stopPropagation` placed in `wordClicked` in `QuranSafha` (not in `QuranWord`), since that is the single handler that covers all char_types.

## Addendum — Printed-Mushaf visual refinement (tablet only)

**Date:** 2026-07-21 · **Status:** implemented · Trello: extends card #124.

### Goal
Make the tablet full-screen spread read like a real open printed mushaf — warm ivory
paper, gentle page depth, muted print-gold ink, and a convincing central binding —
**without changing any content, typography, dimensions, line layout, spacing, or
responsive behavior.** Purely paper/ink/depth. Scope is **tablet only** (`@media
(min-width:1024px) and (max-width:1366px)`); mobile and desktop are untouched for now.

### Approach
1. **Reader-scoped semantic tokens.** Add `--mushaf-*` custom properties (values below).
   Define them per theme (`.theme-light`, `.theme-gold`, `.theme-dark`) but consume them
   only inside the tablet `@media` block / on `.fq-spread`, so the app-wide `--card`,
   `--background`, `--primary` tokens are never altered. This satisfies the "no hardcoded
   hex in components / semantic variables only" styling standard.
2. **Warm paper.** In the tablet scope, replace the safha card's `bg-card` fill with
   `--mushaf-paper` plus an almost-invisible tonal gradient (a single soft linear/radial
   pass — no noise, no raster). Highly readable, elegant.
3. **Page depth & edges — keep the paper-stack (intentional).** The stacked underlying
   page edges are wanted; they give the spread physical realism. Refine, don't remove:
   render **3–5 very subtle layered paper edges** peeking along each page's *outer*
   (spine-away) edge — thin, soft, low-contrast, progressively fainter and slightly more
   offset per layer. Colour them from `--mushaf-paper` / `--mushaf-edge` so they read as
   paper (not UI borders). Combine with the center-gutter depth and a restrained
   multi-layer `box-shadow` (soft outer separation from `--viewer-background`) + inner-edge
   shading (inset) + a faint warm outer highlight (paper thickness) + a fine low-contrast
   `--mushaf-edge` outline. Corners stay `rounded-none`. The mockup drives *palette /
   lighting / paper feel only* — not the edge treatment. Avoid any exaggerated 3D book
   rendering, page curls, leather/covers, or thick exposed page blocks.
4. **Realistic gutter / binding.** Close the current 0.5rem inter-page gap to **0** so the
   two pages meet (spec: "no visible gaps"), and carry the fold entirely in the existing
   `.fq-spread::after`: layered gradients — a narrow central `--mushaf-gutter-dark` core,
   symmetric `--mushaf-gutter-soft` valley fading smoothly onto both inner page edges, and
   a subtle highlight flanking the crease (curved-paper illusion). Symmetric; `z`-safe;
   `pointer-events:none`; must not shift or shrink the text area.
5. **Muted print-gold ink.** Recolor to `--mushaf-ornament` (scoped to tablet):
   ayah-end medallions (add a `fq-ayah-end` class hook in `QuranWord` for
   `char_type_name === "end"` — markup-only, no behavior/visual change outside the tablet
   scope), the header/footer ◆ diamonds (currently green `text-primary`), the surah-name
   glyph, and the surah banner frame (override `--surah-frame-gold` → `--mushaf-ornament`
   on `.fq-spread`). Juz / hizb / page-number metadata → `--mushaf-metadata` (quieter than
   the Quran text). Ornament shapes/positions/sizes unchanged — color/contrast/opacity only.
6. **Text ink.** Quran words + Bismillah use `--mushaf-text` in the tablet scope
   (dark-theme off-white instead of pure white; warm near-black on ivory). Overrides the
   `text-black dark:text-white` utilities within the scope only.

### Decision table — element → token
| Element | Today | Tablet target |
|---|---|---|
| Page surface | `bg-card` / `dark:bg-muted` | `--mushaf-paper` + faint gradient |
| Quran words / Bismillah | black / white | `--mushaf-text` |
| Ayah-end medallions | black / white | `--mushaf-ornament` |
| ◆ diamonds | green `--primary` | `--mushaf-ornament` |
| Surah-name glyph | ink | `--mushaf-ornament` |
| Surah banner frame | `--surah-frame-gold` #cdad80 | `--mushaf-ornament` |
| Juz / hizb / page no. | `--muted-foreground` | `--mushaf-metadata` |
| Inter-page gap | 0.5rem | 0 (pages meet; gutter is the fold) |
| Behind the spread | `bg-background` | `--viewer-background` |

### Final CSS variable values (starting points; tune in-browser)
> **Note (post-implementation):** these were the starting values. As shipped, `theme-light` and
> `theme-gold` diverged into **distinct** palettes (e.g. `--mushaf-paper` `#fcfbfa` for `theme-light`
> vs `#f6f1e6` for `theme-gold`; `--mushaf-ornament` `#7c7c78` vs `#a8844a`), rather than sharing the
> single "Light" column below. `app/globals.css` is the source of truth for the final per-theme values.

| Token | Light (`theme-light` / `theme-gold`) | Dark (`theme-dark`) |
|---|---|---|
| `--mushaf-paper` | `#F6F1E6` | `#1F2731` |
| `--mushaf-paper-highlight` | `#FDFBF4` | `rgba(255,255,255,0.04)` |
| `--mushaf-paper-shadow` | `rgba(60,45,20,0.06)` | `rgba(0,0,0,0.38)` |
| `--mushaf-edge` | `rgba(60,45,20,0.16)` | `rgba(0,0,0,0.55)` |
| `--mushaf-gutter-dark` | `rgba(40,30,15,0.28)` | `rgba(0,0,0,0.60)` |
| `--mushaf-gutter-soft` | `rgba(40,30,15,0.10)` | `rgba(0,0,0,0.26)` |
| `--mushaf-text` | `#2A2420` | `#F2EFE7` |
| `--mushaf-ornament` | `#A8844A` | `#9A8256` |
| `--mushaf-metadata` | `#9E7C42` | `#8A784E` |
| `--viewer-background` | `#ECE6D6` | `#151B23` |

### Files to change
- `app/globals.css` — add `--mushaf-*` to the three theme blocks; in the tablet `@media`
  block: paper fill + gradient, depth/edge shadows, enhanced `.fq-spread::after` gutter,
  `gap: 0`, ornament/text/metadata color overrides, `--surah-frame-gold` override,
  `--viewer-background` on `.fq-reader-outer`, and style the `.fq-stack-layer` peek
  (low-contrast paper edges). Set `.fq-reader-spread-container` inline clearance ≥ the
  outermost stack layer's offset so the peek isn't clipped at the viewport edge, and fold
  that clearance into the width-cap chrome note (half-gap term drops to 0 with `gap:0`;
  height formula untouched).
- `app/components/QuranWord.tsx` — add `fq-ayah-end` className when
  `char_type_name === "end"` (hook only; colored solely within the tablet scope).
- `app/components/QuranSafha.tsx` — expand the two `.fq-stack-layer` peek layers to
  **3–5** layers (progressive `translate-x`/`translate-y` offsets, decreasing opacity);
  keep `stackPeekSide` so each stack peeks toward the page's outer edge. Add minimal class
  hooks to the ◆ diamonds / metadata spans only if CSS can't target them cleanly. No
  structural or dimensional change to the page/text area.

### Constraints / What NOT to Do
- **Tablet only.** No mobile changes; no desktop changes yet. No edits to global `--card`,
  `--background`, or `--primary`.
- Do not change Quran text, Quran/ayah/glyph fonts or their shapes, line height, word
  spacing, justification, line count, page margins, text-area dimensions, metadata content,
  the surah header/Bismillah size/placement, or responsive scaling — verify unchanged.
- The height-fit divisor may be *raised* to shrink the font for airier spacing (now `23`,
  see decision 6 above) — that adds banner headroom and is safe. Never *lower* it toward
  21.2: that clips surah-start banner pages (overflow-hidden). The width cap (14.7) stays
  fixed regardless.
- No raster textures or external image assets. No effect above the Quran text except the
  already-accepted fold shadow at the gutter; all decorative layers `pointer-events:none`.
- Do not reintroduce a visible gap between the pages.
- Keep the paper-stack (3–5 subtle outer-edge layers) — it is intentional. Do NOT remove
  or flatten it. But keep it restrained: thin, soft, low-contrast; no exaggerated 3D book
  rendering, page curls, leather/covers, or thick exposed page blocks.
- The reference mockup governs palette, lighting, and paper feel only — not the page-edge
  treatment.

### Verification (in-browser, tablet viewport ≈1120×608, both themes)
Confirm: warm paper + depth read as a printed page; gutter looks like a curved fold with
no gap; ayah medallions/diamonds/frame are muted gold; dark text is off-white not pure
white; and — critically — a surah-start page still fits with no clipping and identical
line layout/spacing to before. Capture light + dark screenshots at the reference size.

## Addendum — Overlay timer, ayah-end styling, opening-page centering

**Date:** 2026-07-22 · **Status:** implemented · Trello: extends card #124.

### Changes

#### 1 — Remove nav auto-hide timer
The 3-second auto-hide timer is removed. The nav overlay stays visible until the user
taps again — explicit toggle only, no timeout. Simplifies the context and removes an
unwanted footgun (nav disappearing mid-interaction).

**`app/contexts/NavOverlayContext.tsx`:** delete `AUTO_HIDE_MS`, the `timerRef`, and
all `setTimeout`/`clearTimeout` calls. `hideOverlay` can be removed entirely (nothing
calls it now). The `toggleOverlay` callback flips `overlayVisible` on/off with no side
effects.

#### 2 — Ayah-end markers: text color + 0.85em (tablet spread only)
Currently the tablet spread styles `fq-ayah-end` as `--mushaf-ornament` (gold/gray).
Change to `--mushaf-text` (warm ink/off-white) so the marker reads as part of the text
flow, not a decorative ornament. Also add `font-size: 0.85em` for a subtle size
distinction from the surrounding words.

**`app/globals.css`** — inside the tablet `@media (min-width:1024px) and (max-width:1366px)` block:
- `.fq-spread .fq-ayah-end, .fq-spread .fq-ayah-end span`: change color from
  `var(--mushaf-ornament)` → `var(--mushaf-text)`; add `font-size: 0.85em`.
- Fix the stale comment in the dark-theme block that says `(.fq-ayah-end, left untouched)` —
  it is now governed by the general tablet rule above.

#### 3 — Pages 1–2 centered on tablet spread
`fq-safha-center` (set by `QuranSafha` when `page <= 2`) works on mobile and the
desktop spread, but the tablet double-view rule `:root[data-safha-view="double"]
.fq-spread .fq-quran-safha { justify-content: space-between }` has higher specificity
and overrides it, spreading Al-Fatiha's 7 lines across the full 100dvh card.

**Fix** — inside the tablet block, after the existing `space-between` rule:
```css
:root[data-safha-view="double"] .fq-spread .fq-quran-safha.fq-safha-center {
  justify-content: center;
  gap: 0.55em;
}
```
The card still fills 100dvh; the 7 lines center within it. Mirrors what the desktop
spread block already does at `@media (min-width:768px)` lines 303–306.

### Files to change
- `app/contexts/NavOverlayContext.tsx` — remove auto-hide timer
- `app/globals.css` — ayah-end color/size; fq-safha-center tablet override

### What NOT to Do
- Do not change the nav's initial hidden state — it still starts hidden; only the
  timer removal changes things.
- Do not extend the ayah-end styling outside the tablet `fq-spread` scope.
- Do not change the card height for pages 1–2 — the ivory card stays 100dvh, only
  the text-block alignment changes.

## Bug fixes — modal-click nav toggle + Quran word I-beam cursor

**Date:** 2026-07-22 · **Status:** implemented

### Bug 1 — Mark modal click toggles the nav overlay

`QuranSwipeNav`'s outer div has `onClick={toggleOverlay}`. React's fiber-tree event
bubbling delivers clicks from inside Radix `Dialog` portals (which live outside the
QuranSwipeNav DOM subtree) to this handler, so opening the mark modal and clicking
anywhere inside it toggled the nav.

**Fix — `app/components/QuranSwipeNav.tsx`:** Replace the bare `onClick={toggleOverlay}`
with an inline guard that bails when the click originated outside the current DOM subtree:
```tsx
onClick={(e) => {
  if (!e.currentTarget.contains(e.target as Node)) return;
  toggleOverlay();
}}
```
`e.currentTarget.contains(e.target)` returns `false` for portal nodes (body-mounted
dialog), so portal clicks are silently ignored; non-portal clicks (the reader background)
still toggle as before.

### Bug 2 — I-beam (text) cursor appears over Quran words

`QuranWord`'s div has `cursor-pointer`, but browsers show the I-beam cursor over
selectable text even when a parent declares `cursor: pointer`. Applies to all screens.

**Fix — `app/components/QuranWord.tsx`:** Add `select-none` to the word div's className.
`user-select: none` inherits to child spans and stops the browser from treating the text
as selectable, removing the I-beam in all themes and breakpoints.

### Bug 3 — Dialog close button always appears focused

When the mark modal opens, Radix Dialog auto-focuses the first interactive element —
the X close button. The shadcn `DialogContent`'s close button uses `focus:ring-2`,
which shows the focus ring for ALL focus (including programmatic). After a mouse/tap
interaction this looks like the button is permanently focused.

**Fix — `components/ui/dialog.tsx`:** Two changes:
1. Change `focus:ring-2` → `focus-visible:ring-2` on the `DialogPrimitive.Close` className so the ring only shows during keyboard navigation.
2. Add `onOpenAutoFocus={(e) => e.preventDefault()}` on `DialogPrimitive.Content` to prevent Radix from auto-focusing the close button on open. Firefox always fires `focus-visible` for programmatic focus, so this is required in addition to the class change. The dialog remains accessible — focus is trapped inside and Tab reaches all elements.

### Files changed
- `app/components/QuranSwipeNav.tsx` — portal-safe onClick guard
- `app/components/QuranWord.tsx` — `select-none` on word div
- `components/ui/dialog.tsx` — `focus:ring-2` → `focus-visible:ring-2` on close button

## Addendum — Mobile reader UX

**Date:** 2026-07-22 · **Status:** implemented · Trello: extends card #124 · Branch: `feature/124-mobile-reader-ux`

### Scope

Apply the same four changes to mobile (below `md`, ≤767px) that were shipped for tablet:
1. **Nav overlay** — nav is hidden by default on the reader; tapping the background toggles it.
2. **Mark modal trigger** — unchanged: tap on word opens the modal (same as desktop/tablet; the earlier bullet about "long tap" in the request was corrected — "tap toggle the modal").
3. **Mushaf colors** — apply the `--mushaf-*` palette tokens (paper, ink, ornament, metadata) to the mobile reader card, same as tablet.
4. **Book stack** — show the two base stack layers on mobile with the correct peek direction (`stackPeekSide`), matching the visual depth cue on tablet.

Desktop behavior is unchanged. Tablet behavior is unchanged.

---

### Feature 1 — Nav overlay on mobile

**Mechanism:** identical to tablet. `NavOverlayContext` already drives `isOverlayMode`; we expand the condition to include mobile.

**Decision table:**

| Breakpoint | Route | Nav behavior |
|---|---|---|
| Desktop (≥1024px or not tablet) | any | Unchanged — always visible, static |
| Tablet (1024px–1366px) | pages | Already implemented — fixed overlay, tap background to toggle |
| **Mobile (≤767px)** | **pages** | **Fixed overlay, tap background to toggle (new)** |
| Mobile (≤767px) | non-pages | Static, always visible — unchanged |

**Interaction semantics (confirmed with user):**
- Tap on Quran word → mark modal opens (stopPropagation prevents nav toggle) — same as today
- Tap on background (non-word area) → toggles nav overlay — same as tablet's onClick handler
- No long-press detection needed for the nav; `QuranSwipeNav`'s existing `onClick` covers it

**Reader height:** when the nav is fixed overlay on mobile, the reader must fill `100dvh` (nav is out of flow). This mirrors the tablet CSS approach.

**Files to change:**

`app/hooks/use-is-mobile.ts` — NEW, mirror of `use-is-tablet.ts`:
```ts
const MOBILE_QUERY = "(max-width: 767px)";
```

`app/contexts/NavOverlayContext.tsx` — expand `isOverlayMode`:
```ts
const isMobile = useIsMobile();
const isOverlayMode = (isMobile || isTablet) && isOnPagesRoute;
```

`app/globals.css` — inside `@media (max-width: 767px)` block, append:
```css
/* Reader fills full viewport (nav is fixed overlay, out of flow) */
.fq-reader-outer {
  min-height: 100dvh !important;
  padding-bottom: 0 !important;
  background-color: var(--viewer-background) !important;
}
.fq-full-safha > div {
  height: 100dvh !important;
}
```

---

### Feature 2 — Mark modal trigger

No code changes. Tap on word → mark modal is existing behavior. The original request bullet ("long tap") was corrected by the user to "tap toggle the modal". `wordClicked` in `QuranSafha` remains unchanged.

---

### Feature 3 — Mushaf colors on mobile

Apply the `--mushaf-*` tokens to the single-page mobile reader, scoped to `.fq-spread` (always present in the reader — `QuranSpread` renders it even in single-page view). No gutter/binding element (no double spread on mobile). Use the same token values defined per theme in the existing theme blocks in `globals.css` (no new token values needed).

**Decision table — mobile element → token (mirrors tablet):**

| Element | Mobile target |
|---|---|
| Reader outer bg | `--viewer-background` (already in Feature 1 above) |
| Page surface | `var(--mushaf-paper)` + gradient + inset shadows |
| Quran words / Bismillah | `var(--mushaf-text)` |
| Ayah-end medallions | `var(--mushaf-text)`, `font-size: 0.85em` |
| ◆ diamonds | `var(--mushaf-ornament)` |
| Surah-name glyph | `var(--mushaf-ornament)` |
| Inline surah name | `var(--mushaf-ornament)` |
| Juz / hizb / page no. | `var(--mushaf-metadata)` |
| Surah banner frame gold | `var(--mushaf-ornament)` via `--surah-frame-gold` override |

**Theme-specific overrides:**
- **Dark theme** — metadata, footer, surah glyph, inline surah name, ornaments → `var(--mushaf-text)` (off-white, not gold; same rule as tablet).
- **Light theme** — `--surah-frame-line: #4a4b4e` (neutralize warm frame line; same as tablet).
- **Gold theme** — surah glyph and inline surah name → `var(--mushaf-text)` (matching text, not gold; same as tablet).

**Files to change:**

`app/globals.css` — inside `@media (max-width: 767px)` block, append after the reader-height rules:

```css
/* Mushaf paper surface — mobile reader card */
.fq-spread .fq-safha-card {
  background-color: var(--mushaf-paper) !important;
  background-image: linear-gradient(
    to bottom,
    var(--mushaf-paper-highlight) 0%,
    transparent 14%,
    transparent 82%,
    var(--mushaf-paper-shadow) 100%
  );
  box-shadow:
    inset 0 0 0 1px var(--mushaf-edge),
    inset 0 1px 0 0 var(--mushaf-paper-highlight),
    inset 0 0 22px 0 var(--mushaf-paper-shadow),
    0 1px 2px rgba(0,0,0,0.05),
    0 8px 20px -10px var(--mushaf-paper-shadow);
}

/* Ink colors */
.fq-spread .fq-qword { color: var(--mushaf-text) !important; }
.fq-spread .fq-ayah-end,
.fq-spread .fq-ayah-end span {
  color: var(--mushaf-text) !important;
  font-size: 0.85em;
}
.fq-spread .fq-quran-safha .fq-bismillah { color: var(--mushaf-text) !important; }
.fq-spread .fq-quran-safha .fq-inline-surah { color: var(--mushaf-ornament) !important; }
.fq-spread .fq-ornament { color: var(--mushaf-ornament) !important; }
.fq-spread .fq-safha-surah-glyph { color: var(--mushaf-ornament) !important; }
.fq-spread .fq-safha-meta,
.fq-spread .fq-safha-footer { color: var(--mushaf-metadata) !important; }

/* Surah banner frame gold */
.fq-spread { --surah-frame-gold: var(--mushaf-ornament); }

/* Dark theme overrides */
:root.theme-dark .fq-spread .fq-safha-meta,
:root.theme-dark .fq-spread .fq-safha-footer,
:root.theme-dark .fq-spread .fq-safha-surah-glyph,
:root.theme-dark .fq-spread .fq-quran-safha .fq-inline-surah,
:root.theme-dark .fq-spread .fq-ornament { color: var(--mushaf-text) !important; }
:root.theme-dark .fq-spread { --surah-frame-line: var(--mushaf-ornament); }

/* Light theme — neutralize frame line */
:root.theme-light .fq-spread { --surah-frame-line: #4a4b4e; }

/* Gold theme — surah name follows ink, not gold */
:root.theme-gold .fq-spread .fq-safha-surah-glyph,
:root.theme-gold .fq-spread .fq-quran-safha .fq-inline-surah { color: var(--mushaf-text) !important; }
```

---

### Feature 4 — Book stack on mobile

The two base stack layers (`fq-stack-layer`) currently have `hidden md:block` in JSX — visible only at md+. On mobile we want them visible and peeking toward the correct edge (`stackPeekSide`).

**Clearance required:** on mobile the card is `w-full` and `QuranSwipeNav` is `overflow: hidden`. Without side clearance the stack layers' 8px horizontal protrusion is clipped. We add `10px` padding on each side to `.fq-reader-spread-container`, giving the 8px deepest layer room to peek.

**Font formula update:** the mobile font formula uses `100vw - 24px` to account for the card's horizontal chrome. Adding `10px × 2 = 20px` of container clearance means the card is now `100vw - 20px` wide, so the formula becomes `(100vw - 44px) / 14.7`. The cap at `28px` is unchanged.

**Files to change:**

`app/components/QuranSafha.tsx` — change `hidden md:block` to `block` on the two base `.fq-stack-layer` divs:
- Layer 1: `... opacity-100 pointer-events-none block ${stackPeekSide === "right" ? "translate-x-2" : "-translate-x-2"}`
- Layer 2: `... opacity-100 pointer-events-none block ${stackPeekSide === "right" ? "translate-x-1" : "-translate-x-1"}`

`app/globals.css` — inside `@media (max-width: 767px)` block:

```css
/* Add clearance for book-stack peek */
.fq-reader-spread-container {
  padding-inline-start: 10px !important;
  padding-inline-end: 10px !important;
}
/* Recalibrate font formula: card is now 100vw - 20px (10px clearance each side) */
.fq-content {
  --fq-mobile-font: min(calc((100vw - 44px) / 14.7), 28px);
}

/* Book stack: visible in the mobile reader, recoloured to mushaf paper */
.fq-spread .fq-stack-layer {
  display: block;
  background-color: var(--mushaf-paper) !important;
  background-image: none !important;
  border-color: var(--mushaf-edge) !important;
  box-shadow: 1px 0 2px -1px var(--mushaf-paper-shadow);
}
```

Note: `.fq-stack-tablet` layers stay `display: none` on mobile — the two base layers give sufficient depth.

---

### Verified test cases

| Scenario | Expected |
|---|---|
| Load `/pages/N` on mobile | Nav hidden, reader fills 100dvh, paper background |
| Tap on background area | Nav slides down |
| Tap background again | Nav slides up |
| Tap a Quran word | Mark modal opens; nav state unchanged |
| Tap ayah-end marker | Verse mark modal opens; nav unchanged |
| Navigate to non-reader route on mobile | Nav always visible, static |
| On desktop or tablet | Behavior unchanged |
| Light theme | Paper = near-white, ornaments = gray, frame line = dark gray |
| Gold theme | Paper = warm ivory, ornaments = gold, surah glyph = mushaf-text |
| Dark theme | Paper = blue-black, ornaments and frame = muted gold |
| Right-hand page | Stack peeks right; 8px layer visible within 10px clearance |
| Left-hand page | Stack peeks left; 8px layer visible within 10px clearance |

---

### Files to Change (summary)

- `app/hooks/use-is-mobile.ts` — NEW: `(max-width: 767px)` media query hook
- `app/contexts/NavOverlayContext.tsx` — extend `isOverlayMode` to include mobile
- `app/components/QuranSafha.tsx` — change `hidden md:block` → `block` on the two base stack layer divs
- `app/globals.css` — inside `@media (max-width: 767px)` block: reader height, stack clearance + font formula update, stack visibility + mushaf recoloring, paper + ink + ornament CSS

### Constraints

- Do not change the `wordClicked` handler — mark modal still opens on tap on all platforms.
- Do not add long-press detection — the user confirmed regular tap behavior is correct.
- Do not touch tablet or desktop CSS — scope all new rules to `@media (max-width: 767px)`.
- The `.fq-stack-tablet` deeper layers stay `display: none` on mobile.
- The `28px` cap on `--fq-mobile-font` is unchanged.
- Do not add the gutter/binding `::after` — mobile is always single-page.
- Compact header/footer (tablet-only glyph/footer size reduction) does NOT apply to mobile.
- The `compensateStackGap` margin logic (md+) does NOT apply to mobile — no compensate-margin CSS is active below md.

### What NOT to Do

- Do not implement long-press for the nav toggle or the mark modal — the user confirmed: tap = modal, tap background = nav.
- Do not add `padding-inline` beyond 10px per side — deeper stack layers (`fq-stack-tablet`) are not shown on mobile, so no greater clearance is needed.
- Do not change the tablet media query block.
- Do not add a gutter/binding element between pages on mobile.
