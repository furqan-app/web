# ADR 0005: Tailwind safelist for dynamic Quran font-size classes

**Date:** 2026-07-01
**Status:** Accepted

## Context

`QuranSafha`'s word font-size is user-scalable (1–10) and rendered via a runtime-interpolated Tailwind arbitrary class: `` md:text-[${FONT_V1.getWordFontSizeByScale(scale)}vh] ``. Tailwind's JIT scanner only generates CSS for class strings it can find literally in source — it cannot evaluate the template literal at build time. Changing `FONT_V1.baseScaleViewHeight` without updating the matching safelist silently drops the CSS for every value outside the old list: the class renders with no effect and the element falls back to the unconstrained `text-[4.4vw]` mobile class, producing oversized text and layout overflow at desktop widths. This exact failure was hit and diagnosed live while tuning the default font size down from `baseScaleViewHeight: 3.4` to `2.9`.

## Options Considered

**Option A — Keep the Tailwind arbitrary-class + manual safelist array**
Continue computing the class name string at runtime, and hand-maintain a literal-string array (`tailwindFontUtility`) covering every value the current `baseScaleViewHeight` + scale range (1–10) can produce, purely so Tailwind's JIT scanner sees them.

**Option B — Switch to inline `style={{ fontSize: ... }}`**
Drop the Tailwind class entirely for the word font-size and set it via inline style, computed in JS. Removes the safelist-drift failure mode entirely, but the current design also needs a *different* font-size below the `md` breakpoint (`text-[4.4vw]`), which would require a `matchMedia`/resize listener to replicate in JS — more runtime complexity for a component that's supposed to stay JS-light on initial render.

## Decision

Option A, kept as-is, with the invariant made explicit: **any change to `FONT_V1.baseScaleViewHeight` or the per-scale multiplier must be paired with regenerating `tailwindFontUtility` in the same commit** to cover the new value range for `quranFontScale` 1–10.

## Consequences

- **+** No new runtime complexity or media-query JS — the existing `md:` responsive breakpoint switch keeps working via pure CSS.
- **+** The failure mode is now documented, so future scale-tuning doesn't silently reintroduce it.
- **-** The safelist is a manually-maintained, easy-to-forget artifact — nothing enforces the pairing except this ADR and code review. A future improvement could generate it from `FONT_V1` at build time instead of hand-listing values, but that's out of scope for this fix.
