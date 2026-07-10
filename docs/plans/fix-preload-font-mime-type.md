# Fix: Invalid Font MIME Type in Preload Hint

**Type:** bug  
**Date:** 2026-07-10  
**Status:** implemented  
**Trello:** https://trello.com/c/w18DepnV/89

## Summary

`ReaderPage.tsx` emits a `<link rel="preload">` for the per-page Quran TTF font using `type="font/truetype"`. This is not an IANA-registered MIME type — browsers treat it as unrecognised and silently skip the preload, meaning the font fetch is never eagerly started. The correct IANA value is `font/ttf`.

## Root Cause

Line 112 of `app/components/reader/ReaderPage.tsx`:

```tsx
type="font/truetype"
```

`font/truetype` is a legacy alias that is not in the WHATWG MIME Sniffing Standard or IANA registry. The registered type for `.ttf` files is `font/ttf`. Browsers that enforce type validation (Chrome, Firefox) discard the preload hint entirely when the type is unrecognised, negating the performance benefit.

## Fix

One-character change — no branching, no edge cases:

```tsx
// before
type="font/truetype"

// after
type="font/ttf"
```

## Files to Change

- `app/components/reader/ReaderPage.tsx:112` — change `type="font/truetype"` to `type="font/ttf"`

## Constraints

- The `@font-face` `src` format hint (`format('truetype')`) in the inline `<style>` block on the same component is separate and correct — do not touch it.

## What NOT to Do

- Do not change the `format('truetype')` string inside the `@font-face` `src` — that is a CSS format hint, not a MIME type, and `truetype` is the correct value there.
- Do not add or remove any other attributes on the `<link>` element.

## Decisions Made

- Use `font/ttf` (IANA-registered) rather than `font/sfnt` (also valid but less conventional for TTF).
