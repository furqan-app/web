# Shrink MarkModal & Hide Radio Dot

**Type:** bug
**Date:** 2026-07-04
**Status:** implemented (incl. Addendum 3)

## Summary

Two polish fixes to `MarkModal`/`MarkerColorPicker` (landed via `docs/plans/enhance-mark-modal-motion.md`, Addendum 3):

1. The radio-dot indicator (`RadioGroupItem`'s visible circle) on each color card is redundant — selection is already communicated via the card's `border-primary bg-primary/5` highlight — and should not be visible.
2. The modal reads as too large overall: both its outer footprint (width, outer padding) and its internal spacing (gaps, padding, font sizes) should shrink.

## Approach

### 1. Hide the radio dot (`app/components/MarkerColorPicker.tsx`)

Keep `RadioGroupItem` in the DOM — it's what makes each card's `<label>` clickable (label→button click forwarding) and what gives the group arrow-key navigation. Removing it would require hand-rolling that behavior for no benefit.

- Add `className="sr-only"` to `RadioGroupItem` so it's removed from view but stays focusable/functional.
- Add a focus-visible ring to the card `<label>` itself (`focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2`) so keyboard users still get a visible focus indicator now that the item they're focusing is invisible.

### 2. Shrink the modal, scoped to `MarkModal` only

Do not touch `components/ui/dialog.tsx`'s base padding/gap (`p-6 gap-4`) — those are shared with `SignInModal`/`FQModal`, and this task is about `MarkModal` specifically. `cn()` uses `twMerge`, so `MarkModal`'s own `className` can override the primitive's padding/gap without editing the primitive.

**`app/components/MarkModal.tsx`:**
- `DialogContent`: `max-w-md` → `max-w-sm`; add `p-4 gap-3` to override the primitive's `p-6 gap-4`.
- Header block: title `text-2xl` → `text-xl`; outer wrapper `mb-1` → `mb-0.5`; caption `mb-2` → `mb-1.5`.
- `TabsList`: `mb-3` → `mb-2`.
- `TabsTrigger`: `px-4 py-2` → `px-3 py-1.5`.
- `TabsContent` tray: `p-3` → `p-2.5`.
- Save button: `mt-4 py-2.5` → `mt-3 py-2`.
- Remove-mark button: `mt-2` → `mt-1.5`.

**`app/components/MarkerColorPicker.tsx`:**
- Card `<label>`: `gap-1.5 p-2.5` → `gap-1 p-2`.
- Color chip: `w-7 h-7` → `w-6 h-6`.

## Files to Change

- `app/components/MarkerColorPicker.tsx` — hide radio dot (`sr-only` + focus-visible ring on card), tighten card/chip spacing.
- `app/components/MarkModal.tsx` — narrower max-width, tighter outer padding/gap (via className override, not touching the shared primitive), smaller title, tighter internal spacing.

## Constraints

- Do not edit `components/ui/dialog.tsx` — this is a `MarkModal`-specific size change, not a shared-primitive change. Other `Dialog` usages (`SignInModal`, `FQModal`) must be unaffected.
- Do not remove `RadioGroupItem` from the DOM — it's load-bearing for click delegation and keyboard nav via `RadioGroup`.
- No data/logic changes — this is spacing/visual only.

## Decisions Made

- Radio dot hidden via `sr-only` (not deleted) to preserve Radix's built-in label-click and keyboard semantics; a `focus-within` ring is added to the card to compensate for the now-invisible focus indicator.
- Modal size reduction is scoped to `MarkModal`'s own className overrides, not the shared `Dialog` primitive, since the size complaint is specific to this modal.

## Addendum — header spacing & color card shadow fixes

User screenshot review after this plan landed surfaced three issues, two of them regressions from the shrink pass above:

**Root cause:**
1. **Caption/close-button crowding** — the caption `<p>` reserves space with `pr-10` (physical right padding), but the close button in `components/ui/dialog.tsx:47` is positioned with `end-4` (logical, direction-aware). Per `docs/standards/styling.md`'s RTL rule (use `start`/`end` variants, not `left`/`right`), a physical property can't track a logical one — in the Arabic/default locale (`dir="rtl"`), `end-4` places the button on the *left* while `pr-10` still reserves space on the right, so they'd land on opposite sides. In the English/LTR screenshot both happen to land on the same side, but `pr-10` (40px) is still short of the close button's actual footprint (`end-4` 16px offset + ~28px button ≈ 44px).
2. **Header→tabs spacing** — this plan's own step 2 compressed the header wrapper's `mb-1` down to `mb-0.5` (2px), which reads as no gap at all once rendered.
3. **No shadow on color cards** — the Addendum 3 radio-card redesign (in `enhance-mark-modal-motion.md`) never gave the cards any shadow, just `border`/`bg-primary/5`.

**Fix:**
- `app/components/MarkModal.tsx`: caption `pr-10` → `pe-12` (logical, sized to clear the ~44px close-button footprint on whichever side `end-4` resolves to); header wrapper `mb-0.5` → `mb-3`.
- `app/components/MarkerColorPicker.tsx`: add resting `shadow-sm` to all three color cards; `isSelected` upgrades it to `shadow-md` instead, per explicit user choice (all cards get a shadow, not just the selected one).

**Constraints:**
- Don't revert the rest of this plan's size reduction (`max-w-sm`, `p-4 gap-3`, tab/tray padding) — only the two spacing values above change.
- Don't touch `components/ui/dialog.tsx`'s close-button positioning — it's already correctly logical; the caption is what needs to match it.

**Decisions:**
- Caption padding switched from physical (`pr-`) to logical (`pe-`) as a correctness fix for a real RTL bug, not just the LTR spacing complaint from the screenshot.

## Addendum 2 — overlap still present in `en` locale (pe-12 fix was incomplete)

The Addendum 1 fix (`pr-10` → `pe-12`) didn't fully resolve the overlap — it's still visible in the `en` (LTR) locale, which is the locale the original screenshot was taken in.

**Root cause:** the caption `<p>` also carries a hardcoded `dir="rtl"` (independent of the page's real direction — `<html dir="...">` toggles `ltr`/`rtl` per locale in `app/[locale]/layout.tsx:36`). CSS logical properties (`pe-12` compiles to `padding-inline-end`) resolve relative to the *element's own* `direction`, not the document's. So on this `dir="rtl"` `<p>`, `pe-12` always reserves space on the physical **left** — regardless of which side the close button (`end-4`, which correctly resolves off the real document `dir`) actually lands on:
- `ar` locale (document `dir="rtl"`): close button resolves to the left, caption's `pe-12` also reserves left → **coincidentally correct**.
- `en` locale (document `dir="ltr"`): close button resolves to the right, but caption's `pe-12` still reserves space on the left → **zero clearance on the right, overlap persists**. This is the case the user's screenshot showed and reported as still broken.

**Fix:** remove the hardcoded `dir="rtl"` from the caption `<p>` in `app/components/MarkModal.tsx` entirely. Once it inherits the document's real direction, `pe-12` will track the same side as the close button's `end-4` in both locales. The Quran-text `<h3>` title keeps its own forced `dir="rtl"` — that one is correct and deliberate (Quran script is always RTL regardless of UI language, per `DECISIONS.md`'s font/rendering contract) and is not part of this bug.

**Side effect (confirmed with user):** in the `en` locale, the caption ("Mark word"/"Mark verse") will now left-align (natural document flow) instead of right-aligning to match the Quran title beneath it. Accepted — caption and title alignment diverging slightly in `en` is normal for mixed-script UI, and matching them was never the actual goal (clearing the close button is).

**Files to change:**
- `app/components/MarkModal.tsx` — remove `dir="rtl"` from the caption `<p>` (keep `pe-12`, keep `dir="rtl"` on the `<h3>` title).

**Constraints:**
- Do not remove `dir="rtl"` from the `<h3>` Quran-text title — that one must stay forced regardless of locale.
- Do not reintroduce a physical `pr-`/`pl-` class as a workaround — logical `pe-` is correct once the direction-context mismatch is removed.

## Addendum 3 — caption/close-button vertical misalignment (design-mimic parity)

User supplied a design mimic (`Mark Verse Dialog.dc.html`, quranic-design-system) showing the caption label and close button as **siblings in one flex row** (`display:flex; align-items:center; justify-content:space-between`), not caption-above/button-absolutely-overlaid as currently built. In the current implementation the two are still misaligned vertically: the close button is `absolute end-4 top-4` (`components/ui/dialog.tsx:47`), sized ~28px (icon + `p-1.5`), while the caption `<p>` is a plain block element in normal flow — nothing ties the two together vertically, so their centers don't line up (previous addenda only fixed *horizontal* clearance via `pe-12`).

**Root cause:** absolute positioning removes the close button from flex/flow layout entirely, so it can never be vertically centered against a flow sibling without hardcoding matching offsets on both sides (fragile, breaks again if either element's size changes). The mimic avoids this by keeping the close button in-flow, as a flex child alongside the caption.

**Fix — mirror the mimic's structure, scoped to `MarkModal`:**
- Add an opt-in `hideDefaultClose?: boolean` prop to `DialogContent` (`components/ui/dialog.tsx`), default `false` — when true, skip rendering the primitive's own absolutely-positioned `DialogPrimitive.Close`. Default behavior (and every other call site) is unchanged.
  - Confirmed via codebase search: only `SignInModal` and `MarkModal` render `DialogContent`; `FQModal` is an unused re-export. Neither `SignInModal` nor any other consumer renders anything in the top-right corner, so this prop is purely additive.
- In `app/components/MarkModal.tsx`, pass `hideDefaultClose` to `DialogContent`, restructure the header block into a flex row (`flex items-center justify-between`) containing the caption `<p>` and a `DialogClose` button (imported from `@/components/ui/dialog`) styled to match the primitive's original close button classes (`rounded-full p-1.5 text-muted-foreground opacity-70 ...`) so it looks identical, just in-flow instead of absolute.
- Remove the now-unneeded `pe-12` from the caption (it was only compensating for the absolutely-positioned button eating horizontal space; a flex row with `justify-between` handles that natively).
- Radio-dot removal (from the original plan) is unaffected — no change to `MarkerColorPicker`.

**Files to change:**
- `components/ui/dialog.tsx` — add opt-in `hideDefaultClose` prop to `DialogContent`, gating the built-in `DialogPrimitive.Close` render.
- `app/components/MarkModal.tsx` — pass `hideDefaultClose`, restructure header into a flex row with caption + inline `DialogClose`, drop `pe-12`.

**Constraints:**
- Default `DialogContent` behavior (no prop passed) must stay pixel-identical to today — `SignInModal` must not visually change.
- The inline `DialogClose` in `MarkModal` must keep the same accessible name/`sr-only` "Close" text and the same hover/focus/active styling as the primitive's version — this is a structural relocation, not a redesign of the close affordance.
- Keep the `<h3>` Quran-text title's forced `dir="rtl"` and the caption's un-forced (inherits document direction) — both established in Addendum 2, unaffected by this change.

**Decisions Made:**
- Chose to add an opt-in primitive prop (over leaving the absolute button and nudging caption padding) because the design mimic's actual DOM structure — close button in-flow, centered against its flex sibling — is inherently more robust to future size/line-height changes than hand-tuned offsets, and the prop is zero-risk to existing call sites.
