# Quran Page Mushaf Design Enhancement

**Type:** feature  
**Date:** 2026-07-01  
**Status:** implemented

## Summary

Enhance the `QuranSafha` component to visually evoke a real mushaf page — double-border frame, styled header band with divider lines, and a decorative diamond-flanked page number footer — while staying fully within the existing Tailwind/shadcn design token system so all three themes (light, gold, dark) look correct without hardcoded colors.

## Approach

All changes live in `QuranSafha.tsx`. The `page.tsx` shell stays untouched — the frame wraps only the inner page content, not the nav arrows.

### 1. Mushaf frame

Replace the outer `w-fit py-6` wrapper with a **double-border frame**: an outer `div` with `border border-border` and `p-1`, then an inner `div` with `border border-border` and `p-6`. This gives the ruled double-border look of a printed mushaf using theme tokens.

```
┌─────────────────────────────┐  ← outer border (border-border)
│ ┌─────────────────────────┐ │  ← inner border (border-border, p-6 inside)
│ │   header band           │ │
│ │   Quran text            │ │
│ │   footer band           │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 2. Styled header band

Replace the plain flex row (`flex w-full justify-between`) with:
- `border-b border-border` below the text row
- `border-t border-border` above it
- `py-2` vertical padding inside the band
- Keep surah name left, juz/hizb right — but change color from `text-black dark:text-white` to `text-foreground` to respect theme tokens

### 3. Decorative footer

Replace the plain centered `{page}` div with:

```tsx
<div className="flex items-center justify-center gap-2 mt-4 pt-2 border-t border-border text-muted-foreground text-sm">
  <span>◆</span>
  <span>{page}</span>
  <span>◆</span>
</div>
```

The `◆` is a Unicode diamond bullet (U+25C6). `text-muted-foreground` keeps it subtle and theme-adaptive.

### 4. Fix token violations (in-scope since we touch these lines)

Current header uses `text-black dark:text-white` which breaks non-dark themes. Change to `text-foreground` while editing those lines.

## Files to Change

- `app/components/QuranSafha.tsx` — all visual changes: double-border frame, header band dividers, diamond footer, fix color tokens

## Constraints

- No changes to `page.tsx`, `QuranLine.tsx`, or `QuranWord.tsx`.
- No new CSS in `globals.css` — all styling via Tailwind utility classes.
- No hardcoded colors — all tokens from the shadcn semantic set.
- The `◆` diamond is a plain Unicode character in JSX; no icon library needed.
- Do not change the `fq-full-safha` or `fq-quran-safha` class names — they may be used for external targeting.
- The double-border frame must sit inside the existing `fq-full-safha` flex wrapper so the centering behavior is preserved.

## Decisions Made

- **Divider lines, not filled band** for the header: lighter, works across all three themes without needing theme-specific background colors.
- **Unicode ◆ diamond** flanking page number: no SVG, no icon library, fully renderable in all browsers.
- **`text-muted-foreground`** for the footer number: keeps it visually quieter than the main content, fitting the traditional mushaf footnote style.
- **`text-foreground`** for header text: fixes existing token violation in the same edit.

## What NOT to Do

- Do not add ornamental corner elements (absolutely-positioned divs, pseudo-elements via custom CSS) — CSS-only double border is the agreed approach.
- Do not apply any decoration outside the `QuranSafha` content div — nav arrows remain outside the mushaf frame.
- Do not use `bg-muted` or any background fill for the header band.
- Do not add a new theme or new CSS variables.
