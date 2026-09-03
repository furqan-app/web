---
title: Nocturnal Reader Lab — Desktop RTL
type: feature
date: 2026-08-21
status: implemented
area: reader
---

# Nocturnal Reader Lab — Desktop RTL

## Summary

Create an isolated Arabic desktop reader experiment at `/ar/reader-lab/[id]`. It is a high-imagination, dark-only "nocturnal illuminated manuscript" composition: a full-width top navbar, a visually quiet full-height **physical right** recitation rail, and the existing print-accurate Mushaf as the unambiguous centre of the screen. It is not linked from any production navigation and must not alter production reader appearance, saved reading position, settings, language, permissions, cache, or downloads.

This is a visual prototype built from Furqan's real Mushaf data, page font, and reader navigation. It deliberately does **not** reuse the production design system's visual tokens, borders, shadows, or chrome layout. If approved later, migration into the production reader is a separate feature and plan.

## Confirmed Product Decisions

| Area | Decision |
|---|---|
| Entry | Direct URL only: `/ar/reader-lab/[id]`; no home/nav/search/sidebar/sitemap link or redirect into it. |
| Locale/direction | Arabic/RTL only. Any non-`ar` locale is `notFound()`. Arabic is content/UI direction; the recitation rail remains **physically right** by explicit visual decision. |
| Viewport | Desktop only: the designed reader renders at `min-width: 1367px` and `min-height: 800px`. Smaller viewports receive only an Arabic desktop-required notice; no mobile/tablet rendition is designed. |
| Mushaf | Use the existing data pipeline, exact Qur'an page component, installed fonts, page-pair logic, external page arrows, and real pager navigation. Force facing-page/double view inside this route without changing the user's global Safha-view preference. |
| Header | One full-width 72px top navbar. It replaces, rather than restyles, the globally mounted production `Nav` on this route. |
| Recitation | A 72px-wide rail starts directly below the lab navbar and reaches the viewport bottom on the physical right. New rail actions are static design controls; they do not initiate playback, change a reciter, write preferences, or open a sheet. The rail may accurately *display* current `RecitationContext` state. |
| Settings | Navbar gear opens a new lab-specific left sheet. It contains every existing settings category as presentation-only UI. It must not render the interactive production settings controls. |
| Appearance | The lab is dark-only. The settings appearance section shows one "داكن" option, selected and disabled/unavailable to change. |
| Existing global UI | The global `Nav` and `RecitationPlayerBar` do not render on `/reader-lab/`. The global recitation player must still hard-stop only after leaving **both** a production reader route and the lab route. |
| Persistence | The lab never updates `LastReadPageContext`, language, theme, Mushaf selection, Safha preference, notification permission, service-worker/offline audio storage, or recitation preferences. |

## Visual Brief

The atmosphere is a quiet reading desk after nightfall, not a dashboard. The Mushaf is a real object with the strongest contrast and highest visual weight. Chrome is cool charcoal with sparse emerald state and restrained antique gold; it should feel useful at a glance, then disappear from attention.

### Physical placement

| Element | Exact placement and hierarchy |
|---|---|
| Lab canvas | Fixed desktop reading stage below the 72px navbar (`top: 72px; right: 0; bottom: 0; left: 0`). Its desk is almost black and has no competing card/sidebar. |
| Navbar: physical right | Furqan mark + `فرقان` wordmark, then a small muted lab label `مختبر القراءة`. This is identity/orientation only. |
| Navbar: centre | Current Surah name, Juz and Hizb in a compact two-line cluster; gold ornamental marks sit either side as non-interactive decoration. It reads the page metadata from existing reader context/cache. |
| Navbar: physical left | Static search, bookmark, and notification icon buttons followed by the only active navbar control: the gear. Gear opens the new lab settings sheet. Every static icon still has an Arabic tooltip and accessible label. |
| Reader stage | The existing spread is centred in the full viewport. No `padding-right`, translated centre, or reserved column may compensate for the rail. The Mushaf card owns the full visual focus. |
| Page navigation | Existing previous/next arrows remain as sibling controls in external gutters; they never enter, cover, dim, or clip Qur'an text. |
| Rail: top zone | A small reciter/avatar-equivalent medallion, a compact live status dot/ring, and a tooltip with reciter and state. No persistent vertical reciter text. |
| Rail: centre zone | Previous verse (static), one 44px emerald play control (static), next verse (static). A 2px vertical status/progress stroke sits beside this cluster: muted when idle, emerald while playing, amber for error. |
| Rail: bottom zone | Repeat, favourite, volume, queue, and audio-tuning icons (all static). They are separated from transport by flexible empty space, not by a large panel or divider stack. |
| Settings sheet | Opens from the physical left, overlays the reader deliberately, and uses the lab's dark materials. It is a calm 408px panel with a small title/description and grouped presentation-only rows. |

## Lab Token Contract

These values are intentionally a **route-scoped experimental system**, not a new global app theme. Declare them only on `.fq-reader-lab` and repeat the same declarations on the portalled `.fq-reader-lab-settings` element. Never add them to `:root`, `.dark`, `.theme-dark`, or existing shadcn theme blocks.

| Token | HSL value | Approx. hex | Use |
|---|---:|---:|---|
| `--rl-void` | `211 39% 5%` | `#080e13` | stage/outer void |
| `--rl-stage` | `211 31% 8%` | `#0e151c` | navbar and sheet base |
| `--rl-surface` | `210 28% 12%` | `#161f27` | rail and quiet section surface |
| `--rl-surface-raised` | `210 24% 15%` | `#1d2730` | hovered/selected static controls |
| `--rl-line-soft` | `210 18% 20%` | `#2a343d` | hairline dividers |
| `--rl-line` | `209 18% 28%` | `#3a4753` | clear outline/focus-adjacent rims |
| `--rl-text` | `42 22% 92%` | `#eeece7` | primary interface text |
| `--rl-muted-strong` | `207 15% 73%` | `#b4bcc3` | secondary readable labels |
| `--rl-muted` | `207 13% 61%` | `#909ba4` | tertiary labels and idle icons |
| `--rl-emerald` | `157 61% 52%` | `#3dd198` | active/playing/confirmed state only |
| `--rl-emerald-dim` | `157 42% 20%` | `#1e4938` | selected outline/fill at low emphasis |
| `--rl-gold` | `39 56% 57%` | `#ce9f54` | manuscript-adjacent ornament and metadata only |
| `--rl-gold-soft` | `39 41% 32%` | `#73592f` | quiet gold rim/ornament |
| `--rl-danger` | `6 61% 60%` | `#d96c62` | playback error state only |

### Material, type, and geometry rules

- Keep the existing Qur'an page font, word placement, page-face tokens, and established font-size contract untouched. The lab adds no competing text treatment inside the Mushaf.
- Use the app's installed UI font and Arabic text. Interface hierarchy: 12px/500 metadata, 14px/500 labels, 16px/600 sheet headings, 20px/600 navbar Surah. Do not introduce a web font or image text.
- Navbar: `72px` high, `1px solid hsl(var(--rl-line-soft))` bottom border, `hsl(var(--rl-stage) / .92)` background, `backdrop-filter: blur(18px)`. No rounded outer container.
- Rail: `72px` wide; `background: hsl(var(--rl-surface) / .78)`; one `border-left` hairline; no outer radius, no card shadow. It is an alignment zone, not a dark second sidebar.
- Standard icon target: 40px button / 18px icon. Primary play target: 44px button / 20px icon, circular, `1px` emerald outline, `hsl(var(--rl-emerald-dim))` idle fill. Static buttons get only colour/background hover and focus treatment, never a fake pressed action.
- Settings sheet: 408px max width, 20px internal padding, 14px corners for section surfaces only, not its outer edge. Scrim `hsl(var(--rl-void) / .64)`. Sheet may use one low-elevation shadow: `0 24px 64px hsl(211 39% 2% / .45)`.
- Focus ring: `0 0 0 2px hsl(var(--rl-stage)), 0 0 0 4px hsl(var(--rl-emerald))`. All static controls remain focusable for tooltip/inspection but use `aria-disabled="true"`; the single theme option uses native `disabled`.
- Motion is understated: 160ms opacity/colour transitions; sheet uses the existing Radix transition pattern; respect `prefers-reduced-motion`. No parallax, animated page ornament, glowing continuous effects, or animation over Qur'an text.

## Implementation From the Ground Up

Implement in this order. Each step is intentionally small enough for a junior implementer to verify before moving on.

1. **Add the isolated route and server data boundary.**
   - Add `app/[locale]/reader-lab/[id]/page.tsx` as the direct URL entry.
   - Validate `locale === "ar"`; call `notFound()` for every other locale.
   - Parse and validate `[id]` using the same page-id validation as `app/[locale]/pages/[id]/page.tsx`.
   - Add a small server `ReaderLabPage` component beside the existing reader components. Reuse the production server reader's data loaders and pair calculation exactly; fetch independent initial page data with `Promise.all`; pass the seeded pair to `ReaderPager`. Do not self-fetch its own API route and do not duplicate Qur'an formatting logic.
   - Wrap the pager in the new client `ReaderLabShell`; the server route only supplies valid page data and locale.

2. **Add the lab client shell and desktop gate.**
   - Create `app/components/reader-lab/ReaderLabShell.tsx` (`"use client"`) containing the 72px lab navbar, fixed reading stage, rail, sheet state, and `children` (`ReaderPager`).
   - Create `ReaderLabDesktopGate.tsx`. CSS, not browser UA detection, chooses its two branches. At `min-width: 1367px and min-height: 800px`, display the lab. Otherwise hide the reader, rail, and sheet trigger and show a minimal Arabic message: `تجربة قارئ سطح المكتب — افتحها على شاشة أكبر`.
   - The full lab reading stage is fixed to the initial containing block below the navbar, with `overflow: hidden`; do not use a bottom-player height calculation and do not use a viewport-height card inside the Mushaf.

3. **Add a backward-compatible forced facing-page mode.**
   - Extend `ReaderPager` with an optional `forceDouble?: boolean` prop, default `false`; pass it only from `ReaderLabPage` as `true`.
   - Thread that prop through each pager panel into `QuranSpread`. Its default remains `false` everywhere production uses it.
   - Use `forceDouble || existingDoubleDecision` for step/prefetch/navigation page pairing. Add a lab marker class/data attribute so the partner page is visibly rendered in this route even if the user globally selected single-page mode.
   - Do not set or write `QuranSafhaViewContext`; this is a route-local display constraint, not a setting change.

4. **Implement the lab navbar.**
   - Create `ReaderLabNavbar.tsx`; do not import `Nav`, `UserMenu`, `SearchBar`, `NotificationBell`, or production `SettingsSidebar`.
   - Obtain visible page metadata via existing reader/page hooks or cache. Show a graceful Arabic metadata placeholder while it is unavailable; do not create a second page fetch.
   - Use Lucide icons only. Search/bookmark/bell controls are static buttons with Arabic `aria-label` and `Tooltip`; gear alone calls `onOpenSettings(true)`.
   - Ornament uses existing local Mushaf ornament assets only if they already load in the app; otherwise render simple non-semantic gold separators. Never add a remote image dependency.

5. **Implement the right recitation rail.**
   - Create `ReaderLabRecitationRail.tsx` and position it `fixed; right: 0; top: 72px; bottom: 0; width: 72px`. `right` is deliberate and must not become `inset-inline-end`.
   - Use `useRecitation()` read-only values to choose the visible status (`idle`, `loading`, `playing`, `paused`, `error`) and reciter tooltip. Do not call `play`, `togglePlayPause`, `stop`, `openSettings`, or `updateSettings` from this component.
   - Render three semantic groups: `status`, `transport`, and `utilities`. New previous/next/repeat/favourite/volume/queue/tuning buttons use `type="button"`, Arabic `aria-label`, tooltip, and `aria-disabled="true"`; their handler is absent. Play looks primary but is equally static, so give it `aria-disabled="true"` and no handler.
   - Use a compact avatar fallback (`CircleUserRound` in a gold rim) rather than adding a new image asset. Never show vertical Arabic text in the rail.

6. **Implement the new, inert lab settings sidebar.**
   - Create `ReaderLabSettingsSidebar.tsx` using the existing Sheet primitive for focus management, but create entirely new contents/styles. Render `SheetTitle` and `SheetDescription` for accessibility.
   - Open it with `side="left"`; it is physical left to balance the physical right rail. Apply `fq-reader-lab-settings` to the actual `SheetContent` so the portalled element receives the lab tokens.
   - Build presentation-only rows for every existing settings category: language, Qur'an font size, page view, appearance, Mushaf layout, keep screen awake, push notifications, and offline recitation. Each row states its current illustrative value in Arabic but cannot open a submenu, toggle, navigate, request permission, or write storage.
   - Do **not** mount `LanguageToggle`, `DesktopQuranFontSizeControls`, `QuranSafhaViewToggle`, `ThemeToggle`, `MushafLayoutSection`, `EnablePushToggle`, `OfflineRecitationSection`, or any production mutation component. They would make a design test change real app state.
   - In Appearance, render only `داكن`: selected, check-marked, natively disabled, and accompanied by `هذه التجربة مظلمة فقط`. Do not show light/system choices, a theme switch, or an enabled interaction.

7. **Scope the CSS without changing production tokens.**
   - Add the lab variables and all lab-specific selectors in `app/globals.css`, inside `@layer base` and always rooted under `.fq-reader-lab` or `.fq-reader-lab-settings`.
   - Use an explicit desktop media gate (`min-width: 1367px` and `min-height: 800px`) for the reading composition; keep the compact notice outside it.
   - Preserve existing `.fq-reader-outer`, spread-width budget, card margins, and external arrow geometry. The rail overlays known lateral whitespace; do not add asymmetrical reader padding, change `--fq-dv-word`, or adjust Mushaf card width to make space.
   - Do not use raw Tailwind arbitrary colour values throughout components. Components consume the scoped semantic lab variables via named `fq-reader-lab-*` classes; the exact palette lives once in the CSS contract above.

8. **Suppress only global chrome for the lab path.**
   - In `app/components/nav/Nav.tsx`, calculate `isReaderLabRoute = pathname?.includes("/reader-lab/") ?? false` after all hooks. Return `null` for that route before JSX; leave every production path and the production `SettingsSidebar` behaviour unchanged.
   - In `app/components/RecitationPlayerBar.tsx`, calculate both `isProductionReaderRoute` and `isReaderLabRoute`. Use their union for the hard-stop effect so merely entering the lab does not stop existing audio. After hooks/effect, return `null` on the lab route so the production bottom bar/production rail never appears there.
   - In `app/components/reader/LastReadPageSync.tsx`, explicitly skip `/reader-lab/` as well as `/mushaf/`, ensuring navigation through a visual test never overwrites the user's actual resume point.

9. **Add Arabic copy and maintain translation parity.**
   - Add a compact `readerLab` namespace to both `messages/ar.json` and `messages/en.json` so JSON keys stay structurally complete. The route still renders only Arabic; English text is parity maintenance, not an enabled English design.
   - Use keys for every label, tooltip, state, desktop gate message, section title, and unavailable note. Do not hardcode new UI strings in components.

10. **Verify the finished visual and behavior in the actual app.**
   - Run lint/type/build checks required by the implementation workflow.
   - At 1367×800, 1440×900, and 1920×1080: confirm the facing Mushaf is centred, readable at the current app font contract, and has no rail/navbar/control overlap on Qur'an text or external arrows.
   - At 1366px wide and at 799px high: confirm only the desktop-required notice appears and no global production navbar/player leaks through.
   - At `/en/reader-lab/1`: confirm `notFound()`.
   - Open/close the gear sheet with mouse, keyboard, Escape, and focus return; verify every category is visible and inert; verify only selected disabled `داكن` appears in Appearance.
   - Navigate several pages and return to a normal reader: confirm production last-read page, theme, locale, Safha view, recitation settings, notifications, and offline storage did not change.

## Decision Tree

| Condition | Rendered result | Side effects |
|---|---|---|
| URL is `/ar/reader-lab/[valid-page]` and viewport is at least 1367×800 | Full lab composition: local navbar, centred forced-double Mushaf, static right rail, optional left sheet | Page navigation and normal reader data fetching work; no preference/progress write |
| Same valid lab URL but width `<1367px` or height `<800px` | Arabic desktop-required notice only | No reader, rail, sheet, global navbar, or global player visible |
| Locale is not `ar`, or page id is invalid | `notFound()` | No state change |
| Lab gear activates | Lab left settings sheet opens | Presentation only; all category controls inert |
| Any new rail control activates | Tooltip/focus affordance only | No playback, state, preference, or sheet action |
| Existing recitation is non-idle when entering lab | Lab rail displays its status; production player remains hidden | Playback is not stopped solely because the lab is also a reader route |
| User leaves lab for non-reader route while recitation is non-idle | Existing hard-stop behavior runs | Playback stops, as it does today |
| User leaves lab for production `/pages/` reader | Production header/player resume normal rendering | Playback is not stopped solely due to route transition |

## Verified Design Cases

| Case supplied/approved in this discussion | Required outcome |
|---|---|
| User wants the Mushaf in the middle with a proper reading size | Real facing pages remain centred; rail consumes only existing peripheral whitespace and no player overlays the text. |
| User wants a full-width navbar and full-height recitation bar | Navbar is a 72px full-width strip; physical-right rail spans from its underside to viewport floor without becoming a heavy second column. |
| User asks that settings open from navbar gear and use a new look | Gear opens a separate lab Sheet, styled entirely with lab tokens—not the production `SettingsSidebar` UI. |
| User asks for every settings category but design only | All eight categories are represented by inert rows; no production interactive setting component is mounted. |
| User wants dark only and a dark choice that cannot change | Appearance contains exactly one selected, disabled `داكن` option. |
| User asks for direct URL, desktop, and RTL only | Route is unlinked, accepts only `/ar/...`, and gates at the defined desktop size. |

## Design Remediation

Run these after implementation, as required by ADR 0041's UI planning gate:

- `/impeccable shape app/components/nav/Nav.tsx`
- `/impeccable shape app/components/RecitationPlayerBar.tsx`
- `/impeccable shape app/components/reader/ReaderPager.tsx`
- `/impeccable shape app/components/reader/QuranSpread.tsx`
- `/impeccable layout app/components/reader/ReaderPager.tsx app/components/reader/QuranSpread.tsx app/globals.css`
- `/impeccable distill app/components/RecitationPlayerBar.tsx`
- `/impeccable harden app/components/RecitationPlayerBar.tsx app/components/nav/Nav.tsx app/components/SettingsSidebar.tsx`

## Files to Change

- `app/[locale]/reader-lab/[id]/page.tsx` — new direct, Arabic-only server route.
- `app/components/reader-lab/ReaderLabPage.tsx` — new server data adapter reusing reader pair/data conventions.
- `app/components/reader-lab/ReaderLabShell.tsx` — new client composition and local sheet state.
- `app/components/reader-lab/ReaderLabDesktopGate.tsx` — new desktop-only gate and small-viewport notice.
- `app/components/reader-lab/ReaderLabNavbar.tsx` — new full-width local chrome and active gear.
- `app/components/reader-lab/ReaderLabRecitationRail.tsx` — new read-only/static, physical-right full-height control rail.
- `app/components/reader-lab/ReaderLabSettingsSidebar.tsx` — new left-side inert settings presentation.
- `app/components/reader/ReaderPager.tsx` — optional lab-only `forceDouble` support, defaulting off.
- `app/components/reader/QuranSpread.tsx` — receive the optional forced-double marker without changing production navigation/geometry.
- `app/components/nav/Nav.tsx` — suppress global nav only for lab routes after all hooks.
- `app/components/RecitationPlayerBar.tsx` — exclude lab from render but include it in reader-route hard-stop logic.
- `app/components/reader/LastReadPageSync.tsx` — exclude lab routes from last-read persistence.
- `app/globals.css` — scoped lab variables/material/layout rules and desktop gate only.
- `messages/ar.json` and `messages/en.json` — matching `readerLab` copy namespace.
- `docs/plans/reader-lab-nocturnal-desktop.md` — this implementation contract; update its status only after the implementation is verified.

## Constraints

- Preserve all active Mushaf layout, font-sizing, no-overlap, page-turn, and external-arrow invariants in `docs/architecture/DECISIONS.md`.
- Do not touch the actual Qur'an text tree, word placement, page dimension calculations, or page font files.
- The physical rail stays on the right, even in RTL; this is intentional for the experimental composition. Other layout text remains RTL.
- The rail must be visually low contrast: no large opaque card, perimeter card border, repeated dividers, or persistent label stack that competes with the Mushaf.
- All icons require Arabic accessible names, visible keyboard focus, and a tooltip. Static does not mean inaccessible.
- Keep production mobile/tablet/desktop routes visually and behaviorally unchanged outside the explicit global-chrome lab path guards.
- Do not create a new global theme, modify user theme state, or add the lab to existing theme selectors.
- No GitHub issue, worktree creation, release work, migration, or production design-system overhaul belongs to this task.

## What NOT to Do

- Do not turn the existing production `/pages/[id]` reader into this visual design.
- Do not link the lab from any existing navigation surface, continuation link, search result, sidebar, sitemap, or onboarding.
- Do not reuse the production `Nav`, `RecitationPlayerBar` markup, or `SettingsSidebar` markup as the lab chrome; only isolate/suppress their global instances for the lab route.
- Do not use the current production rail as an icon-only rail by changing its shared layout. The lab rail is a separate component.
- Do not make visual-test settings mutate settings, request browser permissions, alter language, trigger downloads, or persist a chosen dark theme.
- Do not move recitation controls over the Mushaf, reserve asymmetric width for the rail, alter page font sizes, or use a single-page fallback at the lab's supported desktop viewport.
- Do not add new raster assets, remote avatars, a new font, global CSS colour tokens, or a global stylesheet beyond the explicitly scoped `globals.css` rules.
- Do not build a mobile/tablet version now; the notice is a guard, not a second reader design.

## Design Revision — 2026-08-21

First implementation shipped the structure but not the composition. Reworked after visual review at 1367×800, 1440×900 and 1920×1080.

**Bugs found and fixed**

1. **Stage height chain collapsed.** `.fq-reader-lab .fq-reader-panel { height: 100% }` sat inside a flex-grown box, so it resolved to `auto` (the ADR 0036 trap). The outer measured 750px in a 1008px stage and the spread was top-aligned above ~300px of dead void. Fixed by carrying height by percentage from the fixed stage down to `.fq-reader-outer`, then by `align-items: stretch` below it.
2. **Dead card-width formula.** `--fq-card-word: min(var(--fq-desktop-word), var(--fq-dv-word))` was declared on `.fq-spread`, but `--fq-desktop-word` is set inline on the descendant `.fq-content`. The `min()` was invalid at computed-value time, so the whole declaration was a no-op. Removed; the folio is sized by the height cap instead, leaving the font-size contract untouched.
3. **Desktop gate leaked.** `.fq-reader-lab-desktop { display: none }` lost to the JSX `contents` utility (globals.css is one `@layer base` block and loses to the utility layer at equal specificity), so at <1367px the full reader rendered underneath the notice. Both gate branches now carry `!important` and the `contents` utility is gone from the JSX.
4. **No focus return.** The sheet is opened from shell state, not a `SheetTrigger`, so Radix had no trigger to restore to and Escape dropped focus on `<body>`. `onCloseAutoFocus` now returns focus to the gear.

**Composition changes**

| Area | Change |
|---|---|
| Stage | Folio centred and capped at `--rl-folio-max-h: 792px` — a 1:1.5 printed-page proportion; surplus height becomes symmetric desk margin. |
| Atmosphere | Two inert pseudo-layers on the stage: a warm lamp pool centred on the folio and a vignette closing the corners. Plus a 1px warm rim light on the folio's top edge and a wide layered cast shadow to ground it. Nothing paints over Qur'an text. |
| Navbar | Identity mark moved from emerald to a gold rim, so gold owns identity/metadata and emerald is reserved for live state. `✦` glyphs replaced by a drawn `.fq-reader-lab-ornament` (hairline tapering to an open diamond). The three inert icons are grouped in one well; the gear sits outside it at higher contrast, so the only live control looks live. |
| Rail | Transport pinned to the rail's true vertical midpoint (was sitting at ~¼ height). Surface and divider now fade out at both ends so the rail reads as an alignment zone, not a second sidebar. |
| Play control | Emerald outline over a dim emerald face instead of a solid saturated disc. |
| Page arrows | Lab-scoped quiet rims; production's filled primary chip read as two saturated blobs on the nocturnal desk. |
| Settings sheet | Eight identical floating cards → three overlined sections of grouped rows with hairline separators. Fake pressable font-size segments replaced by an inert scale indicator. Emerald reduced to the two genuinely-on states. |
| CSS contract | Components now consume named `fq-reader-lab-*` classes instead of repeating raw `bg-[hsl(var(--rl-…))]` literals, as step 7 required. |

**Accepted deviations from the brief**

- The rail's *"2px vertical status/progress stroke beside the cluster"* is now a status **ring around the play control**. In a 72px rail the stroke had nowhere to live but 2px off the rail edge, where it read as a rendering artifact; a ring on the control it describes costs no lateral room.
- Hardcoded Arabic strings in the settings sheet were replaced with `readerLab.*` keys (`presentationOnly`, `sectionReading`, `sectionDevice`, `stateLocked`, `stateOnline`, `close`), with English parity added.

**Re-verified:** `/en/reader-lab/1` → 404; 1366w and 799h → notice only, no global nav or player; 1367×800 / 1440×900 / 1920×1080 → centred folio, no rail/arrow overlap, no document overflow; sheet opens, closes on Escape, returns focus to the gear; a lab visit plus page navigation writes no `localStorage` key.

## Decisions Made

- The lab is an unlinked, route-local visual experiment, not a parallel product reader.
- The composition is Arabic/RTL and dark-only, with the exceptional physical-right rail explicitly fixed for visual balance.
- The Mushaf uses production rendering/data because accuracy is non-negotiable; the surrounding chrome is a separate experimental system.
- Gear owns lab settings; the rail owns only static recitation affordances. This prevents settings-information-architecture ambiguity.
- A realistic settings inventory is valuable for evaluating the design, but it is intentionally inert until a future approval/migration task.
