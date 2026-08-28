# Sidebar Search Placeholders Alignment with Homepage Copy

**Type:** copy / i18n
**Date:** 2026-08-29
**Status:** implemented

## Summary

Align the sidebar search filter placeholder copy and clear button label with the homepage search convention ("ابحث بـ..." instead of "رشّح..."), adding illustrative parenthetical examples for surah and juz numbers.

## Proposed Changes

### 1. Arabic Locale (`messages/ar.json`)
- `sidebar.filterPlaceholderSurahs`: `"ابحث بسورة (الكهف) أو رقمها (١٨)..."` (was `"رشّح باسم السورة أو رقمها"`)
- `sidebar.filterPlaceholderRubs`: `"ابحث بجزء (جزء ٢٠)، حزب، أو ربع..."` (was `"رشّح بالجزء أو الحزب أو الربع"`)
- `sidebar.filterClear`: `"مسح البحث"` (was `"مسح التصفية"`)

### 2. English Locale (`messages/en.json`)
- `sidebar.filterPlaceholderSurahs`: `"Search by surah (e.g. Kahf, 18)..."` (was `"Filter by surah name or number"`)
- `sidebar.filterPlaceholderRubs`: `"Search by juz (e.g. juz 20), hizb, or rub..."` (was `"Filter by juz, hizb, rub"`)
- `sidebar.filterClear`: `"Clear search"` (was `"Clear filter"`)

### 3. Test Selectors (`e2e/tests/sidebar-navigation.spec.ts`)
- In `getFilterInput`: Update locator regex or selector to include `ابحث` and `Search` alongside `رشّح`/`Filter`.

## Verification Plan

### Automated Tests
- `npm test`: Verify unit tests pass.
- `npm run lint`: Verify translation extractions and linting pass.
- `npm run e2e:test -- e2e/tests/sidebar-navigation.spec.ts`: Verify all sidebar Playwright tests pass with the new placeholder text.
