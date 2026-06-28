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

## Fonts

- UI text: system font stack (no custom UI font loaded).
- Quran and surah name fonts: see [quran-rendering.md](quran-rendering.md).
