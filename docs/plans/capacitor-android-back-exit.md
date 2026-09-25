---
title: Capacitor Android: Close overlays on back and exit app via App.exitApp() on double-back in reader
type: bug
date: 2026-09-24
status: implemented
area: pwa
issue: 682
adr: [0072]
---

# Capacitor Android: Close overlays on back and exit app via App.exitApp() on double-back in reader

## Summary

In the Capacitor Android hosted shell, pressing the back button twice in the Quran reader does not close the app because `window.close()` is a no-op inside mobile WebViews. Furthermore, default Capacitor back-button handling lacks coordination with Furqan's existing web back-guard stack (`overlay-back-guard.ts` and `useCloseOnBackGesture`). Fix by wiring `@capacitor/app`'s `backButton` listener in an app-wide client component (`NativeBackButtonListener`), gated on `isNativePlatform() && isAndroid()`. When an overlay guard is armed (`isOverlayBackGuardArmed()`) or `canGoBack` is true, delegate to `window.history.back()` so open sheets/dialogs close without navigating the underlying page and the reader's double-push history machine triggers properly. In `AndroidBackExitGuard`, trigger `@capacitor/app`'s `App.exitApp()` on the second press within the 2s window. Outside the reader and with no overlays open, allow standard back traversal or exit when at the history root. Additionally, upgrade `ExitToast` to a high-contrast warning design with `AlertTriangle` icon and clearer copy ("اضغط رجوع مرة أخرى للخروج من التطبيق" / "Press back again to exit the app").

## Root Cause / Approach

- **Root Cause**:
  1. In Android WebViews, `window.close()` has no effect unless explicitly intercepted by native WebChromeClient methods.
  2. When `@capacitor/app`'s `backButton` listener is not attached, Capacitor Android only calls `webView.goBack()` if `canGoBack()` is true, and does not finish the Activity when `canGoBack()` is false. When `AndroidBackExitGuard` attempts `window.close()`, it silently fails.
  3. Registering `App.addListener('backButton')` suppresses Capacitor's automatic webview navigation and delegates all back-button events to JavaScript. Without a listener coordinating with web guards, hardware back gestures would bypass `isOverlayBackGuardArmed()`.
- **Approach**:
  1. Create `app/lib/shell/back-button.ts` with `handleNativeBackButton(canGoBack)` and `exitNativeApp()`.
  2. Create `app/components/shell/NativeBackButtonListener.tsx` mounted in `app/[locale]/layout.tsx` alongside `NativeAuthReturnListener`, gated strictly on `isNativePlatform() && isAndroid()`.
  3. In `handleNativeBackButton(canGoBack)`:
     - If `isOverlayBackGuardArmed()` is true: call `window.history.back()` to pop the overlay guard entry (handled by `useCloseOnBackGesture`).
     - Else if `canGoBack` is true: call `window.history.back()`. Inside the reader, this pops `AndroidBackExitGuard`'s guard entry, firing `onPopState`; outside the reader, this performs standard history back traversal.
     - Else (history root, outside reader, no overlay): call `exitNativeApp()` (`App.exitApp()`).
  4. In `AndroidBackExitGuard.tsx`:
     - On the second back press within 2s, call `exitNativeApp()` if running on native Android (`isNativePlatform() && isAndroid()`), retaining `window.close()` for standalone PWA.
  5. In `ExitToast.tsx`:
     - Update styling to use semantic warning tokens: `border border-warning/40 bg-warning/15 text-foreground backdrop-blur-md` with Lucide `AlertTriangle` icon (`text-warning`).
     - Update translations in `messages/ar.json` and `messages/en.json` to "اضغط رجوع مرة أخرى للخروج من التطبيق" and "Press back again to exit the app".

## Decision Tree / Algorithm

When the hardware/gesture back button is pressed in Capacitor Android:

| App Context | Condition | Action | Result |
|---|---|---|---|
| **Any page** | `isOverlayBackGuardArmed()` is `true` | `window.history.back()` | Top overlay closes via `useCloseOnBackGesture`; reader or underlying page is untouched |
| **Reader** | First press (`!armed`) | `window.history.back()` | `AndroidBackExitGuard` re-pushes guard state, shows warning `ExitToast`, arms 2s timer |
| **Reader** | Second press within 2s (`armed`) | `window.history.back()` | `AndroidBackExitGuard` disarms, calls `exitNativeApp()` to terminate the app |
| **Reader** | Press after 2s window expires | `window.history.back()` | Treated as a new first press: shows `ExitToast`, re-arms 2s timer |
| **Outside reader** | `canGoBack` is `true` | `window.history.back()` | Standard web backward navigation (e.g. Settings → Home) |
| **Outside reader** | `canGoBack` is `false` (history root) | `exitNativeApp()` | App terminates via `App.exitApp()` |

## Verified Test Cases

- **Case 1 (Reader first press)**: On `/ar/pages/1`, pressing back shows the warning exit toast ("اضغط رجوع مرة أخرى للخروج من التطبيق") with `AlertTriangle` icon and arms the 2-second window.
- **Case 2 (Reader double-back exit)**: Pressing back a second time within 2 seconds calls `App.exitApp()`, closing the app.
- **Case 3 (Reader disarm timeout)**: Waiting > 2 seconds hides the toast; a subsequent back press is treated as a new first press (shows toast again, does not exit).
- **Case 4 (Single overlay open in reader)**: Opening `Sidebar` (or `MarkModal`, `SettingsSidebar`, `RecitationSettingsSheet`, `TafsirSheet`) and pressing back closes the overlay without showing `ExitToast` or moving the reader page.
- **Case 5 (Nested overlays in reader)**: Opening `Sidebar` and then `AyahPicker`: first back press collapses `AyahPicker`; second back press closes `Sidebar`; third back press shows `ExitToast` on the reader.
- **Case 6 (Outside reader with history)**: Navigating from `/ar` (Home) to `/ar/settings`, pressing back returns to `/ar`.
- **Case 7 (Outside reader at root)**: Cold launching on `/ar` (history root) and pressing back exits the app via `App.exitApp()`.
- **Case 8 (Grant reader)**: On `/mushaf/[grantId]/pages/1` (`active={false}` in `AndroidBackExitGuard`), back navigates to prior page or exits at history root without showing `ExitToast`.
- **Case 9 (Web / Standalone PWA parity)**: Native listener is completely inert (`isNativePlatform()` is false); web PWA uses `window.close()` on double-back as before. Substring matching in Playwright e2e (`getByText(/اضغط رجوع مرة أخرى للخروج|Press back again to exit/)`) remains fully compatible.

## Files to Change

- `app/lib/shell/back-button.ts` [NEW] — `handleNativeBackButton(canGoBack)` and `exitNativeApp()`.
- `app/lib/shell/back-button.test.ts` [NEW] — unit tests for native back button delegator and exit function.
- `app/components/shell/NativeBackButtonListener.tsx` [NEW] — app-wide listener for `@capacitor/app` `backButton` event, gated on `isNativePlatform() && isAndroid()`.
- `app/components/reader/AndroidBackExitGuard.tsx` [MODIFY] — trigger `exitNativeApp()` on 2nd back press within 2s when `isNativePlatform() && isAndroid()`.
- `app/components/reader/ExitToast.tsx` [MODIFY] — warning styling with `AlertTriangle` icon and semantic warning tokens.
- `app/[locale]/layout.tsx` [MODIFY] — mount `<NativeBackButtonListener />`.
- `messages/ar.json` and `messages/en.json` [MODIFY] — clearer toast copy.
- `docs/architecture/decisions/pwa.md` [MODIFY] — record Capacitor back button handling and delegation under "Mobile App Packaging".
- `docs/architecture/COMPONENTS.md` [MODIFY] — document NativeBackButtonListener, AndroidBackExitGuard, and ExitToast changes.

## Constraints

- Must delegate to existing web guards (`overlay-back-guard.ts` flag, `useCloseOnBackGesture`, `AndroidBackExitGuard`) rather than creating a parallel bypass system (ADR 0072).
- Allocate fresh history state objects per push (`guardState()`), never shared constants (ADR 0040).
- Gate native listener and native exit strictly on `isNativePlatform() && isAndroid()`.
- Dynamically import `@capacitor/app` only — never in the static web bundle path.
- Do not break or alter standalone web PWA back navigation or `window.close()` behavior.
- UI styling must adhere strictly to design tokens (semantic `warning`, no raw hex or Tailwind `amber-*`).

## What NOT to Do

- Do not implement a parallel back-handling stack in the native shell that duplicates or bypasses `overlay-back-guard.ts` or `useCloseOnBackGesture`.
- Do not statically import `@capacitor/app` in client components or web modules.
- Do not alter iOS back gesture behavior (iOS has no hardware back button).
- Do not remove `window.close()` from `AndroidBackExitGuard` (required for standalone PWA on Android Chrome).
- Do not use raw colors or `amber-*` classes for the warning toast.

## Decisions Made

- Global back button listener mounted in root layout (`NativeBackButtonListener`) mirroring `NativeAuthReturnListener`.
- Listener delegates all back actions to `window.history.back()` when an overlay is armed or `canGoBack` is true, ensuring existing web Navigation API and popstate hooks execute cleanly.
- `AndroidBackExitGuard` retains ownership of the 2-second double-back timer and toast, triggering `App.exitApp()` on the second press.
- Toast upgraded to warning styling with `AlertTriangle` icon and explicit "من التطبيق" / "the app" copy.
