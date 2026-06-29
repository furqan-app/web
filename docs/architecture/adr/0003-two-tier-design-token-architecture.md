# ADR 0003: Two-Tier Design Token Architecture

**Date:** 2026-06-29  
**Status:** Accepted

## Context

shadcn/ui requires its own semantic token set (`--background`, `--card`, `--primary`, etc.) in HSL space-separated format so Tailwind opacity modifiers work (`bg-primary/50`). The Furqan Paper/Ink/Gold design system defines additional tokens beyond shadcn's vocabulary — `--card-2`, `--line-2`, `--gold-tint`, `--gold-soft`, `--hl-*`, `--bm-*` — that have no shadcn equivalent. Both sets must coexist and be consumable as Tailwind utilities without `[var(--token)]` escape hatches.

## Options Considered

**Option A — shadcn tokens only**  
Force-fit all design concepts into shadcn's ~12 semantic slots; drop extra tokens (card-2, gold-tint, etc.).

**Option B — design tokens only**  
Replace shadcn tokens entirely with design-file names; manually override every shadcn component that consumes the old tokens.

**Option C — two-tier**  
Keep shadcn tokens (HSL, opacity-modifier-capable) as Tier 1 driving shadcn components; add supplementary design tokens (hex CSS vars, registered in `tailwind.config.ts` as `var(--token)`) as Tier 2 for patterns shadcn doesn't cover.

## Decision

Use Option C — a two-tier system where Tier 1 (shadcn tokens) and Tier 2 (supplementary design tokens) coexist in `globals.css` with clear section comments, and all tokens are registered in `tailwind.config.ts`.

## Consequences

- **+** All shadcn components (`Button`, `Sheet`, `Dialog`, `Tabs`, etc.) work correctly without manual overrides.
- **+** Every design token is available as a first-class Tailwind utility (`bg-card-2`, `border-line-2`, `bg-gold-tint`, `text-bm-red`, etc.) — no `[var(--...)]` escape hatches needed.
- **+** Supplementary tokens are plain hex CSS vars — easy to read and update against the design file.
- **-** Two naming conventions exist: Tier 1 tokens use HSL space-separated values (opacity modifier support); Tier 2 tokens use hex (no opacity modifier support — `bg-card-2/50` will not work).
- **-** Developers must know which tier a token belongs to; documented in `docs/standards/styling.md`.
