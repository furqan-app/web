# Recitation Bar: Vertical Rail (Desktop)

**Type:** feature  
**Date:** 2026-08-02  
**Status:** implemented

## Summary

At ≥1367px wide + ≥800px tall (the existing Desktop Reading Group gate), the recitation player bar moves from a floating horizontal strip below the spread to a fixed vertical rail on the screen-right edge. Mobile and tablet keep the current bottom bar unchanged. The mushaf spread stays visually centered with no asymmetric offset — the rail overlays the lateral whitespace that already exists at that breakpoint (≥253px per side at 1367px, spread capped at 860px). This reclaims the 104px of bottom padding currently reserved for the bar and delivers the full height gain described in Trello #173 (pairs with #172, the reader rhythm ticket).

The title in Trello #173 says "desktop/tablet" — that wording is incorrect. Tablet (1024–1366px) has no lateral space (spread fills edge-to-edge); the rail is desktop-only.

## Approach

The bar remains `fixed z-40`, mounted once in `app/[locale]/layout.tsx` (unchanged). At the desktop breakpoint the CSS switches it from a full-width bottom bar into a narrow vertical column on the right. A JS conditional in the component handles the content layout difference (the horizontal layout's `flex-1` info div and reciter-name text are wrong shapes for a rail).

No DOM restructuring. No changes to `ReaderPager`, `ReaderPage`, or the pager strip.

## Decision Tree

| Breakpoint | Bar form | Position | Content |
|---|---|---|---|
| `< 1024px` (mobile) | full-width bottom bar | `fixed inset-x-0 bottom-0` | play/pause + reciter name + verse key + settings + stop |
| `1024–1366px` (tablet) | full-width bottom bar (overlay sync) | `fixed inset-x-0 bottom-0`, transforms with nav overlay | same |
| `≥1367px + ≥800px` (desktop) | vertical rail | `fixed right-6 top-1/2 -translate-y-1/2` | play/pause + verse key + settings + stop (no reciter name) |

The `isOverlayMode` path in `RecitationPlayerBar.tsx` is untouched — at ≥1367px `isOverlayMode` is always false, so it is inert.

## Verified Geometry

Measured 2026-08-01 (Trello #173 card):

| Viewport | current gap/em | with 60px bar removed |
|---|---|---|
| 1440×900 | 0.40 | **0.80** |
| 1920×1080 | 0.40 | **0.87** |
| 820×1180 | 0.40 | **0.90** |

Lateral clearance at ≥1367px: spread capped at 860px → ≥253px per side → 56px rail + 24px offset = 80px from spread edge, comfortably outside nav arrows (which sit at ~24px inline margin from the spread).

## Files to Change

- `app/components/RecitationPlayerBar.tsx`
  - Add `useIsDesktopRail()` or inline breakpoint hook (≥1367px + ≥800px) to conditionally render the rail layout vs the bar layout
  - Rail layout: `flex flex-col items-center gap-2.5 px-2 py-4` inner div; play/pause button; verse key in `<p>` (extra-small, centered); settings + stop icons
  - Bar layout: current `flex items-center gap-3 px-4 py-2.5` unchanged
  - Add marker classes `fq-recitation-info`, `fq-recitation-reciter-name`, `fq-recitation-verse-key` for CSS targeting if needed
  - Remove the `fq-recitation-bar-reader` class conditional that was only used to trigger the now-retired floating-bar CSS block — replace with a `fq-recitation-bar-rail` class that gates the rail CSS

- `app/globals.css` — `@media (min-width: 1367px) and (min-height: 800px)` block:
  - **Remove** `padding-bottom: 104px !important` from `.fq-reader-outer`
  - **Replace** the `.fq-recitation-bar-reader` floating-bar block with `.fq-recitation-bar-rail` rail block:
    - `right: 24px !important; top: 50%; transform: translateY(-50%); width: 56px;`
    - `inset-x: auto !important; bottom: auto !important; border-top: 1px solid; border-inline: 1px solid; border-bottom: 1px solid;` (full perimeter border)
    - `border-radius: calc(var(--radius) + 4px); box-shadow: var(--reader-chrome-bar-shadow);`
  - Keep the dark-theme background override block, updated to `.fq-recitation-bar-rail`

- `app/components/reader/QuranSpread.tsx`
  - Remove `useSpreadMetrics` hook (function definition + its call + `spreadRef` ref + `ref={spreadRef}` on `.fq-spread`)
  - Remove `useLayoutEffect`, `useEffect` imports if no longer used after removal

- `docs/architecture/DECISIONS.md` — "Desktop Reading Group" section:
  - Change description: bar is now a fixed-right vertical rail, not a floating centered card
  - Retire the `--fq-spread-width` / `--fq-spread-center` contract: these custom properties are no longer published or consumed; do not re-add them without a new justification
  - Remove the `padding-bottom: 104px` mention

## Constraints

- Mobile (< 1024px) and tablet (1024–1366px) bars are **not touched**.
- The mushaf spread must remain visually centered — no asymmetric offset, no change to `fq-reader-spread-container` padding.
- `RecitationSettingsSheet` portals into its own SheetContent node for Radix focus-trap reasons (DECISIONS.md); `openSettings()` call on the gear button stays intact, no changes to the sheet.
- `--reader-chrome-bar-shadow` is `none` in dark theme; the rail must honour this — do not add a shadow override. Verified by sampling rendered pixels in all three themes.
- The recitation bar is also shown on `/mushaf/[grant]/pages/[id]` (the shared-access reader) — the same CSS gate covers both routes since both use the same `RecitationPlayerBar` component.

## What NOT to Do

- Do not re-add `--fq-spread-width` / `--fq-spread-center` publishing in `QuranSpread` or anywhere else for the purpose of positioning the bar. The rail is fixed-right at a viewport offset; it does not need to know the spread's dimensions.
- Do not apply the rail to tablet (1024–1366px). The spread fills edge-to-edge on tablet; there is no lateral space.
- Do not add asymmetric padding to the spread container to "make room" for the rail. The rail overlays the existing whitespace.
- Do not use `writing-mode: vertical-rl` for the reciter name in the rail — reciter name is hidden in the rail entirely; the settings sheet already shows it.
- Do not change the `isOverlayMode` / `translate-y-full` logic — it is inert at ≥1367px and correct for tablet.

## Decisions Made

- Rail position: fixed right, `right: 24px`, vertically centered (`top: 50% + translateY(-50%)`). Not locale-aware — always right side regardless of AR/EN.
- Rail content: play/pause + verse key + settings + stop. Reciter name omitted (visible in settings sheet).
- Rail width: 56px.
- `useSpreadMetrics` is removed entirely — the hook's only consumer was the retired floating-bar CSS block.
- Trello card title "desktop/tablet" is corrected to "desktop only" in this plan.
