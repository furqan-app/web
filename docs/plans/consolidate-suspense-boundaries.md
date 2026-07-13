# Consolidate Suspense Boundaries in QuranLine / QuranSafha

**Type:** bug  
**Date:** 2026-07-09  
**Status:** implemented

## Root Cause

`QuranLine.tsx` wraps every `QuranWord` in its own `<Suspense>` (needed because `QuranWord` calls `useSearchParams()` which Next.js 14 requires to be inside a boundary for static generation). A typical page has ~144 words; `QuranSpread` renders 2 `QuranSafha` instances, so any route transition reconciles ~288 Suspense boundaries — none actually suspend, but the overhead causes multiple render cycles and a noticeable flicker.

## Fix

Remove per-word Suspense from `QuranLine`; add one `<Suspense fallback={null}>` per `QuranSafha` wrapping the `{renderItems.map(...)}` block. Reduces ~288 boundaries to 2. Satisfies Next.js 14's static generation requirement — Suspense does not need to be a direct parent; any ancestor boundary covers descendants.

## Files Changed

- `app/components/QuranLine.tsx` — remove `Suspense` import; remove `<Suspense key={word.location}>` wrapper; move `key` prop to `<QuranWord>` directly.
- `app/components/QuranSafha.tsx` — add `Suspense` import; wrap `{renderItems.map(...)}` in `<Suspense fallback={null}>`.

## Constraints

- The boundary in `QuranSafha` is load-bearing for static generation — removing it opts the page into dynamic rendering (violates DECISIONS.md Static Generation Strategy).
- Do not add a visible loading skeleton as `fallback` — it would flash on every navigation.
- Do not place the boundary at the `QuranLine` level — that only reduces ~144 boundaries instead of ~288 to 2.
