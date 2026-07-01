# ADR 0006: Minimum floor for vh-derived Quran font size and spacing

**Date:** 2026-07-01
**Status:** Accepted

## Context

`FONT_V1`'s word font-size, per-line gap, and surah-heading block (ADR 0004) are pure `vh`-derived values with no lower bound. The browser recalculates them on any viewport-height change — a genuinely short window, but equally a normal-height window with DevTools docked to the bottom/side. Below roughly the 700px viewport height ADR 0004 already treats as its safety threshold, text keeps shrinking indefinitely and can become uncomfortably small (e.g. ~12px at a 400px viewport).

## Options Considered

**Option A — CSS `clamp(min, vh, max)`**
Wrap the vh expression in `clamp()` with an explicit upper bound. Requires picking an arbitrary max value that isn't actually needed (the scale slider already bounds the upper end via `quranFontScale` 1–10), adding an unused parameter.

**Option B — CSS `max(minPx, vh)`**
Wrap the vh expression in `max()`, giving a floor with no upper bound needed. Simpler than `clamp()` for this floor-only case; same arbitrary-value mechanics and same ADR 0005 safelist-regeneration obligation apply, just with a longer literal string per scale value.

## Decision

Option B. `FONT_V1` gains a flat `minFontSizePx = 24`, applied via `max(24px, {vh}vh)` to the word font-size Tailwind class, and proportionally to `--fq-line-gap` / `--fq-heading-h` (via the existing `lineGapRatio` and heading-block formula applied to the 24px floor instead of the vh value) so spacing doesn't visually decouple from the now-floored text. The floor is constant across all `quranFontScale` values — it's a readability minimum, not a per-scale preference.

## Consequences

- **+** Reading text and its surrounding rhythm never become unreadable regardless of viewport height, including DevTools-shrunk windows.
- **+** No unused upper-bound parameter to maintain, unlike `clamp()`.
- **+** Consistent with ADR 0004's existing accepted trade-off: below a certain viewport height, a bit of scroll may reappear — the floor makes that threshold explicit and readability-driven instead of open-ended.
- **-** The ADR 0005 safelist strings get longer (`max(24px,3.1vh)` instead of `3.1vh`) but the maintenance obligation is unchanged — still regenerate on any `baseScaleViewHeight`/multiplier change, now also on any change to `minFontSizePx`.
- **-** Below ~774px viewport height (where 3.1vh dips under 24px at default scale), the page will scroll again even though ADR 0004 aims for no-scroll at default scale — accepted, since a cramped font is worse than a few px of scroll.
