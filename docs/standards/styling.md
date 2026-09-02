# Styling Standards

## Stack

- **Tailwind CSS** for all styling. No custom CSS files except `app/globals.css` (CSS variables only).
- **shadcn/ui** design tokens — colors are referenced as `bg-background`, `text-foreground`, `border`, etc. Never hardcode hex values.
- **Dark mode:** enabled via the `class` strategy (`darkMode: ["class"]` in tailwind config). Toggle by adding/removing the `dark` class on `<html>`.

## Color Usage

Use semantic Tailwind tokens, not raw colors:

| Token | Use |
|---|---|
| `bg-background` / `text-foreground` | Page background and primary text |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-muted` / `text-muted-foreground` | Subtle backgrounds, secondary text |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `bg-accent` / `text-accent-foreground` | Hover states, highlights |
| `text-destructive` | Errors, delete actions |
| `border` | All borders |
| `ring` | Focus rings |

Never use `bg-white`, `text-black`, `bg-gray-*`, etc. — they break dark mode.

## Responsive Breakpoints

Standard Tailwind breakpoints apply. The app is primarily a reading app — mobile layout is secondary to desktop for now, but RTL/LTR must work at all breakpoints.

## RTL / LTR

- `<html dir="...">` is set at the layout level (ar=RTL, en=LTR).
- Use `start`/`end` variants (`ps-`, `pe-`, `ms-`, `me-`) instead of `left`/`right` for elements that mirror in RTL.
- For Quran text, always set `dir="rtl"` explicitly.

## Border Radius

Use the CSS variable tokens: `rounded-lg`, `rounded-md`, `rounded-sm` (mapped to `--radius`, `--radius - 2px`, `--radius - 4px`).

## Motion

Stack: Tailwind + shadcn + Radix, CSS transitions only — no JS animation library. If a task genuinely needs JS-driven physics (drag-to-dismiss, momentum), stop and confirm before adding a dependency.

**Should it animate at all?** Never animate keyboard-initiated actions (arrow-key verse/page nav) or anything the user triggers dozens of times a day — those must feel instant. Reserve animation for occasional transitions (dialogs, dropdowns, toasts, sheets) and first-time/rare moments. Every animation needs a real purpose — spatial continuity, state indication, feedback — not decoration.

**Easing & duration.** Tailwind's default `ease-in`/`ease-out` are weak; define stronger curves as CSS vars in `globals.css` and reference them (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for entering, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for in-place movement). Entering/exiting → `ease-out`; moving in place → `ease-in-out`; hover/colour → `ease`. **Never `ease-in`.** Button feedback 100–160ms · tooltips 125–200ms · dropdowns/dialogs 150–250ms · sheets 200–500ms. Stay under 300ms for anything that isn't a full-screen modal; exit faster than enter.

**Component states.** Pressables compress on press: `active:scale-[0.97]` with `transition-transform duration-150`. Never enter from `scale(0)` — start at `scale-95` + `opacity-0`. For Radix popovers/dropdowns set `transform-origin: var(--radix-<primitive>-content-transform-origin)` so they scale from their trigger; `Dialog` is the exception (keep `center`). Prefer `transition-*` over `@keyframes` for anything that can retrigger rapidly — transitions retarget mid-flight, keyframes restart.

**Performance.** Animate only `transform` and `opacity`. Don't put an animated custom property on a parent with many children — it forces a style recalc on every descendant.

**Accessibility.** Honour `prefers-reduced-motion` (the `motion-reduce:` variant, or an `@media` block that keeps opacity/colour and drops transform/position movement). Gate hover-only affordances behind `@media (hover: hover) and (pointer: fine)` — Tailwind's `hover:` is not gated, so on touch a tap can leave a stuck hover state.

**Legacy note.** `tailwindcss-animate` (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`) is **not installed** — those classes are inert no-ops despite appearing in some shadcn scaffolds. Use Radix `data-[state=open]`/`data-[state=closed]` with `transition-*` (see `components/ui/dialog.tsx`). Tailwind `animate-accordion-down`/`-up` are defined for accordions; don't add custom keyframes unless there is no Tailwind equivalent.

## Fonts

- UI text: system font stack (no custom UI font loaded).
- Quran and surah name fonts: see [quran-rendering.md](quran-rendering.md).

## Themes

Themes are named CSS classes on `<html>` (e.g. `.theme-light`, `.theme-dark`), each defining the full shadcn token set. Apply `.dark` alongside any dark-variant theme class to activate `dark:` utilities.

**There are three theme blocks, not four.** `.theme-dark.dark` used to duplicate `.theme-dark` and was removed in subtask 2.1: it was byte-identical across all 51 tokens, and it could never match without `.theme-dark` matching too, since the theme hook and the pre-paint script always add `dark` and `theme-dark` together. It resolved to nothing while doubling the cost of every token edit. `.dark` itself is untouched — Tailwind's `dark:` variant still keys off it.

### Token contract

Every theme class must define all of these CSS custom properties:

```
--background, --foreground
--card, --card-foreground
--popover, --popover-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring, --radius
--overlay
--warning, --warning-foreground
```

`--warning` was added in subtask 4.4. The accent may not carry "something is wrong", and `--destructive` is too strong for a recoverable notice, so warning is its own pair. It replaced the last raw `amber-*` utilities in the app, which came with a `dark:` variant — a per-theme fork of one rule. Measured 5.35 / 5.50 / 8.43 against a `bg-warning/10` surface on light / gold / dark.

### Design-language families

Four roles the shadcn set has no name for (ADR 0047, subtask 2.1). Same contract — **every theme defines every one**:

```
atmosphere   --lamp, --lamp-core, --lamp-mid, --lamp-extent, --lamp-origin
             --vignette, --vignette-alpha
control      --chrome, --chrome-base, --well, --well-alpha
             --control-inert, --control-live
elevation    --surface-cast, --surface-rim, --surface-rim-alpha, --panel-cast
identity     --medallion-face, --medallion-edge, --medallion-rim, --medallion-ink
```

These carry **values only** — never a gradient or a shadow rule. The rules that read them are declared once, theme-agnostically, and live in `design-language.md`. A screen opts in by consuming a token; until it does, these are inert and change nothing.

Two things about them are counter-intuitive and are the whole reason they are tokens:

- **`--chrome` sits above the desk in light themes and below it in dark.** "Raised" means raised relative to its own medium, so a recessed `--well` is *lighter* than its bar on dark and *darker* on light. Read the rule, not the direction.
- **`--lamp`'s carrier channel differs per theme** — lightness on dark and gold, temperature on light, decided by measuring each medium's headroom. `--lamp-extent` is per-theme for the same reason. Values derived for one theme measure zero in another; never port them.

**Unified Accent System (Emerald Green).** All accents, category overlines, manuscript ornaments, identity marks, and live controls are unified to emerald green (`--primary` and semantic green scales) across all three themes (Light, Gold, Dark), eliminating legacy gold tokens (`--gold`, `--gold-muted`). Mushaf ornaments and page metadata consume `--mushaf-ornament` and `--mushaf-metadata` (rich emerald tones per theme). See [DECISIONS.md](../architecture/DECISIONS.md#L1016) (2026-08-22) and `docs/plans/unify-accents-gold-to-green.md`.

`--overlay` is the
modal/drawer scrim color, consumed as `bg-overlay/80` — an HSL triplet (no baked-in alpha) so
the Tailwind opacity-slash syntax works, same as every other token here.

The reader's depth family (`--mushaf-rim-*`, `--mushaf-sheet-*`, `--mushaf-crease*`,
`--mushaf-page-cast`, `--reader-chrome-*`) follows the same "every theme defines every token" rule as
the rest, and the reader's depth **rules** are declared once, theme-agnostically — a theme supplies
only values. A missing token there does not fall back to something sensible; it flattens that
theme's page. Do not reintroduce a theme-scoped copy of a depth rule to serve one theme; add or
retune that theme's tokens instead.

~~**The page face carries no added light in any theme.**~~ **Superseded by [ADR 0047](../architecture/adr/0047-adopt-reader-lab-design-language.md), subtask 5.1b.** The face now carries a
pool, declared once theme-agnostically and valued per theme: dark's paper has upward headroom and
takes a real lit pass, while light's (L=99) and gold's (L=96) have none, so on those the pool is
carried entirely by its **shading** half — the lamp expressed as the absence of shade. Edge depth
(rim, sheet stack, binding crease, cast) is unchanged and still does most of the work.

The pool belongs to the **spread**, not to a page: each card anchors the same ellipse to its own
seam edge so the halves join at the gutter, and only where two facing pages are actually on screen.
A lone page keeps the centred default.

Values still differ where the medium differs. `--reader-chrome-shadow` and `--mushaf-page-cast` are
`none`/transparent in dark, because on a `(7,15,23)` background a shadow produces no visible pixels,
and real shadows in light/gold. Dark instead gets its page-to-desk separation from a **uniformly**
lighter `--mushaf-paper` — a flat colour step, not a gradient. These are value differences, not
structural ones. See [ADR 0032](../architecture/adr/0032-dark-surface-depth-from-light.md) (and its
2026-07-29 supersede) and the Reader Surface Depth entry in DECISIONS.md.

### Adding a new theme

1. Add a `.theme-<name>` block in `globals.css` (inside `@layer base`) with all required tokens above.
2. If the theme has a dark variant, add a `.theme-<name>.dark` block with the dark-variant token values.
3. Register the theme name in `useTheme` if a UI switcher is needed.

**When copying from shadcn's theme generator** (`ui.shadcn.com/themes`), the output uses `:root` / `.dark`. Rename before pasting:
- `:root { ... }` → `.theme-<name> { ... }`
- `.dark { ... }` → `.theme-<name>.dark { ... }`

### Rules

- Never define tokens in `:root` or `.dark` — the flash-prevention script always sets the theme class before first paint, so bare `:root` definitions are dead code.
- The flash-prevention `<script>` in `layout.tsx` and `useTheme` must stay in sync: both apply the same classes.
