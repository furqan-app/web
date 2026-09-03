---
title: "Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation"
type: feature
date: 2026-08-19
status: implemented
area: nav
issue: 337
---

# Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation

## Summary

Iterative, screenshot-driven polish pass on the nav bar, search, and recitation bar — mostly desktop,
with one mobile spacing regression fixed along the way. No single problem statement; each change below
was a discrete round-trip against a screenshot. Retroactively documented here (implemented before this
doc existed) so the branch has a plan on record and the pattern it establishes (per-theme CSS custom
properties for chrome surfaces) is discoverable for future nav work.

## Changes

### `.fq-icon-chip` control style (recitation play button)

The recitation play/pause button (`RecitationPlayerBar.tsx`) uses `.fq-icon-chip`: `1px solid hsl(var(--primary))` border, `hsl(var(--primary-foreground))` icon colour, and `--nav-icon-chip-bg` — a per-theme custom property (solid `--primary` fill on light/gold where a translucent tint washes out; translucent `hsl(var(--primary) / 23%)` on dark) declared in `app/globals.css`, mirroring the `--nav-tab-bg` split. No inline `style` props — the first pass hardcoded literal HSL per the user's spec, which baked light/dark's shared `--primary` value in and broke on gold. `FurqanLogo` originally shared this chip; it was later restyled (see below) to a bare 32px green silhouette with no chrome.

### Surah-selector ornament (CSS drawn, ADR 0031 exception)

The flanking surah-toggle ornaments are **pure CSS** (`.fq-nav-ornament`): tapering hairline rules with open 45° diamonds, styled emerald green (`--primary`) — adopted from the Reader Lab, replacing the earlier raster `surah-ornament-mask.png` mask. They are anchored **outside** the toggle capsule so the brand framing survives the capsule restyle. Desktop-gated (`@media (min-width: 768px)`) — mobile keeps the compact single-line pill with no ornaments (the 45px raster boxes at `left/right: -30px` overflowed into the mobile icons).

_(Historical: the first pass used the mushaf's decorative mask PNG coloured via `--mushaf-ornament`; flagged in review since ADR 0031 confines gold to the reader page in dark ("no exceptions in chrome") and this is nav chrome. An emerald-on-dark `--nav-ornament` token was built to comply, then reverted to gold on all four themes at the user's request — a deliberate ADR 0031 exception, recorded in DECISIONS.md — before Addendum 2 replaced the whole raster approach with the emerald CSS `.fq-nav-ornament`.)_

### FurqanLogo (32px green silhouette)

`FurqanLogo` renders the logo silhouette in emerald green (`--primary`) via a CSS `mask` on `logo-navbar-white.png`, `size-[32px]`, **no dark medallion background, no gold rim** — `bg-transparent`, sitting on the navbar surface directly.

### Surah toggle capsule (click affordance, #430)

The centered desktop Surah + Juz/Hizb control is a `rounded-full` **translucent capsule** — `bg-[var(--nav-tab-bg)] border border-border/70 shadow-sm`, `group-hover:bg-muted/70 group-hover:border-border`, `active:scale-[0.98]` press feedback, and a `ChevronDown` that rotates 180° (`transition-transform duration-200`) when `open`. It previously rendered `md:bg-transparent md:border-transparent md:shadow-none` and read as a static manuscript header, so users never discovered it opens the Surah & Juz drawer. Centering stays `md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10` (the row has unequal content on either side). `font-surahnames text-[26px]` for Arabic, `text-[17px] font-semibold` Latin; `aria-expanded={open}`, `aria-label`, `fq-focus-ring`.

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

### Continue Reading link + group dividers

- `ContinueReadingLink.tsx`: dropped the `fq-nav-tab` padded-pill background on desktop (plain icon control, matching search); `flex-row-reverse` swaps icon/label visual order without touching DOM order. Final icon is `Bookmark` (save icon) at `size-4` with an unweighted `font-normal text-xs` label.
- Vertical dividers (`h-4 w-px bg-border`) separate logical icon groups on desktop.

### Minor
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
- Do not go back to a raster ornament mask for the surah toggle — the CSS `.fq-nav-ornament` (emerald, drawn) replaced it (Addendum 2).
- Do not restore `FurqanLogo`'s dark medallion background or gold rim — it is a bare 32px green silhouette on the navbar surface (Addendum 4).
- Do not render the desktop surah control `md:bg-transparent` again — it must read as a clickable capsule (#430, Addendum 5).

## Revision History

- 2026-08-22 — folded Addendum 2 (Lab-style green CSS ornament & surah font). **Supersedes the raster `surah-ornament-mask.png` mask** — the flanking ornaments are now pure CSS (`.fq-nav-ornament`: tapering hairline rules + open 45° diamonds, emerald `--primary`); `font-surahnames` for the Arabic surah name; the boxed pill background dropped for an unboxed centered group.
- 2026-08-22 — folded Addendum 3: Continue Reading uses the `Bookmark` icon at `size-4` / `font-normal text-xs`; `h-4 w-px bg-border` vertical dividers between icon groups; medallion inner image `size-[24px]` (before Addendum 4 removed the medallion).
- 2026-08-22 — folded Addendum 4 (green 32px logo). **Supersedes `FurqanLogo`'s `.fq-icon-chip` / medallion treatment** — the logo is now an emerald silhouette via CSS `mask` on `logo-navbar-white.png`, `size-[32px]`, `bg-transparent`, no dark medallion, no gold rim.
- 2026-08-26 — folded Addendum 5 (translucent capsule surah toggler, #430). **Supersedes the `md:bg-transparent md:border-transparent md:shadow-none` unboxed group** — the centered Surah + Juz/Hizb control is a `rounded-full` translucent capsule (`--nav-tab-bg` bg, hairline border, `group-hover:bg-muted/70`, `active:scale-[0.98]`, animated chevron) so it reads as a clickable drawer toggle. The flanking `.fq-nav-ornament` stays anchored outside it.





