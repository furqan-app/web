# Quran Page Mushaf Design Enhancement

**Type:** feature  
**Date:** 2026-07-01  
**Status:** implemented

## Summary

Enhance `QuranSafha` to visually evoke a printed mushaf: double-border frame, styled header band with divider lines, diamond-flanked page number footer. All via Tailwind/shadcn tokens — works across all three themes.

## Changes — `app/components/QuranSafha.tsx` only

### Double-border frame
Replace outer `w-fit py-6` wrapper with:
- Outer `div`: `border border-border p-1`
- Inner `div`: `border border-border p-6`

### Header band
Add `border-t border-border` above and `border-b border-border py-2` below the surah/juz row. Fix existing token violation: change `text-black dark:text-white` → `text-foreground`.

### Decorative footer
```tsx
<div className="flex items-center justify-center gap-2 mt-4 pt-2 border-t border-border text-muted-foreground text-sm">
  <span>◆</span><span>{page}</span><span>◆</span>
</div>
```
`◆` = U+25C6, plain Unicode in JSX, no icon library.

## Constraints

- No changes to `page.tsx`, `QuranLine.tsx`, or `QuranWord.tsx`.
- No new CSS — Tailwind utility classes only.
- No hardcoded colors.
- Do not rename `fq-full-safha` or `fq-quran-safha` class names.
- Double-border frame sits inside `fq-full-safha` flex wrapper to preserve centering.
- No `bg-muted` or background fill on the header band.
