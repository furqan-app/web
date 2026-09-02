# Reader — Decisions

Active decisions for the reader surface — persistent pager, swipe, double-page, reading-size contracts, first-paint positioning. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Reader Surface Depth

**Status:** active

**Decision:** The reader page face carries **no added light** in any theme — it is a flat `--mushaf-paper` fill. Depth comes from the page's **edges**: rim, sheet stack, binding crease, and a cast shadow where there is a desk to catch it. The rules are declared **once, theme-agnostically**; each theme supplies only values through the `--mushaf-rim-*` / `--mushaf-sheet-*` / `--mushaf-crease*` / `--mushaf-page-cast` / `--reader-chrome-*` token contract. On dark surfaces at or below ~10% lightness drop shadows are **omitted rather than tuned**, because on `(7,15,23)` they produce no visible pixels; dark separates its page from its desk with a **uniformly** lighter paper instead. The ordering invariant holds: page face > surround ≥ far background, creases below both. See [ADR 0032](../adr/0032-dark-surface-depth-from-light.md) and its 2026-07-29 supersede.

**Constraints:**
- Do not add drop shadows or inset "dip" shadows to dark-theme reader surfaces expecting them to read — `--background` is RGB `(7,15,23)`, leaving ~7 points of headroom before black, which is below the visible threshold. Reach for a lighter face or a lifted surround instead.
- Any depth or ambient-light change to these surfaces must be verified by **sampling rendered pixels** on a running dev server, not by reading the declaration. A shadow can be mathematically present and produce no visible pixels — this has happened repeatedly.
- A radial ambient pool behind an opaque element must be sized so its lit zone extends **past** that element. Matching the pool's radius to the element's half-width hides the whole effect and leaves only its dead tail visible.
- Depth **rules** are shared by all three themes; only **values** differ. Do not reintroduce a theme-scoped copy of a depth rule to serve one theme — add or retune that theme's tokens instead. Scoping a depth rule by theme is what produced six copies of one idea and two regressions that only review caught.
- The depth tokens (`--mushaf-rim-*`, `--mushaf-sheet-*`, `--mushaf-crease*`, `--mushaf-page-cast`, `--reader-chrome-*`) are defined in **all three** theme blocks (light, gold, `.theme-dark` — `.theme-dark.dark` was removed in subtask 2.1). Every theme must define the whole family; a missing token silently falls back to an unset value and flattens that theme's page. This reverses an earlier dark-only exception — see ADR 0032's supersede.
- **Do not light the page face.** Shading it (a darkening pass, like mobile's corner dip and inner vignette) is fine; adding a lit core or any brightening gradient is not. A gradient ramp existed here and was removed from every theme and band — do not reinstate it without an explicit decision.
- `--reader-chrome-shadow` is `none` in dark and a real shadow in light/gold: the shadow-vs-light difference is now a **value**, not a forked rule. ~~The recitation bar's *background* remains theme-scoped…~~ **Superseded by subtask 3.2:** chrome bars are opaque in every theme via `.fq-chrome-bar`, and the dark-only face/rim overrides on the bar and its rail are gone. Glass was the reason those overrides existed.
- The ordering of the ladder is the invariant; its step **values** belong to a specific design and live in that design's plan. The desktop reader has no ambient desk pool — surround equals the far background by choice — so a fixed "surround must exceed background" rule would fail a signed-off design. See ADR 0032's addendum.
- Sample verification pixels from the **measured card rectangles of the pager's middle panel**, never from viewport fractions guessed by eye: the pager mounts three panels side by side, so a fraction like 0.955 lands on the desk rather than the paper. A whole round of numbers was recorded wrong this way.
- Floating dark chrome (recitation bar, nav arrows) follows the same rule as the paper — an opaque raised face plus a warm rim, never a shadow, and never the translucent `bg-background/75` glass that light and gold use, which produces no lift over `(7,15,23)`.
- **Contrast is relative to what surrounds a surface, so a value verified in one band does not transfer to another.** Desktop's page reads against a desk; the tablet reader is full-bleed, so the eye can only compare within the page. A desktop ramp copied verbatim to tablet once measured correctly and looked unchanged. Band scoping is for **values**, never for rules.
- **A WCAG contrast pass is not evidence that a reading surface is restful.** Contrast measures luminance difference only. A gold paper at 12.9:1 (comfortably AAA) was rejected as tiring because its saturation had been pushed from 47% to 68% — chroma load, which contrast does not capture. Warmth is reached by lowering lightness, not by raising saturation; measure chroma alongside contrast. Copying a signed-off value into a different context is not the same as copying its effect.
- Tablet keeps **no drop shadows** (an explicit user request recorded in the tablet block) and stays **full-bleed** — `100dvh`, edge-to-edge cards, nav as overlay. The desktop surround cannot be ported without insetting the book, which costs reading area and shrinks double-view text (ADR 0013). Do not add margins there to chase the desktop look.
- The MCP browser clamps its viewport at 1600px, putting the entire tablet band out of reach. Verify tablet-band pixels with `scripts/dev/reader-shot.mjs`, which drives system Chrome headless at any viewport, prints the measured card/stack/arrow/bar rectangles, and takes an optional `extra.css` to probe a candidate treatment **without editing `globals.css` first**. Playwright's own browsers are not installed; it points at `/usr/bin/google-chrome-stable`.

---

## Desktop Reading Group (≥1367px)

**Status:** active

**Decision:** At `≥1367px` wide **and** `≥800px` tall, the reader places a fixed vertical rail on the screen-right edge (`right: 24px`, vertically centred, **96px wide**) containing the recitation controls (play/pause, verse key, reciter dropdown trigger, settings, stop). The mushaf spread stays visually centred with no asymmetric offset — the rail overlays the existing lateral whitespace (spread is capped at 860px, leaving ≥253px per side at 1367px — 96px rail + 24px offset stays well inside that budget). Below either threshold, desktop keeps the full-width bottom-edge bar. This replaces the previous "floating centred card below the spread" layout (see `docs/plans/recitation-bar-vertical-rail.md`).

**Reciter dropdown (2026-08-04, Trello #183, updated #412):** Both the full-width bar's reciter-name text and the rail gained a `ReciterCombobox` trigger (app/components/recitation/ReciterCombobox.tsx, extracted from `RecitationSettingsSheet`) — clicking either opens the same reciter popover the settings sheet uses, calling `updateSettings({ reciterId })` directly. Mobile uses a lighter `text-xs font-normal` typography (#412) to stay compact and subordinate to playback transport, while desktop keeps `md:text-sm md:font-medium`. This is what pushed the rail from 56px to 96px (room for a truncated name + chevron). No new reciter-switching logic was needed — `RecitationContext`'s existing mid-session effect already reloads chapter audio and resumes at the same verse when `reciterId` changes. The bar's own `.fq-recitation-info` div (name+verse-key together) is still fully hidden in rail form via the original `display: none` rule — the rail's reciter trigger is a separate element, not a rework of that hidden pair; verse-key visibility in rail was not part of this change despite this section's own wording implying otherwise (a pre-existing, unfixed doc/code gap, flagged not fixed). See `docs/plans/recitation-bar-vertical-rail.md` Addendum.

**Rationale:** Moving the bar off the bottom edge reclaims the 104px bottom padding previously reserved for it, yielding +0.13–0.15 em of inter-line gap at every desktop/large-tablet band (pairs with the reader rhythm ticket #172). The rail is fixed-right at a viewport offset and does not need to know the spread's dimensions.

**Retired contract — `--fq-spread-width` / `--fq-spread-center`:** These custom properties were formerly published by `QuranSpread`'s `useSpreadMetrics` ResizeObserver hook and consumed by the floating bar to match the spread's measured width. Both the hook and its consumers have been removed (2026-08-02). Do not re-add them without a new justification — the bar no longer needs the spread's dimensions.

**Constraints:**
- The rail is desktop-only (≥1367px + ≥800px). Tablet (1024–1366px) has no lateral space (spread fills edge-to-edge); it keeps the full-width bottom bar with nav-overlay sync unchanged.
- Rail position is fixed-right regardless of locale (AR/EN). The mushaf spread layout is not adjusted.
- Never widen the height gate by reducing `baseScaleViewHeight` or any font math — that is the reading size (ADR 0004), and changing it also requires regenerating the `tailwindFontUtility` safelist (ADR 0005).
- Nav arrows need `align-self: center` (the parent is `items-stretch` at `md+`) and ≥24px inline margin: the sheet stack peeks 16px past the card's outer edge, and at 0 margin the arrow sat on top of it.
- Layout declarations on the rail need `!important` to beat the JSX `inset-x-0` / `bottom-0` utilities. Colour declarations that a utility already sets will silently lose on source order — raise specificity deliberately or drop them.
- `--reader-chrome-bar-shadow` is `none` in dark theme; the rail must honour this — do not add a shadow override. Verify by sampling rendered pixels in all three themes.

---

## Quran Safha Viewport Fit

**Status:** active

**Decision:** Mobile keeps its width-fit model; tablet and desktop use the per-band reader-size contracts in [ADR 0054](../adr/0054-reader-size-contracts-and-tablet-double-view.md). On desktop the resolved semantic preset drives word size and all dependent page geometry together; on tablet the responsive double-page calculation is reduced by a 0.96 density factor so surplus becomes rhythm and surah-start clearance. This supersedes ADR 0004's shared `FONT_V1`-driven desktop/tablet sizing model.

**Constraints:**
- Do not change only the text `font-size`: the resolved size must also drive the page width, frame fallback, line-gap floor, and surah-start budget.
- The 15-slot budget remains load-bearing. A surah start must reserve its own frame-to-Bismillah clearance inside that budget; it may not rely on whatever `space-between` happens to leave.
- The site nav bar's fixed 56px height is the one accepted fixed-px term in the budget; do not attempt to compensate for it inside `QuranSafha` — if it ever needs to change, recalibrate the budget in ADR 0004.
- The 24px readability floor remains for any responsive cap that would otherwise shrink smaller on short viewports; the no-scroll test cases must be re-measured for every desktop preset and the tablet reference viewport.
- **Desktop spread (md+):** The two facing pages are made **equal height by content, not by a fixed viewport height.** They share one flex parent (`.fq-spread`, `align-items: stretch`), so the shorter page stretches to match the **taller** one — adaptive to any font scale, and short opening pages (Al-Fatiha) are not forced to full screen height. Mechanism: the ReaderPage background is `min-h-[calc(100dvh-3.5rem)]` (a floor, **not** a fixed `h-*`) with `md:justify-center` so a short spread centers and a tall one can grow/scroll. `.fq-spread`'s `items-stretch` equalizes the two page-wrapper divs — those wrappers must **not** carry an explicit height (`md:h-full`), because a flex item with an explicit height is not stretched and `100%` resolves to `auto` against the content-height parent (this collapses the shorter page). Below each stretched wrapper, `h-full` propagates through `fq-full-safha` → relative wrapper → card → `fq-content` (a stretched flex item has a definite cross-size, so these `%` heights resolve). Inside `fq-content`, header/footer are `shrink-0` and `fq-quran-safha` is `flex-1`; a `.fq-spread .fq-quran-safha` CSS block (at `md:`) mirrors the mobile `space-between` layout with `margin-bottom: 0 !important` on direct children, so lines distribute evenly within the stretched height. **Standalone `QuranSafha` (VerticalQuranPages) is NOT affected** — all rules are scoped to `.fq-spread`. (An earlier attempt pinned a fixed `h-[calc(100dvh-3.5rem)]` and pushed `h-full` top-down; it broke on font-scale changes and stretched opening pages — superseded. See `docs/plans/fix-surah-banner-placement.md` Addendum 2.) **Partly superseded at ≥800px viewport height — see the next bullet.**
- **Desktop spread, height ≥800px — the card fills the band and the surplus becomes line rhythm ([ADR 0036](../adr/0036-reader-fills-height-band.md)).** This supersedes the "equal height by content" clause above at `md+` and `min-height: 800px`: the spread container is `flex: 1 1 auto` + `align-items: stretch`, so the card takes the reader's whole height band, and `.fq-spread .fq-quran-safha` switches to `justify-content: space-between` with `gap: var(--fq-line-gap)` kept as a **floor** (flexbox distributes positive free space only, so a too-tall page degrades to `flex-start` with the floor intact). The stretch must travel by `align-items: stretch` — the chain `.fq-spread-col` → `.fq-spread` → page wrapper is explicitly height-less, because `height: 100%` inside a flex-grown box resolves to `auto`; re-adding `md:h-full` anywhere in it collapses the card back to content height. Below 800px viewport height nothing changes (no surplus to claim, and the fixed recitation bar is in the way); where that bar is still a bottom bar the reader reserves 76px for it, which the rail's own gate (≥1367px + ≥800px) then gives back. Two tuned spacing knobs: desk margin on the spread container (64px at ≥1367px, 16px at 768–1023px) and page side margin (`.fq-content` `padding-inline` 56px at ≥1367px). Opening pages 1–2 use the same `space-between` distribution as every other page (Addendum 10, Trello #135 — the earlier "centre inside a full-height card" behavior is removed). Tablet (1024–1366px) and the standalone `QuranSafha` are untouched.
- On mobile (below `md`), the Safha card fills the full viewport and is sized by **two facts, no budget formula** (see [ADR 0011](../adr/0011-mobile-quran-font-scale-vw-formula.md)). (1) **Font size comes from width:** `calc((100vw - <padding>) / 14.7)`, where the worst-case line-width/font-size ratio across all 604 pages is `14.42` (measured 14.13–14.42; page 580 is worst) and the `14.7` divisor leaves ~2% margin so cross-device rendering variance can't push a line past the width. (2) **Leftover height is distributed by flexbox:** the lines live in a full-height flex column with `justify-content: space-between`, so the browser turns remaining vertical space into even inter-line gaps — filling the page like a native mushaf with no `dvh`/chrome accounting, no `22.089` slot budget, and no per-font line-height constant. Two backstops make this robust: mobile rows are `flex-wrap: nowrap` with `flex-shrink: 0` words so a hair of overflow clips invisibly (card is `overflow-hidden`) instead of wrapping a word to a new row; and the text column has `padding-block: 0.5em` for breathing room above/below the header and footer. Opening pages (1–2) use this same `space-between` distribution — no separate centering mode (Addendum 10, Trello #135). The only calibrated number is `14.7`; revisit it only if a future page font's justified width ratio exceeds its margin. Font size tracks screen width (wider phone → larger text) and is not user-adjustable on mobile; font scale controls stay hidden in the Settings sheet on mobile. The formula is capped at 28px (the value it produces at ~430px, the widest common phone width) so tablet-width portrait viewports — still under the 768px `md` breakpoint, e.g. an 11.5" tablet at ~720px CSS width — don't render an oversized, uncapped font; above the cap, lines no longer touch both card edges, which is accepted, and `.fq-quran-safha` uses `align-items: center` (rather than the default `stretch`) so those narrower capped lines center instead of hugging the RTL start edge. The page wrapper around the card (`page.tsx`) and the card itself must use the same viewport unit — `dvh`, not `vh` — for any full-viewport height/min-height; mixing them (wrapper on `vh`, card on `dvh`) makes the wrapper demand the largest-possible viewport height while the card tracks the actual visible one, producing a vertical scrollbar on real devices with a collapsible toolbar (invisible in Chrome DevTools' device emulation, which doesn't simulate that dynamic chrome).

---

## Mushaf Double-Page Spread

**Status:** active

**Decision:** Desktop users can toggle between single-page and double-page views; tablet (1024–1366px) is always double-page, and mobile remains single-page. Pages pair up in fixed pairs `(1,2), (3,4), (5,6)…(603,604)` (302 complete pairs, no singleton); `getPagePair(n)` derives a pair from either member. `/pages/[id]` keeps its existing route shape — either id of a pair renders that same pair. `ReaderPage` always fetches **both** pair members' words server-side at build time. See [ADR 0013](../adr/0013-mushaf-double-page-spread.md) and ADR 0054.

**Constraints:**
- View preference persists in `localStorage` (`quranSafhaView`, via `QuranSafhaViewContext`) for desktop only — default `"double"`. Tablet ignores a stored `single` preference: CSS always reveals its partner and navigation steps by a pair.
- The single-vs-double **display** is gated by CSS, not JS: a pre-paint inline script (`app/layout.tsx`, alongside the theme flash-preventer) sets `html[data-safha-view]` from `localStorage` before first paint, and CSS (`:root[data-safha-view="double"] .fq-spread …` at `@media(min-width:1024px)`) shows the second card / applies the width cap / drops the compensate margin. This is correct at first paint even on slow connections (no `matchMedia` in the display path). `useIsLgUp` survives only to choose the nav-arrow href. `setView` updates the attribute for live toggling. See ADR 0013 Addendum 4.
- In single-page mode (including forced-single below `lg`), prev/next steps by one page (`pageId ± 1`, unchanged from before this feature). In double-page mode, prev/next steps by a whole pair (`± 2`), anchored to the odd (right-hand) id of the neighboring pair.
- Both pair members' `@font-face` blocks are always inlined, but only the current page's font gets `<link rel="preload">` — the pair partner's font is not preloaded, so it isn't fetched at all unless that card is actually rendered (relies on browsers not fetching fonts for `display:none` content).
- The prior corner-star/rounded-border decoration (`quran-page-mushaf-design.md`) was replaced, and after iteration the ornamental frame was removed **entirely** (no SVG border, medallions, or diamond markers). The card is now a plain `bg-card` surface with its `md:`-only shadow, plus 2 small offset stacked "pages underneath" layers (`bg-card dark:bg-muted`, `border-muted-foreground/30`) that peek toward each card's outer edge via `stackPeekSide` and double as a left/right-page indicator. All theme-token driven, no hardcoded colors. Renders at `md:`+ regardless of single/double mode; only the second card and the pair-step nav are gated at `lg`.
- **Double-view width fit:** in single-page view the card is sized purely by the `vh`-driven font (ADR 0004), so its width tracks viewport *height* (~14.42× the font size, per ADR 0011's justified-line ratio). Two such cards can overflow the viewport width at some `lg` sizes. In **double** view only, the word font is therefore capped by a from-width budget — `min(vh-font, per-half-width budget)`, the same width-driven technique as ADR 0011's mobile formula — so both facing pages always fit and shrink together on narrower `lg` screens. Single-page reading size is never touched (ADR 0004 holds). This is a deliberate, double-view-only exception to "reading size is height-controlled."
- Do not add a new URL scheme for pairs (no `/pages/2-3`) — the existing per-page route shape is load-bearing for `generateStaticParams` and every other basePath-deriving consumer (sidebar/search links, grant reader).
- Applies to both the self reader (`/pages/[id]`) and the shared-access grant reader (`/mushaf/[grant]/pages/[id]`) — `ReaderPage` is shared between them.

---

## First-Paint-Critical Positioning Must Be CSS-Gated, Not JS-Hook-Gated

**Status:** active

**Decision:** `useIsMobile`/`useIsTablet`/`useIsDesktopUp` (and any other `matchMedia`-backed hook) may only drive UI that's allowed to be wrong for one frame after mount. They must never decide `position`/`display` that has to be correct on the very first paint — SSR always renders their `false` default, and the browser paints that raw HTML before hydration's `useIsomorphicLayoutEffect` ever runs, so even a layout effect can't undo it. Breakpoint-dependent positioning that must be right immediately goes in a CSS `@media` rule instead, using the same width the JS hook encodes; route/state gating that CSS can't express (e.g. `usePathname()`) stays as a class hook, since `usePathname()` — unlike viewport width — resolves correctly on the very first server render. See [ADR 0043](../adr/0043-breakpoint-positioning-must-be-css-gated.md); the reader `Nav`'s overlay positioning (`docs/plans/tablet-nav-overlay.md`, "CSS-gate nav overlay positioning" addendum) was migrated to this pattern after the JS-hook version caused a first-paint flash (nav in flow → briefly scrollable page → nav snaps to fixed, content jumps up). The tablet 3-panel carousel offset ([ADR 0027](../adr/0027-tablet-swipe-carousel.md)) already used this technique before it was generalized here.

**Constraints:**
- Do not add a pre-hydration inline `<script>` as a substitute — that path already exists for theme/safha-view (`app/layout.tsx`) and is reserved for state that genuinely can't be expressed in CSS (e.g. reading `localStorage`). Breakpoint width can always be expressed in CSS; prefer that.
- Keep the CSS `@media` width and the JS hook's query string numerically identical when either changes — there are now two representations of each breakpoint and no shared constant between them.

---

## Full-Viewport Heights Anchor to the Initial Containing Block, Not to Viewport Units

**Status:** active

**Decision:** Any box whose height must equal the visible viewport resolves that height from the initial containing block — `position: fixed` with `inset: 0`, with containment below it — never from `100dvh`/`100svh`/`100lvh`/`100vh`. This traces back to the installed PWA's `display: "fullscreen"` immersive-transition race described below; `display` was later reverted to `"standalone"` (see [feature-pwa-fullscreen-focus-mode.md](../../plans/feature-pwa-fullscreen-focus-mode.md) Addendum, #317 — Android's non-sticky immersive mode surfaced the status bar on ordinary taps, not just edge swipes, which was never the intended UX), so the specific race no longer occurs — but the ICB-anchored fix is kept regardless: it's strictly more robust than a viewport unit and costs nothing to keep. In the (now historical) broken state: Android launched non-immersive and Chrome entered immersive fullscreen a moment later; a document that laid out during that transition got its viewport units pinned to the transitional viewport and Chrome never re-resolved them. Measured on-device: `100dvh` read `888.364px` on elements that existed at transition time while `window.innerHeight` was `832` and a *newly created* element read the correct `832.364px` in the same frame — and **no `resize` event is delivered at all**, so nothing in the page can observe or react to it. See [ADR 0044](../adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md). This **supersedes the "use `dvh`, not `vh`" rule below for full-viewport heights only** (the mobile safha entry and the `Sidebar` bottom-clip entry): that rule remains correct about `vh` vs `dvh` on browsers with collapsible chrome, but in the installed PWA both are unreliable, so full-viewport heights leave the viewport-unit family entirely. `dvh` stays the right choice wherever a viewport unit is still appropriate.

**Constraints:**
- Height travels below the ICB-anchored box by `align-items: stretch`, never by percentage heights — `height: 100%` inside a flex-grown box resolves to `auto` and collapses the card (the same trap [ADR 0036](../adr/0036-reader-fills-height-band.md) records for the desktop spread; re-measured here, the card fell 812px → 469px).
- Viewport units are still fine where the value is not a full-viewport height *contract* and can be off without breaking a layout guarantee (e.g. `max-h-[70dvh]` on a bottom sheet).
- A viewport unit that feeds a **font size** rather than a box height (the tablet `--fq-tablet-word` cap) cannot inherit a box height and needs its own treatment — a stale launch there yields an oversized font, not a scroll.
- Do not "fix" this by detecting the mismatch in JS and poking a custom property on `:root`. It works (verified live) but can only run after paint, so a losing launch paints the wrong size and then visibly jumps.

---

## Reader Navigation — Persistent Client Pager

**Status:** active

**Decision:** The reader navigates between pages with a **persistent client-side pager**, not a
route change per swipe. `/[locale]/pages/[id]` stays statically generated as the SSR *entry* (deep
links, SEO, first paint, PWA); once hydrated, the client `ReaderPager` owns navigation. It holds a
persistent `anchor` and moves a small mounted **window** (visible page ±1 on mobile/desktop, spread
±1 on tablet double-view) via `commitTo` (a `flushSync` anchor-swap + re-center), syncing the URL
with `history.replaceState` — no `router.push`, no remount. Swipe, the in-spread arrows, and
recitation-follow all funnel through `commitTo`.
Page content is served as **immutable slim static JSON** (`public/quran/pages/{n}.json`, ~10×
smaller than the old RSC), fetched on demand and cached; marks stay the only dynamic layer, applied
as an overlay. Render model is **windowing first** (reuse existing word components, mount only the
window), with **event-delegated static markup** documented as an escalation if a real-device
re-profile misses the target. See [ADR 0028](../adr/0028-reader-persistent-pager.md) and
`docs/plans/reader-persistent-pager.md`.

**Rationale:** Profiling showed each `router.push` swipe deserialized a 2.27 MB RSC payload and
mounted ~1,478 word components across 10 pages, blocking the main thread ~183 ms on a fast desktop
(~0.6–1.1 s on mobile) — the reported freeze. The pager removes the remount; slim JSON removes the
payload; windowing removes the mass mount.

**Constraints:**
- Keep `/pages/[id]` statically generated — only *subsequent* swipes are client-only; never make the
  reader route dynamic.
- Content JSON is a build artifact under `/public`, immutable and Prisma-free at runtime; never bake
  marks into it.
- `commitTo` is the single in-reader navigation primitive — swipe, arrows, **and** recitation-follow
  all use it; do not reintroduce `router.push` for in-reader page changes, and do not read
  `usePathname()` for the current page (`replaceState` never updates it — that is exactly what broke
  recitation-follow before it was moved into the pager).
- Recitation-follow: `RecitationContext` exposes `recitedPage` **and `isFollowing`** (a two-state
  attach/detach flag — ADR 0056); a dedicated null-rendering `RecitationFollow` leaf owns every
  transition via the pure `decideRecitationFollow` and calls the pager's `followTo` only while
  attached. Three invariants: (a) the recitation subscription MUST stay in that leaf, never in
  `ReaderPager` — the context ticks on every recited word, so subscribing the pager re-renders the
  whole reader tree per word (flicker + repeated font fetch); (b) `followTo` MUST defer its
  `commitTo` to a microtask — `commitTo`'s `flushSync` flushes passive effects synchronously, so an
  inline follow runs mid-commit (guarded out, never retries → never returns) and nests a flush;
  (c) the leaf must NOT advance its `prevRecitedPage` ref on a `follow` — `followTo` drops the
  request during a drag/commit, and the stale ref is what makes the next tick retry. See ADR 0028,
  ADR 0056, and the plan.
- The window unit is breakpoint-dependent (page vs spread) — do not hardcode single-page.
- **The same page is mounted more than once at the same time.** `getPagePair(N)` makes `pair(N)` and
  `pair(N±1)` overlap, so in the single-page layout two of the three panels render the same page; and
  `QuranSpread` always mounts *both* members of a pair, hiding the non-current one with
  `.fq-spread .fq-safha-partner { display: none }` because the single-vs-double display gate is CSS,
  not JS (ADR 0013 Addendum 4). A hidden copy is fully mounted, runs its effects, and matches
  selectors. Anything that reaches a word in the DOM must therefore tolerate **multiple live matches
  per `word.location`** and must never cache one element per location — a one-element map picks its
  winner from mount/commit history, not from visibility, and survivors are `memo`'d and *moved* by the
  keyed window so they never re-register after an eviction. This shipped as the recitation word-tracking
  bug (Trello #182): the highlight advanced on a `display:none` copy while a stale one sat frozen on the
  visible page. Do not "fix" it by deduping the mount — the three-panel window and the CSS display gate
  are both load-bearing.
- The commit **slide** belongs to the swipe gesture alone. It exists to continue a drag's live
  transform from where the finger released, so `animateCommit` animates only when its `animate` arg
  is true (swipe); the in-spread arrows and the keyboard pass false and commit instantly via
  `commitTo`. Do not re-unify the three inputs onto the animated path — a click or keypress has no
  transform in flight, so the slide reads as a phantom swipe, and `docs/standards/styling.md`'s
  Motion section rules out animating keyboard-initiated and high-frequency actions outright. Gate this on **input source,
  never on a breakpoint**: the arrows render from `md`, so an `isLgUp` gate leaves tablet arrow-taps
  sliding and kills swipe motion on a touch laptop. Because an instant commit clears `isCommitting`
  synchronously, the keyboard path also needs its own `e.repeat` guard — the slide's duration used to
  be the only thing rate-limiting a held arrow key. See `docs/plans/arrow-controls-desktop.md`
  Addendum 1.
- **Input arriving during a commit TAKES OVER, never dropped** (Trello #153, [ADR 0028](../adr/0028-reader-persistent-pager.md)
  Addendum 2026-08-11). The in-flight turn is **settled** — landed immediately, not aborted, since the
  user already committed to it past the threshold — and the new input is then handled as if nothing
  were in flight. This requires `animateCommit` to store its `EXIT_MS` timer id (`inFlight`); the
  unstored `setTimeout` is precisely why input had to be discarded before. Because `commitTo` uses
  `flushSync`, the re-render completes synchronously, so a caller must **re-enter through its ref**
  (`navRef`/`stepRef`) after settling rather than falling through — its own closure still holds
  pre-settle anchors and would resolve the wrong page. `e.repeat` must stay ahead of this or a held key
  turns a page per repeat. Swipe count equals page count on every path. Do not abort instead of settle
  (loses a turn the user asked for), and do not reintroduce a pending-step queue: it coalesced rapid
  input and needed a latch, a microtask and a drain to avoid dropping gestures of its own.
- Preserve recitation highlight, tajweed re-grouping, grant reader (ADR 0012), and the double-page
  spread (ADR 0013) against the pager/window model.
- **Immutable content queries (`usePage`, `useVersePages`) run with `networkMode: "always"`** — their `fetch()` resolves from the service worker's `CacheFirst` rules even when `navigator.onLine === false`, so a downloaded-but-unvisited page renders offline instead of pausing forever (the default `"online"` mode skips `queryFn` entirely while offline). Do not extend this to dynamic hooks (marks/plans stay online-aware), and do not disable `refetchOnReconnect` on these queries — loaded pages are immune via `staleTime: Infinity`, while errored ones self-heal on reconnect. See `docs/plans/pwa-offline-support.md` Addendum 6.
- **A page turn commits immediately and is never gated on the target's readiness** ([ADR
  0034](../adr/0034-page-turn-readiness-on-slow-networks.md)). The two assets a turn needs — the page's
  content JSON and its WOFF2 font — cost real network time (a double-view turn moves ~167 KB of font,
  ~855 ms on Fast 3G), so gating the commit converts a visible blank into dead input of the same
  length. That wait is absorbed two ways instead: **lead time** (prefetch runs in two stages — Stage A
  warms the ±1 window on anchor settle, Stage B warms the second page in the last-committed direction
  and starts only once Stage A settles, so lookahead never competes with the window the user is about
  to see); and **an honest loading state** for whatever wait remains. Stage B is prefetch only — the
  mounted panel window stays at three.
- The loading state is a state of `QuranSafha` itself (nullable `pageMetadata`; the skeleton shows
  when content *or* font is missing), never a separate skeleton component — duplicated card chrome
  drifts from the real layout, which has already shipped as a bug once (see
  `docs/plans/fix-quran-page-font-loading.md` Issue 3).
- **A card rendering without content must reserve what the content would have sized.** On the
  desktop spread the card is content-sized (ADR 0013 Addendum 2), so an `absolute inset-0` skeleton
  contributes no height and the card collapses to header + footer (measured 608px → 110px, bars
  shrinking to 0). The bars therefore render **in flow as direct children of `.fq-quran-safha`**
  whenever there is no content, inheriting its real flex distribution, `--fq-line-gap` and padding;
  they stay an overlay only in the font-only wait, where the real text is mounted and supplying the
  height. This makes `SKELETON_LINE_COUNT` (15) and `SKELETON_LINE_COUNT_SHORT` (8, pages 1–2 —
  their surah banner and bismillah occupy slots too) load-bearing layout values: an undercount grows
  the card when the page lands. Those bars must also carry an **em width** (`QURAN_LINE_WIDTH_RATIO`
  em, the real line's width by construction), never `w-full`: the card is shrink-to-fit, and a
  percentage width contributes nothing to intrinsic sizing, so `w-full` bars let the card resolve
  against available space and then correct a frame later — measured 785px against a real 523px, and
  that over-wide value reached `--fq-spread-width`, which is what made the floating recitation bar
  jump. (The em width is necessary but, as of 2026-07-31, **not sufficient** — a width-settling
  artefact on the loading spread is still observed and is an open follow-up; see
  `docs/plans/fix-page-turn-blank-slow-network.md`.) Separately, the header reserves its cells with a
  non-breaking space
  when metadata is absent — cell heights are `font-size × line-height`, independent of glyph or digit
  count, so the reservation is exact. Card *width* needs no reservation; it is floored by the
  worst-case line-width formula and measures identical loaded and unloaded.
- Do **not** let the `Panel` loading state and the real spread differ in height. Rendering the real
  chrome makes them identical by construction, which is what keeps ADR 0028's geometry and the #157
  scrollbar-reflow fix (`docs/plans/fix-panel-placeholder-reflow.md`) intact — a placeholder taller
  than its content toggles a scrollbar and reflows the whole document on every turn.

---

## Swipe Animation — Core Gesture Only

**Status:** active

> **SUPERSEDED by "Reader Navigation — Persistent Client Pager" above / [ADR 0028](../adr/0028-reader-persistent-pager.md).**
> The single-slot `router.push`-per-swipe model (and ADR 0027's tablet carousel) is replaced by the
> persistent pager: navigation no longer changes the route, so the "no adjacent fetches", single-slot,
> and accepted-post-navigation-flicker items below no longer apply. Retained for history only.

**Decision:** `QuranSwipeNav` is a single-slot wrapper: one `overflow-hidden` outer div with a `stripRef` inner div that holds only the current page content. On drag it translates `stripRef` live. On commit (≥80px threshold) it animates to `translateX(±100%)` over 220ms then calls `router.push(href)`. On sub-threshold release it snaps back. `prefers-reduced-motion` skips the animation and calls `router.push()` directly. No adjacent page prefetching, no `startTransition`, no `router.prefetch()`. A post-navigation flicker (browser compositor artifact) is accepted as a platform limitation; the View Transitions API would address it but requires Safari 18+ and experimental Next.js support — out of scope. ADR 0019 (the original sessionStorage approach) and the three-page strip approach (Addenda 2–8) are both superseded. See Addendum 9.

**Constraints:**
- Swipe right = next page, swipe left = previous page (Quran RTL convention — constant regardless of UI locale).
- Do not add adjacent page fetches back — investigated in Addenda 2–8, confirmed zero benefit for the flicker, removed in Addendum 9.
- Do not add a positional/transform entry animation on mount — a transform-based entry reads as a second swipe (Addendum 4/5 incident).
- Do not add `startTransition` — Next.js App Router already wraps its router dispatch in `startTransition` internally; double-wrapping is a no-op (confirmed in Addendum 8/9).
- Do not use `sessionStorage` or `document.documentElement` attributes as fade-signal carriers — these mechanisms are superseded.
- **Exception (tablet double-view only):** the tablet spread uses a real 3-panel carousel that *does* render adjacent spreads — see [ADR 0027](../adr/0027-tablet-swipe-carousel.md). This is a scoped divergence justified by static generation (adjacent fetch cost is build-time) and the reveal being a wanted feature, not a flicker fix. It does **not** relax the above constraints for mobile/single-view, which stay single-slot. The "no entry animation on mount" rule still holds even for the carousel — the incoming route renders statically centered.
