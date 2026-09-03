---
title: "UI: Enforce App-Wide user-select: none with Input Exceptions"
type: feature
date: 2026-08-30
status: implemented
area: theming
issue: 482
---

# UI: Enforce App-Wide user-select: none with Input Exceptions

## Summary

Currently, text selection is enabled by default across all app UI chrome and surfaces, causing browsers to show text insertion carets (I-beam cursors) or text highlighting when users click or drag across navbar ornaments, buttons, play controls, mushaf headers, cards, and modal dialogs. This plan enforces `user-select: none` (`-webkit-user-select: none; user-select: none;`) globally across the entire application interface, while keeping text selection strictly in interactive inputs only (search inputs, comment/notes in MarkModal, ayah/page pickers, textareas, etc.).

## Root Cause / Approach

In `app/globals.css`, `body` only sets `@apply bg-background text-foreground;`. Without an explicit `user-select: none` base rule, browsers allow text selection and display text insertion carets / I-beam pointers over non-editable DOM text and decorative spans (e.g. drawn manuscript ornaments, surah glyphs, play controls).

The fix defines `user-select: none` (with `-webkit-user-select: none`) globally on `html` and `body` in `@layer base`, and strictly scopes `user-select: text` (with `-webkit-user-select: text`) to interactive inputs only:
- `input`
- `textarea`
- `[contenteditable="true"]`

## Decision Tree / Algorithm

| Element Type | `user-select` Policy | Expected Behavior |
|---|---|---|
| Entire application (`html`, `body`, nav, buttons, cards, ornaments, headers, dialogs, mushaf pages, text) | `none` | Clicks and drag gestures do not place carets or highlight text. Pointer cursor reflects control style. |
| Interactive inputs only (`input`, `textarea`, `[contenteditable="true"]`, Search inputs, MarkModal comment box) | `text` | Native text selection, cursor positioning, and typing remain fully enabled. |

## Verified Test Cases

1. **Desktop Navbar Ornaments:** Clicking or dragging across the centered Surah capsule and flanking manuscript ornaments (`.fq-nav-ornament`) does not display a vertical text insertion caret or blue selection highlight.
2. **Recitation Play Button & Controls:** Clicking the play/pause button (`.fq-recitation-play`) or recitation rail does not trigger any vertical caret or selection outline.
3. **Quran Page & Mushaf Header:** Clicking page meta (Juz, Hizb, Surah names) or mushaf cards does not produce text selection carets.
4. **Search Bar Input:** Typing and text selection within `SearchBar` input works as native editable text.
5. **MarkModal Comment Input:** Adding or editing comments in `MarkModal`'s textarea allows normal typing, text selection, and native caret positioning.

## Files to Change

- `app/globals.css` — Add `-webkit-user-select: none; user-select: none;` to `html, body` and `-webkit-user-select: text; user-select: text;` to `input, textarea, [contenteditable="true"]` in `@layer base`.

## Constraints

- Text selection must remain strictly available for interactive input surfaces (`input`, `textarea`, `[contenteditable="true"]`).
- Webkit prefix `-webkit-user-select` must be included alongside `user-select` for Safari/WebKit cross-browser compatibility.
- Do not remove or alter keyboard focus indicators (`.fq-focus-ring`).

## What NOT to Do

- Do not apply `user-select: text` to general content outside of input/editable fields.
- Do not disable text selection by intercepting `onMouseDown` / JavaScript preventDefault events when CSS `user-select` solves it declaratively.

## Decisions Made

- App-wide selection prevention is applied at the CSS `@layer base` level on `html, body`, establishing a single global contract while keeping text selection strictly in interactive inputs only.
