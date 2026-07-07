# Fix ViewingChip IntlError: missing {name} interpolation variable

**Type:** bug  
**Date:** 2026-07-07  
**Status:** implemented

## Summary

`ViewingChip` renders a "viewing someone's mushaf" eye indicator. When `ownerName` is provided it calls the custom `useTranslations` hook with key `mushaf.viewingChip`, whose Arabic value is `"تتصفح مصحف {name}"`. The custom hook calls next-intl's `t(key)` with no interpolation variables, causing next-intl's ICU formatter to throw `FORMATTING_ERROR` because `{name}` has no value. The manual `.replace("{name}", ownerName)` never runs.

## Root Cause

`app/hooks/use-translations.ts` calls `t(key)` with no values object. When a translation string contains an ICU placeholder like `{name}`, next-intl requires the variable to be passed at call time or it errors. The custom hook has no mechanism to forward variables.

## Fix

In `ViewingChip.tsx`, use next-intl's `useTranslations("mushaf")` directly for the parameterized key, passing `{ name: ownerName }`. The generic fallback key (`viewingChipGeneric`) has no placeholders so it works with the existing hook — but for consistency, use next-intl directly for both strings in this component, dropping the custom hook entirely here.

## Files to Change

- `app/components/reader/ViewingChip.tsx` — replace `useTranslations` (custom hook) with `useTranslations` from `next-intl`, namespaced to `"mushaf"`, and pass `{ name: ownerName }` directly

## Verified Test Cases

| ownerName | Before (broken) | After (correct) |
|---|---|---|
| `"Ali"` | `FORMATTING_ERROR` thrown | `"تتصفح مصحف Ali"` (ar) / `"Viewing Ali's mushaf"` (en) |
| `null` / `undefined` | No error (generic key has no placeholder) | `"تتصفح مصحف مستخدم آخر"` (ar) / `"Viewing another user's mushaf"` (en) |

## Constraints

- Do not modify `use-translations.ts` — its signature is used across the codebase for non-parameterized keys and the fix scope is this one component.
- Use next-intl's `useTranslations` namespaced to `"mushaf"` so keys are relative (`"viewingChip"`, not `"mushaf.viewingChip"`).

## What NOT to Do

- Do not add a values parameter to the custom `useTranslations` hook — that's out of scope and risks side effects for other callers.
- Do not use manual string `.replace()` for ICU interpolation — pass values through next-intl so RTL and future locale changes work correctly.
