# Component Hierarchy

Lightweight inventory of all app components. One line per component. Not a props/data-flow doc.

**Before modifying a shared component, check this file to understand all callers.**  
**After adding, removing, or reorganising components in any task, update this file.**

Last updated: 2026-07-05

---

## Zone: nav

```
Nav                          — top bar, always visible; responsive (mobile/desktop layouts)
  FurqanLogo                 — brand mark (SVG, links to home)
  SearchBar                  — desktop: inline search input + dropdown; mobile: icon → full-screen Sheet overlay
    SearchQueryResults       — results dropdown (desktop) / full-height list (mobile Sheet); links use useReaderBasePath (grant-aware)
  SharedMushafLink           — always-visible link to /mushaf hub (signed in or out); icon+label on desktop, icon-only on mobile
  SettingsSidebar            — font scale + theme + account panel (Sheet); account section shown on mobile only
    QuranFontScaleControls   — 1–10 scale slider, reads/writes QuranFontScaleContext
    ThemeToggle              — cycles named themes
    LanguageToggle           — ar ↔ en locale switch
    AccountCard              — mobile-only sign in/out card (name+email+sign out, or sign in button); session via next-auth
  UserMenu                   — sign in / account dropdown (desktop only; AccountCard is its mobile counterpart in SettingsSidebar)
  Sidebar                    — surah/rub navigation panel (Sheet, lazy-loaded via next/dynamic); controlled via SidebarContext; also rendered by the grant reader layout
    SurahList                — grid of surah cards [SHARED — also used on home page]
      SurahListItem          — single surah card; link uses useReaderBasePath (grant-aware)
    RubList                  — rich rub list: sticky juz headers, SVG hizb-aware circle badge per row, Uthmanic text snippet, surah name + ayah, page number; accepts surahs prop for chapter name lookup; Eastern Arabic numerals in ar locale; links use useReaderBasePath (grant-aware)
```

## Zone: home (`app/[locale]/page.tsx`)

```
(page)
  SurahList                  — same component as Sidebar; receives full surah list, default grid layout
    SurahListItem
```

## Zone: reader (`app/[locale]/pages/[id]/page.tsx` + `app/[locale]/mushaf/[grant]/pages/[id]/page.tsx`)

```
(page — server component; self reader is statically generated, grant reader is dynamic)
  ReaderPage                 — SHARED server body for both routes; takes basePath + optional grantId; builds nav hrefs, font-face, QuranSwipeNav, QuranSafha
    QuranSwipeNav            — thin "use client" wrapper: swipe-to-navigate touch handler (mobile only); receives prevHref/nextHref (plain page-order hrefs, not locale-flipped)
    QuranSafha               — client shell: handles word selection, mark state, scroll; accepts grantId (undefined = own mushaf)
      QuranLine              — one line of the page
        QuranWord            — single word; click triggers mark flow
      MarkModal              — mark/highlight dialog; threads grantId to add/remove; shows "Marked by {name}" when mark author ≠ viewer
        MarkerColorPicker    — color swatch grid
      SignInModal            — shown instead of MarkModal when unauthenticated
      ViewingChip            — in-header viewing indicator (client), grant reader only; static flickering eye icon (not expandable), owner name via title/aria-label (generic label when name is null); rendered inline in the safha header start cell, gated on grantId (viewingOwnerName prop optional)
```

## Zone: shared mushaf (`app/[locale]/mushaf/`)

```
(page.tsx — server: header band + session gate)
  MushafHub                  — client orchestrator; uses useAccessGrants, passes reload down
    GenerateCodeCard         — generate one-time code + copy-to-clipboard (hero card w/ layered frame)
    RedeemCodeCard           — code input + redeem; calls onRedeemed to refresh lists
    AccessibleMushafList     — mushafs I can open (links to /mushaf/[grant]/pages/1)
    GrantedViewersList       — people who can access mine + inline-confirm revoke
    SectionCard              — shared card wrapper (icon + title + description; hero variant)
    PersonAvatar             — circular initial avatar
  SignedOutPrompt            — client: sign-in CTA when unauthenticated
  ([grant]/layout.tsx)       — server guard: verifies viewer, renders Sidebar (viewing indicator lives in the safha header — see reader zone, ViewingChip)
```

## Zone: vertical reader (`app/[locale]/pages/vertical/page.tsx`)

```
(page)
  VerticalQuranPages         — virtualized infinite scroll (react-virtuoso)
    QuranPage                — renders one page worth of lines (also used standalone in reader zone)
```

## Zone: shared / UI primitives

```
components/ui/               — shadcn/ui primitives (button, dialog, dropdown-menu, input, sheet, tabs)
app/components/ui/FQModal    — project-specific modal wrapper around shadcn Dialog
```

## Contexts

```
QuranFontScaleContext        — font scale (1–10), persisted to localStorage
SidebarContext               — sidebar open/setOpen state; bridges Nav (locale layout) → Sidebar (pages layout)
QueryProvider                — React Query client provider (wraps everything)
SessionProvider              — NextAuth session provider
```
