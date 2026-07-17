# Shrink MarkModal & Hide Radio Dot

**Type:** bug  
**Date:** 2026-07-04  
**Status:** implemented (incl. Addendum 3)

## Summary

Polish fixes to `MarkModal`/`MarkerColorPicker`:
1. Radio-dot (`RadioGroupItem`'s visible circle) is redundant — selection is already shown via `border-primary bg-primary/5` — hide it.
2. Modal is too large overall — shrink width, padding, gaps, font sizes.
3. Caption and close button needed structural refactor to achieve correct vertical alignment in both locales (resolved via Addendum 3).

## Radio Dot — `app/components/MarkerColorPicker.tsx`

Keep `RadioGroupItem` in the DOM (it provides label→button click delegation and arrow-key navigation). Add `className="sr-only"`. Add `focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2` to the card `<label>` so keyboard users get a visible focus indicator.

## Modal Size — `app/components/MarkModal.tsx`

Do not edit `components/ui/dialog.tsx` — size change is `MarkModal`-specific; `cn()`/`twMerge` lets `MarkModal`'s `className` override the primitive.

- `DialogContent`: `max-w-md` → `max-w-sm`; add `p-4 gap-3`.
- Title: `text-2xl` → `text-xl`.
- `TabsList`: `mb-3` → `mb-2`. `TabsTrigger`: `px-4 py-2` → `px-3 py-1.5`.
- `TabsContent` tray: `p-3` → `p-2.5`.
- Save button: `mt-4 py-2.5` → `mt-3 py-2`. Remove-mark: `mt-2` → `mt-1.5`.

`MarkerColorPicker.tsx`: card `gap-1.5 p-2.5` → `gap-1 p-2`; color chip `w-7 h-7` → `w-6 h-6`. Add resting `shadow-sm` to all color cards; `isSelected` upgrades to `shadow-md`.

## Header Structure (Addendum 3)

The design mimic shows caption + close button as **flex-row siblings** (`justify-between`), not caption-in-flow + absolute-close. Absolute positioning prevents reliable vertical centering across size changes.

**Fix:** Add opt-in `hideDefaultClose?: boolean` prop to `DialogContent` (`components/ui/dialog.tsx`), default `false` — when true, skip the primitive's absolute `DialogPrimitive.Close`. Only `SignInModal` and `MarkModal` use `DialogContent`; `SignInModal` renders nothing in the top-right corner, so the prop is purely additive and zero-risk.

In `MarkModal`: pass `hideDefaultClose`, restructure header into `flex items-center justify-between` with caption `<p>` + in-flow `DialogClose` button styled identically to the primitive's original (same classes, same `sr-only` "Close" text, same hover/focus/active states). Drop `pe-12` (no longer needed with flex layout).

Caption `<p>` must **not** carry `dir="rtl"` — it must inherit the document direction so `pe-` logical properties track the same side as the close button's `end-4`. The Quran-text `<h3>` title keeps its forced `dir="rtl"` (Quran script is always RTL regardless of UI locale).

## Files Changed

- `app/components/MarkerColorPicker.tsx` — sr-only radio dot, focus-within ring, tighter card/chip, shadow on all cards
- `app/components/MarkModal.tsx` — max-w-sm, p-4 gap-3, tighter title/tabs/tray/buttons, flex header row with inline DialogClose, no dir="rtl" on caption
- `components/ui/dialog.tsx` — add opt-in `hideDefaultClose` prop to `DialogContent`

## Constraints

- Do not edit `components/ui/dialog.tsx`'s base padding/gap or default close button behavior — other consumers (`SignInModal`) must be unaffected.
- Do not remove `RadioGroupItem` from the DOM.
- `hideDefaultClose` default must be `false` — opt-in only.
- Keep `dir="rtl"` on the `<h3>` Quran title; remove it from caption `<p>`.
- Do not reintroduce physical `pr-`/`pl-` on caption — logical `pe-` is correct once direction-context mismatch is removed.
