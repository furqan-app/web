# Enhance MarkModal Motion & Polish

**Type:** feature  
**Date:** 2026-07-03  
**Status:** implemented (incl. Addendum 3)

## Summary

Polish `MarkModal` with real CSS transitions, a visual redesign of `MarkerColorPicker` (radio card group matching reference screenshots), and fixes for a shared primitive bug (dead `tailwindcss-animate` classes — plugin not installed, all Dialog modals open with an abrupt cut). Final state: radio card group with staged save flow, segmented tab control, and `RadioGroup` (Radix) replacing hand-rolled swatch buttons.

## Approach

### 1. `components/ui/dialog.tsx` — fix dead animation classes

Replace `tailwindcss-animate` classes with real CSS transitions keyed off Radix's `data-[state]` attribute:
- `DialogOverlay`: opacity transition, `duration-200 ease-out` enter, ~150ms close.
- `DialogContent`: `scale-95 opacity-0` closed → `scale-100 opacity-100` open, `transition-[transform,opacity] duration-200 ease-out`, `transform-origin: center`.
- `@media (prefers-reduced-motion)`: drop scale transform, keep opacity only.
- `DialogClose` X button: restyled to circular hover pill (`rounded-full hover:bg-accent`).

Fixes `SignInModal` and `FQModal` for free — same shared primitive.

### 2. `app/components/MarkModal.tsx`

- `DialogContent`: `rounded-2xl`, card shadow token from `design-principles.md`.
- Header: muted-foreground caption ("Mark word"/"Mark verse") above Quran title. No accent strip, no divider (not in reference).
- Title: `text-2xl` (not `text-3xl` — user flagged as too big).
- Tabs: segmented control style — active tab `bg-primary/10 text-primary` pill — via `className` overrides at `MarkModal` call site only (shared primitive untouched). Tab labels show translated text + icon (previously icon-only, ambiguous).
- `BookmarksTab`: "Choose bookmark color" section label above cards; full-width primary "Save Bookmark" button below. Notes placeholder: centered icon + caption instead of bare paragraph.
- New i18n keys: `markModal.markWordLabel`, `markModal.markVerseLabel`, `markModal.notesComingSoon`, `markModal.chooseColorLabel`, `markModal.saveMark`.

### 3. `app/components/MarkerColorPicker.tsx` — radio card group

Replace hand-rolled swatch buttons with `RadioGroup` (Radix via `npx shadcn add radio-group`, dep `@radix-ui/react-radio-group`). Three bordered cards (`rounded-2xl border`), each: color chip top, label middle, radio dot bottom. Accepts `currentColor` prop — previously missing, so re-opening on an already-marked word showed no active state.

Selection stages `selectedColor` locally; clicking Save calls `markWord`. Hover cue: `hover:bg-primary/25`.

### 4. `docs/standards/styling.md`

Add note: `tailwindcss-animate`-style `animate-in`/`fade-in-0`/etc. are **not available** (plugin not installed) — use `data-[state=]` + `transition-*` instead.

## Files Changed

- `components/ui/dialog.tsx` — real CSS-transition enter/exit, reduced-motion guard, circular close button
- `components/ui/radio-group.tsx` — new (via shadcn)
- `app/components/MarkModal.tsx` — caption, title size, segmented tabs, staged save, i18n keys
- `app/components/MarkerColorPicker.tsx` — RadioGroup card group, `currentColor` prop, hover cue
- `docs/standards/styling.md` — dead animate-in note

## Constraints

- CSS transitions only — no JS animation library.
- Don't touch shared `Tabs`/`TabsList`/`TabsTrigger` primitives — override at call site.
- Don't change `MarkModal`'s data logic or tab content structure.
