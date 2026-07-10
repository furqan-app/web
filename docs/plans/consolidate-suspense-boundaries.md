# Consolidate Suspense Boundaries in QuranLine / QuranSafha

**Type:** bug  
**Date:** 2026-07-09  
**Status:** implemented

## Summary

`QuranLine.tsx` wraps every `QuranWord` in its own `<Suspense>` boundary — needed because `QuranWord` calls `useSearchParams()`, which Next.js 14 requires to be inside `<Suspense>` for static generation. A typical page has ~144 words; `QuranSpread` renders 2 `QuranSafha` instances simultaneously (left + right pair members), so any route transition triggers React to reconcile ~288+ Suspense boundaries in a single commit phase. None actually suspend during client navigation — `useSearchParams()` resolves immediately — but the overhead causes multiple render cycles and a noticeable visual flicker. Fix: remove per-word boundaries, add one boundary per `QuranSafha` around the entire `renderItems.map(...)` block.

## Root Cause

`QuranWord` calls `useSearchParams()`. Next.js 14 requires any component doing so to sit inside a `<Suspense>` boundary, or the page opts into dynamic (non-static) rendering. The current solution places that boundary at the word level in `QuranLine`:

```tsx
{words.map((word) => (
  <Suspense key={word.location}>   // ← one boundary per word
    <QuranWord ... />
  </Suspense>
))}
```

~144 words/page × 2 QuranSafha instances = ~288 Suspense boundaries reconciled per navigation. The overhead is the source of the flicker.

## Fix

Move the single `<Suspense>` up to `QuranSafha`, wrapping the full `renderItems.map(...)` block. This satisfies the Next.js 14 static generation requirement for all nested `useSearchParams()` calls (Suspense does not need to be a direct parent — any ancestor boundary covers descendants). Reduces ~288 boundaries to 2.

## Files to Change

- `app/components/QuranLine.tsx`
  - Remove `Suspense` from the import on line 7
  - Remove the `<Suspense key={word.location}>` wrapper around `<QuranWord>` (lines 67–79)
  - Move the `key` prop from the removed `<Suspense>` to `<QuranWord>` itself (`key={word.location}`)

- `app/components/QuranSafha.tsx`
  - Add `import { Suspense } from "react"` (or extend the existing React import)
  - Wrap the `{renderItems.map(...)}` block (lines 311–332) in `<Suspense fallback={null}>`

## Constraints

- The `<Suspense>` boundary in `QuranSafha` is load-bearing for Next.js 14 static generation — do not remove it. Without it, `useSearchParams()` in `QuranWord` opts the page route into dynamic rendering, defeating the static generation architecture (DECISIONS.md: Static Generation Strategy).
- SSR behavior is unchanged: `useSearchParams()` always hydrates client-side regardless of where the Suspense boundary sits. The fallback (`null`) means Quran text is absent in SSR HTML in both the old and new approaches.
- Do not add a visible loading skeleton as the `fallback` — it would flash on every client navigation.

## What NOT to Do

- Do not keep per-word Suspense boundaries — that is the root cause.
- Do not remove Suspense entirely from the `QuranWord` render path — static generation will break.
- Do not place the boundary inside `QuranLine` at the line level rather than in `QuranSafha` — that only reduces by a factor of ~15 (lines vs words) instead of ~144. One boundary per Safha is the right level.

## Decisions Made

- No ADR needed — this is a correctness fix to the existing Suspense placement, not a new architectural decision.
