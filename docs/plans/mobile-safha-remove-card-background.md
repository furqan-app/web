# Remove Safha Card Background on Mobile

**Type:** bug/polish  
**Date:** 2026-07-03  
**Status:** implemented

## Summary

On mobile (`<md`), `QuranSafha`'s `bg-card` renders a visibly distinct paper-colored box over `bg-background`. All other card decorations (border, rounded, shadow) are already `md:`-only. Fix: make `bg-card` desktop-only too.

## Change — `app/components/QuranSafha.tsx`

`bg-card` → `md:bg-card` on the root safha div (~line 104).

## Constraints

- Desktop card look (border, rounded, shadow, bg-card) unchanged.
- Use semantic tokens only — no hardcoded colors.
