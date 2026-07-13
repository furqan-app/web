# Fix Dialog Missing Title/Description A11y Warnings

**Type:** bug  
**Date:** 2026-07-06  
**Status:** implemented

## Summary

`MarkModal`, `SignInModal`, `Sidebar`, `SearchBar` (mobile sheet), and `SettingsSidebar` all use Radix `Dialog.Content` (via shadcn `Dialog` or `Sheet`) without a `DialogTitle`/`SheetTitle` or `DialogDescription`/`SheetDescription`. Radix hard-errors for missing title, warns for missing description.

All fixes are `sr-only` — no visible UI change, except `SettingsSidebar`'s existing `SheetTitle` which stays visible as-is.

## Changes Per File

- **`app/components/MarkModal.tsx`** — promote existing `<h3>` to `DialogTitle` (same classes via `cn`/twMerge override); add `sr-only` `DialogDescription` reusing existing `markModal.markWordLabel`/`markModal.markVerseLabel`.
- **`app/components/SignInModal.tsx`** — promote existing `<h1>` to `DialogTitle` (same classes); add `sr-only` `DialogDescription` with new key `signInModal.description`.
- **`app/components/nav/Sidebar.tsx`** — add `sr-only` `SheetTitle` and `SheetDescription` with new translation keys.
- **`app/components/search/SearchBar.tsx`** — add `sr-only` `SheetTitle` and `SheetDescription` with new translation keys.
- **`app/components/SettingsSidebar.tsx`** — add `sr-only` `SheetDescription` only (existing visible `SheetTitle` untouched).
- **`messages/en.json`, `messages/ar.json`** — new keys for `signInModal.description` and sidebar/search a11y strings.

## Constraints

- All new titles/descriptions must be `sr-only` except `SettingsSidebar`'s existing title.
- Do not touch `app/components/ui/FQModal.tsx` — unused re-export with no consumers.
