# Mobile Navigation UX

**Type:** feature  
**Date:** 2026-07-01  
**Status:** implemented

## Summary

The Quran reading page has three mobile UX problems: the sidebar toggler is a floating pill fixed at `top-1/2 start-0` (visually intrusive during reading), the inline SearchBar is too wide for mobile nav, and the UserMenu "Account" text button consumes too much horizontal space. This plan moves the sidebar trigger into the navbar, replaces the inline search with an icon-triggered fullscreen overlay, and folds the UserMenu into the Settings sheet on mobile. Desktop layout is untouched.

## Root Cause / Approach

Nav and Sidebar live at different layout levels:
- `Nav` renders in `app/[locale]/layout.tsx` (global, above all routes)
- `Sidebar` renders in `app/[locale]/pages/layout.tsx` (pages-only nested layout)

They cannot share state via props. Solution: a `SidebarContext` provided at the locale layout level. Nav writes `open`; Sidebar reads it. Nav additionally uses `usePathname()` to suppress the sidebar trigger on non-pages routes.

Mobile nav target layout (< md):
```
[≡ Sidebar]  ✦ furqan ✦  [🔍 Search] [⚙ Settings]
```
Desktop layout (≥ md): unchanged from current.

## Files to Change

### NEW: `app/contexts/SidebarContext.tsx`
- Client context with `open: boolean`, `setOpen: (v: boolean) => void`
- Export `SidebarProvider` (wraps children, holds `useState`) and `useSidebar` hook

### `app/[locale]/layout.tsx`
- Import `SidebarProvider`
- Wrap `<Nav />` and `{children}` inside `<SidebarProvider>`

### `app/components/nav/Sidebar.tsx`
- Remove the `<SheetTrigger>` button entirely (the `fixed top-1/2 start-0 -translate-y-1/2` button)
- Import `useSidebar` from context
- Make the `<Sheet>` a controlled component: `open={open} onOpenChange={setOpen}`
- `<SheetTrigger>` can be removed from the JSX tree entirely; the Sheet is triggered externally via context

### `app/components/nav/Nav.tsx`
- Mark `"use client"` (already is)
- Import `usePathname` from `next/navigation`
- Import `useSidebar` from context
- **Mobile layout** (`md:hidden` nav, or a mobile-only slot on the start side):
  - Start side: sidebar trigger button using `PanelLeftOpen` icon — only rendered when `pathname` includes `/pages/`; calls `setOpen(true)` from context
  - Center: `FurqanLogo`
  - End side: search icon button (🔍) + `SettingsSidebar` icon; hide `UserMenu` on mobile (`hidden md:flex` on UserMenu)
- **Desktop layout** (`hidden md:flex` or existing structure): current layout unchanged — inline `SearchBar`, visible `UserMenu`, `SettingsSidebar`
- The search icon button on mobile opens the mobile search Sheet (state lives in `SearchBar` or a new `MobileSearchTrigger` wrapper — see SearchBar section)

### `app/components/search/SearchBar.tsx`
- **Desktop** (keeps current behavior): `hidden md:block` wrapper around the existing input + dropdown
- **Mobile** (`md:hidden`): a `Search` icon button that toggles `mobileOpen` state
  - When `mobileOpen = true`: render a `<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>` with `side="top"` and full-height
  - Sheet content: a row with back-arrow (`ArrowLeft`) close button + `Input` with `autoFocus` + the existing `SearchQueryResults` dropdown (now fills the Sheet body, not an absolutely-positioned dropdown)
  - On result click, `SearchQueryResults` already calls `setIsOpen(false)` — also call `setMobileOpen(false)` by passing a combined close handler
- Export the mobile trigger element so `Nav` can place it in the correct nav slot — OR keep the search icon inside SearchBar and render `<SearchBar />` in both mobile and desktop nav slots (simplest: single `<SearchBar />` component handles both modes internally)

### `app/components/SettingsSidebar.tsx`
- Import `useSession` from `next-auth/react` and `signIn`, `signOut`
- Add a User section at the **top** of `<SheetContent>`, visible only on mobile (`md:hidden`):
  ```
  if session: show user name + "Sign out" button
  if no session: show "Sign in" button
  ```
- Uses the same `bg-muted` + `rounded-lg` card style already used for Language/Font/Theme sections

## Edge Cases and Decisions

- **RTL compatibility**: sidebar trigger in Nav uses `start-0` / `ps-` spacing (mirrors correctly in RTL). `PanelLeftOpen` on RTL should rotate 180° — reuse the same `isRTL ? rotate-180 : ""` logic already in `Sidebar.tsx`.
- **Sidebar on non-pages routes**: `usePathname().includes('/pages/')` gates the sidebar trigger. If user is on homepage (`/ar` or `/en`), the trigger is hidden.
- **Mobile search Sheet dismiss**: the `SearchQueryResults` component's `setIsOpen` prop closes the desktop dropdown; on mobile it also needs to close the Sheet. Pass a unified `close` callback from SearchBar that sets both `isOpen` and `mobileOpen` to false.
- **Sheet stacking**: Sidebar Sheet and Settings Sheet are separate shadcn Sheet instances — no z-index conflict. Mobile search Sheet (`side="top"`) is a third separate instance. All three can coexist via Radix portals.
- **`usePathname` on static pages**: pages are statically generated but `Nav` is a client component — `usePathname` works correctly after hydration with no SSR mismatch.

## Constraints

- Do not change the desktop nav layout — only add `md:hidden` / `hidden md:flex` guards.
- Do not render the sidebar trigger in Nav on non-pages routes.
- Use `start`/`end` Tailwind variants throughout, never `left`/`right`.
- No new icon libraries — Lucide only.
- Do not add a new Sheet to Nav — the sidebar Sheet lives in `Sidebar.tsx`, the search Sheet lives in `SearchBar.tsx`, the settings Sheet lives in `SettingsSidebar.tsx`.
- The `SidebarProvider` must wrap both `<Nav>` and `{children}` in locale layout so both can read the context.
- Do not break the `next/dynamic` deferred loading of Sidebar — keep the dynamic import in `pages/layout.tsx`.

## What NOT to Do

- Do not create a separate "MobileMenu" component that duplicates the Sidebar content — the existing Sidebar Sheet IS the mobile menu for navigation.
- Do not move Sidebar to the root locale layout — keep it in pages layout where its data is fetched.
- Do not add a UserMenu icon to the mobile nav — the UserMenu folds into the Settings sheet.
- Do not add a bottom navigation bar — the existing sheet/drawer pattern is sufficient.

---

## Addendum: Account Card Mobile Layout Fix

**Date:** 2026-07-02
**Status:** implemented

### Bug

On narrow viewports the mobile-only Account card in `SettingsSidebar.tsx` (added above) renders name + email + "Sign out" as a single flex row (`flex items-center justify-between gap-3`). The name/email `<div className="min-w-0">` has no `flex-1`, so under flex-shrink math its larger natural content width (driven by the email string) causes it to shrink far more aggressively in absolute px than the "Sign out" button, which stays fully readable. Result: name/email truncate to near-nothing (e.g. `tah...`) while the button keeps its full label.

### Root Cause

Default flex-shrink behavior distributes shrinkage proportional to each item's base (content) size. Without `flex-1` forcing the text column to claim remaining space deterministically, the shrink math crushes it disproportionately whenever the row is width-constrained (small phones, or the Sheet's `w-3/4` mobile width).

### Decision: keep Sheet width as-is

The Sheet's `w-3/4 sm:max-w-sm` default (`components/ui/sheet.tsx`) is not being changed. It currently only affects `SettingsSidebar` (Sidebar overrides to `w-64`, SearchBar's mobile sheet uses `side="top"`). The translucent overlay (`bg-black/80`) over the uncovered 25% showing other nav UI faintly through it is accepted, not a bug to fix here.

### Fix: stack the account card vertically on mobile

In `app/components/SettingsSidebar.tsx`, restructure the signed-in account card (currently `flex items-center justify-between gap-3`) to stack:
- Row 1: name (`truncate`) + email (`truncate`), full width, no competing sibling
- Row 2 (below, on its own line): "Sign out" button

This removes the flex-shrink contention entirely — the text row gets the full card width to truncate against, and the button is no longer squeezed by an oversized sibling.

The signed-out state (`Sign in` button only) is unaffected — no shrink contention there.

### Files to Change

- `app/components/SettingsSidebar.tsx` — change the signed-in branch of the Account card from a single flex row to two stacked rows (name/email block on top, Sign out button below, e.g. `flex-shrink-0` button no longer needs `justify-between` parent — parent becomes `flex flex-col gap-2`)

### Constraints

- Do not change `components/ui/sheet.tsx` width defaults.
- Do not change the signed-out ("Sign in") branch — it has no layout issue.
- Keep the existing `bg-muted` + `rounded-lg` card styling and `text-xs`/`text-sm` type scale.
- Use `start`/`end` alignment (not `left`/`right`) for the Sign out button positioning, consistent with RTL conventions used elsewhere in this file.

---

## Addendum 2: ThemeToggle Overflow on Mobile

**Date:** 2026-07-02
**Status:** implemented

### Bug

`app/components/ThemeToggle.tsx` renders 3 buttons (Light/Dark/Gold), each `flex-1` with an icon + text label. shadcn's `Button` has no `min-w-0` and label text is `nowrap` by default, so each button's minimum width is its full unwrapped content size. On mobile (inside the `w-3/4` Settings sheet), the sum of the 3 buttons' minimum widths exceeds the available card width. `flex-1` (flex-basis: 0%) still can't shrink a flex item below its content's min-width unless `min-w-0` is set, so the row overflows its container instead of compressing — the third button (Gold) gets pushed outside the visible sheet area entirely.

### Fix: icon-only on mobile, icon+label from `sm:` up

- Wrap each button's label `<span>` in `hidden sm:inline` (or equivalent) so only the `Icon` renders on mobile.
- Add `aria-label={t(labelKey, labelFallback)}` to each `Button` so the icon-only mobile state stays accessible.
- Keep `flex-1 gap-1.5` on the buttons; with no label text pulling min-width, 3 icon-only buttons fit comfortably in the row.

### Files to Change

- `app/components/ThemeToggle.tsx` — hide label text below `sm:`, add `aria-label` for accessibility when label is hidden.

### Constraints

- Do not remove the text label on desktop/tablet (`sm:` and up) — only mobile goes icon-only.
- Do not change the 3-theme set or button order.
- Icon size (`size-4`) stays the same across breakpoints.

---

## Addendum 3: Sidebar Trigger Missing on Desktop (regression)

**Date:** 2026-07-02
**Status:** implemented

### Bug

The original `Sidebar.tsx` had a `SheetTrigger` styled as a fixed floating pill (`fixed top-1/2 start-0 -translate-y-1/2`), visible at **all** screen sizes, with no `md:hidden` guard. This plan's original design (see top of this file) removed that trigger entirely and moved it into `Nav.tsx` — but the replacement trigger in `Nav.tsx` has `className="md:hidden"`. The plan's own note "Desktop layout (≥ md): unchanged from current" was wrong: it didn't account for the floating pill being the *only* desktop trigger. Result: on `md:` and above, there is now no way to open the surah/rub sidebar at all.

### Fix

In `app/components/nav/Nav.tsx`, remove `md:hidden` from the sidebar trigger `Button` so it renders at all breakpoints (still gated by `isOnPagesRoute`). It stays in the Nav's start slot next to the logo — this slot already renders correctly at desktop width, it just needs to not be hidden.

### Files to Change

- `app/components/nav/Nav.tsx` — remove `md:hidden` from the sidebar trigger button's className (keep the `isOnPagesRoute` conditional).

### Constraints

- Do not restore the old floating-pill trigger in `Sidebar.tsx` — the Nav-based trigger + `SidebarContext` architecture stays.
- Do not add a second/duplicate trigger — one trigger in Nav, visible at all breakpoints, on pages routes only.

---

## Addendum 4: Code Review Fixes (/review-fq-work findings)

**Date:** 2026-07-02
**Status:** implemented (verified)

### Findings addressed

1. **`Nav.tsx` route matching too broad** — `isOnPagesRoute = pathname?.includes("/pages")` matches any path containing the substring `/pages` (e.g. a hypothetical `/ar/pages-list`), not just the intended `/pages/` route tree. The plan itself specified `.includes('/pages/')` with a trailing slash; the implementation dropped it. **Fix:** add the trailing slash back.
2. **`SearchBar.tsx` duplicated input change logic** — desktop and mobile-sheet `<Input>` both inline the same `setQuery` + `setIsOpen(length > 0)` pair. **Fix:** extract a single `handleQueryChange(value: string)` function, used by both `onChange` handlers. Container/wrapper markup stays separate (different layouts), only the change logic is shared.
3. **`Nav.tsx` duplicated RTL icon branch** — rendering two near-identical `<PanelLeftOpen>` elements for RTL/LTR instead of one icon with a conditional className; also re-duplicates rotation logic removed from `Sidebar.tsx` in this same plan. **Fix:** collapse to one icon, `className={cn("size-5", isRTL && "rotate-180")}`.
4. **`SettingsSidebar.tsx` account UI duplicated from `UserMenu.tsx`** — both components independently call `useSession`/`signIn`/`signOut` and hand-roll their own sign-in/out markup, so auth presentation logic is split across two files with no shared unit. **Fix:** extract the mobile account card (the `md:hidden` block in `SettingsSidebar.tsx`) into its own component, `app/components/nav/AccountCard.tsx`, colocated next to `UserMenu.tsx` as its mobile counterpart (not merged into `UserMenu` — the two have incompatible container semantics: `DropdownMenu` vs a static Sheet section). `SettingsSidebar` imports and renders it.
5. **`SearchBar.tsx` `closeAll` ignores its parameter** — `SearchQueryResults`'s `setIsOpen` prop is typed `(isOpen: boolean) => void`, but `closeAll` (passed as that prop on mobile) takes no parameter and unconditionally sets both `isOpen` and `mobileOpen` to `false`, silently not honoring the argument (in practice `SearchQueryResults` only ever calls it with `false`, so behavior is currently correct by coincidence). **Fix:** change `closeAll` to `(open: boolean) => { setIsOpen(open); setMobileOpen(open); }` so the contract is honored explicitly.

### Not fixed (by request)

- Stale search query flashing on mobile sheet reopen (query/results aren't cleared when the sheet closes) — left as-is.
- `SidebarContext`'s no-op default value swallowing a missing-`SidebarProvider` mistake — informational only, not a live bug (provider is correctly wired today).

### Files to Change

- `app/components/nav/Nav.tsx` — trailing slash fix, single conditional-className icon.
- `app/components/search/SearchBar.tsx` — shared `handleQueryChange`, fixed `closeAll` signature.
- `app/components/nav/AccountCard.tsx` — NEW, extracted from `SettingsSidebar.tsx`.
- `app/components/SettingsSidebar.tsx` — import and render `AccountCard` instead of inline markup.
- `docs/architecture/COMPONENTS.md` — add `AccountCard` entry.

### Constraints

- Do not change `UserMenu.tsx` — its desktop dropdown design is intentionally different from the mobile card.
- Do not clear search query/results on mobile sheet close (explicitly deferred).
- Do not add error-throwing to `SidebarContext`'s default value (explicitly deferred).
