# Home Page Design Fixes

**Type:** bug + feature (design)
**Date:** 2026-08-13
**Status:** implemented

## Summary

`/impeccable critique` of `app/[locale]/page.tsx` (`.impeccable/critique/2026-08-13T12-47-05Z__app-locale-page-tsx.md`, 18/28) found: two real WCAG contrast failures on the surah-list card in dark theme, generic (non-manuscript) card depth on the entry point to the mushaf, a boilerplate hero that displaces content for returning users, and an unlabeled 6-icon mobile nav row. Trello #206 tracks this; it supersedes/archives #195, #198, #203 (prior, narrower nav tickets).

## Root Cause / Approach

1. **Contrast**: `.theme-dark`'s `--accent-foreground` (169 88% 26%, mirrored from `--primary`) on `--accent` (161 58% 15%) measures 2.4:1; `--muted-foreground` (206 9% 50%) on `--card` (211 38% 16%, i.e. `#14212f`) measures 4.1:1. Both need ≥4.5:1 (WCAG AA). Per the **Dark Theme Color Semantics** decision (ADR 0031), the badge must stay emerald (`--accent`/`--accent-foreground`) — no gold exception. **Revised during implementation**: `--accent-foreground` turned out to be deliberately mirrored to `--primary` in every theme (same value repeated 4×), and `--primary` had just been retinted the same day (`docs/plans/brand-mark-icons.md`) specifically to keep white-on-primary button text at 5.09:1 — bumping `--primary` itself to fix the badge would have dropped that to ~2.7:1, and no single `--primary` lightness satisfies both pairings (checked). Fix: decouple `--accent-foreground` from `--primary` in dark theme only (independent value, `169 88% 39%`, 5.0:1 against `--accent`); `--primary` itself is untouched. See DECISIONS.md's Dark Theme Color Semantics entry.
2. **Card depth**: `SurahListItem` (`app/components/SurahListItem.tsx`) uses generic `shadow-sm`/`hover:shadow-md`. It's shared between the home page and the reader sidebar (used wherever `SurahList`/`SurahListItem` render) — the fix applies everywhere the component renders, one visual language, no home-page-only variant. Approach: apply the DESIGN.md "standard card lift" shadow token only, no ornament. **Revised twice during implementation**: first a 4-corner star SVG motif — rejected ("doesn't present islamic shape"); then a single-corner Islamic rosette (user-supplied PNG, CSS-masked) — also rejected ("looks bad"). Final scope is the shadow-lift change alone.
3. **Hero collapse — implemented, then reverted**: a `HomeHero` client component was built to collapse the hero (title + prominent Continue Reading button, no tagline) for returning users, detected via `LastReadPageContext`. After seeing it rendered, the user reverted this entirely: the full hero (title + tagline) now always renders, in every state, for every visitor. `HomeHero.tsx` was deleted; `app/[locale]/page.tsx` renders the hero inline again (plain server component, no client-side context read needed since there's no branching left).
4. **Mobile nav**: `Nav.tsx`'s single flex row (logo, ContinueReadingLink, SharedMushafLink, SearchBar, NotificationBell, UserMenu, SettingsSidebar) has no mobile-specific grouping. Keep search + Continue Reading directly visible on mobile; collapse SharedMushafLink, NotificationBell, UserMenu, SettingsSidebar into one overflow-menu trigger on mobile only (desktop keeps the current full row — this is a mobile-breakpoint change, not a removal). **Revised after shipping, three more rounds**:
   - **v1 → v2**: the first version (a `Popover` stacking the 4 components' own trigger styling) was critiqued via `/impeccable critique` at the user's request ("it doesn't look professional") and confirmed as the root cause — no shared row shape, 2 of 4 rows unlabeled, panel ignored design-principles.md's card chrome. Rebuilt as a bottom `Sheet` where every item renders through one shared row template (`menuRowClassName`, `NavPillLink.tsx`) with a visible label.
   - **Close-on-action fixes**: clicking SharedMushafLink didn't close the menu (Nav never remounts across navigation, DECISIONS.md "Nav-Mounted State Must Be Live" — an uncontrolled Sheet just stayed open); clicking Settings closed the menu but then failed to open Settings at all — its `Sheet` was nested inside the overflow Sheet's own `SheetContent`, so closing the outer one unmounted the inner one before it could render. Fixed by (1) making the overflow Sheet's `open` state controlled, with `closeMenu` threaded into `SharedMushafLink`'s `onNavigate` and the Settings row's own `onClick`; (2) giving `SettingsSidebar` a controlled `open`/`onOpenChange` mode and rendering it as `NavOverflowMenu`'s **sibling**, not its child, so it survives the overflow Sheet closing under it.
   - **Icon + spacing polish**: swapped the trigger icon `MoreHorizontal` → `Menu` (hamburger) per the user's preference. Standardized every mobile-visible nav icon button to `size-10` (40×40, matching the trigger's existing `Button size="icon"` footprint) — `FurqanLogo` (was 34px unconditionally, now `size-10 md:size-[34px]`, only used in `Nav.tsx` so safe), `ContinueReadingLink` (was a padded pill via shared `navPillClassName`, now a bespoke responsive class — square on mobile, unchanged pill at `md:`), and the mobile search trigger in `SearchBar.tsx` (`w-9 h-9` → `w-10 h-10`) — the four different box sizes at the same `gap-1` were the actual cause of the "spacing doesn't look good" complaint, not the gap value itself.
   - **Visual reorder**: Continue Reading moved to cluster with search + the menu trigger (was next to the logo) via Tailwind `order-*` utilities on `FurqanLogo`/`ContinueReadingLink`/the search wrapper/`NavOverflowMenu`, all reset with `md:order-none` — DOM order (and therefore desktop layout) is untouched, this is a mobile-only visual reorder. All four of these components gained a `className` passthrough prop to carry the `order-*` classes.
   See the second and third Decisions Made entries for this item. **Explicitly not final** — user confirmed "this is not the final design, we will work on it later" before shipping.
5. **Minor**: drop the redundant "MEMORIZE THE QURAN" badge (tagline already carries that message) — dropped entirely, not just when collapsed, since it duplicated the tagline in the full hero too; loosen the Arabic tagline's max-width slightly to avoid the awkward 4-line wrap. **Revised during implementation**: the surah-grid loading/empty state item was dropped — `getSurahs()` reads a static, build-time-committed JSON file and throws (caught by Next's error boundary) rather than ever rendering an empty/loading grid; per the Static Generation Strategy decision this state structurally cannot occur, so no defensive UI was added for it.
6. **E2E test fix (post-ship)**: `e2e/tests/visual.spec.ts`'s settings-sheet test clicked a `getByRole("button", { name: SETTINGS_LABEL })` unconditionally for both Playwright projects. On `mobile`, that button is now `hidden md:block` (removed from the a11y tree) — Settings only exists once `NavOverflowMenu`'s hamburger sheet is open. Fixed by adding the same `testInfo.project.name === "mobile"` branch the search test already used (`visual.spec.ts:111`): click the "More" trigger first on mobile, then Settings. Baselines themselves are not touched here — per DECISIONS.md's Visual E2E Testing entry they're only ever regenerated via the `workflow_dispatch` CI job, never committed locally; `home-*`, `settings-*` (mobile), and possibly `page-1-*`/`spread-2-3-*` (mobile) baselines will need that job run once this test fix merges.

## Decision Tree / Algorithm

**Hero — reverted to unconditional.** No decision tree: `app/[locale]/page.tsx` always renders title + tagline (no badge), regardless of reading history. The `lastReadPage`-branched table below is historical (describes the reverted `HomeHero` component) — not current behavior.

| `lastReadPage` (from `LastReadPageContext`) | Hero state (REVERTED — no longer implemented) |
|---|---|
| `1` (default / never read) | Full hero: badge + H1 + tagline |
| anything else | Collapsed hero: smaller heading only, no badge, no tagline; Continue Reading link surfaced prominently above the grid |

**Mobile nav collapse (breakpoint: below `md`, matches existing `hidden md:inline` pattern already used by `ContinueReadingLink`/`SharedMushafLink`):**

| Item | Mobile (`<md`) | Desktop (`≥md`) |
|---|---|---|
| Logo | visible | visible |
| SearchBar | visible | visible |
| ContinueReadingLink | visible (icon-only, existing) | visible (icon+label, existing, unchanged) |
| SharedMushafLink | moves into overflow menu | visible (icon+label, unchanged) |
| NotificationBell | moves into overflow menu | visible (unchanged) |
| UserMenu | moves into overflow menu | visible (unchanged) |
| SettingsSidebar | moves into overflow menu | visible (unchanged) |
| Fullscreen toggle | already desktop-only (`isDesktopUp` gate) | unchanged |

**Overflow menu internal row template (as implemented, v2):**

| Item | Row rendering | Nested portal |
|---|---|---|
| SharedMushafLink | `<Link menuRow>` via `menuRowClassName` | — (no nested content) |
| NotificationBell | `<button menuRow>` via `menuRowClassName`, wraps Popover trigger | `PopoverContent container={sheetContentEl}` |
| UserMenu | `<button menuRow>` via `menuRowClassName`, wraps DropdownMenu trigger | `DropdownMenuContent container={sheetContentEl}` |
| SettingsSidebar | `<button menuRow>` via `menuRowClassName`, wraps Sheet trigger | no container needed — nested Sheet is itself modal, Radix supports nested Dialogs natively; the `container` workaround only applies to a *non-modal* Popover/DropdownMenu trapped by an outer modal |

**Contrast fix (as implemented):** `--accent-foreground` decoupled from `--primary` in `.theme-dark`/`.theme-dark.dark` only, set to `169 88% 39%` (5.0:1 against `--accent`, was 26%/2.4:1); `--muted-foreground` bumped to `206 9% 56%` (5.0:1 against `--card`, was 50%/4.1:1). `--primary` untouched (button-text contrast stays 5.09:1). Light and gold themes unaffected. Computed via WCAG relative-luminance formula against the real HSL values, not eyeballed.

## Verified Test Cases

- ~~Returning user hero collapse~~ — reverted, no longer applicable.
- Full hero (title + tagline, no badge) renders identically for every visitor on `/en` and `/ar`, mobile and desktop, regardless of reading history.
- `SurahListItem` rendered in the reader sidebar (`Sidebar` component, pages layout) → same shadow treatment as the home page grid, not a separate variant.
- Mobile nav at `<768px` → search + Continue Reading tappable directly; shared-mushaf/notifications/account/settings reachable via one overflow trigger opening a bottom sheet, all 4 rows sharing one template (equal height, full width, visible label) via `menuRow`; desktop nav pixel-identical to today.
- NotificationBell's Popover and UserMenu's DropdownMenu, opened from inside the overflow Sheet → both open and function correctly (keystrokes/clicks not yanked back to the Sheet's own FocusScope), verified via the `container` prop pointed at the Sheet's content node.
- SettingsSidebar opened from inside the overflow Sheet (Sheet-inside-Sheet) → opens correctly on top, no focus/portal conflict.
- Dark theme badge and verse-count text, and the existing white-on-primary button text, all computed against real rendered HSL values → all ≥4.5:1 (badge 5.0:1, verse-count 5.0:1, button text unchanged at 5.09:1).

## Files to Change (as implemented)

- `app/globals.css` — `.theme-dark`/`.theme-dark.dark`: `--accent-foreground` decoupled from `--primary` (own value, `169 88% 39%`); `--muted-foreground` bumped to `206 9% 56%`. `--primary` and light/gold blocks untouched.
- `app/components/SurahListItem.tsx` — replaced `shadow-sm`/`hover:shadow-md` with the standard card-lift shadow token (`shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]`, stronger on hover). No ornament — two attempts tried and rejected, see Decisions Made.
- `app/components/HomeHero.tsx` — created (client component, hero-collapse logic), then **deleted** after the user reverted the feature.
- `app/[locale]/page.tsx` — hero markup is inline again (plain server component): title + tagline, no badge, RTL-widened tagline max-width, unconditional for every visitor.
- `messages/en.json` / `messages/ar.json` — removed unused `home.badge` key; added `nav.more` for the overflow trigger's aria-label.
- `app/components/nav/NavOverflowMenu.tsx` — mobile-only (`md:hidden`) trigger, **rebuilt twice**: v1 was a `Popover` wrapping the 4 components as-is (critiqued, rejected); v2 (shipped) is a bottom `Sheet` where every item renders through the shared `menuRow` template, with `container` wired for the two nested non-modal primitives.
- `app/components/nav/Nav.tsx` — wraps SharedMushafLink/NotificationBell+UserMenu/SettingsSidebar in `hidden md:block`/`md:flex`, adds `<NavOverflowMenu />`; desktop row unchanged.
- `app/components/nav/NavPillLink.tsx` — added `menuRowClassName` (the shared row template) and a `menuRow` prop on `NavPillLink` itself.
- `app/components/nav/SharedMushafLink.tsx` — `menuRow` prop (replaces the earlier, now-removed `alwaysShowLabel`) renders via `menuRowClassName`, label always visible, icon size fixed at `size-5` (was `size-5 md:size-4`, since this component no longer renders directly on mobile at all).
- `app/components/nav/UserMenu.tsx` — `menuRow` + `container` props (replaces `alwaysShowLabel`); trigger renders via `menuRowClassName` when `menuRow`, `DropdownMenuContent` takes the portal `container`.
- `app/components/notifications/NotificationBell.tsx` — new `menuRow` + `container` props; renders a labeled full-width row (unread dot repositioned relative to the icon, not the row) when `menuRow`, unchanged icon-only `Button` otherwise.
- `app/components/SettingsSidebar.tsx` — new `menuRow` prop; fixes the actual P0 bug (hardcoded `ml-4`/`mr-4` desktop-neighbor spacing leaking into the menu, shifting the gear icon 16px off `NotificationBell`'s column) by branching to a `menuRowClassName` trigger with no margin and a visible label when `menuRow`; desktop trigger byte-for-byte unchanged.
- `components/ui/popover.tsx` — pre-existing `container` prop on `PopoverContent`, reused (not modified).
- `components/ui/dropdown-menu.tsx` — added `container` prop to `DropdownMenuContent` (mirrors `PopoverContent`'s existing pattern; `UserMenu` needed it once nested inside the Sheet).
- `docs/architecture/DECISIONS.md` — new constraint under "Dark Theme Color Semantics" documenting the `--accent-foreground`/`--primary` decoupling and why.
- `docs/design/design-principles.md` — **not changed**: both ornament attempts were added then reverted; the file's pre-existing content (mushaf-page-only 4-corner-star rule) is untouched.
- `docs/architecture/COMPONENTS.md` — updated nav zone and home zone entries for `NavOverflowMenu` (both versions), `HomeHero` (added then removed), and the `menuRow`/`container` prop changes to `SharedMushafLink`/`NotificationBell`/`UserMenu`/`SettingsSidebar`.
- `.impeccable/critique/…` snapshot — no code change, already persisted.
- `app/components/SettingsSidebar.tsx` — **revised again**: `menuRow` (v2's shape) replaced by controlled `open`/`onOpenChange` props (no trigger rendered at all when controlled — `NavOverflowMenu` owns both the trigger row and the open state).
- `app/components/nav/NavOverflowMenu.tsx` — **revised again**: renders `SettingsSidebar` as its own sibling (outside the `Sheet`/`SheetContent` tree) with lifted `settingsOpen` state; the Settings row is now a plain button owned by this component, not `SettingsSidebar`'s trigger; trigger icon `MoreHorizontal` → `Menu`; gained `className` passthrough for the mobile `order-*` reorder.
- `app/components/nav/FurqanLogo.tsx`, `app/components/nav/ContinueReadingLink.tsx` — `size-10` mobile footprint + `className` passthrough for `order-*`; `ContinueReadingLink` no longer uses `NavPillLink`/`navPillClassName` (bespoke responsive class instead).
- `app/components/search/SearchBar.tsx` — mobile trigger `w-9 h-9` → `w-10 h-10`.
- `app/components/nav/Nav.tsx` — `order-*`/`md:order-none` on the four mobile-visible items; search wrapper drops its mobile `px-2` (became a visible extra gap once justify-end gave it a real neighbor).
- `e2e/tests/visual.spec.ts` — settings-sheet test now opens `NavOverflowMenu`'s trigger first on the `mobile` Playwright project before clicking Settings, mirroring the search test's existing `testInfo.project.name === "mobile"` branch.

## Constraints

- `SurahListItem`'s `isActive` prop / sidebar usage must keep working — this is a shared component, not being forked.
- Contrast fix must not touch light or gold theme tokens (Theme Architecture decision: values are per-theme, rules are shared — but this fix is dark-only by nature of the failing values).
- Badge stays emerald (`--accent`/`--accent-foreground`) — do not reach for gold as a "fix" (ADR 0031 constraint: gold is reader-page-only, no exceptions in chrome).
- `--primary` itself must not be retuned to fix the badge — it's shared with button/link/focus-ring contrast (specifically the 5.09:1 white-on-primary button pairing), which a `--primary` change would break. Fix the badge via `--accent-foreground` alone, decoupled from `--primary` in dark theme only.
- No ornament on `SurahListItem`, of any kind — two attempts (4-corner star SVG, single-corner rosette PNG) both tried and rejected by the user. The item's scope is the shadow-lift change only.
- Desktop nav must render exactly as it does today — this is a mobile-breakpoint-only change, matching the existing `hidden md:inline` pattern already in `ContinueReadingLink`/`SharedMushafLink`.
- Every item inside `NavOverflowMenu` must render through the shared `menuRowClassName` template (equal height, full width, visible label) — no component keeps its own bespoke trigger styling once `menuRow` is set. This is the specific rule the v1 Popover violated.
- `SettingsSidebar`'s desktop-only `ml-4`/`mr-4` trigger margin must never apply when `menuRow` is set — that hardcoded value was built for its position next to the fullscreen toggle in the desktop row, not for a column of menu rows.
- Do not use `bg-white`/`text-black`/raw hex anywhere — semantic tokens only (Styling Standards).
- Use `start`/`end` logical Tailwind variants for anything that must mirror in RTL (Styling Standards).

## What NOT to Do

- Do not add a second accent color to "fix" the badge (One Accent Rule, DESIGN.md) — this is a value retune within emerald, not a new hue.
- Do not fork `SurahListItem` into a home-page-only variant with a prop switch — the user explicitly chose "everywhere."
- Do not remove or hide SharedMushafLink/NotificationBell/UserMenu/SettingsSidebar on mobile — they move into an overflow menu, they don't disappear.
- Do not touch `--mushaf-rim-*`/`--mushaf-sheet-*`/reader-page depth tokens — those are reserved for the actual mushaf reading page (Reader Surface Depth decision) and are architecturally distinct from the surah-list card's new treatment.
- Do not add any ornament to `SurahListItem` — both the 4-corner star SVG and the single-corner rosette PNG were tried and rejected this task. If revisited later, treat both as dead ends, not partial progress to build on.
- Do not hand-author new intricate/arabesque SVG path data for future ornament work here — this codebase has a documented poor track record with it (the mushaf reader's own hand-authored corner-medallion/guilloche frame, ADR 0013, was built then fully removed after living with it; the brand logo mark needed two hand-drawn SVG attempts abandoned in favor of an externally-exported PNG, `docs/plans/brand-mark-icons.md`).
- Do not mirror `--accent-foreground` back to `--primary` in dark theme as a "simplification" without re-deriving both contrast pairs (badge-vs-accent and button-text-vs-primary) — that's the exact regression this task's contrast fix avoids.
- Do not revert `NavOverflowMenu` to the v1 Popover-with-unmodified-children shape — tried, critiqued, and rejected as "doesn't look professional" this task. If touching this menu again, start from the v2 Sheet + shared-row-template approach.
- Do not let any of the 4 menu items keep icon-only-no-label rendering inside the menu — that was P0 #1 of the nav critique (`.impeccable/critique/2026-08-13T13-56-56Z__app-components-nav-navoverflowmenu-tsx.md`).
- Do not nest `SettingsSidebar`'s `Sheet` inside `NavOverflowMenu`'s `SheetContent` again — tried, and closing the outer Sheet unmounts the inner one before it can open. It must stay a sibling with controlled `open`/`onOpenChange`.
- Do not add a visual-e2e test assertion that clicks a nav-row button unconditionally across both Playwright projects without checking whether that element actually renders directly on mobile (it may be behind `NavOverflowMenu` now) — this is exactly how the settings-sheet test broke.
- None known beyond the above (no prior addendum exists for this plan).

## Decisions Made

- SurahListItem's depth change applies globally (home + sidebar), not as a home-page-only variant — user confirmed.
- Ornament treatment iterated twice, both rejected: (1) scaled-down 4-corner star SVG motif — "doesn't present islamic shape"; (2) single-corner Islamic rosette, user-supplied PNG applied via CSS `mask-image` — "looks bad". `SurahListItem` ships with the shadow-lift change only, no ornament. `docs/design/design-principles.md` is unchanged from before this task.
- Dark-theme contrast fix decouples `--accent-foreground` from `--primary` (independent value, `169 88% 39%`) rather than retuning `--primary` itself — discovered mid-implementation that a shared `--primary` bump would regress the existing white-on-primary button contrast (5.09:1 → ~2.7:1); no single `--primary` lightness satisfies both the badge and the button. Recorded in DECISIONS.md.
- Hero-collapse-for-returning-users was implemented, then fully reverted after the user saw it rendered — "revert that change, keep this always in all states." Full hero (title + tagline, no badge) now renders unconditionally. `LastReadPageContext` is no longer read by the home page at all.
- Mobile nav collapses to search + Continue Reading + one overflow menu; desktop unchanged — user confirmed.
- `NavOverflowMenu` shipped as a Popover (v1), was independently critiqued via `/impeccable critique` at the user's request ("it doesn't look professional") after they viewed it live, and was rebuilt as a bottom Sheet (v2) with every item routed through one shared row template — user confirmed "rethink the pattern entirely" over patching v1 in place. `SharedMushafLink`/`UserMenu`/`NotificationBell`/`SettingsSidebar` all gained a `menuRow` prop (replacing the earlier, narrower `alwaysShowLabel`); `NotificationBell`/`UserMenu` also gained `container` for their nested Popover/DropdownMenu, and `DropdownMenuContent` gained the same `container` prop `PopoverContent` already had.
- Nav restructuring is in scope for this plan despite being app-wide chrome, not home-page-specific — user confirmed; consolidates and archives Trello #195/#198/#203.
- Surah-grid loading/empty state item dropped from scope — `getSurahs()` is a static, build-time-committed JSON read that throws rather than ever rendering empty (Static Generation Strategy decision); the state the critique flagged cannot occur.
- Settings-not-opening bug (post-v2-ship): root-caused to `SettingsSidebar`'s `Sheet` being unmounted by its own closing parent — fixed by lifting it to a sibling with controlled `open` state, not by any change to Radix/Dialog usage elsewhere.
- Hamburger icon (`Menu`, not `MoreHorizontal`), 40×40 icon-button standardization, and the Continue-Reading/search/menu visual clustering via `order-*` were all direct, explicit user requests during live iteration — not judgment calls.
- User confirmed this nav is a checkpoint, not the final design ("we will work on it later but I like what we have now") — shipped as-is on that basis.
- E2E settings-sheet test fix (post-ship, same PR): added the missing `mobile`-project branch to open `NavOverflowMenu` before clicking Settings, mirroring the search test's existing pattern. Baseline PNGs are out of scope for this fix — regenerated only via the `workflow_dispatch` CI job per DECISIONS.md, triggered by the user after this fix merges, not by this task.
