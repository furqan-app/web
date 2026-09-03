---
name: Furqan
description: A manuscript-inspired, word-focused Quran reading app
colors:
  primary: "hsl(169 88% 26%)"
  primary-foreground: "hsl(0 0% 100%)"
  background: "hsl(214 26% 86%)"
  foreground: "hsl(209 36% 14%)"
  card: "hsl(0 0% 100%)"
  card-foreground: "hsl(209 36% 14%)"
  secondary: "hsl(210 20% 93%)"
  muted: "hsl(212 20% 91%)"
  muted-foreground: "hsl(209 15% 44%)"
  accent: "hsl(165 53% 93%)"
  accent-foreground: "hsl(169 88% 26%)"
  destructive: "hsl(0 72% 50%)"
  border: "hsl(212 20% 85%)"
  overlay: "hsl(213 30% 25%)"
  warning: "hsl(32 74% 29%)"
  warning-foreground: "hsl(40 84% 95%)"
typography:
  ui:
    fontFamily: "IBM Plex Sans Arabic, system-ui, sans-serif"
    fontWeight: 400
  ui-emphasis:
    fontFamily: "IBM Plex Sans Arabic, system-ui, sans-serif"
    fontWeight: 700
  quran-word-on-page:
    fontFamily: "quran-p{pageId} (per-page glyph font)"
  quran-standalone:
    fontFamily: "UthmanicHafs1Ver18, serif"
  surah-name:
    fontFamily: "sura_names (glyph-per-surah-number)"
rounded:
  sm: "calc(0.5rem - 4px)"
  md: "calc(0.5rem - 2px)"
  lg: "0.5rem"
  card: "20px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  nav-arrow:
    backgroundColor: "{colors.card}"
    rounded: "9999px"
    size: "52px"
    height: "52px"
    width: "52px"
---

# Design System: Furqan

> Hand-maintained token summary of `docs/design/design-principles.md`. No generator — update this file when tokens or design rules change there.

## Overview

**Creative North Star: "The Reading Desk"**

Furqan is built to feel like sitting down with a real, physical mushaf — not a generic SaaS reading pane. Every surface commits to that: pages are print-accurate rather than reflowed, cards carry paper-like depth (rim light, sheet stack, binding crease) instead of a flat drop shadow, and the single unified emerald green accent is used the way ink would be used on a real page — deliberately and with manuscript craftsmanship. Chrome (nav, dialogs, settings) is quiet and structured; the mushaf reader itself is where the craft concentrates.

The system runs three parallel themes — light, gold, dark — each a complete, independently tuned palette rather than a light/dark pair with a tint swapped in. Light is a modern, cool-neutral reading surface; gold owns the traditional illuminated-manuscript register; dark is calibrated to carry page depth from light and warm rims rather than flat drop shadows on near-black backgrounds.

**Key Characteristics:**
- Unified emerald accent system (`--primary` and semantic green scales across all three themes)
- Print-accurate mushaf pages — never a reflowed text stream
- Paper-like depth via rim/sheet/crease tokens, not conventional box-shadow, wherever a shadow would be structurally invisible
- Three complete, independently-tuned theme palettes (light / gold / dark)
- Manuscript ornamentation (drawn ornaments, 8-pointed star rosette medallions) crafted to elevate reading surfaces

## Colors

Three named themes (`.theme-light`, `.theme-gold`, `.theme-dark` on `<html>`), each defining the full shadcn token set as an HSL triplet consumed via `hsl(var(--token))`. Default theme is **light** (with a first-visit `prefers-color-scheme: dark` fallback to dark); user choice persists. HSL is the project's canonical color format — do not restate values as hex in code.

### Primary
- **Reading Emerald** (`hsl(169 88% 26%)` / #087d67, light theme): the single interactive accent — primary buttons, links, focus rings, active states. Same role, different exact hue per theme (gold theme: `hsl(168 72% 24%)` / #116958; dark theme: `hsl(169 88% 26%)` / #087d67).

### Neutral (per theme)
- **Light** — background `hsl(210 36% 95%)` (#eef2f7), card `hsl(0 0% 100%)` (#ffffff), foreground `hsl(209 36% 14%)` (#172431), border `hsl(210 31% 90%)` (#dee6ed). A modern cool-neutral surface, deliberately not warm/gold-tinted.
- **Gold** — background `hsl(43 48% 87%)` (#eee5ce), card `hsl(46 52% 96%)` (#faf8ef), foreground `hsl(39 25% 13%)` (#292419), border `hsl(43 40% 81%)` (#e2d7bb). Warm ivory paper; the traditional illuminated-manuscript register.
- **Dark** — background `hsl(212 52% 6%)` (#070f17), card `hsl(210 41% 13%)` (#14212f), foreground `hsl(45 18% 91%)` (#eceae4), border `hsl(210 26% 19%)` (#24303d). One navy hue family (~210–212°) darkening in four steps: background < mushaf paper < card < secondary/muted — the mushaf reading page is deliberately *not* the brightest surface on screen ([ADR 0031](docs/architecture/adr/0031-dark-theme-gold-emerald-semantics.md)).

### Named Rules
**The Unified Accent Rule.** Emerald green (`--primary` and calibrated semantic variants) is the unified accent color across all themes (Light, Gold, Dark) for both state interaction and manuscript ornamentation. Legacy `--gold` and `--gold-muted` tokens are eliminated.

**The Semantic Token Rule.** Never hardcode a hex/RGB value or a raw Tailwind color (`bg-white`, `text-black`, `bg-gray-*`) — always `bg-background` / `text-foreground` / `bg-card` / etc. Raw utilities silently break dark and gold themes.

## Typography

**UI Font:** IBM Plex Sans Arabic (Google Font, Arabic + Latin subsets) via the `--tajawal` CSS variable / `font-tajawal` (variable name predates the font swap; the font itself, not the variable name, changed in #349).
**Quran Reading Font (in-page):** a per-page glyph font (`quran-p{pageId}`), loaded inline only on the mushaf page route — matches the exact print layout of that physical page.
**Quran Reading Font (standalone):** UthmanicHafs1Ver18 (local, `--uthmanic` / `font-uthmanic`) — used for verse/word display outside the page route (search, marks, tooltips).
**Surah Name Font:** a custom glyph font (`sura_names.ttf`, `--surah-names` / `font-surahnames`) that maps a zero-padded surah number (`"001"`–`"114"`) to a calligraphic surah-name glyph — never pass `name_arabic` text to it.

**Character:** IBM Plex Sans Arabic carries all UI chrome with a clean, humanist geometric register; the Quran/surah fonts are swapped in only for scripture and surah-name display, so the reading content always reads as calligraphic manuscript text sitting inside a plainer, quieter interface frame.

### Named Rules
**The Column–Font Contract Rule.** Every Quran-text rendering context has exactly one correct source column and one correct font — never mix across rows (see [docs/standards/quran-rendering.md](docs/standards/quran-rendering.md)). Getting this wrong silently renders the wrong glyphs (e.g. unrendered rub-el-hizb markers, or a surah-name font fed literal Arabic text instead of a page number).

## Layout

Mobile and desktop diverge structurally, not just by breakpoint tweak — each has a purpose-built reader shell:

- **Mobile (<768px):** nav is a fixed overlay so the reader claims the full `100dvh`; a single mushaf page fills the viewport edge-to-edge with a swipeable single-step carousel (current + one neighbor peeking per side). Font size is derived from viewport width (`min((100vw - 24px) / 14.7, 28px)`) so every line justifies to the same width as the print original without ever wrapping a word.
- **Tablet landscape (1024–1366px):** permanently an open two-page spread, full-bleed, nav overlaid — swipe-based navigation, no visible nav arrows.
- **Desktop (≥1367px) / portrait-tablet–small-laptop (768–1023px):** the reader floats on its own "desk" surface (`--viewer-background`, distinct from `--background`) with circular nav arrows (52px) flanking the page(s); tall viewports (≥800px height) distribute leftover vertical space into inter-line gaps rather than leaving empty top/bottom margin, so the page always reads as filling its reading band like a real book.
- **Recitation player:** a horizontal bottom bar below 800px viewport height; becomes a fixed 96px-wide vertical rail on the right edge at ≥1367px width and ≥800px height, once there's room to stop competing with the page for the bottom edge.

Spacing/density elsewhere (marks, plans, dialogs) follows standard Tailwind scale; the reader is the one surface with bespoke, viewport-derived sizing.

## Elevation & Depth

Hybrid, and deliberately different per theme. Chrome surfaces (dialogs, dropdowns, standard cards) use conventional `box-shadow`. The **mushaf reading page** uses a bespoke depth model instead, because a conventional shadow measures as structurally invisible on the dark theme's near-black background ([ADR 0032](docs/architecture/adr/0032-dark-surface-depth-from-light.md)):

- **Light/gold:** the page gets a real cast shadow seating it on the desk (`--mushaf-page-cast`) plus an inset rim (`--mushaf-rim-*`).
- **Dark:** the cast shadow token resolves to transparent — instead, the page sits on the desk by being a uniformly *lighter* flat fill than its surround, and depth comes from a warm-toned inset rim plus a graded sheet stack, never from lighting the page face itself.

**The page face carries no added light in any theme** — always a flat `--mushaf-paper` fill; depth comes only from the edges (rim, sheet stack, binding crease, cast shadow where applicable).

### Shadow Vocabulary
- **Reader chrome bar** (`--reader-chrome-bar-shadow`: `0 2px 8px rgba(0,0,0,0.06), 0 16px 48px -16px rgba(0,0,0,0.14)`): floating nav/recitation bars in light/gold; resolves to `none` in dark (raised face + warm rim instead).
- **Standard card lift** (same value as above, per [docs/design/design-principles.md](docs/design/design-principles.md)): the default elevated-card treatment outside the reader.

### Named Rules
**The Flat Face Rule.** The mushaf page face never carries a lighting gradient or radial highlight — depth is edge-only (rim, stack, crease, cast), in every theme, at every breakpoint.

**The Light-Not-Shadow Rule (dark theme).** Where light/gold reach for a box-shadow to seat a surface, dark reaches for a flat lightness step and a warm rim instead — a shadow measures ~1 point of contrast on `(7,15,23)` and reads as nothing.

## Shapes

- **Primary content cards** (mushaf page, large dialogs): `rounded-[20px]`.
- **Secondary surfaces:** `rounded-xl` / `rounded-lg`; general chrome components use the token scale (`rounded-lg` → `var(--radius)` = 8px by default).
- **Layered frames:** where a double-border manuscript look is called for, implement as an outer border plus an absolutely-positioned inner frame (`inset-[10px] border border-primary/20 rounded-xl pointer-events-none`), not nested padding divs.
- **Facing-page corners:** on a two-page spread, outer corners round, spine-side corners stay square (`border-radius: 0 5px 5px 0` / `5px 0 0 5px`) — real facing pages meet flat at the binding.
- **Nav controls:** fully circular (`rounded-full`, 52×52px), never a square icon button.

## Components

### Buttons
- **Shape:** `rounded-md` (6px) default; `rounded-full` only for the dedicated reader nav-arrow variant.
- **Primary:** `bg-primary text-primary-foreground`, `h-10 px-4 py-2` default size (`sm`: h-9/px-3, `lg`: h-11/px-8, `icon`: h-10 w-10).
- **Hover:** primary/secondary/destructive darken via `/90` or `/80` opacity step; `outline`/`ghost` fill with `bg-accent text-accent-foreground`.
- **Focus:** `ring-2 ring-ring ring-offset-2`.

### Reader Nav Arrow (signature component)
Circular, not icon-as-button: `w-[52px] h-[52px] rounded-full`, `bg-card border border-border`, `ChevronLeft`/`ChevronRight` from lucide-react at `size={18} strokeWidth={1.8}`. Hover: `bg-accent text-accent-foreground`. Never use a filled or circle-wrapped icon variant (e.g. `ArrowRightCircle`) — reads too heavy against the thin-stroke reading aesthetic.

### Cards / Containers
- **Corner style:** `rounded-[20px]` for the mushaf page and primary dialogs; `rounded-xl`/`rounded-lg` for secondary surfaces.
- **Background:** `bg-card`, or `--mushaf-paper` specifically for the reading page.
- **Shadow strategy:** see Elevation & Depth — conventional shadow off the reader, edge-based depth on it.
- **Border:** `border border-border` where a border is used; the reader page instead uses its rim tokens.

### Reading Surface Ornaments (signature)
- **Corner star ornaments:** four 18px SVG stars at each corner of the mushaf card, `text-primary opacity-60`, path `M9 1L10.5 7L17 8.5L10.5 10L9 17L7.5 10L1 8.5L7.5 7Z` (viewBox 0 0 18 18), `pointer-events-none`.
- **Rule marks** flanking centered titles: `.fq-rule-mark` — a drawn hairline (not a glyph character) tapering into an open diamond, colored via `--fq-mark`/`--fq-mark-soft` (defaults to `--primary`). Mirror with `.fq-rule-mark--flip` for the second flank.
- **Header bands** (reading views): 3-column RTL grid — primary metadata (e.g. juz), centered `◆ Title ◆`, secondary metadata (e.g. hizb); separated from content by `border-b border-border pb-2 mb-4`.

### Icons
`lucide-react` only. Default `strokeWidth` 1.6–1.8 for UI chrome, 2 only for emphasis. Prefer the bare-shape variant over an outlined-circle variant when both exist.

## Do's and Don'ts

### Do:
- **Do** use only semantic Tailwind color tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.) — never a raw hex, RGB, or `bg-gray-*`/`bg-white`/`text-black` utility.
- **Do** use `hsl(var(--token))` / HSL triplets as the canonical color format when adding a new token — the project's format, not hex.
- **Do** carry the mushaf reading page's depth through rim/sheet/crease tokens, matching the active theme's Elevation strategy, when adding any new reader-adjacent surface.
- **Do** use `start`/`end` logical Tailwind variants (`ps-`, `pe-`, `ms-`, `me-`), not `left`/`right`, for anything that must mirror correctly in RTL.
- **Do** follow the Column–Font Contract exactly when rendering any Quran text — one column, one font, per context (see Typography).

### Don't:
- **Don't** add a second accent color anywhere in the system — one interactive hue, full stop.
- **Don't** put a lighting gradient or radial highlight on the mushaf page face in any theme — depth is edge-only.
- **Don't** reach for `box-shadow` to lift the dark-theme reader page or its chrome — use the light/rim tokens; a shadow there is invisible.
- **Don't** use a filled/circle-wrapped icon variant (e.g. `ArrowRightCircle`, `CircleChevronRight`) for reader navigation — always the bare `lucide-react` chevron in a separately-styled circular button.
- **Don't** feed a surah's Arabic name text to the surah-name font — it maps zero-padded numeric strings to glyphs.
