# Add Tajweed color-coded mushaf mode

**Type:** feature
**Date:** 2026-07-11
**Status:** implemented (Addendum 10's production wiring of `mushaf=19` line-layout data is implemented and seeded — see Addendum 10's "Implementation note". Addendum 8's diagnostic page (`/test-tajweed-palette`) is built and reviewed by the user. Addendum 9 established that Tajweed-colored + always-edge-to-edge lines is not achievable with current font assets — centering (Addendum 3) remains the shipped trade-off. Addendum 7 explored and rejected an alternative `text_uthmani_tajweed`-based approach — see its Decision section.)

## Summary

Introduce an opt-in "Tajweed mode" that color-codes Quran text by Tajweed rule (idgham, ikhfa, qalqalah, madd, etc.), toggled from the Settings sheet and persisted in `localStorage`. Implemented by swapping, per page, from the existing per-page glyph font (`quran-p{page}`, rendering `word.code_v1`) to a new per-page COLRv1 color-glyph font (`quran-p{page}-tajweed`, rendering `word.code_v2`) — ported from quran.com-frontend-next's implementation. See [ADR 0023](../architecture/adr/0023-tajweed-mushaf-mode.md) for why no schema change or reseed is required.

Trello: [#23 Add Tajweed color-coded mushaf mode](https://trello.com/c/ABUostTA/23-add-tajweed-color-coded-mushaf-mode)

## Approach

quran.com-frontend-next-testing (reference project) ships this using one COLRv1 (color-glyph) TTF per Mushaf page, same `p{n}.ttf` naming convention Furqan already uses for its non-colored per-page font. The coloring is baked into the font's glyph outlines — no runtime rule computation. Each font embeds 3 built-in palettes (light/dark/sepia) selected via `@font-palette-values`/`font-palette`.

Key investigation finding (see ADR 0023): the reference project's source appeared to fetch a mushaf-specific glyph string (`mushaf=19`) for this font, suggesting a new DB column might be needed. We verified empirically against the live QDC API (diffed `code_v2` across `mushaf=1/2/19` for 5 pages spanning the whole Mushaf) that `code_v2` is **byte-identical regardless of the mushaf param**. Furqan's `Word.code_v2` — already seeded, currently unused anywhere in the app — is the correct glyph field for this font, as-is. **No migration, no reseed.**

Font assets (604 `.ttf` files, ~161MB, avg 266KB/page vs 28KB/page for the existing font) are already committed on the `tajweed-fonts` branch at `public/fonts/v4/colrv1/ttf/p{n}.ttf` (this feature branch is based on that branch — see Files to Change).

## Decision Tree / Algorithm

**State:** `tajweedMode: boolean`, default `false`, persisted in `localStorage` key `quranTajweedMode`, via a new `QuranTajweedContext` mirroring `QuranSafhaViewContext`'s exact shape (`app/contexts/QuranSafhaViewContext.tsx`) — provided globally in the locale layout alongside the other Quran reading contexts, so it's automatically available to both the self reader (`/pages/[id]`) and the shared-mushaf grant reader (`/mushaf/[grant]/pages/[id]`), and both single- and double-page view (both render through `QuranSafha`).

**Per-word rendering (`QuranWord.tsx`):**

| `tajweedMode` | Glyph field rendered | Font family applied |
|---|---|---|
| `false` (default) | `word.code_v1` | `quran-p{page}` (existing, unchanged) |
| `true` | `word.code_v2` | `quran-p{page}-tajweed` (new) |

**Font-face injection (`FontFaceInjector.tsx`, extended):**
- Always injects `@font-face { font-family: 'quran-p{id}'; src: url('/fonts/v1/ttf/p{id}.ttf') ... }` for both pages of the pair — unchanged.
- When (and only when) `tajweedMode` is true, additionally injects `@font-face { font-family: 'quran-p{id}-tajweed'; src: url('/fonts/v4/colrv1/ttf/p{id}.ttf') format('truetype'); font-display: block; }` for both pages of the pair. The component gains a `tajweedEnabled: boolean` prop; the caller (`ReaderPage.tsx`) reads it from `useQuranTajweed()` and passes it down. This keeps the heavy font out of the network path entirely for users who never enable the mode.

**Color palette (new, only when `tajweedMode` is true):**
- Alongside the `@font-face` block, inject per page-pair:
  ```css
  @font-palette-values --Light { font-family: 'quran-p{id}-tajweed'; base-palette: 0; }
  @font-palette-values --Dark  { font-family: 'quran-p{id}-tajweed'; base-palette: 1; }
  @font-palette-values --Gold  { font-family: 'quran-p{id}-tajweed'; base-palette: 2; }
  ```
- Add a global rule in `globals.css`, scoped to a marker class (`.fq-tajweed`) applied to `.fq-quran-safha` only when the mode is on, so it never leaks into non-tajweed rendering:
  ```css
  .theme-light .fq-tajweed { font-palette: --Light; }
  .theme-dark .fq-tajweed { font-palette: --Dark; }
  .theme-gold .fq-tajweed { font-palette: --Gold; }
  ```

**PWA pre-cache (`app/sw.ts`):** no change. `fontUrl()`/`precacheAllPages()` stay hardcoded to `/fonts/v1/ttf/`, so tajweed fonts are never swept into the install-time pre-cache — they load over the network the first time a page pair is viewed with the mode on.

**Toggle UI:** new "Tajweed Colors" section in `SettingsSidebar.tsx`, using a shadcn `Switch` (not yet installed — `npx shadcn@latest add switch`), since this is a binary on/off (unlike the 3-way `QuranSafhaViewToggle`).

## Verified Test Cases

- **`code_v2` mushaf-independence** — fetched QDC `verses/by_page/{1,50,300,550,604}` with `mushaf=2` (Furqan's current seed param), `mushaf=19` (reference project's Tajweed-V4 mushaf), and `mushaf=1` (QCFV2). Word counts and every `code_v2` value matched exactly across all three params, on all 5 pages. Confirms `code_v2` needs no reseed.
- **End-of-verse markers** — checked `char_type_name === 'end'` words on page 1 (e.g. `1:1:5`, `1:7:10`): `code_v2` is populated for these too, not just `char_type_name === 'word'`, so ayah-end markers render correctly in Tajweed mode with no special-casing.
- **Surah banners / bismillah** — `QuranLine.tsx`'s inline surah-header block renders via `BismillahSVG` + `font-surahnames`, entirely independent of `word.code_v1`/`code_v2`. Confirmed these are untouched by this feature — no Tajweed coloring applies to them, matching the printed Mushaf (they aren't recited word text).
- **Highlights/marks** — `app/utils/highlight.ts`'s `HIGHLIGHT_COLORS` are all `bg-*` (background) classes, not `color`-based (except `dark:text-white` on the `search` type, which has no visible effect on a COLRv1 glyph but is otherwise harmless). Confirms no rework needed for marks/search-highlight/note-indicator to coexist with Tajweed mode.

## Files to Change

- **Base branch**: this feature branches from `tajweed-fonts` (not `main`) — that branch already has all 604 `.ttf` files committed at `public/fonts/v4/colrv1/ttf/p{1..604}.ttf`. No font-copying work needed; verify the commit is intact when `/start-fq-task` picks this up.
- `app/contexts/QuranTajweedContext.tsx` (new) — `tajweedMode` boolean state + `setTajweedMode`, localStorage-persisted, mirrors `QuranSafhaViewContext.tsx`.
- `app/[locale]/layout.tsx` (or wherever `QuranSafhaViewProvider`/`QuranFontScaleProvider` are mounted) — add `QuranTajweedProvider`.
- `app/components/QuranWord.tsx` — branch glyph text (`code_v1` vs `code_v2`) on `useQuranTajweed().tajweedMode`.
- `app/components/QuranSafha.tsx` — branch the container `fontFamily` (via `getPageFontFamily`) and add the `.fq-tajweed` marker class when mode is on.
- `app/utils/quran-font-map.ts` — extend `getPageFontFamily(page, tajweed?: boolean)` to return `quran-p{page}-tajweed` when true.
- `app/components/reader/FontFaceInjector.tsx` — accept `tajweedEnabled: boolean`; conditionally inject the tajweed `@font-face` + `@font-palette-values` blocks for the given `pageIds`.
- `app/components/reader/ReaderPage.tsx` — read `tajweedMode` from context, pass to `FontFaceInjector`.
- `app/globals.css` — add the `.theme-{light,dark,gold} .fq-tajweed { font-palette: ... }` rules.
- `app/components/SettingsSidebar.tsx` — new "Tajweed Colors" section with the `Switch`.
- `components/ui/switch.tsx` (new, via `npx shadcn@latest add switch`).
- `messages/ar.json`, `messages/en.json` — new translation keys (e.g. `tajweedMode`, `tajweedModeDescription`); run `npm run extract-translations` after adding usages.
- `docs/architecture/DECISIONS.md`, `docs/architecture/adr/0023-tajweed-mushaf-mode.md` — already written in this planning pass.

## Constraints

- Never render `word.code_v1` with the tajweed font family, or `word.code_v2` with the base font family — the pairing is fixed per ADR 0023.
- Never inject the tajweed `@font-face`/`@font-palette-values` blocks unconditionally — only when `tajweedMode` is true, for the currently visible page pair.
- Never add the tajweed font URLs to `app/sw.ts`'s pre-cache list.
- Do not attempt to recolor Tajweed glyphs via CSS `color` — COLRv1 glyphs paint their own colors; `color` has no effect on them (harmless, not a bug, no workaround needed given Furqan's highlights are background-based).

## What NOT to Do

- Do not add a new `code_v4`/`code_v2`-variant schema column or reseed the DB — empirically disproven as necessary (ADR 0023).
- Do not port the reference project's Firefox COLRv1 dark-mode OT-SVG fallback (a second full font set + UA-sniffing) — explicitly deferred; ship without it for v1.
- Do not add tajweed fonts to the PWA offline pre-cache — explicitly excluded to protect the existing iOS cache-quota risk (ADR 0014).
- Do not use the native `FontFace()` JS API / `document.fonts.add()` pattern from the reference project — stick with Furqan's existing static `@font-face`-via-`<style>` `FontFaceInjector` pattern (ADR 0020) for consistency.
- Do not build on `origin/tajweed-mushaf` (an old, stale remote branch from a much earlier point in history, different font path `public/fonts/tajweed/ttf/`) — it's an abandoned earlier attempt, unrelated to this plan.

## Addendum 1 — Font-size correction and hover fix

**Date:** 2026-07-11

User tested the initial implementation at localhost:3001 and reported two issues.

### Issue 1: Tajweed text renders too large at every font scale

**Root cause:** Not a wrong CSS value — the COLRv1 tajweed font and the base `quran-p{n}` font are genuinely different font designs with different glyph-to-em-square ratios. Measured directly from the TTF files with `fontTools` (bounding-box height of matching glyphs for the same word, normalized by each font's `unitsPerEm`), sampled across 20 real word pairs from page 1: **tajweed glyphs average ~1.42x taller** than base glyphs at an identical CSS `font-size` (width ratio is less consistent, 1.2x–2.85x depending on ligature shape — height is the reliable signal). Two isolated single-glyph checks (a regular word and an end-of-verse marker) both independently landed at ~1.31x, corroborating the direction and rough magnitude.

This can't be fixed by editing `FONT_V1` — that would violate the "reading font size is off-limits" constraint (ADR 0004) and affect the base (non-tajweed) font too. Furqan sizes Quran text through three separate, ADR-protected mechanisms that must all stay intact: mobile (`--fq-mobile-font`, ADR 0011), desktop single-page (Tailwind arbitrary-value class + safelist, ADR 0005), and desktop double-page width cap (ADR 0013).

**Approach (confirmed with user):** a single CSS custom property `--fq-tajweed-scale: 0.7` (the inverse of the measured ~1.42x), applied via three small `.fq-tajweed`-scoped override rules in `globals.css` — one per existing font-size rule — each multiplying that rule's existing computed value by `var(--fq-tajweed-scale)` via `calc()`. Zero changes to `FONT_V1`, the mobile formula, or the Tailwind safelist. `0.7` is a starting calibration, not a proven-exact value — user will eyeball the actual rendered result and this constant may need tuning (same spirit as the codebase's other calibrated magic numbers, e.g. the mobile `14.7` divisor).

**Decision Tree:**

| Context | Existing font-size rule | Tajweed override (added) |
|---|---|---|
| Mobile (`<768px`) | `.fq-quran-safha { font-size: var(--fq-mobile-font); }` | `.fq-quran-safha.fq-tajweed { font-size: calc(var(--fq-mobile-font) * var(--fq-tajweed-scale)); }` |
| Desktop single (`≥768px`, not double-view) | Tailwind class `md:text-[max(24px,Nvh)]` (from `FONT_V1.getWordFontSizeCss`) | `.fq-quran-safha.fq-tajweed { font-size: calc(var(--fq-word-base) * var(--fq-tajweed-scale)); }` — reuses the `--fq-word-base` CSS var already set on `.fq-content` (inherits down to `.fq-quran-safha`), so no new Tailwind literal class/safelist entry is needed |
| Desktop double-view (`≥1024px`, `data-safha-view="double"`) | `:root[data-safha-view="double"] .fq-spread .fq-quran-safha { font-size: min(var(--fq-word-base), var(--fq-dv-word)); }` | `:root[data-safha-view="double"] .fq-spread .fq-quran-safha.fq-tajweed { font-size: calc(min(var(--fq-word-base), var(--fq-dv-word)) * var(--fq-tajweed-scale)); }` |

Each override rule is placed after its corresponding base rule and uses the compound `.fq-quran-safha.fq-tajweed` selector (two classes, same specificity family) so cascade order — not `!important` — decides the winner; non-tajweed pages (`.fq-tajweed` absent) are completely unaffected.

### Issue 2: Hover effect doesn't work in Tajweed mode

**Root cause:** `QuranWord.tsx`'s hover cue (`hover:text-yellow-500 dark:hover:text-yellow-400`) changes the CSS `color` property. COLRv1 glyphs ignore `color` entirely (documented as a known property in this plan's original Constraints section, but its impact on the *hover* affordance specifically — as opposed to the background-based highlight system — was missed during the original implementation).

**Approach (confirmed with user):** keep the existing color-based hover untouched for normal (non-tajweed) mode. Add a background-tint hover cue, applied only when `tajweedMode` is true — consistent with how every other visual state in this component already works (marks/search highlights are all `bg-*`, per `app/utils/highlight.ts`).

First attempt used `hover:bg-accent/40`, which the user reported as barely visible. Root cause: `--accent`'s lightness is nearly identical to `--card`'s in all 3 themes (light: 93% vs 100%; gold: 86% vs 97%; dark: 15% vs **15%**, identical) — `--accent` was designed for hover states over `--background`-level surfaces (nav/buttons), not for tinting on top of the Quran page card. Switched to `hover:bg-primary/25`, reusing the same `--primary`-based background pattern already proven visible in this component tree (`.fq-recitation-active-word` uses `hsl(var(--primary) / 0.22)` for the live recitation word-highlight) — `--primary` has real lightness contrast against `--card` in all 3 themes (light: 35% vs 100%; gold: 43% vs 97%; dark: 41% vs 15%).

### Files to Change (this addendum)

- `app/globals.css` — add `--fq-tajweed-scale: 0.7` and the three `.fq-tajweed`-scoped font-size override rules (mobile, desktop single, desktop double-view).
- `app/components/QuranWord.tsx` — conditionally apply `hover:bg-primary/25` instead of (not in addition to) `hover:text-yellow-500 dark:hover:text-yellow-400` when `tajweedMode` is true.

### Constraints (this addendum)

- Never edit `FONT_V1`, the mobile `--fq-mobile-font` formula, or the double-view `--fq-dv-word` formula to compensate for tajweed sizing — the correction lives entirely in the `.fq-tajweed`-scoped override rules.
- `--fq-tajweed-scale` is a single global constant (not per-scale, not per-page) — the measured mismatch varies per glyph/word (1.16x–1.72x in the sample), so this is a best-fit average correction, not a pixel-perfect one. Revisit the constant's value, not the mechanism, if it looks off.
- Do not reintroduce a `hover:text-*` rule for tajweed mode — COLRv1 glyphs ignore `color` outright; any future tajweed-mode interaction state must use `bg-*`/`text-shadow`/opacity, never `color`.

## Addendum 2 — Lines don't reach the page edges in Tajweed mode — SUPERSEDED by Addendum 3

**Status: superseded.** The `justify-content: space-between` + `width: 100%` approach below is **reverted** — see Addendum 3. It correctly made every line reach the container edges, but it did so by inserting uniform gaps *between* words, which does not match how mushaf justification actually works (kashida stretching *inside* specific words, baked into the font/glyph data, chosen by the original typesetter) — the user compared real screenshots and confirmed it visibly shifted words away from their authentic positions. Keeping this section for history; do not re-apply `justify-between`/forced row `width: 100%` for tajweed line layout.

**Date:** 2026-07-11

User compared a reference screenshot (quran.com-style tajweed rendering, lines justified edge-to-edge) against our Tajweed mode and reported lines not filling the mushaf width consistently.

### Root cause

Furqan's mushaf rendering relies on the per-page font's own glyph kerning to make each line "self-justify" — there is no `text-align: justify` or explicit width-fitting CSS anywhere in `QuranLine`/`QuranSafha`. This works for the base font because `code_v1`'s kerning is extremely self-consistent: measured directly from the font files (fontTools, all 604 pages / 8,820 lines), every line's natural width-per-font-size ratio falls in a tight band (13.9–15.1×font-size, ~2.7% coefficient of variation). Auto-width containers pick up the natural width of the widest line, and every other line is already almost exactly that same width, so no justification logic is needed.

The tajweed COLRv1 font (`code_v2`) does **not** have this property. The same measurement against all 604 pages / 8,820 lines shows a much wider spread: 5.8–22.7×font-size, ~7.7% coefficient of variation (roughly 3x `code_v1`'s relative variance). Relying on natural auto-width, as the base font does, leaves many tajweed lines visibly short of the container edges — that's what the user is seeing.

### Fix

Add `justify-content: space-between` to each line row (`.fq-safha-row` in `QuranLine.tsx`), applied only when `tajweedMode` is true, for pages other than 1–2 (which keep their existing `justify-center` — short opening-page lines should stay centered, not stretched into unnaturally large word gaps). `QuranLine.tsx` is already a `"use client"` component; it reads `useQuranTajweed()` directly, matching the pattern already used in `QuranWord.tsx`/`QuranSafha.tsx` rather than prop-drilling.

This works without any container-width changes because `.fq-quran-safha` is a flex column with `align-items: stretch` by default, so each row already stretches to the container's full width — `justify-content: space-between` only needed to convert each row's leftover slack into evenly-distributed inter-word gaps, which it does regardless of how far the row's natural (un-stretched) width falls short of the container.

**Deferred, not part of this fix:** the font-size/width-ratio measurement done during investigation (worst-case tajweed line ratio: 22.73×font-size, vs `code_v1`'s 14.42×font-size worst case) is **not** applied here. `justify-content: space-between` can only add space, not shrink a line that's already wider than its container — so the current mobile/double-view font-size formulas (which derive size from `code_v1`'s ratio) could in theory let the single worst-case tajweed line (page 123, line 8) overflow slightly before clipping (`overflow-hidden` backstop, same accepted behavior as ADR 0011's v1 margin). The user has explicitly deferred the font-size correction (mobile/double-view divisor, and possibly the desktop single-view `--fq-tajweed-scale` value) to a separate follow-up pass — the raw measurement data is kept in this addendum for that future work, not discarded.

### Files to Change (this addendum)

- `app/components/QuranLine.tsx` — import `useQuranTajweed`; add `justify-between` to `.fq-safha-row`'s className when `tajweedMode` is true and the page is not 1 or 2 (i.e. as an `else` branch alongside the existing `justify-center` page-1/2 case).
- `app/globals.css` — add `.fq-tajweed .fq-safha-row { width: 100%; }`. **Required in addition to `justify-between`, not optional**: `.fq-quran-safha` sets `align-items: center` in both the mobile (`@media (max-width: 767px)`) and `.fq-spread` (double-view) flex contexts (globals.css lines ~148/~212), so without an explicit width each row shrink-wraps to its own content and `justify-between` has no slack to redistribute — this was missed in the first pass of this addendum and caught by the user. Unconditional (not media-scoped): in the standalone desktop case `.fq-quran-safha` is plain block flow (no flex), so rows are already 100% width there and this rule is a harmless no-op.

### Constraints (this addendum)

- Do not touch `FONT_V1`, `--fq-tajweed-scale`, the mobile `14.7` divisor, or the double-view `14.7`-based width budget as part of this fix — those are explicitly deferred to a follow-up addendum once the user picks this back up.
- Do not apply `justify-between` to pages 1–2 in tajweed mode — keep the existing `justify-center` short-page behavior identical to `code_v1` mode.
- Do not apply `justify-between` outside `.fq-tajweed` — `code_v1` rendering is provably self-justifying already (2.7% CV) and must stay untouched.

### Reference data for the deferred font-size follow-up

Measured via `fontTools` (glyph advance-width sums from `hmtx`, normalized by `unitsPerEm`), across all 604 pages / 8,820 lines, for both `code_v1`+`quran-p{page}.ttf` and `code_v2`+`quran-p{page}-tajweed.ttf` (i.e. `public/fonts/v4/colrv1/ttf/p{n}.ttf`):

| Font | min | p10 | median | mean | p90 | max (worst case) | stdev | CV% |
|---|---|---|---|---|---|---|---|---|
| `code_v1` | 3.90* | 13.90 | 14.17 | 14.19 | 14.54 | 15.11 (p.189) | 0.386 | 2.7% |
| `code_v2` (tajweed) | 5.83 | 14.58 | 16.08 | 16.08 | 17.60 | 22.73 (p.123, line 8) | 1.241 | 7.7% |

*`code_v1` min is an outlier (very short line); the 13.9–15.1 range is representative of normal lines.

7 lines (out of 8,820) had `code_v2` characters not present in that page's font `cmap` (all `line_number === 1`, likely surah-header-adjacent rows) — excluded from the stats above; low priority, unrelated to sizing.

## Addendum 3 — Corrected fix: center lines instead of stretching them

**Date:** 2026-07-11

User visually compared the reference screenshot against Addendum 2's `space-between` implementation, word by word, and confirmed each word landed in a visibly different horizontal position than the authentic mushaf layout — not just "not full width," but *wrong positions*.

### Root cause (corrected)

Real mushaf line-justification is done via **kashida** (letter elongation) inserted *inside* specific words at specific points, chosen by the original typesetter, and baked directly into the glyph/text data. `code_v1` reaching a consistent line width with zero CSS help (2.7% variance, Addendum 2) isn't a coincidence — the kashida is already in the data, so the font's own natural advance-width sum already lands every word in its correct position.

`justify-content: space-between` instead inserts *uniform* gaps *between* whole words — unrelated to where kashida was actually placed — which necessarily moves every word off its authentic position. This is true regardless of `code_v2`'s width-consistency (the Addendum 2 measurement, 7.7% CV, is still accurate — it's just not the right thing to "fix" via added gaps).

Confirmed by checking how quran.com itself (the project this font was ported from) handles this: their CSS is `text-align: center` inside a box whose width comes from a **hardcoded, precomputed per-font/per-scale lookup table** (`$line-width-map` in `_utility.scss`) — not a live formula, and never `justify-content: space-between`. The fixed width exists to avoid layout jank while fonts load, not to stretch content. They trust the font's natural kashida-driven width, same as `code_v1` does today in Furqan.

### Fix

1. **Revert Addendum 2's CSS/component changes**: remove `.fq-tajweed .fq-safha-row { width: 100%; }` from `globals.css`; in `QuranLine.tsx`, replace the `tajweedMode ? "justify-between" : ""` branch with plain centering.
2. **Center every tajweed line as a rigid block** (not just pages 1–2): `[1, 2].includes(page_number) || tajweedMode` → `"justify-center"`, else `""`. Centering only shifts the line's overall horizontal position — it never changes the relative gaps between words, so authentic word positions are preserved even when a line's natural width falls short of the container.
3. **Font-size stays exactly as Addendum 1 left it for now** (`--fq-tajweed-scale: 0.7` on all three contexts, reused `14.7` divisor on mobile/double-view) — no new divisor introduced in this pass. Rationale: introducing a worst-case-safe divisor (the deferred measurement: 22.73×font-size) would keep every line from ever overflowing, but since the tajweed spread (5.8–22.7) is much wider than `code_v1`'s (13.9–15.1), calibrating to the true worst case would leave *typical* lines (median ratio 16.08) filling only ~70% of the container width — a much more visible gap than `code_v1`'s ~2% case. Whether that tradeoff (guaranteed no clipping vs. visibly shorter typical lines) is worth it can't be judged without seeing it rendered — deferred until it's visually verified whether the current (Addendum-1) font-size actually produces any visible clipping on the rare worst-case lines in practice.

### Files to Change (this addendum)

- `app/globals.css` — remove `.fq-tajweed .fq-safha-row { width: 100%; }` (added in Addendum 2, reverted here).
- `app/components/QuranLine.tsx` — change the row's justify class to `[1, 2].includes(words[0].page_number) || tajweedMode ? "justify-center" : ""` (drop the separate `justify-between` branch entirely).

### Constraints (this addendum)

- Do not reintroduce `justify-content: space-between` (or any technique that inserts space *between* words) for tajweed line layout — it demonstrably shifts words off their authentic mushaf positions, confirmed by direct visual comparison. Centering (or trusting natural font width, as `code_v1` does) are the only acceptable techniques.
- Do not introduce a new tajweed-specific width divisor in this pass — deferred until visual verification shows whether the current Addendum-1 font-size actually clips the rare worst-case lines (page 123 line 8 ratio 22.73, and similar-magnitude neighbors in the top-25 list from the investigation). If it does, revisit with the measured data already captured in Addendum 2's reference table.
- `code_v1` rendering must stay completely untouched by any of this — all changes remain scoped to `.fq-tajweed`/`tajweedMode`.

## Addendum 4 — Diagnostic finding: `line_number` differs by mushaf; test page to confirm

**Date:** 2026-07-11

Addendum 3's centering fix made the true source of the unevenness visible (previously masked by Addendum 2's `space-between` distortion): even on a single page, natural line widths vary a lot — measured directly on page 343, the 15 lines range from 73% to 100% of that page's own widest line, purely from `code_v2`'s glyph data, no CSS involved. User asked whether this points back to needing different word-glyph data (`code_v4`/`mushaf=19`, the question originally raised — and dismissed too quickly — in ADR 0023).

### Investigation

- `code_v3`/`code_v4` are not real API fields — requesting them explicitly (`word_fields=code_v3,code_v4`) against `mushaf=19` returns nothing; `GlyphWord.tsx` in the reference project (quran.com-frontend-next-testing) confirms their `TajweedV4` font renders `textCodeV2`, same as every non-`MadaniV1` font — there is no separate v4 glyph field anywhere. This reconfirms ADR 0023's conclusion: `code_v2` is the correct glyph field, no new glyph column needed.
- **But `line_number` differs by `mushaf` param, and `code_v2` doesn't.** Diffed page 343 word-by-word between `mushaf=19` (the Tajweed-V4 mushaf) and `mushaf=2` (Furqan's seeded param): `code_v2` values are identical for every word, but **36 of 153 words** (23%) are assigned to a different `line_number`. The Tajweed-V4 mushaf has its own line-break layout, distinct from the one Furqan seeded (which matches `code_v1`'s V1-mushaf line breaks).

### Hypothesis

`code_v2`'s kashida stretch characters were shaped assuming the Tajweed-V4 mushaf's *own* line groupings. Furqan currently groups `code_v2` words by `line_number` seeded under `mushaf=2` — i.e., words that were kashida-calibrated to fill one specific line (under mushaf=19's breaks) are being split across a *different* pair of lines (mushaf=2's breaks), so neither resulting line was ever shaped to reach full width on its own. This would explain the 7.7%-CV variance far better than "the font/data is just imprecise" — it may be a data-pairing bug, not an inherent font limitation.

### Test page (this addendum implements only this — no schema change yet)

A throwaway, unlinked diagnostic route: `app/[locale]/test-tajweed-mushaf/[page]/page.tsx`.

- Server Component. Fetches `quranPrisma.pageMetadata.findUnique({ where: { page_number }, include: { chapter: true } })` (unaffected by mushaf param, reused as-is) and `quranPrisma.chapter.findMany()` (for building each word's `verse.chapter` shape by chapter number).
- Fetches page words live from QDC: `GET https://api.qurancdn.com/api/qdc/verses/by_page/{page}?words=true&word_fields=text_uthmani,code_v1,code_v2,qpc_uthmani_hafs,char_type_name,line_number,page_number&fields=verse_key,hizb_number,rub_el_hizb_number,ruku_number,manzil_number,sajdah_number,text_uthmani,juz_number&mushaf=19&per_page=100`.
- Maps each QDC word + its parent verse into a `WordWithVerse`-shaped object: verse-level fields map almost 1:1 from QDC's verse object (id, verse_number, verse_key, hizb_number, rub_el_hizb_number, ruku_number, manzil_number, sajdah_number, text_uthmani, page_number, juz_number); `chapter_id`/`text_imlaei_simple` are derived/stubbed since unused by the rendering path being tested; `chapter` comes from the `chapter.findMany()` lookup keyed by chapter number parsed from `verse_key`.
- Groups words into `lines: Record<string, WordWithVerse[]>` using **QDC's `line_number` from the `mushaf=19` response**, not Furqan's DB value.
- Renders via the **actual, unmodified `QuranSafha` component** (`page`, `lines`, `pageMetadata`, `locale` props) — reusing 100% of the real font-face injection, CSS, centering, and tajweed palette logic, so the only variable being tested is the line-grouping source. Relies on the viewer already having Tajweed mode ON via Settings (the real, already-mounted `QuranTajweedProvider` covers this route automatically since it's under `app/[locale]/`) — no context overriding needed.
- No DB writes anywhere in this route. Not linked from any nav/sidebar — direct URL only, dev-only diagnostic.

### Files to Change (this addendum)

- `app/[locale]/test-tajweed-mushaf/[page]/page.tsx` (new) — the diagnostic route described above.

### Constraints (this addendum)

- No schema change, no reseed, no writes to `furqan_quran`/`furqan_app` — this addendum is read-only investigation. If the test confirms the hypothesis, a *follow-up* addendum will cover the actual schema change (a new `line_number`-equivalent column seeded from `mushaf=19`, used only when `tajweedMode` is true) — not decided yet, pending this test's result.
- The test route must not be linked from `Sidebar`, `Nav`, or any other real navigation — direct-URL-only, so it can't be stumbled into by a normal user.
- Reuse `QuranSafha` unmodified — do not fork/duplicate its rendering logic for this test; the whole point is an apples-to-apples comparison against production rendering.

### What NOT to Do (this addendum)

- Do not implement the schema/reseed change yet — this addendum is diagnostic only, confirm via the test page first.
- Do not add a `code_v3`/`code_v4` column — confirmed not to exist as a distinct API field.

## Addendum 5 — `mushaf=19` was the wrong mushaf; testing `mushaf=11` instead

**Date:** 2026-07-11

Addendum 4's test page confirmed `line_number` is mushaf-variant, but user cross-checked our test page's actual rendering against the original reference screenshot word-by-word and found a mismatch: page 343's line 14/15 boundary. Investigating the reference project's own `types/QuranReader.ts` `Mushaf` enum surfaced a full list of QDC mushaf IDs — there are **two** tajweed-related ones, not one: `Mushaf.Tajweed = 11` and `Mushaf.QCFTajweedV4 = 19`. Our font assets are named `v4/colrv1` (suggesting 19), but empirically testing both against page 343's line 14/15 boundary shows **`mushaf=11`** matches the reference image (`ٱلْقَوْلُ` ends line 14, `مِنْهُمْ` starts line 15) — `mushaf=19` does not (it starts line 15 with `ٱلْقَوْلُ`).

### Fix (this addendum)

A second, separate diagnostic test page — kept alongside Addendum 4's (not replacing it), so both mushaf candidates remain directly comparable:

- `app/[locale]/test-tajweed-mushaf-11/[page]/page.tsx` (new) — identical structure/approach to Addendum 4's `test-tajweed-mushaf/[page]/page.tsx` (same `WordWithVerse` mapping, same reuse of the real `QuranSafha` component, no DB writes), except the QDC fetch uses `mushaf=11` instead of `mushaf=19`.

### Files to Change (this addendum)

- `app/[locale]/test-tajweed-mushaf-11/[page]/page.tsx` (new).

### Constraints (this addendum)

- Do not modify or remove the `mushaf=19` test page (Addendum 4) — both must stay available side by side for comparison until the user picks one.
- No schema/DB change yet — still diagnostic only.

## Addendum 6 — `mushaf=19` locked in as final; `mushaf=11` abandoned

**Date:** 2026-07-12

Addendum 5 picked `mushaf=11` based on a single line-boundary check (page 343, line 14/15) against a static reference screenshot sourced from the official Quran Android app. Before committing to a schema change for either candidate, further investigation reversed that conclusion.

### Investigation

- Cloned and searched the official `quran/quran_android` repo (the source of the original reference screenshots) end-to-end — `grep -rli tajweed` across the full tree, plus `git log --all -i -S"tajweed"` across every commit/branch/tag in the entire repo history — for any Tajweed rendering code, font, or color-mapping logic. **Zero matches, anywhere, ever.** Confirmed via `productFlavors` (only a single `madani` flavor is wired up) and the app's actual `MadaniPageProvider`: the app downloads **pre-rendered plain page images** from `https://android.quran.com/data` and overlays a separately-downloaded SQLite `glyphs` table (one `line_number` per glyph) purely for tap/highlight bounding boxes — there is no live font/glyph rendering path at all, colored or otherwise, and no reachable line-layout algorithm to port. Whatever produces the tajweed-colored look on the phone/tablet app is baked server-side into a raster image; not reproducible from this repo.
- Separately, checked the **live quran.com web app** (the actual client-rendered tajweed reference, same QDC data model Furqan uses) for page 343 — it matches our `mushaf=19` test page (`test-tajweed-mushaf/343`), not the `mushaf=11` one.

### Decision

`mushaf=19` is the final mushaf ID for the COLRv1-font tajweed rendering (as currently shipped): it already fits full-width (Addendum 3's centering fix applies to it cleanly) and now is also confirmed to match a live, working, client-rendered reference implementation — a stronger source of truth than a single boundary check against a screenshot from an app with no accessible rendering logic. `mushaf=11`'s closer visual match to the original Android screenshot is abandoned as unreachable: there is no inspectable algorithm to replicate it, and the app that produced it doesn't render tajweed at all client-side.

### Files to Change (this addendum)

- None — this addendum is a decision record only. `test-tajweed-mushaf/[page]/page.tsx` (Addendum 4, `mushaf=19`) is the confirmed-final line-grouping source if/when this feature is promoted out of the diagnostic-test-page stage.

### Constraints (this addendum)

- Do not revisit `mushaf=11` or attempt to reproduce the Android app's exact line-break layout — confirmed unreachable (no rendering code exists in that app to reference).
- `test-tajweed-mushaf-11/[page]/page.tsx` may be deleted in a future cleanup pass; not deleted in this addendum to avoid scope creep, but no longer an open candidate.

### What NOT to Do (this addendum)

- Do not re-litigate `mushaf=19` vs `mushaf=11` — resolved. `mushaf=19` is final for the COLRv1-font approach.

## Addendum 7 — Diagnostic test page: `text_uthmani_tajweed` (alternative, non-font-based approach)

**Date:** 2026-07-12

While investigating the Android app (Addendum 6), a structurally different way to render Tajweed coloring was discovered: QDC's `text_uthmani_tajweed` field. Unlike `code_v2` (a special COLRv1 glyph font with its own kashida/line-fit characteristics, per Addenda 2–3), this field is the **same standard Uthmani text** Furqan already has a rendering path for (`UthmanicHafs1Ver18`/`font-uthmanic`, per the Font System decision), with inline `<rule class=X>...</rule>` tags marking exactly which characters each tajweed rule applies to — colored via CSS, not a special font. Because it reuses the same line/word grouping as `code_v1` (already proven to fit edge-to-edge, 2.7% CV), this approach cannot have the line-fit bug Addenda 2–5 were chasing.

This addendum builds **only a throwaway diagnostic test page** to visually compare this approach — no decision yet on whether it replaces the COLRv1-font approach in production. That's an explicitly deferred follow-up, discussed but not decided: it would mean a schema/reseed change (new `Word.text_uthmani_tajweed` column), removing the entire COLRv1 font path (161MB asset set, `FontFaceInjector` tajweed injection, `--fq-tajweed-scale`, the tajweed `justify-center` branch), and a real color-palette pass — none of that happens in this addendum.

**Correction — line-fit is NOT assumed solved, it's an open question this test page must check.** An earlier framing of this addendum claimed reusing `code_v1`'s `line_number` grouping meant this approach "structurally cannot have the line-fit bug." User pushed back: they've previously observed `text_uthmani`/`font-uthmanic` rendered at page-line scale and it visibly falls short of the line width, unlike `code_v1`'s self-justifying kashida — not yet re-verified in this session, but treated as a real prior observation, not dismissed. So this test page's job is two things, not one: (1) does `font-uthmanic` have full glyph coverage for `text_uthmani_tajweed`'s character set (the `word.text_uthmani` + `font-uthmanic` pairing is flagged as a "Common Mistake" in `docs/standards/quran-rendering.md`, for reasons ADR 0002 doesn't fully explain), and (2) does the line actually reach the container edges the way `code_v1` does, or does it fall short like the user recalls. Both are open until this test page is viewed — do not assume either is solved going in.

### Result — page 343 visually reviewed

**(1) Glyph coverage: resolved, no problem.** After fixing two parser bugs (below), the rendered text on `/test-tajweed-uthmani/343` has no missing/tofu glyphs — `text_uthmani_tajweed` renders correctly through `font-uthmanic`/`UthmanicHafs1Ver18` at word level. The `quran-rendering.md` "Common Mistake" entry does not appear to apply to this specific content, or at least not in a way that produces visible breakage here.

**(2) Line-fit: confirmed broken, matching the user's prior recollection.** Screenshot review of the full page 343 render shows several lines stopping well short of the left edge (e.g. the `بِهِۦ لَقَـٰدِرُونَ` line, the `غَيۡرُهُۥٓ ... تَتَّقُونَ` line, the final line) — nowhere near `code_v1`'s consistent edge-to-edge fill. Reusing `code_v1`'s `line_number` grouping does **not** make `text_uthmani`/`UthmanicHafs1Ver18` self-justify the way `code_v1`'s own font does — the "same underlying mushaf typesetting" assumption behind the original "structurally cannot have the line-fit bug" claim was wrong. This font's kashida (if any) is not calibrated to fill these specific line boundaries the way `code_v1`'s per-page font's kashida is.

### Parser bugs found and fixed during this review

Two bugs surfaced as literal, unparsed `<rule class=...>` / `</rule>` text leaking into the rendered page:

1. **Hyphenated class names**: `custom-alef-maksora` (confirmed real, present on page 343) was not matched by the original `[a-z_]+` character class — broadened to `[a-zA-Z0-9_-]+`.
2. **Nested tags**: some rule spans nest, e.g. `<rule class=madda_normal><rule class=custom-alef-maksora>ٰ</rule></rule>` and `<rule class=madda_obligatory_monfasel>ُوٓ<rule class=slnt>اۡ</rule>‌ۖ</rule>` (max depth 2 on page 343, verified via a full-page balance check). A flat single-level regex closes on the *first* `</rule>` it finds, leaving the outer close tag as literal text. Replaced with a stack-based tokenizer (`TOKEN_REGEX = /<rule class=([a-zA-Z0-9_-]+)>|<\/rule>/g`, walked left-to-right pushing/popping a stack) — text takes the color of the innermost (top-of-stack) open rule. Verified against both nested examples above with a standalone script before re-checking in the browser.

### Files to Change (this addendum) — updated

- `app/utils/tajweed-preview-colors.ts` — parser rewritten as the stack-based tokenizer described above (supersedes the flat-regex version originally planned); added a `custom-alef-maksora` color entry.

### Decision — approach rejected, code removed

**Date:** 2026-07-12

With glyph coverage confirmed fine but line-fit confirmed structurally broken (see Result above), user decided: **stay with the already-shipped COLRv1/`code_v2` approach, locked to `mushaf=19` (Addendum 6).** The `text_uthmani_tajweed` approach is not pursued further — plain Unicode Uthmani text has no per-line kashida calibration at all (unlike `code_v1`/`code_v2`, which are typeset per mushaf page with kashida baked in at exact points), so no choice of `line_number` grouping can fix it; this is a structural property of the data, not a bug. Centering (the Addendum 3 pattern) was considered but not pursued either, since it was a decision point offered and the user chose to stop here rather than adopt it.

**Cleanup performed:** the diagnostic code built to evaluate this approach is removed, since it has no further purpose:
- `app/[locale]/test-tajweed-uthmani/[page]/page.tsx` — deleted.
- `app/utils/tajweed-preview-colors.ts` — deleted.
- `app/components/QuranWord.tsx` — reverted to its pre-Addendum-7 state (no `text_uthmani_tajweed` branch, `QuranWordProps.word` back to plain `WordWithVerse`).

**Also deleted in this pass:** `app/[locale]/test-tajweed-mushaf-11/[page]/page.tsx` (Addendum 5) — `mushaf=11` was abandoned in Addendum 6, so this test page no longer serves a purpose either.

**Kept:** `app/[locale]/test-tajweed-mushaf/[page]/page.tsx` (Addendum 4, `mushaf=19`) — this is the confirmed-correct line-grouping source and remains the reference implementation for whenever the actual production schema change (Addendum 4's deferred item: a new `line_number`-equivalent column seeded under `mushaf=19`, used only in Tajweed mode) is picked up. Not yet built — on hold pending explicit instruction, per the user's request to pause here.

### What NOT to Do (this addendum) — updated

- Do not re-attempt `text_uthmani_tajweed` as a full-text/CSS-color-span rendering technique for Quran page word rendering — confirmed structurally unable to self-justify per-line, regardless of line-grouping source. If revisited, the open question would be a real programmatic justification technique (e.g. inserting Arabic kashida characters at render time), a materially bigger effort than anything explored here.
- Do not resurrect the deleted `test-tajweed-uthmani`/`test-tajweed-mushaf-11` routes or `tajweed-preview-colors.ts` — both approaches they tested are closed.

### Investigation / Verified facts

- `text_uthmani_tajweed` exists at both verse level (`<tajweed class=X>...</tajweed>`, from `verses/by_page/{page}?fields=text_uthmani_tajweed`) and **word level** (`<rule class=X>...</rule>`, from `verses/by_page/{page}?words=true&word_fields=text_uthmani_tajweed`) — confirmed via direct curl against page 343.
- Word `id` is the merge key (already established as stable across mushaf params in Addendum 4) — this test reuses production `getPageWords(page)` (real DB words + real, already-correct `line_number` grouping) and merges in `text_uthmani_tajweed` per word fetched live from QDC, rather than re-deriving verse/word metadata from a live QDC call the way Addenda 4/5's test pages did.
- End-of-verse marker words (`char_type_name: "end"`, e.g. word id 20623 on page 343) have `text_uthmani_tajweed` equal to plain ayah-number digits with no `<rule>` tags — the parser needs no special case for this word type.
- Rule classes present on page 343 (word level): `custom`, `ghunnah`, `ham_wasl`, `idgham_ghunnah`, `idgham_shafawi`, `idgham_wo_ghunnah`, `ikhafa`, `ikhafa_shafawi`, `iqlab`, `laam_shamsiyah`, `madda_normal`, `madda_obligatory_monfasel`, `madda_obligatory_mottasel`, `madda_permissible`, `qalaqah`, `slnt`. Other pages may surface classes not in this list — the parser/color-map must not crash on an unrecognized class.

### Decision Tree / Algorithm (confirmed with user)

**Data flow:**
1. Test page calls production `getPageWords(page)` — real DB words, real `line_number` grouping.
2. Separately fetches QDC `GET https://api.qurancdn.com/api/qdc/verses/by_page/{page}?words=true&word_fields=text_uthmani_tajweed&per_page=100`, builds `Map<wordId, text_uthmani_tajweed>`.
3. Merges onto each DB word by `id` (attaches as an extra, optional field — not part of the shared `WordWithVerse` type, scoped to `QuranWordProps.word`'s type only).
4. Renders through the real, unmodified `QuranSafha`/`QuranLine` — only `QuranWord.tsx` gets a small additive branch.

**Parsing table:**

| Case | Example | Output |
|---|---|---|
| `text_uthmani_tajweed` absent (every real production word today) | — | existing behavior unchanged: `code_v1`/`code_v2` glyph span |
| Present, no `<rule>` tags | `"مِنَ"` | one plain `font-uthmanic` span, no color |
| Present, one tag | `"وَأَ<rule class=ikhafa>نز</rule>َلۡنَا"` | plain "وَأَ" + colored "نز" (ikhafa) + plain "َلۡنَا" |
| Present, multiple separate tags | `"م<rule class=madda_obligatory_mottasel>َا</rule>ٓ<rule class=iqlab>ءَۢ</rule>"` | 4 alternating plain/colored segments |
| Tag class not in the placeholder color map | any unseen class | falls back to a default color, does not crash |

Parser: `/<rule class=([a-z_]+)>(.*?)<\/rule>/g`, walked left-to-right to interleave matched (colored) and unmatched (plain) slices — a plain string with zero matches produces a single untagged segment.

### Files to Change (this addendum)

- `app/utils/tajweed-preview-colors.ts` (new) — `parseTajweedMarkup(markup: string)` (the parser above) and a placeholder `TAJWEED_PREVIEW_COLORS: Record<string, string>` rule-class → hex-color map covering the classes listed above, plus a default fallback color for unrecognized classes. Explicitly not the accurate color-matching pass — arbitrary but visually distinguishable colors only.
- `app/components/QuranWord.tsx` — widen `QuranWordProps.word`'s type to `WordWithVerse & { text_uthmani_tajweed?: string }` (local to this component, not the shared `WordWithVerse` type); when the field is present, render `parseTajweedMarkup(...)` as colored `font-uthmanic` spans instead of the `code_v1`/`code_v2` glyph span. When absent (all real production words), behavior is 100% unchanged.
- `app/[locale]/test-tajweed-uthmani/[page]/page.tsx` (new) — Server Component. Calls `getPageWords(page)` (production hook, unmodified), fetches `text_uthmani_tajweed` per word live from QDC (`cache: "no-store"`, no DB writes), merges by `id` onto the DB words, renders via the real `QuranSafha`. Not linked from any nav — direct-URL-only, matching Addenda 4/5's pattern.

### Constraints (this addendum)

- No schema change, no reseed, no writes to `furqan_quran`/`furqan_app` — read-only investigation, same as Addenda 4/5.
- `getPageWords` itself is not modified — the merge happens only inside the new test route.
- Do not remove or modify the COLRv1 approach, `mushaf=19`/`mushaf=11` test pages, or any Addendum 1–6 behavior — this is purely an additional, independent comparison page. The COLRv1 mode stays production-as-is unless a future addendum decides to pivot.
- Placeholder colors are explicitly not final — accurate rule→color mapping is a separate, still-untouched task (the "color palette matching" item from the original feature ask).

### What NOT to Do (this addendum)

- Do not implement the full production rollout (schema/seed change, removing the COLRv1 font path, ADR supersession, real color palette) in this addendum — explicitly deferred pending visual confirmation.
- Do not special-case the end-of-verse marker word type in the parser — its `text_uthmani_tajweed` is confirmed plain/untagged; the generic parser already handles it.
- Do not add `text_uthmani_tajweed` to the shared `WordWithVerse` type in `app/types/prisma.ts` — keep it scoped to `QuranWordProps.word`'s local type so no other production call site can accidentally rely on a field that only this test route populates.

## Addendum 8 — Diagnostic test page: CPAL palette-slot → rule mapping verification

**Date:** 2026-07-12

Follow-on from the "color palette matching" item deferred in Addendum 7 (last bullet of its Constraints). Investigation (prompted by a user-supplied reference image of a different, real printed colored-tajweed mushaf) initially explored deriving per-character colors from that image, then from aligning `text_uthmani_tajweed` against `code_v1`. Neither was necessary: inspecting the actual COLRv1 font files (`public/fonts/v4/colrv1/ttf/p{n}.ttf`) with `fontTools` found each word-glyph is already built from multiple internally-colored layers (`COLR`/`CPAL` tables, 16 shared palette slots, 6 built-in palettes, identical structure across every page's font file checked). Correlating each word's layer palette indices against its `text_uthmani_tajweed` rule tag(s), across ~600 words on 13 pages, produced a confident rule→slot mapping (see [ADR 0023 Addendum 4](../architecture/adr/0023-tajweed-mushaf-mode.md) for the full table). This addendum builds a throwaway diagnostic page to visually confirm that mapping holds against the real, already-shipped rendering — no schema change, no reseed, no production code touched.

### Decision Tree / Algorithm (confirmed with user)

**Data flow:**
1. `getPageWords(343)` — real production hook, unmodified. `code_v2`/`line_number` for page 343 are already correct in the DB (Addendum 6 locked `mushaf=19` in as shipped) — no live QDC fetch needed for rendering.
2. Separately, live (read-only) fetch: `GET https://api.qurancdn.com/api/qdc/verses/by_page/343?words=true&word_fields=text_uthmani_tajweed&mushaf=2&per_page=300` → `Map<wordId, ruleTag[]>`, parsed with Addendum 7's stack-based tokenizer (not the flat regex it superseded — same nesting bug would otherwise recur).
3. Render through the real, **completely unmodified** `QuranSafha`/`QuranWord` tajweed path (real `getPageFontFamily`, real `FontFaceInjector`, whatever palette the viewer's active theme currently selects — no custom CSS override). This is checking whether *today's shipped default* already matches the derived mapping, not proposing new colors.
4. Below the rendered page: a plain HTML debug table, one row per word in reading order — word (`text_uthmani`), QDC rule tag(s) (comma-separated if the word has more than one), predicted color name + confidence % (from the ADR 0023 Addendum 4 table), actual hex (palette 0). A rule/word with no entry in the mapping table (e.g. tafkheem, or a rule tag not in the 13 resolved above) renders as "unmapped" rather than guessing or crashing.

### Files to Change (this addendum)

- `app/[locale]/test-tajweed-palette/page.tsx` (new) — Server Component, hardcoded to page 343 (no dynamic `[page]` segment). Calls `getPageWords(343)`, fetches `text_uthmani_tajweed` live from QDC (`cache: "no-store"`, no DB writes) and merges by word `id`, renders via the real `QuranSafha`, then a debug table below it as described above.
- `app/utils/tajweed-rule-colors.ts` (new) — the rule→{slot, colorName, confidence} lookup table from ADR 0023 Addendum 4, plus the shared-with-Addendum-7 stack-based `<rule>` tokenizer (or import/reuse it if still present; Addendum 7 deleted `tajweed-preview-colors.ts` itself, but the tokenizer logic is small enough to recreate here scoped to this file — this file does not resurrect the deleted CSS-rendering approach, only its tag-parsing logic, for a read-only comparison label, not for rendering text).

### Constraints (this addendum)

- No schema change, no reseed, no writes to `furqan_quran`/`furqan_app` — read-only, same as Addenda 4/5/7.
- Do not modify `QuranWord.tsx`, `QuranSafha.tsx`, `FontFaceInjector.tsx`, or `globals.css` — this addendum only adds a new, isolated route plus a debug table; the rendered page above the table must be pixel-identical to production Tajweed-mode output today.
- Do not introduce a custom `@font-palette-values` override in this addendum — the point is verifying the *existing shipped default* against the derived mapping, not previewing a new palette. A future addendum can add override tooling once the mapping is confirmed.
- Not linked from any nav/sidebar — direct-URL-only, matching Addenda 4/5/7's pattern.
- Do not resurrect `app/utils/tajweed-preview-colors.ts` (deleted in Addendum 7) or its CSS-span rendering approach — this addendum's tokenizer is for parsing a label only, never for rendering Quran text.

### What NOT to Do (this addendum)

- Do not implement palette-override wiring (`@font-palette-values` `override-color`) yet — this addendum is diagnostic only, confirm the mapping visually first.
- Do not treat the <100%-confidence rows (`ikhafa`, `idgham_wo_ghunnah`, `idgham_shafawi`, `ham_wasl`, `idgham_ghunnah`) as final — they're provisional per ADR 0023 Addendum 4 until spot-checked further.

## Addendum 9 — Root cause found: why `code_v2` can't self-justify like `code_v1`; colorized + always-edge-to-edge is not achievable with current assets

**Date:** 2026-07-12

Addenda 2–3 measured that `code_v2` lines are far less width-consistent than `code_v1` (7.7% CV vs 2.7% CV) and worked around it by centering rather than force-stretching (space-between demonstrably shifts words off authentic positions). Those addenda never established *why* the two fonts differ this way. This addendum answers that, prompted by the user asking whether Tajweed-colored text could ever reach full width the way normal (`code_v1`) text does.

### Investigation

Inspected both font files directly with `fontTools`:

- `public/fonts/v1/ttf/p343.ttf` (`code_v1`, the base/non-tajweed font): tables include `just`, `morx`, `feat`, `prop` — Apple AAT (Advanced Typography) tables. `just` specifically is Apple's justification table: it carries the font's own kashida-insertion-point/stretch data, consumed by the text-shaping engine to fill a line to a target width. This — not luck or manual CSS — is why `code_v1` lines self-justify so consistently. This font has **no** `COLR`/`CPAL` tables at all — it cannot be recolored by any means; a word is one glyph with one fixed outline and no paint layers.
- `public/fonts/v4/colrv1/ttf/p343.ttf` (`code_v2`, the Tajweed COLRv1 font): has `COLR`/`CPAL` (confirmed in ADR 0023 Addendum 4 — this is what makes per-rule coloring possible at all) but is **completely missing** `just`/`morx`/`feat`/`prop`. It has no AAT justification data — its line width is whatever the glyph outlines' natural advance-widths sum to, with no engine-level stretching mechanism. This is the direct, font-level cause of Addendum 2's 7.7%-CV measurement: it isn't that this font's kashida is "less precisely calibrated" than `code_v1`'s, it's that the justification mechanism itself isn't present in the file.

Also checked whether the reference project (quran.com-frontend-next, the source this feature was ported from) solved this: it hasn't. Its own CSS approach — a hardcoded per-scale line-width lookup table (`$line-width-map`) + `text-align: center` (Addendum 3's finding) — is the same trade-off Furqan already ships. This is an asset-level limitation shared across the ecosystem, not something specific to Furqan's implementation.

### Conclusion

**A Quran page that is both Tajweed-colored and reaches full width on every line, with the font assets currently available, is not achievable.** The two properties currently live in two different, incompatible font files:

| Font | `COLR`/`CPAL` (color) | `just`/`morx`/`feat`/`prop` (self-justify) |
|---|---|---|
| `code_v1` (`v1/ttf/p{n}.ttf`) | No | Yes |
| `code_v2` (`v4/colrv1/ttf/p{n}.ttf`) | Yes | No |

Getting both in one rendering would require constructing a font that has both table sets — splicing `code_v1`'s AAT justification tables (and/or its outlines) onto `code_v2`'s COLR/CPAL-layered glyphs (or vice versa) — a real font-engineering task, not attempted in this session, and not something either Furqan or the reference project has a ready asset for.

### Decision

Not pursued in this session. Current shipped behavior (Addendum 3: center each Tajweed-mode line, don't force-stretch it) stands as the accepted trade-off. Building a merged font is a real, larger option for the future if edge-to-edge Tajweed lines become a priority — not started, no design done beyond identifying it as the only path.

### What NOT to Do (this addendum)

- Do not attempt any further CSS-only fix (gap insertion, width tricks, etc.) for full-width Tajweed lines — confirmed by Addendum 3 (visual shift) and this addendum (missing font-level justification data) to be structurally unfixable from CSS alone.
- Do not assume `code_v1`'s font could be recolored — it has no `COLR`/`CPAL` tables whatsoever; the "render `code_v1` but colorize it" idea (raised and clarified mid-session) is not achievable with the current asset, full stop, regardless of the color data source.

## Addendum 10 — Production wiring of `mushaf=19` line-layout data (the schema change deferred since Addendum 4/6)

**Date:** 2026-07-12

Picks up the item Addendum 4 deferred and Addendum 6 locked the mushaf choice for: stop relying on the throwaway diagnostic test pages' live QDC fetch for tajweed-mode line grouping, and get `mushaf=19`'s `line_number` seeded into Furqan's own DB so production Tajweed-mode rendering uses it.

### Investigation

- **Word `id` is stable across mushaf params** (already established, Addendum 4/7) — confirmed again directly: diffed `mushaf=2` vs `mushaf=19` word-id sets for page 343 (153/153 match) and page 106 (128/128 match, chosen because it's a mid-page surah transition — An-Nisa ends / Al-Ma'idah begins mid-page). A second, generic per-mushaf side table keyed by `word_id` is viable without touching the main verse/word seed pass.
- **QDC does not expose `line_type`/`is_centered` at all** — explicitly requested as `word_fields` against the live API; QDC silently drops unrecognized field names rather than erroring, and neither appears in the response. No dedicated per-line-layout QDC endpoint exists either (`/mushafs/{id}/pages/{page}` and `/verses/filter?mushaf=...&page=...` both 404/empty). Getting those two fields (which would help the separate, still-deferred Trello #72 surah-banner-placement task) would require sourcing an entirely different dataset, not a QDC field addition — **explicitly out of scope for this addendum**, decided with the user. This addendum stores `line_number` only.
- **Rendering architecture constraint:** all 604 Quran pages are statically generated once at build time (Static Generation Strategy decision); `tajweedMode` is a pure client-side `localStorage` toggle with no per-request server awareness. Both line groupings (default + tajweed) must therefore already be present in the page's static props — there's no "refetch on toggle" option.
- **Surah-banner interaction, verified concretely:** `QuranSafha`'s banner/bismillah placement (lines ~167-228) infers position from *gaps* in whichever 1-15 line-number sequence it's given — a generic algorithm, not banner-specific logic keyed to `mushaf=2`. Spot-checked page 106 (the one page in this investigation with an actual mid-page surah gap): the gap sits at lines 6-7 under **both** `mushaf=2` and `mushaf=19` groupings, even though 6 other words on the page shift line by ±1 between the two. This confirms the gap-detection algorithm itself needs no changes — it just needs to run against the correct grouping when tajweed mode is active.

### Decision Tree / Algorithm (confirmed with user)

**Schema** (`prisma/quran/schema.prisma`) — generic per-mushaf line layout, not tajweed-specific, so a future mushaf edition's line data is a new row set, not a new column/table:

```prisma
model WordMushafLayout {
  id          Int  @id @default(autoincrement())
  word_id     Int
  mushaf_id   Int
  line_number Int
  word        Word @relation(fields: [word_id], references: [id])

  @@unique([word_id, mushaf_id])
  @@map("word_mushaf_layouts")
}
```

`Word` gains a back-relation: `mushafLayouts WordMushafLayout[]`.

**Seeding** — new step in `scripts/quran-seed/`, run after `words` are inserted (FK dependency on `word_id`):
1. Loop all 604 pages, `GET verses/by_page/{page}?words=true&word_fields=line_number&mushaf=19&per_page=all` (same fetch/retry pattern as `verses-words.js`).
2. Build rows `{ word_id: word.id, mushaf_id: 19, line_number: word.line_number }`.
3. **Assert the fetched word-id set matches the already-inserted `mushaf=2` word set for that page** — fail hard (throw) on any mismatch, matching the seeder's existing fail-hard philosophy (`docs/architecture/adr/0009-reproducible-quran-seeder.md`). A silent mismatch here would corrupt tajweed-mode rendering invisibly (words missing a layout row).
4. `seed.js`: insert via the existing `insertChunked` helper, as a new step after `words`, before `rubs`.

**Rendering** — narrower than initially proposed; only one file changes shape:
- `getPageWords` (`app/hooks/get-page-words.ts`) keeps its exact current return shape (`{ lines, pageMetadata }`, still grouped by the existing `line_number`) — every other consumer (`ReaderPage`, `QuranSpread`, `QuranPage`, `test-tajweed-palette`) is untouched. It fetches `mushafLayouts: { where: { mushaf_id: { in: LAYOUT_MUSHAF_IDS } } }` and maps each word to a `layouts: Record<number, number>` map (mushafId → lineNumber), using `Object.fromEntries`. Only mushafs with divergent line groupings are in `LAYOUT_MUSHAF_IDS` (currently `[19]`); mushaf=2's grouping always comes from `Word.line_number` directly.
- `QuranSafha.tsx` is the only place that re-groups: `const activeLines = tajweedMode ? groupBy(Object.values(lines).flat(), w => w.layouts[19] ?? w.line_number) : lines;` — every reference in the component that currently reads `lines` for line-keyed rendering/gap-detection/banner logic switches to `activeLines`. The `wordClicked` verse-snippet lookup (`Object.values(lines).flat()`, line ~116) stays on `lines` — it's a flat full-page word list, mode-independent.

**Cleanup** (superseded by real seeded data):
- Delete `app/[locale]/test-tajweed-mushaf/[page]/page.tsx` (Addendum 4) — its whole purpose was standing in for this schema change.
- Delete `app/[locale]/test-tajweed-mushaf-11/[page]/page.tsx` (Addendum 5) — already flagged in Addendum 6 as pending a future cleanup pass; this is that pass.
- `app/[locale]/test-tajweed-palette/page.tsx` (Addendum 8) is **not** touched — different concern (CPAL color mapping), unaffected by this change, still calls the real `getPageWords`.

### Verified Test Cases

| Page | Words | Word-id sets match (mushaf=2 vs 19)? | `line_number` diffs | Surah-banner gap |
|---|---|---|---|---|
| 343 | 153 | yes | 36 words (23%) land on a different line | none on this page (all 15 slots occupied both ways) |
| 106 (An-Nisa → Al-Ma'idah, mid-page transition) | 128 | yes | 6 words shift line | **identical gap at lines 6-7 in both groupings** — confirms the existing generic gap-detection algorithm requires no logic change, only needs to run against `activeLines` |

### Files to Change

- `prisma/quran/schema.prisma` — new `WordMushafLayout` model + `Word.mushafLayouts` back-relation.
- `scripts/quran-seed/` — new file (e.g. `tajweed-layout.js`) fetching `mushaf=19` `line_number` per word for all 604 pages, with the word-id-set integrity check described above.
- `scripts/quran-seed/seed.js` — call the new fetch/insert step after `words`, before `rubs`; update the final summary log line to include the new table's row count.
- `app/hooks/get-page-words.ts` — fetch `mushafLayouts` for all `LAYOUT_MUSHAF_IDS`; map each word to a `layouts: Record<number, number>` map; widen the `PageWords`/word type accordingly (`WordWithLayouts = WordWithVerse & { layouts: Record<number, number> }`).
- `app/components/QuranSafha.tsx` — compute `activeLines` (as above) and switch all line-keyed rendering/gap-detection/banner logic to read from it instead of `lines`.
- `app/[locale]/test-tajweed-mushaf/[page]/page.tsx` — deleted.
- `app/[locale]/test-tajweed-mushaf-11/[page]/page.tsx` — deleted.
- `docs/architecture/adr/0023-tajweed-mushaf-mode.md` — new addendum recording the QDC field-availability finding and the static-generation/dual-grouping architecture decision (this planning pass).
- `docs/architecture/DECISIONS.md` — Tajweed Mushaf Mode section's "Not yet built" bullet updated to reflect this plan.

### Constraints

- Never touch `Word.line_number` (the existing mushaf=2 default) — it stays the single source of truth for non-tajweed rendering and every consumer that isn't `QuranSafha`'s tajweed branch.
- `WordMushafLayout` must stay generic (`mushaf_id` a plain int, not an enum or a tajweed-specific column name) — but do not fetch or store `line_type`/`is_centered` as part of this addendum; that data source is unidentified and belongs to the separate, still-deferred Trello #72 task.
- Do not change `getPageWords`'s return shape (`{ lines, pageMetadata }`) or move grouping out of it for the default case — only `QuranSafha` re-groups, and only when `tajweedMode` is true.
- The seeder's new mushaf=19 fetch step must fail hard (throw), not silently skip, if a page's fetched word-id set doesn't match the already-inserted `mushaf=2` word set for that page.
- Do not implement palette-override or merged-font work (Addenda 5/9) as part of this addendum — unrelated, separate future work already tracked there.

### What NOT to Do

- Do not conflate this addendum's scope with Trello #72 (surah banner `line_type`/`is_centered`) — that data source was investigated and confirmed unavailable from QDC; pursuing it is a separate, not-yet-scoped task.
- Do not resurrect `test-tajweed-mushaf`/`test-tajweed-mushaf-11` after deleting them — their purpose (proving `mushaf=19` line data renders correctly) is now served by real production data.
- Do not duplicate the entire `lines` map into a second `tajweedLines` map returned from `getPageWords` — rejected during planning as needlessly doubling the static per-page payload (each word already carries a nested `verse`→`chapter` object); the single-extra-scalar-field + client-side-regroup approach above was chosen instead.

### Implementation note

**Date:** 2026-07-12

All code changes are implemented and pass `tsc --noEmit`/`npm run lint`. Two things surfaced during implementation that weren't anticipated in planning:

1. **A third word-fetching path existed**: `app/api/quran/pages/[pageId]/route.ts` (used by the vertical/virtualized reader's `usePage` hook) had its own independent copy of `getPageWords`'s query, predating it — not just a consumer, an un-synced duplicate. Left as originally planned, Tajweed mode on that reader would have silently broken (missing `layouts` map). Fixed by having the route call `getPageWords` directly instead of re-querying — this also permanently prevents the two from drifting apart again. `app/hooks/use-quran-page.ts`'s hand-declared `PageData` type was likewise replaced with `PageWords` (imported `type`-only) for the same reason.
2. `QuranLine.tsx`/`QuranWord.tsx` had their own `WordWithVerse`-typed props (not `WordWithLayouts`) — widened to match, since every word flowing through them via `QuranSafha` now always carries the `layouts` map.

**Seeder run, with one design fix along the way.** The first `npm run seed:quran -- --force` run failed its own integrity check: page 120 under `mushaf=19` had 156 words vs. 132 under `mushaf=2` — not a line-grouping difference like the pages spot-checked during planning (343, 106), but a genuine **page-boundary** disagreement (verse 5:77's words are on `mushaf=2`'s page 121 but `mushaf=19`'s page 120; same word ids either way). The per-page validation in `tajweed-layout.js` was too strict for this case. Fixed by aggregating `word_id → line_number` **globally** across all 604 of `mushaf=19`'s own pages first (ignoring which page number each mushaf attributes a word to), then checking afterward that every already-seeded word resolved somewhere in that global map — falling back to the word's own `line_number` (already-built-in `getPageWords` default) only for any leftover unresolved word, with a warning logged rather than a hard failure. Re-ran successfully: `words=83665`, `word_mushaf_layouts=83665` — exact match, zero fallback warnings, every word got a real `mushaf=19` line number.

Note for future seeder runs: because the schema-reset step (`prisma db push --force-reset`) runs before the fetch/validate steps, a failure during fetching (as happened here) leaves `furqan_quran` schema-reset but data-empty until a run completes successfully end-to-end. Not a data-loss risk (`furqan_quran` is always fully reproducible from QDC, per ADR 0009) but worth knowing if a run is interrupted.

<!-- Addendum 11 (palette-color overrides) was reverted; Addendum 12 (legend) was never implemented and depended on it. Both removed. -->

