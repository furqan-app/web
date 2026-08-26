# Mobile Navigation UX

**Type:** feature  
**Date:** 2026-07-01  
**Status:** implemented
**Issue:** [#431](https://github.com/furqan-app/web/issues/431)

## Summary

Three mobile UX problems on the reading page: the sidebar toggler is a floating pill at `top-1/2 start-0` (intrusive during reading), the inline SearchBar is too wide for mobile, and the UserMenu "Account" button wastes horizontal space. Fix: move the sidebar trigger into the navbar, replace inline search with an icon-triggered fullscreen overlay, fold UserMenu into the Settings sheet on mobile. Desktop layout untouched.

## Root Cause / Approach

Nav and Sidebar live at different layout levels (`app/[locale]/layout.tsx` vs `app/[locale]/pages/layout.tsx`) — they can't share state via props. Solution: `SidebarContext` at the locale layout level. Nav writes `open`; Sidebar reads it. Nav uses `usePathname()` to suppress the trigger on non-pages routes.

Mobile nav target (< md):
```
[Logo][≡ Sidebar]  ✦ furqan ✦  [🔍 Search] [⚙ Settings]
```
Desktop (≥ md): unchanged.

## Files to Change

### NEW: `app/contexts/SidebarContext.tsx`
Client context with `open: boolean`, `setOpen: (v: boolean) => void`. Export `SidebarProvider` and `useSidebar`.

### `app/[locale]/layout.tsx`
Wrap `<Nav />` and `{children}` in `<SidebarProvider>`.

### `app/components/nav/Sidebar.tsx`
Remove the `fixed top-1/2 start-0 -translate-y-1/2` `<SheetTrigger>` button. Make Sheet a controlled component (`open={open} onOpenChange={setOpen}`).

### `app/components/nav/Nav.tsx`
- `<FurqanLogo />` renders unconditionally as the first element of the leading `div`, before the sidebar trigger, in both LTR and RTL.
- Sidebar trigger `Button` (all breakpoints, gated by `isOnPagesRoute`): `pathname?.includes("/pages/")` with trailing slash (no trailing slash matches false positives like `/ar/pages-list`). One `PanelLeftOpen` icon, `className={cn("size-5", isRTL && "rotate-180")}` — no duplicate RTL/LTR branches.
- `UserMenu`: `hidden md:flex` (folds into Settings sheet on mobile).

### `app/components/search/SearchBar.tsx`
- Desktop (`hidden md:block`): current behavior.
- Mobile: `Search` icon toggles `mobileOpen`. When true, renders `<Sheet side="top">` with back-arrow close + auto-focus `Input` + `SearchQueryResults`.
- Single `handleQueryChange(value: string)` handler shared by both `<Input>` `onChange` props.
- `closeAll`: `(open: boolean) => { setIsOpen(open); setMobileOpen(open); }` — honors the parameter explicitly.

### `app/components/SettingsSidebar.tsx`
Mobile-only (`md:hidden`) Account section at top of `<SheetContent>`:
- Signed in: stacked (`flex flex-col gap-2`) — name + email block full width, "Sign out" below. Avoids flex-shrink contention that crushed text on narrow viewports.
- Signed out: "Sign in" button only.
Imports and renders `AccountCard`.

### NEW: `app/components/nav/AccountCard.tsx`
Extracted mobile account card, colocated with `UserMenu.tsx`. `SettingsSidebar` imports and renders it. (Not merged into `UserMenu` — incompatible container semantics: `DropdownMenu` vs Sheet section.)

### `app/components/ThemeToggle.tsx`
Hide label `<span>` below `sm:` (`hidden sm:inline`). Add `aria-label` per button for mobile accessibility. Icon size (`size-4`) unchanged.

### `docs/architecture/COMPONENTS.md`
Add `AccountCard` entry.

## Edge Cases and Decisions

- **RTL**: trigger uses `start-0`/`ps-` spacing; icon rotated via `isRTL && "rotate-180"`.
- **Non-pages routes**: trigger hidden when `pathname` doesn't include `/pages/` (trailing slash required).
- **Sheet stacking**: Sidebar, Settings, and mobile Search sheets are separate Radix portals — no z-index conflict.
- **Logo**: fixed in leading `div` both locales. RTL-edge repositioning was implemented then reverted by the user; `isRTL` is retained only for icon rotation.

## Constraints

- Desktop nav layout unchanged — only add `md:hidden` / `hidden md:flex` guards.
- Use `start`/`end` Tailwind variants throughout, never `left`/`right`.
- No new icon libraries — Lucide only.
- Keep `next/dynamic` deferred loading of Sidebar in `pages/layout.tsx`.
- Do not add a UserMenu icon to mobile nav or a bottom navigation bar.
- Do not move Sidebar to root locale layout.

---

## Addendum 1: Sleek Calligraphic Surah Selector Pill UI Polish (2026-08-26)

**Status:** implemented
**Issue:** [#431](https://github.com/furqan-app/web/issues/431)

### Summary
The mobile navbar Surah toggle button currently renders as a basic rectangular block with plain sans-serif Arabic typography. This addendum elevates the mobile button to a sleek, `rounded-full` pill using `--nav-tab-bg` with a subtle hairline border, calligraphic `font-surahnames` for Arabic/RTL, a refined numeral prefix, smooth rotating chevron indicator, and tactile press micro-motion (`active:scale-[0.97]`).

### Approach & Changes

1. **Sleek Pill Container (`Nav.tsx`)**
   - Refine the mobile button classes to use a `rounded-full` pill with `h-8 px-3 py-1 bg-[var(--nav-tab-bg)] border border-border/70 shadow-sm` and tactile press `active:scale-[0.97]`.
2. **Typography & Arabic Calligraphy**
   - In Arabic (`isRTL`): render `font-surahnames` glyph font at `text-[19px]` with zero-padded code `String(currentSurah.id).padStart(3, "0")`, paired with a subtle numeral prefix (`toLocaleNumeral(currentSurah.id, locale)`).
   - In English: clean `text-xs font-semibold` (`currentSurah.name_simple`).
3. **Animated Chevron Indicator**
   - Use `ChevronDown` with `transition-transform duration-200` and `open && "rotate-180"`, removing static icon switching.

### Files Changed
- `docs/plans/mobile-nav-ux.md` — this plan addendum.
- `app/components/nav/Nav.tsx` — mobile pill markup and styling.

### Verification Plan
1. `npm run lint` && `npm test`
2. Visual check in mobile viewport:
   - Arabic layout with `font-surahnames` calligraphic glyph.
   - English layout with clean typography.
   - Drawer toggle and chevron rotation.
