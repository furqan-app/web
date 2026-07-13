# Consolidate Mobile Safha Sizing Docs

**Type:** docs  
**Date:** 2026-07-03  
**Status:** implemented

## Summary

Three iterations of mobile safha sizing left four plan files and three ADRs. This consolidates them: one plan (`mobile-safha-sizing.md`, final as-built state) and one merged ADR (rewritten as `0011`, keeping that number).

Out of scope: `mobile-safha-remove-card-background.md`, `fix-mobile-swipe-direction.md` — distinct concerns.

## Files Changed

**Deleted plans:**
- `docs/plans/fix-mobile-font-scale.md`
- `docs/plans/mobile-safha-dvh-font.md`
- `docs/plans/mobile-safha-fullscreen.md`
- `docs/plans/mobile-safha-width-driven-fill.md`

**Created:** `docs/plans/mobile-safha-sizing.md` — final as-built state + brief history of superseded attempts.

**Deleted ADRs:**
- `docs/architecture/adr/0012-mobile-fullscreen-safha.md`
- `docs/architecture/adr/0013-mobile-safha-width-driven-flex-fill.md`

**Rewritten:** `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md` — merged ADR covering all three approaches (vw-per-scale, dvh-budget, width-driven-flex-fill). Decision section: width-driven-flex-fill, verbatim from former ADR 0013.

**Updated cross-references:**
- `docs/architecture/DECISIONS.md` — ADR reference updated to `0011`, supersession chain language removed.
- `docs/plans/mobile-safha-remove-card-background.md` — `ADR 0012/0013` → `ADR 0011`.

## Constraints

- Do not lose load-bearing technical content: `14.7` divisor rationale, never-wrap backstop, pages 1-2 centering, breathing-room padding.
- Keep ADR number `0011` — do not renumber.
- No code changes — docs only.
