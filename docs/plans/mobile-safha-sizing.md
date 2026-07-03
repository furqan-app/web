# Mobile Safha: Full-Screen Sizing (Width-Driven Font + Flexbox Fill)

**Type:** feature
**Date:** 2026-07-03
**Status:** implemented

## Summary

On mobile (`<md`), the Quran page reads like a physical mushaf: the Safha card fills the full viewport edge-to-edge (no border/rounded corners/shadow/decorative ornaments — those stay `md:`-only), the reading font is fixed and derived from screen width (not user-scalable on mobile), and the 15-line budget fills all available height via flexbox distribution rather than a computed slot formula. Navigation is swipe-based with the desktop arrow buttons hidden. The font-scale controls in Settings are hidden on mobile since they have no effect there.

This is the third and final iteration of mobile sizing (see History below); the first two approaches were tried and abandoned in the same session. See [ADR 0011](../architecture/adr/0011-mobile-quran-font-scale-vw-formula.md) for the full decision record.

## Approach

### Font size: derived from line width, not viewport height

Every line in a mushaf page justifies to the same width. The worst-case line-width/font-size ratio measured across all 604 pages is `14.42` (range 14.13–14.42; page 580 is worst). Dividing viewport width by `14.7` (leaving ~2% margin over the worst case) gives a font size guaranteed to fill the width without overflow:

```css
--fq-mobile-font: calc((100vw - 24px) / 14.7);
```

`24px` = `px-3` padding on both sides of `.fq-content`; recalibrate if that padding changes. `14.7` is the only calibrated number in the whole system — revisit only if a future page font's justified width ratio exceeds its margin.

### Height: distributed by flexbox, not a slot budget

`.fq-quran-safha` is a full-height flex column (`flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; justify-content: space-between`). The browser turns leftover vertical space into even inter-line gaps automatically — no `dvh`/nav/padding accounting, no slot-budget multiplier, no per-font line-height constant. `--fq-line-gap: 0 !important` on mobile (space-between is the sole source of inter-line spacing; per-row `margin-bottom` is zeroed via `.fq-quran-safha > * { margin-bottom: 0 !important }`).

Two backstops:
- **Never-wrap.** `.fq-quran-safha > div { flex-wrap: nowrap }` and `.fq-quran-safha > div > div { flex-shrink: 0; white-space: nowrap }` — a hair of cross-device rendering overflow clips invisibly (card is `overflow-hidden`) instead of dropping a word to a second row.
- **Breathing room.** `.fq-quran-safha` gets `padding-block: 0.5em` (resolves against the mobile font-size, so it scales with text) so the first/last line don't butt against the header rule / footer band.

**Pages 1–2** (far fewer than 15 lines) get `justify-content: center; gap: 0.55em` via the `fq-safha-center` class (added when `page <= 2`) instead of stretching to the edges.

`--fq-heading-h: calc(var(--fq-mobile-font) * 2.4) !important` — the surah glyph + Bismillah internal block sizes off this.

### Layout: card fills full width, chrome removed

- Page container: `px-0 md:ps-14 md:pe-10`, `items-start md:items-center`, `gap-0 md:gap-8`.
- `QuranSafha` card: `w-full md:w-auto`, `h-[calc(100dvh-5.5rem)] md:h-auto` (`5.5rem` = nav `3.5rem` + page `py-4` top+bottom `2rem`), inner padding `px-3 py-3 md:px-7 md:py-5`.
- Card chrome — `rounded-none md:rounded-[20px]`, `md:border md:border-border`, `md:shadow-[...]` — border/rounding/shadow are desktop-only. The inner decorative accent frame and all four corner star ornaments get `hidden md:block`. The card becomes a flat, edge-to-edge reading surface on mobile; desktop chrome is unchanged.

### Navigation: swipe on mobile, arrows hidden

`NavigationArrow` gets `hidden md:flex`. A `"use client"` wrapper component, `QuranSwipeNav` (renamed from `QuranPageShell` — see Code Review Fixes addendum below), wraps the (server-rendered) page children and handles `touchstart`/`touchend`: tracks X/Y deltas, navigates via `useRouter().push()` when horizontal delta ≥ 50px and exceeds vertical delta. It receives pre-resolved `prevHref`/`nextHref` strings from the server component — it does not fetch data, so static generation is unaffected.

(Swipe **direction** mapping — swipe right always means next page, regardless of locale — was fixed separately; see `docs/plans/fix-mobile-swipe-direction.md`, out of scope for this doc.)

### Settings: font-scale controls hidden on mobile

In `SettingsSidebar.tsx`, the `QuranFontScaleControls` section is wrapped in `hidden md:block` — it has no effect on mobile since mobile font size is not user-scalable.

## Files Changed

- `app/globals.css` — mobile `@media (max-width: 767px)` block: `--fq-mobile-font`, `--fq-line-gap`, `--fq-heading-h`, `.fq-quran-safha` flex/space-between rules, never-wrap backstop, `fq-safha-center`.
- `app/components/QuranSafha.tsx` — card chrome classes (`rounded-none md:rounded-[20px]`, `md:border`, `md:shadow-[...]`, `hidden md:block` on ornaments), `w-full md:w-auto`, `h-[calc(100dvh-5.5rem)] md:h-auto`, `fq-content`/`fq-quran-safha` classes, `fq-safha-center` on pages ≤ 2, header grid (`grid-cols-[1fr_auto_1fr] md:grid-cols-3`, `whitespace-nowrap`) so juz/hizb labels never wrap.
- `app/[locale]/pages/[id]/page.tsx` — page container spacing, `NavigationArrow` `hidden md:flex`, `QuranSwipeNav` wrapper.
- `app/components/QuranSwipeNav.tsx` (originally `QuranPageShell.tsx`, renamed — see Code Review Fixes addendum) — client component, swipe touch handling.
- `app/components/SettingsSidebar.tsx` — `hidden md:block` around font-scale controls.
- `app/constants/font.ts` — unchanged; the abandoned mobile `vw`-scale formula (`baseMobileVw`/`getMobileWordFontSizeCss`) was never added here. `FONT_V1` stays desktop-only.

## Constraints

- Mobile-only. The desktop `md:` font class and inline `--fq-line-gap`/`--fq-heading-h` desktop styles are untouched — they still drive `md`+.
- `14.7` is the single calibrated constant. Revisit only if a future page font's justified width/font-size ratio exceeds it (re-measure across pages). Do not "tune" it for one page.
- `24px` in the width formula = `px-3` padding on both sides of `.fq-content`. If that padding changes, update the `24px`.
- Do not reintroduce per-line `margin-bottom` on mobile — it double-counts against `space-between`.
- Do not resurrect a `dvh`-minus-chrome or slot-budget formula, or a per-font line-height constant — the whole point of this design is to not need them.
- Do not make lines fill width by stretching (`justify`/`stretch` on rows) — width is set by font-size alone; stretching would distort the mushaf justification.
- Font size tracks screen width, not height — not user-adjustable on mobile; Settings font-scale section stays `hidden md:block`.

## History (abandoned approaches)

Two earlier approaches were implemented and then superseded within the same session, before this one:

1. **vw-per-scale** (`fix-mobile-font-scale.md`, now deleted) — extended the original hardcoded `text-[4.4vw]` into a scale-aware formula so the Settings font-scale slider would work on mobile like it does on desktop. Abandoned when full-screen mobile design (this doc) made mobile font non-user-scalable by design.
2. **dvh budget formula** (`mobile-safha-dvh-font.md`, now deleted) — derived font/line-gap/heading-block from `calc((100dvh - 170px) / 22.089)`, mirroring the desktop ADR 0004 budget model. Abandoned because the opaque `170px`/`22.089` constants needed hand-updating on any padding change, and the formula didn't actually fill height on typical tall phones (the width term always won, leaving empty space below a centered block).

Full rationale for all three options (including the two above) and why width-driven-flex-fill won is in [ADR 0011](../architecture/adr/0011-mobile-quran-font-scale-vw-formula.md).

## Verification

Browser-verified at 390×844: page 100 all 15 rows equal height (no wrap), first line full width, header single-row, 0 horizontal overflow, 12px symmetric header/footer gaps; page 1 centered. Spot-checked page 580 (worst width ratio) for horizontal fit.

## Addendum: Font cap for tablet-width portrait viewports

**Date:** 2026-07-03
**Status:** implemented

### Bug

Reported on a Huawei MatePad 11.5: Arabic text renders far too large, lines feel cramped. The tablet's physical resolution is 2200×1440 at DPR 2, so in portrait its CSS viewport width is ~720px — under the 768px `md` breakpoint, so it gets the mobile edge-to-edge layout, not the desktop card.

### Root Cause

`--fq-mobile-font: calc((100vw - 24px) / 14.7)` (`app/globals.css:134`) has no upper bound. It was calibrated against phone widths (~375–430px, yielding ~24–28px), but any sub-768px viewport uses the same formula. At ~720px it computes to ~47px — roughly double the intended size — because "phone width" and "anything under the `md` breakpoint" are not the same set of devices, and tablets in portrait fall in the gap.

### Decision: cap the formula, don't move the breakpoint

Keep the mobile edge-to-edge layout (no card/border/ornaments, swipe nav, non-scalable font) for all sub-768px widths — moving the breakpoint would require re-verifying the ADR 0004 card-fit budget at tablet widths and was rejected as a bigger change than the bug warrants. Instead, cap the width-driven formula at the value it produces for the widest common phone (~430px CSS width, e.g. iPhone Pro Max): `(430 - 24) / 14.7 ≈ 27.6px`, rounded to **28px**.

```css
--fq-mobile-font: min(calc((100vw - 24px) / 14.7), 28px);
```

Below ~436px viewport width the formula behaves exactly as before (unchanged on real phones); above it, font size is flat at 28px instead of continuing to grow. On tablet-width portrait viewports the justified line no longer touches both edges of the card — accepted, since the alternative (unbounded growth) is the bug being fixed. Vertical fill is unaffected: `justify-content: space-between` still distributes leftover height across lines regardless of font size, so tablets just get larger inter-line gaps at the same (capped) font size.

**Centering the now-narrower lines.** Each row `div` (`QuranLine.tsx`) has no explicit width, so under `.fq-quran-safha`'s default `align-items: stretch` it stretches to the full container width, while its words pack toward the RTL start edge (`justify-content: flex-start` on the row). On phones this is invisible (calibrated font already fills ~98% of the width), but once the cap holds the font below what the container width would otherwise call for, the words render narrower than the stretched row and — without a fix — hug one edge with a blank gap on the other. `align-items: center` on `.fq-quran-safha` stops the row from stretching (it shrink-wraps to its content) and centers it instead, so the capped-width gap is split evenly left/right rather than dumped on one side.

```css
.fq-quran-safha {
  ...
  justify-content: space-between;
  align-items: center;
  ...
}
```

No effect on phones (rows already span ~full width, centering a ~2% margin is imperceptible); on tablets it turns a lopsided line into a centered one.

### Files to Change

- `app/globals.css` — line 134: wrap the existing formula in `min(..., 28px)`. Also fix the stale `See ADR 0013` reference in the comment above it (line 133) to `See ADR 0011` — a leftover from the since-reverted ADR 0012/0013 consolidation (`docs/plans/consolidate-mobile-safha-docs.md`). Line 148: `align-items: center` on `.fq-quran-safha`.
- `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md` — add the cap and the centering fix to the Decision/Consequences of Option C (it changes the shipped formula, not just this plan doc).
- `docs/architecture/DECISIONS.md` — line 225: mention the 28px cap and centering alongside the existing width-driven-font sentence.

### Constraints

- Do not move the `md` breakpoint as a fix for this — out of scope, bigger change, needs separate ADR 0004 re-verification.
- 28px is derived from ~430px widest-common-phone width via the existing 14.7 divisor — if that divisor is ever recalibrated (per the existing constraint above), recompute the cap too.
- Rows must not gain an explicit `width: 100%` as a "fix" for anything else — that would defeat `align-items: center`'s shrink-to-fit behavior and reintroduce the edge-hugging gap on capped (tablet) viewports.

## Addendum 2: Code Review Fixes (/review-fq-work findings)

**Date:** 2026-07-03
**Status:** implemented

### Findings addressed

1. **Swipe navigation flipped by UI locale** — the most significant finding; see `docs/plans/fix-mobile-swipe-direction.md`'s own Code Review Fixes addendum for the full root cause and fix (swipe now uses plain `pageId ± 1` hrefs computed in `page.tsx`, independent of the desktop arrows' locale-flipped `getNavigationHref`).
2. **`QuranSafha.tsx` mobile header grid track sizing** — `grid-cols-[1fr_auto_1fr]`'s `1fr` tracks default to an `auto` (min-content) floor, so combined with the `whitespace-nowrap` juz/hizb labels, a long label (e.g. "ثلاث أرباع الحزب") on a narrow phone could grow its track past its third and push the centered surah glyph off-center. **Fix:** changed to `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`, matching the desktop `grid-cols-3` (Tailwind's `1fr` is `minmax(0,1fr)`) so each side track is capped to its fair share regardless of label length.
3. **Never-wrap CSS selectors coupled to DOM depth** — `.fq-quran-safha > div` / `> div > div` were meant to target word rows and words, but `QuranLine` returns a fragment, so on surah-opening pages the `.text-center` heading block (and its bismillah wrapper) are also direct children matched by the same selectors — harmless today, but fragile to future `QuranLine`/`QuranWord` markup changes. **Fix:** added an explicit `fq-safha-row` class to the word-row `div` in `QuranLine.tsx`; `globals.css` selectors now target `.fq-quran-safha > .fq-safha-row` / `> .fq-safha-row > div` instead of positional children.
4. **`QuranPageShell` naming** — the name suggested a general layout wrapper, but its sole responsibility is swipe-gesture handling. **Fix:** renamed to `QuranSwipeNav` (file and component); all references updated (`page.tsx`, `docs/architecture/COMPONENTS.md`, ADR 0011, this file — see above).
5. **Double space in className** (`QuranSafha.tsx`, `fq-full-safha` div) — cosmetic, fixed.

### Files Changed

- `app/components/QuranPageShell.tsx` → `app/components/QuranSwipeNav.tsx` — renamed.
- `app/[locale]/pages/[id]/page.tsx` — locale-independent `nextPageId`/`prevPageId` for swipe; `QuranSwipeNav` rename.
- `app/components/QuranSafha.tsx` — `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`; double-space fix.
- `app/components/QuranLine.tsx` — added `fq-safha-row` class to the word-row `div`.
- `app/globals.css` — never-wrap selectors now scoped to `.fq-safha-row`.
- `docs/architecture/COMPONENTS.md`, `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md` — rename + prop references updated.
- `docs/plans/fix-mobile-swipe-direction.md` — own addendum with full root-cause correction for finding 1.

### Constraints

- Do not reintroduce a positional (`> div`) never-wrap selector — use `.fq-safha-row` so future markup changes in `QuranLine`/`QuranWord` (e.g. wrapping the row in another element) don't silently widen what the selector matches.
- Do not reuse `getNavigationHref` for any future gesture/keyboard navigation — it is coupled to the desktop arrows' visual-flip logic, not plain page order (see `fix-mobile-swipe-direction.md`).

## Addendum 3: vh/dvh mismatch causing scroll on real mobile devices

**Date:** 2026-07-03
**Status:** implemented

### Bug

Reported: on real phones/tablets, the mobile Quran reader shows a vertical scrollbar for most screens, worse on shorter screens. Not reproducible in Chrome DevTools' device toolbar emulation.

### Root Cause

`app/[locale]/pages/[id]/page.tsx:99` sizes the page wrapper with `min-h-[calc(100vh-3.5rem)]`, while the card it wraps (`app/components/QuranSafha.tsx:104`) sizes with `h-[calc(100dvh-5.5rem)]`. These are not the same unit: `100vh` resolves to the *largest possible* viewport (as if a collapsible browser toolbar were already hidden), while `100dvh` tracks the *currently visible* viewport, which is shorter whenever the toolbar is showing (e.g. on load, before any scroll). The wrapper's `vh`-based min-height forces the page to be at least as tall as the largest-possible viewport — taller than what's actually visible on a real device with its toolbar showing — producing a vertical scrollbar. Chrome DevTools' device toolbar doesn't simulate a real dynamic toolbar, so `vh` and `dvh` are numerically identical there and the bug never reproduces in emulation.

Grepped the codebase for all `vh`/`dvh` usages (`100vh`, `100dvh`, `100svh`, `100lvh`) — this is the only mismatch. (`VerticalQuranPages.tsx`'s `h-[calc(100vh-3.5rem)]` is the separate infinite-scroll vertical reader page, where scrolling is the intended UX — out of scope.)

### Fix

Change the wrapper to use the same `dvh` unit as the card it contains:

```tsx
// app/[locale]/pages/[id]/page.tsx:99
<div className="bg-background w-full min-h-[calc(100dvh-3.5rem)] flex justify-center items-start md:items-center py-4 px-0 md:ps-14 md:pe-10 gap-0 md:gap-8">
```

No other change needed — the wrapper is `min-height`, not a fixed height, and the card inside already correctly tracks `dvh`; this just makes the two consistent so the outer box never demands more height than is actually visible.

### Files to Change

- `app/[locale]/pages/[id]/page.tsx` — line 99: `min-h-[calc(100vh-3.5rem)]` → `min-h-[calc(100dvh-3.5rem)]`.

### Constraints

- Do not change `VerticalQuranPages.tsx`'s `100vh` usage — that page is an intentionally-scrolling reader, unrelated to this bug.
- Any future fixed/min height added to this page wrapper or the Safha card must use `dvh`, not `vh`, to stay consistent — a `vh`/`dvh` mix on the same visual box is exactly this bug.
- Extremely short viewports (already an accepted edge case per ADR 0011/ADR 0006, e.g. DevTools docked open) may still show a few px of scroll — out of scope for this fix, which addresses the common real-device case, not that floor.
