# Component Hierarchy

Lightweight inventory of all app components. One line per component. Not a props/data-flow doc.

**Before modifying a shared component, check this file to understand all callers.**  
**After adding, removing, or reorganising components in any task, update this file.**

Last updated: 2026-07-10

---

## Zone: nav

```
Nav                          — top bar, always visible; responsive (mobile/desktop layouts)
  FurqanLogo                 — brand mark (SVG, links to home)
  SearchBar                  — desktop: inline search input + dropdown; mobile: icon → full-screen Sheet overlay
    SearchQueryResults       — results dropdown (desktop) / full-height list (mobile Sheet); links use useReaderBasePath (grant-aware)
  SharedMushafLink           — always-visible link to /mushaf hub (signed in or out); icon+label on desktop, icon-only on mobile
  MarksLink                  — always-visible link to /marks (self marks list); icon+label on desktop, icon-only on mobile; mirrors SharedMushafLink
  SettingsSidebar            — font scale + theme + account + offline access panel (Sheet); account section shown on mobile only
    QuranFontScaleControls   — 1–10 scale slider, reads/writes QuranFontScaleContext
    ThemeToggle              — cycles named themes
    LanguageToggle           — ar ↔ en locale switch
    AccountCard              — mobile-only sign in/out card (name+email+sign out, or sign in button); session via next-auth
    (Offline Access section) — installed-PWA-only; shows cached/604 progress via usePwaPrecache
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
  ReaderPage                 — SHARED server body for both routes; takes basePath + optional grantId; fetches pair pages (sequential — ADR 0013) at build time; delegates @font-face injection to FontFaceInjector (client component — ADR 0020); keeps <link rel="preload"> for current page; computes single-step (±1) and pair-step (±2) nav hrefs + plain page-order prevPageNum/nextPageNum for swipe; renders FontFaceInjector + QuranSafhaViewToggle + QuranSwipeNav + QuranSpread
    FontFaceInjector           — "use client" leaf: injects @font-face rules for pair page IDs via <style dangerouslySetInnerHTML>; must be a client component to avoid RSC resource-hoisting hydration mismatches (ADR 0020)
    QuranSafhaViewToggle      — client pill (lg+ only): single/double icon buttons, reads/writes QuranSafhaViewContext
    QuranSwipeNav            — "use client" wrapper: single-slot swipe animation + navigation; outer overflow-hidden div clips the inner stripRef div during drag; commits on release ≥ 80px (stripRef animates to translateX(±100%), then router.push after 220ms); snaps back to translateX(0) below threshold; prefers-reduced-motion respected; receives prevHref/nextHref (plain page-order hrefs, not locale-flipped) from ReaderPage; always steps one page even in double view
    QuranSpread              — client: houses the two-page layout; owns the shared NavigationArrow pair (single-step or pair-step hrefs, `relative z-20` so it always stacks above QuranSafha's absolutely-positioned decoration layers), renders two QuranSafha instances (right=odd/leftPage=even) with gap-0 between them on a static `.fq-spread` row. The single-vs-double DISPLAY is CSS-driven, not JS: it marks the non-current card `.fq-safha-partner`, and globals.css (keyed on `html[data-safha-view="double"] .fq-spread` at lg) reveals the partner + applies the width cap + drops the compensate margin — correct at first paint pre-hydration (ADR 0013 Addendum 4). `useIsLgUp`+view survive ONLY to pick the arrow href (pair-step vs single-step)
      QuranSafha               — client shell: handles word selection, mark state, scroll; accepts grantId (undefined = own mushaf); no decorative frame — plain bg-card + shadow, square corners; 2 offset "stacked pages" layers behind it (md+, bg-card dark:bg-muted fill — white in light/gold, existing muted fill in dark — + thin border-muted-foreground/30 edge for real contrast in every theme, small offset, pointer-events-none so they never intercept clicks); stackPeekSide prop ("left"/"right", default "left") controls which side the stack peeks toward and doubles as a left-page/right-page indicator even in single-page view (always static per pair position, not spread-state-dependent); compensateStackGap prop (default false) tags the card `.fq-compensate-l`/`.fq-compensate-r`; globals.css then reserves a physical 9px margin on the SAME side as stackPeekSide (for the stack's ~9px protrusion) at md+ and removes it only when the spread actually shows both pages — so single-page display keeps both nav arrows equidistant. QuranSpread passes it for both cards; standalone QuranPage leaves it false (no `.fq-spread` ancestor → unaffected). Exposes `--fq-word-base`/`--fq-line-gap-base`/`--fq-heading-base` inline so the double-view width cap (the `html[data-safha-view="double"] .fq-spread` rule in globals.css, ADR 0013 Addenda 3–4) can shrink the reading font when two pages would overflow the viewport width. Derives surah banner positions from `line_number` gaps in the `lines` prop: missing slot numbers (1–15) are grouped into consecutive gap runs; each run is classified by looking at the first word after (start/mid gap) or last word before (end gap) — gap size + surah bismillah status determines whether to render SurahBannerLine, BismillahLine, or both. Renders SurahBannerLine / BismillahLine local helpers as direct children of .fq-quran-safha (so flex spacing counts them as real slots); passes suppressInlineHeaderForSurahId to the QuranLine immediately after each start/mid banner to prevent double-rendering of the inline combined heading block
        QuranLine              — one line of the page; accepts optional suppressInlineHeaderForSurahId prop — when set and matching the line's surah, suppresses the inline 2-slot glyph+bismillah block (QuranSafha has already rendered standalone slots for it); mid-page surahs (prop unset or non-matching) keep the existing inline block unchanged
          QuranWord            — single word; click triggers mark flow
        MarkModal              — mark/highlight dialog; threads grantId to add/remove; shows "Marked by {name}" when mark author ≠ viewer
          MarkerColorPicker    — color swatch grid
        SignInModal            — shown instead of MarkModal when unauthenticated
        ViewingChip            — in-header viewing indicator (client), grant reader only; static flickering eye icon (not expandable), owner name via title/aria-label (generic label when name is null); rendered inline in the safha header start cell, gated on grantId (viewingOwnerName prop optional)
```

## Zone: shared mushaf (`app/[locale]/mushaf/`)

```
(page.tsx — server: header band + session gate; reads ?removed to show AccessRemovedBanner)
  AccessRemovedBanner        — client: dismissible amber warning-style notice, shown when redirected here after losing grant access (?removed=1); strips the param on dismiss (amber utilities + dark: variant — no --warning token exists)
  MushafHub                  — client orchestrator; uses useAccessGrants, passes reload down
    GenerateCodeCard         — generate one-time code + copy-to-clipboard (hero card w/ layered frame)
    RedeemCodeCard           — code input + redeem; calls onRedeemed to refresh lists
    AccessibleMushafList     — mushafs I can open (links to /mushaf/[grant]/pages/1)
    GrantedViewersList       — people who can access mine + inline-confirm revoke
    SectionCard              — shared card wrapper (icon + title + description; hero variant)
    PersonAvatar             — circular initial avatar
  SignedOutPrompt            — client: sign-in CTA when unauthenticated
  ([grant]/layout.tsx)       — server guard: no session → redirect home; revoked/foreign grant → redirect to hub ?removed=1; else renders Sidebar (viewing indicator lives in the safha header — see reader zone, ViewingChip)

app/not-found.tsx            — app-wide 404 (client), catches all unmatched URLs; themed via theme tokens + plain <a> full-load links (Home + Shared Mushaf) so navigation keeps CSS. Renders under the root layout (no Nav).
app/[locale]/error.tsx       — error boundary for the locale-nested tree (client); keeps Nav/theme/i18n mounted (nested under [locale]/layout.tsx, unlike not-found.tsx). Reports to Sentry via Sentry.captureException, themed like not-found.tsx, with a "try again" (reset()) + home link. See ADR 0017.
app/global-error.tsx         — last-resort error boundary for the root layout itself (client); replaces app/layout.tsx entirely, so it renders its own <html>/<body> with plain inline-safe CSS (no theme tokens/fonts/i18n available). Reports to Sentry. See ADR 0017.
```

## Zone: marks (`app/[locale]/marks/page.tsx`)

```
(page.tsx — server: header + session gate, self-marks only, no grant equivalent)
  MyMarksList                — client: fetches all of the caller's color marks via useAllMarks, groups into red/blue/green sections (mushaf order within each), each row links to /pages/[page] and has an inline remove button (deletePageMark, reused from delete-my-marks)
  MarksSignedOutPrompt       — client: sign-in CTA when unauthenticated (own copy — not shared with mushaf/SignedOutPrompt)
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
QuranSafhaViewContext        — single/double page view mode, persisted to localStorage (default "double"); see ADR 0013
SidebarContext               — sidebar open/setOpen state; bridges Nav (locale layout) → Sidebar (pages layout)
QueryProvider                — React Query client provider (wraps everything)
SessionProvider              — NextAuth session provider
```
