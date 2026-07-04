# Enhance MarkModal Motion & Polish

**Type:** feature
**Date:** 2026-07-03
**Status:** implemented (incl. Addendum 3)

## Summary

Polish `MarkModal` (the bookmark/note dialog opened when tapping a word or verse) using the `ui-motion` skill and `docs/design/design-principles.md`, plus fix a real bug found during investigation: the shared `Dialog` primitive references `tailwindcss-animate` utility classes (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`) but that plugin is not installed (`tailwind.config.ts` has no `plugins` entry, `package.json` has no `tailwindcss-animate` dependency). Those classes are inert — every `Dialog`-based modal in the app (`MarkModal`, `SignInModal`, `FQModal`) currently opens/closes with an abrupt cut, no transition at all.

User explicitly asked for full creative latitude on this pass — no design-preference questions, proceed with own judgment per `ui-motion` + `design-principles.md`.

## Approach

### 1. Fix `components/ui/dialog.tsx` (shared primitive, benefits all 3 usages)

Replace the dead `tailwindcss-animate` classes with real CSS transitions keyed off Radix's `data-[state]` attribute, per `ui-motion` §3 (CSS transitions over keyframes) and §2 (custom easing, `ease-out` for entering elements):

- `DialogOverlay`: opacity transition, `duration-200 ease-out` on enter, faster (~150ms) on close via `data-[state=closed]`.
- `DialogContent`: `scale-95 opacity-0` closed → `scale-100 opacity-100` open, `transition-[transform,opacity] duration-200 ease-out`, `transform-origin: center` (per `ui-motion` §3 Dialog exception — modals aren't anchored to a trigger).
- Add `@media (prefers-reduced-motion: reduce)` to drop the scale transform, keep opacity only (per `ui-motion` §5).

This is a primitive-level bug fix, not scope creep — `SignInModal`/`FQModal` inherit the same broken classes and get the same fix for free with no separate changes needed to those files.

### 2. `app/components/MarkModal.tsx`

- `DialogContent` className: bump `rounded-lg` (inherited default) to `rounded-2xl` and add the standard card shadow token from `design-principles.md` (`shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]`) so the modal reads as an elevated surface consistent with the rest of the app, not a generic shadcn dialog.
- `TabsTrigger` icon buttons are icon-only with no accessible name — add `aria-label` (translated) for screen readers.
- No other structural changes to this file — layout/data logic untouched.

### 3. `app/components/MarkerColorPicker.tsx`

Currently each color option is a bare `<button>` with `flex gap-2` and no padding, no hover surface, no press feedback — poor hit target and no interactive affordance. Per `ui-motion` §3 (buttons compress on press) and §1 (occasional-use dialog options warrant standard animation):

- Add `rounded-lg px-3 py-2 -mx-3` hit-target padding.
- Add `hover:bg-accent hover:text-accent-foreground transition-colors` (consistent with the codebase's existing un-gated `hover:` convention on nav buttons in `design-principles.md` — not introducing a new pattern).
- Add `active:scale-[0.97] transition-transform duration-150` press feedback.

### 4. Remove-mark button (inline in `MarkModal.tsx`, `BookmarksTab`)

Already has `hover:bg-destructive/10 transition-colors` — add `active:scale-[0.97]` for consistent press feedback with the color-picker buttons above.

### 5. Standards update

Add a line to `docs/standards/styling.md`'s Animation section noting `tailwindcss-animate`-style `animate-in`/`fade-in-0`/etc. classes are **not available** (plugin not installed) — use explicit `data-[state=]` + `transition-*` instead. Prevents a future dev copy-pasting the same dead pattern from a shadcn docs example.

## Files to Change

- `components/ui/dialog.tsx` — real CSS-transition enter/exit, reduced-motion guard
- `app/components/MarkModal.tsx` — card radius/shadow, tab `aria-label`, remove-mark press feedback
- `app/components/MarkerColorPicker.tsx` — hover/press affordance, larger hit target
- `docs/standards/styling.md` — note on dead `tailwindcss-animate` classes

## Constraints

- No JS animation library — CSS transitions only, per `ui-motion`.
- Don't touch `Tabs`/`TabsList`/`TabsTrigger` primitives — shared beyond this modal, low value for the scope of this pass.
- Don't change `MarkModal`'s data logic, props, or the tab content itself (bookmarks/notes) — motion and surface polish only.

## Decisions Made

- Fixing the dead animation classes at the `Dialog` primitive level (not duplicating a fix inside `MarkModal` alone) since `SignInModal` and `FQModal` share the same bug.
- No ADR needed — this is a bug fix + standards note, not a new architectural decision with alternatives to weigh.

## Addendum — visual revamp (same task, expanded scope)

First pass (motion/transitions) landed but the modal still reads as a generic, unstyled settings menu. User asked for a real appearance overhaul, explicitly declining to be asked preference questions — proceeding on judgment per `design-principles.md` + `ui-motion`.

Concrete gap found: `MarkerColorPicker` never received `currentColor`, so a user re-opening the modal on an already-marked word had no visual indication of which color was active — a real UX bug, not just a style nit.

Changes:
- **`MarkerColorPicker`**: replace the vertical list of icon+text rows with a horizontal row of circular color swatches (matches the app's circular-button visual language). Selected color gets a `ring-2 ring-primary` + checkmark; accepts a new `currentColor` prop (previously unused/missing) to actually show current state.
- **`MarkModal`**: add a small muted-foreground caption above the Quran title ("Mark word" / "Mark verse") for hierarchy — the word/verse text itself stays undecorated (no ornaments on Quranic text; ornaments are reserved for app chrome per `design-principles.md`). Add a `border-b border-border` divider under the title block. Tabs get their translated label text rendered next to the icon (previously icon-only, ambiguous). Notes placeholder gets a centered icon+caption instead of a bare paragraph.
- New translation keys: `markModal.markWordLabel`, `markModal.markVerseLabel`, `markModal.notesComingSoon`.

## Addendum 2 — further polish

User confirmed direction and asked to keep pushing. Additional pass:

- **`Dialog` primitive** — `DialogClose` (X button) restyled from a flat opacity-toggle to a circular hover pill (`rounded-full` + `hover:bg-accent`), matching the app's circular-button hover convention instead of the generic shadcn treatment.
- **`MarkModal`** — added a thin `bg-primary/40` accent strip flush against the top edge of the card (the one sparing use of accent color per `design-principles.md`, not applied to the Quranic text itself); bumped the title to `text-3xl` for more presence; gave the tab-content tray a defined `border-border/60` edge so it reads as a tray rather than a flat muted rectangle.
- **`MarkerColorPicker`** — added native `title` tooltips on swatches (color name on hover, no JS tooltip lib needed) and a `shadow-sm` on the selected ring for more depth.

## Addendum 3 — match reference screenshots

User provided two reference screenshots (light + dark) showing a different, more finished direction and asked to match them directly. Concrete deltas from the current implementation:

- **Color picker → radio card group.** Replace the hand-rolled circular swatch buttons with a real `RadioGroup` (Radix), rendered as three bordered cards (`rounded-2xl border`), each with a color chip on top, label in the middle, and a radio dot at the bottom — matches the screenshot exactly and answers the user's "choose a different component" question directly instead of hand-rolling selection semantics. Requires adding `components/ui/radio-group.tsx` via `npx shadcn add radio-group` (new dep: `@radix-ui/react-radio-group`), consistent with the codebase's existing Radix-primitive convention (`dialog`, `tabs`, `dropdown-menu`).
- **Selection vs. save become separate steps.** The reference shows a section label ("Choose bookmark color") above the cards and a full-width primary "Save Bookmark" button below — selecting a card no longer marks immediately, it stages a local `selectedColor` state; clicking Save calls `markWord`. This is a workflow change from "click a swatch to mark instantly," but it's what the reference shows and gives the user a chance to change their mind before committing.
- **Title size** — reduce from `text-3xl` back down (`text-2xl`), per user's explicit "font size looks really big" feedback and to match the reference's proportions.
- **Drop the accent strip and header divider** — not present in the reference; the caption sits directly above the title with no rule line under it.
- **Tabs restyled as a segmented control** — active tab gets a filled `bg-primary/10 text-primary` pill instead of the plain `bg-background` shadcn default; done via `className` overrides at the `MarkModal` call site only, per the existing decision not to touch the shared `Tabs`/`TabsList`/`TabsTrigger` primitives.
- New translation keys: `markModal.chooseColorLabel`, `markModal.saveMark`.
