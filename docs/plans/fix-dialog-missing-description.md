# Fix Dialog Missing Title/Description A11y Warnings

**Type:** bug
**Date:** 2026-07-06
**Status:** implemented

## Summary

`MarkModal` and `SignInModal` both use `DialogContent` (`components/ui/dialog.tsx`, a Radix `Dialog.Content` wrapper) without a `DialogDescription`, triggering Radix's console warning: `Missing \`Description\` or \`aria-describedby={undefined}\` for {DialogContent}`. `DialogDescription` is already exported from `components/ui/dialog.tsx` but unused anywhere in the codebase.

**Scope correction (confirmed mid-implementation via `@radix-ui/react-dialog` source):** `Dialog.Content`'s `Dialog.Title` requirement is unconditional, not opt-in like `Description` — it's the same hard-error behavior observed for the Sidebar `Sheet` below. `MarkModal`'s `<h3>` and `SignInModal`'s `<h1>` are plain headings, not `DialogTitle`, so both are also missing a real title, not just a description. Both already have a natural heading that can be promoted to `DialogTitle` with zero visual change (`cn()` uses `tailwind-merge`, so passing the existing classes to `DialogTitle` safely overrides its defaults).

Separately (found while verifying the PWA fixes, same root cause, same fix — folded into this plan): the Sheet-based nav components have the same gap, one step worse for two of them — `components/ui/sheet.tsx` wraps the same Radix `Dialog` primitive, and Radix **hard-errors** (not just warns) when `Dialog.Content` has no `Dialog.Title` at all.
- `app/components/nav/Sidebar.tsx` (surah-list nav sheet) — no `SheetTitle`, no `SheetDescription`.
- `app/components/search/SearchBar.tsx` (mobile search overlay sheet) — no `SheetTitle`, no `SheetDescription`.
- `app/components/SettingsSidebar.tsx` — already has a `SheetTitle`; only missing `SheetDescription` (warning only, no error).

## Root Cause

Radix's `Dialog.Content` (which both shadcn `Dialog` and `Sheet` wrap) requires a `Dialog.Title` (hard requirement — errors without it) and a `Dialog.Description` or explicit `aria-describedby={undefined}` opt-out (warning without it), so screen-reader users get an accessible name and description for the dialog. None of these five call sites had one when built.

## Approach

Add a visually-hidden `DialogDescription`/`SheetDescription` (and `SheetTitle` where missing) to each — satisfies Radix and screen readers with no visible UI change, using the existing `sr-only` utility class already used elsewhere in this codebase (e.g. `MarkModal`'s close button).

- `MarkModal.tsx`: promote the existing `<h3>{getTitle(...)}</h3>` to `DialogTitle` (same classes, via `cn`/`tailwind-merge` override — no visual change), and add a `sr-only` `DialogDescription` reusing the existing `markModal.markWordLabel`/`markModal.markVerseLabel` translations.
- `SignInModal.tsx`: promote the existing `<h1>` to `DialogTitle` (same classes), and add a `sr-only` `DialogDescription` — a new short string, e.g. "Sign in to mark words and verses in the Quran."
- `Sidebar.tsx`: add a `sr-only` `SheetTitle` (e.g. reuse `t("surahs", "Surahs")`-style label, something like "Quran navigation") and a `sr-only` `SheetDescription` describing the surah/rub browsing purpose.
- `SearchBar.tsx` (mobile sheet): add a `sr-only` `SheetTitle` (e.g. reuse the existing `search.placeholder` translation) and a `sr-only` `SheetDescription`.
- `SettingsSidebar.tsx`: its `SheetTitle` is already visible (not `sr-only` — it's the sheet's visible heading), so only add a `sr-only` `SheetDescription`; do not touch the existing visible title.

## Files to Change

- `app/components/MarkModal.tsx` — import `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`; change the `<h3>` to `DialogTitle` (same classes); add `<DialogDescription className="sr-only">` reusing the existing word/verse label translation.
- `app/components/SignInModal.tsx` — import `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`; change the `<h1>` to `DialogTitle` (same classes); add a `sr-only` description with a new translation key (`signInModal.description`).
- `app/components/nav/Sidebar.tsx` — import `SheetTitle`, `SheetDescription` from `@/components/ui/sheet`, add both as `sr-only` with new translation keys.
- `app/components/search/SearchBar.tsx` — import `SheetTitle`, `SheetDescription` from `@/components/ui/sheet`, add both as `sr-only` with new translation keys.
- `app/components/SettingsSidebar.tsx` — import `SheetDescription`, add as `sr-only` (title already exists and is visible — leave as-is).
- `messages/en.json`, `messages/ar.json` — add `signInModal.description`, and new sidebar/search a11y keys (Arabic and English both required).

## Constraints

- No visible layout change — new titles/descriptions must be `sr-only`, not rendered visibly, **except** `SettingsSidebar`'s existing `SheetTitle`, which stays visible exactly as today.
- Do not add a description to `app/components/ui/FQModal.tsx` — it's an unused re-export with no consumers; nothing to fix there.

## Decisions Made

- Fix `MarkModal` and `SignInModal` together — same root cause, same fix, avoids leaving an identical warning in `SignInModal` after fixing only the reported one.
- Fold in `Sidebar.tsx`, `SearchBar.tsx`, and `SettingsSidebar.tsx` (same underlying Radix `Dialog.Content` requirement via `Sheet`) — found while verifying the theme/i18n fix in a real browser; same fix pattern, no reason to split into a separate task.
