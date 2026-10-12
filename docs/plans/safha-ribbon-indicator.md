---
title: Mobile Safha Orientation & Page Affordances
type: feature
date: 2026-10-10
status: implemented
area: rendering
---

# Mobile Safha Orientation & Page Affordances

## Summary

Provides orientation and page-side affordances for the mushaf reader. Originally implemented as a green bookmark ribbon (`SafhaRibbon`), which was subsequently superseded in #771 by authentic book affordances:
1. **Outer Paper Stack Edge (Mobile):** A layered paper edge along the outer margin (right for odd/right pages, left for even/left pages) simulating book leaf thickness.
2. **Inner Gutter Crease Shadow (Mobile):** A subtle darkening gradient along the inner margin (left for odd/right pages, right for even/left pages) simulating the book spine fold.
3. **Open-Book Footer with Outer Page Number (Mobile):** Replaces the mobile centered `◆ {page} ◆` with an SVG open-book indicator placed at the outer corner (bottom-right for odd/right pages, bottom-left for even/left pages). The active page side is highlighted and displays the page number in Arabic numerals.
4. **Desktop and Tablet:** Ribbon is completely removed; centered `◆ {page} ◆` footer and existing desktop offset stack layers (`fq-stack-layer`) remain.

## Approach

The codebase already carries everything needed to place this with pure CSS, no new JS state:

- `QuranSpread.tsx` passes `stackPeekSide="right"` to the physically-right `QuranSafha` (odd, lower-numbered half) and `stackPeekSide="left"` to the even one. This odd/even signal places both the outer stack edge, inner crease shadow, and open-book footer.
- `compensateStackGap` (true only for spread-rendered cards, false for standalone `QuranSafha`) gates these cues so they never appear outside the reader.
- Single-vs-double display is CSS-gated, not JS-gated (ADR 0043).
- Responsive media queries ensure mobile rules only apply `<1024px`, leaving tablet and desktop layouts unaffected.

## Decision Tree

| Viewport & Page Type | Ribbon | Outer Edge (Paper Stack) | Inner Edge (Gutter Crease) | Footer Indicator |
|---|---|---|---|---|
| Mobile (<1024px) Odd (Right Page) | None | Right edge has paper stack lines (`::after`) | Left edge has subtle crease gradient (`::before`) | Bottom-right open-book icon, number in right half |
| Mobile (<1024px) Even (Left Page) | None | Left edge has paper stack lines (`::after`) | Right edge has subtle crease gradient (`::before`) | Bottom-left open-book icon, number in left half |
| Tablet (1024–1366px, double) | None | Existing desktop stack peek | Book seam | Centered `◆ {page} ◆` on each card |
| Desktop (≥1367px, single or double) | None | Existing desktop stack peek | Clean desk / seam | Centered `◆ {page} ◆` on each card |

## Verified Test Cases

- Page 1 (odd / right page) on Mobile:
  - No green ribbon.
  - Right edge displays paper stack leaves; left edge displays gentle spine shadow.
  - Footer bottom-right displays open-book icon with "١" in the right open page.
- Page 20 (even / left page) on Mobile:
  - No green ribbon.
  - Left edge displays paper stack leaves; right edge displays gentle spine shadow.
  - Footer bottom-left displays open-book icon with "٢٠" in the left open page.
- Page 20 on Desktop Single / Double:
  - No green ribbon.
  - Centered `◆ ٢٠ ◆` footer remains unchanged.
  - Existing `fq-stack-layer` remains unchanged.
- Standalone `QuranSafha` usage (`compensateStackGap` false) → no stack, crease, or book footer.

## Visual & Technical Design

- **Paper Stack Layer:** Implemented via CSS pseudo-element on `.fq-safha-card::after` on mobile, scoped to `.fq-compensate-r` (right) and `.fq-compensate-l` (left). Uses a layered hairline gradient with `--fq-stack-casing`, `--fq-stack-groove`, `--fq-stack-highlight`, and `--mushaf-sheet-face` with neutral tones across light, gold, and dark themes.
- **Spine Crease Shadow:** Implemented via CSS pseudo-element on `.fq-safha-card::before` on mobile, scoped opposite to stack (`.fq-compensate-r` left, `.fq-compensate-l` right). Uses a soft gradient fading from `--mushaf-crease-soft` to transparent (14px width).
- **Text Safety:** Stack and crease are purely decorative overlays (`pointer-events-none`) within existing card boundaries and do NOT squeeze or modify `--fq-mobile-font` or line width budget (ADR 0011).
- **Open-Book Icon:** Clean, lightweight inline SVG component (`BookSafhaNumber`) inside `QuranSafha.tsx`. Rendered at mobile breakpoint only (hidden on `md+`, where the standard centered diamond footer renders). Uses `text-muted-foreground` and theme tokens.

## Files to Change

- `app/components/QuranSafha.tsx`:
  - Remove `SafhaRibbon` component and its render call.
  - Add `BookSafhaNumber` component for the mobile footer.
  - Update footer markup to show `BookSafhaNumber` on mobile and centered diamonds on `md+`.
- `app/globals.css`:
  - Remove `.fq-safha-ribbon` rules from tablet and desktop double-view blocks.
  - Style mobile paper stack (`::after`) and gutter crease (`::before`) for `.fq-compensate-r` and `.fq-compensate-l`.

## Constraints

- No JS breakpoint hooks (`useIsTablet`, `useIsLgUp`) may gate position/visibility — CSS media queries only, matching ADR 0043 (first-paint correctness).
- Must not alter the font calculation formula in ADR 0011 or compress text column width.
- Theme-agnostic design tokens only (`--mushaf-paper`, `--mushaf-sheet-face`, `--mushaf-crease-soft`, `--muted-foreground`) — no hardcoded colors that break Dark or Gold modes.
- Do not add any click handler, link, or state to the cues — purely decorative.
- Affordances must not render for standalone `QuranSafha` usage (`compensateStackGap` false).

## What NOT to Do

- Do not make the affordance interactive (bookmark/jump-on-tap) — purely visual.
- Do not introduce a new prop for odd/even or left/right — `stackPeekSide` already carries this.
- Do not alter desktop or tablet centered footer diamonds.

## Decisions Made

- Reuse `stackPeekSide` (already odd=right/even=left per pair) instead of adding a new prop.
- Remove green ribbon across all breakpoints in favor of authentic book physics (outer stack edge, inner gutter crease, open-book page footer).
- No new ADR: applies existing CSS-gated-breakpoint decision (ADR 0043).

## Revision History

- 2026-10-10: **Folded Addendum (#771)** — green bookmark ribbon (`SafhaRibbon`) **superseded and removed** across all breakpoints; mobile page orientation replaced with authentic paper stack edge (`::after`), inner gutter crease shadow (`::before`), and outer open-book footer indicator (`BookSafhaNumber`).
