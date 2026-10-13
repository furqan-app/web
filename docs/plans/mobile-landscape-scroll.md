---
title: Mobile Landscape Full-Width Scroll Spike
type: feature
date: 2026-10-12
status: implemented
area: reader
---

# Mobile Landscape Full-Width Scroll Spike

## Summary

Enables a fit-to-width reading mode when a mobile phone is rotated to landscape orientation (`@media (max-width: 1023px) and (orientation: landscape) and (max-height: 550px)`). Instead of forcing all 15 mushaf lines into the short vertical height of landscape viewports, the page expands to full width, font scales proportionally without the 28px cap, and the user can vertically scroll through the page from top to bottom.

## Context & Invariants

- **Current Behavior:** On mobile (`<1024px`), font was capped at `28px` (`--fq-mobile-font`), and `.fq-reader-pager-viewport` is locked with `overflow: hidden` and `height: 100%`. In landscape orientation (height ~350px-450px), lines were squished or clipped.
- **Tablet Invariant:** Tablet landscape (`1024px–1366px`) is permanently a 2-page spread and remains untouched. This implementation strictly scopes to mobile landscape where `max-height <= 550px` and `max-width <= 1023px`.
- **Pager Invariant:** `ReaderPager.tsx` already distinguishes vertical gesture movement (`Math.abs(deltaY) >= Math.abs(deltaX)`), so native vertical scrolling does not trigger page flip commits.

## Implemented Changes

### 1. Styling & Layout (`app/globals.css`)
- Added dedicated media query:
  ```css
  @media (max-width: 1023px) and (orientation: landscape) and (max-height: 550px)
  ```
- Scaled `--fq-mobile-font` to full width: `calc((100vw - 24px) / 14.7) !important;` directly on `.fq-content`, lifting the 28px cap.
- Enabled vertical scrolling on `.fq-reader-panel`: `overflow-y: auto !important; height: 100% !important; touch-action: pan-y !important;`.
- Set `.fq-quran-safha` to natural stacked height (`height: auto !important; flex: none !important; justify-content: flex-start !important; gap: var(--fq-line-gap) !important;`).
- Suppressed desktop/tablet stack layers (`.fq-stack-layer`), nav arrows (`.fq-nav-arrow`), pseudo elements (`::before`, `::after`), and zeroed compensation margins (`.fq-compensate-r`, `.fq-compensate-l`).
- Streamlined footer and padding to eliminate excessive bottom whitespace.
- Optimized `MarkModal`: constrained dialog to `max-height: 94dvh`, set scrollable body (`overflow-y: auto`), rearranged category options into 3 columns (`grid-template-columns: repeat(3, minmax(0, 1fr))`) to fit compact landscape viewports cleanly.

### 2. Page Reset on Navigation (`app/components/reader/ReaderPager.tsx`)
- Reset `.fq-reader-panel` `scrollTop = 0` inside `commitTo` and `jumpTo` when turning pages.

## Verification
- Verified on dev server port 7002 across multiple landscape viewports (667x375, 844x390, 896x414).
- Verified smooth scroll down to line 15 and footer.
- Verified `MarkModal` opens with visible Close and Save buttons without overflow.
- Vitest suite passes (61 test files, 722 tests).

