# Graph Report - furqan  (2026-08-12)

## Corpus Check
- 1675 files · ~2,630,708 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2276 nodes · 4059 edges · 227 communities (154 shown, 73 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b557f6de`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getQueryClient
- ADR 0028: Reader uses a persistent client pager over slim static content
- MyPlansList.tsx
- useTranslations
- config.ts
- engine.ts
- getNotificationDeps
- constants/plans.ts
- Tablet Nav Overlay Effect
- RecitationContext.tsx
- ReaderPager.tsx
- RubList.tsx
- QuranSafha.tsx
- useQuranMushaf
- ReaderPage.tsx
- Shared Mushaf Access
- toLocaleNumeral
- types/index.ts
- [locale]/layout.tsx
- registry.ts
- PlansWidget.tsx
- MyMarksList.tsx
- jsonResponse
- MarkModal.tsx
- RecitationSettingsSheet.tsx
- seed.js
- sw.ts
- MyMarksList.tsx client component
- auth-middleware.ts
- FontFaceInjector.tsx
- QuranMushafContext.tsx
- QuranWord.tsx
- notifications/types.ts
- QuranSafha
- Nav
- Daily Awrad UI
- reminders.ts
- response.ts
- actions/plans.ts
- Column-Font Contract
- isSearchQueryValid
- Split Quran Content and Application Data into Two Databases
- compilerOptions
- ReaderPager
- Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette
- Page Turn Blanks the Reader on Slow Networks
- QuranSpread.tsx
- start-task Load context gate
- Mobile Safha: Full-Screen Sizing
- Fix: Verse Rendering Outside the Quran Page
- Fix: Surah Banner Placement and Standalone Line Sizing
- Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle
- FqLogger
- deps.ts
- Font System (Immutable FontFace Registry)
- release workflow (/release)
- PlanAssignmentRow component
- scripts
- ReaderPager
- SettingsSidebar
- Adopt Prisma Migrations for furqan_app
- Base Notification System
- Mushaf Double-Page Spread Toggle
- RecitationContext.tsx
- plan-fq-task workflow
- Fix Hostinger Auto-Deploy Build Failures
- Fix Homepage CDN Cache Poisoning (Hostinger Edge)
- sentry/route.ts
- QuranSafha.tsx
- render-context.ts
- Tailwind Safelist for Dynamic Quran Font-Size Classes
- quranPrisma / appPrisma clients
- ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision)
- docs/architecture/DECISIONS.md
- /ship-fq-task skill
- Sidebar.tsx
- MyPlansList
- fq-logger: Structured Logging & Observability
- fq-reader-spread-container flex:1 + space-between fill
- ReaderPager.tsx (client persistent pager)
- ui-motion guidance
- Workflow Index
- ADR 0025: A mark is one row - category plus optional comment
- Furqan (Quran Memorization Tool)
- MushafHub
- PWA Conversion + Offline Quran Page Reading
- vh-derived vertical spacing formula (lineGapRatio 0.417)
- /release orchestrator skill
- Sentry Error Tracking
- ReaderPage.tsx
- AI-First Documentation & Workflow System
- Session Handoff — Dark Theme Mushaf Unification
- Fix dead tailwindcss-animate classes in dialog.tsx (plugin not installed)
- Fix: Hamza-Alif Mismatch in Verse Search
- i18n Setup (next-intl, ar/en locales)
- furqan_app Prisma migrations workflow
- ADR 0030: Plan engine - code-defined templates, typed scheduling rules, derived daily assignments
- Theme system (named CSS classes on html)
- ADR 0037: Notification dispatch via a channel registry, no queue/worker infra
- Arrow Controls on Desktop
- Mobile Navigation UX
- UI Workflow Enhancements
- Fix Desktop Search Dropdown Hidden by Reader Stacking Context
- Fix ViewingChip IntlError: missing {name} interpolation variable
- global-error.tsx
- Fix Marks Broken by Hardcoded localhost URL
- Sentry Error Tracking via DSN-Presence Gating
- Reader depth token family (--mushaf-rim-*, --reader-chrome-*)
- Design System Foundation
- Enhanced RubList Sidebar
- Fullscreen API desktop toggle (requestFullscreen/exitFullscreen)
- Protect prod Branch: Enforce Merges from release/* Only
- Release-Branch Deployment Workflow
- PageMetadata Prisma model
- ADR 0035: Bounded revalidate on statically generated document routes
- QuranPage
- animateCommit / ReaderPager keydown handling
- ADR 0022 Addendum — gh-pages visual diff report (referenced)
- Consolidate Suspense Boundaries in QuranLine/QuranSafha
- Shrink MarkModal & Hide Radio Dot
- Component Location table
- Memoization guidance
- Chapter.pages string format
- setRequestLocale() server usage
- System-wide Eastern Arabic Numerals for ar Locale
- Retrospect: Confirm Before Saving File
- Replace surah name text with sura_names.ttf glyph
- Fixes by Finding
- MyMarksList
- QueryProvider
- SessionProvider
- API Response Shape (jsonResponse envelope)
- i18n (next-intl, ar/en)
- API Error Handling policy
- Query Parameters via request.nextUrl.searchParams
- Path Aliases convention
- Border Radius tokens
- fq-logger/index.ts
- devDependencies
- components.json
- NotificationBell.tsx
- mujaz-stats.js
- AGENTS.md
- LastReadPageContext.tsx
- Sidebar Surah Indicator & Active Scroll
- visual.spec.ts
- dropdown-menu.tsx
- extract-translations.js
- /promote-to-staging
- /ui-motion
- Configure Project-Local Trello MCP for Codex
- Fix Navbar Icon Overflow on Mobile/Tablet
- Homepage Surah Card: Direction-Based Name Display
- Keep Mobile/Tablet Screen Active While App Is Open
- Save Last Read Page + Navbar Link to Resume
- dependencies
- /plan-fq-task
- Steps
- /review-fq-work
- /start-fq-task
- setup.js
- /ship-fq-task
- next.config.mjs
- generate-pwa-icons.js
- /cut-release <major|minor|patch>
- compress-fq-docs
- /release <major|minor|patch>
- ADR 0038: Reader size contracts are per-band, and tablet is always double-page
- extends
- register
- Furqan
- /confirm-dangerous-git
- /promote-release <version>
- /sync-main-from-prod
- package.json
- mujaz
- reader-shot.mjs
- @babel/parser
- class-variance-authority
- mujaz-statusline.sh
- commit-staged/SKILL.md
- cli-progress
- clsx
- cmdk
- dotenv-cli
- fs-extra
- lucide-react
- mysql2
- next
- next-auth
- next-intl
- nodemailer
- prisma
- @prisma/client
- @radix-ui/react-popover
- @radix-ui/react-radio-group
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- react
- react-dom
- react-virtuoso
- @sentry/nextjs
- serwist
- @serwist/next
- tailwind-merge
- @tanstack/react-query
- @types/nodemailer
- @types/web-push
- web-push
- @playwright/test
- postcss
- @svgr/webpack
- @types/react-dom
- typescript
- vitest
- playwright.config.ts
- postcss.config.mjs
- sentry.client.config.ts
- tailwind.config.ts
- GET
- POST
- Bismillah calligraphy SVG (decorative Arabic glyph: "Bismillah ir-Rahman ir-Raheem")
- Decorative surah banner frame graphic (surah-frame.svg)

## God Nodes (most connected - your core abstractions)
1. `useTranslations()` - 94 edges
2. `jsonResponse()` - 58 edges
3. `cn()` - 54 edges
4. `extractUser()` - 44 edges
5. `toLocaleNumeral()` - 30 edges
6. `scripts` - 26 edges
7. `getLogger()` - 23 edges
8. `getLanguageDirection()` - 22 edges
9. `FqLogger` - 21 edges
10. `getNotificationDeps()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `FilterDot()` --calls--> `cn()`  [EXTRACTED]
  app/components/marks/MyMarksList.tsx → lib/utils.ts
- `WeekStrip()` --calls--> `cn()`  [EXTRACTED]
  app/components/plans/PlansTodayHero.tsx → lib/utils.ts
- `CommandShortcut()` --calls--> `cn()`  [EXTRACTED]
  components/ui/command.tsx → lib/utils.ts
- `DropdownMenuShortcut()` --calls--> `cn()`  [EXTRACTED]
  components/ui/dropdown-menu.tsx → lib/utils.ts
- `SheetFooter()` --calls--> `cn()`  [EXTRACTED]
  components/ui/sheet.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Quran Page Font-Loading Pipeline** — docs_architecture_decisions_font_system, docs_architecture_adr_0005_quran_font_size_safelist_decision, docs_architecture_adr_0006_quran_font_size_minimum_floor_decision, docs_architecture_components_fontfaceinjector, docs_architecture_components_page_font_registry [INFERRED 0.85]
- **Quran/App Database Split Architecture** — docs_architecture_adr_0008_quran_app_database_split_decision, docs_architecture_adr_0009_reproducible_quran_seeder_decision, docs_architecture_adr_0010_prisma_no_explicit_datasource_url_decision, docs_architecture_adr_0017_prisma_migrations_app_db_decision [EXTRACTED 0.95]
- **Mushaf Page Sizing and Layout System** — docs_architecture_adr_0004_quran_safha_viewport_fit_decision, docs_architecture_adr_0011_mobile_quran_font_scale_vw_formula_decision, docs_architecture_adr_0013_mushaf_double_page_spread_decision, docs_architecture_components_quransafha [INFERRED 0.85]
- **Reader swipe/pager architecture evolution (sessionStorage swipe to 3-panel carousel to persistent pager)** — docs_architecture_adr_0019_swipe_direction_session_storage_decision, docs_architecture_adr_0027_tablet_swipe_carousel_decision, docs_architecture_adr_0028_reader_persistent_pager_decision [INFERRED 0.85]
- **Tajweed color glyph rendering system (COLRv1 fonts, per-edition layout, font registration)** — docs_architecture_adr_0023_tajweed_mushaf_mode_decision, docs_architecture_adr_0033_mushaf_edition_owns_word_placement_decision, docs_architecture_adr_0029_immutable_page_font_registration_decision [INFERRED 0.80]
- **Dark theme visual system (color semantics, surface depth, reader height/rhythm)** — docs_architecture_adr_0031_dark_theme_gold_emerald_semantics_decision, docs_architecture_adr_0032_dark_surface_depth_from_light_decision, docs_architecture_adr_0036_reader_fills_height_band_decision [INFERRED 0.75]
- **Base notification system, its Hostinger cron deployment, and governing ADR 0037 form the end-to-end notification feature** — docs_plans_base_notification_system_doc, docs_deployment_hostinger_notification_cron, docs_plans_base_notification_system_adr_0037 [INFERRED 0.85]
- **Three iterative reading-desk passes (desktop depth, light level/chrome, tablet band) jointly implement the dark-theme reader-page treatment** — docs_plans_dark_theme_mushaf_unification_reading_desk_pass1, docs_plans_dark_theme_mushaf_unification_reading_desk_pass2, docs_plans_dark_theme_mushaf_unification_reading_desk_pass3 [EXTRACTED 1.00]
- **Plan-engine foundation, its UI follow-up, and ADR 0030 jointly implement the awrad/learning-plans feature** — docs_plans_awrad_learning_plans_doc, docs_plans_daily_awrad_ui_doc, docs_plans_awrad_learning_plans_adr_0030 [EXTRACTED 1.00]
- **Reader loading-state / skeleton pattern shared across page-turn, panel-placeholder and font-loading fixes** — docs_plans_fix_page_turn_blank_slow_network_plan, docs_plans_fix_panel_placeholder_reflow_plan, docs_plans_fix_quran_page_font_loading_plan [INFERRED 0.85]
- **Prisma connection/transient-error resilience pattern across db.ts and auth callbacks** — docs_plans_fix_hostinger_build_plan, docs_plans_fix_dev_hmr_prisma_connections_plan, docs_plans_fix_nextauth_jwt_session_corruption_plan [INFERRED 0.75]
- **Hostinger multi-layer caching bugs: edge CDN, RSC responses, and service worker** — docs_plans_fix_homepage_cdn_cache_poisoning_plan, docs_plans_fix_rsc_cache_poisoning_plan, docs_plans_fix_sw_stale_cache_plan [INFERRED 0.80]
- **Reader pager, font-face registry, and reader rhythm together stabilize the swipe-commit paint pipeline** — docs_plans_reader_persistent_pager_reader_pager, docs_plans_reader_persistent_pager_page_font_registry, docs_plans_reader_line_rhythm_space_between_fill [INFERRED 0.75]
- **PlanAssignmentRow, PlaybackOverride, and activeOverride jointly implement wird inline playback identity/UI** — docs_plans_listening_wird_inline_playback_plan_assignment_row, docs_plans_listening_wird_inline_playback_recitation_context_play_override, docs_plans_listening_wird_inline_playback_active_override [EXTRACTED 1.00]
- **Mobile nav, safha sizing, and swipe animation together form the mobile reading experience** — docs_plans_mobile_nav_ux_mobile_nav_ux, docs_plans_mobile_safha_sizing_mobile_safha_sizing, docs_plans_mobile_swipe_animation_mobile_swipe_animation [INFERRED 0.85]
- **Shared mushaf access: share code + access grant + doc** — docs_plans_shared_mushaf_access_doc, docs_plans_shared_mushaf_access_mushaf_share_code_model, docs_plans_shared_mushaf_access_mushaf_access_grant_model [INFERRED 0.85]
- **Cut/promote/sync release pipeline skills** — docs_plans_release_branch_workflow_cut_release_skill, docs_plans_release_branch_workflow_promote_release_skill, docs_plans_release_branch_workflow_sync_main_from_prod_skill [EXTRACTED 0.95]
- **Per-edition Mushaf placement: registry + word layout + page metadata** — docs_plans_tajweed_mushaf_mode_edition_registry, docs_plans_tajweed_mushaf_mode_mushaf_word_layout_model, docs_plans_tajweed_mushaf_mode_mushaf_page_metadata_model [EXTRACTED 0.95]
- **Furqan Plan-Implement-Review-Ship-Retrospect cycle** — docs_workflow_plan_task, docs_workflow_start_task, docs_workflow_review_work, docs_workflow_ship_task, docs_workflow_retrospect [EXTRACTED 1.00]
- **Furqan full release orchestration pipeline** — docs_workflow_release_cut_release, docs_workflow_release_promote_to_staging, docs_workflow_release_promote_release, docs_workflow_release_sync_main_from_prod [EXTRACTED 1.00]
- **Furqan two-database split (Quran content vs App data)** — docs_standards_database_furqan_quran_db, docs_standards_database_furqan_app_db, docs_standards_database_no_cross_domain_fk [EXTRACTED 1.00]

## Communities (227 total, 73 thin omitted)

### Community 0 - "getQueryClient"
Cohesion: 0.12
Nodes (21): GenerateCodeCard(), GrantedViewersList(), Props, MushafHub(), PersonAvatar(), Props, Props, RedeemCodeCard() (+13 more)

### Community 1 - "ADR 0028: Reader uses a persistent client pager over slim static content"
Cohesion: 0.05
Nodes (41): QuranSwipeNav component (mobile swipe reader), ADR 0019: sessionStorage key for cross-page swipe direction, ADR 0020: Client Component required for inline <style> injection, FontFaceInjector.tsx (Client Component), ReaderPage Server Component, Cross-chapter stop-point chaining (Juz/Hizb/Rub stop points), data-fq-word attribute highlight mechanism (supersedes DOM ref registry), QDC runtime proxy (app/api/quran/recitations) (+33 more)

### Community 2 - "MyPlansList.tsx"
Cohesion: 0.19
Nodes (15): PlanCard(), PlansTodayHero(), WeekStrip(), useOnlineStatus(), usePlanStreak(), ADR-0030, useTodayAssignments(), QueryProvider() (+7 more)

### Community 3 - "useTranslations"
Cohesion: 0.13
Nodes (19): DesktopQuranFontSizeControls(), sizes, MarkedByLine(), EnablePushToggle(), JuzRangeSlider(), Props, QuranSafha(), themes (+11 more)

### Community 4 - "config.ts"
Cohesion: 0.10
Nodes (20): handler, authOptions, MarksSignedOutPrompt(), AccessRemovedBanner(), ADR-0012, SignedOutPrompt(), PlansSignedOutPrompt(), getRubs() (+12 more)

### Community 5 - "engine.ts"
Cohesion: 0.10
Nodes (35): GET(), toDateString(), GET(), TodayPlanAssignments, ADR-0030, MissedDayPolicy, PLAN_ACTIVITIES, PLAN_TEMPLATES (+27 more)

### Community 6 - "getNotificationDeps"
Cohesion: 0.15
Nodes (16): handle(), isAuthorized(), ALLOWED_PUSH_HOSTS, DELETE(), hashEndpoint(), isValidPushEndpoint(), POST(), GET() (+8 more)

### Community 7 - "constants/plans.ts"
Cohesion: 0.14
Nodes (19): DELETE(), POST(), ADR-0030, PATCH(), ADR-0030, GET(), POST(), serializePlan() (+11 more)

### Community 8 - "Tablet Nav Overlay Effect"
Cohesion: 0.07
Nodes (31): Seeder guard+reset+fetch+insert algorithm, scripts/quran-seed/seed.js orchestrator, ADR 0027 — tablet swipe carousel, 3-panel tablet swipe carousel, Tablet Nav Overlay Effect, Mobile reader UX addendum (nav overlay, long-press), --mushaf-* printed-mushaf CSS tokens, NavOverlayContext (+23 more)

### Community 9 - "RecitationContext.tsx"
Cohesion: 0.14
Nodes (23): DEFAULT_RECITATION_SETTINGS, ADR-0021, getInitialSettings(), RecitationContext, RecitationContextType, RecitationProvider(), setWordHighlightClass(), ADR-0013 (+15 more)

### Community 10 - "ReaderPager.tsx"
Cohesion: 0.12
Nodes (21): computeSpreadNav(), NavHrefs, Panel, PanelProps, Props, stepAnchor(), ADR-0014, ADR-0028 (+13 more)

### Community 11 - "RubList.tsx"
Cohesion: 0.19
Nodes (9): RecitationProvider, RecitationProviderError, QdcAudioFile, QdcReciter, QdcVerseTiming, ChapterAudio, Reciter, VerseSegment (+1 more)

### Community 12 - "QuranSafha.tsx"
Cohesion: 0.05
Nodes (43): LineProps, QuranLine(), ADR-0025, NO_LINES, QuranSafhaProps, SKELETON_BARS, tailwindFontUtility, ADR-0012 (+35 more)

### Community 13 - "useQuranMushaf"
Cohesion: 0.18
Nodes (15): MushafSwitchSync(), Props, ADR-0021, ADR-0033, getInitialMushafId(), QuranMushafContext, QuranMushafContextType, QuranMushafProvider() (+7 more)

### Community 14 - "ReaderPage.tsx"
Cohesion: 0.09
Nodes (21): ReaderPage(), ReaderPageProps, ADR-0012, ADR-0013, ADR-0028, getPageWords(), GLYPH_FIELD, PageWords (+13 more)

### Community 15 - "Shared Mushaf Access"
Cohesion: 0.08
Nodes (27): ADR 0009 — reproducible Quran seeder, Reproducible Quran Database Seeder, ADR 0012 — shared mushaf access, Shared Mushaf Access, Mark author attribution (Marked by X), MushafAccessGrant model, MushafShareCode model, ViewingChip component (+19 more)

### Community 16 - "toLocaleNumeral"
Cohesion: 0.13
Nodes (22): OfflineAccessSection(), OfflineEditionRow(), RowProps, ADR-0014, ADR-0023, OfflineDownloadPanel(), PanelState, Props (+14 more)

### Community 17 - "types/index.ts"
Cohesion: 0.10
Nodes (23): DesktopQuranFontSizeContext, DesktopQuranFontSizeContextType, DesktopQuranFontSizeProvider(), getInitialDesktopQuranFontSize(), getInitialView(), QuranSafhaViewContext, QuranSafhaViewContextType, QuranSafhaViewProvider() (+15 more)

### Community 18 - "[locale]/layout.tsx"
Cohesion: 0.23
Nodes (11): KeepScreenAwakeSync(), SettingsSidebar(), KeepScreenAwakeContext, KeepScreenAwakeContextType, KeepScreenAwakeProvider(), useKeepScreenAwake(), NavOverlayContext, NavOverlayContextValue (+3 more)

### Community 19 - "registry.ts"
Cohesion: 0.15
Nodes (14): createEmailChannel(), fallbackEmail(), baseInput, fakeLogger, createInAppChannel(), createPushChannel(), baseInput, fakeLogger (+6 more)

### Community 20 - "PlansWidget.tsx"
Cohesion: 0.24
Nodes (13): Sidebar(), formatRange(), PlanAssignmentRow(), Props, inRange(), PlansWidget(), RecitationPlayerBar(), ADR-0021 (+5 more)

### Community 21 - "MyMarksList.tsx"
Cohesion: 0.14
Nodes (20): buildVerseSnippet(), GET(), getSortKey(), MarkListItem, MarksPage, ADR-0025, VALID_CATEGORIES, chipByCategory (+12 more)

### Community 22 - "jsonResponse"
Cohesion: 0.15
Nodes (29): deleteMark(), getGrantForViewer(), upsertMark(), withAuthorNames(), POST(), ADR-0012, GET(), POST() (+21 more)

### Community 23 - "MarkModal.tsx"
Cohesion: 0.10
Nodes (27): LANGUAGES, LanguageToggle(), MarkerColorPicker(), Props, getTitle(), MarkModal(), ModalProps, ADR-0012 (+19 more)

### Community 24 - "RecitationSettingsSheet.tsx"
Cohesion: 0.14
Nodes (20): Props, ReciterCombobox(), CustomRangePicker(), nextRepeatCount(), RANGE_TYPE_OPTIONS, ReciterTrigger(), RepeatStepper(), STOP_POINT_OPTIONS (+12 more)

### Community 25 - "seed.js"
Cohesion: 0.05
Nodes (67): cliProgress, {
  deriveRubs,
  deriveRubVerseMappings,
  derivePageMetadata,
}, { fetchChapters }, {
  fetchMushafLayout,
  layoutFromSeededWords,
  LAYOUT_MUSHAF_IDS,
  DEFAULT_MUSHAF_ID,
}, { fetchVersesAndWords, TOTAL_PAGES }, fs, insertStatements(), ADR-0033 (+59 more)

### Community 26 - "sw.ts"
Cohesion: 0.10
Nodes (25): ClientToSwMessage, FALLBACK_LOCALES, fallbackDocumentUrl(), pageFontUrl(), pageJsonUrl(), SwToClientMessage, ADR-0014, ADR-0023 (+17 more)

### Community 27 - "MyMarksList.tsx client component"
Cohesion: 0.12
Nodes (20): ADR 0017 — App DB uses migrations, not db push, ADR 0022 — verse/word comments as mark type (superseded), ADR 0024 — color marks encode category (amended), ADR 0025 — a mark is one row: category plus optional comment, Unify Marks: Category + Optional Comment, MarkModal.tsx (single picker+comment flow), Mark Prisma model (category + comment), MyMarksList.tsx (category tabs, follow-on responsive filter) (+12 more)

### Community 28 - "auth-middleware.ts"
Cohesion: 0.17
Nodes (14): isJSONRequest(), protectedRoutes, ADR-0012, ADR-0030, ADR-0037, withAuth(), withIntl(), CustomMiddleware (+6 more)

### Community 29 - "FontFaceInjector.tsx"
Cohesion: 0.17
Nodes (15): FontFaceInjector(), nextKept(), Props, ADR-0023, ADR-0028, ADR-0029, useLruIds(), MushafEdition (+7 more)

### Community 30 - "QuranMushafContext.tsx"
Cohesion: 0.13
Nodes (13): MarkBody, MarkWithAuthor, ADR-0012, ADR-0025, GET(), GET(), isTextScope(), resolvePageStop() (+5 more)

### Community 31 - "QuranWord.tsx"
Cohesion: 0.27
Nodes (10): resolveStopTarget(), ADR-0033, usePageVerseBounds(), Envelope, fetchChapterAudio(), fetchPageBounds(), fetchReciters(), fetchStopPoint() (+2 more)

### Community 32 - "notifications/types.ts"
Cohesion: 0.12
Nodes (28): getNotificationType(), NOTIFICATION_TYPES, NotificationChannelKey, NotificationContent, NotificationEmailContent, NotificationTypeDef, PlanDailyReminderPayload, SystemTestPayload (+20 more)

### Community 33 - "QuranSafha"
Cohesion: 0.13
Nodes (16): Mobile Safha Sizing: Width-Driven Font, Flexbox Height Fill, Surah Banner Positions as Denormalized Fields on PageMetadata, MarkerColorPicker, MarkModal, Panel, QuranLine, QuranMushafContext, QuranSafha (+8 more)

### Community 34 - "Nav"
Cohesion: 0.15
Nodes (16): FurqanLogo, MarksLink, Nav, NotificationBell, NotificationFeed, NotificationItem, PlansLink, RubList (+8 more)

### Community 35 - "Daily Awrad UI"
Cohesion: 0.13
Nodes (16): Design Principles, Manuscript-inspired reading app character, Circular navigation button style (52px, thin lucide icons), Ornamental elements (corner star ornaments, diamond separators), ADR 0008 no cross-domain FK (referenced), ADR 0014 offline write-queueing (referenced), ADR 0030 Plan engine derived assignments (referenced), Daily Awrad & Learning Plans Engine (Foundation) (+8 more)

### Community 36 - "reminders.ts"
Cohesion: 0.39
Nodes (7): advanceOneDay(), getTimezoneOffsetMs(), isDue(), nextOccurrence(), scheduleReminder(), toSafeTimeZone(), NotificationStore

### Community 37 - "response.ts"
Cohesion: 0.22
Nodes (8): Constraints, Decisions Made, Files to Change, Fix, Fix Reader Navigation Infinite Render Loop, Root Cause, Summary, What NOT to Do

### Community 38 - "actions/plans.ts"
Cohesion: 0.08
Nodes (34): PlanProgressHistoryEntry, UserPlanListItem, AddPlanButton(), EDIT_VIEW_FOR_TEMPLATE, groupHistoryByDate(), MyPlansList(), PlanHistorySection(), STATUS_ACTIONS (+26 more)

### Community 39 - "Column-Font Contract"
Cohesion: 0.14
Nodes (15): ADR 0002 — Non-page Quran text rendering, ADR 0012 — Mark from_user/to_user ownership, ADR 0025 — Mark granularity, Mark model (verse/word granularity), No FK/relation across Quran/App domains rule, getDirection() helper (app/utils/i18n.ts), Column-Font Contract, Common Rendering Mistakes table (+7 more)

### Community 40 - "isSearchQueryValid"
Cohesion: 0.26
Nodes (9): GET(), GET(), SearchBar(), isSearchQueryValid(), searchChapters(), searchVerses(), useSearch(), VerseResult (+1 more)

### Community 41 - "Split Quran Content and Application Data into Two Databases"
Cohesion: 0.21
Nodes (13): Split Quran Content and Application Data into Two Databases, Mark Model (Cross-Domain Scalar References Only), Reproducible API-Driven Quran Seeder; Prisma Owns furqan_quran Schema, PrismaClient Constructors Must Not Receive Explicit Datasource URLs, Shared Mushaf Access via One-Time Codes and Grant-Scoped Marks, MushafAccessGrant Model, PWA Installability and Offline Quran Page Caching, Versioned Prisma Migrations for furqan_app; db push for furqan_quran (+5 more)

### Community 42 - "compilerOptions"
Cohesion: 0.05
Nodes (41): ./app/components/*, ./app/constants/*, ./app/contexts/*, ./app/fonts/*, ./app/hooks/*, ./app/types/index.ts, ./app/utils/*, dom (+33 more)

### Community 43 - "ReaderPager"
Cohesion: 0.20
Nodes (12): Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main), MushafSwitchSync, NavOverlayContext, PlansWidget, ReaderPage, ReaderPageContext, ReaderPager, ReaderPageSync (+4 more)

### Community 44 - "Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette"
Cohesion: 0.23
Nodes (12): Merge three mobile safha ADRs into rewritten ADR 0011, Consolidate Mobile Safha Sizing Docs, ADR 0004 page sizing viewport-fit budget (referenced), ADR 0005 font safelist (referenced), ADR 0011 mobile quran font scale vw formula (referenced), ADR 0032 dark surface depth from light (referenced), Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette, Gutter/binding-crease correction rounds 1-10 (iterative, measured) (+4 more)

### Community 45 - "Page Turn Blanks the Reader on Slow Networks"
Cohesion: 0.24
Nodes (11): ADR 0028: Persistent pager, ADR 0029: Immutable font registry, ADR 0034: Page-turn readiness on slow networks, QuranSpread.tsx, ReaderPager.tsx, app/utils/page-font-registry.ts, arrow-controls-desktop.md (#156), OPEN: skeleton renders wider than page, recitation bar resizes (unresolved) (+3 more)

### Community 46 - "QuranSpread.tsx"
Cohesion: 0.19
Nodes (10): QuranSafhaViewToggle(), NavHrefs, PagePayload, QuranSpread(), QuranSpreadProps, ADR-0013, ADR-0028, ADR-0034 (+2 more)

### Community 48 - "start-task Load context gate"
Cohesion: 0.18
Nodes (11): docs/architecture/APP_PURPOSE.md, docs/architecture/COMPONENTS.md, docs/design/design-principles.md, API Input Validation rule (422 on failure), jsonResponse(), Legacy page words route (raw NextResponse.json), API Response Envelope, API Route Structure (+3 more)

### Community 49 - "Mobile Safha: Full-Screen Sizing"
Cohesion: 0.20
Nodes (10): Remove Safha Card Background on Mobile, QuranSafha.tsx (bg-card md:-only fix), --fq-mobile-font width-derived font formula, Mobile Safha: Full-Screen Sizing, QuranSwipeNav.tsx (renamed from QuranPageShell), Post-navigation compositor flicker (accepted platform limitation), Mobile Swipe Page Animation, onTouchStart/Move/End drag-to-reveal algorithm (+2 more)

### Community 50 - "Fix: Verse Rendering Outside the Quran Page"
Cohesion: 0.20
Nodes (10): ADR 0002: UthmanicHafs1Ver18 global font, app/api/search/chapters/route.ts, app/api/search/verses/route.ts, RubList.tsx, SearchQueryResults.tsx, app/constants/search.ts, app/hooks/use-search.ts, app/layout.tsx (+2 more)

### Community 51 - "Fix: Surah Banner Placement and Standalone Line Sizing"
Cohesion: 0.22
Nodes (10): ADR 0004: 15-slot page budget / font scale, ADR 0016: Surah banner (superseded by line_number-gap algorithm), QuranLine.tsx, app/constants/font.ts, app/globals.css, app/surah-frame.svg, KFGQPC glyph licence gate — unresolved blocking precondition (Addendum 8), Fix: Surah Banner Placement and Standalone Line Sizing (+2 more)

### Community 52 - "Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle"
Cohesion: 0.22
Nodes (10): ADR 0013: Mushaf double-page spread (partner font not preloaded), ADR 0014: PWA offline architecture, ADR 0027: QuranSwipeNav remount on navigation, QuranWord.tsx, app/hooks/use-is-tablet.ts, app/hooks/use-pwa-precache.ts, app/sw.ts, Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle (+2 more)

### Community 53 - "FqLogger"
Cohesion: 0.20
Nodes (4): createNotificationStore(), toNotificationRow(), toReminderRow(), FqLogger

### Community 54 - "deps.ts"
Cohesion: 0.36
Nodes (7): createLogEmailTransport(), createSmtpEmailTransport(), EmailMessage, EmailTransport, getEmailTransport(), hasSmtpConfig(), logger

### Community 55 - "Font System (Immutable FontFace Registry)"
Cohesion: 0.22
Nodes (10): Encoding for Quran Text Rendered Outside the Page Route, Normalize Hamza-Alif Forms in Incoming Search Query, FontFaceInjector, page-font-registry.ts (ensurePageFonts), QuranFontScaleContext, QuranFontScaleControls, SearchBar, SearchQueryResults (+2 more)

### Community 56 - "release workflow (/release)"
Cohesion: 0.27
Nodes (10): ADR 0009 — Reproducible Quran seeder, ADR 0015, ADR 0026, furqan_quran seeder (db push --force-reset), npm run seed:quran -- --force, release workflow (/release), Cut Release (/cut-release), Promote Release (/promote-release) (+2 more)

### Community 57 - "PlanAssignmentRow component"
Cohesion: 0.20
Nodes (10): activeOverride state ({id,label}), ADR 0033 — mushaf editions (page numbers edition-relative), app/lib/plans/assignment-range.ts (isPageInAssignmentRange, planPlaybackSessionId), GET /api/quran/pages/[pageId]/bounds route (extended with firstVerseKey), decideChapterEnd() (isRepeatableRange param), Addendum — Disable Stop-at/Repeat During an Override, Listening Wird: Inline Playback on Assignment Rows, PlanAssignmentRow component (+2 more)

### Community 58 - "scripts"
Cohesion: 0.08
Nodes (26): scripts, app-generate, app-migrate-dev, app-studio, build, build:local, dev, e2e:build (+18 more)

### Community 59 - "ReaderPager"
Cohesion: 0.17
Nodes (12): Props, QuranPage, ReaderPager(), VerticalQuranPages(), fetchPageAPI(), PageData, pageQueryKey(), ADR-0028 (+4 more)

### Community 60 - "SettingsSidebar"
Cohesion: 0.22
Nodes (9): Multi-Theme Architecture via Named CSS Classes + Dark Layer, AccountCard, EnablePushToggle, LanguageToggle, QuranSafhaViewContext, QuranSafhaViewToggle, SettingsSidebar, ThemeToggle (+1 more)

### Community 61 - "Adopt Prisma Migrations for furqan_app"
Cohesion: 0.22
Nodes (9): ADR 0017 Prisma migrations for App DB (referenced), Deploy Furqan to Hostinger, prisma migrate deploy in Hostinger build script, ADR 0009 furqan_quran seeder db push --force-reset (referenced), ADR 0017 Prisma migrations app DB (referenced), One-time Prisma migration baselining procedure, Adopt Prisma Migrations for furqan_app, connection_limit=5 to 1 rationale (Hostinger 75-connection cap) (+1 more)

### Community 62 - "Base Notification System"
Cohesion: 0.25
Nodes (9): ADR 0037 Notification dispatch and channels (referenced), Notification reminders cron job (hPanel, every 5 min), ADR 0037 Notification dispatch and channels (source ADR), Channel registry pattern (push/email/in-app), dispatch.ts orchestration module, Base Notification System, Reminders cron claim/dispatch flow, Post-review fix batches A-F (32 issues found by /review-fq-work) (+1 more)

### Community 63 - "Mushaf Double-Page Spread Toggle"
Cohesion: 0.25
Nodes (9): ADR 0013 — mushaf double-page spread, getPagePair() pairing math, Mushaf Double-Page Spread Toggle, QuranSafhaViewContext, QuranSafhaViewToggle.tsx, QuranSpread.tsx, baseFontIds scoping fix (isDouble vs isLgUp), FontFaceInjector.tsx (base fonts via registry, tajweed keyed style) (+1 more)

### Community 64 - "RecitationContext.tsx"
Cohesion: 0.28
Nodes (9): ADR 0021 — recitation playback (QDC proxy, audio-driven navigation), chainToNextChapter cross-chapter chaining logic, Addendum 9 — Custom stop-at point (page or verse), QDC audio API (api.qurancdn.com) proxied via RecitationProvider adapter, Addendum 7 — whole-range repeat never looping (currentVerseKeyRef stale bug), RecitationContext.tsx, Add Quran Recitation Playback with Reciter Selection, RecitationSettingsSheet.tsx (+1 more)

### Community 65 - "plan-fq-task workflow"
Cohesion: 0.25
Nodes (9): Core Cycle (Plan → Implement → Review → Ship → Retrospect), plan-fq-task workflow, Existing plan/addendum check (step 0), ADR check step, Plan file format (docs/plans/<slug>.md), Task ticket requirement before implementation, Verify the solution together (decision tree + test cases), retrospect workflow (+1 more)

### Community 66 - "Fix Hostinger Auto-Deploy Build Failures"
Cohesion: 0.29
Nodes (8): ADR 0010: Prisma no explicit datasource URL, app/api/auth/options.ts, app/utils/db.ts, Fix Prisma Connection Exhaustion on Next.js Dev Hot-Reload, Fix Hostinger Auto-Deploy Build Failures, Fix NextAuth JWT/Session Corruption on Transient DB Error, Fix RSC Cache Poisoning on Hostinger, next.config.mjs

### Community 67 - "Fix Homepage CDN Cache Poisoning (Hostinger Edge)"
Cohesion: 0.25
Nodes (8): ADR 0011: Mobile Quran font scale vw formula, ADR 0035: Bounded revalidate on static document routes, QuranSwipeNav.tsx (renamed from QuranPageShell), app/[locale]/page.tsx, app/[locale]/pages/[id]/page.tsx, app/[locale]/pages/vertical/page.tsx, Fix Homepage CDN Cache Poisoning (Hostinger Edge), Fix Reversed Mobile Swipe Navigation Direction

### Community 68 - "sentry/route.ts"
Cohesion: 0.32
Nodes (7): buildSlackMessage(), isValidSignature(), LEVEL_EMOJI, POST(), SentryAlertPayload, ADR-0019, ADR-0018

### Community 69 - "QuranSafha.tsx"
Cohesion: 0.29
Nodes (8): MarkModal.tsx, Sidebar.tsx, QuranSafha.tsx, SearchBar.tsx, SettingsSidebar.tsx, SignInModal.tsx, Fix Dialog Missing Title/Description A11y Warnings, Fix MarkModal Auth Gate — Allow Recitation Without Sign-in

### Community 70 - "render-context.ts"
Cohesion: 0.39
Nodes (7): RenderContext, buildRenderContext(), interpolate(), loadMessages(), lookup(), messagesCache, toSafeLocale()

### Community 71 - "Tailwind Safelist for Dynamic Quran Font-Size Classes"
Cohesion: 0.39
Nodes (8): Viewport-Fit Sizing for the Mushaf Page, FONT_V1 (vh-Derived Font Scale Model), Tailwind Safelist for Dynamic Quran Font-Size Classes, Minimum Floor for vh-Derived Quran Font Size and Spacing, Mushaf Double-Page Spread (Pairing, Data-Fetch, Decoration), RecitationPlayerBar, Desktop Reading Group (>=1367px Vertical Rail), Nav Z-Index Invariant (relative z-10)

### Community 72 - "quranPrisma / appPrisma clients"
Cohesion: 0.29
Nodes (8): ADR 0008 — Quran/App Database Split, Data Fetching pattern (Prisma vs React Query), Server vs Client Components rule, Connection limit=1 constraint (Hostinger 75 cap), furqan_app database, furqan_quran database, quranPrisma / appPrisma clients, Database Stack (MySQL, two DBs)

### Community 73 - "ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision)"
Cohesion: 0.29
Nodes (8): ADR 0031: Dark theme - gold marks Mushaf identity, emerald marks interaction, Emerald tokens (--primary, --accent, --ring), Gold tokens (--gold, --mushaf-ornament, --surah-frame-gold), Monotonic brightness ladder verification method (sampled pixels), ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision), Flat --mushaf-paper page fill (graded-light ramp removed, all themes), fq-spread-col align-items stretch chain + space-between line rhythm, ADR 0036: The desktop reader fills its height band, leftover height becomes line rhythm

### Community 74 - "docs/architecture/DECISIONS.md"
Cohesion: 0.25
Nodes (7): docs/architecture/DECISIONS.md, docs/plans/release-branch-workflow.md, auth-middleware (middleware.ts), Adding a Protected Route workflow, Load context gate (DECISIONS.md + ADRs + standards), review-fq-work workflow, Review dimensions (Bugs, Quality, Plan Consistency)

### Community 75 - "/ship-fq-task skill"
Cohesion: 0.29
Nodes (8): ~/.claude/hooks/block-dangerous-git.sh (removed global hook), commit-staged skill, /confirm-dangerous-git skill, Git Workflow Skills (commit/push gating), /ship-fq-task skill, ~/.claude/furqan-worktrees.json state file, Git Worktrees Workflow Integration, /start-fq-task skill (worktree creation)

### Community 77 - "Sidebar.tsx"
Cohesion: 0.09
Nodes (30): Props, buildJuzGroups(), JuzGroup, Props, RubList(), ADR-0033, SearchQueryResults(), Props (+22 more)

### Community 78 - "MyPlansList"
Cohesion: 0.33
Nodes (7): AddPlanButton, JuzRangeSlider, MyPlansList, PlanAssignmentRow, PlanEnrollForm, PlansBrowseDialog, PlansTodayHero

### Community 79 - "fq-logger: Structured Logging & Observability"
Cohesion: 0.29
Nodes (7): ADR 0019 — fq-logger Sentry integration, Edge console-based logger shim, fq-logger: Structured Logging & Observability, pino (Node logging library), redact.ts sensitive key redaction, logger.error() Sentry bridge, withRequestId middleware

### Community 80 - "fq-reader-spread-container flex:1 + space-between fill"
Cohesion: 0.29
Nodes (8): ADR 0011 — mobile Quran font scale vw formula, ADR 0036 — reader fills height band, min-height:800px gate for rhythm fill, Reader Rhythm: Claim Unused Vertical Space Into Line Gaps, fq-reader-spread-container flex:1 + space-between fill, Recitation Bar: Vertical Rail (Desktop), RecitationPlayerBar.tsx (rail vs bar layout), RecitationPlayerBar.tsx (persistent bottom bar)

### Community 81 - "ReaderPager.tsx (client persistent pager)"
Cohesion: 0.33
Nodes (7): ADR 0028 — reader persistent pager, ADR 0029 — immutable page font registration, app/utils/page-font-registry.ts (immutable FontFace registry + LRU), ReaderPager.tsx (client persistent pager), Reader Swipe Performance: Persistent Client Pager, RecitationFollow leaf component (pager-owns-follow), Slim static content JSON pipeline (public/quran/pages/{n}.json)

### Community 82 - "ui-motion guidance"
Cohesion: 0.33
Nodes (7): Animation rule (tailwindcss-animate not installed), ui-motion guidance, Motion accessibility (prefers-reduced-motion, hover gating), Should this even animate? frequency table, Component states motion rules, Easing and duration rules, Motion performance rules (transform/opacity only)

### Community 83 - "Workflow Index"
Cohesion: 0.33
Nodes (7): commit-staged / commit-message workflow, confirm-dangerous-git workflow, Workflow Index, ship-fq-task workflow, No AI signatures rule, terse mode (mujaz), mujaz-mode.js hook + .mujaz-off flag

### Community 84 - "ADR 0025: A mark is one row - category plus optional comment"
Cohesion: 0.33
Nodes (6): Mark model (Prisma), ADR 0022: Store word/verse comments as Mark.mark_type=note, mark_value widened to TEXT, ADR 0024: Color marks encode a semantic category, not a color, MARK_CATEGORIES config table, ADR 0025: A mark is one row - category plus optional comment, Mark model v2 (category + comment columns)

### Community 85 - "Furqan (Quran Memorization Tool)"
Cohesion: 0.33
Nodes (6): Furqan (Quran Memorization Tool), Minimize Distraction During Reading (UX Principle), RTL as Primary Direction, Teacher-Student Collaborative Annotation, Future Two-Page Book Layout (Recto/Verso), Word/Verse-Level Highlighting and Annotation

### Community 86 - "MushafHub"
Cohesion: 0.33
Nodes (6): AccessibleMushafList, AccessRemovedBanner, GenerateCodeCard, GrantedViewersList, MushafHub, RedeemCodeCard

### Community 87 - "PWA Conversion + Offline Quran Page Reading"
Cohesion: 0.40
Nodes (6): ADR 0014 — PWA offline architecture, app/manifest.ts PWA manifest, Middleware matcher fix (icons/* exclusion), PWA Conversion + Offline Quran Page Reading, app/sw.ts Serwist service worker, use-pwa-precache.ts hook

### Community 88 - "vh-derived vertical spacing formula (lineGapRatio 0.417)"
Cohesion: 0.33
Nodes (6): ADR 0006 — Quran font size minimum floor, FONT_V1 constants (app/constants/font.ts), Quran Font Size: Minimum Floor for Short Viewports, ADR 0004 — Quran safha viewport fit, Quran Safha: Fit Viewport With No Scroll, vh-derived vertical spacing formula (lineGapRatio 0.417)

### Community 89 - "/release orchestrator skill"
Cohesion: 0.40
Nodes (6): /cut-release skill, DB change flags in release notes, /promote-release skill, /promote-to-staging skill, /release orchestrator skill, /sync-main-from-prod skill

### Community 90 - "Sentry Error Tracking"
Cohesion: 0.33
Nodes (6): ADR 0017 — Sentry error tracking, Sentry Error Tracking, instrumentation.ts onRequestError, ADR 0018 — Sentry Slack relay webhook, Sentry-to-Slack Alerting via Relay Webhook, app/api/webhooks/sentry/route.ts relay

### Community 91 - "ReaderPage.tsx"
Cohesion: 0.40
Nodes (5): ADR 0020: Client component for inline style injection, FontFaceInjector.tsx, ReaderPage.tsx, Fix: Invalid Font MIME Type in Preload Hint, Fix Reader Hydration Mismatch (ReaderPage style injection)

### Community 92 - "AI-First Documentation & Workflow System"
Cohesion: 0.40
Nodes (5): AI-First Documentation & Workflow System, Documentation structure (docs/, DECISIONS.md living file, adr/ archive), Task workflow: plan → start → review → retrospect, /retrospect skill plan, Retrospect skill 3-phase workflow (infer, propose, save)

### Community 93 - "Session Handoff — Dark Theme Mushaf Unification"
Cohesion: 0.40
Nodes (5): ADR 0031 gold vs emerald semantics (referenced/revised), ADR 0031 gold vs emerald semantics (referenced), ADR 0032 dark surface depth from light (referenced), Session Handoff — Dark Theme Mushaf Unification, Hard constraints — do NOT break (value-identical theme blocks, gold reader-only, etc.)

### Community 94 - "Fix dead tailwindcss-animate classes in dialog.tsx (plugin not installed)"
Cohesion: 0.40
Nodes (5): DELETE mark handler scoped by to_user, Delete My Marks, Fix dead tailwindcss-animate classes in dialog.tsx (plugin not installed), Enhance MarkModal Motion & Polish, MarkerColorPicker radio card group redesign (Radix RadioGroup)

### Community 95 - "Fix: Hamza-Alif Mismatch in Verse Search"
Cohesion: 0.40
Nodes (5): ADR 0007 Arabic search query normalization (referenced), Fix: Hamza-Alif Mismatch in Verse Search, normalizeArabicQuery util (hamza-alif normalization), Fix: Ayah Font Not Rendering in Search Results and Mark Modal, Font-encoding contract table (per-page glyph vs UthmanicHafs1Ver18)

### Community 96 - "i18n Setup (next-intl, ar/en locales)"
Cohesion: 0.40
Nodes (5): npm run extract-translations, Translation Key Naming convention, i18n/routing.ts locale-aware navigation, i18n Setup (next-intl, ar/en locales), messages/ar.json + messages/en.json

### Community 98 - "furqan_app Prisma migrations workflow"
Cohesion: 0.50
Nodes (4): ADR 0017 — Prisma migrations for App DB, docs/plans/adopt-prisma-migrations.md, furqan_app Prisma migrations workflow, compress-fq-docs workflow

### Community 99 - "ADR 0030: Plan engine - code-defined templates, typed scheduling rules, derived daily assignments"
Cohesion: 0.50
Nodes (4): الحصون الخمسة memorization program, ADR 0030: Plan engine - code-defined templates, typed scheduling rules, derived daily assignments, Five typed scheduling rule kinds (fixed_cycle, cursor_advance, trailing_window, completed_cycle, lookahead), UserPlan enrollment + ProgressEntry append-only log

### Community 100 - "Theme system (named CSS classes on html)"
Cohesion: 0.50
Nodes (4): ADR 0031 — Dark theme gold/emerald semantics, Adding a new theme workflow, Theme system (named CSS classes on html), Theme Token Contract

### Community 101 - "ADR 0037: Notification dispatch via a channel registry, no queue/worker infra"
Cohesion: 0.50
Nodes (4): ChannelRegistry (createPushChannel/createEmailChannel/createInAppChannel), app/api/cron/reminders/route.ts (claim-token lease cron poll), ADR 0037: Notification dispatch via a channel registry, no queue/worker infra, ADR TEMPLATE.md

### Community 102 - "Arrow Controls on Desktop"
Cohesion: 0.50
Nodes (4): ADR 0013 isDouble pair stepping (referenced), ADR 0028 ReaderPager pager invariants (referenced), Arrow Controls on Desktop, Trello #157 panel placeholder reflow flicker bug

### Community 103 - "Mobile Navigation UX"
Cohesion: 0.50
Nodes (4): AccountCard.tsx (extracted mobile account card), Mobile Navigation UX, SearchBar.tsx (mobile fullscreen overlay), SidebarContext

### Community 104 - "UI Workflow Enhancements"
Cohesion: 0.50
Nodes (4): docs/architecture/APP_PURPOSE.md, docs/architecture/COMPONENTS.md, UI Workflow Enhancements, /start-fq-task skill (updated)

### Community 105 - "Fix Desktop Search Dropdown Hidden by Reader Stacking Context"
Cohesion: 0.67
Nodes (3): Nav.tsx, Fix Desktop Search Dropdown Hidden by Reader Stacking Context, CSS stacking-context paint-order bug (z:auto DOM-order collision)

### Community 106 - "Fix ViewingChip IntlError: missing {name} interpolation variable"
Cohesion: 0.67
Nodes (3): ViewingChip.tsx, use-translations.ts, Fix ViewingChip IntlError: missing {name} interpolation variable

### Community 108 - "Fix Marks Broken by Hardcoded localhost URL"
Cohesion: 0.67
Nodes (3): addPageMark.ts, getPageMarks.ts, Fix Marks Broken by Hardcoded localhost URL

### Community 109 - "Sentry Error Tracking via DSN-Presence Gating"
Cohesion: 1.00
Nodes (3): Sentry Error Tracking via DSN-Presence Gating, Sentry-to-Slack Alerting via Self-Hosted Relay Webhook, fq-logger Wraps Pino and Forwards Error Logs to Sentry

### Community 110 - "Reader depth token family (--mushaf-rim-*, --reader-chrome-*)"
Cohesion: 0.67
Nodes (3): ADR 0032 — Dark surface depth from light, Reader Surface Depth (Flat Page Face, Edge-Driven Depth), Reader depth token family (--mushaf-rim-*, --reader-chrome-*)

### Community 111 - "Design System Foundation"
Cohesion: 0.67
Nodes (3): ADR 0003 (referenced), Design System Foundation, Named theme classes (.theme-light, .theme-dark) replacing :root/.dark

### Community 112 - "Enhanced RubList Sidebar"
Cohesion: 0.67
Nodes (3): Enhanced RubList Sidebar, Hizb-aware SVG circle badge arc logic, Sticky juz section headers grouping

### Community 113 - "Fullscreen API desktop toggle (requestFullscreen/exitFullscreen)"
Cohesion: 0.67
Nodes (3): Browser Fullscreen & PWA Status-Bar Focus Mode, Fullscreen API desktop toggle (requestFullscreen/exitFullscreen), PR #155 wrongly hid app chrome instead of browser chrome

### Community 114 - "Protect prod Branch: Enforce Merges from release/* Only"
Cohesion: 0.67
Nodes (3): ADR 0015 — prod release branch gating, Protect prod Branch: Enforce Merges from release/* Only, .github/workflows/protect-prod.yml check-source job

### Community 115 - "Release-Branch Deployment Workflow"
Cohesion: 0.67
Nodes (3): ADR 0015 — release-branch workflow, ADR 0026 — staging environment, Release-Branch Deployment Workflow

### Community 116 - "PageMetadata Prisma model"
Cohesion: 0.67
Nodes (3): Store Static Page Metadata in Database, PageMetadata Prisma model, MushafPageMetadata model (per-edition)

### Community 131 - "Fixes by Finding"
Cohesion: 0.09
Nodes (21): Files to Change, Finding 10 (note) — `endResult` is an unclear name, Finding 11 (note) — play button ignores the row's `disabled` prop, Finding 12 (note) — override shape spelled out twice, Finding 13 (note) — DECISIONS.md:606 omits `label`, Finding 14 (warning) — docs claim editing "Repeat" clears the override, Finding 15 (note) — untracked `app/generated` symlink, Finding 16 — otherwise clean (+13 more)

### Community 141 - "fq-logger/index.ts"
Cohesion: 0.22
Nodes (14): build(), CONSOLE_FOR_LEVEL, Level, LEVEL_VALUE, write(), nodeLogger, wrap(), redact() (+6 more)

### Community 142 - "devDependencies"
Cohesion: 0.11
Nodes (19): @babel/traverse, eslint, eslint-config-next, devDependencies, @babel/traverse, eslint, eslint-config-next, pino-pretty (+11 more)

### Community 143 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 144 - "NotificationBell.tsx"
Cohesion: 0.19
Nodes (15): NotificationListResponse, NotificationBell(), NotificationFeed(), NotificationItem(), Props, useNotifications(), urlBase64ToUint8Array(), usePushSubscription() (+7 more)

### Community 145 - "mujaz-stats.js"
Cohesion: 0.12
Nodes (9): path, ROOT, { FLAG_PATH }, fs, { FLAG_PATH, STATS_PATH }, fs, { FLAG_PATH }, fs (+1 more)

### Community 146 - "AGENTS.md"
Cohesion: 0.13
Nodes (10): Commands, Documentation, graphify, MANDATORY WORKFLOW — NO EXCEPTIONS, MCP Setup (Trello), Project, Claude Skills, Hooks (+2 more)

### Community 147 - "LastReadPageContext.tsx"
Cohesion: 0.07
Nodes (30): AccessibleMushafList(), Props, ContinueReadingLink(), LastReadPageSync(), RecitationSettingsSheet(), LastReadPageContext, LastReadPageContextType, LastReadPageProvider() (+22 more)

### Community 149 - "Sidebar Surah Indicator & Active Scroll"
Cohesion: 0.15
Nodes (12): 1. Extend SidebarContext with current surah, 2. Nav trigger, 3. Sidebar controlled tabs + active scroll, Approach, Constraints, Decision Tree, Decisions Made, Edge Cases and Decisions (+4 more)

### Community 150 - "visual.spec.ts"
Cohesion: 0.15
Nodes (10): Locale, LOCALES, SEARCH_PLACEHOLDER, SEARCH_QUERY, SEARCH_RESULTS_HEADING, SETTINGS_LABEL, Theme, THEMES (+2 more)

### Community 151 - "dropdown-menu.tsx"
Cohesion: 0.14
Nodes (14): FurqanLogo(), Nav(), SharedMushafLink(), UserMenu(), useIsDesktopUp(), DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem (+6 more)

### Community 152 - "extract-translations.js"
Cohesion: 0.23
Nodes (11): extractKeysFromFile(), findAllFiles(), fs, languages, localesDir, main(), parser, path (+3 more)

### Community 153 - "/promote-to-staging"
Cohesion: 0.20
Nodes (8): Precondition, /promote-to-staging, Steps, What NOT to do, ADR 0039: `stg` tracks `main` directly, decoupled from release branches, Consequences, Context, Decision

### Community 154 - "/ui-motion"
Cohesion: 0.20
Nodes (9): 1. Should this even animate?, 2. Easing and duration, 3. Component states, 4. Performance, 5. Accessibility, 6. Reference techniques (use only when the task calls for it), Review checklist (use for `/review-fq-work` UI findings and self-review), /ui-motion (+1 more)

### Community 155 - "Configure Project-Local Trello MCP for Codex"
Cohesion: 0.20
Nodes (9): Configure Project-Local Trello MCP for Codex, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause / Approach, Summary, Verified Test Cases (+1 more)

### Community 156 - "Fix Navbar Icon Overflow on Mobile/Tablet"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Fix Navbar Icon Overflow on Mobile/Tablet, Root Cause, Summary, Verified Test Cases (+1 more)

### Community 157 - "Homepage Surah Card: Direction-Based Name Display"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Homepage Surah Card: Direction-Based Name Display, Summary, Verified Test Cases (+1 more)

### Community 158 - "Keep Mobile/Tablet Screen Active While App Is Open"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Keep Mobile/Tablet Screen Active While App Is Open, Summary, Verified Test Cases (+1 more)

### Community 159 - "Save Last Read Page + Navbar Link to Resume"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Save Last Read Page + Navbar Link to Resume, Summary, Verified Test Cases (+1 more)

### Community 161 - "dependencies"
Cohesion: 0.22
Nodes (9): axios, dependencies, axios, pino, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, pino, @radix-ui/react-dialog (+1 more)

### Community 162 - "/plan-fq-task"
Cohesion: 0.22
Nodes (8): Anti-patterns to avoid, Plan file format, /plan-fq-task, Step 5 — Ensure a Trello ticket, Step 6 — Create the worktree, Step 7 — Write the plan (worktree path), Steps, What this skill does (legacy)

### Community 163 - "Steps"
Cohesion: 0.22
Nodes (8): 1 — Scan the session, 2 — Scan DECISIONS.md for stale entries, 3 — Propose changes one at a time (review-before-write), 4 — Confirm before saving, 5 — Save the retrospective file, Anti-patterns to avoid, /retrospect, Steps

### Community 164 - "/review-fq-work"
Cohesion: 0.22
Nodes (8): 1 — Get the diff, 2 — Spawn the review subagent, 3 — Print the report, Anti-patterns to avoid, Choosing the review model, Claude-specific: spawning the reviewer, /review-fq-work, Steps

### Community 165 - "/start-fq-task"
Cohesion: 0.22
Nodes (8): Anti-patterns to avoid, Claude-specific additions, Context paths (step 2 in the workflow doc), /start-fq-task, Step 1 — Trello integration, Step 1b — Worktree setup (runs before step 2 in the workflow doc), Steps, What this skill does (legacy)

### Community 166 - "setup.js"
Cohesion: 0.31
Nodes (8): { execSync }, fs, loadFixture(), main(), mysql, parseConnection(), path, requireEnv()

### Community 167 - "/ship-fq-task"
Cohesion: 0.25
Nodes (7): Claude-specific additions, No AI signatures — anywhere, /ship-fq-task, Step 6 — Trello integration, Step 7 — Clean up the worktree (mandatory — always run, even if step 6 was skipped), Steps, What NOT to do

### Community 168 - "next.config.mjs"
Cohesion: 0.25
Nodes (7): ADR-0014, ADR-0017, ADR-0023, ADR-0029, nextConfig, withNextIntl, withSerwist

### Community 169 - "generate-pwa-icons.js"
Cohesion: 0.29
Nodes (7): fs, main(), outDir, path, publicDir, sharp, sourceSvg

### Community 170 - "/cut-release <major|minor|patch>"
Cohesion: 0.29
Nodes (6): Claude-specific: Trello integration (step 8), /cut-release <major|minor|patch>, No AI signatures, Precondition, Steps, What NOT to do

### Community 171 - "compress-fq-docs"
Cohesion: 0.33
Nodes (5): Anti-patterns to avoid, compress-fq-docs, Scope, Steps, The core heuristic

### Community 172 - "/release <major|minor|patch>"
Cohesion: 0.33
Nodes (5): Failure handling, Precondition, /release <major|minor|patch>, Steps, What NOT to do

### Community 173 - "ADR 0038: Reader size contracts are per-band, and tablet is always double-page"
Cohesion: 0.33
Nodes (5): ADR 0038: Reader size contracts are per-band, and tablet is always double-page, Consequences, Context, Decision, Options Considered

### Community 174 - "extends"
Cohesion: 0.33
Nodes (5): extends, ignorePatterns, app/generated/, next/core-web-vitals, next/typescript

### Community 175 - "register"
Cohesion: 0.33
Nodes (3): register(), ADR-0017, ADR-0017

### Community 176 - "Furqan"
Cohesion: 0.33
Nodes (5): Architecture at a glance, Commands, Documentation, Furqan, Local setup

### Community 177 - "/confirm-dangerous-git"
Cohesion: 0.40
Nodes (4): /confirm-dangerous-git, Dangerous commands covered, Non-goals, Rule

### Community 178 - "/promote-release <version>"
Cohesion: 0.40
Nodes (4): Precondition, /promote-release <version>, Steps, What NOT to do

### Community 179 - "/sync-main-from-prod"
Cohesion: 0.50
Nodes (3): Steps, /sync-main-from-prod, What NOT to do

### Community 180 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

## Ambiguous Edges - Review These
- `Static Generation Strategy (604 Quran Pages)` → `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)`  [AMBIGUOUS]
  docs/architecture/adr/0015-release-branch-workflow.md · relation: conceptually_related_to
- `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra` → `ADR TEMPLATE.md`  [AMBIGUOUS]
  docs/architecture/adr/TEMPLATE.md · relation: references
- `docs/plans/release-branch-workflow.md` → `Review dimensions (Bugs, Quality, Plan Consistency)`  [AMBIGUOUS]
  docs/workflow/review-work.md · relation: conceptually_related_to

## Knowledge Gaps
- **931 isolated node(s):** `path`, `ROOT`, `fs`, `{ FLAG_PATH }`, `fs` (+926 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Static Generation Strategy (604 Quran Pages)` and `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra` and `ADR TEMPLATE.md`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `docs/plans/release-branch-workflow.md` and `Review dimensions (Bugs, Quality, Plan Consistency)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTranslations()` connect `useTranslations` to `getQueryClient`, `MyPlansList.tsx`, `config.ts`, `actions/plans.ts`, `isSearchQueryValid`, `QuranSafha.tsx`, `Sidebar.tsx`, `QuranSpread.tsx`, `NotificationBell.tsx`, `toLocaleNumeral`, `[locale]/layout.tsx`, `LastReadPageContext.tsx`, `PlansWidget.tsx`, `MyMarksList.tsx`, `MarkModal.tsx`, `dropdown-menu.tsx`, `RecitationSettingsSheet.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `jsonResponse()` connect `jsonResponse` to `sentry/route.ts`, `engine.ts`, `getNotificationDeps`, `constants/plans.ts`, `MyMarksList.tsx`, `auth-middleware.ts`, `QuranMushafContext.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `cn()` connect `MarkModal.tsx` to `getQueryClient`, `MyPlansList.tsx`, `useTranslations`, `actions/plans.ts`, `Sidebar.tsx`, `NotificationBell.tsx`, `PlansWidget.tsx`, `MyMarksList.tsx`, `dropdown-menu.tsx`, `RecitationSettingsSheet.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `path`, `ROOT`, `fs` to the rest of the system?**
  _931 weakly-connected nodes found - possible documentation gaps or missing edges._