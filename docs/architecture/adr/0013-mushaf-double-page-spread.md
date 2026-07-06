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
`ReaderPage` fetches both pages of the pair unconditionally via `Promise.all`; the client-side single/double toggle only shows/hides the second `QuranSafha` with CSS. No extra request ever, no hydration mismatch, since static generation already pays this cost once at build time (not per-request).

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
