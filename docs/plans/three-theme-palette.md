# Three Theme Palette

**Type:** feature  
**Date:** 2026-06-30  
**Status:** implemented

## Summary

Replace the placeholder grey-scale shadcn token values in `globals.css` with the three Furqan brand palettes from the design file: `theme-light` (cool blue-grey, teal accent), `theme-dark` (deep navy, teal accent), and `theme-gold` (warm parchment, amber accent). Expand `useTheme` from a binary `light | dark` toggle to a three-way `light | dark | gold` switcher. Update the flash-prevention script in `layout.tsx` to handle all three.

## Color Source

All hex values taken from `.qd-root`, `.qd-root.qd-gold`, and `.qd-root.qd-navy` blocks in the design template. Only colors were extracted — no components, fonts, or layout.

## HSL Token Values

shadcn tokens use bare HSL triplets (no `hsl()` wrapper).

### `.theme-light` (blue-grey light)
```css
--background: 210 36% 95%;
--foreground: 209 36% 14%;
--card: 0 0% 100%;
--card-foreground: 209 36% 14%;
--popover: 0 0% 100%;
--popover-foreground: 209 36% 14%;
--primary: 163 86% 35%;
--primary-foreground: 0 0% 100%;
--secondary: 200 37% 97%;
--secondary-foreground: 209 36% 14%;
--muted: 208 30% 92%;
--muted-foreground: 208 18% 40%;
--accent: 165 53% 93%;
--accent-foreground: 163 86% 35%;
--destructive: 0 72% 56%;
--destructive-foreground: 0 0% 100%;
--border: 210 31% 90%;
--input: 210 31% 90%;
--ring: 163 86% 35%;
--radius: 0.5rem;
```

### `.theme-gold` (warm parchment)
```css
--background: 43 41% 88%;
--foreground: 39 25% 13%;
--card: 48 38% 97%;
--card-foreground: 39 25% 13%;
--popover: 48 38% 97%;
--popover-foreground: 39 25% 13%;
--primary: 41 57% 43%;
--primary-foreground: 0 0% 100%;
--secondary: 44 49% 91%;
--secondary-foreground: 39 25% 13%;
--muted: 43 38% 84%;
--muted-foreground: 39 18% 31%;
--accent: 46 55% 86%;
--accent-foreground: 41 57% 43%;
--destructive: 3 66% 55%;
--destructive-foreground: 0 0% 100%;
--border: 43 37% 83%;
--input: 43 37% 83%;
--ring: 41 57% 43%;
--radius: 0.5rem;
```

### `.theme-dark` + `.theme-dark.dark` (navy)
```css
--background: 210 42% 9%;
--foreground: 209 51% 91%;
--card: 212 34% 15%;
--card-foreground: 209 51% 91%;
--popover: 212 34% 15%;
--popover-foreground: 209 51% 91%;
--primary: 162 88% 41%;
--primary-foreground: 210 42% 9%;
--secondary: 211 34% 18%;
--secondary-foreground: 209 51% 91%;
--muted: 211 40% 12%;
--muted-foreground: 206 29% 59%;
--accent: 161 58% 15%;
--accent-foreground: 162 88% 41%;
--destructive: 0 76% 63%;
--destructive-foreground: 0 0% 100%;
--border: 210 36% 17%;
--input: 210 36% 17%;
--ring: 162 88% 41%;
--radius: 0.5rem;
```

## Files to Change

### `app/globals.css`
- Replace the token values inside `.theme-light { }` with the blue-grey palette above.
- Replace the token values inside `.theme-dark { }` with the navy palette above.
- Add `.theme-dark.dark { }` block with the same navy values (required so Tailwind `dark:` utilities activate — per ADR 0003).
- Add `.theme-gold { }` block with the parchment palette above. No `.theme-gold.dark` — gold is a light-only theme.
- Leave the `:root { }` fallback block untouched (removing it is out of scope).

### `app/hooks/use-theme.ts`
- Expand `Theme` type: `'light' | 'dark' | 'gold'`.
- Update `getInitialTheme` to also return `'gold'` when stored value is `'gold'`.
- Update the `useEffect` class-swap logic:
  - `light` → add `theme-light`; remove `dark theme-dark theme-gold`
  - `dark` → add `dark theme-dark`; remove `theme-light theme-gold`
  - `gold` → add `theme-gold`; remove `dark theme-dark theme-light`

### `app/layout.tsx` (flash-prevention script)
- Update the inline `<script>` so it handles three stored values:
  - `'dark'` → `classList.add('dark', 'theme-dark')`
  - `'gold'` → `classList.add('theme-gold')`
  - default / `'light'` / null → `classList.add('theme-light')`
- System `prefers-color-scheme: dark` with no stored preference → still maps to `theme-dark` (navy).

## Constraints

- `theme-dark` must always be applied with `.dark` — never one without the other (per DECISIONS.md).
- `theme-gold` gets neither `.dark` nor any dark-variant block.
- No hex values outside `globals.css` — all components use semantic tokens (`bg-background`, `text-foreground`, etc.).
- The flash-prevention script and `useTheme` must stay in sync: both must map the same stored string to the same class combination.

## Decisions Made

- Theme names: `theme-light`, `theme-dark`, `theme-gold` (user decision 2026-06-30).
- `theme-dark` keeps the `dark` name even though it renders as navy — "dark" is the user-facing label.
- System dark-mode preference auto-selects `theme-dark` (navy) when no preference is stored.
- Gold has no dark variant in the design; none was added.
