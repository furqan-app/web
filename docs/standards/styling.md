# Styling Standards

## Stack

- **Tailwind CSS** for all styling. No custom CSS files except `app/globals.css` (CSS variables only).
- **shadcn/ui** design tokens — colors are referenced as `bg-background`, `text-foreground`, `border`, etc. Never hardcode hex values.
- **Dark mode:** enabled via the `class` strategy (`darkMode: ["class"]` in tailwind config). Toggle by adding/removing the `dark` class on `<html>`.

## Color Usage

Furqan uses a **two-tier token system** (Paper/Ink/Gold palette — see [ADR 0003](../architecture/adr/0003-two-tier-design-token-architecture.md)). Always use registered tokens — never raw colors (`bg-white`, `text-black`, `bg-gray-*`, `bg-green-700`), and never `[var(--token)]` escape hatches. Both tiers are registered in `tailwind.config.ts`, so every token is a first-class utility.

### Tier 1 — shadcn tokens

HSL space-separated values in `globals.css`. Drive all shadcn components. **Support opacity modifiers** (e.g. `bg-primary/90`).

| Token | Use | Example class |
|---|---|---|
| `background` / `foreground` | Page background and primary text | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | Card surfaces | `bg-card`, `text-card-foreground` |
| `popover` / `popover-foreground` | Popover/dropdown surfaces | `bg-popover` |
| `primary` / `primary-foreground` | Primary actions (gold CTA) | `bg-primary`, `text-primary-foreground` |
| `secondary` / `secondary-foreground` | Secondary surfaces (paper-2) | `bg-secondary` |
| `muted` / `muted-foreground` | Subtle backgrounds, secondary text | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | Accent surfaces (green) | `bg-accent` |
| `destructive` | Errors, delete actions | `text-destructive` |
| `border` / `input` | Borders, input borders | `border`, `border-input` |
| `ring` | Focus rings | `ring-ring` |

### Tier 2 — supplementary design tokens

Hex CSS vars in `globals.css`, for patterns shadcn has no slot for. **Do NOT support opacity modifiers** — `bg-card-2/50` will silently fail. Use a different token if you need transparency.

| Token | Use | Example class |
|---|---|---|
| `card-2` | Hover surface on list items / surah cards | `hover:bg-card-2` |
| `line-2` | Stronger divider/border (nav arrows) | `border-line-2` |
| `gold-tint` / `gold-soft` | Badge fill + border (`FQBadge` default) | `bg-gold-tint`, `border-gold-soft` |
| `hl-red` / `hl-blue` / `hl-green` | Ayah highlight backgrounds (search, marks) | `bg-hl-blue` |
| `bm-red` / `bm-blue` / `bm-green` | Bookmark marker icon colors | `text-bm-red` |

Never hardcode hex values inline (`style={{ color: 'var(--bm-red)' }}`) — use the registered utility instead.

## Responsive Breakpoints

Standard Tailwind breakpoints apply:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

The app is primarily a reading app — mobile layout is secondary to desktop for now, but RTL/LTR must work at all breakpoints.

## RTL / LTR

- Arabic (`ar`) is RTL, English (`en`) is LTR. The `<html dir="...">` attribute is set at the layout level.
- Use `start`/`end` Tailwind variants (`ps-`, `pe-`, `ms-`, `me-`) instead of `left`/`right` for paddings/margins on elements that need to mirror in RTL.
- For Quran text specifically, always use `dir="rtl"` explicitly — do not rely on inherited direction.

## Border Radius

Use the CSS variable tokens: `rounded-lg`, `rounded-md`, `rounded-sm` (mapped to `--radius`, `--radius - 2px`, `--radius - 4px`).

## Animation

Tailwind `animate-accordion-down` / `animate-accordion-up` are defined for accordion components. Do not add custom keyframes unless no Tailwind equivalent exists.

**Icon button lift:** `FQIconButton` encapsulates the standard icon-button motion — a subtle lift on hover (`hover:-translate-y-px`) and a press-down on active (`active:translate-y-0 active:scale-[.97]`), with a 120ms transform transition. Use `FQIconButton` for all icon-only buttons (Nav, SettingsSidebar, Sidebar, UserMenu) so this behaviour stays consistent — do not re-implement the lift by hand on a raw `Button`.

## Fonts

- UI text: system font stack (no custom UI font loaded).
- Quran and surah name fonts: see [quran-rendering.md](quran-rendering.md).
