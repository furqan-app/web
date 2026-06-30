# Design System Foundation

**Type:** feature  
**Date:** 2026-06-29  
**Status:** implemented  
**Trello:** https://trello.com/c/RnqCBh4Q/34-create-a-design-system

## Summary

Replace the current ad-hoc light/dark setup (`:root`/`.dark` CSS variables + a raw inline script + hardcoded `bg-white dark:bg-black` on `<body>`) with a proper token-based theme system. All token definitions move into named CSS class selectors (`.theme-light`, `.theme-dark`). The existing `useTheme` hook is updated to apply both the theme class and the `.dark` class on `<html>`. The inline flash-prevention script is updated to match. `layout.tsx` and `globals.css` are cleaned up. `styling.md` is updated. Only light and dark themes ship in this task — the architecture supports any number of palettes later.

## Approach

The CSS variable contract is unchanged (same token names, same Tailwind aliases). Only where they are *defined* changes: `:root` → `.theme-light`, `.dark` → `.theme-dark` + `.dark`. The `useTheme` hook already handles localStorage, `prefers-color-scheme`, and the `.dark` class toggle — it just needs to also apply/remove `.theme-light`/`.theme-dark`. `ThemeToggle` requires no changes.

See ADR 0003 for the decision rationale.

## Files to Change

### `app/globals.css`
- Replace `:root { ... }` with `.theme-light { ... }` (same token values).
- Replace `.dark { ... }` with `.theme-dark { ... }` (same token values).
- Remove `font-family: Arial, Helvetica, sans-serif` from `body` — no UI font is loaded globally; system font stack is the implicit default.
- Keep all other rules (`border-border`, `bg-background text-foreground`, scrollbar util, `text-balance`, `height: 100%`) unchanged.

### `app/hooks/use-theme.ts`
- Expand the `useEffect` that currently toggles `.dark` to also apply/remove `.theme-light` / `.theme-dark` on `document.documentElement`.
- When theme is `'dark'`: add `theme-dark`, add `dark`, remove `theme-light`.
- When theme is `'light'`: add `theme-light`, remove `theme-dark`, remove `dark`.
- No change to the public API (`theme`, `setTheme`), the localStorage key (`"theme"`), or the `prefers-color-scheme` listener.

### `app/layout.tsx`
- Update the inline `<script>` to apply the correct theme class alongside `.dark`. The script must mirror the `useTheme` logic exactly:
  ```js
  try {
    var t = JSON.parse(localStorage.getItem('theme'));
    var el = document.documentElement;
    if (t === 'dark' || (t == null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      el.classList.add('dark', 'theme-dark');
    } else {
      el.classList.add('theme-light');
    }
  } catch(e) {}
  ```
- On `<body>`: replace `bg-white dark:bg-black` with `bg-background`.
- No other changes to the layout.

### `docs/standards/styling.md`
- Add a "Themes" section documenting:
  - How themes are defined (named CSS classes on `<html>`, full token set per class).
  - How to add a new theme (add a `.theme-X` class in `globals.css` with all required tokens; optionally a `.theme-X.dark` block for the dark variant).
  - The token contract: list all CSS custom properties a theme must define.
  - Never put token definitions in `:root` or `.dark` — use named theme classes only.

## Constraints

- Do not change the `useTheme` public API or the localStorage key — `ThemeToggle` and any other callers depend on them.
- Do not remove the inline `<script>` from `layout.tsx` — it prevents flash of incorrect theme before hydration.
- The inline script and `useTheme` hook must stay in sync: if one changes the class logic, the other must too.
- Do not add any new color values in this task — only restructure the existing neutral token values into the new selectors.
- Do not touch per-page or per-component styling — visual cleanup is out of scope.
- No theme switcher UI in this task.

## Decisions Made

- Named CSS class approach (Option B from ADR 0003): `.theme-X` defines the palette; `.dark` is applied alongside dark themes for Tailwind `dark:` utility compatibility.
- Only `theme-light` and `theme-dark` ship now; palette expansion is a future task.
- No `ThemeProvider` React component needed — the existing `useTheme` hook + `ThemeToggle` already cover the runtime need. The hook's internals are updated, not the architecture.
- `font-family: Arial` is removed without a replacement — the app already has no UI font loaded globally, and system font stack is the correct default until a UI font is intentionally chosen.

## shadcn Compatibility Notes

shadcn components do not define CSS variables — they consume them via Tailwind classes (`bg-primary`, `text-foreground`, etc.). Moving the definitions from `:root` to `.theme-light` is transparent to every shadcn component; they resolve against whichever class is active on `<html>`.

The `.dark` class must remain in sync with dark-variant themes because shadcn's component styles include `dark:` Tailwind variants (e.g. `dark:bg-secondary/80`). These only activate when `.dark` is on `<html>`. Our plan applies `.dark` alongside `.theme-dark`, so this is handled.

**Adding future themes from shadcn's theme generator:** `ui.shadcn.com/themes` generates CSS in `:root` / `.dark` format. When copying a generated palette into this project, rename:
- `:root { ... }` → `.theme-<name> { ... }`
- `.dark { ... }` → `.theme-<name>.dark { ... }`

This must be documented in `styling.md` under "how to add a new theme."

## What NOT to Do

- Do not introduce `next-themes` or any third-party theme library.
- Do not create a new `ThemeProvider` component — updating `useTheme` is sufficient.
- Do not split theme management into `palette` + `mode` now — that's premature until a third palette is added.
- Do not define any tokens in `:root` — the theme class is always present (set by the inline script before first paint), so `:root` definitions are dead code in this system.
