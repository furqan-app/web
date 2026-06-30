# ADR 0003: Multi-Theme Architecture via Named CSS Classes + Separate Dark Mode Layer

**Date:** 2026-06-29  
**Status:** Accepted

## Context

The app needs to support multiple named visual themes (e.g. light, dark, sepia, warm) where each theme defines its own full set of design tokens. The existing system uses shadcn/ui's default CSS variable convention (`--background`, `--foreground`, etc.) with `:root` for light and `.dark` for dark, and Tailwind's `darkMode: ["class"]` strategy. Two structural approaches were evaluated.

## Options Considered

**Option A — Self-contained theme classes**  
Each theme class (`.theme-light`, `.theme-dark`, `.theme-sepia`) defines the complete token set; light and dark variants of a palette are separate named themes. Tailwind's `dark:` utilities become unused.

**Option B — Theme palette classes + separate `.dark` layer**  
Each theme class defines a palette's token values; the `.dark` class is applied independently to activate Tailwind's `dark:` utilities and dark token overrides. Adding a new palette (`.theme-sepia`) with both light and dark variants requires one class definition per variant, and `.dark` continues to work for all shadcn components.

## Decision

Use Option B: palette-named CSS classes on `<html>` (`theme-light`, `theme-dark`) combined with the existing `.dark` class for Tailwind dark mode utilities. For now only `theme-light` and `theme-dark` are shipped; future palettes add their own class without touching the dark mode infrastructure.

## Consequences

- **+** shadcn's `dark:` utilities work unchanged across all themes.
- **+** Adding a new theme palette is one CSS class addition in `globals.css`; dark variant is a second selector.
- **+** `useTheme` can evolve: today it stores a single `'light' | 'dark'` value; later it can split into `palette` and `mode` without breaking the CSS contract.
- **-** When switching to dark theme, two classes must be kept in sync on `<html>` (`.theme-dark` + `.dark`); a bug that applies one without the other will cause visual inconsistency.
- **-** The flash-prevention inline `<script>` in `layout.tsx` must be kept (and updated) alongside any changes to `useTheme` — they share logic but cannot share code at runtime.
