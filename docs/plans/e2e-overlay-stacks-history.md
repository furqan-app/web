---
title: "Complex E2E & Fix: Multi-Layer Overlay Stacks, Gesture Interrupts & History Traversal"
type: feature
date: 2026-09-03
status: implemented
area: nav
issue: 472
---

# Complex E2E & Fix: Multi-Layer Overlay Stacks, Gesture Interrupts & History Traversal

**GitHub Issue:** [#472](https://github.com/furqan-app/web/issues/472)  
**Parent Epic:** [#466](https://github.com/furqan-app/web/issues/466)

## Summary

Implement a deterministic behavioral Playwright end-to-end test suite (`e2e/tests/overlay-stacks-history.spec.ts`) and harden cascading overlay dismissal order (LIFO), gesture interrupts, and multi-hop browser Back/Forward traversal. The implementation verifies: (1) multi-layer overlay hierarchies and in-sheet sub-layers (Sidebar → Ayah Picker tab → Surah picker accordion & search filter), ensuring strict LIFO dismissal via the Escape keyboard shortcut (text clears first, picker collapses second, sheet closes third); (2) mobile back-gesture dismissal of nested sub-layers and modal sheets via `useCloseOnBackGesture` without prematurely closing parent sheets or triggering the reader's `AndroidBackExitGuard` exit toast; (3) sheet-contained popovers (`RecitationSettingsSheet` → `ReciterCombobox` and `TafsirSheet` → `TafsirEditionSelect`) closing independently via Escape and outside backdrop taps while keeping the parent sheet open; (4) cross-overlay sequential transitions (`MarkModal` → `TafsirSheet`) without history echo collisions; and (5) sequential multi-hop browser history traversal (Home → Search → Reader → Sidebar → Reader) with browser Back and Forward navigation returning cleanly across route boundaries.

## Root Cause / Approach

### 1. Ayah Picker In-Sheet Sub-Layer Escape Contract

- **Issue:** In [`app/components/nav/AyahPicker.tsx`](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/app/components/nav/AyahPicker.tsx#L120-L132), the Escape key handler (`makeKeyDown`) only intercepts Escape when `value.trim()` is non-empty (clearing the typed query). When `listQuery` is empty while the surah picker list is expanded (`picking === true`), pressing Escape allows the event to bubble up to the parent Radix `SheetContent`. This immediately dismisses the entire Sidebar sheet rather than collapsing the inline picker list first.
- **Fix:** Update Escape key handling in `AyahPicker.tsx`:
  1. When `listQuery.trim()` is non-empty: clears `listQuery`, calls `e.preventDefault()` and `e.stopPropagation()`.
  2. When `listQuery.trim()` is empty and `picking === true`: collapses the surah picker list (`setPicking(false)`), calls `e.preventDefault()` and `e.stopPropagation()`. Focus returns to the target selector button.
  3. Subsequent Escape presses (when `picking === false`) are permitted to bubble to the Radix Sheet, closing the Sidebar.

### 2. Sub-Layer Back Gesture Integration

- **Issue:** On mobile standalone PWA (`useIsStandaloneMobileOrTablet()`), opening the surah picker list inside the Ayah Picker tab (`picking === true`) does not register its own history guard. When the user performs a back swipe, the parent Sidebar's `useCloseOnBackGesture` catches the event, closing the entire Sidebar rather than just collapsing the picker.
- **Fix:** Equip `AyahPicker`'s `picking` state with `useCloseOnBackGesture(picking, () => setPicking(false))`. This pushes a guard entry while `picking` is open, ensuring a back swipe pops the picker accordion first while keeping the Sidebar sheet open.

### 3. Strict LIFO Stacking in `useCloseOnBackGesture`

- **Issue:** In [`app/hooks/use-close-on-back-gesture.ts`](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/app/hooks/use-close-on-back-gesture.ts#L221-L235), `onPopState` is attached directly to `window`. If two guards are armed concurrently (such as a parent Sheet and a nested sub-layer, or during cross-overlay transitions), a single `popstate` event invokes every attached listener, dismissing multiple layers at once. Furthermore, when an overlay closes programmatically (via Escape, X button, or backdrop tap), its cleanup executes `history.back()`, which fires a `popstate` event that underlying listeners could misinterpret as an external back gesture.
- **Fix:** Ensure the guard tracking in `overlay-back-guard.ts` and `useCloseOnBackGesture` manages active guards in a strict LIFO stack (ordered by `fqOverlayGuardId`):
  1. On a real back gesture / `popstate`, only the topmost active guard in the stack invokes its `onClose` callback and disarms. Lower guards remain armed and in place.
  2. When the topmost guard self-closes via `history.back()`, the resulting echo is swallowed exclusively by that guard without disturbing underlying guards.

### 4. Sheet Focus Trapping & Popover Containment

- In accordance with ADR 0020 and ADR 0021 (Addendum 5b), in-sheet Popovers (`ReciterCombobox` in `RecitationSettingsSheet`, `TafsirEditionSelect` in `TafsirSheet`) pass `portalContainer={sheetContentEl}` to prevent Radix `FocusScope` from yanking focus away from the popover to the underlying sheet.
- Playwright tests verify that tapping outside the popover (or pressing Escape) dismisses only the popover while retaining the sheet and its focus.

### 5. Multi-Hop History Traversal

- Verifies that navigating from Home (`/[locale]`) to Reader via Search pushes a single clean route entry.
- Opening and closing overlays in the Reader does not pollute the route history.
- Browser Back (`page.goBack()`) returns cleanly to Home.
- Browser Forward (`page.goForward()`) navigates back to the Reader without re-triggering exit toasts or getting trapped in intermediate states.

## Decision Tree / Algorithm

### Cascading Dismissal & Traversal Matrix

| Layer / Flow | Context & Starting State | Trigger / User Action | Expected System Behavior & Assertions |
|---|---|---|---|
| **Ayah Picker: Filter Query Clear** | Desktop / Mobile: Sidebar open, Ayah Picker tab, `picking: true`, `listQuery` has text | Press `Escape` | `listQuery` is cleared. Inline surah list stays visible (`picking === true`). Sidebar sheet remains open. |
| **Ayah Picker: Picker Collapse** | Desktop / Mobile: Sidebar open, Ayah Picker tab, `picking: true`, `listQuery` empty | Press `Escape` | Surah list collapses (`picking = false`). Ayah Picker returns to surah header & ayah chips. Sidebar remains open. |
| **Sidebar Drawer Dismissal** | Desktop / Mobile: Sidebar open, `picking: false` | Press `Escape` or click sheet backdrop | Sidebar sheet closes. Reader remains active and visible. |
| **Mobile Back: Nested Sub-layer** | Mobile standalone PWA: Sidebar open, Ayah Picker tab, `picking: true` | Swipe back (`popstate`) | Surah list collapses (`picking = false`). Sidebar remains open. |
| **Mobile Back: Sidebar Sheet** | Mobile standalone PWA: Sidebar open, `picking: false` | Swipe back (`popstate`) | Sidebar sheet closes. Reader remains active. |
| **Mobile Back: Reader Exit Guard** | Mobile standalone Android PWA: Reader page, no overlays open | Swipe back (`popstate`) | `AndroidBackExitGuard` intercepts — displays "press back again to exit" toast. User stays in Reader. |
| **Sheet + Popover Dismissal** | `RecitationSettingsSheet` open + `ReciterCombobox` popover open | Press `Escape` or click backdrop outside popover | Closes `ReciterCombobox` popover only. `RecitationSettingsSheet` remains open. |
| **Sheet Dismissal** | `RecitationSettingsSheet` open, popover closed | Press `Escape` or click sheet backdrop | Closes `RecitationSettingsSheet`. Player bar and Reader remain active. |
| **Overlay Cross-Transition** | `MarkModal` open on Reader page | Click "Tafsir" utility rail button | Closes `MarkModal` and opens `TafsirSheet`. History stack updates cleanly without premature auto-close. |
| **Multi-Hop Traversal (Forward)** | Home (`/ar`) → Search for "الحمد لله" → Click verse 1:2 result | Route navigates to Reader (`/ar/pages/1?highlight=1:2...`) | Reader mounts with highlighted verse. Sidebar opens and closes cleanly. |
| **Multi-Hop Traversal (Back)** | On Reader after Home → Search flow | Browser Back (`page.goBack()`) | Navigates back to Home (`/ar`). |
| **Multi-Hop Traversal (Forward Return)** | On Home after Back navigation | Browser Forward (`page.goForward()`) | Navigates back to Reader (`/ar/pages/1`). |

## Verified Test Cases

### Test Suite: `e2e/tests/overlay-stacks-history.spec.ts`

1. **Ayah Picker 3-Tier LIFO Dismissal via Escape:**
   - Navigate to `/ar/pages/1`, open Sidebar via nav trigger, switch to Ayah Picker tab.
   - Click surah selector to open inline picker list (`picking === true`).
   - Type "الكهف" into `surahSearch` input.
   - Press `Escape`: assert input value becomes `""`, inline picker list remains open.
   - Press `Escape`: assert inline picker list collapses (`picking === false`), surah header and ayah chips are visible, Sidebar remains open.
   - Press `Escape`: assert Sidebar sheet closes, reader content remains visible.

2. **Mobile Standalone Back-Gesture LIFO on Nested Overlay:**
   - Spoof standalone PWA (`isStandaloneDisplayMode`) on mobile viewport.
   - Open Sidebar, switch to Ayah Picker tab, open surah selector (`picking === true`).
   - Trigger back gesture (`history.back()` / popstate): assert inline picker collapses (`picking === false`), Sidebar remains open.
   - Trigger back gesture: assert Sidebar closes, Reader remains visible.
   - Trigger back gesture on Reader: assert `AndroidBackExitGuard` exit toast appears ("اضغط رجوع مرة أخرى للخروج"), Reader does not exit.

3. **Recitation Settings Sheet + Reciter Combobox Popover LIFO:**
   - Open `RecitationSettingsSheet` via bottom player settings trigger.
   - Open `ReciterCombobox` popover.
   - Press `Escape`: assert popover closes, `RecitationSettingsSheet` remains open.
   - Press `Escape`: assert `RecitationSettingsSheet` closes.

4. **MarkModal to TafsirSheet Transition Stability:**
   - Navigate to `/ar/pages/1`, click Quran word `1:1:1` to open `MarkModal`.
   - Click "Tafsir" button on MarkModal rail.
   - Assert `MarkModal` closes and `TafsirSheet` opens.
   - Press `Escape` or trigger back gesture: assert `TafsirSheet` closes cleanly without reopening MarkModal or navigating away.

5. **Multi-Hop History Traversal (Home → Search → Reader → Sidebar → Reader):**
   - Navigate to `/ar`, open search overlay, search "الحمد لله", click result for 1:2.
   - Assert URL is `/ar/pages/1?highlight=...`.
   - Open Sidebar, then close Sidebar via backdrop tap.
   - Call `page.goBack()`: assert URL returns to `/ar`.
   - Call `page.goForward()`: assert URL returns to `/ar/pages/1` with reader content mounted.

## Files to Change

- `app/components/nav/AyahPicker.tsx` — Implement 2-stage Escape handler (clear text -> collapse picker) in `makeKeyDown`, and add `useCloseOnBackGesture(picking, () => setPicking(false))` for mobile standalone LIFO.
- `app/hooks/use-close-on-back-gesture.ts` & `app/utils/overlay-back-guard.ts` — Harden guard stack order so concurrent or nested guards pop strictly in LIFO order without triggering underlying listeners.
- `e2e/tests/overlay-stacks-history.spec.ts` — Dedicated end-to-end Playwright test suite covering all verified test cases above.

## Constraints

- **Focus Trap Isolation (ADR 0020, ADR 0021):** In-sheet popovers must continue portaling to `sheetContentEl` / `dialogContentEl` to avoid fighting with Radix `FocusScope`.
- **Fresh History Objects:** Every `history.pushState` call must allocate a fresh state object (ADR 0040) — never a shared module-level constant.
- **No Competing Backguards:** Only one guard layer handles a given back press at a time. `AndroidBackExitGuard` must remain silent while any overlay guard is armed (`isOverlayBackGuardArmed() > 0`).
- **Id-Scoped Echo Suppression:** Programmatic `history.back()` from an overlay self-closing must match by `fqOverlayGuardId`, ensuring sibling and parent guards do not intercept the echo.

## What NOT to Do

- Do NOT allow arbitrary modal sheets to open concurrently on top of each other without individual dismissal paths — modal backdrops must remain modal.
- Do NOT bypass `AndroidBackExitGuard`'s `isOverlayBackGuardArmed()` check.
- Do NOT use `router.push()` for overlay opens or in-reader flips.
- Do NOT remove `relative z-10` from `<nav>` or violate overlay z-index ceilings (`z-50`).

## Decisions Made

- Adopted **Option A**: Hardened LIFO across real nested layers (`Sidebar` → `AyahPicker` surah accordion, `RecitationSettingsSheet` → `ReciterCombobox`), seamless cross-overlay transitions (`MarkModal` → `TafsirSheet`), and multi-hop route traversal (`Home` → `Search` → `Reader` → `Sidebar` → `Reader`).
