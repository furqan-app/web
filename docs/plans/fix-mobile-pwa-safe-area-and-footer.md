---
title: Mobile PWA Safe Area and Indicator Ergonomics
type: bug
date: 2026-10-13
status: implemented
area: pwa
issue: 786
---

# Mobile PWA Safe Area and Indicator Ergonomics

## Summary

On mobile devices running the installed PWA (and mobile browsers), three UI ergonomics and clearance defects occur:
1. The mushaf page footer on mobile sits flush against the bottom edge of the screen because it has `pb-0` and only 4px container padding (`py-1`), lacking `env(safe-area-inset-bottom)` or mobile breathing room.
2. The miniature open-book page indicator icon (`BookSafhaNumber` in `QuranSafha.tsx`) is sized at `w-8 h-5.5` with `text-[9px]`, which is too small for comfortable legibility, especially on 2-digit and 3-digit page numbers.
3. When opening the Settings sheet, the close button (`top-4`) and the header (`pt-5`) sit flush against the top edge of the screen, colliding with the device notch, punch-hole camera, or status bar due to missing `env(safe-area-inset-top)` clearance.

## Root Cause / Approach

### 1. Mushaf Footer Clearance
- **Root Cause**: In `QuranSafha.tsx`, the footer `.fq-safha-footer` declares `pt-2 pb-0`, and its parent `.fq-content` only has `py-1` (4px). On mobile, where the card spans full ICB height, there is no bottom clearance or safe-area inset padding. The page number indicator is positioned directly against the bezel or over the system gesture pill.
- **Approach**: In `QuranSafha.tsx`, update `.fq-safha-footer` on mobile to include bottom safe-area breathing room (`pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] md:pb-0`). Because the Quran text column `.fq-quran-safha` is `flex: 1 1 0%; min-height: 0;`, it flexibly accommodates this slight lift without overflowing lines or clipping text.

### 2. Miniature Book Icon Sizing
- **Root Cause**: `BookSafhaNumber` sets the SVG wrapper to `w-8 h-5.5` (32px × 22px), meaning each open page half is only 16px wide, and the numeral is `text-[9px]`. On physical mobile screens, this renders too small to read at a glance.
- **Approach**: Scale the SVG wrapper to `w-10 h-7` (40px × 28px) and increase the numeral size to `text-[11px] font-bold`. The SVG `viewBox="0 0 32 22"` scales vector geometry cleanly while the numeral gets sufficient breathing room to remain sharp and legible.

### 3. Settings Sheet & Close Button Top Clearance
- **Root Cause**: In `components/ui/sheet.tsx`, `SheetPrimitive.Close` has hardcoded `top-4` (16px), and in `SettingsSidebar.tsx`, `SheetHeader` has `pt-5` (20px). When rendered in full height on mobile (`inset-y-0`), the top edge aligns to physical y=0, placing both the close button and the header title under the camera notch or against the top bezel.
- **Approach**:
  - In `components/ui/sheet.tsx`, update the default close button to respect top safe-area insets: `top-[max(1rem,calc(0.5rem+env(safe-area-inset-top,0px)))]` or `top-[max(1rem,env(safe-area-inset-top,0px))]`.
  - In `SettingsSidebar.tsx`, update `SheetHeader` to include top safe-area padding: `pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))]` so the header title and description are visually aligned and separated from the top bezel.
  - In `SettingsSidebar.tsx`, ensure the scrollable container also carries bottom safe-area padding: `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`.

## Decision Tree / Algorithm

| Surface | Property | Current Value | New Value |
|---|---|---|---|
| `QuranSafha.tsx` (`fq-safha-footer`) | `padding-bottom` (mobile) | `pb-0` | `pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] md:pb-0` |
| `QuranSafha.tsx` (`BookSafhaNumber`) | Dimensions | `w-8 h-5.5` | `w-10 h-7` |
| `QuranSafha.tsx` (`BookSafhaNumber`) | Numeral font size | `text-[9px]` | `text-[11px]` |
| `components/ui/sheet.tsx` (`SheetPrimitive.Close`) | `top` offset | `top-4` | `top-[max(1rem,calc(0.5rem+env(safe-area-inset-top,0px)))]` |
| `SettingsSidebar.tsx` (`SheetHeader`) | `padding-top` | `pt-5` | `pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))]` |
| `SettingsSidebar.tsx` (scrollable content) | `padding-bottom` | `py-4` | `pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]` |

## Verified Test Cases

1. **Mobile reader mushaf page 2 (even/left page)**:
   - Book indicator renders on the bottom-left with side="left".
   - Book icon dimensions are 40px × 28px (`w-10 h-7`).
   - Numeral "٢" renders at `text-[11px] font-bold` on the active left half.
   - Footer is lifted from the bottom edge by at least 10px / `max(0.625rem, env(safe-area-inset-bottom))`.
2. **Mobile reader mushaf page 1 or 3 (odd/right page)**:
   - Book indicator renders on the bottom-right with side="right".
   - Numeral renders on the active right half.
   - Same bottom clearance applied.
3. **Desktop reader (≥1024px)**:
   - Centered diamonds `◆ {page} ◆` footer remains unchanged with `md:pb-0`.
   - `BookSafhaNumber` stays hidden via `md:hidden`.
4. **Settings sheet on mobile PWA**:
   - Close button "X" is positioned below device notch/status bar via `top-[max(1rem,calc(0.5rem+env(safe-area-inset-top,0px)))]`.
   - "الإعدادات" header has proportional clearance via `pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))]`.
   - Bottom scroll items do not get obstructed by the bottom home indicator / gesture bar.
5. **Existing unit tests in `QuranSafha.test.tsx`**:
   - Classes `justify-start pl-4`, `justify-end pr-4`, `left-0 w-1/2`, and `right-0 w-1/2` remain intact.

## Files to Change

- `app/components/QuranSafha.tsx` — Increase `BookSafhaNumber` size and font size; add bottom safe-area padding to `fq-safha-footer` for mobile.
- `components/ui/sheet.tsx` — Update default close button `top` offset to respect `env(safe-area-inset-top, 0px)`.
- `app/components/SettingsSidebar.tsx` — Add top safe-area padding to `SheetHeader` and bottom safe-area padding to scrollable container.

## Constraints

- Do not regress desktop/tablet layout: desktop centered footer stays `md:pb-0`.
- Do not hardcode fixed pixel padding without `env(safe-area-inset-*)`: always use `max(..., env(...))` to ensure devices without safe insets retain consistent baseline spacing.
- Retain test class identifiers (`left-0`, `right-0`, `w-1/2`, `justify-start pl-4`, `justify-end pr-4`) in `QuranSafha.tsx` so existing unit tests pass without breakage.

## What NOT to Do

- Do NOT change `QuranSafha` text line distribution logic or `--fq-mobile-font` sizing: flex space-between handles the remaining vertical space naturally.
- Do NOT remove `hideDefaultClose` from `Sidebar.tsx` or `MarkModal.tsx`: they manage their own top positioning and close triggers.

## Decisions Made

- Scaled `BookSafhaNumber` from `w-8 h-5.5` (32×22px) to `w-10 h-7` (40×28px) with `text-[11px]` (1-2 digits) and `text-[9px] tracking-tight` (3 digits), with `pl-1` / `pr-1` optical centering padding, improving legibility without overcrowding the page margin or clipping outer borders.
- Used `max(..., env(...))` for all safe-area adjustments so both standard browsers (where insets may be 0px) and fullscreen/standalone PWAs (where notches or immersive cutouts exist) look polished and balanced.

## Revision History

- 2026-10-13: **Folded addendum** addressing 3-digit page numeral clipping inside the open-book indicator on mobile, adding dynamic font sizing (`text-[9px] tracking-tight`) and optical centering padding (`pl-1` / `pr-1`).


