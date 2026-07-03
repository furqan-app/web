# Remove Safha Card Background on Mobile

**Type:** bug/polish
**Date:** 2026-07-03
**Status:** implemented

## Summary

On mobile (`<md`), the `QuranSafha` root card already drops border, rounded corners, and shadow (all `md:`-only classes) to achieve the fullscreen look decided in ADR 0011. However, `bg-card` has no `md:` prefix, so mobile still renders a visibly distinct paper-colored box behind the reading area, on top of the page's `bg-background` (e.g. sepia theme: `--background: 43 41% 88%` vs `--card: 48 38% 97%`). The user wants this removed so the safha area on mobile blends directly into the page background with no separate colored surface.

## Approach

In `app/components/QuranSafha.tsx`, make `bg-card` desktop-only (`md:bg-card`) on the safha root div (line 104), so mobile has no explicit background class and inherits the page's `bg-background` from the parent wrapper in `app/[locale]/pages/[id]/page.tsx`. Desktop keeps its existing card look (border, rounded corners, shadow, bg-card) unchanged.

## Files to Change

- `app/components/QuranSafha.tsx` — change `bg-card` to `md:bg-card` on the root safha `div` (~line 104).

## Constraints

- Do not touch `md:` prefixed decorative classes (border, rounded, shadow) — desktop card look is unchanged and out of scope.
- Do not hardcode colors — keep using the semantic `bg-card`/`bg-background` tokens (per `docs/standards/styling.md`).
- Must hold across all themes (light/dark/sepia etc.), not just the default.

## Decisions Made

- No ADR needed — this is a one-line class scoping fix, not a new architectural decision.
