# Three Theme Palette

**Type:** feature
**Date:** 2026-06-30
**Status:** implemented

## Summary

Replace placeholder grey-scale shadcn token values with three Furqan brand palettes: `theme-light` (cool blue-grey, teal accent), `theme-dark` (deep navy, teal accent), and `theme-gold` (warm parchment, amber accent). Expand `useTheme` from `light | dark` to `light | dark | gold`. All hex values taken from `.qd-root`, `.qd-root.qd-gold`, `.qd-root.qd-navy` in the design template.

## HSL Token Values

shadcn tokens use bare HSL triplets (no `hsl()` wrapper).

### `.theme-light`
```css
--background: 210 36% 95%;  --foreground: 209 36% 14%;
--card: 0 0% 100%;           --card-foreground: 209 36% 14%;
--popover: 0 0% 100%;        --popover-foreground: 209 36% 14%;
--primary: 163 86% 35%;      --primary-foreground: 0 0% 100%;
--secondary: 200 37% 97%;    --secondary-foreground: 209 36% 14%;
--muted: 208 30% 92%;        --muted-foreground: 208 18% 40%;
--accent: 165 53% 93%;       --accent-foreground: 163 86% 35%;
--destructive: 0 72% 56%;    --destructive-foreground: 0 0% 100%;
--border: 210 31% 90%;       --input: 210 31% 90%;
--ring: 163 86% 35%;         --radius: 0.5rem;
```

### `.theme-gold`
```css
--background: 43 41% 88%;   --foreground: 39 25% 13%;
--card: 48 38% 97%;          --card-foreground: 39 25% 13%;
--popover: 48 38% 97%;       --popover-foreground: 39 25% 13%;
--primary: 41 57% 43%;       --primary-foreground: 0 0% 100%;
--secondary: 44 49% 91%;     --secondary-foreground: 39 25% 13%;
--muted: 43 38% 84%;         --muted-foreground: 39 18% 31%;
--accent: 46 55% 86%;        --accent-foreground: 41 57% 43%;
--destructive: 3 66% 55%;    --destructive-foreground: 0 0% 100%;
--border: 43 37% 83%;        --input: 43 37% 83%;
--ring: 41 57% 43%;          --radius: 0.5rem;
```

### `.theme-dark` and `.theme-dark.dark`
```css
--background: 210 42% 9%;   --foreground: 209 51% 91%;
--card: 212 34% 15%;         --card-foreground: 209 51% 91%;
--popover: 212 34% 15%;      --popover-foreground: 209 51% 91%;
--primary: 162 88% 41%;      --primary-foreground: 210 42% 9%;
--secondary: 211 34% 18%;    --secondary-foreground: 209 51% 91%;
--muted: 211 40% 12%;        --muted-foreground: 206 29% 59%;
--accent: 161 58% 15%;       --accent-foreground: 162 88% 41%;
--destructive: 0 76% 63%;    --destructive-foreground: 0 0% 100%;
--border: 210 36% 17%;       --input: 210 36% 17%;
--ring: 162 88% 41%;         --radius: 0.5rem;
```

## Files to Change

### `app/globals.css`
- Replace token values in `.theme-light { }` and `.theme-dark { }`.
- Add `.theme-dark.dark { }` block with same navy values (required for Tailwind `dark:` utilities — per ADR 0003).
- Add `.theme-gold { }` block. No `.theme-gold.dark` — gold is light-only.
- Leave `:root { }` fallback untouched.

### `app/hooks/use-theme.ts`
- Expand `Theme`: `'light' | 'dark' | 'gold'`.
- `getInitialTheme` returns `'gold'` when stored value is `'gold'`.
- `useEffect` class-swap:
  - `light` → add `theme-light`; remove `dark theme-dark theme-gold`
  - `dark` → add `dark theme-dark`; remove `theme-light theme-gold`
  - `gold` → add `theme-gold`; remove `dark theme-dark theme-light`

### `app/layout.tsx` (flash-prevention script)
- `'dark'` → `classList.add('dark', 'theme-dark')`
- `'gold'` → `classList.add('theme-gold')`
- default / `'light'` / null → `classList.add('theme-light')`
- System `prefers-color-scheme: dark` with no stored preference → `theme-dark`.

### `app/utils/storage.ts`
`get()`'s catch block calls `localStorage.removeItem(key)` after `console.warn` — a corrupted non-JSON value (e.g. bare `dark` without quotes, leftover from before the JSON-encoding convention) self-heals on first failed read instead of persisting indefinitely.

### `app/components/ThemeToggle.tsx`
Call `useTranslations("theme")`; use keys `light`/`dark`/`gold`.

### `messages/en.json`, `messages/ar.json`
Add `theme: { light, dark, gold }` keys.

## Constraints

- `theme-dark` must always be applied with `.dark` — never one without the other (per DECISIONS.md).
- `theme-gold` gets neither `.dark` nor any dark-variant block.
- No hex values outside `globals.css` — all components use semantic tokens.
- The flash-prevention script in `layout.tsx` and `useTheme` must stay in sync — same stored string must map to the same class combination. The inline script cannot share code with `storage.ts` at runtime (must remain a standalone string).
