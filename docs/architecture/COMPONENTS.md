# Component Hierarchy

Lightweight inventory of all app components. One line per component. Not a props/data-flow doc.

**Before modifying a shared component, check this file to understand all callers.**  
**After adding, removing, or reorganising components in any task, update this file.**

Last updated: 2026-06-30

---

## Zone: nav

```
Nav                          — top bar, always visible
  FurqanLogo                 — brand mark (SVG, links to home)
  SearchBar                  — Quran word/verse search trigger
  SettingsSidebar            — font scale + theme controls panel (Sheet)
    QuranFontScaleControls   — 1–10 scale slider, reads/writes QuranFontScaleContext
    ThemeToggle              — cycles named themes
    LanguageToggle           — ar ↔ en locale switch
  UserMenu                   — sign in / account dropdown
  Sidebar                    — surah/rub navigation panel (Sheet, lazy-loaded via next/dynamic)
    SurahList                — grid of surah cards [SHARED — also used on home page]
      SurahListItem          — single surah card
    RubList                  — list of rub markers
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
QueryProvider                — React Query client provider (wraps everything)
SessionProvider              — NextAuth session provider
```
