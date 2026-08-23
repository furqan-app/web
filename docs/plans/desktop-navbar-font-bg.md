# Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation

**Type:** design
**Date:** 2026-08-19
**Status:** implemented
**Issue:** [#337](https://github.com/furqan-app/web/issues/337)

## Summary

Iterative, screenshot-driven polish pass on the nav bar, search, and recitation bar — mostly desktop,
with one mobile spacing regression fixed along the way. No single problem statement; each change below
was a discrete round-trip against a screenshot. Retroactively documented here (implemented before this
doc existed) so the branch has a plan on record and the pattern it establishes (per-theme CSS custom
properties for chrome surfaces) is discoverable for future nav work.

## Changes

### Shared "icon chip" control style (logo + recitation play button)

`FurqanLogo.tsx` and `RecitationPlayerBar.tsx`'s play/pause button now share one look: `1px solid
hsl(var(--primary))` border, `hsl(var(--primary-foreground))` icon color, and a background that must
read differently per theme to stay legible — solid `--primary` fill on light/gold (a translucent tint
washed out against their pale background), translucent `hsl(var(--primary) / 23%)` on dark (near-black
nav gives enough contrast already). Implemented as:

- `--nav-icon-chip-bg` custom property, declared per theme in `app/globals.css` (mirrors the
  pre-existing `--nav-tab-bg` token's same light/gold-solid vs dark-translucent split).
- `.fq-icon-chip` shared class consuming it, applied to both components' `className` (no more inline
  `style` props — the first pass used hardcoded literal HSL values per the user's exact spec, which
  baked in light/dark's shared `--primary` value as a constant and broke on gold theme; fixed by
  deriving from the CSS variables instead).

### Surah-selector ornament: explicit ADR 0031 exception

The surah-toggle pill (`Nav.tsx`, `.fq-surah-toggle`) grew ornament flourishes either side on desktop,
using the mushaf's decorative mask PNG, colored via `--mushaf-ornament` (the same token the reader
page's own ornament glyphs use). [ADR 0031](../architecture/adr/0031-dark-theme-gold-emerald-semantics.md)
confines gold to the reader page in dark theme with "no exceptions in chrome," and this pill lives in
the nav bar (chrome) — flagged in review. A `--nav-ornament` token that resolved to emerald on dark
(gold unchanged on light/gold) was implemented to comply, then explicitly reverted by the user back to
gold on all four themes, including dark — a deliberate, user-requested exception to ADR 0031 for this
one control (recorded in `DECISIONS.md`). Do not reintroduce the emerald-on-dark variant without a new
request.

### Mobile nav spacing fix

The same ornament boxes (45px wide, `left/right: -30px`) were sized for the desktop pill's `md:px-10`
padding and, left unconditional, overflowed into the neighboring mobile icons (hamburger, search,
overflow menu all read as cramped/overlapping). Gated the whole ornament block behind
`@media (min-width: 768px)` — mobile keeps the original compact single-line pill with no ornaments.

### `.fq-recitation-active-word` visibility

Background opacity raised `0.22 → 0.4` — the word-level recitation highlight was too faint to track
while listening.

### Nav bar layout

- Shadow: flat `shadow` + `border-b` replaced with a layered drop shadow
  (`shadow-[0_8px_30px_-4px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.08)]`), matching
  `RecitationPlayerBar`'s treatment so the two floating bars read as one consistent style.
- Surah-selector pill: desktop gets a two-line layout (surah name over "Juz N • Hizb M"), centered on
  the bar's own midpoint via `md:absolute` + transform (not flex-flow centering — the row has unequal
  content on either side, per the comment in `Nav.tsx`). Mobile keeps the single-line pill. Juz/Hizb is
  new data, threaded through `SidebarContext` (`currentJuzHizb`) from `Sidebar.tsx`'s existing
  `currentRub` lookup (arithmetic only — `rub_number` is 1–240, 8 rubs/juz, 4 rubs/hizb — no new fetch).
- Search moved out of its own isolated `flex-1` gap (built for the old wide inline field) into the same
  end cluster as fullscreen/menu, now that it's icon-only — an isolated icon in dead space read as
  broken.
- Fullscreen toggle: dropped its per-instance `hover:bg-transparent hover:text-foreground` override.

### Search bar simplification

`SearchBar.tsx` dropped the old two-implementation split (persistent desktop inline field with
click-outside handling + separate mobile full-screen overlay) for one icon trigger at every breakpoint
that opens the same full-screen overlay — matches the reference design (bare icons, no persistent
inline field) and removes an entire `useRef`/click-outside-listener code path.

### Ghost/icon button hover, deduplicated

`components/ui/button.tsx` gained a `compoundVariants` entry: `variant: "ghost", size: "icon"` now gets
`hover:bg-transparent hover:text-foreground` globally — the default ghost hover
(`hover:bg-accent hover:text-accent-foreground`) rendered as unintended green in dark theme
(`--accent-foreground` is a teal/green tone) on every icon-only button. Call sites that had this
override applied by hand (`Nav.tsx` fullscreen toggle, `NavOverflowMenu.tsx` trigger) had the duplicate
className removed — the compound variant is now the single source of truth.

### Menu row hover regression, fixed

`NavPillLink.tsx`'s `menuRowClassName` (the shared row shape for every item inside the "More" overflow
sheet — My Marks, My Plans, Sign out/in, Settings, shared-mushaf link, notification bell) lost its
`hover:bg-accent/50` in the same pass that removed it from icon buttons, but — unlike the icon buttons —
got no replacement, leaving every full-width row with zero hover feedback. Restored as `hover:bg-muted`
(a neutral surface color already used elsewhere in this component family, e.g. `SettingsSidebar.tsx`'s
section wrappers — doesn't carry the accent-foreground green-tint risk the original removal was
targeting).

### Minor

- `ContinueReadingLink.tsx`: dropped `fq-nav-tab`-style padded-pill background on desktop (now a plain
  icon control, matching search); `flex-row-reverse` swaps icon/label visual order without touching DOM
  order (icon still hits screen readers first).
- `UserMenu.tsx`: dropped the extra `md:border md:border-border` on top of `navPillClassName`'s own
  `fq-nav-tab` background (redundant double-framing).
- `SettingsSidebar.tsx`: dropped a stray `hover:bg-accent` on the settings trigger button (same green-
  in-dark-theme issue as above, just not routed through the shared compound variant since this one
  predates it).
- `public/icons/surah-ornament-mask.png`: new asset, the ornament mask referenced above.

## Files Changed

- `app/globals.css` — `.fq-icon-chip`, `--nav-icon-chip-bg` (×4 themes), `.fq-surah-toggle` ornament
  rules (desktop-gated, `--mushaf-ornament` — gold on all four themes, see Decisions Made below),
  `.fq-recitation-active-word` opacity.
- `app/components/nav/Nav.tsx` — shadow, surah-toggle two-line layout + a11y (raw `<button>` needed
  `cursor-pointer`/`focus-visible:*`/`transition-colors` added back by hand since it no longer routes
  through `Button`), search relocation, fullscreen hover cleanup.
- `app/components/nav/FurqanLogo.tsx`, `app/components/RecitationPlayerBar.tsx` — `.fq-icon-chip`.
- `app/components/search/SearchBar.tsx` — single icon-trigger + overlay, dropped desktop inline variant.
- `app/components/nav/ContinueReadingLink.tsx`, `UserMenu.tsx`, `NavPillLink.tsx`,
  `NavOverflowMenu.tsx`, `SettingsSidebar.tsx` — hover/framing cleanup (see Minor + Menu row above).
- `app/components/nav/Sidebar.tsx`, `app/contexts/SidebarContext.tsx` — `currentJuzHizb` plumbing.
- `components/ui/button.tsx` — `ghost`+`icon` compound variant for hover.
- `public/icons/surah-ornament-mask.png` — new asset.

## Decisions Made

- Per-theme CSS custom properties (`--nav-icon-chip-bg`) are the established pattern for any chrome
  surface that can't use one fixed color/opacity across all four themes — light/gold need solid or
  theme-native colors where dark can get away with a translucent primary tint. Extend this pattern,
  don't reach for inline styles or per-component theme branching, the next time a chrome control needs
  per-theme tuning.
- Surah-toggle ornament color is a **deliberate, user-requested exception to ADR 0031**: gold on all
  four themes, including dark, via `--mushaf-ornament` directly (see the ornament section above and
  `DECISIONS.md`). An emerald-on-dark `--nav-ornament` token was implemented first to comply with the
  ADR, then explicitly reverted — do not reintroduce it without a new request.
- A decorative bottom-right animated smoke/ambient element was explored (extracted from a GIF, rebuilt
  as an alpha-transparent animated WebP, scoped to reader routes only) and then explicitly rejected by
  the user ("doesn't look good") — removed entirely, including the middleware matcher exclusion added
  for its asset path. Not revisited without a new request.

## What NOT to Do

- Do not reintroduce an emerald-on-dark `--nav-ornament` token for the surah-toggle pill — the user
  explicitly reverted that in favor of gold on all themes; see Decisions Made above.
- Do not add hover-state removals to a shared class (`menuRowClassName`, `navPillClassName`, button
  variants) without checking every consumer gets a replacement — the `menuRowClassName` regression above
  happened exactly this way.

---

## Addendum 2: Lab-Style Green CSS Ornament & Surah Font (2026-08-22)

**Status:** implemented

### Summary
Adopt the Reader Lab's pure-CSS drawn manuscript ornaments and layout for the navbar surah toggle button:
1. Replace raster `surah-ornament-mask.png` with drawn CSS ornaments (`.fq-nav-ornament`): tapering hairline rules with open 45° diamonds styled in emerald green (`--primary`).
2. Use `font-surahnames` (`sura_names.ttf`, zero-padded 3-digit surah code) for the surah name in Arabic/RTL.
3. Retain the toggle arrow (`ChevronDown` / `ChevronUp`) to signal menu expansion.
4. Remove the boxed pill background on desktop in favor of an unboxed, centered group on the navbar surface.

---

## Addendum 3: Continue Reading Icon/Weight, Group Dividers, and Logo Size (2026-08-22)

**Status:** implemented

### Summary
Refine navbar elements to match user visual feedback:
1. Continue Reading link uses `Bookmark` save icon at `size-4`, with unweighted `font-normal text-xs` label.
2. Vertical dividers (`h-4 w-px bg-border`) separate logical icon groups on desktop.
3. Medallion logo inner image increased to `size-[24px]` for crisp visibility.

---

## Addendum 4: Green 32px Logo with Navbar Background (2026-08-22)

**Status:** implemented

### Summary
Restyle the `FurqanLogo` component:
1. Render the logo silhouette in emerald green (`--primary`) via CSS mask on `logo-navbar-white.png`.
2. Increase logo mark to 32px size (`size-[32px]`) for clear visibility.
3. Remove the dark medallion background and gold rim, setting the background to match the navbar (`bg-transparent`).




