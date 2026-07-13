# Fix ViewingChip IntlError: missing {name} interpolation variable

**Type:** bug  
**Date:** 2026-07-07  
**Status:** implemented

## Root Cause

`ViewingChip` used a custom `useTranslations` hook that called `t(key)` with no values object. The Arabic value `"تتصفح مصحف {name}"` contains an ICU `{name}` placeholder — next-intl throws `FORMATTING_ERROR` when no variable is provided. The manual `.replace("{name}", ownerName)` never ran.

## Fix

In `app/components/reader/ViewingChip.tsx`: replace custom hook with next-intl's `useTranslations("mushaf")` directly, passing `{ name: ownerName }` for the parameterized key.

## Constraints

- Do not modify `use-translations.ts` — it's used for non-parameterized keys across the codebase.
- Do not use manual `.replace()` for ICU interpolation — pass values through next-intl for correct RTL/locale behavior.
