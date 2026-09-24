---
title: "Recitation: Quick Playback Speed Selector on Player Bar & Vertical Rail"
type: feature
date: 2026-09-24
status: implemented
area: recitation
issue: 387
---

# Recitation: Quick Playback Speed Selector on Player Bar & Vertical Rail

## Summary

Add a quick playback speed control directly to `RecitationPlayerBar` (both the mobile/tablet bottom bar and the desktop vertical rail), allowing users to view and adjust recitation playback speed without opening the full `RecitationSettingsSheet`. A compact speed pill button in the utilities zone displays the current speed (e.g., `1x`, `1.25x`, `1.5x`). Each click/tap immediately cycles to the next preset speed (`0.5x → 0.75x → 1x → 1.25x → 1.5x → 1.75x → 2x → 0.5x`), updating `settings.playbackSpeed` in `RecitationContext`, syncing to `localStorage`, applying to `audio.playbackRate` mid-session without interruption, and staying in two-way sync with the full settings sheet.

## Approach

### Data & State Management
- `RecitationContext` already manages `settings.playbackSpeed`, persists it to `localStorage` under `recitationSettings` (via `app/utils/storage.ts`), and syncs `audioRef.current.playbackRate = settings.playbackSpeed` in a `useEffect`.
- `updateSettings({ playbackSpeed: nextSpeed })` is called directly on click. It commits immediately to state and storage, adjusting playback rate instantaneously mid-playback with no reload, re-render churn, or popover delay.
- `RecitationSettingsSheet` seeds its draft from `settings.playbackSpeed` on open and commits changes via `updateSettings` on Apply, ensuring bidirectional consistency between the bar/rail quick selector and the settings sheet.

### UI & Component Structure
- Integrated directly into `app/components/RecitationPlayerBar.tsx`:
  - Moved `Repeat` and `Speed` buttons to Row 2 (`fq-rail-zone fq-rail-transport`), flanking the 5 transport controls:
    `[Repeat] [Prev Ayah] [Prev Word] [Play/Pause] [Next Word] [Next Ayah] [Speed]`.
  - Row 1 (`fq-recitation-row-lead`) now exclusively houses `fq-recitation-info` (reciter selector + verse metadata) on the start flank and `Settings` + `Stop` on the end flank (`fq-rail-utils`). This reclaims ~60px of horizontal space on Row 1, preventing the reciter name and verse info from being cut off.
  - In desktop vertical rail mode (`globals.css`), `.fq-rail-transport` is vertically centered (`top: 50%; transform: translateY(-50%)`) and stacks all 7 buttons vertically, while `.fq-rail-utils` at `bottom: 28px` holds Settings and Stop.
  - Cycle array: `PLAYBACK_SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const` from `app/constants/recitation.ts`.
  - On click (`handleSpeedCycle`):
    - Uses `getNextPlaybackSpeed(settings.playbackSpeed)` to advance to the next preset or wrap around back to `0.5x` after `2x`.
    - Calls `updateSettings({ playbackSpeed: next })`.
  - Button styling: `className="fq-focus-ring relative flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[11px] font-medium tabular-nums transition-colors md:h-8 md:min-w-8 md:px-1.5 md:text-xs"`.
  - When `settings.playbackSpeed === 1`: standard neutral chrome (`fq-chrome-btn text-muted-foreground`).
  - When `settings.playbackSpeed !== 1`: active accent (`fq-chrome-btn-live text-primary font-semibold`) signalling non-standard speed.
  - Accessible label: `tRich("playbackSpeedWithVal", { speed: `${value}x` })`.
- No popover or dropdown needed — single-tap interaction mirrors the ayah repeat cycle button.

## Decision Tree / Algorithm

### 1. Speed Cycling Progression

| Current Speed | Next Speed on Click | Explanation |
|---|---|---|
| `0.5x` | `0.75x` | Minimum speed advances to next step |
| `0.75x` | `1x` | Below normal advances to normal |
| `1x` | `1.25x` | Normal advances to first accelerated step |
| `1.25x` | `1.5x` | Step up |
| `1.5x` | `1.75x` | Step up |
| `1.75x` | `2x` | Step up to maximum |
| `2x` | `0.5x` | Maximum wraps around back to minimum (cycle after 2x) |
| Non-preset value (e.g. legacy/custom) | `1x` | Resets to normal 1x baseline |

### 2. Button State & Styling

| Condition | Visual Styling | Text Content | Accessibility Label |
|---|---|---|---|
| `playbackSpeed === 1.0` | `fq-chrome-btn text-muted-foreground` | `1x` | `Playback speed: 1x` |
| `playbackSpeed !== 1.0` | `fq-chrome-btn-live text-primary font-semibold` | `${playbackSpeed}x` | `Playback speed: ${playbackSpeed}x` |

## Verified Test Cases

1. **Default State (1.0x Speed)**:
   - Initial load: button displays `1x` with neutral styling (`fq-chrome-btn text-muted-foreground`).
2. **Speed Step (1x → 1.25x)**:
   - User clicks speed button once.
   - `updateSettings({ playbackSpeed: 1.25 })` fires.
   - If audio is currently playing, `audio.playbackRate` immediately updates to 1.25 without stopping or rebuffering.
   - Button text updates to `1.25x` with active accent styling (`text-primary font-semibold`).
   - `localStorage` contains updated `playbackSpeed: 1.25`.
3. **Continuous Cycling**:
   - Successive clicks cycle: `1.25x → 1.5x → 1.75x → 2x → 0.5x → 0.75x → 1x`.
   - When reaching `1x`, button reverts to neutral styling (`fq-chrome-btn text-muted-foreground`).
4. **Desktop Rail Layout (≥1367px & ≥800px)**:
   - Repeat and Speed buttons reside inside the center `fq-rail-transport` vertical column, flanking the playback transport controls.
   - Button width fits inside 72px column (`h-8 min-w-8 px-1.5`).
5. **Mobile / Tablet Layout (<1367px or <800px)**:
   - Repeat and Speed buttons reside in Row 2 flanking the 5 transport controls: `[Repeat] [Prev Ayah] [Prev Word] [Play] [Next Word] [Next Ayah] [Speed]`.
   - Row 1 exclusively contains reciter selector, verse info, settings gear, and stop button.
6. **Cross-Component Sync with `RecitationSettingsSheet`**:
   - Click speed pill on bar to reach `1.5x` → open settings sheet → draft speed displays `1.5x`.
   - In settings sheet, step speed to `0.75x` and click Apply → player bar pill instantly displays `0.75x`. Next click on bar cycles to `1x`.

## Files to Change

- `app/constants/recitation.ts`:
  - Export `PLAYBACK_SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const`.
- `app/components/RecitationPlayerBar.tsx`:
  - Add `handleSpeedCycle` logic.
  - Move `Repeat` and `Speed` buttons to Row 2 (`fq-rail-transport`), flanking the 5 transport buttons.
  - Keep `Settings` and `Stop` in Row 1 (`fq-rail-utils`).
- `app/utils/recitation.ts`:
  - Export `getNextPlaybackSpeed(currentSpeed)` helper to step through presets and wrap around after 2x.
- `app/utils/recitation.test.ts`:
  - Unit tests covering `getNextPlaybackSpeed` cycling sequence and fallback behavior.
- `e2e/tests/recitation-lifecycle.spec.ts`:
  - E2E test verifying player bar speed button cycling, live `audio.playbackRate` update, and `localStorage` persistence.
- `messages/ar.json` & `messages/en.json`:
  - Ensure `recitation.playbackSpeedWithVal` translation key exists for tooltips and aria-labels.

## Constraints

- Desktop rail width is 72px (`globals.css`); speed button must stay compact (`h-8 min-w-8 px-1.5`) and fit within the column without causing lateral overflow.
- Playback speed changes must be instantaneous on the live HTMLAudioElement without reloading audio or re-fetching verse timings.
- Must honor `prefers-reduced-motion` and design token contracts from `docs/standards/styling.md`.

## What NOT to Do

- Do not open a popover or dropdown menu on click (superseded: direct cycle on click).
- Do not implement granular ±0.05 step adjustments in the player bar (those remain exclusively in `RecitationSettingsSheet`).
- Do not create a separate localStorage key or state store for quick speed — reuse `RecitationContext`'s `settings.playbackSpeed`.
- Do not alter `.fq-rail-zone`'s `display: contents;` contract in `app/globals.css`.

## Decisions Made

- Direct cycle on click selected over dropdown popover: provides instant, zero-overhead adjustment matching the ayah repeat cycle interaction.
- Cycle sequence: `0.5 → 0.75 → 1 → 1.25 → 1.5 → 1.75 → 2 → 0.5`.
- Pill appearance shows `{playbackSpeed}x` in tabular numerals, highlighted with `fq-chrome-btn-live text-primary` when speed is non-standard (!= 1x).
