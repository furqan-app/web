# Recitation Bar: Vertical Rail (Desktop)

**Type:** feature  
**Date:** 2026-08-02  
**Status:** implemented

## Summary

At ≥1367px wide + ≥800px tall (the existing Desktop Reading Group gate), the recitation player bar moves from a floating horizontal strip below the spread to a fixed vertical rail on the screen-right edge. Mobile and tablet keep the current bottom bar unchanged. The mushaf spread stays visually centered with no asymmetric offset — the rail overlays the lateral whitespace that already exists at that breakpoint (≥253px per side at 1367px, spread capped at 860px). This reclaims the 104px of bottom padding currently reserved for the bar and delivers the full height gain described in Trello #173 (pairs with #172, the reader rhythm ticket).

The title in Trello #173 says "desktop/tablet" — that wording is incorrect. Tablet (1024–1366px) has no lateral space (spread fills edge-to-edge); the rail is desktop-only.

## Approach

The bar remains `fixed z-40`, mounted once in `app/[locale]/layout.tsx` (unchanged). At the desktop breakpoint the CSS switches it from a full-width bottom bar into a narrow vertical column on the right. A JS conditional in the component handles the content layout difference (the horizontal layout's `flex-1` info div and reciter-name text are wrong shapes for a rail).

No DOM restructuring. No changes to `ReaderPager`, `ReaderPage`, or the pager strip.

## Decision Tree

| Breakpoint | Bar form | Position | Content |
|---|---|---|---|
| `< 1024px` (mobile) | full-width bottom bar | `fixed inset-x-0 bottom-0` | play/pause + reciter name + verse key + settings + stop |
| `1024–1366px` (tablet) | full-width bottom bar (overlay sync) | `fixed inset-x-0 bottom-0`, transforms with nav overlay | same |
| `≥1367px + ≥800px` (desktop) | vertical rail | `fixed right-6 top-1/2 -translate-y-1/2` | play/pause + verse key + settings + stop (no reciter name) |

The `isOverlayMode` path in `RecitationPlayerBar.tsx` is untouched — at ≥1367px `isOverlayMode` is always false, so it is inert.

## Verified Geometry

Measured 2026-08-01 (Trello #173 card):

| Viewport | current gap/em | with 60px bar removed |
|---|---|---|
| 1440×900 | 0.40 | **0.80** |
| 1920×1080 | 0.40 | **0.87** |
| 820×1180 | 0.40 | **0.90** |

Lateral clearance at ≥1367px: spread capped at 860px → ≥253px per side → 56px rail + 24px offset = 80px from spread edge, comfortably outside nav arrows (which sit at ~24px inline margin from the spread).

## Files to Change

- `app/components/RecitationPlayerBar.tsx`
  - Add `useIsDesktopRail()` or inline breakpoint hook (≥1367px + ≥800px) to conditionally render the rail layout vs the bar layout
  - Rail layout: `flex flex-col items-center gap-2.5 px-2 py-4` inner div; play/pause button; verse key in `<p>` (extra-small, centered); settings + stop icons
  - Bar layout: current `flex items-center gap-3 px-4 py-2.5` unchanged
  - Add marker classes `fq-recitation-info`, `fq-recitation-reciter-name`, `fq-recitation-verse-key` for CSS targeting if needed
  - Remove the `fq-recitation-bar-reader` class conditional that was only used to trigger the now-retired floating-bar CSS block — replace with a `fq-recitation-bar-rail` class that gates the rail CSS

- `app/globals.css` — `@media (min-width: 1367px) and (min-height: 800px)` block:
  - **Remove** `padding-bottom: 104px !important` from `.fq-reader-outer`
  - **Replace** the `.fq-recitation-bar-reader` floating-bar block with `.fq-recitation-bar-rail` rail block:
    - `right: 24px !important; top: 50%; transform: translateY(-50%); width: 56px;`
    - `inset-x: auto !important; bottom: auto !important; border-top: 1px solid; border-inline: 1px solid; border-bottom: 1px solid;` (full perimeter border)
    - `border-radius: calc(var(--radius) + 4px); box-shadow: var(--reader-chrome-bar-shadow);`
  - Keep the dark-theme background override block, updated to `.fq-recitation-bar-rail`

- `app/components/reader/QuranSpread.tsx`
  - Remove `useSpreadMetrics` hook (function definition + its call + `spreadRef` ref + `ref={spreadRef}` on `.fq-spread`)
  - Remove `useLayoutEffect`, `useEffect` imports if no longer used after removal

- `docs/architecture/DECISIONS.md` — "Desktop Reading Group" section:
  - Change description: bar is now a fixed-right vertical rail, not a floating centered card
  - Retire the `--fq-spread-width` / `--fq-spread-center` contract: these custom properties are no longer published or consumed; do not re-add them without a new justification
  - Remove the `padding-bottom: 104px` mention

## Constraints

- Mobile (< 1024px) and tablet (1024–1366px) bars are **not touched**.
- The mushaf spread must remain visually centered — no asymmetric offset, no change to `fq-reader-spread-container` padding.
- `RecitationSettingsSheet` portals into its own SheetContent node for Radix focus-trap reasons (DECISIONS.md); `openSettings()` call on the gear button stays intact, no changes to the sheet.
- `--reader-chrome-bar-shadow` is `none` in dark theme; the rail must honour this — do not add a shadow override. Verified by sampling rendered pixels in all three themes.
- The recitation bar is also shown on `/mushaf/[grant]/pages/[id]` (the shared-access reader) — the same CSS gate covers both routes since both use the same `RecitationPlayerBar` component.

## What NOT to Do

- Do not re-add `--fq-spread-width` / `--fq-spread-center` publishing in `QuranSpread` or anywhere else for the purpose of positioning the bar. The rail is fixed-right at a viewport offset; it does not need to know the spread's dimensions.
- Do not apply the rail to tablet (1024–1366px). The spread fills edge-to-edge on tablet; there is no lateral space.
- Do not add asymmetric padding to the spread container to "make room" for the rail. The rail overlays the existing whitespace.
- Do not use `writing-mode: vertical-rl` for the reciter name in the rail — reciter name is hidden in the rail entirely; the settings sheet already shows it.
- Do not change the `isOverlayMode` / `translate-y-full` logic — it is inert at ≥1367px and correct for tablet.

## Decisions Made

- Rail position: fixed right, `right: 24px`, vertically centered (`top: 50% + translateY(-50%)`). Not locale-aware — always right side regardless of AR/EN.
- ~~Rail content: play/pause + verse key + settings + stop. Reciter name omitted (visible in settings sheet).~~ **Superseded — see Addendum below (Trello #183).**
- ~~Rail width: 56px.~~ **Superseded — see Addendum below (Trello #183): 96px.**
- `useSpreadMetrics` is removed entirely — the hook's only consumer was the retired floating-bar CSS block.
- Trello card title "desktop/tablet" is corrected to "desktop only" in this plan.

## Addendum: Reciter Dropdown in Bar + Rail (2026-08-04, Trello #183)

**Type:** feature
**Status:** implemented

### Summary

"Make reciter names as a drop list in recitation bar" (Trello #183). The reciter name in `RecitationPlayerBar` is currently plain text — clicking it does nothing; changing reciter requires opening the full settings sheet (gear icon). This turns the reciter name itself into a dropdown trigger that opens the same searchable reciter combobox already used in `RecitationSettingsSheet`, on both bar forms:

- **Full-width bar** (mobile/tablet/desktop-below-rail-threshold): the existing reciter-name `<p>` becomes a button (name + chevron, same truncation, same position). Verse-key line below is untouched.
- **Rail** (desktop ≥1367px × ≥800px): the rail currently hides the reciter name entirely (`globals.css:1000`, `.fq-recitation-bar-rail .fq-recitation-info { display: none; }`) — this is being reversed. The rail widens **56px → 96px** and gains a reciter trigger (truncated name + chevron) in its vertical icon stack, between the verse-key text and the settings icon.

Reciter switching itself needs no new logic — `RecitationContext`'s existing mid-session effect (`RecitationContext.tsx:723-759`) already reloads the current chapter's audio for a new `reciterId` and resumes at the same verse position when `updateSettings({ reciterId })` fires. This task is UI-only: exposing that same setter from a new place.

### Approach

1. **Extract `ReciterCombobox`** out of `RecitationSettingsSheet.tsx` (currently a private, non-exported component at `RecitationSettingsSheet.tsx:95-174`) into `app/components/recitation/ReciterCombobox.tsx`, generalized to accept a custom trigger instead of always rendering its own full-width settings-style button:
   - Props: `reciters`, `value`, `onChange`, `portalContainer` (unchanged), plus new `trigger: (ctx: { selected: Reciter | null; open: boolean }) => ReactNode`, `contentClassName?: string`, `side?: "top" | "left" | ...` (default unset/auto), `align?: ...`.
   - `RecitationSettingsSheet.tsx` passes a `trigger` that reproduces its current full-width button exactly (byte-for-byte visual parity) and keeps `className="w-[--radix-popover-trigger-width] p-0"` + `align="start"` on the content — no behavior change there.
   - `PopoverContent`'s `container` prop stays `portalContainer`-driven per the existing nested-Popover-in-Sheet rule (DECISIONS.md, Font/Recitation section, ~line 174) for the settings-sheet call site. The bar/rail call sites pass `portalContainer={null}` (default body portal) — `RecitationPlayerBar` is mounted directly in `app/[locale]/layout.tsx`, not nested inside any Dialog/Sheet, so no focus-trap conflict exists there.

2. **Bar/rail popover sizing**: unlike the settings sheet (whose trigger is a full-width button, so `w-[--radix-popover-trigger-width]` is a sensible content width), the bar/rail triggers are narrow. Their `ReciterCombobox` usage passes a fixed `contentClassName="w-64 p-0"` (~256px) instead, with explicit `side`:
   - Full bar: `side="top"` (bar sits at the screen bottom; popover opens upward).
   - Rail: `side="left"` (rail sits fixed at the screen's right edge; popover opens toward the spread, away from the screen edge). This is a physical, non-RTL-flipped side — matches the rail's own existing "not locale-aware, always right" decision above.

3. **`RecitationPlayerBar.tsx` changes**:
   - Replace the `<p className="fq-recitation-reciter-name ...">` text (line 106-108) with `<ReciterCombobox reciters={reciters} value={settings.reciterId} onChange={(id) => updateSettings({ reciterId: id })} portalContainer={null} contentClassName="w-64 p-0" side="top" trigger={...} />`. The trigger renders a `<button>` with the same `fq-recitation-reciter-name truncate text-sm font-medium text-foreground` classes plus a small trailing chevron, same fallback text (`t("recitation.nowPlaying", "Recitation")`) when no reciter resolves.
   - Add a second, rail-only trigger instance rendered when `isOnReaderRoute` (rail is desktop-reader-only), positioned between the verse-key `<p>` and the settings button in JSX order — CSS visibility is what actually switches bar-form vs rail-form (both render always; `globals.css` hides/shows via the media query), so both the full-bar trigger and the rail trigger exist in the DOM simultaneously and each is shown/hidden by its own wrapper class, exactly like the existing `fq-recitation-info` split.
   - `updateSettings` must be added to the `useRecitation()` destructure (not currently pulled in this component).

4. **`globals.css` rail block** (`@media (min-width: 1367px) and (min-height: 800px)`, ~line 968-1003):
   - `.fq-recitation-bar-rail` width: `56px` → `96px`.
   - `.fq-recitation-bar-rail .fq-recitation-info { display: none; }` stays as-is (that's the bar-form info block — name/verse-key pair — which the rail never shows as a unit).
   - New rule for the rail-only reciter trigger's wrapper class (e.g. `.fq-recitation-rail-reciter`): hidden by default (bar form doesn't show it), `display: flex` inside the rail media query. Truncation via `max-width` matching the new 96px rail minus padding.

### Decision Tree

| Bar form | Breakpoint | Reciter UI | Popover side | Popover width |
|---|---|---|---|---|
| Full bar | `< 1367px` or `< 800px` tall | Name+chevron replaces old plain text, same position | `top` | `w-64` fixed |
| Rail | `≥1367px` width **and** `≥800px` tall | New trigger (truncated name+chevron) in icon stack, rail widened 56→96px | `left` | `w-64` fixed |

### Verified Test Cases

- **Mid-playback reciter change**: user taps trigger, picks a different reciter while audio is playing → `updateSettings({reciterId})` fires → existing effect (`RecitationContext.tsx:723`) reloads chapter audio for new reciter, seeks to `currentVerseKeyRef`'s timing, resumes playback (`wasPlaying` was true). No new code needed for this path — verified it's already covered by production logic, not something this task must build.
- **No reciter loaded yet** (`reciters` still fetching, `settings.reciterId` null): trigger shows fallback `t("recitation.nowPlaying", "Recitation")` text with chevron; clicking opens popover with empty list + `CommandEmpty` — identical to today's settings-sheet placeholder behavior, no special-casing.
- **Rail lateral clearance at minimum breakpoint** (1367px viewport): spread capped 860px → ≥253px clearance per side (per original plan's Verified Geometry). New rail footprint: 96px width + 24px right offset = 120px from screen edge — well inside the 253px budget, no overlap with spread or nav arrows.
- **RTL (Arabic locale)**: rail stays right-anchored regardless of locale (unchanged decision); popover `side="left"` is a physical direction, not logical — correct in both locales since the rail's own position doesn't flip either.

### Files to Change

- `app/components/recitation/ReciterCombobox.tsx` — **new file**, extracted+generalized from `RecitationSettingsSheet.tsx`'s private component (trigger render-prop, configurable content width/side).
- `app/components/RecitationSettingsSheet.tsx` — remove local `ReciterCombobox`, import from new location, pass a `trigger` reproducing the current full-width button exactly.
- `app/components/RecitationPlayerBar.tsx` — pull in `updateSettings`; replace static reciter-name `<p>` with a `ReciterCombobox` trigger; add rail-only trigger instance; add rail marker class.
- `app/globals.css` — rail width `56px → 96px`; new display rule for the rail-only reciter trigger wrapper, scoped inside the existing rail media query.
- `docs/architecture/DECISIONS.md` — update the Desktop Reading Group / rail section: rail width is now 96px, reciter name is shown (superseding "omitted"), reciter dropdown reuses `ReciterCombobox` (extracted, shared with settings sheet).

### Constraints

- Reciter-switch playback logic (`RecitationContext.tsx:723-759`) is untouched — this task is UI-only.
- Settings sheet's `ReciterCombobox` usage must remain visually and behaviorally identical after extraction (same trigger button, same `w-[--radix-popover-trigger-width]` content width, same `portalContainer` nesting fix).
- Mobile/tablet full-bar layout otherwise unchanged — only the name line becomes interactive.
- Rail stays right-anchored, not locale-aware (unchanged from original plan).

### What NOT to Do

- Do not add an icon-only (no name) rail trigger — considered and explicitly rejected in favor of showing the truncated name, which is why the rail widens.
- Do not reuse `w-[--radix-popover-trigger-width]` for the bar/rail popovers — their triggers are too narrow for a search input + reciter list; use a fixed `w-64` instead.
- Do not add any new mid-playback reciter-switch logic — the existing effect already handles it.
- Do not use `writing-mode: vertical-rl` for the rail's reciter name — a horizontal truncated label in the widened 96px rail was chosen instead (this supersedes the original plan's writing-mode prohibition only in the sense that there's now a name to consider at all; the prohibition itself is moot since the name is horizontal, not rotated).
