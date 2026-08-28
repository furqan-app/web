# Sidebar Search Placeholder & Typography Compactness

**Type:** copy / UI polish
**Date:** 2026-08-29
**Status:** implemented

## Summary

Resolve placeholder clipping in the 256px-wide sidebar drawer by adopting concise placeholder copy («اسم السورة أو رقمها...» and «الجزء أو الحزب أو الربع...»), applying `text-xs placeholder:text-xs` typography, and setting explicit `dir={isRTL ? "rtl" : "ltr"}` so placeholder text never overflows or gets clipped at the icon edge.

## Proposed Changes

### 1. `messages/ar.json`
- `sidebar.filterPlaceholderSurahs`: `"اسم السورة أو رقمها..."`
- `sidebar.filterPlaceholderRubs`: `"الجزء أو الحزب أو الربع..."`

### 2. `messages/en.json`
- `sidebar.filterPlaceholderSurahs`: `"Surah name or number..."`
- `sidebar.filterPlaceholderRubs`: `"Juz, hizb, or rub..."`

### 3. `app/components/nav/Sidebar.tsx`
- Search input `className`: `text-xs placeholder:text-xs` (was `text-sm`).
- Explicit direction: `dir={isRTL ? "rtl" : "ltr"}` (was `dir="auto"`).

### 4. `app/components/nav/AyahPicker.tsx`
- Numeric ayah & page inputs: `text-xs placeholder:text-xs` for consistency.

### 5. `e2e/tests/sidebar-navigation.spec.ts`
- Update `getFilterInput` helper locator to match `input[placeholder*="اسم السورة"], input[placeholder*="الجزء"], input[placeholder*="Surah name"], input[placeholder*="Juz"]`.

## Verification Plan

### Automated Tests
- `npm test`: Run unit tests.
- `npm run lint`: Run ESLint and message extraction.
- `npm run e2e:test -- e2e/tests/sidebar-navigation.spec.ts`: Run Playwright E2E tests.
