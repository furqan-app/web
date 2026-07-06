# ADR 0013: Mushaf double-page spread (pairing, data-fetch, decoration model)

**Date:** 2026-07-06
**Status:** Accepted

## Context

Users want to optionally view two facing mushaf pages side by side (like a physical open book) instead of always one page. `ReaderPage`/`QuranSafha` are built around a single page per route (`/pages/[id]`, 604 static params, one Prisma fetch per page) and a `vh`-driven font model (ADR 0004) with no width constraint. Adding a second, simultaneously-visible page raises three coupled questions: how pages pair up physically, how/when the second page's data and font get fetched given static generation, and whether the existing decorative frame (ADR from `quran-page-mushaf-design.md`) still fits once a second card sits next to it.

## Options Considered

**Page pairing — Option A: real singleton-first binding (1 alone, then (2,3)…(602,603), 604 alone)**
Matches how some printed Mushafs open with a lone title/Fatiha page. Rejected: user confirmed this app's convention is fixed pairs with no singleton, since Al-Baqarah's continuation etc. doesn't require it here.

**Page pairing — Option B (chosen): fixed pairs (1,2), (3,4)…(603,604)**
Every page belongs to exactly one pair; `pairIndex = ceil(n/2)`, pair = `(2*pairIndex-1, 2*pairIndex)`. 302 complete pairs, none alone. Simple, symmetric, confirmed by user.

**Data fetching — Option A: fetch second page lazily client-side on first toggle to double**
Keeps default static payload smaller; adds a client fetch + layout shift the first time a user switches to double view.

**Data fetching — Option B (chosen): always fetch both pair members server-side, at build time**
`ReaderPage` fetches both pages of the pair unconditionally (sequentially, **not** `Promise.all` — see Consequences for the connection-limit reason); the client-side single/double toggle only shows/hides the second `QuranSafha` with CSS. No extra request ever, no hydration mismatch, since static generation already pays this cost once at build time (not per-request).

**Decoration — Option A: keep existing corner-star/rounded-border frame, add stacked layers behind it**
Less visual churn, but doesn't match the reference design's book-with-pages-underneath look as closely.

**Decoration — Option B (chosen): replace the frame entirely with an SVG double-ruled border + corner medallions + top/bottom diamond markers (reference design), plus 2 offset stacked layers behind each card**
User explicitly chose full replacement over layering the new look on top of the old one.

## Decision

Fixed pairing (Option B), always-both-server-side fetching (Option B), and full decoration replacement (Option B). The single/double toggle itself is gated to `lg` (1024px+) — below that, the layout is forced single-page (today's card sizing was tuned for one page; two cards would be cramped between `md` and `lg`). Mobile (`<md`) is untouched, per ADR 0011's full-bleed model.

Navigation: in single-page mode (including forced-single below `lg`), prev/next still steps by one page (`pageId ± 1`, unchanged). In double-page mode, prev/next steps by a whole pair (`± 2`), anchored to the odd (right-hand) page id of the neighboring pair, e.g. from pair (3,4) next lands on `/pages/5` (pair 5,6).

Font loading: both pair members' `@font-face` blocks are always inlined (so double view never needs an extra request when toggled), but only the *current* page's font gets an eager `<link rel="preload">`. The pair partner's font has no preload hint, so browsers that skip fetching fonts for non-rendered (`display:none`) elements don't pay for it on mobile/forced-single/single-view sessions — it only loads lazily if/when that card actually becomes visible.

## Consequences

- **+** Pairing math is a single pure function (`getPagePair`), trivially testable, and requires no new routes or `generateStaticParams` shape — `/pages/N` keeps working for every N, for both single and double consumers.
- **+** No runtime data-fetch or hydration-mismatch risk from the client-only view toggle — the toggle is pure CSS show/hide against server-rendered content.
- **+** Reusing `QuranSafha` twice (it's already a client component) for the spread avoids restructuring its internals — only its decorative markup and outer wrapper change.
- **-** Every page's static HTML/font payload is roughly double what it was (both pair members' words + both font-faces), paid at build time across all 604 pages, not per-request — accepted per user's explicit choice.
- **-** Fetching both pair members concurrently (`Promise.all`) doubles peak concurrent DB connections per static-generation worker (each `getPageWords` already issues 2 concurrent queries, so two concurrent calls means 4 at once instead of 2) — confirmed during implementation to exceed a local dev DB's default `max_connections=151` during a full 604-page build. `ReaderPage` therefore fetches the pair sequentially instead, trading a small amount of extra build time for unchanged peak connection usage.
- **-** Nav hrefs must be computed both ways (±1 and ±2) and the client picks the applicable pair based on live view-mode *and* viewport width (`lg` breakpoint via `matchMedia`, no existing hook for this in the codebase) — a genuinely new piece of client logic, not just a CSS toggle.
- **-** The old corner-star/rounded-frame decoration (a prior, already-shipped plan) is discarded outright; if the SVG-border look is unwanted later, reverting means re-adding it, not just toggling a class.

## Addendum: frame implementation corrected (box-model, not stretched overlay)

**Date:** 2026-07-06

The first implementation of the decoration decision above used a single `<svg preserveAspectRatio="none">` stretched over the card, absolutely positioned on top of the content div. This was wrong on its own terms: the card's real aspect ratio (driven by `vh`-based font sizing, ADR 0004) varies by page/font-scale and is nothing like the design's fixed 490:700 source, so proportional insets sometimes exceeded the content's fixed `px-7`/`py-5` padding (text overlap), and non-uniform stretching distorted circular/star shapes (corner medallions became ellipses) — a real visual regression, not just a style mismatch.

**Corrected approach:** `docs/design/design-principles.md` already documents the house convention for this — an outer border + absolutely-positioned inner frame(s) with **fixed-px insets**, not nested padding divs and not proportional/stretched coordinates. The bug was never about absolute positioning itself, only about *proportional* positioning (SVG viewBox fractions on a variable-aspect-ratio card). Fixed shallow insets (comfortably under the `px-7`/`py-5` padding floor) for the rule lines; a `border-image`-based tiling pattern (SVG data-URI, `border-image-repeat: round`) for the guilloche texture band — the standard distortion-free way to render a repeating-pattern border that adapts to any element size; small **fixed-size**, non-stretched SVG icons (matching the original corner-star technique) for corner medallions and diamond markers. This guarantees no overlap (fixed insets always inside the padding floor) and no distortion (nothing is ever non-uniformly scaled).

Also corrected: the inter-card gap in double view. Re-reading the reference design's geometry, its two page containers use `gap:0` — each card's stacked "pages underneath" layers peek toward that card's own **outer** edge (away from the spine), never bridging the seam between cards. The first implementation added an arbitrary `gap-6`/`gap-10` with no stack anchored to fill it. Fixed to `gap-0`, with each `QuranSafha` instance taking a `stackPeekSide` prop so its layers peek the correct (outer) direction depending on whether it's the right or left card of the spread.

## Addendum 2: decoration removed entirely — only the stacked layers remain

**Date:** 2026-07-06

The "Decoration — Option B (chosen)" decision above and its box-model correction (Addendum 1) are **superseded**: after living with the ornamental frame, the user chose to remove it completely. The card no longer has any double-ruled border, guilloche pattern band, corner medallions, or top/bottom diamond markers — it is a plain `bg-card` surface with its existing `md:`-only shadow. The only decoration retained is the two small offset "pages underneath" stacked layers behind each card (`bg-card dark:bg-muted` fill, `border-muted-foreground/30` edge for cross-theme contrast, `pointer-events-none`), offset by `translate-x-2`/`translate-x-1` + `translate-y-1`/`translate-y-0.5` toward the `stackPeekSide` outer edge. See `docs/plans/mushaf-double-page-view.md` Addenda 3–7 for the iteration history. Anything in the Decision/Options/Addendum 1 text describing a border/medallions/markers is historical, not current state.

## Addendum 3: double-view font is width-capped so both pages always fit

**Date:** 2026-07-06

**Problem.** The `vh`-driven font model (ADR 0004) sizes the card by viewport *height*: the card's width is roughly `14.42 × font-size` (ADR 0011's measured justified-line ratio) plus padding, and `font-size = max(24px, X vh)`. So card width scales with viewport **height**, independent of width. In double view two such cards sit side by side; on `lg` viewports where height is large relative to width (e.g. ~1256px wide on a tablet), the pair exceeds the viewport width and the outer (right) card is clipped.

**Decision.** In **double view only** (`isSpreadActive`), cap the word font size by a from-width budget in addition to the height-based value: `font-size = min( max(24px, X vh), widthBudget )`, where `widthBudget` is derived from half the available row width minus per-card chrome/padding, divided by the same ~14.7 justified-line divisor ADR 0011 uses on mobile. Both facing pages then shrink together to fit and stay fully visible; because font drives both width and height, the cards also get shorter and are centered vertically (they no longer fill `100dvh`). Implemented CSS-only (a `min()` expression gated by a spread-active class on the container), so there is no JS measurement, no hydration flash, and — by setting the font via a CSS variable + a `globals.css` rule rather than a Tailwind arbitrary value — no new per-scale JIT safelist (ADR 0005) is required for the double-view expression.

**Scope guard.** Single-page view (including forced-single below `lg`) is untouched: it keeps `max(24px, X vh)` exactly, so ADR 0004's "reading size is height-controlled, user-scalable" guarantee holds everywhere except the deliberately-different double-view spread. This is the follow-up the original plan anticipated ("if two cards don't fit at some `lg`-range width… out of scope for this plan unless a follow-up reports real overflow") — the overflow was reported, so double view gets its own width-fit rule.

## Addendum 4: display is gated by a pre-paint attribute + CSS, not JS matchMedia

**Date:** 2026-07-06

**Supersedes** the original Decision/Consequences wording that had the client pick single-vs-double from *live* view-mode **and** `matchMedia` (`useIsLgUp`), and called the toggle "pure CSS show/hide against server-rendered content." That JS-gated model had a slow-connection flash: `useIsLgUp()` is `false` on the server and first paint (it needs a client `useEffect` + `matchMedia`), so on `lg` screens a default-double reader saw a **single** page — with the toggle already showing double selected — until hydration ran. On a throttled connection this was very visible.

**Decision.** Gate the double-page *display* the same way the app already prevents the theme flash (`app/layout.tsx` `<head>` inline script): a tiny pre-paint inline script reads `localStorage.quranSafhaView` and sets `data-safha-view` on `<html>` **before first paint** (default `"double"`). CSS then drives everything viewport-dependent — partner-card visibility, the Addendum 3 width cap, and the compensate margin — keyed on `:root[data-safha-view="double"] .fq-spread …` inside `@media (min-width: 1024px)`. Because the attribute is correct before paint and the `lg` gate is a media query, there is **no flash for either preference** (default-double or explicitly-single), no dependency on JS timing, and no `matchMedia` in the display path.

- `.fq-spread` is a **static** class on `QuranSpread`'s cards row (always present, never toggled), so the CSS gates only ever match cards *inside a spread* — the standalone `QuranSafha` in `QuranPage.tsx` (no `.fq-spread` ancestor) is unaffected.
- `QuranSafhaViewContext.setView` updates `data-safha-view` at runtime (mirroring `useTheme`), so toggling live re-drives the CSS without a reload; the init effect syncs it too.
- `useIsLgUp` remains, but **only** to choose the nav-arrow `href` (single-step ±1 vs pair-step ±2). Its pre-hydration staleness is invisible: the arrow icon and position are identical, only the link target differs, and it corrects on hydration. This is the one intentionally-accepted residual.

**Consequence.** The earlier "no hydration mismatch, pure CSS toggle" claim still holds for the *display*, now more strongly (correct at first paint, not just after the effect). The cost is one more line in the pre-paint inline script and a `data-safha-view` attribute React doesn't own on `<html>` (same shape as the theme classes it already sets there).
