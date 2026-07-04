# Component Hierarchy

Lightweight inventory of all app components. One line per component. Not a props/data-flow doc.

**Before modifying a shared component, check this file to understand all callers.**  
**After adding, removing, or reorganising components in any task, update this file.**

Last updated: 2026-07-02

---

## Zone: nav

```
Nav                          — top bar, always visible; responsive (mobile/desktop layouts)
  FurqanLogo                 — brand mark (SVG, links to home)
  SearchBar                  — desktop: inline search input + dropdown; mobile: icon → full-screen Sheet overlay
    SearchQueryResults       — results dropdown (desktop) / full-height list (mobile Sheet)
  SettingsSidebar            — font scale + theme + account panel (Sheet); account section shown on mobile only
    QuranFontScaleControls   — 1–10 scale slider, reads/writes QuranFontScaleContext
    ThemeToggle              — cycles named themes
    LanguageToggle           — ar ↔ en locale switch
    AccountCard              — mobile-only sign in/out card (name+email+sign out, or sign in button); session via next-auth
  UserMenu                   — sign in / account dropdown (desktop only; AccountCard is its mobile counterpart in SettingsSidebar)
  Sidebar                    — surah/rub navigation panel (Sheet, lazy-loaded via next/dynamic); controlled via SidebarContext
    SurahList                — grid of surah cards [SHARED — also used on home page]
      SurahListItem          — single surah card
    RubList                  — rich rub list: sticky juz headers, SVG hizb-aware circle badge per row, Uthmanic text snippet, surah name + ayah, page number; accepts surahs prop for chapter name lookup; Eastern Arabic numerals in ar locale
```

## Zone: home (`app/[locale]/page.tsx`)

```
(page)
  SurahList                  — same component as Sidebar; receives full surah list, default grid layout
    SurahListItem
```

## Zone: reader (`app/[locale]/pages/[id]/page.tsx`)

```
(page — server component, statically generated)
  QuranSwipeNav              — thin "use client" wrapper: swipe-to-navigate touch handler (mobile only); receives prevHref/nextHref (plain page-order hrefs, not locale-flipped)
  QuranSafha                 — client shell: handles word selection, mark state, scroll
    QuranLine                — one line of the page
      QuranWord              — single word; click triggers mark flow
    MarkModal                — mark/highlight dialog (opens on word click, authenticated)
      MarkerColorPicker      — color swatch grid
    SignInModal              — shown instead of MarkModal when unauthenticated
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
