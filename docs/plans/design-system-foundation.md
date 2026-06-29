# Design System Foundation

**Type:** feature  
**Date:** 2026-06-29  
**Status:** implemented  
**ADR:** [0003 — Two-Tier Design Token Architecture](../architecture/adr/0003-two-tier-design-token-architecture.md)

## Summary

Clean up the WIP design system work into a solid, consistent foundation. The task has three parts: (1) register all supplementary design tokens in Tailwind config so they're first-class utilities; (2) fix the four existing FQ components and the handful of files that still have hardcoded colors or `[var(--token)]` escape hatches; (3) update the docs to reflect reality. No new FQ components, no page redesigns — this is purely the foundation layer.

## Approach

Two-tier token system (see ADR 0003):
- **Tier 1 — shadcn tokens** (`--background`, `--card`, `--primary`, etc.): HSL space-separated, already in `globals.css` and `tailwind.config.ts`. Drive all shadcn components. Do not rename.
- **Tier 2 — supplementary design tokens** (`--card-2`, `--line-2`, `--gold-tint`, `--gold-soft`, `--hl-*`, `--bm-*`): hex CSS vars, defined in `globals.css`, registered in `tailwind.config.ts`. Cover patterns shadcn doesn't have a slot for.

## Files to Change

### 1. `tailwind.config.ts`
Register all Tier 2 tokens under `theme.extend.colors`:
```ts
'card-2':    'var(--card-2)',
'line-2':    'var(--line-2)',
'gold-tint': 'var(--gold-tint)',
'gold-soft': 'var(--gold-soft)',
'hl-red':    'var(--hl-red)',
'hl-blue':   'var(--hl-blue)',
'hl-green':  'var(--hl-green)',
'bm-red':    'var(--bm-red)',
'bm-blue':   'var(--bm-blue)',
'bm-green':  'var(--bm-green)',
```
This unlocks `bg-card-2`, `border-line-2`, `bg-gold-tint`, `text-bm-red`, `bg-hl-blue`, etc.

### 2. `app/globals.css`
- Add clear section comment headers separating Tier 1 from Tier 2 tokens.
- Group Tier 2 tokens together in both `:root` and `.dark` blocks.
- No value changes — organisation only.

### 3. `app/components/ui/FQListItem.tsx`
- `hover:bg-[var(--card-2)]` → `hover:bg-card-2`

### 4. `app/components/ui/FQBadge.tsx`
- `bg-[var(--gold-tint)] border-[var(--gold-soft)]` → `bg-gold-tint border-gold-soft`

### 5. `app/components/ui/FQIconButton.tsx`
- Already clean. Verify no `[var(--...)]` or raw color references remain.

### 6. `app/components/ui/FQCard.tsx`
- Audit for any raw color references; fix if found.

### 7. `app/components/SurahListItem.tsx`
- `hover:bg-[var(--card-2)]` → `hover:bg-card-2`

### 8. `app/[locale]/pages/[id]/page.tsx`
- `border-[var(--line-2)]` (×2, on nav arrow buttons) → `border-line-2`

### 9. `app/components/nav/UserMenu.tsx`
- Replace `<Button variant="ghost" size="icon" className="dark:hover:bg-zinc-800">` with `<FQIconButton>` (consistent with Nav, SettingsSidebar, Sidebar).

### 10. `app/components/SignInModal.tsx`
- `bg-green-700 hover:bg-green-600 text-white` → `bg-primary hover:bg-primary/90 text-primary-foreground`

### 11. `app/components/MarkerColorPicker.tsx`
- `style={{ color: 'var(--bm-red)' }}` → `className="text-bm-red"` (and same for blue, green).

### 12. `app/utils/highlight.ts`
- `bg-[var(--hl-blue)]` → `bg-hl-blue` (and same for red, green).

### 13. `docs/standards/styling.md`
Replace the Color Usage section with the full two-tier token table:
- Tier 1 table: shadcn tokens, their use, example class
- Tier 2 table: supplementary tokens, their use, example class
- State explicitly: Tier 2 tokens do NOT support opacity modifiers (no `/50` syntax)
- Update Animation section to document `.qd-btn` lift behaviour via FQIconButton

### 14. `docs/architecture/DECISIONS.md`
- Replace the stale "Deep Teal + Cream" Design System entry with "Paper/Ink/Gold — Two-Tier Token System", pointing to ADR 0003.
- Fix the stale FQ Design Components constraints (MarkerColorPicker now uses `text-bm-*`, not `text-red-600`).
- Remove the incorrect constraint "MarkerColorPicker uses text-red-600 intentionally — do not change".

## Constraints

- Do NOT change any token values (HSL numbers or hex) — this task is structure and registration only.
- Do NOT add new FQ components — new components are a separate task.
- Do NOT redesign any pages — applying the design language to specific pages is a separate task.
- Tier 2 tokens are registered as plain `var(--token)` (no `hsl()` wrapper, no `<alpha-value>`) because they are hex — opacity modifiers will silently fail if attempted; document this.
- `UserMenu` trigger must use `FQIconButton` (not raw `Button`) to match the icon button behaviour in Nav and SettingsSidebar.

## Decisions Made

- Tier 2 tokens use plain hex CSS vars (not HSL) — simpler to read against the design file, sufficient since opacity modifiers are not needed for these tokens.
- `SignInModal` sign-in button maps to `bg-primary` (gold) not a custom green — there is no semantic "success" color in the design system, and primary (gold) is the correct call-to-action token.
- All token names in `tailwind.config.ts` match the CSS var names verbatim (minus `--` prefix) to minimise cognitive overhead.
