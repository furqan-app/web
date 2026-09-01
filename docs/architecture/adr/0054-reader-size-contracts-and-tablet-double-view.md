# ADR 0054: Reader size contracts are per-band, and tablet is always double-page

> Renumbered from 0038 (2026-09-02, #492) — the number collided with 0038 Plan Engine Per-Track Verse Unit.

**Date:** 2026-08-11
**Status:** Accepted

## Context

The reader has three physically different surfaces: a width-filled mobile page, a full-viewport tablet spread, and a desktop book on a desk. A shared 1–10 `vh` scale was overridden independently by each surface, leaving the rendered word size, page width, line rhythm, and surah-start clearance without one reliable source of truth.

## Options Considered

**Option A — Retune `FONT_V1.lineGapRatio` and retain the shared 1–10 scale**
Preserves the existing control but leaves tablet's independent caps and desktop's unbounded viewport-height growth in place.

**Option B — One universal fixed-pixel font size**
Makes calibration simple at one reference viewport but fails to fit the distinct width and height constraints of phones and tablets.

**Option C — Per-band size contracts with desktop-only semantic presets**
Keep mobile's signed-off width-fit model, make tablet a responsive double-spread calculation, and give desktop capped Small/Medium/Large presets whose resolved size drives its page geometry.

## Decision

Choose Option C. Mobile remains unchanged and non-adjustable; tablet is always double-page and resolves `min(widthCap, heightCap) × 0.96`; desktop offers Small/Medium/Large presets of 26/28/30px, defaulting to Small, with the selected resolved size governing word ink, page width, frame fallback, and vertical rhythm together.

## Consequences

- **+** A taller desktop creates more line air rather than unboundedly larger text.
- **+** Tablet continues to fit both axes while reserving room for a real frame-to-Bismillah gap.
- **+** The legacy numeric preference can be retired without an ambiguous numeric-to-semantic migration: the new `desktopQuranFontSize` key starts at Small and the old key is ignored.
- **-** Desktop pages become physically narrower at smaller presets; glyphs must never be horizontally stretched to preserve the old page width.
- **-** The reader's sizing variables and the tablet navigation condition must be refactored together; changing only the font declaration recreates width drift, scroll, or an incorrect one-page tablet spread.
