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

---

## Addendum 1: Fix corrupted-localStorage crash + missing theme i18n keys

**Type:** bug
**Date:** 2026-07-06
**Status:** implemented

### Bug 1: `storage.get('theme')` crashes on legacy/corrupted raw value

**Symptoms:** Console shows `Error reading theme from localStorage: SyntaxError: Unexpected token 'd', "dark" is not valid JSON`, repeating on every page load.

**Root cause:** `storage.set()` (`app/utils/storage.ts`) always `JSON.stringify`s writes, and both readers — `storage.get()` and the inline flash-prevention `<script>` in `app/layout.tsx` — correctly `JSON.parse`. Going forward, every write/read round-trip is internally consistent. The crash only happens when `localStorage`'s `theme` key already holds a **raw, non-JSON string** (e.g. bare `dark`, 4 characters, no quotes) — leftover from before this JSON-encoding convention existed, or a manually-edited devtools value. `storage.get()` catches the parse failure and logs a warning, then correctly falls back to system preference — so behavior is never broken for the user — but nothing ever clears the corrupted key, so the warning refires on every load until the user manually re-picks a theme (which overwrites it via `storage.set`).

**Fix:** In `storage.get()`'s catch block, call `localStorage.removeItem(key)` after logging the warning, so a corrupted value self-heals on first read instead of persisting indefinitely. The inline `<script>` in `layout.tsx` already silently swallows its own parse failure (`catch(e){}`) and doesn't log — no change needed there beyond ensuring it still falls back to system preference correctly (already the case).

### Bug 2: Missing `theme.light`/`theme.dark`/`theme.gold` translation keys

**Symptoms:** Console shows `MISSING_MESSAGE: themeLight (en)` (and `themeDark`, `themeGold`) on every render that includes `ThemeToggle`.

**Root cause:** `ThemeToggle.tsx` calls `useTranslations()` with no namespace and passes `labelKey`s (`themeLight`, `themeDark`, `themeGold`) that were never added to `messages/en.json`/`messages/ar.json`. The app's `useTranslations` wrapper (`app/hooks/use-translations.ts`) falls back to `labelFallback` when next-intl returns the key unchanged, so the UI always renders correctly (English fallback labels) — but next-intl's default `onError` still logs `MISSING_MESSAGE` to console on every miss, since the underlying `next-intl` `t()` call always runs first.

**Fix:** Add a `theme` namespace to both message files (`theme.light`, `theme.dark`, `theme.gold`), matching this codebase's i18n convention of feature-prefixed keys (e.g. `markModal.*`). Update `ThemeToggle.tsx`'s `labelKey` values from `themeLight`/`themeDark`/`themeGold` to `theme.light`/`theme.dark`/`theme.gold` and pass `"theme"` as the namespace to `useTranslations("theme")`, then use bare keys (`light`/`dark`/`gold`) — matching how other namespaced components call `useTranslations`.

### Files to Change (Addendum 1)

- `app/utils/storage.ts` — `get()`'s catch block calls `localStorage.removeItem(key)` after `console.warn`, so a corrupted value is cleared on first failed read.
- `app/components/ThemeToggle.tsx` — call `useTranslations("theme")`; change `labelKey` values to `light`/`dark`/`gold`.
- `messages/en.json`, `messages/ar.json` — add `theme: { light, dark, gold }` keys.

### Constraints

- Do not touch the inline `<script>` in `layout.tsx` beyond what's already there — its silent catch is intentional (a `<script>` tag can't import `storage.ts`, and it must stay a standalone string per the Theme Architecture decision: "the flash-prevention script... cannot share code at runtime").
- Arabic (`ar.json`) must get the new `theme.*` keys too, per the i18n standard (Arabic is default and must stay complete).
