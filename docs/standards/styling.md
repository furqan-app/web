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

## Animation

Tailwind `animate-accordion-down` / `animate-accordion-up` are defined for accordion components. Do not add custom keyframes unless no Tailwind equivalent exists.

The `tailwindcss-animate` plugin (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`, etc.) is **not installed** — those classes are inert no-ops even though they appear in some shadcn docs examples and older component scaffolds. For enter/exit transitions, use Radix's `data-[state=open]`/`data-[state=closed]` attributes directly with `transition-*` utilities (see `components/ui/dialog.tsx`). Use the built-in `motion-reduce:` variant to respect `prefers-reduced-motion` — see the `ui-motion` skill for full animation guidance.

## Fonts

- UI text: system font stack (no custom UI font loaded).
- Quran and surah name fonts: see [quran-rendering.md](quran-rendering.md).

## Themes

Themes are named CSS classes on `<html>` (e.g. `.theme-light`, `.theme-dark`), each defining the full shadcn token set. Apply `.dark` alongside any dark-variant theme class to activate `dark:` utilities.

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
```

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
