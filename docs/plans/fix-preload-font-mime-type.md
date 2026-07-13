# Fix: Invalid Font MIME Type in Preload Hint

**Type:** bug  
**Date:** 2026-07-10  
**Status:** implemented  
**Trello:** https://trello.com/c/w18DepnV/89

## Summary

`ReaderPage.tsx` emits `<link rel="preload" type="font/truetype">`. `font/truetype` is not IANA-registered — browsers silently discard the preload hint. Correct value: `font/ttf`.

## Fix

`app/components/reader/ReaderPage.tsx:112`: `type="font/truetype"` → `type="font/ttf"`.

## Constraints

- Do not touch the `format('truetype')` string inside the `@font-face` `src` in the same file — that is a CSS format hint (not a MIME type), and `truetype` is correct there.
- Use `font/ttf` (IANA-registered), not `font/sfnt`.
