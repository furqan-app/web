---
title: Native Touch Long-Press for Word Marking
type: bug
date: 2026-09-06
status: implemented
area: reader
issue: 583
---

# Native Touch Long-Press for Word Marking

## Summary

In mobile and tablet reader overlay mode (`isOverlayMode`), the long-press gesture on a Quran word to open the mark modal feels unnatural, sluggish, and non-native. Currently, `QuranWord.tsx` records `pressStartTime` on `onTouchStart` and only triggers `onWordLongPressed` on `onTouchEnd` if `Date.now() - pressStartTime >= 500ms`. Users must lift their finger after holding for anything to happen, leaving them uncertain if the gesture registered and adding release reaction lag (~800–900ms perceived delay). This task converts the gesture to a native timer-driven pattern (`setTimeout` for 400ms while the finger is still held down) with slop movement cancellation (`onTouchMove`), unmount cleanup, subtle haptic vibration, and clean synthetic click suppression on `onTouchEnd`.

## Root Cause / Approach

1. **Root Cause:**
   - In `app/components/QuranWord.tsx`, long-press logic is evaluated strictly inside `onTouchEnd`. Holding down for 500ms or even several seconds yields zero visual or functional feedback until the user releases their touch.
   - If the user releases slightly early (<500ms), it drops through as a short tap and toggles the nav overlay instead of marking.
   - Movement slop (`LONG_PRESS_SLOP = 10px`) is only evaluated at `onTouchEnd`; finger drag during a swipe does not cancel the gesture while in motion.

2. **Approach:**
   - Store a `timerRef` in `QuranWord.tsx`.
   - On `onTouchStart` (when `isOverlayMode` is true), record touch start coordinates (`pressStartX.current`, `pressStartY.current`) and start a timer with `LONG_PRESS_MS = 400`.
   - When the timer fires while still pressed:
     - Set `didLongPress.current = true`.
     - Trigger subtle haptic feedback if supported (`if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(15)`).
     - Call `onWordLongPressed?.(word)`.
   - On `onTouchMove` (when `isOverlayMode` is true):
     - Calculate distance from `(pressStartX.current, pressStartY.current)`.
     - If distance > `LONG_PRESS_SLOP` (10px), immediately clear the timer and reset tracking so the reader swipe gesture proceeds without interruption.
   - On `onTouchEnd` (when `isOverlayMode` is true):
     - Clear the pending timer if it hasn't fired yet.
     - If `didLongPress.current` is true, call `e.preventDefault()` to suppress the synthetic click event (preventing `ReaderPager.onClick` from toggling the nav overlay), then reset `didLongPress.current = false`.
   - On `onTouchCancel` (when `isOverlayMode` is true):
     - Clear the timer and reset `didLongPress.current = false`.
   - Unmount / cleanup:
     - Ensure the timer is cleared if `QuranWord` unmounts during an active touch.

## Decision Tree / Algorithm

| Gesture | Interaction During Touch | Outcome on Release / Completion |
|---|---|---|
| **Short Tap (<400ms)** | `onTouchStart` sets 400ms timer; movement <= 10px. | `onTouchEnd` fires before timer: timer cleared; `didLongPress` is false; synthetic `click` fires; `QuranWord.onClick` returns early in overlay mode; bubbles to `ReaderPager.onClick` calling `toggleOverlay()`. |
| **Long Press (>=400ms)** | User holds finger stationary. At exactly 400ms, timer fires: `didLongPress = true`, haptic pulse (15ms), `onWordLongPressed(word)` opens `MarkModal`. | Finger released later (`onTouchEnd`): timer already cleared; `didLongPress` is true -> calls `e.preventDefault()`; no synthetic click; nav overlay stays untouched. |
| **Page Swipe / Scroll** | User touches and moves finger > 10px before 400ms. | `onTouchMove` detects `dx^2 + dy^2 > 10^2`: timer cleared immediately. `onTouchEnd` does nothing. Carousel / swipe navigation in `ReaderPager` continues smoothly. |
| **Touch Interrupted** | OS interrupt (call, gesture bar, etc.). | `onTouchCancel` clears timer and resets `didLongPress = false`. |

## Verified Test Cases

- **Mobile Reader Page Word Long Press:**
  - On `/ar/pages/1` (mobile viewport <= 767px or tablet 1024–1366px), press and hold a word.
  - At 400ms (while finger is still touching screen), Mark Modal opens and phone performs subtle haptic vibration.
  - Release finger: modal stays open, nav overlay does not toggle.
- **Short Tap for Nav Toggle:**
  - Quick tap (<400ms) on a word or page background in overlay mode.
  - Mark modal does not open; nav overlay toggles in/out.
- **Swipe to Next/Prev Page:**
  - Touch down on a word and immediately drag horizontally to turn page.
  - Long-press timer cancels on move > 10px; page flips without opening mark modal.
- **Desktop Reader Unaffected:**
  - At desktop width (>= 1367px), `isOverlayMode` is false.
  - Normal click opens Mark Modal immediately via `onWordClicked`; touch listeners remain inactive.
- **Existing Playwright E2E:**
  - `e2e/tests/word-marking.spec.ts` ("Mobile Long-Press Interaction") runs `longPressWord(page, firstWord, 600)`.
  - The 400ms timer fires during the 600ms hold, opening the dialog; `touchend` at 600ms prevents default; dialog assertions pass.

## Files to Change

- `app/components/QuranWord.tsx` — Replace `onTouchEnd`-delayed elapsed check with 400ms `setTimeout` triggered on `onTouchStart`, add `onTouchMove` slop cancellation, haptic feedback, unmount cleanup, and `didLongPress` suppression on `onTouchEnd`.

## Constraints

- Desktop behavior must remain completely untouched (`isOverlayMode === false`).
- Do not introduce external animation or gesture libraries (keep pure React touch events and CSS standards).
- Haptic feedback must be safe for environments without `navigator.vibrate` (e.g. desktop, Safari, SSR) and wrap in feature detection.
- `LONG_PRESS_SLOP` (10px) must stay respected so reading swipes are never blocked.
- Touch listeners must clean up all timers on unmount to prevent state updates on unmounted components.

## What NOT to Do

- Do NOT change desktop word click handling or remove `onWordClicked`.
- Do NOT change the 10px slop threshold or break page swiping in `ReaderPager`.
- Do NOT add heavy third-party gesture libraries.
- Do NOT trigger the modal on `onTouchEnd`.

## Decisions Made

- Timer duration set to 400ms for optimal balance of responsiveness and swipe tolerance.
- Added 15ms haptic vibration (`navigator.vibrate?.(15)`) for tactile confirmation on supported devices.
