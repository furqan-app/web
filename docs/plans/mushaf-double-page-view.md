# Mushaf Double-Page Spread Toggle

**Type:** feature
**Date:** 2026-07-06
**Status:** implemented

## Summary

Add a single/double page toggle to the mushaf reader (`lg`/1024px+ only) so a user can view two facing pages side by side, like an open physical book, instead of always one page. Pages pair up in fixed pairs — `(1,2), (3,4)…(603,604)` — matching this app's convention (confirmed with user; no singleton opening/closing page). At the same time, replace the current corner-star/rounded-border mushaf decoration with the reference design's SVG double-ruled border + corner medallions + diamond markers, plus offset "stacked pages" layers behind each card, all using theme tokens and our existing fonts/data (not the reference design's placeholder fonts/colors). Mobile (`<md`) and `md`–`lg` are unaffected beyond the decoration swap — they stay forced single-page.

Reference design (visual only, not used for data/fonts): `/home/tahamohamed/Desktop/cs/non-work/templates/furqan-6/quranic-design-system/project/Mushaf Page.dc.html`. See [ADR 0013](../architecture/adr/0013-mushaf-double-page-spread.md) for the pairing/data-fetch/decoration decisions.

## Approach

### 1. Pairing math

New pure function in `app/utils/quran-pages.ts`:

```ts
export function getPagePair(page: number): { rightPage: number; leftPage: number } {
  const pairIndex = Math.ceil(page / 2);
  return { rightPage: pairIndex * 2 - 1, leftPage: pairIndex * 2 };
}
```

`rightPage` is always odd (read first, RTL right side), `leftPage` always even. Used by `ReaderPage` for both data-fetching and nav-href math.

### 2. View-mode context (mirrors `QuranFontScaleContext`)

- `app/types/index.ts`: add `export type QuranSafhaView = "single" | "double";`
- `app/utils/storage.ts`: add `quranSafhaView: QuranSafhaView` to `StorageValueType`/`StorageKey`.
- New `app/contexts/QuranSafhaViewContext.tsx`: `QuranSafhaViewProvider` + `useQuranSafhaView()`, same shape as `QuranFontScaleContext` — `useState` seeded from `storage.get("quranSafhaView")` in a `useEffect` (SSR-safe), default `"double"` if nothing stored.
- Mount `QuranSafhaViewProvider` in `app/[locale]/layout.tsx` alongside `QuranFontScaleProvider`.

### 3. Breakpoint hook

New `app/hooks/use-is-lg-up.ts`: `useIsLgUp()` — `useState(false)` + `useEffect` with `matchMedia("(min-width: 1024px)")` + a `change` listener (client-only; no existing hook in the codebase does this, first one of its kind). Used to force single-page below `lg` regardless of stored preference.

### 4. Toggle control — `QuranSafhaViewToggle.tsx`

New client component: a pill (`flex gap-0.5 p-1 rounded-xl border border-border bg-card`) with two icon buttons from `lucide-react` — `RectangleVertical` (single) and `BookOpen` (double, resembles an open book, closer to the domain than a generic columns icon) — calling `setView("single")`/`setView("double")`. Active button gets `bg-accent text-primary`; inactive `text-muted-foreground`. Wrapped in `hidden lg:flex` — invisible below `lg` since the mode is forced there anyway. Rendered above the page row.

### 5. `ReaderPage.tsx` rewrite

- Compute `{ rightPage, leftPage } = getPagePair(Number(pageId))`.
- Fetch both **sequentially** (`await getPageWords(rightPage)` then `await getPageWords(leftPage)`), not via `Promise.all` — always, regardless of view mode (ADR 0013 data-fetch decision). `getPageWords` already issues 2 concurrent queries internally; fetching both pair members concurrently doubles peak concurrent connections per static-generation worker (4 vs. the original 2), which was confirmed during implementation to exceed the local dev DB's `max_connections=151` during a full 604-page build. Sequential fetching keeps peak per-worker concurrency at the original 2.
- Inline **both** pages' `@font-face` blocks. Only the requested `pageId`'s font gets `<link rel="preload">`; the pair partner's font has no preload — it's fetched lazily only if that card actually renders (relies on `display:none` cards not triggering a font fetch).
- Compute two sets of nav hrefs:
  - **Single-step** (today's `getNavigationHref`/swipe logic, unchanged): `pageId ± 1`.
  - **Pair-step**: from the current pair, `± 2` pairs, anchored to the neighbor pair's `rightPage` (odd id). Wrap at 1/604 same as today.
- Render `QuranSafhaViewToggle` (above the row) and a new client component `QuranSpread` that receives: both pages' `lines`/`pageMetadata`, `pageId` (which member is "current" for single-mode display), both href sets, `isRTL`, `basePath`, `grantId`, `viewingOwnerName`.

### 6. `QuranSpread.tsx` (new client component)

- Reads `useQuranSafhaView()` and `useIsLgUp()`; `isSpreadActive = view === "double" && isLgUp`.
- Renders one shared pair of `NavigationArrow`s outside both cards (unchanged component, just now flanking the pair instead of a single card) using single-step hrefs when `!isSpreadActive`, pair-step hrefs when `isSpreadActive`.
- Renders two `<QuranSafha>` instances in an RTL flex row: `rightPage` first (DOM order), `leftPage` second. The non-current card (i.e. the pair member that isn't `pageId`, when `!isSpreadActive`) gets `hidden` (Tailwind `display:none`) so it isn't painted or font-fetched.
- Keeps `QuranSwipeNav` wrapping the whole spread; swipe hrefs use the single-step pair only (swipe stays page-by-page even in double mode, since swipe has no visual arrow to anchor a ±2 jump to — matches existing swipe-is-plain-page-order behavior, unchanged from before this feature).

### 7. `QuranSafha.tsx` decoration replacement

Remove: the rounded-card border/shadow wrapper, inner accent-frame div, and 4 corner-star SVGs (the whole `quran-page-mushaf-design.md`-era block).

Add (per card, `hidden md:block` for the new ornamental layers, matching the old decoration's breakpoint):
- **2 offset stacked layers** behind the card: two `absolute` divs with `bg-muted border border-border opacity-50/80`, offset a few px toward the "end" side (RTL logical, e.g. `end-2 top-1` / `end-1 top-0.5`) — simulates pages underneath, direction picked to peek toward the spine-equivalent side consistently in both single and double view.
- **SVG double-ruled border overlay**: ported from the reference design's `<svg>` (outer/inner rule rects, corner medallion circles+star, top/bottom diamond markers), wrapped in a `text-primary` div so all `stroke="currentColor"`/`fill="currentColor"` picks up the theme token automatically — no hardcoded hex. `viewBox` stays proportional (`preserveAspectRatio="none"`) so it stretches to whatever card size our `vh`-driven font produces (design's fixed 490×700 numbers are not reused as pixel dimensions, only as the relative rule/margin proportions).
- Existing header/text/footer content, `FONT_V1` sizing, and mark-click behavor: **unchanged**.

### 8. Files touched by `basePath`/href consumers

None — `SurahListItem`/`RubList`/`SearchQueryResults` already derive prefixes via `useReaderBasePath()` and are unaffected; they don't know about pairing.

## Files to Change

- `app/utils/quran-pages.ts` — new, `getPagePair`
- `app/types/index.ts` — add `QuranSafhaView` type
- `app/utils/storage.ts` — add `quranSafhaView` storage key
- `app/contexts/QuranSafhaViewContext.tsx` — new, mirrors `QuranFontScaleContext`
- `app/hooks/use-is-lg-up.ts` — new
- `app/components/QuranSafhaViewToggle.tsx` — new
- `app/components/reader/ReaderPage.tsx` — pair fetch, dual font-face/preload, dual href sets, renders toggle + `QuranSpread`
- `app/components/reader/QuranSpread.tsx` — new, houses the two-card layout, arrow placement, single/double show-hide logic
- `app/components/QuranSafha.tsx` — decoration replacement only; no prop/behavior changes
- `app/[locale]/layout.tsx` — mount `QuranSafhaViewProvider`

## Constraints

- No new routes/URL scheme — `/pages/[id]` and `/mushaf/[grant]/pages/[id]` keep their existing shape and `generateStaticParams`.
- Mobile (`<md`) is completely untouched — no changes to ADR 0011's mobile sizing model, no new decoration there (mobile stays edge-to-edge, no border/layers, as today).
- `md`–`lg` stays forced single-page (today's single-card sizing) — only the decoration changes there, not the toggle availability.
- Do not reduce `FONT_V1`/vh-driven font sizing to make two cards fit — per ADR 0004, reading font size is off-limits; if two cards don't fit at some `lg`-range width, accept it (out of scope for this plan to add a separate double-view font-shrink formula unless a follow-up reports real overflow).
- Single-page-mode navigation (including forced-single below `lg`) must remain exactly `pageId ± 1` — do not accidentally wire pair-stepping into single mode.
- Do not preload the pair partner's font — only the current `pageId`'s font gets `<link rel="preload">`.
- No hardcoded colors in the new SVG border/layers — everything via `currentColor` + theme token wrapper classes (`text-primary`, `bg-muted`, `border-border`).
- Applies identically to the self reader and the grant (shared-access) reader, since both go through `ReaderPage`.

## Decisions Made

- Fixed pairing `(1,2),(3,4)…(603,604)`, no singleton — confirmed with user, overriding the real-Mushaf singleton-first convention initially assumed.
- Toggle gated to `lg` (1024px+) — `md` (768px) was rejected as too cramped for two cards.
- View preference persists in `localStorage`, default `"double"` — mirrors `QuranFontScaleContext`'s pattern.
- Both pair members always fetched server-side at build time — no client-side lazy fetch, no hydration-mismatch risk, per ADR 0013.
- Existing corner-star/rounded-border decoration is fully replaced (not layered under/alongside) by the reference design's SVG-ruled border + stacked layers.
- Applies to both self and grant readers.
- Icons: `lucide-react`'s `RectangleVertical`/`BookOpen`, not the reference design's raw inline SVGs — matches `component-patterns.md`'s "lucide-react only" rule.

## What NOT to Do

- Do not introduce a `/pages/N-M` URL pattern.
- Do not fetch the pair partner's page data client-side/lazily.
- Do not preload both fonts eagerly (defeats the point of not paying for the second font on mobile/single-view sessions).
- Do not carry over the reference design's hardcoded hex theme variables (`--paper`, `--gold`, etc.) — reuse existing shadcn tokens only.
- Do not touch `QuranLine.tsx`/`QuranWord.tsx`, mark-click logic, or `FONT_V1` — this is a layout/decoration/navigation feature, not a rendering-model change.

## Addendum 2: Square corners + more visible stacked-pages layer

**Date:** 2026-07-06
**Status:** implemented

### Ask

1. Remove the rounded corners on the safha card/frame (currently `rounded-[20px]` on `md+`).
2. Make the "stacked pages underneath" layer more visible/prominent, so it clearly reads as "there are more pages before and after this one" — currently subtle (`opacity-50`/`80`, 1-2px offset).

### Approach

- **Square corners:** in `QuranSafha.tsx`, change every `rounded-[20px]` (the two stack layers + the main card) to `rounded-none`. The border-frame's own `rounded-2xl` (outer rule) and `rounded-lg` (inner rule) also become `rounded-none`, so the whole frame — card, stack layers, and rule lines — reads as consistently square-cornered. Corner medallions/diamond markers are unaffected (they're separate fixed-size icons, not clipped by the card's corner radius).
- **More visible stack:** increase both the translate offset and opacity of the two stack layers — offset goes from `translate-x-2/1` + `translate-y-1/0.5` to a clearly-steeped `translate-x-5` + `translate-y-3` (outer layer) and `translate-x-3` + `translate-y-1.5` (middle layer); both layers go from `opacity-50`/`80` to `opacity-100`.
- **Correction after browser verification:** offset/opacity alone turned out insufficient — `--muted`/`--border` are only ~3-8% lightness away from `--background`/`--card` in every theme (light: 95%→92%/90%; gold: 88%→84%/83%; dark: 9%→12%/17%), by design elsewhere in the app (low-distraction). No amount of offset/opacity makes a same-lightness shape read as prominent. Confirmed with user: keep `bg-muted` as the fill, but switch the border to `border-primary/50` — gives a clearly-colored silhouette/edge around each stacked layer without making the fill itself loud.
- **Second correction after browser verification:** the enlarged stack layer visually covered (and intercepted clicks on) the desktop nav arrows. Root cause: the stack layers are `position: absolute` while `NavigationArrow` (`QuranSpread.tsx`) has no explicit position (`static`) — per CSS stacking rules, *any* positioned element paints above static siblings regardless of DOM order, so the larger stack now painted over the arrow even though the arrow comes later in the DOM. Fixed by adding `pointer-events-none` to both stack layers (they're purely decorative, never meant to intercept clicks) and `relative z-20` to `NavigationArrow`'s `<Link>` so it explicitly stacks above.

### Files to Change

- `app/components/QuranSafha.tsx` — `rounded-[20px]` → `rounded-none` (card + 2 stack layers), border-frame `rounded-2xl`/`rounded-lg` → `rounded-none`; stack layer offset/opacity increase + `border-border` → `border-primary/50` + `pointer-events-none`.
- `app/components/reader/QuranSpread.tsx` — `NavigationArrow`'s `<Link>` gets `relative z-20` so it stacks above the now-larger, absolutely-positioned stack layers.

### Constraints

- Keep `bg-muted` as the stack layers' fill (still theme-token driven, no hardcoded colors) — only the border token changed, not the fill.
- Don't change `stackPeekSide` direction logic — only the magnitude (offset distance), opacity, and border color change.
- Stack layers must stay `pointer-events-none` — they're decorative only and must never intercept clicks meant for the nav arrows or card content.
- Mobile (`<md`) stays untouched — none of this renders below `md`.

## Addendum: Border overlap, design fidelity, and inter-card gap (bug fix)

**Date:** 2026-07-06
**Status:** implemented

### Bug

Three visual defects reported after the first implementation:
1. The border doesn't match the reference design.
2. The border overlaps the Quran text content.
3. There's an unwanted empty gap between the two safha cards in double mode.

### Root cause

All three trace back to one wrong technique: the border was implemented as a single `<svg viewBox="0 0 490 700" preserveAspectRatio="none">` absolutely positioned **on top of** (`z-10` over `z-0`) the content div, stretched non-uniformly to fill the card.

- **(#2 overlap):** the inner rule-lines are positioned as fixed *fractions* of the 490×700 box (e.g. `x=22.5` ≈ 4.6%). Our card's real aspect ratio is nothing like 490:700 — it's driven by `vh`-based font sizing (ADR 0004) and varies by page length and font scale — so those fractional insets land at different real-pixel offsets than the content's own fixed `px-7`/`py-5` padding. On many pages/scales the inner rule lands *inside* the padding, cutting across text.
- **(#1 doesn't match design):** `preserveAspectRatio="none"` non-uniformly stretches the corner medallions (circles → ellipses, stars → skewed) whenever the real card's aspect ratio diverges from 490:700, and the guilloche pattern texture band from the design was dropped for simplicity in the first pass. User confirmed exact fidelity is required, patterns included.
- **(#3 gap):** `QuranSpread.tsx` added a literal `gap-6 lg:gap-10` between the two card wrappers. Re-reading the design's actual geometry: its two page containers use `gap:0`, and each card's stacked "pages underneath" layers are anchored toward that card's **outer** edge only (away from the spine) — the top sheet is flush against the **spine-adjacent** edge with zero offset (e.g. primary/right card: top sheet at `left:0`, deeper layers offset toward `left:12px`, i.e. peeking out to the right/outer side; secondary/left card is the mirror image, top sheet flush at `right:0`, peeking out to the left/outer side). The stack never bridges the inter-card seam — the seam itself is just `gap:0`, cards touching. Our implementation added an arbitrary gap with no stack anchored to fill it, so it read as empty dead space.

### Decision: rebuild the frame as fixed-inset absolutely-positioned layers, not a stretched overlay

`docs/design/design-principles.md` already states the house convention for this exact situation: *"where the design reference shows a double border, implement it as an outer border + an absolutely-positioned inner frame (`inset-[10px] border border-primary/20 rounded-xl pointer-events-none`) rather than nested padding divs."* The first implementation's bug was never about absolute positioning itself — it was about **proportional/stretched** positioning (SVG viewBox fractions applied to a variable-aspect-ratio card). An absolutely-positioned frame using **fixed-px insets** (not viewBox-relative fractions) avoids both bugs while staying within the established convention: fixed insets can never land inside the content's own padding as long as the insets are chosen smaller than `px-7`/`py-5`, and nothing is ever non-uniformly scaled.

Per ADR 0004 (never shrink reading font size to accommodate chrome), no existing padding shrinks — the frame nests entirely inside the current `px-7`/`py-5` safe zone using shallow fixed insets, recalibrated (smaller, proportionally) from the reference design's own numbers since the design's absolute px values were calibrated for its own larger, differently-padded fixed-size card.

- **Rule lines:** 2–3 concentric `absolute inset-[Npx] border-[Wpx] border-primary[/opacity] rounded-[Rpx] pointer-events-none` divs (same mechanism as design-principles.md's example), fixed shallow insets (a few px apart, all comfortably under the `20px`/`28px` padding floor) — no SVG, no stretching.
- **Guilloche pattern band:** one additional `absolute inset-[Npx] pointer-events-none` div using CSS `border-image` (a small tileable SVG data-URI, diamond+dot motif ported from the design's `qpat` pattern, `border-image-repeat: round`) for its border — this is the standard distortion-free way to render a repeating-pattern border that adapts to any element size: tiles repeat at native size, never stretch.
- **Corner medallions + top/bottom diamond markers:** small **fixed-size** (e.g. 20×20px), non-stretched SVG icons — each its own self-contained `<svg>` with default `preserveAspectRatio`, absolutely positioned at the four corners and top/bottom-center of the frame. Exactly the technique the original (now-replaced) corner-star ornaments already used successfully (also documented in design-principles.md) — circles/stars never distort because each icon is never non-uniformly scaled.
- **Stack layers ("pages underneath"):** each `QuranSafha` instance needs to know which side is "outer" (away from the spine) so its layers peek the correct direction. Add an optional prop, e.g. `stackPeekSide?: "left" | "right"` (default `"left"` for standalone/single-page use, where there's no spine concept). `QuranSpread` passes `"right"` for the right/odd card and `"left"` for the left/even card, matching the design's mirrored geometry exactly.
- **Inter-card gap:** remove `gap-6 lg:gap-10` from `QuranSpread.tsx`'s pages-row wrapper — use `gap-0`. The two cards' spine-adjacent edges touch directly, matching a closed book.

### Files to Change (addendum)

- `app/components/QuranSafha.tsx` — replace the SVG-overlay frame with nested box-model border divs + pattern-band background-image + fixed-size corner/diamond SVG icons + `stackPeekSide` prop wired into the stack-layer offset direction.
- `app/components/reader/QuranSpread.tsx` — remove `gap-6 lg:gap-10` (→ `gap-0`); pass `stackPeekSide="right"`/`"left"` to the right/left `QuranSafha` instances respectively.

### Constraints (addendum)

- Do not reintroduce any `preserveAspectRatio="none"` stretch for shapes that must stay circular/undistorted (medallions, stars, diamonds) — those must always be fixed-size, separately positioned icons.
- New border/pattern depth is additive space around the existing `px-7`/`py-5` content padding, not carved from it — per ADR 0004, reading content area must not shrink.
- Keep everything `currentColor`/theme-token driven (`text-primary`, `border-border`, etc.) — the pattern-band background-image SVG data URI must also reference `currentColor` so it recolors per theme, not a hardcoded hex.
- Mobile (`<md`) stays untouched — none of this new frame renders below `md`, same as before.

## Addendum 3: strip the decorative frame, tighten the stack offset

**Date:** 2026-07-06

Two more visual tweaks, requested after living with the shipped Addendum 2 design:

1. **Remove the decorative frame entirely.** The double-rule border, guilloche pattern band (4 SVG pattern strips), 4 corner star medallions, and top/bottom diamond markers are all removed from `QuranSafha.tsx`. The card goes back to a plain `bg-card` surface with its existing shadow — no ornamental frame at all. User confirmed: remove everything, not just the pattern texture.
2. **Shrink the stack-layer offset.** The "stacked pages underneath" layers (the two `bg-muted`/`border-primary/50` divs behind the card) currently sit at `translate-x-5`(20px)/`translate-x-3`(12px) + `translate-y-3`(12px)/`translate-y-1.5`(6px). User chose the "tiny" option: shrink to `translate-x-1`(4px)/`translate-x-0.5`(2px) + `translate-y-0.5`(2px)/`translate-y-px`(1px) — just enough to read as pages underneath, no longer a wide fan-out.

   **Correction (same day, after living with "tiny"):** too tight. Bumped up to the "small" option: `translate-x-2`(8px)/`translate-x-1`(4px) + `translate-y-1`(4px)/`translate-y-0.5`(2px).
3. **No border on the stack layers.** Drop `border border-primary/50` from both stack-layer divs (added in Addendum 2 to fix contrast) — with the offset now tiny, a border would read as a hard outline poking out rather than a soft page-underneath. Fill (`bg-muted`) + the card's own shadow is enough to read as depth at this smaller offset.

   **Correction (same day, after living with borderless):** the borderless layers read as a drop shadow, not distinct stacked pages. Root cause: `bg-muted` sits close in lightness to `bg-card`/`background` in every theme (light: 92% vs. 100%/95%; dark: 12% vs. 15%/9%), so with no defined edge, the fill just blurs into what looks like the card's own shadow. Fix: add back a 1px border, but the theme's neutral `border-border` token (not the bolder `border-primary/50` from Addendum 2) — just enough to give the layer a crisp edge without reading as a bold outline.

### Files to Change

- `app/components/QuranSafha.tsx` — delete the double-rule border divs, the 4-strip guilloche pattern SVG block (and its now-unused `patternId = useId()`), the 4 corner medallion SVG divs, and the top/bottom diamond marker divs. Reduce the stack-layer `translate-x`/`translate-y` utility values per above, and remove `border border-primary/50` from both stack-layer divs (keep `bg-muted`/`opacity-100`/`pointer-events-none`).

### Constraints

- Do not touch the inner content padding (`px-3 py-3 md:px-7 md:py-5`), header/footer rules, or word-selection/mark behavior — this is a pure decoration-removal + offset tweak.
- Keep `stackPeekSide` prop and its left/right direction logic — only the magnitude of the offset shrinks, the peek-direction mechanism is unchanged.
- Card must still read as a card post-removal (background + shadow retained) — this is not a plan to make the card borderless/invisible.

## Addendum 4: border contrast fix + single-view peek symmetry

**Date:** 2026-07-06

Two more bugs found after living with Addendum 3's borderless-then-`border-border` stack layers, both confirmed via live Playwright screenshots + pixel sampling:

**Bug 1 — stack layer still reads as a shadow in light/gold themes.** `border-border` is a low-contrast token by design (meant for subtle dividers), and stays close in lightness to `bg-card`/`background` in light (90% vs. 95-100%) and gold (83% vs. 88-97%) — confirmed via screenshot, the edge is essentially invisible in both. It only worked in dark theme because dark's overall lightness range compresses differently. `muted-foreground` (already used elsewhere for secondary text) has real contrast against card/background in every theme by design (light 40% vs. 95-100%; gold 31% vs. 88-97%; dark 59% vs. 9-15%). Fix: swap the stack layers' border to `border-muted-foreground/30`.

**Bug 2 — stack layer crowds one nav arrow more than the other, but only in single-page view.** Traced via Playwright: in **double view**, pixel-sampling both card edges confirmed the layout is actually symmetric (~18-19px gap to each arrow on both sides) — the `stackPeekSide="right"`/`"left"` split between the right/left cards is correct there. The real bug is in **single-page view** (including forced-single below `lg`): `QuranSpread` always renders both pair members and only toggles visibility via CSS, so the visible single card keeps whatever `stackPeekSide` it was assigned for its double-view pair role — an odd (right) page's stack always peeks toward its right edge, an even (left) page's always peeks left, regardless of whether double view is even active. Screenshot of `/en/pages/3` in single view confirmed: the stack is only visible on the card's right edge, crowding the next-arrow side while the prev-arrow side is clean. Since single view has no book spine to peek away from, this reads as arbitrary (depends on odd/even page) rather than intentional.

Fix: `QuranSpread` computes `isSpreadActive` already. Pass `stackPeekSide="both"` (new value) to both `QuranSafha` instances when `!isSpreadActive`, and keep `"right"`/`"left"` only when `isSpreadActive`. `QuranSafha` renders its stack layers on both sides symmetrically when `stackPeekSide === "both"` (four layer divs — two depths × two sides — instead of two).

### Files to Change

- `app/components/QuranSafha.tsx` — widen `stackPeekSide` prop type to `"left" | "right" | "both"`; swap `border-border` → `border-muted-foreground/30` on both stack-layer divs; when `stackPeekSide === "both"`, render the stack-layer pair on both sides (4 divs total: 2 depths × left+right) instead of one side.
- `app/components/reader/QuranSpread.tsx` — change the two `stackPeekSide` props from static `"right"`/`"left"` to `isSpreadActive ? "right" : "both"` / `isSpreadActive ? "left" : "both"`.

### Constraints

- Do not change the offset magnitude (`translate-x-2/1` + `translate-y-1/0.5`) from Addendum 3 — this addendum only changes border color and adds the "both" peek mode, not how far layers sit.
- The "both" mode must stay visually as subtle as a single-side peek — same per-side magnitude, just mirrored, not doubled in intensity.
- Double view (`isSpreadActive` true) keeps the existing `"right"`/`"left"` behavior unchanged — this only affects single/forced-single view.

## Addendum 5: revert "both" peek, fix fill color per theme

**Date:** 2026-07-06

Two corrections to Addendum 4, before it was even verified live:

**1. Revert `stackPeekSide="both"` entirely.** User clarified the peek direction in single-page view was never a bug — it's an intentional indicator of whether the current page is the left or right half of its pair, even when viewed alone. `QuranSpread` goes back to always passing static `"right"` (rightPage) / `"left"` (leftPage), regardless of `isSpreadActive`. Since `"both"` is no longer used anywhere, remove it from `QuranSafha`'s `stackPeekSide` type and rendering logic entirely (no dead code/unused mode).

**2. Fill color: white in light/gold, keep bg-muted in dark.** User liked the stack layers best when their fill was a full-opacity white in the light and gold themes; the current `bg-muted` fill in dark theme was already praised ("looks great in dark mode") and stays as-is. Since `darkMode` is class-based (`darkMode: ["class"]` in `tailwind.config`) and only the dark theme adds a `.dark` class alongside `.theme-dark` (confirmed in `globals.css`: `.theme-dark.dark` selector; `.theme-light`/`.theme-gold` never get `.dark`), `bg-card dark:bg-muted` cleanly targets light+gold vs. dark without any new token or JS branching — `bg-card` is white (100% lightness) in light theme and near-white (97%) in gold theme, matching what the user asked for, while `dark:bg-muted` preserves the exact fill already approved for dark.

### Files to Change

- `app/components/QuranSafha.tsx` — remove `"both"` from `stackPeekSide`'s type union and collapse the two conditional-render blocks back into the original two-div structure (peek fixed to whichever single side `stackPeekSide` says); change `bg-muted` → `bg-card dark:bg-muted` on both stack-layer divs.
- `app/components/reader/QuranSpread.tsx` — revert `stackPeekSide={isSpreadActive ? "right" : "both"}` / `{isSpreadActive ? "left" : "both"}` back to static `stackPeekSide="right"` / `stackPeekSide="left"`.

### Constraints

- Do not reintroduce a "both" mode or any spread-state-conditional peek direction — the peek side is purely a function of pair position (right/odd vs. left/even), never of view mode.
- Border stays `border-muted-foreground/30` from Addendum 4 — only the fill token changes here, not the edge.
- Do not touch the offset magnitude from Addendum 3.

## Addendum 6: equalize nav-arrow gap in single-page view

**Date:** 2026-07-06

Confirmed via user screenshot (dark theme, single view, page 7 — a left/even page, stack peeking left): the arrow on the stack's side sits visibly closer to the card than the arrow on the clean side. The stack peek direction itself is correct and intentional (Addendum 5 — it's a left/right-page indicator, not spread-state-dependent), so the fix must equalize the *gap*, not change which side peeks.

**Root cause:** the stack layers are `position: absolute` (out of the parent's layout flow), so they never affect the parent flex item's box size — only their visual bleed beyond that box changes on whichever side they translate toward. The outer stack layer sits at `translate-x-2` (8px) + a 1px border ≈ 9px of protrusion beyond the card's edge on the peek side only; the opposite side has zero protrusion, so its gap to the neighboring nav arrow stays full while the peek side's gap shrinks by ~9px. In double view this cancels out (both cards peek toward their own outer edge, symmetric) — it only shows up in single-page view (including forced-single below `lg`), where just one card is visible with a fixed peek side.

**Fix:** add a physical (non-logical, so it doesn't flip under RTL — translate-x is already physical) invisible margin of 9px on the side *opposite* the peek, sized to match the stack's protrusion, applied only when not in spread mode. `QuranSafha` gets a new `compensateStackGap?: boolean` prop (default `false`); when true, its card wrapper gets `md:ml-[9px]` (peek `"right"`) or `md:mr-[9px]` (peek `"left"`) — physical margin utilities, so direction is correct regardless of locale/RTL. `QuranSpread` passes `compensateStackGap={!isSpreadActive}` to both `QuranSafha` instances (harmless on whichever one is hidden).

### Files to Change

- `app/components/QuranSafha.tsx` — add `compensateStackGap?: boolean` prop; apply `md:ml-[9px]`/`md:mr-[9px]` (opposite of `stackPeekSide`) to the card's outer wrapper div (the `relative w-full md:w-auto h-[calc(100dvh-5.5rem)] md:h-auto` div) when true.
- `app/components/reader/QuranSpread.tsx` — pass `compensateStackGap={!isSpreadActive}` to both `QuranSafha` instances.

### Constraints

- Margin value (9px) must track the stack's actual protrusion (`translate-x-2` = 8px + 1px border) — if Addendum 3's offset magnitude ever changes, this value must change with it.
- Use physical `ml-`/`mr-` (not logical `ms-`/`me-`) since the peek direction itself is physical (`translate-x`, unaffected by `dir`) — using logical properties here would flip incorrectly under RTL.
- Double view (`isSpreadActive` true) must not get this margin — it's already symmetric and adding it would introduce a new asymmetry (extra dead space on one card's outer edge).
- Only applies at `md`+ (`md:ml-`/`md:mr-`), matching the stack layers themselves (`hidden md:block`) and the nav arrows (`hidden md:flex`) — mobile is untouched.

## Addendum 7: compensation margin was on the wrong side (bug fix)

**Date:** 2026-07-06

### Bug

Addendum 6's `compensateStackGap` did not equalize the nav-arrow gaps — it made the peek-side arrow *closer* to the card, not equal. Confirmed on `/en/pages/7` (a left/even page, stack peeking left, dark theme): the left arrow sits visibly nearer the card than the right one, exactly the asymmetry Addendum 6 set out to remove.

### Root cause

Addendum 6 applied the margin on the side **opposite** the peek (`stackPeekSide === "right" ? "md:ml-[9px]" : "md:mr-[9px]"`), reasoning it would "balance" the protrusion. That reasoning was wrong for this layout.

In `QuranSpread`, the prev-arrow, the cards `<div>`, and the next-arrow are the three children of a single `flex justify-center` row with **no inter-item gap**. `justify-center` distributes the row's free space **equally** into the two outer gutters, while a margin on the card is *internal* to the packed group — so a margin on one side of the card maps essentially 1:1 to the visible gap on that same side (`leftGap = mL - protrusion`, `rightGap = mR`, with the peek-side getting the extra `- protrusion`).

The stack protrudes ~9px into the gap **on the peek side** (`translate-x-2` = 8px + 1px border), shrinking that side's gap. To restore it, the reserved margin must sit on the **same** physical side as the peek so the protrusion consumes it. Putting the 9px on the opposite side instead left the peek side still short by the full 9px and added 9px of dead space on the already-fine side — a net-worse asymmetry.

### Fix

Swap the ternary so the margin lands on the same physical side as the peek:

- `stackPeekSide === "right"` → `md:mr-[9px]` (was `md:ml-[9px]`)
- `stackPeekSide === "left"` → `md:ml-[9px]` (was `md:mr-[9px]`)

Magnitude (9px) and the `compensateStackGap={!isSpreadActive}` gating are unchanged — only the side flips.

### Files to Change

- `app/components/QuranSafha.tsx` — in the card-wrapper `className`, change `stackPeekSide === "right" ? "md:ml-[9px]" : "md:mr-[9px]"` to `stackPeekSide === "right" ? "md:mr-[9px]" : "md:ml-[9px]"`.

### Constraints

- Keep using physical `ml-`/`mr-` (not logical `ms-`/`me-`) — the peek itself is physical (`translate-x`, unaffected by `dir`), so the compensation must be too. This corrects Addendum 6's "opposite side" instruction, but not its "physical, not logical" instruction — that part stays.
- Double view (`isSpreadActive` true, `compensateStackGap` false) still gets no margin — unchanged and already symmetric.
- 9px must continue to track the stack protrusion (`translate-x-2` 8px + 1px border); if Addendum 3's offset ever changes, this value follows it — same caveat as Addendum 6.

---

## Post-review fixes (round 2)

Three issues reported after the feature shipped to PR #44 (Trello #50), plus fixes for the `/review-fq-work` findings on the branch. A fourth issue reported at the same time — facing pages rendering different heights because the surah-name banner line is missing (madani layout puts the next surah's banner at the end of a surah's last page) — was diagnosed as a **data/rendering gap** (our `Word` table has no `line_type`; surah names are drawn inline at the surah's start in `QuranLine.tsx`, never as end-of-page banners), and split out to its own task, **Trello #72** (`project_surah_banner_gap` memory). It is explicitly **out of scope here** — Addenda 8–10 are layout/doc only and do not attempt to equalise or mask the banner-driven height difference.

## Addendum 8: restore md single-page vertical centering (regression)

**Date:** 2026-07-06

### Bug

On `md`-range screens (≥768px, below `lg` where the toggle is hidden and the layout is forced single-page), the safha sits at the **top** of the viewport instead of vertically centered — lots of empty space below it.

### Root cause

The `ReaderPage` rewrite (section 5 above) split the old single row wrapper into a `flex flex-col` column (to stack the `lg`-only toggle above the page row) but dropped the wrapper's height. The pre-feature wrapper was `... min-h-[calc(100dvh-3.5rem)] flex ... md:items-center py-4 ...`; the new outer column is `bg-background w-full flex flex-col items-center justify-start md:justify-center px-0 gap-2` — it has `md:justify-center` but **no height**, so the column is only as tall as its content and `justify-center` has nothing to center within. (Mobile was unaffected because the card there is a fixed `h-[calc(100dvh-5.5rem)]` and top-alignment is fine full-bleed.)

### Fix

Restore the dropped height and vertical padding on the outer `flex flex-col` wrapper (`ReaderPage.tsx`, the `bg-background w-full flex flex-col …` div): add `min-h-[calc(100dvh-3.5rem)]` and `py-4`, matching the pre-feature wrapper. `justify-start md:justify-center` then centers the toggle+row group vertically on `md`+ while leaving mobile top-aligned.

### Files to Change

- `app/components/reader/ReaderPage.tsx` — add `min-h-[calc(100dvh-3.5rem)] py-4` to the outer `bg-background w-full flex flex-col …` wrapper.

### Constraints

- Do not reintroduce these on the inner row wrapper — the column wrapper is the one that must own the height now (it holds toggle + row).
- Mobile (`<md`) must stay visually identical — the card's own `h-[calc(100dvh-5.5rem)]` and top alignment are unchanged; `min-h`/`py-4` reproduce exactly the pre-feature mobile budget (`100dvh − 56px` container − `32px` padding = `100dvh − 88px` = the card height), so no new scroll appears.
- Verify centering at `md` (e.g. 820px), and that `lg` double view still lays out correctly (toggle above, spread centered).

## Addendum 9: double-view "scale to fit width" (issue 3)

**Date:** 2026-07-06

### Bug

In double view at some `lg` widths (reported at ~1256px), the two full-size cards are wider than the viewport and the outer (right) card is **clipped** — part of it is not visible.

### Root cause

Per ADR 0004 the word font is `max(24px, X vh)` (height-driven), and per ADR 0011 a justified mushaf line is ~`14.42 × font-size` wide. So each card's **width scales with viewport height**, independent of viewport width. Two such cards + arrows + padding exceed the viewport width whenever the viewport is tall relative to its width (common on tablets around 1256px). The original plan flagged this and deferred it ("accept it… unless a follow-up reports real overflow"); this is that follow-up. User chose **scale-to-fit** (both pages always fully visible, shrinking together) over raising the double-view breakpoint or horizontal scroll.

### Approach — CSS-only width cap (no JS, no flash)

In **double view only**, cap the reading font (and its dependent vertical-rhythm vars) by a from-width budget, taking the smaller of the height-based value and the width-based value — the same width-driven technique ADR 0011 uses on mobile, applied per half-width. See ADR 0013 Addendum 3.

Mechanism:

1. **Expose the vh-based values as CSS vars** on `QuranSafha` so a stylesheet rule can cap them. Today `--fq-line-gap`/`--fq-heading-h` are set inline on `.fq-content` and the word font is a Tailwind arbitrary class (`md:text-[max(24px,Xvh)]`, safelisted per ADR 0005). Add a `--fq-word-font: max(24px, {getWordFontSizeCss})` inline var alongside them. **Keep** the existing Tailwind class and its safelist for the single-view path untouched (ADR 0005) — the var is additive, only the double-view rule consumes it.
2. **Spread-active class:** `QuranSpread` adds an `fq-spread-active` class on its container (or the cards wrapper) when `isSpreadActive` (already computed). Single view / forced-single never gets the class, so nothing changes there.
3. **globals.css double-view rule** under `@media (min-width: 1024px)`:
   - Define the width budget `--fq-dv-word-cap: calc((50vw - <chrome>px) / 14.7)` — half the viewport minus per-card chrome (half of arrows + `ps-14`/`pe-10` + inter-card seam) minus the card's `px-7` (56px) padding, over ADR 0011's `14.7` never-wrap divisor. `<chrome>` is calibrated by browser measurement (Playwright), same as ADR 0011's constants were.
   - `.fq-spread-active .fq-quran-safha { font-size: min(var(--fq-word-font), var(--fq-dv-word-cap)); }`
   - Cap the rhythm vars consistently so spacing shrinks with the font (otherwise gaps stay vh-large while text shrinks): derive them from the *capped* font, e.g. `--fq-line-gap: min(<inline vh gap>, calc(var(--fq-dv-word-cap) * 0.417))` and `--fq-heading-h` from the same cap (`2 × cap + gap`), using the `lineGapRatio`/heading formulas already in `FONT_V1`. Expose the inline vh values as vars (`--fq-line-gap`, `--fq-heading-h` already are) so the rule can `min()` against them.
4. Because font drives both width and height, the capped cards also become **shorter** than `100dvh`; the Addendum 8 `md:justify-center` centers them vertically — no extra work.

### Files to Change

- `app/components/QuranSafha.tsx` — set `--fq-word-font` (and ensure `--fq-line-gap`/`--fq-heading-h`) as inline vars usable by the double-view rule; no change to the single-view Tailwind font class or safelist.
- `app/components/reader/QuranSpread.tsx` — add `fq-spread-active` class when `isSpreadActive`.
- `app/globals.css` — add the `@media (min-width:1024px) .fq-spread-active …` block: `--fq-dv-word-cap` budget + `min()` overrides for font, line-gap, heading.

### Constraints

- **Single-page view is never touched** — it keeps `max(24px, X vh)` exactly (ADR 0004). The cap applies only under `.fq-spread-active` at `lg+`.
- No new Tailwind JIT safelist for the double-view expression (ADR 0005) — the capped size is a stylesheet `min()` on a CSS var, not a per-scale arbitrary class.
- Preserve the never-wrap invariant (ADR 0011): reuse the `14.7` divisor; the card stays `overflow-hidden` so any sub-pixel excess clips invisibly rather than wrapping.
- Calibrate `<chrome>` in-browser across the `lg`→`xl` range (verify at ~1024px, ~1256px, ~1440px, ~1920px) with Playwright pixel-sampling — both cards fully visible, no clipping, arrows still flanking symmetrically. Confirm all three themes.
- **Considered and rejected:** a JS `transform: scale()` measured via `ResizeObserver`/`useLayoutEffect`. Uniformly scales rhythm for free, but (a) the static-exported HTML paints at scale 1 first, so an overflow case flashes a clipped frame before hydration re-scales it, and (b) it would also shrink the nav arrows, which the width-budget approach leaves at full size. CSS width-cap avoids both.

### Implementation note (as built)

- `QuranSafha` exposes three **independent literal** base vars on `.fq-content` — `--fq-word-base`, `--fq-line-gap-base`, `--fq-heading-base` (each the same `max(minPx, Xvh)` expression as the effective var, **not** `var(--fq-line-gap)` — a var reference would self-cycle once the double-view rule overrides `--fq-line-gap`). The single-view Tailwind font class (`md:text-[…]`) and its ADR 0005 safelist are untouched.
- `QuranSpread` adds `fq-spread-active` on the `dir="rtl"` cards row when `isSpreadActive`.
- `globals.css` `@media (min-width:1024px)`: `.fq-spread-active { --fq-dv-word: calc((50vw - 136px) / 14.7) }`; `.fq-spread-active .fq-quran-safha { font-size: min(var(--fq-word-base), var(--fq-dv-word)) }` (beats the Tailwind class by specificity, no `!important`); `.fq-spread-active .fq-content { --fq-line-gap / --fq-heading-h: min(base, cap×0.417 / cap×2.417) !important }` (`!important` needed to beat QuranSafha's inline `--fq-line-gap`/`--fq-heading-h`). `--fq-dv-word` is undefined in single view, so nothing there changes.
- **Verified (Playwright):** md single-page centered (59/59px at 900×820); double view at 1256×1350 caps the font to 33.5px with both cards inside the viewport (was clipped); 1920×1080 leaves full size (cap not biting); single view at 1256×1180 is byte-for-byte the old base font (36.6px, `--fq-dv-word` unset); `ar` toggle aria-labels render Arabic. The `136px` chrome constant = half of (`ps-14` + `pe-10` + two arrows) + card `px-7`; slightly conservative (leaves a small gap on lighter pages), safe against clipping.

## Addendum 10: /review-fq-work finding fixes

**Date:** 2026-07-06

Fixes for the Opus branch review. (Docs findings 6 and 7 are **already applied** in this same planning pass — `DECISIONS.md` "Mushaf Double-Page Spread" now says sequential-not-`Promise.all` and describes the frame-removed final decoration, and `adr/0013` gained Addenda 2–3 correcting the same. Listed here for traceability only.)

### Finding 5 — stack-layer border contrast regression (warning)

The stack layers use `border border-muted-foreground/10` (`QuranSafha.tsx:155,158`), but Addenda 4/5, the adjacent code comment, and `COMPONENTS.md` all specify `/30`. `/10` is fainter than the `border-border` token Addendum 4 replaced *for being too low-contrast*, silently regressing that fix.

- **Fix:** `QuranSafha.tsx` — change `border-muted-foreground/10` → `border-muted-foreground/30` on both stack-layer divs. Code now matches the comment + docs. (Re-verify the layers read as distinct pages, not a shadow, in all three themes.)

### Finding 2 — toggle aria-labels hardcoded English (note)

`QuranSafhaViewToggle.tsx:26,35` hardcodes `aria-label="Single page view"` / `"Double page view"`, so screen-reader labels stay English under the `ar` locale.

- **Fix:** route both through `useTranslations` (the `@hooks/use-translations` wrapper, as `QuranSafha` does), adding `singlePageView` / `doublePageView` keys to the ar/en message catalogs (English text as the fallback default). Run `npm run extract-translations`.

### Finding 3 — pairIndex re-derivation (note)

`ReaderPage.tsx:57` computes `pairIndex = Math.ceil(pageNumber / 2)`, re-deriving the pairing `getPagePair` already did one line earlier.

- **Fix (light):** derive `pairIndex` from the already-computed `rightPageId` (`(rightPageId + 1) / 2`) so the pairing formula lives only in `getPagePair`. Cosmetic; skip if it reads worse.

### Finding 4 — JSX indentation (note)

The inner card `<div>` and its `{/* Content */}` child added in the decoration edit (`QuranSafha.tsx:160-162`, closing tags `:221-222`) were left at the old indentation under the new wrapper.

- **Fix:** re-indent the block for readability. Pure formatting, no behavior change.

### Finding 1 — SSR single→double flash (note, accepted)

`isSpreadActive` needs `useIsLgUp` (`false` until the post-hydration `useEffect`), so a `lg+` viewer whose stored preference is `double` sees a single-page first paint that flips to the spread after hydration. Inherent to not knowing viewport width server-side on a static export; **accepted, not fixed** (documented here so it isn't re-flagged).

### Files to Change (Addendum 10)

- `app/components/QuranSafha.tsx` — finding 5 (`/10`→`/30`), finding 4 (re-indent).
- `app/components/QuranSafhaViewToggle.tsx` + message catalogs — finding 2 (i18n aria-labels).
- `app/components/reader/ReaderPage.tsx` — finding 3 (derive `pairIndex` from `rightPageId`).

## Addendum 11: fix the slow-connection pre-hydration flash (finding 1, now fixed)

**Date:** 2026-07-06

Supersedes Finding 1's "accepted, not fixed" note (Addendum 10) and the `.fq-spread-active` gating from Addendum 9. See ADR 0013 Addendum 4.

### Bug

On big screens (`lg+`) with a slow connection, the toggle shows **double** selected (the default) but a **single** page is displayed until JS finishes loading/hydrating.

### Root cause

`QuranSpread` gates the entire display on `isSpreadActive = view === "double" && isLgUp`. `useIsLgUp()` returns `false` on the server and the first client paint (it only learns the real viewport in a post-hydration `useEffect` via `matchMedia`). So before hydration — the whole slow-connection window — `isSpreadActive` is `false` and the spread renders single, while the toggle (reading `view`, default `"double"`) already shows double. A naive CSS gate on a context `view` class doesn't fix it cleanly: `view` also starts `"double"` for everyone (localStorage is read in an effect), so a reader who chose **single** would then get a brief *double* flash — trading one flash for another.

### Fix — pre-paint attribute + CSS (mirror the theme flash-prevention pattern)

`app/layout.tsx`'s `<head>` already runs an inline script that reads `localStorage.theme` and sets a class on `<html>` before first paint. Do the same for the view, so the correct display is known at paint time for **both** preferences:

1. **Inline pre-paint script** (`app/layout.tsx`, alongside the theme script): read `localStorage.quranSafhaView` (JSON-stringified, e.g. `"double"`) and set `data-safha-view` on `document.documentElement` before paint; default `"double"` on null/parse-error.
2. **CSS gates** (`globals.css`), all keyed on `:root[data-safha-view="double"] .fq-spread …` inside `@media (min-width: 1024px)`:
   - **Partner-card visibility:** `.fq-spread .fq-safha-partner { display: none }`; shown (`display: block`) only under the attribute+lg gate.
   - **Width cap (Addendum 9):** move the `--fq-dv-word` / `min()` font + rhythm overrides off the JS `.fq-spread-active` class and onto `:root[data-safha-view="double"] .fq-spread …` (same declarations, new selector).
   - **Compensate margin (Addendum 7):** apply `margin-left/right: 9px` (physical, per Addendum 7) at `md+` on `.fq-compensate-l`/`.fq-compensate-r`, and *remove* it under the attribute+lg gate. So the margin is present in every single-page display and gone only when the spread actually shows both — matching the old `compensateStackGap = !isSpreadActive` behavior, now flash-free.
3. **`.fq-spread` is a static class** on `QuranSpread`'s cards row (always present), so every gate is scoped to cards *inside a spread* — the standalone `QuranSafha` in `QuranPage.tsx` (no `.fq-spread` ancestor) is untouched.
4. **`QuranSafhaViewContext.setView`** also sets `document.documentElement.dataset.safhaView = newView` (mirroring `useTheme`) so a live toggle re-drives the CSS with no reload; the init effect syncs it as well.
5. **`QuranSpread` JS simplified:** drop `isLgUp`/`isSpreadActive` from the *display* path — render the static `.fq-spread` row, mark the non-current card `.fq-safha-partner`, and pass `compensateStackGap` for both cards (now meaning "part of a spread"). Keep `useIsLgUp` for **one** thing only: choosing the nav-arrow href (`view === "double" && isLgUp ? pairStepNav : singleStepNav`).

### Residual (intentionally accepted)

- **Nav-arrow href** still depends on `useIsLgUp`, so for the pre-hydration window an arrow click on `lg+` double could step ±1 instead of ±2. Invisible (identical icon/position, only the target differs) and self-corrects on hydration.
- **Toggle highlight** reads context `view` (default `"double"`), so a single-preferrer's `lg`-only toggle pill can show double-selected for a beat before the init effect corrects it. The *page display* is already correct pre-paint via the attribute; this is just the small pill.

### Files to Change (Addendum 11)

- `app/layout.tsx` — add the `data-safha-view` pre-paint inline script in `<head>`.
- `app/contexts/QuranSafhaViewContext.tsx` — `setView` (and the init effect) set `data-safha-view` on `<html>`.
- `app/components/reader/QuranSpread.tsx` — static `.fq-spread` row; `.fq-safha-partner` on the non-current wrapper; `compensateStackGap` for both; `useIsLgUp` used only for arrow hrefs; remove the `isSpreadActive`-based `hidden` classes and the `.fq-spread-active` class.
- `app/components/QuranSafha.tsx` — replace the `compensateStackGap ? md:ml/mr` inline logic with a stable `.fq-compensate-l`/`.fq-compensate-r` class (margin now applied/removed in `globals.css`).
- `app/globals.css` — attribute+lg gates for partner visibility, the width cap (re-keyed from `.fq-spread-active`), and the compensate margin.
- `docs/architecture/DECISIONS.md` + `adr/0013` — note the display is gated by the pre-paint attribute + CSS, not JS `matchMedia` (ADR 0013 Addendum 4 already added).

### Constraints

- `QuranPage.tsx`'s standalone `QuranSafha` must be visually unchanged — verified by scoping every gate to `.fq-spread`, which it has no ancestor of.
- Keep the compensate margin **physical** (`margin-left/right`, not logical), per Addendum 7.
- Default must be `"double"` everywhere the value is read (inline script, context, attribute) so they never disagree at first paint.
- Verify with Playwright, ideally with JS disabled or throttled: `lg` + default → double at first paint; `lg` + stored `"single"` → single at first paint (no double flash); `<lg` → single regardless; live toggling still flips display + width cap; `QuranPage` (if reachable) unaffected.

## Addendum 12: fix Quran line word order reversed in English locale (bug)

**Date:** 2026-07-06

### Bug

In the English locale, words within each Quran line are rendered left-to-right (reversed) instead of right-to-left.

### Root Cause

`QuranSpread.tsx` puts a hardcoded `dir="rtl"` on the `.fq-spread` cards container (line 87). This was intended to make the first DOM child (rightPage) appear visually on the right in a flex row. However, the attribute leaks down through `QuranSafha` into `QuranLine`, changing each line's inherited direction context.

`QuranLine.tsx:56-58` computes flex direction from the **locale**, not from the DOM direction:
- `ar` locale → `flex-row` (correct in a `dir="rtl"` context, first word ends up on the right)
- `en` locale → `flex-row-reverse` (correct in a `dir="ltr"` context, first word ends up on the right)

In the main branch (before this feature), neither `ReaderPage` nor the old single-card layout set any `dir` attribute — the Quran content inherited `dir` solely from `<html>`. The `en` locale page had `dir="ltr"`, so `flex-row-reverse` correctly placed the first word on the right. With `dir="rtl"` injected by the spread container, the `en` locale now inherits `dir="rtl"`, which reverses `flex-row-reverse`'s effect: first word ends up on the left.

### Fix

Remove `dir="rtl"` from the spread container and instead conditionally apply `flex-row-reverse` based on the `isRTL` prop (already available in scope):

```tsx
<div className={`flex ${!isRTL ? "flex-row-reverse" : ""} items-stretch gap-0 fq-spread`}>
```

This achieves the same visual page ordering in both locales without changing the inherited direction context for children:

- `ar` locale (`isRTL=true`): no `flex-row-reverse`, inherits `dir="rtl"` from `<html>` → `QuranLine` uses `flex-row` in RTL context → first word on right ✓
- `en` locale (`isRTL=false`): `flex-row-reverse`, inherits `dir="ltr"` from `<html>` → `QuranLine` uses `flex-row-reverse` in LTR context → first word on right ✓

In both cases, rightPage (first DOM child) ends up visually on the right.

### Files to Change

- `app/components/reader/QuranSpread.tsx` — replace `dir="rtl"` with `className={...isRTL ? "" : "flex-row-reverse"...}` on the `.fq-spread` div.

### Constraints

- Do not touch `QuranLine.tsx`, `QuranSafha.tsx`, or the globals.css spread rules — the fix is entirely in `QuranSpread.tsx`.
- No `dir` attribute of any kind on the spread container — children must inherit from `<html>` only.
- The `NavigationArrow` components sit in the outer `flex justify-center` row (sibling of the spread div), not inside it — they are unaffected by this change.

**Implementation status:** implemented; `npm run lint` + `tsc --noEmit` clean. Browser verification was **skipped at the user's request** — correctness rests on the mechanism (display driven solely by the synchronous pre-paint `html[data-safha-view]` attribute + CSS `@media` gate, no React/`matchMedia` in the display path) rather than an observed run. Worth a manual look on a throttled connection before merge: confirm no single→double or double→single flash at `lg` for either stored preference, and that `<lg` stays single.
