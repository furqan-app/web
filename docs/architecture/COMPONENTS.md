# Component Hierarchy

Lightweight inventory of all app components. One line per component. Not a props/data-flow doc.

**Before modifying a shared component, check this file to understand all callers.**  
**After adding, removing, or reorganising components in any task, update this file.**

Last updated: 2026-07-27

---

## Zone: nav

```
Nav                          — top bar, always visible; responsive (mobile/desktop layouts)
  FurqanLogo                 — brand mark (SVG, links to home)
  SearchBar                  — desktop: inline search input + dropdown; mobile: icon → full-screen Sheet overlay
    SearchQueryResults       — results dropdown (desktop) / full-height list (mobile Sheet); links use useReaderBasePath (grant-aware)
  SharedMushafLink           — always-visible link to /mushaf hub (signed in or out); icon+label on desktop, icon-only on mobile
  MarksLink                  — always-visible link to /marks (self marks list); icon+label on desktop, icon-only on mobile; mirrors SharedMushafLink
  PlansLink                  — always-visible link to /plans (daily awrad & learning plans hub); icon+label on desktop, icon-only on mobile; mirrors MarksLink
  SettingsSidebar            — font scale + theme + tajweed mode + account + offline access panel (Sheet); account section shown on mobile only
    QuranFontScaleControls   — 1–10 scale slider, reads/writes QuranFontScaleContext
    ThemeToggle              — cycles named themes
    (Tajweed Colors section) — shadcn Switch, reads/writes QuranTajweedContext (ADR 0023)
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
  ReaderPage                 — thin async SSR entry (ADR 0028) shared by both routes (self = statically generated, grant = dynamic); takes basePath + optional grantId/viewingOwnerName. Fetches ONLY the current pair's words (getPageWords ×2, SEQUENTIAL per ADR 0013) and hands off to <ReaderPager>. The old 3-panel (was 5) carousel + buildPanel is gone; every subsequent page change is client-side in the pager (no router.push, no per-swipe remount)
    ReaderPager              — "use client" persistent pager (ADR 0028), mounts once and never remounts. Holds `anchor` page state; renders a keyed 3-panel window [nextAnchor][anchor][prevAnchor] resting at translateX(-100%) so a drag reveals the real prefetched neighbor. Seeds the SSR pair into React Query; fetches/prefetches neighbor content JSON (public/quran/pages/{n}.json via usePage) on demand. commitTo swaps `anchor` and re-centers atomically with flushSync (one paint — no recenter flash, see fix-safha-swipe-flicker); animateCommit slides then commits; URL synced via history.replaceState (NOT router.push, so usePathname does NOT update — recitation follow must not read pathname). Owns ALL in-reader navigation: swipe, in-spread arrows (QuranSpread.onNavigate intercepts plain clicks; modified/middle clicks fall through to hrefs for SSR/no-JS), physical ArrowLeft/ArrowRight keys (a window keydown effect calling animateCommit directly — ArrowLeft always forward/nextAnchor, ArrowRight always backward/prevAnchor, locale-independent; skipped when a text input/contenteditable has focus, a modifier key is held, or isCommitting is true; see docs/plans/arrow-controls-desktop.md), and recitation follow (followTo). Strip onClick toggles NavOverlayContext; reads QuranSafhaViewContext + useIsLgUp to size the window unit (single page vs pair). Computes two id sets and passes both to FontFaceInjector: `allPageIds` (pair-expanded, for tajweed's CSS-only keyed styles) and `baseFontIds` (`allPageIds` only when `isDouble`, else just the single window ids — the eager FontFace registry, unlike CSS `@font-face`, downloads regardless of render state, so it must never include an invisible spread partner; ADR 0029's Addendum). Renders FontFaceInjector + RecitationPageSync + RecitationFollow + a <link rel="preload"> for the current page's WOFF2 + the panel strip
      Panel                  — memo'd: one full-width QuranSpread for an `anchor`, client-fetching its pair via usePage; keyed by anchor so on commit React MOVES the revealed neighbor's DOM into the center slot instead of re-rendering it (the no-flicker recenter — requires a stable onNavigate). Blank placeholder until its (prefetched) data arrives
    FontFaceInjector           — "use client" leaf, takes two id-list props: `pageIds` (pair-expanded, drives tajweed's keyed `<style>` LRU) and `baseFontIds` (visibility-scoped, drives the immutable page-font-registry — app/utils/page-font-registry.ts, ensurePageFonts; ADR 0029). Never mutates a live `<style>` (a live stylesheet mutation resets every already-loaded FontFace in it to `unloaded`, blanking visible text — the root cause of the swipe-commit flicker). Tracks two independent rolling LRUs (MAX_KEPT=24 each, one per prop, via a shared `useLruIds` hook backed by `useState`, not a ref — the LRU list must never be mutated outside React's render contract) since the two lists can diverge — e.g. a single-page-view session keeps a page's tajweed style mounted (pair-expanded, cheap CSS) while excluding its spread partner from the eager base-font registry (ADR 0029's Addendum). Client component to avoid RSC resource-hoisting hydration mismatches (ADR 0020). Reads QuranTajweedContext itself — only when tajweedMode is true, renders one immutable keyed `<style key={id}>` per page id (COLRv1 tajweed @font-face at /fonts/v4/colrv1/woff2/pN.woff2 + @font-palette-values light/dark/gold blocks, ADR 0023) — React mounts/unmounts whole elements on LRU change rather than rewriting a shared sheet. --Light and --Gold palettes remap brand colors per CPAL slot (Addendum 13); --Dark retains base palette 1 without overrides pending dark-theme color review
    page-font-registry.ts     — client-only util (app/utils/page-font-registry.ts): the immutable FontFace registry behind ADR 0029. `ensurePageFonts(ids)` creates `new FontFace('quran-p{id}', ...) → document.fonts.add → face.load()` for each unregistered id and never modifies a face after creation; a shared module-level LRU (cap 24) evicts via `document.fonts.delete(face)` on the single oldest face only. Called only from FontFaceInjector's `baseFontIds` effect (both mobile and desktop/tablet funnel through this one call site) — never call `.load()`/`ensurePageFonts` for an id that isn't confirmed visible, since unlike CSS `@font-face` it downloads eagerly regardless of render state.
    RecitationPageSync         — "use client" null leaf: syncs the current page's firstVerseKey into RecitationContext.pageFirstVerseKey, and its plain page number into RecitationContext.currentPageNumber, via useEffect; bridges both to RecitationPlayerBar's play button and RecitationSettingsSheet's "custom" range picker (neither can receive props from the pager)
    ReaderPageSync             — "use client" null leaf: publishes the pager's visible page(s) into ReaderPageContext.visiblePages via useEffect (pair-expanded when isDouble, mirrors RecitationFollow's expansion), clearing on unmount; lets PlansWidget compare a track's assigned page range against what's actually on screen
    RecitationFollow           — "use client" null leaf (ADR 0028): the ONLY reader piece that subscribes to RecitationContext's per-word state — isolated here so ReaderPager never re-renders on a recited-word tick (that caused per-word flicker + repeated font re-fetch). Watches recitedPage while status==="playing"; when the recited page leaves the visible window it calls the pager's followTo, DEFERRED via queueMicrotask so it runs after commitTo's flushSync unwinds (an inline commit would be guarded-out mid-flush and never retry). Effect: playback keeps the recited page on screen — swiping away snaps back to it
    QuranSafhaViewToggle      — client pill (lg+ only): single/double icon buttons, reads/writes QuranSafhaViewContext. Rendered from SettingsSidebar, not the reader entry
    QuranSpread              — client (rendered by Panel): houses the two-page layout; receives onNavigate from the pager and wires it into its NavigationArrow pair — a plain arrow click calls onNavigate (pager-driven, no route change), while modified/middle clicks fall through to the href. Owns the shared NavigationArrow pair (single-step or pair-step hrefs, `relative z-20` so it always stacks above QuranSafha's absolutely-positioned decoration layers), renders two QuranSafha instances (right=odd/leftPage=even) with gap-0 between them on a static `.fq-spread` row. The single-vs-double DISPLAY is CSS-driven, not JS: it marks the non-current card `.fq-safha-partner`, and globals.css (keyed on `html[data-safha-view="double"] .fq-spread` at lg) reveals the partner + applies the width cap + drops the compensate margin — correct at first paint pre-hydration (ADR 0013 Addendum 4). `useIsLgUp`+view survive ONLY to pick the arrow href (pair-step vs single-step)
      QuranSafha               — client shell: handles word selection, mark state, scroll; accepts grantId (undefined = own mushaf); reads QuranTajweedContext — when on, sets the container fontFamily to the COLRv1 tajweed variant (getPageFontFamily(page, true)) and adds the `.fq-tajweed` marker class (selects the themed @font-palette-values rule in globals.css, ADR 0023); no decorative frame — plain bg-card + shadow, square corners; 2 offset "stacked pages" layers behind it (md+, bg-card dark:bg-muted fill — white in light/gold, existing muted fill in dark — + thin border-muted-foreground/30 edge for real contrast in every theme, small offset, pointer-events-none so they never intercept clicks); stackPeekSide prop ("left"/"right", default "left") controls which side the stack peeks toward and doubles as a left-page/right-page indicator even in single-page view (always static per pair position, not spread-state-dependent); compensateStackGap prop (default false) tags the card `.fq-compensate-l`/`.fq-compensate-r`; globals.css then reserves a physical 9px margin on the SAME side as stackPeekSide (for the stack's ~9px protrusion) at md+ and removes it only when the spread actually shows both pages — so single-page display keeps both nav arrows equidistant. QuranSpread passes it for both cards; standalone QuranPage leaves it false (no `.fq-spread` ancestor → unaffected). Exposes `--fq-word-base`/`--fq-line-gap-base`/`--fq-heading-base` inline so the double-view width cap (the `html[data-safha-view="double"] .fq-spread` rule in globals.css, ADR 0013 Addenda 3–4) can shrink the reading font when two pages would overflow the viewport width. Computes `activeLines` = mushaf=19's line grouping (via `groupBy(words, w => w.layouts[19] ?? w.line_number)`, client-side) when `tajweedMode` is on, else the `lines` prop as-is (ADR 0023 Addendum 6) — the only component that re-groups; `getPageWords`/every other consumer still gets the single default `lines` grouping. Derives surah banner positions from `line_number` gaps in `activeLines`: missing slot numbers (1–15) are grouped into consecutive gap runs; each run is classified by looking at the first word after (start/mid gap) or last word before (end gap) — gap size + surah bismillah status determines whether to render SurahBannerLine, BismillahLine, or both. Renders SurahBannerLine / BismillahLine local helpers as direct children of .fq-quran-safha (so flex spacing counts them as real slots); passes suppressInlineHeaderForSurahId to the QuranLine immediately after each start/mid banner to prevent double-rendering of the inline combined heading block
        QuranLine              — one line of the page; accepts optional suppressInlineHeaderForSurahId prop — when set and matching the line's surah, suppresses the inline 2-slot glyph+bismillah block (QuranSafha has already rendered standalone slots for it); mid-page surahs (prop unset or non-matching) keep the existing inline block unchanged
          QuranWord            — single word; click triggers mark flow; registers its DOM node into RecitationContext (registerWordRef, keyed by word.location) so recitation word-level highlighting can classList-toggle it directly without React re-renders (ADR 0021); receives the spot's mark `category` (resolved by QuranLine: word `location` first, else verse `verse_key`) and applies the derived translucent highlight (ADR 0024/0025) — highlight only, the comment is not shown on the page; renders word.code_v2 instead of word.code_v1 when QuranTajweedContext's tajweedMode is on, pairing with the COLRv1 font QuranSafha applies (ADR 0023)
        MarkModal              — single mark dialog (ADR 0025): a category picker (MarkerColorPicker) + a comment textarea that stays dimmed/disabled until a category is chosen; one Save (category + optional comment) + one Remove (deletes the whole mark); one "Marked by {name}" line (a mark has a single author now); threads grantId to add/remove; "Play from here" button plays immediately at this word/verse's verse_key using stored/default settings (RecitationContext.play, no settings sheet — Addendum 6 of recitation-playback.md); word-case only, a compact speaker-icon control next to the title plays that single word's own pronunciation clip (Word.audio_url, prefixed via getWordAudioUrl) through its own independent <audio> element — distinct from "Play from here"; pauses active chapter recitation first if playing
          MarkerColorPicker    — category swatch grid (solid chips keyed by MARK_CATEGORIES)
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
  MyMarksList                — client: fetches the caller's marks page-by-page via useAllMarks (useInfiniteQuery, cursor-paginated, one query per active category); a controlled filter (default "All") over "All" + one entry per MARK_CATEGORIES, rendered responsively — a Radix DropdownMenu on mobile (`< md`, so 7 filters never overflow) and a wrapping pill-chip row on `md+`; switching the filter is a fresh paginated query (own cache — flipping back to a previously-viewed tab is instant); the loaded pages' marks are grouped by surah (mushaf order), full-width rows, each row's icon coloured by its own category (matters in All), comment previewed inline when present; each row links to /pages/[page] and has an inline remove button (deletePageMark, reused from delete-my-marks); an IntersectionObserver sentinel below the last row auto-loads the next page on scroll
  MarksSignedOutPrompt       — client: sign-in CTA when unauthenticated (own copy — not shared with mushaf/SignedOutPrompt)
```

## Zone: plans (`app/[locale]/plans/page.tsx`)

```
(page.tsx — server: header + session gate, self-plans only, no grant equivalent)
  MyPlansList                — client: the caller's enrollments (usePlans), grouped active-then-other; mounts PlansTodayHero above the list when any plan is active; each card shows template icon/label/status, a pause/resume/mark-completed/abandon menu (terminal statuses show no menu), active plans' today-assignments (useTodayAssignments) rendered via PlanAssignmentRow with check-off, and a collapsible PlanHistorySection (local helper, fetched on demand via usePlanHistory) showing the plan's progress log as a vertical timeline (most recent first); ends with AddPlanButton
  PlansTodayHero             — client: flattens every active plan's today-assignments into one row list via PlanAssignmentRow; swaps to a celebratory all-done state once every row is checked off; streak number + rolling 7-day week strip via usePlanStreak (derived, never persisted — see DECISIONS.md's Companion Redesign entry)
  PlanAssignmentRow          — client, shared with PlansWidget + PlansTodayHero: one track's assignment — icon + label + activity + page range (+ repetitions for lookahead tracks) + a circular ring check-off control (transparent+bordered when unchecked, solid primary + glow + checkmark when completed); the label/range portion links to /pages/{rangeStart} (jump to that page in the reader)
  AddPlanButton              — client: single dashed-border "new wird" entry point; opens PlansBrowseDialog
  PlansBrowseDialog          — client: consolidated enroll-or-edit dialog (shadcn Dialog) — a template list view (already-active templates show an edit affordance instead of enroll) drilling into daily-wird/listening-wird's single-step form or husun's two-step overview→settings flow; one enroll-or-edit slot per template per user
  PlanEnrollForm             — client: per-template editable pages/day field(s) (template defaults from PLAN_TEMPLATE_UI/PLAN_TRACK_UI) + for husun, a JuzRangeSlider; accepts an optional existingPlan prop to switch from enroll (usePlans().enroll) to edit (usePlans().updateParams), prefilling from the plan's current params
  JuzRangeSlider             — client: dual-handle 1–30 juz-range control wrapping components/ui/slider.tsx (@radix-ui/react-slider), RTL-aware via the primitive's own `dir` prop
  PlansSignedOutPrompt       — client: sign-in CTA when unauthenticated (own copy, mirrors MarksSignedOutPrompt)
```

## Zone: vertical reader (`app/[locale]/pages/vertical/page.tsx`)

```
(page)
  VerticalQuranPages         — virtualized infinite scroll (react-virtuoso)
    QuranPage                — renders one page worth of lines (also used standalone in reader zone)
```

## Zone: shared / UI primitives

```
components/ui/               — shadcn/ui primitives (button, command, dialog, dropdown-menu, input, popover, radio-group, sheet, slider, switch, tabs, textarea)
app/components/ui/FQModal    — project-specific modal wrapper around shadcn Dialog
RecitationPlayerBar          — client: fixed bottom bar mounted app-wide (app/[locale]/layout.tsx). On reader routes (self + grant) it's a permanent fixture, even idle — reads pageFirstVerseKey (kept current by RecitationPageSync) so its play button starts playback of the current Safha when idle, or toggles play/pause otherwise; settings gear always shown; stop (Square icon) shown only once a session is active/paused. Off the reader route it only shows during an active/paused session (background playback, ADR 0021), unchanged. On tablet/mobile reader routes it also reads NavOverlayContext and mirrors the nav's show/hide via the same translate + 300ms cubic-bezier transform (slides down instead of up) — background tap toggles both bars together, regardless of idle/active; on desktop reader routes it's always visible, no toggle, matching the nav's static behavior there
RecitationSettingsSheet      — client: mounted app-wide alongside RecitationPlayerBar; controlled Sheet (RecitationContext's isSettingsOpen), not a SheetTrigger — opened only from the player bar's gear icon (MarkModal's "Play from here" plays directly and no longer opens this sheet, Addendum 6 of recitation-playback.md); reciter picker is a searchable Popover+Command combobox (ReciterCombobox, local helper) — portals into the Sheet's own DOM node (captured via callback ref) rather than document.body, required to avoid Radix's Dialog/Popover focus-trap conflict, see DECISIONS.md; stop point is a 2-col icon-pill grid (page/rub/hizb/juz/surah/none/custom — "none" hides the whole-range repeat stepper, ADR 0021 Addendum 2026-07-16); selecting "custom" reveals CustomRangePicker (local helper) — a page-or-verse "to" point picker (numeric page input, or SurahCombobox + ayah input, local helpers), floored live against the current playing/viewed position (currentVerseKey/pageFirstVerseKey, recitedPage/currentPageNumber from RecitationContext) so an invalid range can't be entered, per docs/plans/recitation-playback.md Addendum 9; per-ayah + whole-range repeat steppers, playback speed, pause-between-repeats, each section icon-labeled via a shared SectionHeader helper; edits live/persisted settings, no separate "Play" CTA
PlansWidget                  — client: mounted app-wide (app/[locale]/layout.tsx) alongside RecitationPlayerBar; a circular floating trigger (an SVG progress ring — done/total fraction — around a solid primary circle showing the pending count), visible only on reader routes (self + grant) for signed-in users with ≥1 active plan (useTodayAssignments, session-gated). Tapping it opens a Sheet (side="bottom") listing every active plan's today-assignments via PlanAssignmentRow with check-off. The trigger gains a glow ring when any track's assigned page range is "in range" — read/memorize/review activities compare against ReaderPageContext.visiblePages, listen activities compare against RecitationContext.recitedPage while playback is active (idle falls back to visiblePages too) — a visual hint only, never an auto-check-off. Mirrors the nav overlay's show/hide exactly as RecitationPlayerBar does (same isOverlayMode/overlayVisible transform), positioned clear of that bar (bottom-20, end-4)
```

## Contexts

```
QuranFontScaleContext        — font scale (1–10), persisted to localStorage
QuranSafhaViewContext        — single/double page view mode, persisted to localStorage (default "double"); see ADR 0013
QuranTajweedContext          — Tajweed color-coded mode boolean, persisted to localStorage (default false); see ADR 0023
SidebarContext               — sidebar open/setOpen state; bridges Nav (locale layout) → Sidebar (pages layout)
NavOverlayContext            — tablet-only (md–lg-1) nav overlay state on /pages/ routes: overlayVisible, toggleOverlay (tap-to-toggle + 3s auto-hide), isOverlayMode; consumed by Nav (fixed+slide) and ReaderPager (strip onClick trigger)
ReaderPageContext            — the reader's currently-visible mushaf page(s) (visiblePages: number[] | null), published by ReaderPageSync (mounted in ReaderPager) and consumed by PlansWidget for its "in range" highlight; deliberately separate from RecitationContext (generic reader state, not recitation state)
RecitationContext            — recitation playback (ADR 0021, cross-chapter chaining added in Addendum 2026-07-16): owns the single <audio> element (mounted once, above the reader route tree so it survives page auto-advance and background playback), settings (reciter/stopPoint/repeat counts/speed/pause, persisted to localStorage), the timeupdate handler that drives both word-level highlighting (direct DOM ref registry, not React state — timeupdate fires ~4x/sec) and page auto-advance (router.push when the recited verse's page falls outside the currently-visible page set), and an `ended` handler that auto-loads the next chapter's audio when the resolved stopPoint (page/rub/hizb/juz/none, all of which may span a later chapter) hasn't been reached yet, or stops at 114:6/manual stop otherwise. Proxies QDC via app/utils/recitation-api.ts (app/api/quran/recitations/reciters, app/api/quran/recitations/[reciterId]/chapters/[chapterId], app/api/quran/chapters/[chapterId]/verse-pages) and hits the DB-only app/api/quran/verses/[verseKey]/stop-point (no QDC) to resolve page/rub/hizb/juz stop targets, plus app/api/quran/pages/[pageId]/bounds (no QDC) to resolve stopPoint "custom"'s page-type "to" target — see docs/architecture/adr/0021-recitation-playback.md. Also exposes `chapters` (the static public/quran/chapters.json surah list, fetched once) and `currentPageNumber` (kept current by RecitationPageSync alongside pageFirstVerseKey) — both feed RecitationSettingsSheet's "custom" range picker, per docs/plans/recitation-playback.md Addendum 9
QueryProvider                — React Query client provider (wraps everything)
SessionProvider              — NextAuth session provider
```
