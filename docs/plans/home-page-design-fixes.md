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

## Addendum — Universal nav menu; sidebar toggle moves into Nav

**Date:** 2026-08-13 · **Status:** implemented · GitHub: [#279](https://github.com/furqan-app/web/issues/279) · Branch: `feature/279-universal-nav-menu`

### Summary

This is the "work on it later" follow-on flagged when `NavOverflowMenu` shipped mobile-only. Two changes: (1) `NavOverflowMenu` becomes universal — same hamburger, same 4 rows, at every breakpoint, not just `<md` — freeing horizontal space everywhere; (2) the surah sidebar toggler moves from its current floating pill (`app/components/nav/Sidebar.tsx`, `fixed start-4`, all breakpoints) into `Nav.tsx`'s row, left cluster, right after the logo.

### Root Cause / Approach

**Nav menu:** the mobile/desktop split (`hidden md:flex` around SharedMushafLink/NotificationBell+UserMenu/SettingsSidebar, `md:hidden` on the `NavOverflowMenu` trigger) is the only thing keeping the desktop/tablet row wide. Dropping both gates makes one code path serve every breakpoint — simpler than a second tablet-specific menu, and the /impeccable-recommended direction (Operate mode: consistency over expression for app chrome).

**Sidebar toggle:** `docs/architecture/DECISIONS.md`'s "Sidebar Trigger Architecture" entry already documents the intended design — trigger owned by `Nav`, visible at all breakpoints, gated by `pathname.includes("/pages/")` — replacing "an earlier design where Sidebar rendered its own always-visible floating-pill `SheetTrigger`". Commit `e231f77` (2026-08-12, `sidebar-surah-indicator.md`) silently reintroduced that exact floating pill (with the surah-name/chevron content from that plan) without updating the decision doc. This addendum restores the documented architecture — trigger content (current surah name/number + chevron, from `sidebar-surah-indicator.md`) moves into `Nav.tsx`, `Sidebar.tsx` drops the floating `Button` entirely.

### Decision Tree / Algorithm

**Nav row composition, all breakpoints (was: mobile-only collapse):**

| Item | Every breakpoint |
|---|---|
| Logo | visible |
| Sidebar toggle (new position) | visible only on pages routes (see gating table) |
| ContinueReadingLink | visible |
| SearchBar | visible |
| Fullscreen toggle | visible only when `isDesktopUp` (≥1367px) — unchanged, already gated |
| SharedMushafLink, NotificationBell, UserMenu, SettingsSidebar | **in `NavOverflowMenu` (hamburger)** — was desktop-direct, now menu-only everywhere |

**Sidebar toggle route gating (unchanged from today's floating pill / `sidebar-surah-indicator.md`):**

| Route | Toggle renders? |
|---|---|
| `/[locale]/pages/[id]` | Yes |
| `/[locale]/mushaf/[grant]/pages/[id]` | Yes |
| Any other route (home, marks, plans, mushaf hub, non-pages) | No |

Gate: `pathname?.includes("/pages/")` (trailing slash required — existing convention, avoids false-positive on a hypothetical `/pages-list`).

**Toggle content (unchanged from `sidebar-surah-indicator.md`, relocated only):**

| Condition | Trigger shows |
|---|---|
| `currentSurah` null (Sidebar not yet mounted/hydrated) | `PanelLeftOpen` icon fallback |
| `currentSurah` set, sidebar closed | `[number · name · ChevronDown]` |
| `currentSurah` set, sidebar open | `[number · name · ChevronUp]` |

**Search-overlay interaction (dropped, not carried over):** today's floating pill hides itself (`opacity:0`) while the mobile search Sheet (`z-[52]`, `h-screen`) is open, because it's a separate fixed element the full-screen sheet would otherwise render under/beside. Once the toggle is inline in `Nav`'s own DOM (`z-10`/`z-50` overlay), the full-screen search sheet (`z-[52]`) naturally paints over the whole nav row including the toggle — no manual hide needed. **Correction during implementation:** the plan assumed `searchOpen` "stays, still used elsewhere" — grepping the codebase at implementation time showed the floating trigger was its *only* consumer, so `SidebarContext.searchOpen`/`setSearchOpen` and their two `SearchBar.tsx` call sites were removed entirely as dead state, not kept.

**Nav-overlay sync (dropped, not carried over):** today's floating pill has its own `translateY`/opacity sync so it tracks the nav's tablet/mobile overlay show/hide independently (it's a sibling fixed element, not a Nav child). Once the toggle lives inside `Nav.tsx`'s row, it moves with the nav automatically as part of the same element — the standalone sync logic in `Sidebar.tsx` is dead code once removed from there.

### Files to Change

- `app/components/nav/Nav.tsx` — remove `hidden md:block`/`hidden md:flex` wrappers around SharedMushafLink/NotificationBell+UserMenu/SettingsSidebar (they no longer render directly in the row at any breakpoint — only inside the menu); remove `md:hidden` from `NavOverflowMenu`'s trigger (and its mobile-only `order-*` reorder, since the row is now breakpoint-uniform — confirm in-browser whether `order-*` is still needed for the search/continue-reading/menu clustering or can be dropped along with the mobile/desktop split). Add the sidebar-toggle trigger button (moved from `Sidebar.tsx`) in the left cluster, right after `FurqanLogo`: reads `open`, `setOpen`, `currentSurah` from `useSidebar()`; gated by `pathname?.includes("/pages/")`.
- `app/components/nav/Sidebar.tsx` — remove the floating `Button` (`fixed start-4 z-[51] mt-2 …`) entirely, including its `navBottom`/overlay-sync/`searchOpen`-hide logic. `Sheet`/`SheetContent` (the actual sliding panel) stays exactly as-is — only the trigger moves out.
- `app/components/nav/NavOverflowMenu.tsx` — drop `md:hidden` from the trigger `Button`'s className; drop the `order-*`/`md:order-none` passthrough if Nav.tsx's audit above finds it's no longer needed.
- `docs/architecture/DECISIONS.md` — "Sidebar Trigger Architecture": update the constraint bullet to note the trigger is restored to `Nav` after the `e231f77` drift, and that it now carries the surah/chevron content from `sidebar-surah-indicator.md` rather than the original `PanelLeftOpen` icon.
- `app/contexts/SidebarContext.tsx` — drop `searchOpen`/`setSearchOpen` (dead once the floating trigger's `searchOpen` read is removed — its only consumer).
- `app/components/search/SearchBar.tsx` — drop the two `setSearchOpen(...)` calls (writer of the now-removed context field).
- `e2e/tests/visual.spec.ts` — settings-sheet test opens the `NavOverflowMenu` trigger unconditionally (both `mobile` and `desktop` Playwright projects now), not gated by `testInfo.project.name === "mobile"`.
- `docs/architecture/COMPONENTS.md` — `Nav`/`NavOverflowMenu`/`Sidebar` entries updated to reflect the universal menu and the relocated trigger; `SharedMushafLink`/`NotificationBell`/`UserMenu`/`SettingsSidebar` re-nested as `NavOverflowMenu`'s children in the tree (they only render there now, at any breakpoint).

### Constraints

- Sidebar toggle route gating and content states are unchanged from `sidebar-surah-indicator.md` — only its DOM location moves (`Sidebar.tsx` → `Nav.tsx`).
- `Sidebar`'s `Sheet`/`SheetContent` (the actual panel, tabs, scroll-to-active logic) is untouched — this addendum only relocates the trigger button.
- Every item placed in `NavOverflowMenu` must keep rendering through `menuRowClassName` (existing constraint from the base plan, unchanged).
- Do not add a second/duplicate sidebar trigger — one trigger, in `Nav`, per the existing `DECISIONS.md` constraint.
- RTL: sidebar toggle sits in DOM/flex order right after the logo in both locales (mirrors how `FurqanLogo` already renders first in both LTR and RTL, per `mobile-nav-ux.md`); no `left`/`right`, only logical `start`/`end`.
- Fullscreen toggle keeps its existing `isDesktopUp` gate — not pulled into the menu, not made universal.

### What NOT to Do

- Do not build a second, tablet-specific overflow menu — one universal `NavOverflowMenu`, no breakpoint variants.
- Do not keep the floating-pill trigger in `Sidebar.tsx` as a fallback for any breakpoint — it is fully replaced by the in-`Nav` trigger.
- Do not change which routes the sidebar toggle is gated on — same `pathname.includes("/pages/")` convention as today.
- Do not touch `Sidebar.tsx`'s `Sheet` panel content (tabs, surah/rub lists, auto-scroll-to-active) — out of scope.
- Do not carry over the floating pill's standalone nav-overlay-sync transform or `searchOpen`-hide logic into `Nav.tsx` — both become redundant once the toggle is a `Nav` child (see Decision Tree).
- Do not move `SharedMushafLink`/`NotificationBell`/`UserMenu`/`SettingsSidebar` out of `NavOverflowMenu` for desktop — they stay menu-only at every breakpoint (that's the point of "universal").

### Decisions Made

- Direction chosen via `/impeccable` design consult (Operate mode: consistency/space-efficiency over per-breakpoint variation) — one universal menu, not a separate tablet/desktop menu. User confirmed.
- Sidebar toggle placement: left cluster, right after the logo (not next to the hamburger on the right) — it's primary wayfinding, not a secondary account/settings action. User confirmed.
- This addendum restores the `Nav`-owned trigger architecture `DECISIONS.md` already documents; the current floating-pill code is drift from `e231f77`, not an intentional divergence — treated as a bug being fixed, not a design being reversed.

### Post-ship polish (same branch, user live-review)

Four refinements after the user reviewed the shipped layout live — edited in place per this branch still being open, not stacked as a new addendum.

1. **Search centered on the row, not just visually offset.** `Nav.tsx`'s row is a single flat flex container (not the nested-cluster-div shape originally planned) — every top-level item (`FurqanLogo`, the sidebar toggle, `ContinueReadingLink`, two `flex-1` spacer divs, the search wrapper, the fullscreen button, `NavOverflowMenu`) is a direct child, positioned via `order`/`md:order-*`. Two equal `flex-1` spacer divs flank the search wrapper; because the leftover space splits evenly between them regardless of how wide the leading/trailing clusters are, the whitespace immediately flanking search stays equal on both sides — centering search purely on the full row's midpoint (the first attempt, a 3-column CSS grid) left a much bigger gap on whichever side had the narrower cluster.
2. **Mobile groups differently than desktop, same DOM/components.** Below `md`: logo alone on one side; sidebar toggle, continue reading, search, and the overflow menu grouped on the other side with equal gaps (the row's single `gap-2` applies uniformly since these are now flat siblings, not nested cluster divs). At `md`+: logo · toggle · continue reading · spacerA · search · spacerB · fullscreen · menu (item 1 above). No component renders twice — `order`/`md:order-*` per item reflows the same instances instead of duplicating stateful components (`SearchBar`, `NavOverflowMenu`) across two conditionally-rendered rows, which would have doubled their internal state/Sheets.
3. **`ContinueReadingLink`'s own padding was breaking the "equal gap" perception.** Even with (1)'s box-to-box CSS gap literally equal everywhere, the *visible* gap between the sidebar-toggle pill and `ContinueReadingLink`'s icon read wider (20px) than between the logo and the toggle (8px), because `ContinueReadingLink` carries its own `md:px-3` padding on top of the row's `gap-2` while the logo/toggle have no such inset. Fixed with `md:-ms-3` (logical, so it targets the correct physical side in both locales) — cancels only the *start*-side padding's layout footprint (padding still paints the hover background; the negative start margin stops that inset from also pushing the toggle away). The end side (facing the search spacer) is untouched — nothing to cancel there. Verified: icon-to-icon gap now 8px on both sides, in both locales.
4. **`UserMenu`'s dropdown, opened from inside `NavOverflowMenu`'s Sheet, was landing detached from its trigger** — floating near the sheet's own close button instead of under "Account" (Radix Popper positioning quirk against a trigger inside a still-animating bottom Sheet). Per the user's suggestion, replaced with an inline expand/collapse disclosure for the `menuRow` case only (My Marks / My Plans / Sign in-out render directly below the "Account" row, indented, when expanded) — no Popper, no portal, no `container` prop needed for this path. The non-`menuRow` dropdown-pill rendering is unchanged (currently unreachable — `UserMenu` is only ever invoked with `menuRow` — kept for API shape, not dead-code cleanup scope creep). Every submenu row (`My Marks`, `My Plans`, `Sign in`/`Sign out`) now takes an `onNavigate` callback wired to `NavOverflowMenu`'s `closeMenu`, mirroring `SharedMushafLink`'s existing pattern, so clicking any of them closes the sheet. `menuRowClassName` (shared by every row in the menu, not just `UserMenu`'s) gained `cursor-pointer` — Tailwind's preflight resets `<button>` cursor, so the plain-`<button>` rows (Settings, Sign in/out) had no hand cursor on hover even though the `<Link>` rows did by UA default.

**What NOT to do (added by this polish pass):** do not render `SearchBar`/`NavOverflowMenu`/other stateful nav children twice (once per breakpoint) to achieve different mobile/desktop grouping — use `order`/`md:order-*` on single instances, per (2) above. Do not reintroduce `UserMenu`'s `menuRow` case as a `DropdownMenu` — the Popper-in-an-animating-Sheet detachment bug is what (4) fixes; if this needs revisiting, stay on the inline-disclosure shape.

5. **Account back in the row on desktop, for one-click My Marks/My Plans access.** User's rationale: Marks and Plans are core product features (word-level marking, awrad habit tracking — PRODUCT.md), so burying them a menu-open-then-tap-Account-then-tap deep on desktop, where there's room, costs more than it saves. `Nav.tsx` now renders `UserMenu` bare (no `menuRow` — its original icon+"Account" dropdown-pill rendering) directly in the row, `hidden md:block`, `md:order-7` (between the search spacerB and the fullscreen toggle). Mobile is unchanged — `UserMenu` still renders only inside `NavOverflowMenu`, wrapped in a new `md:hidden` div there so it doesn't duplicate the row's copy at md+. This makes `UserMenu`'s non-`menuRow` `DropdownMenu` rendering live again (it had gone unreachable after item 4 above); `align="end"` positions correctly here because, unlike the `menuRow` case, this trigger isn't nested inside another modal's `Sheet` — no Popper-detachment risk, no `container` needed. Order renumbered: UserMenu(7) sits before fullscreen(8) and NavOverflowMenu(9) (was 8).

**What NOT to do (added by item 5):** do not add `container` to this `Nav`-row `UserMenu` instance's `DropdownMenuContent` — it isn't nested inside a `Sheet`/`Dialog`, so the default `document.body` portal is correct; adding one would be a no-op at best and risks re-triggering the FocusScope conflict this pattern exists to avoid elsewhere. Do not remove the mobile `menuRow` copy inside `NavOverflowMenu` — mobile still needs it, only md+ has the direct row alternative.
