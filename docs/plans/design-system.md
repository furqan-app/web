# Design System

**Type:** feature  
**Date:** 2026-06-29  
**Status:** implemented

## Summary

Establish Furqan's design identity by replacing the current monochromatic shadcn default palette with the "Deep Teal + Cream" color system, fixing all existing hardcoded Tailwind colors that break the semantic token model, and introducing four reusable `FQ`-prefixed components that enforce the design language for new UI.

## Approach

Three sequential phases:

1. **Palette** — update CSS variables in `app/globals.css`
2. **Token cleanup** — fix all hardcoded raw colors in existing components
3. **FQ components** — build four thin wrapper components in `app/components/ui/`

No `/styleguide` route. Consistency is enforced by the components themselves.

---

## Phase 1 — Palette (globals.css)

Replace the current black/white/gray HSL values with:

### Light mode (`:root`)
| Token | Value | HSL |
|---|---|---|
| `--background` | `#F5F7F6` | `150 8% 96%` |
| `--foreground` | `#141F1C` | `165 20% 9%` |
| `--card` | `#E8EDEB` | `150 10% 92%` |
| `--card-foreground` | `#141F1C` | `165 20% 9%` |
| `--popover` | `#F5F7F6` | `150 8% 96%` |
| `--popover-foreground` | `#141F1C` | `165 20% 9%` |
| `--primary` | `#1A5C52` | `172 56% 23%` |
| `--primary-foreground` | `#F5F7F6` | `150 8% 96%` |
| `--secondary` | `#E8EDEB` | `150 10% 92%` |
| `--secondary-foreground` | `#141F1C` | `165 20% 9%` |
| `--muted` | `#D0D8D6` | `168 10% 83%` |
| `--muted-foreground` | `#4A6862` | `168 15% 35%` |
| `--accent` | `#2A9D8F` | `174 57% 39%` |
| `--accent-foreground` | `#F5F7F6` | `150 8% 96%` |
| `--destructive` | `0 84.2% 60.2%` | (keep existing) |
| `--destructive-foreground` | `0 0% 98%` | (keep existing) |
| `--border` | `#BEC8C5` | `168 9% 76%` |
| `--input` | `#BEC8C5` | `168 9% 76%` |
| `--ring` | `#2A9D8F` | `174 57% 39%` |
| `--radius` | `0.5rem` | (keep existing) |

### Dark mode (`.dark`)
| Token | Value | HSL |
|---|---|---|
| `--background` | `#0D1614` | `168 25% 7%` |
| `--foreground` | `#E8F2F0` | `168 25% 93%` |
| `--card` | `#172220` | `168 20% 11%` |
| `--card-foreground` | `#E8F2F0` | `168 25% 93%` |
| `--popover` | `#0D1614` | `168 25% 7%` |
| `--popover-foreground` | `#E8F2F0` | `168 25% 93%` |
| `--primary` | `#2A9D8F` | `174 57% 39%` |
| `--primary-foreground` | `#0D1614` | `168 25% 7%` |
| `--secondary` | `#172220` | `168 20% 11%` |
| `--secondary-foreground` | `#E8F2F0` | `168 25% 93%` |
| `--muted` | `#1E2E2C` | `168 20% 15%` |
| `--muted-foreground` | `#6A9890` | `174 18% 50%` |
| `--accent` | `#3DBFB0` | `174 52% 49%` |
| `--accent-foreground` | `#0D1614` | `168 25% 7%` |
| `--destructive` | `0 62.8% 30.6%` | (keep existing) |
| `--destructive-foreground` | `0 0% 98%` | (keep existing) |
| `--border` | `#2A3E3B` | `168 18% 20%` |
| `--input` | `#2A3E3B` | `168 18% 20%` |
| `--ring` | `#3DBFB0` | `174 52% 49%` |

---

## Phase 2 — Token Cleanup (existing components)

Fix all hardcoded raw Tailwind colors that bypass the semantic token system.

### `app/components/SurahListItem.tsx`
- `border-gray-200 dark:border-neutral-800` → `border-border`
- `hover:bg-gray-50 dark:hover:bg-zinc-800` → `hover:bg-accent/10`
- `border-gray-300 dark:border-neutral-800` → `border-border`
- `bg-white dark:bg-black` → `bg-background`
- `text-gray-900 dark:text-gray-100` → `text-foreground`
- `text-gray-600 dark:text-gray-400` → `text-muted-foreground`

### `app/components/nav/Nav.tsx`
- `dark:hover:bg-zinc-800` on the home link Button → remove (Button ghost variant handles hover via `--accent`)

### `app/components/SettingsSidebar.tsx`
- `dark:hover:bg-zinc-800` on the Settings trigger Button → remove (same as above)

---

## Phase 3 — FQ Components

All go in `app/components/ui/`. All are thin wrappers — no logic, just locked-in token/variant defaults.

### `FQIconButton.tsx`
Wraps shadcn `Button` with `variant="ghost" size="icon"` locked in. Replaces the repeated ghost icon button pattern in Nav, SettingsSidebar, and Sidebar trigger.

```tsx
// Usage: <FQIconButton><Home className="size-5" /></FQIconButton>
// Accepts: all Button props except variant/size (those are locked)
```

**Files to migrate after creation:**
- `Nav.tsx` — home button, replace `<Button variant="ghost" size="icon">`
- `SettingsSidebar.tsx` — settings trigger
- `Sidebar.tsx` — panel open trigger and close button

### `FQListItem.tsx`
Standardized list item with teal hover, border-b border-border, and RTL-aware layout. Replaces the hand-rolled pattern in `SurahListItem`.

Props: `href`, `locale`, `leading` (node — e.g. a circle badge), `title`, `subtitle`.

```tsx
// Usage:
// <FQListItem href="/pages/1" locale={locale}
//   leading={<FQBadge>{surah.id}</FQBadge>}
//   title={surahName}
//   subtitle={`${surah.revelation_place} • ${surah.verses_count} verses`}
// />
```

**Files to migrate:** `SurahListItem.tsx` (full rewrite to use FQListItem)

### `FQBadge.tsx`
Circle badge for surah numbers, juz indicators, hizb markers. Renders a `div` with `rounded-full border border-border bg-background text-foreground` with a centered number/symbol.

Variants: `default` (surah number circle), `primary` (teal fill, for active/selected state).

```tsx
// Usage: <FQBadge>{surah.id}</FQBadge>
//        <FQBadge variant="primary">جزء ١</FQBadge>
```

### `FQCard.tsx`
Standardized card surface: `rounded-lg bg-card text-card-foreground border border-border`. Accepts optional `padding` prop (`sm | md | lg`, defaults to `md`).

```tsx
// Usage: <FQCard><p>Content</p></FQCard>
//        <FQCard padding="sm">...</FQCard>
```

---

## Files to Change

| File | Change |
|---|---|
| `app/globals.css` | Replace all CSS variable values with Deep Teal + Cream palette |
| `app/components/SurahListItem.tsx` | Fix hardcoded colors; refactor to use `FQListItem` + `FQBadge` |
| `app/components/nav/Nav.tsx` | Replace home `Button` with `FQIconButton`; remove `dark:hover:bg-zinc-800` |
| `app/components/SettingsSidebar.tsx` | Replace settings trigger with `FQIconButton` |
| `app/components/nav/Sidebar.tsx` | Replace trigger + close buttons with `FQIconButton` |
| `app/components/ui/FQIconButton.tsx` | **New** |
| `app/components/ui/FQListItem.tsx` | **New** |
| `app/components/ui/FQBadge.tsx` | **New** |
| `app/components/ui/FQCard.tsx` | **New** |

---

## Constraints

- Do not create a `/styleguide` route.
- Do not hand-roll hover colors — always use `hover:bg-accent/10` or shadcn's built-in variant hovers.
- `MarkerColorPicker` uses `text-red-600`, `text-blue-600`, `text-green-600` intentionally (semantic bookmark colors) — do not change these.
- `FQModal` (`app/components/ui/FQModal.tsx`) re-exports Dialog — leave it; it's already a thin wrapper and has no hardcoded colors.
- Quran font, surah name font, and all `--uthmanic` font references are out of scope.
- The `RubList` / `RubListItem` component was not reviewed — check it for hardcoded colors and apply the same token fixes if found.

## Decisions Made

- Chose **Deep Teal + Cream** palette over Earthy Greens+Gold and Neutral+Indigo.
- Chose **FQ components** (thin wrappers) over a full Storybook or separate component package.
- Chose **no styleguide route** — consistency enforced by components, not documentation.
- `FQIconButton` locks in `variant="ghost" size="icon"` — callers cannot override, ensuring uniform hover behavior across all icon buttons.
