# Mushaf Double-Page Spread Toggle

**Type:** feature
**Date:** 2026-07-06
**Status:** implemented

## Summary

Add a single/double page toggle to the mushaf reader (`lg`/1024px+ only) so a user can view two facing pages side by side. Pages pair in fixed pairs — `(1,2),(3,4)…(603,604)`. Mobile (`<md`) and `md`–`lg` stay forced single-page. See [ADR 0013](../architecture/adr/0013-mushaf-double-page-spread.md) for the pairing/data-fetch/decoration decisions.

## Approach

### 1. Pairing math

```ts
export function getPagePair(page: number): { rightPage: number; leftPage: number } {
  const pairIndex = Math.ceil(page / 2);
  return { rightPage: pairIndex * 2 - 1, leftPage: pairIndex * 2 };
}
```

`rightPage` is always odd (RTL right side), `leftPage` always even.

### 2. View-mode context

- `app/types/index.ts`: `export type QuranSafhaView = "single" | "double";`
- `app/utils/storage.ts`: add `quranSafhaView: QuranSafhaView`.
- `app/contexts/QuranSafhaViewContext.tsx` (new): `useState` seeded from `storage.get("quranSafhaView")` in a `useEffect` (SSR-safe), default `"double"`. `setView` also sets `document.documentElement.dataset.safhaView = newView` (mirrors `useTheme`).
- Mount in `app/[locale]/layout.tsx`.

### 3. Pre-paint flash prevention (mirrors theme pattern)

`app/layout.tsx` `<head>` inline script reads `localStorage.quranSafhaView` and sets `data-safha-view` on `document.documentElement` before first paint, default `"double"` on null/parse-error. `<html>` gets `suppressHydrationWarning` (both inline scripts mutate `documentElement` before hydration; `<body>` already had it).

CSS gates in `globals.css` under `@media (min-width: 1024px)`, keyed on `:root[data-safha-view="double"] .fq-spread`:
- **Partner-card visibility:** `.fq-spread .fq-safha-partner { display: none }` by default; `display: block` only under attribute+lg gate.
- **Width cap:** `--fq-dv-word` and `min()` font/rhythm overrides scoped to the same selector (see §9).
- **Compensate margin:** `.fq-compensate-l`/`.fq-compensate-r` get `margin-left/right: 9px` at `md+` normally; removed under the attribute+lg gate (so margin is present in every single-page display, gone only when spread shows both cards).

### 4. Toggle control — `QuranSafhaViewToggle.tsx`

Pill (`flex gap-0.5 p-1 rounded-xl border border-border bg-card`) with two icon buttons (`RectangleVertical`/`BookOpen` from `lucide-react`). Active button: `bg-accent text-primary`; inactive: `text-muted-foreground`. Wrapped in `hidden lg:flex`. i18n aria-labels via `useTranslations` — `singlePageView`/`doublePageView` keys.

### 5. `ReaderPage.tsx`

- Compute `{ rightPage, leftPage } = getPagePair(Number(pageId))`.
- Fetch both **sequentially** (`await getPageWords(rightPage)` then `await getPageWords(leftPage)`) — `Promise.all` doubles peak concurrent DB connections per static-generation worker, exceeding `max_connections=151` during a full 604-page build.
- Inline both pages' `@font-face` blocks. Only `pageId`'s font gets `<link rel="preload">`.
- Compute single-step hrefs (`pageId ± 1`) and pair-step hrefs (neighbor pair's `rightPage`).
- Render `QuranSafhaViewToggle` above the row and `QuranSpread`.

### 6. `QuranSpread.tsx`

- Renders static `.fq-spread` row (always present). Non-current card gets `.fq-safha-partner` for CSS hide/show.
- Spread container: `className={`flex ${!isRTL ? "flex-row-reverse" : ""} items-stretch gap-0 fq-spread`}` — no `dir` attribute (would leak into `QuranLine` direction; `en` locale needs inherited `dir="ltr"` from `<html>` for `flex-row-reverse` to work correctly).
- `useIsLgUp()` used **only** for choosing nav-arrow hrefs: `view === "double" && isLgUp ? pairStepNav : singleStepNav`.
- Both `QuranSafha` instances always get `compensateStackGap` (CSS classes `.fq-compensate-l`/`.fq-compensate-r`).
- Pass `stackPeekSide="right"` to rightPage, `"left"` to leftPage — always static, never spread-state-dependent.

### 7. `QuranSafha.tsx` decoration

No ornamental frame. Stack layers (two `bg-card dark:bg-muted border border-muted-foreground/30 pointer-events-none` divs) at `translate-x-2/translate-x-1 + translate-y-1/translate-y-0.5`, peeking toward `stackPeekSide`. The `.fq-compensate-l`/`.fq-compensate-r` class applies a physical 9px margin on the **same** side as the peek (not the opposite side — compensates for the stack's ~9px protrusion into the arrow gap; `translate-x-2` = 8px + 1px border).

Use physical `ml-`/`mr-` (not logical `ms-`/`me-`) since `translate-x` is physical and unaffected by `dir`.

Stack layers: `hidden md:block`, always `pointer-events-none`. `NavigationArrow`'s `<Link>` gets `relative z-20` to stack above the absolutely-positioned layers.

### 8. Nav hrefs

- Single-step: `pageId ± 1` (unchanged for single/forced-single).
- Pair-step: neighbor pair's `rightPage` (odd id), clamped at 1/604.
- `QuranSwipeNav` always uses single-step (swipe stays page-by-page even in double mode).

### 9. Double-view width cap

In double view, each card's width scales with viewport height (ADR 0004: `max(24px, Xvh)`), so two cards can exceed viewport width at some `lg` widths.

`QuranSafha` exposes three independent literal base vars on `.fq-content`:
- `--fq-word-base: max(minPx, Xvh)` (same expression as the Tailwind class — not `var()` to avoid self-cycle)
- `--fq-line-gap-base`, `--fq-heading-base`

`globals.css` under `@media (min-width:1024px)`, scoped to `:root[data-safha-view="double"] .fq-spread`:
```css
--fq-dv-word: calc((50vw - 136px) / 14.7);
font-size: min(var(--fq-word-base), var(--fq-dv-word));      /* on .fq-quran-safha */
--fq-line-gap: min(var(--fq-line-gap-base), calc(var(--fq-dv-word) * 0.417)) !important;
--fq-heading-h: min(var(--fq-heading-base), calc(var(--fq-dv-word) * 2.417)) !important;
```

`!important` needed to beat `QuranSafha`'s inline `--fq-line-gap`/`--fq-heading-h`. `136px` chrome constant = half of (`ps-14` + `pe-10` + two arrows) + card `px-7`. Verified (Playwright): md single-page centered; 1256×1350 both cards inside viewport; 1920×1080 leaves full size; `ar` toggle aria-labels render Arabic.

## Files to Change

- `app/utils/quran-pages.ts` — new, `getPagePair`
- `app/types/index.ts` — add `QuranSafhaView`
- `app/utils/storage.ts` — add `quranSafhaView`
- `app/contexts/QuranSafhaViewContext.tsx` — new
- `app/hooks/use-is-lg-up.ts` — new
- `app/components/QuranSafhaViewToggle.tsx` — new
- `app/components/reader/ReaderPage.tsx` — pair fetch, dual font-face/preload, dual hrefs, toggle + `QuranSpread`
- `app/components/reader/QuranSpread.tsx` — new
- `app/components/QuranSafha.tsx` — stack layers, `stackPeekSide` prop, base CSS vars, no ornamental frame
- `app/[locale]/layout.tsx` — mount `QuranSafhaViewProvider` + `data-safha-view` inline script
- `app/layout.tsx` — `data-safha-view` pre-paint script + `<html suppressHydrationWarning>`
- `app/globals.css` — attribute+lg gates: partner visibility, width cap, compensate margins
- `messages/ar.json`, `messages/en.json` — `singlePageView`/`doublePageView` keys

## Constraints

- No new routes/URL scheme — `/pages/[id]` and `/mushaf/[grant]/pages/[id]` keep existing `generateStaticParams`.
- Mobile (`<md`) completely untouched — no new decoration, no toggle.
- No `dir` attribute on the spread container — children inherit from `<html>` only.
- `stackPeekSide` is never "both" and never spread-state-dependent — always a function of pair position (right/odd vs. left/even).
- Compensate margin must be on the **same** physical side as the peek (not opposite), sized to match stack protrusion (9px = `translate-x-2` 8px + 1px border). If Addendum 3's offset magnitude changes, this value changes with it.
- Single-page navigation must remain exactly `pageId ± 1` — do not wire pair-stepping into single mode.
- Do not preload the pair partner's font.
- No hardcoded colors — everything via `currentColor` + theme token wrapper classes.
- `QuranPage.tsx`'s standalone `QuranSafha` (no `.fq-spread` ancestor) must be visually unchanged — every gate is scoped to `.fq-spread`.
- SSR single→double flash on first paint (pre-hydration window): the display itself is driven by the synchronous `html[data-safha-view]` attribute + CSS gate (flash-free). Nav-arrow href still depends on `useIsLgUp` — can step ±1 pre-hydration on `lg+`, self-corrects on hydration (accepted, invisible).

## What NOT to Do

- Do not introduce a `/pages/N-M` URL pattern.
- Do not fetch pair partner page data client-side/lazily.
- Do not preload both fonts eagerly.
- Do not use `preserveAspectRatio="none"` for shapes that must stay circular (SVG medallions, stars, diamonds) — this path was explored in Addenda 2-3 and removed entirely.
- Do not reintroduce a decorative border/guilloche/medallion frame — removed in Addendum 3, user confirmed.
- Do not touch `QuranLine.tsx`/`QuranWord.tsx` or `FONT_V1` — layout/decoration/nav feature only.
