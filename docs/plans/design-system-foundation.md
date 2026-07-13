# Design System Foundation

**Type:** feature  
**Date:** 2026-06-29  
**Status:** implemented  
**Trello:** https://trello.com/c/RnqCBh4Q/34-create-a-design-system

## Summary

Replace ad-hoc `:root`/`.dark` CSS variables with named theme classes (`.theme-light`, `.theme-dark`). The CSS variable contract (token names, Tailwind aliases) is unchanged — only where they're defined changes. `useTheme`, the inline flash-prevention script, and `layout.tsx` updated to match. See ADR 0003.

## Files Changed

**`app/globals.css`**
- `:root { ... }` → `.theme-light { ... }`
- `.dark { ... }` → `.theme-dark { ... }`
- Remove `font-family: Arial, Helvetica, sans-serif` from `body` — no UI font loaded globally; system font stack is the default.

**`app/hooks/use-theme.ts`** — expand the `useEffect` toggling `.dark` to also apply `.theme-light`/`.theme-dark`:
- `'dark'`: add `theme-dark`, add `dark`, remove `theme-light`
- `'light'`: add `theme-light`, remove `theme-dark`, remove `dark`

**`app/layout.tsx`** — update inline flash-prevention `<script>` to mirror `useTheme`:
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
On `<body>`: replace `bg-white dark:bg-black` with `bg-background`.

**`docs/standards/styling.md`** — add "Themes" section: how themes are defined (named CSS classes on `<html>`), how to add a new theme, full token contract list, shadcn generator rename instruction (`:root`→`.theme-<name>`, `.dark`→`.theme-<name>.dark`).

## Constraints

- Do not change `useTheme` public API or localStorage key — `ThemeToggle` depends on them.
- Inline script and `useTheme` must stay in sync — if one changes class logic, the other must too.
- Do not define any tokens in `:root` — theme class is always set before first paint; `:root` definitions are dead code.
- `.dark` must remain applied alongside dark themes — shadcn components use `dark:` Tailwind variants.
- Do not introduce `next-themes` or a new `ThemeProvider`.
- Only `theme-light`/`theme-dark` ship now; palette expansion is a future task.
