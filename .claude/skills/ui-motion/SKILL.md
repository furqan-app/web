---
name: ui-motion
description: Animation and interaction-polish guidance for Furqan UI work — when to animate, easing/duration rules, component press/entry states, and a Before/After review checklist. Adapted from Emil Kowalski's design-eng philosophy for our Tailwind + Radix stack (no Framer Motion, no drag/gesture surfaces yet).
---

# /ui-motion

Motion and interaction-polish reference for UI tasks. Load this alongside `docs/design/design-principles.md` (static aesthetic direction) — this skill covers *how things move and respond*, not colors/spacing/layout.

Stack assumptions: Tailwind CSS, shadcn/ui, Radix primitives (`react-dialog`, `react-dropdown-menu`, `react-tabs`). No JS animation library is installed — default to CSS transitions, not Framer Motion or springs. If a task genuinely needs JS-driven physics (drag-to-dismiss, momentum), stop and confirm with the user before adding a dependency.

## 1. Should this even animate?

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard nav, word-select toggle) | No animation. Ever. |
| Tens of times/day (hover states, list nav) | Remove or drastically reduce |
| Occasional (dialogs, dropdowns, toasts) | Standard animation |
| Rare/first-time (onboarding) | Can add delight |

**Never animate keyboard-initiated actions** (e.g. arrow-key navigation between ayahs). Every animation needs a real purpose: spatial consistency, state indication, feedback, or preventing a jarring appear/disappear — never "looks cool" for something seen often.

## 2. Easing and duration

Don't rely on Tailwind's default `ease-in`/`ease-out` — they're weak. Define stronger curves as CSS vars (e.g. in `globals.css`) and reference via arbitrary values:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* entering elements */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen movement */
```

Rule of thumb: entering/exiting → `ease-out`; moving/morphing in place → `ease-in-out`; hover/color → `ease`. **Never `ease-in`** on UI — it delays the initial movement the user is watching most closely.

| Element | Duration |
| --- | --- |
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, dialogs | 150-250ms |
| Sheets/drawers | 200-500ms |

Stay under 300ms for anything that isn't a full-screen modal. Exit should generally be faster than enter.

## 3. Component states

- **Buttons/pressables**: `active:scale-[0.97]` with `transition-transform duration-150`. Every clickable surface should compress slightly on press.
- **Never enter from `scale(0)`** — start at `scale-95` + `opacity-0`, not `scale-0`. Nothing in the real world pops from nothing.
- **Popover/dropdown origin-awareness**: since we use Radix, set `transform-origin: var(--radix-dropdown-menu-content-transform-origin)` (or the matching var for the primitive in use) instead of leaving the default center origin. **Exception: `Dialog`** — modals aren't anchored to a trigger, keep `transform-origin: center`.
- **Prefer CSS transitions over `@keyframes`** for anything that can retrigger rapidly (toasts, list items appearing/removing) — transitions retarget smoothly mid-flight, keyframes restart from zero.
- **Entrance**: use `@starting-style` where supported, falling back to a `data-mounted` attribute + `useEffect` pattern already common in the shadcn ecosystem.

## 4. Performance

- Only animate `transform` and `opacity` — anything else (`padding`, `width`, `height`) forces layout/paint.
- Don't set animated custom properties on a parent element that has many children (e.g. don't put `--x` on a list container and read it in every row) — it forces a style recalc on every descendant. Set `transform` directly on the element that moves.

## 5. Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  /* keep opacity/color transitions, drop transform/position movement */
}
```

Gate hover-only affordances behind `@media (hover: hover) and (pointer: fine)` — Tailwind's `hover:` variant is **not** gated by default, so on touch devices a tap can trigger a "hover" state that never clears. This matters for our RTL/mobile-heavy audience.

## 6. Reference techniques (use only when the task calls for it)

- **`clip-path: inset(...)`** reveals: `inset(0 100% 0 0)` → `inset(0 0 0 0)` for a left-to-right reveal, fully hardware-accelerated. Useful for hold-to-confirm patterns or scroll reveals.
- **`translateY(100%)`** is relative to the element's own size — use it to hide a sheet/toast off-screen regardless of its actual height, instead of hardcoding pixels.
- **Blur-masking a crossfade**: if two states swapping via opacity still look like two objects overlapping, add `filter: blur(2px)` during the transition (keep under ~20px, expensive in Safari).

## Review checklist (use for `/review-fq-work` UI findings and self-review)

When reviewing animation/interaction code, report issues as a Before/After/Why markdown table:

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties, avoid `all` |
| `scale(0)` entry | `scale-95` + `opacity-0` | Nothing appears from nothing |
| `ease-in` on a dropdown | `ease-out` or custom curve | `ease-in` feels sluggish |
| No `:active` state on a button | `active:scale-[0.97]` | Pressable elements must feel responsive |
| `transform-origin: center` on a popover | Radix transform-origin CSS var | Popovers should scale from their trigger (modals excepted) |
| Hover animation with no media guard | `@media (hover: hover) and (pointer: fine)` | Prevents stuck hover state on touch |
| Animation on a keyboard-triggered action | Remove it | Repeated actions should feel instant |
| Duration > 300ms on a non-modal element | Reduce to 150-250ms | Faster reads as more responsive |

## When to use this vs. design-principles.md

- Layout, color, spacing, ornamental motifs, typography → `docs/design/design-principles.md`
- Anything that moves, transitions, or responds to press/hover/focus → this skill
- Both apply → load both
