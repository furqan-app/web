---
title: Reduce Desktop Mushaf Safha Card Margins, Flush Tablet Spread, and 6-Layer Paper Stack
type: feature
date: 2026-10-12
status: implemented
area: reader
---

# Reduce Desktop Mushaf Safha Card Margins, Flush Tablet Spread, and 6-Layer Paper Stack

## Summary
1. Reduces the inner padding and horizontal margin of the desktop mushaf page card (`≥1367px`) from ~68px to 34px on each side so the card wraps closer to the Quran text without excessive lateral whitespace.
2. Flushes tablet landscape spread (`1024px–1366px`) to the screen edges with zero dead desk space.
3. Expands the mushaf paper stack to 6 physical staggered layers (`md+`) with 14px clearance on tablet so the full stack width is completely visible at rest with zero edge clipping.

## Root Cause / Approach
- **Desktop padding:** In `@media (min-width: 1367px)`, `.fq-spread .fq-safha-card` added `9rem` (144px total, 72px per side) to the card width clamp and `.fq-spread .fq-content` enforced `padding-inline: 68px`. By cutting this extra margin in half to 34px per side (`+ 4.25rem` / `68px` total on card clamp, `padding-inline: 34px`), the paper wraps snugly around the 15 justified lines, reducing dead whitespace.
- **Tablet spread flush:** In `@media (min-width: 1024px) and (max-width: 1366px)`, `.fq-reader-spread-container` had 16px lateral padding. Setting `padding-inline-start: 0 !important;` and `padding-inline-end: 0 !important;` flushes the open spread to the viewport edges.
- **6-layer stack & resting clearance:** In `app/components/QuranSafha.tsx`, the stack is expanded from 4 to 6 staggered layers (`translate-x-3.5` down to `translate-x-1` / max 14px peek) simulating authentic book page bulk on both outer edges. In `@media (min-width: 1024px) and (max-width: 1366px)`, `.fq-compensate-r` and `.fq-compensate-l` reserve exactly 14px (`margin-right: 14px !important;` and `margin-left: 14px !important;`), perfectly matching the 14px stack protrusion so the outermost sheet meets the viewport edge without being clipped by the ICB viewport's `overflow: hidden` at rest.

## Decision Tree / Algorithm
- Desktop spread card width (`@media (min-width: 1367px)`):
  `width: min(100vw, calc(var(--fq-card-word, var(--fq-desktop-word)) * 14.7 + 4.25rem)) !important;`
  `min-width: min(100vw, calc(var(--fq-card-word, var(--fq-desktop-word)) * 14.7 + 4.25rem)) !important;`
- Desktop spread page content padding (`@media (min-width: 1367px) and (min-height: 800px)`):
  `.fq-spread .fq-content { padding-inline: 34px; }`
- Desktop double-view width budget (`:root[data-safha-view="double"] .fq-spread`):
  `--fq-dv-word: calc((50vw - 160px) / 14.7);` (reclaims 64px of margin budget per card)
- Tablet landscape spread container (`@media (min-width: 1024px) and (max-width: 1366px)`):
  `.fq-reader-spread-container { padding-inline-start: 0 !important; padding-inline-end: 0 !important; gap: 0 !important; }`
- Tablet stack protrusion clearance:
  `.fq-compensate-r { margin-right: 14px !important; }`
  `.fq-compensate-l { margin-left: 14px !important; }`
- 6-layer paper stack in `app/components/QuranSafha.tsx`:
  Staggered with `translate-x-3.5` (14px), `translate-x-3` (12px), `translate-x-2.5` (10px), `translate-x-2` (8px), `translate-x-1.5` (6px), `translate-x-1` (4px).

## Verified Test Cases
- Viewport ≥1367px with `height >= 800px`: Page card has 34px lateral padding instead of 68px.
- Tablet viewport (1280x800): Spread is flush with viewport edges; all 6 stack layers are fully visible at rest without horizontal clipping or scrollbar.
- Mobile viewports (<1024px): Untouched; stack layers stay hidden (`hidden md:block`).

## Files Changed
- `app/globals.css` — update desktop card width clamp, desktop `padding-inline`, `--fq-dv-word` formula, tablet container padding, and tablet `fq-compensate` margin.
- `app/components/QuranSafha.tsx` — render 6 staggered `fq-stack-layer` sheets.
- `docs/architecture/decisions/reader.md` — record decisions and layout invariants.

## Constraints
- Mobile viewports (<1024px) remain unaffected (ADR 0071, #771).
- Font sizing and line justifications are untouched (ADR 0036).
- 15-slot rhythm is preserved.
- Stack layer colors derive strictly from theme tokens (`--mushaf-sheet-face`, `--mushaf-sheet-edge`).

## What NOT to Do
- Do not stretch word spaces with `space-between` (ADR 0036 Non-negotiable invariant).
- Do not touch mobile font formula (ADR 0011).
- Do not clip stack protrusion at rest with zero margin on `.fq-compensate`.

## Decisions Made
- Reduced desktop card lateral padding to 34px (half of 68px) per user confirmation.
- Expanded paper stack to 6 staggered layers on `md+`.
- Flushed tablet spread to edges with zero lateral gap.
- Matched tablet stack clearance to 14px to eliminate resting clipping.

## Revision History
- 2026-10-12: Folded Addendum 1 (Tablet Flush Margins & 6-Layer Mushaf Paper Stack) into base plan.
