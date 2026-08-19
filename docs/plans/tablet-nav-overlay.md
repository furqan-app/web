# Tablet Nav Overlay Effect

**Type:** feature  
**Date:** 2026-07-20  
**Status:** implemented (see latest addendum below)

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
2. **Mark modal trigger** — a 500ms long press on a Quran word opens the modal;
   a short tap continues to the reader's nav-overlay toggle.
3. **Mushaf colors** — apply the `--mushaf-*` palette tokens (paper, ink, ornament, metadata) to the mobile reader card, same as tablet.
4. **Directional page-side cue** — keep the physical stack layers hidden on mobile
   and simulate their edge with one lightweight 8px `::after` strip on the active
   card, positioned right for odd/right-hand pages and left for even/left-hand pages.

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
- Short tap on Quran word → toggles the nav overlay
- Long press on Quran word → opens the mark modal without toggling the nav
- Tap on background (non-word area) → toggles nav overlay — same as tablet's onClick handler
- Long press is only a mark-modal gesture; nav toggling remains click-driven

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

`QuranWord` tracks a 500ms touch hold with 10px movement tolerance. A qualifying
hold calls `preventDefault()` on touch end, suppressing the synthetic click so the
nav does not also toggle, then delegates the selected word to `QuranSafha` through
`QuranLine`. Short taps do not open the modal in overlay mode and bubble to
`QuranSwipeNav` for the normal nav toggle.

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

**Files to change:** `app/globals.css` applies the theme-scoped Mushaf tokens inside
the mobile reader. The card uses broad radial/linear paper-lighting gradients plus
restrained inset edge treatment; Quran ink, metadata, ornaments, Bismillah, ayah
markers, and surah-frame colors follow the decision table above. Light uses near-white
paper with cool-neutral gray ornament/shadow tokens, Gold keeps warm ivory and muted
gold, and Dark keeps blue-black paper with off-white ink.

---

### Feature 4 — Book stack on mobile

All real stack layer divs stay hidden on mobile (`fq-stack-tablet` via the base
CSS `.fq-stack-tablet { display: none }`; the two inner layers via `hidden md:block`
in JSX). The page-side cue is simulated by a `::after` pseudo-element on the card:
an 8px strip at the outer edge, using a repeating paper/stripe gradient. The stripe
opacity is theme-tuned (light: 0.62, default: 0.32, dark: 0.5). The existing
`fq-compensate-r`/`fq-compensate-l` class on the wrapper (from `compensateStackGap`)
is used to position the strip: `.fq-compensate-r > .fq-safha-card::after` places it
at `right:0`, `.fq-compensate-l > .fq-safha-card::after` at `left:0`. No translateX,
no new DOM nodes, no layout change.

**Files changed:**

- `app/globals.css` — inside `@media (max-width: 767px)`, inside `.fq-spread`:
  - `.fq-safha-card::after` — 8px strip, `position:absolute`, theme-aware repeating-linear-gradient
  - `.fq-compensate-r > .fq-safha-card::after { right: 0 }` / `.fq-compensate-l > .fq-safha-card::after { left: 0 }`

**Decision table:**

| Current page | Mushaf position | Visible stack |
|---|---|---|
| 13 (odd) | Right-hand page | 8px ::after strip on outer right; left clean |
| 14 (even) | Left-hand page | 8px ::after strip on outer left; right clean |

---

### Verified test cases

| Scenario | Expected |
|---|---|
| Load `/pages/N` on mobile | Nav hidden, reader fills 100dvh, paper background |
| Tap on background area | Nav slides down |
| Tap background again | Nav slides up |
| Short tap a Quran word | Nav toggles; mark modal stays closed |
| Long press a Quran word | Mark modal opens; nav state unchanged |
| Long press an ayah-end marker | Verse mark modal opens; nav unchanged |
| Navigate to non-reader route on mobile | Nav always visible, static |
| On desktop or tablet | Behavior unchanged |
| Light theme | Paper = near-white, ornaments = gray, frame line = dark gray |
| Gold theme | Paper = warm ivory, ornaments = gold, surah glyph = mushaf-text |
| Dark theme | Paper = blue-black, ornaments and frame = muted gold |
| Right-hand page | 8px ::after strip painted at outer right; left edge clean |
| Left-hand page | 8px ::after strip painted at outer left; right edge clean |

---

### Files to Change (summary)

- `app/hooks/use-is-mobile.ts` — NEW: `(max-width: 767px)` media query hook
- `app/contexts/NavOverlayContext.tsx` — extend `isOverlayMode` to include mobile
- `app/components/QuranWord.tsx` / `QuranLine.tsx` / `QuranSafha.tsx` — pass and
  handle the 500ms long-press gesture with 10px movement tolerance
- `app/components/QuranSafha.tsx` — stack layers remain hidden below `md`; `selectWord` helper extracted
- `app/globals.css` — inside `@media (max-width: 767px)`: reader height, paper/ink/
  ornament styling, and the 8px `::after` directional edge strip; no translateX or stack visibility changes

### Constraints

- Keep the long-press threshold at 500ms and movement tolerance at 10px.
- A qualifying long press must suppress the synthetic click so it cannot toggle nav.
- Do not touch tablet or desktop CSS — scope all new rules to `@media (max-width: 767px)`.
- The `28px` cap on `--fq-mobile-font` is unchanged.
- Do not add the gutter/binding `::after` — mobile is always single-page.
- Compact header/footer (tablet-only glyph/footer size reduction) does NOT apply to mobile.
- All `.fq-stack-layer` elements stay hidden on mobile; the `::after` strip is the sole visual cue.
- The `compensateStackGap` class is still applied to the wrapper on mobile (drives `::after` positioning) but carries no margin rule — no text clearance adjustment needed.

### What NOT to Do

- Do not use long press for nav toggling; it is reserved for the mark modal.
- Do not reveal real stack layers on mobile — use the `::after` strip only.
- Do not change the tablet media query block.
- Do not add a gutter/binding element between pages on mobile.

## Addendum — Sync voice panel with nav overlay; voice panel becomes the reader's persistent play control

**Date:** 2026-07-26 · **Status:** implemented · Trello: [#125](https://trello.com/c/jYfTL0Oe/125-for-tablet-and-mobile-when-toggling-nav-toggle-voice-panel-as-well) · Branch: `feature/125-nav-voice-panel-toggle-sync`

> **Revision note (same day, branch still open):** this addendum was implemented once already (bar synced to nav overlay, mobile nav play button removed, `RecitationPlayButton`/`RecitationPageSync`/`pageFirstVerseKey` deleted as dead code) and then corrected after review. Editing in place rather than stacking a new addendum, per this branch still being open. The corrections below **supersede** the original "always visible when `status !== idle`, no toggle" behavior and the "remove the whole dead chain" cleanup — `pageFirstVerseKey`/`RecitationPageSync` are restored, now feeding the voice panel instead of the (still-removed) nav button.

### Summary

Three corrections to the voice panel (`RecitationPlayerBar`, the fixed bottom bar):
1. It must always follow the nav overlay's show/hide — which means it now needs to render on reader pages even before a session starts (previously it rendered only once `status !== "idle"`).
2. Because it now renders while idle, its play button becomes the reader's play-current-Safha control — the same job the deleted mobile nav button did, restoring the `pageFirstVerseKey`/`RecitationPageSync` plumbing to feed it (now wired to the bar, not the nav).
3. The "X" close button is re-skinned to a `Square` (stop) icon — same `stop()` behavior, just no longer reads visually as "close" — and hides while idle (nothing to stop yet).

### Decision Tree

**Render/content, by session status (bar is mounted on reader routes — self `/pages/[id]` and grant `/mushaf/[grant]/pages/[id]` — same substring check `pathname.includes("/pages/")` `Nav.tsx` already uses):**

| Condition | Bar renders? | Play/Pause button | Label | Settings gear | Stop button |
|---|---|---|---|---|---|
| On reader route, `status="idle"` | Yes | Play icon → `play(pageFirstVerseKey)` | "Recitation" (reciter fallback), empty verse line | Visible | Hidden |
| On reader route, `status="paused"` | Yes | Play icon → `togglePlayPause()` | reciter name + verse key | Visible | Visible, `Square` icon → `stop()` |
| On reader route, `status="playing"` | Yes | Pause icon → `togglePlayPause()` | reciter name + verse key | Visible | Visible, `Square` icon → `stop()` |
| On reader route, `status="loading"` | Yes | Spinner, disabled | reciter name + verse key | Visible | Visible |
| Off reader route, `status="idle"` | No (unchanged) | — | — | — | — |
| Off reader route, `status!=="idle"` | Yes (background playback, ADR 0021, unchanged) | as above | as above | Visible | Visible |

**Nav-overlay sync (mechanism unchanged from the original implementation):** on tablet/mobile reader route, the whole bar — idle or active — slides with `overlayVisible`, same transform/easing as `Nav.tsx`. On desktop reader route, always shown, no toggle (matches nav's static behavior there). Off the reader route, no overlay sync (as before).

### Verified Test Cases

1. Tablet/mobile `/pages/N`, no active session → bar already renders (idle state: play + reciter label + settings, no stop button); tap background → nav and bar toggle together as before.
2. Tap the idle play button → starts playback of the current page's first verse (`pageFirstVerseKey`), bar switches to the active layout (stop button appears).
3. Tap play/pause while playing/paused → toggles in place, bar stays visible, no layout change beyond the icon.
4. Tap the square stop button → `stop()` fully clears the session; bar drops back to the idle layout (still visible, still following nav) rather than disappearing.
5. Mid-playback, navigate off `/pages/` (e.g. to Marks) → bar keeps showing (background playback, ADR 0021) with the stop button still visible; navigating back to idle + off-reader hides it again (unchanged edge case).
6. Desktop, on reader route, idle → bar always visible (no toggle), play button starts playback same as mobile/tablet.
7. Word-tap → MarkModal → "Play from here" still works independently of the bar's own play button (unaffected, cross-breakpoint).

### Files to Change

- **`app/components/RecitationPlayerBar.tsx`** — read `usePathname()` (mirrors `Nav.tsx`'s `isOnPagesRoute` check) and `pageFirstVerseKey` from `useRecitation()`, alongside the existing `useNavOverlay()` sync (unchanged from before). Replace the `if (status === "idle") return null` guard with: render if `status !== "idle"` OR (`isOnReaderRoute` AND `pageFirstVerseKey` is non-null); otherwise return null. Play/pause button: `onClick` branches on `status === "idle" ? () => play(pageFirstVerseKey!) : togglePlayPause`, icon `Play` for idle/paused, `Pause` for playing, spinner for loading. Stop button: only rendered when `status !== "idle"`; icon changes from `X` to `Square` (`lucide-react`), same `onClick={stop}`, same `aria-label` (`recitation.stop`).
- **`app/utils/recitation.ts`** — restore `getFirstVerseKeyOfPage` (and its `WordWithVerse` import), deleted last pass.
- **`app/contexts/RecitationContext.tsx`** — restore `pageFirstVerseKey` state + `setPageFirstVerseKey` + the type field + provider value, deleted last pass. Update the field's doc comment: it now feeds the voice panel's play button, not the (still-removed) nav button.
- **NEW `app/components/reader/RecitationPageSync.tsx`** — restore this leaf exactly as it was (null-rendering, `useEffect` syncing `firstVerseKey` prop into context, clearing on unmount).
- **`app/components/reader/ReaderPager.tsx`** — restore the `rightData`/`leftData`/`currentPageWords`/`firstVerseKey` computation and the `<RecitationPageSync firstVerseKey={firstVerseKey} />` mount, deleted last pass.
- **`app/components/nav/Nav.tsx`** — no further change; the mobile play button stays removed (superseded by the always-visible voice panel play button, now available on every breakpoint, not just mobile).
- **`docs/architecture/COMPONENTS.md`** — re-add `RecitationPageSync`'s entry (removed last pass), update `RecitationPlayerBar`'s entry for the new idle/play-current-Safha behavior and the restored `pageFirstVerseKey` dependency, update `ReaderPager`'s entry to list `RecitationPageSync` again among its rendered children.

### Constraints

- Do not reintroduce `RecitationPlayButton.tsx` or any nav-mounted play button — the voice panel's own play button is now the single, breakpoint-agnostic entry point for "play current Safha."
- Do not add an auto-hide timer to the voice panel — still explicit-toggle-only, matching the nav.
- Do not touch `MarkModal`'s "Play from here" button or `QuranWord`'s word-tap path.
- Do not scope the nav-overlay sync any wider than `isOverlayMode` already does (tablet 1024–1366px + mobile ≤767px, `/pages/` route only).
- Stop button's `stop()` behavior itself is unchanged (fully clears session) — only its icon and idle-time visibility change.

### What NOT to Do

- Do not keep the bar gated by `status !== "idle"` alone — that was the bug this revision fixes (no play-current-Safha entry point existed without an active session already).
- Do not hide the whole bar when idle off the reader route — it must stay exactly as before there (no session ⇒ hidden; active session ⇒ background-playback bar, ADR 0021).
- Do not show the stop/square button while idle — nothing to stop yet.
- Do not reinterpret "close" as ending the session silently without the same `stop()` semantics (clearing `currentVerseKey`/`recitedPage`) — the icon changed, the behavior did not.

### Decisions Made

- Voice panel is now a permanent fixture on reader routes (self + grant), not conditional on an active session — mirroring the nav overlay it must "always follow."
- The play button's idle behavior ("play current Safha") restores the exact `pageFirstVerseKey`/`RecitationPageSync` mechanism deleted in the prior pass, now feeding the bar instead of the removed nav button.
- Stop button keeps `stop()`'s existing clear-session behavior; only its icon (X → Square) and idle-time visibility (hidden) change.

### Bug fix — stray post-`stop()` `timeupdate` resurrects highlight + recitedPage

**Found:** two symptoms after pressing the stop/close button — (1) the recitation-highlighted word stays highlighted, (2) swiping to a different page and playing from there navigates back to the old page while the new page's audio plays.

**Root cause:** `stop()` calls `audio.pause()` then synchronously resets `currentVerseKeyRef`/`recitedPage`/highlight to null. Per the HTML spec, `pause()` on a playing element always queues one more `"timeupdate"` event afterward (the paused flag flips synchronously; the event fires as a deferred task). `handleTimeUpdate` (`app/contexts/RecitationContext.tsx`) has no guard against this stray tick — it recomputes the active verse from `audio.currentTime`/`verseTimingsRef` (neither cleared by `stop()`), sees `previousVerseKey` is now `null`, takes the "verse changed" branch, and re-sets `currentVerseKey`/`recitedPage`/highlight right back. The resurrected `recitedPage` then sits stale until a later `play()` on a different page flips `status` to `"playing"`, at which point `RecitationFollow` sees a stale `recitedPage` outside the new page's window and snaps the pager back to the old page.

**Fix:** add `if (audio.paused) return;` at the top of `handleTimeUpdate` in `app/contexts/RecitationContext.tsx`. `audio.paused` is already `true` by the time the stray tick runs, so this discards it — and correctly no-ops during a genuine mid-session pause too (nothing should update while paused).

**Files to change:**
- `app/contexts/RecitationContext.tsx` — one-line guard in `handleTimeUpdate`.

**What NOT to do:**
- Do not touch `handleChapterEnded` or any other event handler — this fix is scoped to the confirmed `timeupdate`-after-`pause()` race, not a general defensive sweep.
- Do not add a `status` check instead of `audio.paused` — the ref-based `status` check would need an extra ref (status is state, not a ref, so it'd be stale inside the `useCallback` without adding one); `audio.paused` is already correct and available with no new state.

## Addendum — CSS-gate nav overlay positioning (kill the pre-hydration flash)

**Date:** 2026-08-15 · **Status:** implemented · GitHub: [#294](https://github.com/furqan-app/web/issues/294)

### Bug

On the reader page at mobile (≤767px) and tablet (1024–1366px) widths, on every fresh load the nav
renders in document flow for one paint, then jumps to a fixed overlay: the Quran display area gets
shorter/taller and the whole page briefly gains a scrollbar before snapping back. Reported as "the
navbar appears, affects the space we display Quran in, then disappears," with a visible scroll.

### Root Cause

`isOverlayMode` (`NavOverlayContext.tsx`) comes from `useIsMobile()`/`useIsTablet()` —
`matchMedia`-backed hooks that `useState(false)` initially and only resolve the real value inside
`useIsomorphicLayoutEffect`. That hook is `useLayoutEffect` on the client: synchronous and before
the *next* paint, which is enough to avoid a flash on remounts that happen after the app is already
hydrated. It cannot fix the **first** paint — SSR has no `window`, so it always renders the `false`
branch, and the browser paints that raw HTML before hydration (and the layout effect) ever runs.

Confirmed by fetching the raw SSR HTML for `/en/pages/1`:
```
<nav class="relative z-10 text-foreground px-4 shadow bg-background/75 backdrop-blur-md border-b border-border/50" style="padding-top:env(safe-area-inset-top, 0px)">
```
No `fixed`, no `-translate-y-full` — `Nav.tsx` ships in-flow (`position: relative`) regardless of
viewport. The reader wrapper below it independently reserves `min-h-[calc(100dvh-3.5rem)]`
(`ReaderPager.tsx:141`) regardless of nav mode, so combined first-paint height exceeds one viewport
→ page is briefly scrollable. Post-hydration, the layout effect resolves the real breakpoint, `Nav`
flips to `position: fixed`, is pulled out of flow, and the wrapper (which starts at `y=0` once the
nav is out of flow) reclaims the space → scrollbar disappears, content visibly jumps up. Confirmed
post-hydration steady state via the same session: `hasVScroll: false`, `navPosition: "fixed"`.

This is the same class of bug [ADR 0027](../architecture/adr/0027-tablet-swipe-carousel.md) already
solved for the tablet carousel's `-100%` rest offset ("CSS-gated so there is no pre-hydration
flash") — that fix was never applied to `Nav`'s own position switch. Generalized as
[ADR 0043](../architecture/adr/0043-breakpoint-positioning-must-be-css-gated.md): breakpoint-
dependent positioning that must be correct on the very first paint belongs in CSS `@media`, never in
a `matchMedia` hook, however it's timed (even a layout effect can't undo a paint that already
happened).

### Approach

Move the breakpoint half of `isOverlayMode` (mobile-or-tablet) into a CSS `@media` rule using the
exact same breakpoint widths the JS hooks already encode. The route half (`isOnPagesRoute`) stays a
class hook driven by `usePathname()` — unlike viewport width, pathname resolves identically on the
server and the first client render, so it carries no flash risk. `overlayVisible` stays a React
`useState(false)` toggle — its initial value already matches SSR (`false` both sides), so it's safe
to keep JS-driven; it now only ever adds a class on top of the CSS base state.

### Decision Tree

| Condition | Nav CSS state |
|---|---|
| `@media` doesn't match (desktop ≥1367px, or the 768–1023px gap) | Base class only → `position: relative`, always visible — unchanged |
| `@media` matches (≤767px or 1024–1366px), not `/pages/` route | Base class only (no `.fq-nav-overlay-page`) → `position: relative`, always visible — unchanged |
| `@media` matches, `/pages/` route, `overlayVisible=false` | `.fq-nav-overlay-page` → `position: fixed`, `translateY(-100%)` (hidden) |
| `@media` matches, `/pages/` route, `overlayVisible=true` | `.fq-nav-overlay-page.fq-nav-visible` → `position: fixed`, `translateY(0)` |

Identical outcomes to today's JS-driven decision tree — only the timing changes (resolved at first
paint, not after hydration).

### Verified Test Cases

| Scenario | Expected |
|---|---|
| Load `/pages/1` on mobile (375px) | Raw SSR HTML already carries `fq-nav-overlay-page` (no `fq-nav-visible`) → nav hidden above viewport from the very first paint, no in-flow frame, no scrollbar |
| Load `/pages/1` on tablet (1280px) | Same — hidden from first paint |
| Load `/pages/1` on desktop (1440px) | Nav renders `relative`, always visible — unchanged (media query doesn't match) |
| Load a non-`/pages/` route on mobile/tablet (e.g. Settings) | Nav renders `relative`, always visible — unchanged (`isOnPagesRoute` false, `.fq-nav-overlay-page` never added) |
| Tap background to reveal nav (mobile/tablet, `/pages/`) | `fq-nav-visible` added, `translateY(0)`, existing 300ms cubic-bezier transition — unchanged from today |
| 768–1023px viewport (the gap between mobile and tablet ranges) | Nav renders `relative`, always visible — unchanged (matches today; neither media query covers this range) |

### Files to Change

- `app/components/nav/Nav.tsx` — drop `isOverlayMode` from the `useNavOverlay()` destructure (keep
  `overlayVisible`); replace the two conditional Tailwind classes and the conditional inline
  `transitionTimingFunction` style with:
  ```
  isOnPagesRoute && "fq-nav-overlay-page",
  isOnPagesRoute && overlayVisible && "fq-nav-visible",
  ```
  The `paddingTop: env(safe-area-inset-top, 0px)` inline style stays (unrelated, unconditional).
  `useIsDesktopUp` stays (used for the fullscreen button, untouched).
- `app/globals.css` — new block, placed beside the existing tablet
  `@media (min-width: 1024px) and (max-width: 1366px)` block (same file, same breakpoint strings
  already used at lines 422/472/1058):
  ```css
  @media (max-width: 767px), (min-width: 1024px) and (max-width: 1366px) {
    .fq-nav-overlay-page {
      position: fixed !important;
      top: 0 !important;
      inset-inline: 0 !important;
      z-index: 50 !important;
      transform: translateY(-100%);
      transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    .fq-nav-overlay-page.fq-nav-visible {
      transform: translateY(0);
    }
  }
  ```
  **`!important` is required** (discovered during implementation, not in the original draft above):
  `globals.css` is one big `@layer base` block, which loses to Tailwind's utility layer at equal
  specificity by source order — confirmed elsewhere in this codebase (Desktop Reading Group's rail,
  Mushaf Double-Page Spread's tablet block). Without it, `Nav`'s always-present `relative`/`z-10`
  utility classes would win and the fixed positioning would silently never apply. `transform` itself
  does not need `!important` — `.fq-nav-overlay-page.fq-nav-visible`'s higher selector specificity
  (two classes vs one) is sufficient there. See [ADR 0043](../architecture/adr/0043-breakpoint-positioning-must-be-css-gated.md).
- `app/contexts/NavOverlayContext.tsx` — no change. `isOverlayMode` is still exported and still used
  by `toggleOverlay`'s guard (`if (!isOverlayMode) return;`) and by `QuranSafha`/`QuranWord`/
  `QuranLine`'s tap-vs-long-press branching — none of that is first-paint-critical (it only runs on
  a user interaction, which can't happen before hydration anyway), so it's out of scope here.

### Constraints

- Do not change `min-h-[calc(100dvh-3.5rem)]` on the reader wrapper (`ReaderPager.tsx:141`) — it is
  already correct for the fixed/out-of-flow case; only the *timing* of when the nav becomes
  out-of-flow is changing, not the layout math.
- Keep the CSS `@media` widths numerically identical to `MOBILE_QUERY`/`TABLET_QUERY` in
  `use-is-mobile.ts`/`use-is-tablet.ts` — there are now two representations of each breakpoint (ADR
  0043's accepted trade-off) and no shared constant between them.
- Do not remove `useIsMobile`/`useIsTablet`/`isOverlayMode` from `NavOverlayContext` — they're still
  correct and needed for the non-positioning consumers listed above.

### What NOT to Do

- Do not touch `RecitationPlayerBar.tsx` or `PlansWidget.tsx` in this change, even though both share
  the same `isOverlayMode`/`overlayVisible` conditional-transform pattern (explicitly called out as
  "same toggle, same transform pattern" in `RecitationPlayerBar.tsx`'s own comment). Both are
  **always** `position: fixed` — only their `transform`/`opacity` toggles on `isOverlayMode`, so
  neither affects document flow or the Quran display area the way `Nav`'s `relative→fixed` switch
  does. They have a smaller, different-shaped version of the same flash (visible-then-hidden, not a
  layout reflow) and are tracked separately, not folded into this fix.
- Do not add a pre-hydration inline `<script>` (mirroring the theme/safha-view flash-preventers) —
  breakpoint width is fully expressible in CSS `@media`, so the script escape hatch (reserved for
  state CSS can't see, e.g. `localStorage`) isn't needed here.
- Do not fold the mobile and tablet breakpoints into the JS hooks' shared constant — Tailwind/CSS and
  the JS hooks stay two separate representations per ADR 0043; do not attempt to unify them in this
  change.

## Addendum — Reader still scrolls in the installed PWA: viewport units go stale across the fullscreen transition

**Date:** 2026-08-15 · **Status:** implemented · GitHub: [#304](https://github.com/furqan-app/web/issues/304)

### Bug

In the installed PWA on Android, the mushaf page scrolls: the last line is cut off at the screen edge
and the page footer is not visible at all. Reported as "I open the app and close it and then open it
again I see scrolling", with first launch appearing fine.

The framing turned out to be wrong — it is a **race**, not a first-launch-vs-relaunch rule. A watcher
polling the live PWA caught two clean launches and one broken launch through the same `/launch.html`
path. Cold launch is not inherently safe; it usually just wins the race.

This is a follow-on to the #294 addendum above, and a **different cause**. The nav overlay gate that
addendum added is confirmed working in the broken state (`position: fixed`, `top: -56.7`), so the nav
is out of flow and contributes nothing.

### Root Cause

The manifest declares `display: "fullscreen"`. Android launches the PWA **non-immersive** — the OS
splash paints with the status bar and gesture pill visible — and Chrome enters immersive fullscreen a
moment later. `public/launch.html` (ADR 0042) redirects into the reader during that window, so the
reader document's first layout lands on either side of the transition. When it lands *during* it,
Chrome pins the document's viewport units to the transitional viewport and never re-resolves them.

Measured on-device (vivo V2530, 393×870 CSS px, 37.5 CSS px cutout) over the Chrome DevTools protocol,
in the broken state:

| Reading | Value |
|---|---|
| `window.innerHeight` / `visualViewport.height` | 832 / 832.364 |
| `getComputedStyle('.fq-reader-outer').minHeight` (declared `100dvh !important`) | **888.364px** |
| `getComputedStyle('.fq-full-safha > div').height` (declared `100dvh !important`) | **888.364px** |
| `100dvh` on a **freshly created** element, same document, same frame | **832.364px** |
| `100svh` / `100lvh` / `100vh` on a fresh element | 832.364px (identical) |
| `html` / `body` computed height (declared `height: 100%`) | 832.364px |
| `position: fixed; inset: 0` probe | 832.364px |
| `height: 100%` chained from `body` probe | 832.364px |
| `document.scrollHeight` vs `clientHeight` | 888 vs 832 → **56px of scroll** |

888.364 × 2.75 = 2443 physical px ≈ full display (2392) + navigation bar (49) — the layout viewport
mid-transition. 832.364 × 2.75 = 2289 = display − cutout (103) — the settled immersive viewport. So
the reader is sized against a viewport that no longer exists.

Two further findings that constrain the fix:

- **No `resize` or `visualViewport.resize` event is delivered**, so nothing in the page can observe
  the change. Dispatching a synthetic `resize` changes nothing.
- Writing **any** custom property on `:root` (or on the element itself) forces re-resolution, and the
  correction persists. This is what makes a JS guard technically possible — and is rejected below.

Nothing in our CSS is wrong. The mobile font formula is fine: rows sum to 376.5px against a 832px
viewport, nowhere near overflowing. The `.fq-safha-card` `overflow: hidden` clip and the 768–1023px
breakpoint gap were both investigated and ruled out (device is 392px wide).

### Approach

Anchor the reader's height to the **initial containing block** and use no viewport units below it —
see [ADR 0044](../architecture/adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md).

A new `.fq-reader-pager-viewport` class on `ReaderPager`'s existing `w-full overflow-hidden` wrapper
becomes `position: fixed; inset: 0` on the same breakpoints the nav overlay is gated to. That box is
ICB-anchored, so it tracks the settled viewport correctly even in the broken state (measured). The
strip and the three panels take `height: 100%` from it, and below `.fq-reader-outer` the height
travels by `align-items: stretch` exactly as ADR 0036 already mandates for the desktop spread.

Gate breakpoints stay numerically identical to the nav overlay block:
`@media (max-width: 767px), (min-width: 1024px) and (max-width: 1366px)`.

### Decision Tree

| Condition | Reader height source |
|---|---|
| `@media` matches (≤767px or 1024–1366px) | `.fq-reader-pager-viewport` is `position: fixed; inset: 0` → ICB-anchored; no viewport unit anywhere below it |
| `@media` doesn't match (desktop ≥1367px, or the 768–1023px gap) | Unchanged — existing `min-h-[calc(100dvh-3.5rem)]` flow layout; no immersive transition at these sizes, so no race |
| Height propagation below the fixed box | `height: 100%` on strip + panels (parent is definitely sized), then `align-items: stretch` from `.fq-reader-outer` down — never `%` below a flex-grown box |
| Tablet font cap `--fq-tablet-word` | Still derives a font size from `100dvh`; needs its own fix (see Open Question) |

### Verified Test Cases

Measured live on the device, on the actual broken instance, over CDP:

| Case | Result |
|---|---|
| `position: fixed; inset: 0` in the broken state | 832.364px — correct, while `100dvh` on the same page read 888.364px |
| `height: 100%` from `body` in the broken state | 832.364px — correct |
| Synthetic `resize` event | No effect; still 888.364px |
| Custom property write on `:root` | Corrects every affected element to 832.364px, `scrollable: 0`, persists after the property is removed |
| Candidate CSS, `.fq-reader-outer` under the fixed wrapper | 812px, `scrollable: 0` — the top of the chain works |
| Candidate CSS, `%` all the way down to `.fq-full-safha > div` | **Card collapsed 812px → 469.4px** — `%` inside a flex-grown box resolves to `auto` (ADR 0036's trap). Do not use `%` below `.fq-reader-outer`. |
| First `align-items: stretch` attempt on `.fq-reader-spread-container` | Card still 469.4px — the stretch did not travel the whole chain. **Resolved during implementation, see below.** |

**Why the stretch chain broke (resolved).** Three links, not one. Below `md` the reader chain
*centres* rather than stretches: `.fq-reader-spread-container` is `items-start` and `.fq-spread-col`
is `items-center` (both flip to stretch only at `md:`), so neither passed a height down. `.fq-spread`
already carries `items-stretch` statically and was fine. The third link is not an alignment problem
at all: the QuranSafha root between `.fq-spread` and `.fq-full-safha` is a plain **block**, so
`.fq-full-safha` inherits no height from it and needs an explicit `height: 100%` — that is the link
the first attempt missed entirely. With all three corrected the card stretches and
`.fq-full-safha > div` only needs its own height removed (`height: auto`) so it stops opting out of
stretching. Correcting the alignment is visually a no-op: the card previously filled the viewport via
`height: 100dvh`, so there was never free space to centre within.

**Verified locally after implementation** (dev server, system Chrome at each viewport):

| Viewport | Result |
|---|---|
| 392×832 (the repro device) | `scrollable: 0`, card 832, footer bottom 828 ✅ |
| 360×640, 430×932 | `scrollable: 0`, footer inside the viewport ✅ |
| 1280×800, 1024×1366 (tablet band) | `scrollable: 0`, card fills the viewport ✅ |
| 1440×900 (desktop, ungated) | unchanged — `position: static`, nav in flow at 57px ✅ |
| 800×1200 (768–1023 gap band) | 1px of scroll — **pre-existing**, confirmed identical with the change stashed; it is the known 57px-nav vs `3.5rem` mismatch whose fix is gated at ≥1367px. Out of scope. |
| Resize 832 → 700 after load | card follows to 700, `scrollable: 0` ✅ |
| `Sidebar` on mobile | `top: 56`, `bottom: 832`, overflows viewport by 0, inner list still scrolls ✅ |

### Files to Change

- `app/components/reader/ReaderPager.tsx` — add `fq-reader-pager-viewport` to the existing
  `w-full overflow-hidden` wrapper (line ~724) and a `fq-reader-panel` marker class to `Panel`'s
  outer `w-full shrink-0` div (line ~140). Marker classes only; no positioning in JSX (ADR 0043).
- `app/globals.css` — new block beside the nav-overlay `@media`, same breakpoint string: fixed
  ICB-anchored viewport, `height: 100%` on strip and panels, and the stretch chain below
  `.fq-reader-outer`. Remove the mobile `min-height: 100dvh !important` (line ~476) and
  `.fq-full-safha > div { height: 100dvh !important }` (line ~491), plus the tablet equivalents
  (lines ~1114, ~1149), since those are the declarations that go stale.
- `app/components/QuranSafha.tsx` — the card wrapper's `h-[calc(100dvh-5.5rem)]` (line 531) is the
  Tailwind default the CSS overrides; it must stop being a viewport unit on the gated breakpoints.
- `app/components/nav/Sidebar.tsx` — `height: calc(100dvh - 3.5rem - env(safe-area-inset-top, 0px))`
  (line 101) has the same failure mode: a stale launch makes the sheet 56px too tall and clips its
  last item, which is exactly the bug `docs/plans/fix-sidebar-bottom-clip.md` already fixed once for
  a different reason.
- `docs/architecture/DECISIONS.md`, `docs/architecture/adr/0044-*.md` — added.

### Constraints

- Keep the `@media` breakpoints numerically identical to the nav overlay block and to
  `MOBILE_QUERY`/`TABLET_QUERY` — a third representation of the same breakpoints (ADR 0043's
  accepted trade-off).
- Height must travel below `.fq-reader-outer` by `align-items: stretch`, never by `%`. Measured to
  collapse the card otherwise.
- Do not touch the mobile font formula (`min(calc((100vw - 24px) / 14.7), 28px)`) — it is
  width-derived, was measured correct, and is not implicated. ADR 0011 holds.
- Do not change `display: "fullscreen"` in the manifest — fullscreen reading is a deliberate feature
  (`docs/plans/feature-pwa-fullscreen-focus-mode.md`).
- Verify on the real device, not in DevTools emulation. The race needs a real immersive-fullscreen
  transition and does not reproduce in emulation, nor via `adb`-driven cold launch, home/resume, or
  `am kill` + bfcache restore — all three came back clean.

### What NOT to Do

- **Do not add a JS invalidation guard** — detecting the mismatch and writing a custom property on
  `documentElement`. It is verified to work on the live broken instance, but it can only run after
  paint, so a losing launch paints the wrong size and then visibly jumps between two sizes. Rejected
  by the user on that ground, and recorded in ADR 0044 Option A.
- Do not use `100svh`/`100lvh` as a "safer" viewport unit — all four units were measured and they go
  stale identically.
- Do not rely on a `resize` listener as the fix trigger. No resize event is delivered in the failing
  case; this was measured, not assumed.
- Do not re-open the #294 nav-overlay work. That gate is confirmed correct in the broken state and is
  not the cause here.
- Do not chase safe-area insets. `env(safe-area-inset-top/bottom)` both measured `0` in the broken
  state; the cutout is excluded from the viewport by Chrome, not exposed as an inset.

### Open Question — resolved during implementation

`--fq-tablet-word` derives a **font size** from `min(…, calc((100dvh - 50px) / 23))`, so unlike every
other box it cannot inherit a height from the ICB-anchored wrapper. Resolved with the container-query
option: `.fq-reader-pager-viewport` gets `container-type: size` (safe — a `fixed; inset: 0` box cannot
be sized by its contents) and the cap reads `100cqh` instead of `100dvh`. That makes the cap
ICB-derived like everything else, with no JS and no second mechanism.

Verified at 1280×800 and 1024×1366 locally (`scrollable: 0`, card fills the viewport, font 31.3px /
32.4px). **Not yet verified on real tablet hardware in the installed PWA** — nobody has a tablet
attached, and the stale-unit race only occurs there.

### Status of Device Verification

The root cause and the mechanism behind the fix were both measured on the real device: in the broken
state, `position: fixed; inset: 0` read the correct 832.364px while `100dvh` read 888.364px on the
same page in the same frame. That is the evidence the approach works.

**Confirmed end-to-end on real hardware, 2026-08-15**, once the fix reached staging (PR #305 → #306).
Twelve force-stop/relaunch cycles were driven over adb against the installed PWA on the repro device,
measuring the visible centre panel after each launch:

```
scrollable=0   ih=832   card=832.36 (computed 832.364px)   rows=15
footerBottom=828.4      lastRow=795.8      visibilityState=visible
```

12/12 clean. The card now matches the viewport exactly (832.36 vs 832) and the footer sits at 828.4,
inside the fold — it was at 876.7 against an 832px screen before. At the old ~1-in-3 failure rate,
twelve consecutive clean launches is a ~0.8% coincidence, so the race is genuinely closed. A device
screenshot of page 141 confirms all 15 lines and the page number render.

**Two measurement traps worth remembering**, both of which produced a false PASS on the first attempt
at this verification:

- `scrollable === 0` alone is a worthless assertion — a collapsed or hidden reader satisfies it
  trivially. The check must require a non-zero card within ~2px of `innerHeight`, all 15 rows, and
  both the footer and last row above the fold.
- `document.querySelector('.fq-full-safha > div')` returns the **spread partner in the off-screen
  next-anchor panel**, which is `display: none` on mobile and therefore reports a zero rect and
  `computed: auto`. Select the strip's centre child and filter to elements with `offsetParent !== null`
  and a non-zero rect.

Still unverified: the tablet `100cqh` font cap, which has never run on real tablet hardware in the
installed PWA.

### Reproduction Rig

Root cause was found over the Chrome DevTools protocol against the installed PWA on a USB-attached
device; reproduce the same way rather than by code reading (the first three hypotheses from static
reading were all wrong).

- `adb forward tcp:9222 localabstract:chrome_devtools_remote`, then `http://localhost:9222/json` for
  the page target's `webSocketDebuggerUrl`.
- Drive `Runtime.evaluate` over that socket with `websocket-client` and `suppress_origin=True` —
  Chrome rejects the handshake with 403 otherwise.
- **Read passively before probing.** Creating a probe element re-resolves the units and silently
  repairs the page, which made the first capture look like a stale *layout* rather than stale
  *style*. Read `getComputedStyle` on the existing elements first.
- Poll for the broken state rather than trying to catch it by hand — it is roughly one launch in
  three.
- `adb shell dumpsys window displays | grep "InsetsSource id"` gives the real status-bar, cutout and
  navigation-bar insets to check CSS values against.
- To verify a *fix* rather than catch the bug, drive the launch cycle instead of polling: `adb shell am
  force-stop` both the WebAPK (`org.chromium.webapk.<hash>`) and `com.android.chrome`, relaunch with
  `adb shell monkey -p <webapk> -c android.intent.category.LAUNCHER 1`, wait ~3.5s for the fullscreen
  transition to settle, then measure. Twelve cycles is enough to put a ~1-in-3 race beyond doubt.
- Take an `adb exec-out screencap -p` alongside the numbers. It is the cheapest guard against a probe
  that is measuring the wrong element — the screenshot is what revealed the `display: none` partner
  problem above.
