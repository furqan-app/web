---
title: "Recitation Bar: Vertical Rail (Desktop)"
type: feature
date: 2026-08-02
status: implemented
area: recitation
---

# Recitation Bar: Vertical Rail (Desktop)

## Summary

At ≥1367px wide + ≥800px tall (the existing Desktop Reading Group gate), the recitation player bar moves from a floating horizontal strip below the spread to a fixed vertical rail on the screen-right edge. Mobile and tablet keep the current bottom bar unchanged. The mushaf spread stays visually centered with no asymmetric offset — the rail overlays the lateral whitespace that already exists at that breakpoint (≥253px per side at 1367px, spread capped at 860px). This reclaims the 104px of bottom padding currently reserved for the bar and delivers the full height gain described in Trello #173 (pairs with #172, the reader rhythm ticket).

The title in Trello #173 says "desktop/tablet" — that wording is incorrect. Tablet (1024–1366px) has no lateral space (spread fills edge-to-edge); the rail is desktop-only.

## Approach

The bar remains `fixed z-40`, mounted once in `app/[locale]/layout.tsx` (unchanged). At the desktop breakpoint the CSS switches it from a full-width bottom bar into a narrow vertical column on the right. A JS conditional in the component handles the content layout difference (the horizontal layout's `flex-1` info div and reciter-name text are wrong shapes for a rail).

No DOM restructuring. No changes to `ReaderPager`, `ReaderPage`, or the pager strip.

## Decision Tree

| Breakpoint | Bar form | Position | Content |
|---|---|---|---|
| `< 1024px` (mobile) | full-width bottom bar | `fixed inset-x-0 bottom-0`, outer wrapper carries `env(safe-area-inset-bottom/left/right)` padding | play/pause + reciter **dropdown** + verse key + settings + stop |
| `1024–1366px` (tablet) | full-width bottom bar (overlay sync) | `fixed inset-x-0 bottom-0`, transforms with nav overlay | same |
| `≥1367px + ≥800px` (desktop) | vertical rail, **96px wide** | `fixed right-6 top-1/2 -translate-y-1/2`, `padding: 0 !important` | play/pause + verse key + reciter **dropdown** (truncated name + chevron) + settings + stop |

The `isOverlayMode` path in `RecitationPlayerBar.tsx` is untouched — at ≥1367px `isOverlayMode` is always false, so it is inert.

**Reciter dropdown** (both bar forms): the reciter name is a button that opens the shared `ReciterCombobox` (extracted from `RecitationSettingsSheet`). Switching reciter needs no new logic — `RecitationContext`'s existing mid-session effect already reloads the current chapter's audio for a new `reciterId` and resumes at the same position when `updateSettings({ reciterId })` fires.

| Bar form | Reciter trigger | Popover side | Popover width |
|---|---|---|---|
| Full bar | name + chevron replaces the plain-text `<p>`, same position | `top` | `w-64` fixed |
| Rail | new trigger (truncated name + chevron) in the icon stack, between verse-key and settings | `left` (physical, not RTL-flipped — matches the rail's own "always right" position) | `w-64` fixed |

## Verified Geometry

Measured 2026-08-01 (Trello #173 card):

| Viewport | current gap/em | with 60px bar removed |
|---|---|---|
| 1440×900 | 0.40 | **0.80** |
| 1920×1080 | 0.40 | **0.87** |
| 820×1180 | 0.40 | **0.90** |

Lateral clearance at ≥1367px: spread capped at 860px → ≥253px per side → 96px rail (final width, #183) + 24px offset = 120px from the screen edge, well inside the 253px budget and outside the nav arrows (~24px inline margin from the spread).

## Files to Change

- `app/components/RecitationPlayerBar.tsx`
  - `useIsDesktopRail()` or inline breakpoint hook (≥1367px + ≥800px) to render the rail layout vs the bar layout.
  - Rail layout: `flex flex-col items-center gap-2.5 px-2 py-4` inner div; play/pause; verse key in `<p>` (extra-small, centered); rail-only reciter trigger; settings + stop.
  - Bar layout: `flex items-center gap-3 px-4 py-2.5`; the reciter-name `<p>` becomes a `ReciterCombobox` trigger.
  - Outer fixed wrapper inline style adds `paddingBottom/Left/Right: "env(safe-area-inset-*, 0px)"` (additive — devices without insets keep `py-2.5 px-4`), combined with the existing `isOverlayMode` transition style.
  - Pull `updateSettings` into the `useRecitation()` destructure.
  - Marker classes `fq-recitation-info`, `fq-recitation-reciter-name`, `fq-recitation-verse-key`, plus `fq-recitation-bar-rail` (replaces the old `fq-recitation-bar-reader`) and a rail-only reciter-trigger wrapper class (e.g. `fq-recitation-rail-reciter`). Both the full-bar and rail reciter triggers exist in the DOM; CSS shows/hides each by its wrapper class.

- `app/components/recitation/ReciterCombobox.tsx` — **new**. Extracted + generalised from `RecitationSettingsSheet`'s private component: props `reciters` / `value` / `onChange` / `portalContainer`, plus `trigger: (ctx: { selected; open }) => ReactNode`, `contentClassName?`, `side?`, `align?`. Settings-sheet call site passes a `trigger` reproducing its current full-width button byte-for-byte and keeps `w-[--radix-popover-trigger-width]` + `align="start"`; bar/rail call sites pass `portalContainer={null}` (body portal — the bar is not nested in a Dialog/Sheet) and `contentClassName="w-64 p-0"`.
- `app/components/RecitationSettingsSheet.tsx` — remove the local `ReciterCombobox`, import from the new file.

- `app/globals.css` — `@media (min-width: 1367px) and (min-height: 800px)` block:
  - **Remove** `padding-bottom: 104px !important` from `.fq-reader-outer`.
  - **Replace** the `.fq-recitation-bar-reader` floating-bar block with `.fq-recitation-bar-rail`: `right: 24px !important; top: 50%; transform: translateY(-50%); width: 96px; padding: 0 !important;` (isolates the rail from the inline safe-area padding), `inset-x: auto !important; bottom: auto !important;` full-perimeter `1px` border, `border-radius: calc(var(--radius) + 4px); box-shadow: var(--reader-chrome-bar-shadow);`. Keep the dark-theme background override, updated to `.fq-recitation-bar-rail`.
  - `.fq-recitation-bar-rail .fq-recitation-info { display: none; }` stays (that's the bar-form name/verse-key pair). New rule: the rail-only reciter trigger wrapper is hidden by default, `display: flex` inside this media query, truncation via `max-width` matching 96px minus padding.

- `app/components/reader/QuranSpread.tsx` — remove `useSpreadMetrics` (definition + call + `spreadRef` + `ref={spreadRef}`); drop `useLayoutEffect`/`useEffect` imports if now unused.

- `docs/architecture/DECISIONS.md` — "Desktop Reading Group" section: the bar is a fixed-right vertical rail (96px, reciter name shown, dropdown reuses the extracted `ReciterCombobox`), not a floating centered card; retire the `--fq-spread-width` / `--fq-spread-center` contract (no longer published or consumed — do not re-add without new justification); remove the `padding-bottom: 104px` mention.

## Constraints

- Mobile (< 1024px) and tablet (1024–1366px) full-bar layout is otherwise unchanged — only the reciter name becomes an interactive dropdown, and the outer wrapper gains additive `env(safe-area-inset-*)` padding.
- The mushaf spread must remain visually centered — no asymmetric offset, no change to `fq-reader-spread-container` padding.
- Safe-area insets must be **additive** on the outer fixed bar (devices without insets keep `px-4 py-2.5`), and on the **outer** wrapper — putting them on the inner flex container leaves a visual gap beneath the bar background. Keep `bottom: 0` / `fixed` so the chrome surface touches the physical viewport bottom and the background fills behind the gesture bar.
- The rail explicitly overrides that padding with `padding: 0 !important`.
- Reciter-switch playback logic (`RecitationContext`'s mid-session effect) is untouched — this task is UI-only.
- The settings sheet's `ReciterCombobox` usage must stay visually and behaviourally identical after extraction (same trigger button, `w-[--radix-popover-trigger-width]` content width, `portalContainer` nesting fix per DECISIONS.md's nested-Popover-in-Sheet rule).
- `--reader-chrome-bar-shadow` is `none` in dark theme; the rail must honour this — no shadow override. Verified by sampling rendered pixels in all three themes.
- The recitation bar is also shown on `/mushaf/[grant]/pages/[id]` — the same CSS gate covers both routes (same component).
- Rail stays right-anchored, not locale-aware.

## What NOT to Do

- Do not re-add `--fq-spread-width` / `--fq-spread-center` publishing in `QuranSpread` or anywhere else to position the bar. The rail is fixed-right at a viewport offset; it doesn't need the spread's dimensions.
- Do not apply the rail to tablet (1024–1366px) — the spread fills edge-to-edge, there is no lateral space.
- Do not add asymmetric padding to the spread container to "make room" for the rail — it overlays existing whitespace.
- Do not use `writing-mode: vertical-rl` for the rail's reciter name — a horizontal truncated label in the widened 96px rail is used instead.
- Do not change the `isOverlayMode` / `translate-y-full` logic or its transition timing/transforms — inert at ≥1367px, correct for tablet, and `translate-y-full` must translate 100% of the bar's *total* height including the safe-area padding.
- Do not add an icon-only (no name) rail reciter trigger — showing the truncated name is why the rail widens.
- Do not reuse `w-[--radix-popover-trigger-width]` for the bar/rail popovers — the triggers are too narrow for a search input + list; use a fixed `w-64`.
- Do not add new mid-playback reciter-switch logic — the existing effect handles it.
- Do not use a hardcoded pixel bottom padding (e.g. `pb-8`) instead of `env(safe-area-inset-bottom)` — dead space on devices without a home indicator.

## Decisions Made

- Rail position: fixed right, `right: 24px`, vertically centered. Not locale-aware — always right regardless of AR/EN.
- Rail is **96px wide** and **shows the reciter name** (as a dropdown trigger). Both supersede the first cut's "56px" and "reciter name omitted" (#183).
- Reciter dropdown reuses `ReciterCombobox`, extracted from `RecitationSettingsSheet` and shared; bar popover opens `top`, rail opens `left` (physical); fixed `w-64` content.
- `useSpreadMetrics` is removed entirely — its only consumer was the retired floating-bar CSS block.
- Trello card title "desktop/tablet" is corrected to "desktop only".
- Mobile bar gets additive `env(safe-area-inset-*)` padding on its outer wrapper (#500); the rail is isolated with `padding: 0 !important`.

## Revision History

- 2026-08-04 — folded Addendum "Reciter Dropdown in Bar + Rail" (Trello #183). **Supersedes two first-cut decisions:** rail width `56px` → `96px`, and "reciter name omitted from the rail" → the rail shows a truncated reciter-name dropdown trigger. `ReciterCombobox` is extracted from `RecitationSettingsSheet` into `app/components/recitation/ReciterCombobox.tsx` (trigger render-prop, configurable width/side) and shared by the settings sheet, the full bar (`side="top"`), and the rail (`side="left"`). Reciter-switch playback logic is unchanged.
- 2026-09-02 — folded Addendum "Mobile Recitation Bar Safe-Area Insets" (Issue #500): the mobile bar sat flush at `bottom: 0` with no `env(safe-area-inset-*)` padding, so the iOS home-indicator overlapped the controls. Additive safe-area padding on the outer fixed wrapper; `padding: 0 !important` on `.fq-recitation-bar-rail` to keep the desktop rail isolated.
