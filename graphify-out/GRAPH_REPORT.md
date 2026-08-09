# Graph Report - .  (2026-08-06)

## Corpus Check
- Large corpus: 1741 files · ~2,609,704 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1565 nodes · 2975 edges · 141 communities (118 shown, 23 thin omitted)
- Extraction: 97% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Mushaf Sharing & Notifications
- Reader Navigation & Font Injection
- Plans List & Progress
- Account & Nav Components
- Auth Routes & Marks Prompt
- Plan Engine & Streak
- Marks API Routes
- Plans API Routes
- Dark Theme Depth Handoff
- Recitation Context
- Reader Pager & Follow
- Sidebar & Rub List
- Quran Safha Rendering
- Mushaf Context Sync
- Reader Page & Words
- Miscellaneous Nodes
- Marker Color & Accessibility
- Font Scale & View Context
- PWA & Language Toggle
- Notification Channel Tests
- Plan Assignment Widgets
- My Marks List
- Marks Access API
- Mark Modal
- Recitation Settings
- Recitation QDC Provider
- Service Worker
- Marks Model Unification
- Auth Middleware
- Font Face Injection
- Mushaf Editions API
- Quran Word Highlighting
- Notification Dispatch
- Mobile Safha Decisions
- Nav & Notification Components
- Awrad Learning Design
- Reminders Cron Route
- Marks DB Route
- Plan Enrollment UI
- Quran Rendering Standards
- Search Routes
- Database Split Decisions
- Notification Content Types
- Release Workflow Components
- Dark Theme Unification
- Page Turn Reliability Fixes
- Quran Spread Component
- Marks Hook
- API Conventions & Purpose
- Mobile Safha Sizing Fixes
- Search & Font Fixes
- Surah Banner & Tajweed Font
- Swipe & Cache Fixes
- Notification Repository
- Email Transport
- Font Rendering Decisions
- Quran Seeder & Release
- Listening Wird Playback
- Plans DB Routes
- Quran Vertical Pages
- Multi-Theme Architecture
- Prisma Migrations Deploy
- Base Notification System
- Double-Page Toggle
- Recitation Playback Core
- Plan-Task Workflow
- Prisma & Auth Fixes
- Cache & Swipe Fixes
- Sentry Slack Alert Route
- Dialog Accessibility Fixes
- Notification Render Context
- Viewport Fit Decisions
- Database Architecture
- Dark Theme Color Semantics
- Protected Route Workflow
- Git Workflow Skills
- Mushaf Share Code Route
- Theme Toggle
- Plans Components
- fq-logger Observability
- Reader Line Rhythm
- Reader Persistent Pager
- UI Motion Guidance
- Ship & Commit Workflow
- Mark Model ADRs
- App Purpose
- Mushaf Sharing Components
- PWA Offline Support
- Font Size Constraints
- Miscellaneous Nodes
- Miscellaneous Nodes
- Reader Hydration Fixes
- AI Docs Workflow System
- Dark Theme Handoff Session
- Mark Modal Motion & Delete
- Arabic Search & Font Fixes
- i18n Setup
- Font Constants
- Prisma App Migrations
- Plan Engine Design
- Theme Token System
- Notification Channel Registry
- Arrow Controls Desktop
- Mobile Nav UX
- Miscellaneous Nodes
- Desktop Search Stacking Fix
- ViewingChip i18n Fix
- Global Error Boundary
- Marks Localhost Fix
- Sentry Integration ADRs
- Reader Surface Depth
- Design System Foundation
- Rub List Sidebar Enhancement
- PWA Fullscreen Focus Mode
- Prod Branch Protection
- Miscellaneous Nodes
- Miscellaneous Nodes
- Bounded Revalidate ADR
- Quran Page Components
- Arrow Controls Animation
- CI Node20 Bump
- Suspense Boundaries
- Miscellaneous Nodes
- Component Location Guide
- Memoization & Props Pattern
- Page Metadata Schema
- i18n Locale Usage
- Eastern Arabic Numerals
- Retrospect Save Confirm
- Surah Glyph Font
- MyMarksList Component
- QueryProvider Component
- SessionProvider Component
- API Response Shape
- i18n Decision
- API Error Handling
- Query Parameters Convention
- Path Aliases Convention
- Border Radius Tokens

## God Nodes (most connected - your core abstractions)
1. `useTranslations()` - 87 edges
2. `jsonResponse()` - 58 edges
3. `extractUser()` - 44 edges
4. `toLocaleNumeral()` - 26 edges
5. `getLanguageDirection()` - 22 edges
6. `getNotificationDeps()` - 18 edges
7. `appPrisma` - 18 edges
8. `useQuranMushaf()` - 17 edges
9. `getQueryClient()` - 16 edges
10. `ReaderPager()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Future Two-Page Book Layout (Recto/Verso)` --semantically_similar_to--> `Mushaf Double-Page Spread (Pairing, Data-Fetch, Decoration)`  [INFERRED] [semantically similar]
  docs/architecture/APP_PURPOSE.md → docs/architecture/adr/0013-mushaf-double-page-spread.md
- `Fix Homepage CDN Cache Poisoning (Hostinger Edge)` --semantically_similar_to--> `Fix RSC Cache Poisoning on Hostinger`  [INFERRED] [semantically similar]
  docs/plans/fix-homepage-cdn-cache-poisoning.md → docs/plans/fix-rsc-cache-poisoning.md
- `Viewport-Fit Sizing for the Mushaf Page` --semantically_similar_to--> `Mobile Safha Sizing: Width-Driven Font, Flexbox Height Fill`  [INFERRED] [semantically similar]
  docs/architecture/adr/0004-quran-safha-viewport-fit.md → docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md
- `Trello #157 panel placeholder reflow flicker bug` --semantically_similar_to--> `Desktop Reading-Desk Pass 1 (depth from light, ≥1367px)`  [INFERRED] [semantically similar]
  docs/plans/arrow-controls-desktop.md → docs/plans/dark-theme-mushaf-unification.md
- `GET()` --calls--> `jsonResponse()`  [EXTRACTED]
  app/api/quran/pages/[pageId]/bounds/route.ts → app/api/response.ts

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

## Communities (141 total, 23 thin omitted)

### Community 0 - "Mushaf Sharing & Notifications"
Cohesion: 0.07
Nodes (37): NotificationListResponse, GenerateCodeCard(), GrantedViewersList(), Props, MushafHub(), PersonAvatar(), Props, Props (+29 more)

### Community 1 - "Reader Navigation & Font Injection"
Cohesion: 0.05
Nodes (41): QuranSwipeNav component (mobile swipe reader), ADR 0019: sessionStorage key for cross-page swipe direction, ADR 0020: Client Component required for inline <style> injection, FontFaceInjector.tsx (Client Component), ReaderPage Server Component, Cross-chapter stop-point chaining (Juz/Hizb/Rub stop points), data-fq-word attribute highlight mechanism (supersedes DOM ref registry), QDC runtime proxy (app/api/quran/recitations) (+33 more)

### Community 2 - "Plans List & Progress"
Cohesion: 0.11
Nodes (30): PlanProgressHistoryEntry, TodayPlanAssignments, EDIT_VIEW_FOR_TEMPLATE, groupHistoryByDate(), PlanCard(), PlanHistorySection(), STATUS_ACTIONS, STATUS_LABEL (+22 more)

### Community 3 - "Account & Nav Components"
Cohesion: 0.11
Nodes (20): AccountCard(), FurqanLogo(), MarksLink(), Nav(), PlansLink(), SharedMushafLink(), UserMenu(), NotificationBell() (+12 more)

### Community 4 - "Auth Routes & Marks Prompt"
Cohesion: 0.10
Nodes (20): handler, authOptions, MarksSignedOutPrompt(), AccessRemovedBanner(), ADR-0012, SignedOutPrompt(), getRubs(), ADR-0033 (+12 more)

### Community 5 - "Plan Engine & Streak"
Cohesion: 0.14
Nodes (24): GET(), ADR-0030, PlanTemplate, UserPlanParams, addDays(), assignRange(), clampQuantity(), cursorAdvanceTarget() (+16 more)

### Community 6 - "Marks API Routes"
Cohesion: 0.15
Nodes (21): DELETE(), ADR-0012, GET(), ADR-0012, POST(), ALLOWED_PUSH_HOSTS, DELETE(), hashEndpoint() (+13 more)

### Community 7 - "Plans API Routes"
Cohesion: 0.11
Nodes (24): PATCH(), ADR-0030, GET(), POST(), serializePlan(), toDateString(), withTargetJuz(), MissedDayPolicy (+16 more)

### Community 8 - "Dark Theme Depth Handoff"
Cohesion: 0.07
Nodes (31): Seeder guard+reset+fetch+insert algorithm, scripts/quran-seed/seed.js orchestrator, ADR 0027 — tablet swipe carousel, 3-panel tablet swipe carousel, Tablet Nav Overlay Effect, Mobile reader UX addendum (nav overlay, long-press), --mushaf-* printed-mushaf CSS tokens, NavOverlayContext (+23 more)

### Community 9 - "Recitation Context"
Cohesion: 0.13
Nodes (27): QURAN_LAST_CHAPTER_ID, getInitialSettings(), RecitationContext, RecitationContextType, RecitationProvider(), resolveStopTarget(), setWordHighlightClass(), ADR-0013 (+19 more)

### Community 10 - "Reader Pager & Follow"
Cohesion: 0.10
Nodes (23): computeSpreadNav(), NavHrefs, Panel, PanelProps, Props, stepAnchor(), ADR-0028, ADR-0029 (+15 more)

### Community 11 - "Sidebar & Rub List"
Cohesion: 0.13
Nodes (20): Props, Sidebar(), buildJuzGroups(), JuzGroup, Props, RubList(), ADR-0033, SearchBar() (+12 more)

### Community 12 - "Quran Safha Rendering"
Cohesion: 0.09
Nodes (20): Bismillah calligraphy SVG (decorative Arabic glyph: "Bismillah ir-Rahman ir-Raheem"), LineProps, QuranLine(), ADR-0025, NO_LINES, QuranSafhaProps, SKELETON_BARS, tailwindFontUtility (+12 more)

### Community 13 - "Mushaf Context Sync"
Cohesion: 0.13
Nodes (23): MushafSwitchSync(), Props, ADR-0021, ADR-0033, ReaderPager(), getInitialMushafId(), QuranMushafContext, QuranMushafContextType (+15 more)

### Community 14 - "Reader Page & Words"
Cohesion: 0.10
Nodes (19): ReaderPage(), ReaderPageProps, ADR-0012, ADR-0013, ADR-0028, getPageWords(), GLYPH_FIELD, PageWords (+11 more)

### Community 15 - "Miscellaneous Nodes"
Cohesion: 0.08
Nodes (27): ADR 0009 — reproducible Quran seeder, Reproducible Quran Database Seeder, ADR 0012 — shared mushaf access, Shared Mushaf Access, Mark author attribution (Marked by X), MushafAccessGrant model, MushafShareCode model, ViewingChip component (+19 more)

### Community 16 - "Marker Color & Accessibility"
Cohesion: 0.11
Nodes (17): MarkerColorPicker(), Props, AccessibleMushafList(), Props, JuzRangeSlider(), Props, RecitationSettingsSheet(), metadata (+9 more)

### Community 17 - "Font Scale & View Context"
Cohesion: 0.12
Nodes (20): getInitialQuranFontScale(), QuranFontScaleContext, QuranFontScaleContextType, QuranFontScaleProvider(), getInitialView(), QuranSafhaViewContext, QuranSafhaViewContextType, QuranSafhaViewProvider() (+12 more)

### Community 18 - "PWA & Language Toggle"
Cohesion: 0.15
Nodes (16): LANGUAGES, LanguageToggle(), QuranFontScaleControls(), QuranSafha(), SettingsSidebar(), NavOverlayContext, NavOverlayContextValue, NavOverlayProvider() (+8 more)

### Community 19 - "Notification Channel Tests"
Cohesion: 0.15
Nodes (14): createEmailChannel(), fallbackEmail(), baseInput, fakeLogger, createInAppChannel(), createPushChannel(), baseInput, fakeLogger (+6 more)

### Community 20 - "Plan Assignment Widgets"
Cohesion: 0.19
Nodes (17): formatRange(), PlanAssignmentRow(), Props, inRange(), PlansWidget(), RecitationPlayerBar(), ADR-0021, PLAN_ACTIVITY_UI (+9 more)

### Community 21 - "My Marks List"
Cohesion: 0.15
Nodes (15): MarkListItem, MarksPage, chipByCategory, commentPreview(), FILTERS, groupBySurah(), MyMarksList(), SurahGroup (+7 more)

### Community 22 - "Marks Access API"
Cohesion: 0.20
Nodes (18): deleteMark(), getGrantForViewer(), MarkBody, MarkWithAuthor, ADR-0012, ADR-0025, upsertMark(), withAuthorNames() (+10 more)

### Community 23 - "Mark Modal"
Cohesion: 0.13
Nodes (17): getTitle(), MarkedByLine(), MarkModal(), ModalProps, ADR-0012, ADR-0025, ADR-0028, getWordAudioUrl() (+9 more)

### Community 24 - "Recitation Settings"
Cohesion: 0.13
Nodes (18): CustomRangePicker(), nextRepeatCount(), RANGE_TYPE_OPTIONS, ReciterCombobox(), RepeatStepper(), STOP_POINT_OPTIONS, SurahCombobox(), DEFAULT_RECITATION_SETTINGS (+10 more)

### Community 25 - "Recitation QDC Provider"
Cohesion: 0.15
Nodes (14): RecitationProvider, RecitationProviderError, QdcAudioFile, QdcReciter, QdcVerseTiming, ActiveOverride, ChapterAudio, PlaybackOverride (+6 more)

### Community 26 - "Service Worker"
Cohesion: 0.12
Nodes (15): fontUrl(), jsonUrl(), precacheAllPages(), PrecacheMessage, PushNotificationData, PushSubscriptionChangeEvent, reportProgress(), serwist (+7 more)

### Community 27 - "Marks Model Unification"
Cohesion: 0.12
Nodes (20): ADR 0017 — App DB uses migrations, not db push, ADR 0022 — verse/word comments as mark type (superseded), ADR 0024 — color marks encode category (amended), ADR 0025 — a mark is one row: category plus optional comment, Unify Marks: Category + Optional Comment, MarkModal.tsx (single picker+comment flow), Mark Prisma model (category + comment), MyMarksList.tsx (category tabs, follow-on responsive filter) (+12 more)

### Community 28 - "Auth Middleware"
Cohesion: 0.17
Nodes (11): isJSONRequest(), protectedRoutes, ADR-0012, ADR-0030, ADR-0037, withAuth(), CustomMiddleware, MiddlewareWrapper (+3 more)

### Community 29 - "Font Face Injection"
Cohesion: 0.17
Nodes (15): FontFaceInjector(), nextKept(), Props, ADR-0023, ADR-0028, ADR-0029, useLruIds(), MushafEdition (+7 more)

### Community 30 - "Mushaf Editions API"
Cohesion: 0.17
Nodes (12): GET(), isTextScope(), resolvePageStop(), Scope, SCOPE_FIELD, ADR-0033, ADR-0033, DEFAULT_MUSHAF_ID (+4 more)

### Community 31 - "Quran Word Highlighting"
Cohesion: 0.15
Nodes (13): QuranWord, QuranWordProps, ADR-0021, ADR-0024, ADR-0025, COMMENT_PREVIEW_CHAR_LIMIT, MARK_CATEGORIES, MARKS_PAGE_LIMIT (+5 more)

### Community 32 - "Notification Dispatch"
Cohesion: 0.19
Nodes (14): getNotificationType(), NOTIFICATION_TYPES, DispatchDeps, DispatchInput, dispatchNotification(), DispatchOutcome, dispatchToUsers(), baseDeps() (+6 more)

### Community 33 - "Mobile Safha Decisions"
Cohesion: 0.13
Nodes (16): Mobile Safha Sizing: Width-Driven Font, Flexbox Height Fill, Surah Banner Positions as Denormalized Fields on PageMetadata, MarkerColorPicker, MarkModal, Panel, QuranLine, QuranMushafContext, QuranSafha (+8 more)

### Community 34 - "Nav & Notification Components"
Cohesion: 0.15
Nodes (16): FurqanLogo, MarksLink, Nav, NotificationBell, NotificationFeed, NotificationItem, PlansLink, RubList (+8 more)

### Community 35 - "Awrad Learning Design"
Cohesion: 0.13
Nodes (16): Design Principles, Manuscript-inspired reading app character, Circular navigation button style (52px, thin lucide icons), Ornamental elements (corner star ornaments, diamond separators), ADR 0008 no cross-domain FK (referenced), ADR 0014 offline write-queueing (referenced), ADR 0030 Plan engine derived assignments (referenced), Daily Awrad & Learning Plans Engine (Foundation) (+8 more)

### Community 36 - "Reminders Cron Route"
Cohesion: 0.22
Nodes (12): dynamic, GET, handle(), isAuthorized(), POST, advanceOneDay(), getTimezoneOffsetMs(), isDue() (+4 more)

### Community 37 - "Marks DB Route"
Cohesion: 0.20
Nodes (11): buildVerseSnippet(), GET(), getSortKey(), ADR-0025, VALID_CATEGORIES, POST(), ADR-0012, GET() (+3 more)

### Community 38 - "Plan Enrollment UI"
Cohesion: 0.17
Nodes (10): UserPlanListItem, EDITABLE_QUANTITY_TRACKS, PlanEnrollForm(), Props, PlansBrowseView, Props, View, Props (+2 more)

### Community 39 - "Quran Rendering Standards"
Cohesion: 0.14
Nodes (15): ADR 0002 — Non-page Quran text rendering, ADR 0012 — Mark from_user/to_user ownership, ADR 0025 — Mark granularity, Mark model (verse/word granularity), No FK/relation across Quran/App domains rule, getDirection() helper (app/utils/i18n.ts), Column-Font Contract, Common Rendering Mistakes table (+7 more)

### Community 40 - "Search Routes"
Cohesion: 0.25
Nodes (9): GET(), GET(), isSearchQueryValid(), MIN_SEARCH_QUERY_LENGTH, searchChapters(), searchVerses(), useSearch(), VerseResult (+1 more)

### Community 41 - "Database Split Decisions"
Cohesion: 0.21
Nodes (13): Split Quran Content and Application Data into Two Databases, Mark Model (Cross-Domain Scalar References Only), Reproducible API-Driven Quran Seeder; Prisma Owns furqan_quran Schema, PrismaClient Constructors Must Not Receive Explicit Datasource URLs, Shared Mushaf Access via One-Time Codes and Grant-Scoped Marks, MushafAccessGrant Model, PWA Installability and Offline Quran Page Caching, Versioned Prisma Migrations for furqan_app; db push for furqan_quran (+5 more)

### Community 42 - "Notification Content Types"
Cohesion: 0.23
Nodes (9): NotificationContent, NotificationEmailContent, NotificationTypeDef, PlanDailyReminderPayload, SystemTestPayload, ADR-0037, resolveChannels(), ResolveChannelsResult (+1 more)

### Community 43 - "Release Workflow Components"
Cohesion: 0.20
Nodes (12): Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main), MushafSwitchSync, NavOverlayContext, PlansWidget, ReaderPage, ReaderPageContext, ReaderPager, ReaderPageSync (+4 more)

### Community 44 - "Dark Theme Unification"
Cohesion: 0.23
Nodes (12): Merge three mobile safha ADRs into rewritten ADR 0011, Consolidate Mobile Safha Sizing Docs, ADR 0004 page sizing viewport-fit budget (referenced), ADR 0005 font safelist (referenced), ADR 0011 mobile quran font scale vw formula (referenced), ADR 0032 dark surface depth from light (referenced), Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette, Gutter/binding-crease correction rounds 1-10 (iterative, measured) (+4 more)

### Community 45 - "Page Turn Reliability Fixes"
Cohesion: 0.24
Nodes (11): ADR 0028: Persistent pager, ADR 0029: Immutable font registry, ADR 0034: Page-turn readiness on slow networks, QuranSpread.tsx, ReaderPager.tsx, app/utils/page-font-registry.ts, arrow-controls-desktop.md (#156), OPEN: skeleton renders wider than page, recitation bar resizes (unresolved) (+3 more)

### Community 46 - "Quran Spread Component"
Cohesion: 0.22
Nodes (8): NavHrefs, PagePayload, QuranSpread(), QuranSpreadProps, ADR-0013, ADR-0028, ADR-0034, useIsLgUp()

### Community 47 - "Marks Hook"
Cohesion: 0.25
Nodes (8): ADR-0033, useMarks(), ApiMark, getPageMarks(), PageMark, ADR-0025, getMarkMeta(), ADR-0025

### Community 48 - "API Conventions & Purpose"
Cohesion: 0.18
Nodes (11): docs/architecture/APP_PURPOSE.md, docs/architecture/COMPONENTS.md, docs/design/design-principles.md, API Input Validation rule (422 on failure), jsonResponse(), Legacy page words route (raw NextResponse.json), API Response Envelope, API Route Structure (+3 more)

### Community 49 - "Mobile Safha Sizing Fixes"
Cohesion: 0.18
Nodes (11): Remove Safha Card Background on Mobile, QuranSafha.tsx (bg-card md:-only fix), ADR 0011 — mobile Quran font scale vw formula, --fq-mobile-font width-derived font formula, Mobile Safha: Full-Screen Sizing, QuranSwipeNav.tsx (renamed from QuranPageShell), Post-navigation compositor flicker (accepted platform limitation), Mobile Swipe Page Animation (+3 more)

### Community 50 - "Search & Font Fixes"
Cohesion: 0.20
Nodes (10): ADR 0002: UthmanicHafs1Ver18 global font, app/api/search/chapters/route.ts, app/api/search/verses/route.ts, RubList.tsx, SearchQueryResults.tsx, app/constants/search.ts, app/hooks/use-search.ts, app/layout.tsx (+2 more)

### Community 51 - "Surah Banner & Tajweed Font"
Cohesion: 0.22
Nodes (10): ADR 0004: 15-slot page budget / font scale, ADR 0016: Surah banner (superseded by line_number-gap algorithm), QuranLine.tsx, app/constants/font.ts, app/globals.css, app/surah-frame.svg, KFGQPC glyph licence gate — unresolved blocking precondition (Addendum 8), Fix: Surah Banner Placement and Standalone Line Sizing (+2 more)

### Community 52 - "Swipe & Cache Fixes"
Cohesion: 0.22
Nodes (10): ADR 0013: Mushaf double-page spread (partner font not preloaded), ADR 0014: PWA offline architecture, ADR 0027: QuranSwipeNav remount on navigation, QuranWord.tsx, app/hooks/use-is-tablet.ts, app/hooks/use-pwa-precache.ts, app/sw.ts, Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle (+2 more)

### Community 53 - "Notification Repository"
Cohesion: 0.36
Nodes (8): NotificationChannelKey, createNotificationStore(), toNotificationRow(), toReminderRow(), CreateNotificationInput, DeliveryResult, NotificationRow, ScheduledReminderRow

### Community 54 - "Email Transport"
Cohesion: 0.42
Nodes (6): createLogEmailTransport(), createSmtpEmailTransport(), EmailMessage, EmailTransport, getEmailTransport(), hasSmtpConfig()

### Community 55 - "Font Rendering Decisions"
Cohesion: 0.22
Nodes (10): Encoding for Quran Text Rendered Outside the Page Route, Normalize Hamza-Alif Forms in Incoming Search Query, FontFaceInjector, page-font-registry.ts (ensurePageFonts), QuranFontScaleContext, QuranFontScaleControls, SearchBar, SearchQueryResults (+2 more)

### Community 56 - "Quran Seeder & Release"
Cohesion: 0.27
Nodes (10): ADR 0009 — Reproducible Quran seeder, ADR 0015, ADR 0026, furqan_quran seeder (db push --force-reset), npm run seed:quran -- --force, release workflow (/release), Cut Release (/cut-release), Promote Release (/promote-release) (+2 more)

### Community 57 - "Listening Wird Playback"
Cohesion: 0.20
Nodes (10): activeOverride state ({id,label}), ADR 0033 — mushaf editions (page numbers edition-relative), app/lib/plans/assignment-range.ts (isPageInAssignmentRange, planPlaybackSessionId), GET /api/quran/pages/[pageId]/bounds route (extended with firstVerseKey), decideChapterEnd() (isRepeatableRange param), Addendum — Disable Stop-at/Repeat During an Override, Listening Wird: Inline Playback on Assignment Rows, PlanAssignmentRow component (+2 more)

### Community 58 - "Plans DB Routes"
Cohesion: 0.36
Nodes (8): DELETE(), GET(), POST(), ADR-0030, GET(), toDateString(), getPlanTemplate(), PLAN_DATE_RE

### Community 59 - "Quran Vertical Pages"
Cohesion: 0.28
Nodes (5): Props, QuranPage, VerticalQuranPages(), revalidate, ADR-0035

### Community 60 - "Multi-Theme Architecture"
Cohesion: 0.22
Nodes (9): Multi-Theme Architecture via Named CSS Classes + Dark Layer, AccountCard, EnablePushToggle, LanguageToggle, QuranSafhaViewContext, QuranSafhaViewToggle, SettingsSidebar, ThemeToggle (+1 more)

### Community 61 - "Prisma Migrations Deploy"
Cohesion: 0.22
Nodes (9): ADR 0017 Prisma migrations for App DB (referenced), Deploy Furqan to Hostinger, prisma migrate deploy in Hostinger build script, ADR 0009 furqan_quran seeder db push --force-reset (referenced), ADR 0017 Prisma migrations app DB (referenced), One-time Prisma migration baselining procedure, Adopt Prisma Migrations for furqan_app, connection_limit=5 to 1 rationale (Hostinger 75-connection cap) (+1 more)

### Community 62 - "Base Notification System"
Cohesion: 0.25
Nodes (9): ADR 0037 Notification dispatch and channels (referenced), Notification reminders cron job (hPanel, every 5 min), ADR 0037 Notification dispatch and channels (source ADR), Channel registry pattern (push/email/in-app), dispatch.ts orchestration module, Base Notification System, Reminders cron claim/dispatch flow, Post-review fix batches A-F (32 issues found by /review-fq-work) (+1 more)

### Community 63 - "Double-Page Toggle"
Cohesion: 0.25
Nodes (9): ADR 0013 — mushaf double-page spread, getPagePair() pairing math, Mushaf Double-Page Spread Toggle, QuranSafhaViewContext, QuranSafhaViewToggle.tsx, QuranSpread.tsx, baseFontIds scoping fix (isDouble vs isLgUp), FontFaceInjector.tsx (base fonts via registry, tajweed keyed style) (+1 more)

### Community 64 - "Recitation Playback Core"
Cohesion: 0.28
Nodes (9): ADR 0021 — recitation playback (QDC proxy, audio-driven navigation), chainToNextChapter cross-chapter chaining logic, Addendum 9 — Custom stop-at point (page or verse), QDC audio API (api.qurancdn.com) proxied via RecitationProvider adapter, Addendum 7 — whole-range repeat never looping (currentVerseKeyRef stale bug), RecitationContext.tsx, Add Quran Recitation Playback with Reciter Selection, RecitationSettingsSheet.tsx (+1 more)

### Community 65 - "Plan-Task Workflow"
Cohesion: 0.25
Nodes (9): Core Cycle (Plan → Implement → Review → Ship → Retrospect), plan-fq-task workflow, Existing plan/addendum check (step 0), ADR check step, Plan file format (docs/plans/<slug>.md), Task ticket requirement before implementation, Verify the solution together (decision tree + test cases), retrospect workflow (+1 more)

### Community 66 - "Prisma & Auth Fixes"
Cohesion: 0.29
Nodes (8): ADR 0010: Prisma no explicit datasource URL, app/api/auth/options.ts, app/utils/db.ts, Fix Prisma Connection Exhaustion on Next.js Dev Hot-Reload, Fix Hostinger Auto-Deploy Build Failures, Fix NextAuth JWT/Session Corruption on Transient DB Error, Fix RSC Cache Poisoning on Hostinger, next.config.mjs

### Community 67 - "Cache & Swipe Fixes"
Cohesion: 0.25
Nodes (8): ADR 0011: Mobile Quran font scale vw formula, ADR 0035: Bounded revalidate on static document routes, QuranSwipeNav.tsx (renamed from QuranPageShell), app/[locale]/page.tsx, app/[locale]/pages/[id]/page.tsx, app/[locale]/pages/vertical/page.tsx, Fix Homepage CDN Cache Poisoning (Hostinger Edge), Fix Reversed Mobile Swipe Navigation Direction

### Community 68 - "Sentry Slack Alert Route"
Cohesion: 0.32
Nodes (7): buildSlackMessage(), isValidSignature(), LEVEL_EMOJI, POST(), SentryAlertPayload, ADR-0019, ADR-0018

### Community 69 - "Dialog Accessibility Fixes"
Cohesion: 0.29
Nodes (8): MarkModal.tsx, Sidebar.tsx, QuranSafha.tsx, SearchBar.tsx, SettingsSidebar.tsx, SignInModal.tsx, Fix Dialog Missing Title/Description A11y Warnings, Fix MarkModal Auth Gate — Allow Recitation Without Sign-in

### Community 70 - "Notification Render Context"
Cohesion: 0.39
Nodes (7): RenderContext, buildRenderContext(), interpolate(), loadMessages(), lookup(), messagesCache, toSafeLocale()

### Community 71 - "Viewport Fit Decisions"
Cohesion: 0.39
Nodes (8): Viewport-Fit Sizing for the Mushaf Page, FONT_V1 (vh-Derived Font Scale Model), Tailwind Safelist for Dynamic Quran Font-Size Classes, Minimum Floor for vh-Derived Quran Font Size and Spacing, Mushaf Double-Page Spread (Pairing, Data-Fetch, Decoration), RecitationPlayerBar, Desktop Reading Group (>=1367px Vertical Rail), Nav Z-Index Invariant (relative z-10)

### Community 72 - "Database Architecture"
Cohesion: 0.29
Nodes (8): ADR 0008 — Quran/App Database Split, Data Fetching pattern (Prisma vs React Query), Server vs Client Components rule, Connection limit=1 constraint (Hostinger 75 cap), furqan_app database, furqan_quran database, quranPrisma / appPrisma clients, Database Stack (MySQL, two DBs)

### Community 73 - "Dark Theme Color Semantics"
Cohesion: 0.29
Nodes (8): ADR 0031: Dark theme - gold marks Mushaf identity, emerald marks interaction, Emerald tokens (--primary, --accent, --ring), Gold tokens (--gold, --mushaf-ornament, --surah-frame-gold), Monotonic brightness ladder verification method (sampled pixels), ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision), Flat --mushaf-paper page fill (graded-light ramp removed, all themes), fq-spread-col align-items stretch chain + space-between line rhythm, ADR 0036: The desktop reader fills its height band, leftover height becomes line rhythm

### Community 74 - "Protected Route Workflow"
Cohesion: 0.25
Nodes (7): docs/architecture/DECISIONS.md, docs/plans/release-branch-workflow.md, auth-middleware (middleware.ts), Adding a Protected Route workflow, Load context gate (DECISIONS.md + ADRs + standards), review-fq-work workflow, Review dimensions (Bugs, Quality, Plan Consistency)

### Community 75 - "Git Workflow Skills"
Cohesion: 0.29
Nodes (8): ~/.claude/hooks/block-dangerous-git.sh (removed global hook), commit-staged skill, /confirm-dangerous-git skill, Git Workflow Skills (commit/push gating), /ship-fq-task skill, ~/.claude/furqan-worktrees.json state file, Git Worktrees Workflow Integration, /start-fq-task skill (worktree creation)

### Community 76 - "Mushaf Share Code Route"
Cohesion: 0.38
Nodes (5): GET(), POST(), ADR-0012, ADR-0019, generateShareCode()

### Community 77 - "Theme Toggle"
Cohesion: 0.43
Nodes (5): themes, ThemeToggle(), getInitialTheme(), Theme, useTheme()

### Community 78 - "Plans Components"
Cohesion: 0.33
Nodes (7): AddPlanButton, JuzRangeSlider, MyPlansList, PlanAssignmentRow, PlanEnrollForm, PlansBrowseDialog, PlansTodayHero

### Community 79 - "fq-logger Observability"
Cohesion: 0.29
Nodes (7): ADR 0019 — fq-logger Sentry integration, Edge console-based logger shim, fq-logger: Structured Logging & Observability, pino (Node logging library), redact.ts sensitive key redaction, logger.error() Sentry bridge, withRequestId middleware

### Community 80 - "Reader Line Rhythm"
Cohesion: 0.33
Nodes (7): ADR 0036 — reader fills height band, min-height:800px gate for rhythm fill, Reader Rhythm: Claim Unused Vertical Space Into Line Gaps, fq-reader-spread-container flex:1 + space-between fill, Recitation Bar: Vertical Rail (Desktop), RecitationPlayerBar.tsx (rail vs bar layout), RecitationPlayerBar.tsx (persistent bottom bar)

### Community 81 - "Reader Persistent Pager"
Cohesion: 0.33
Nodes (7): ADR 0028 — reader persistent pager, ADR 0029 — immutable page font registration, app/utils/page-font-registry.ts (immutable FontFace registry + LRU), ReaderPager.tsx (client persistent pager), Reader Swipe Performance: Persistent Client Pager, RecitationFollow leaf component (pager-owns-follow), Slim static content JSON pipeline (public/quran/pages/{n}.json)

### Community 82 - "UI Motion Guidance"
Cohesion: 0.33
Nodes (7): Animation rule (tailwindcss-animate not installed), ui-motion guidance, Motion accessibility (prefers-reduced-motion, hover gating), Should this even animate? frequency table, Component states motion rules, Easing and duration rules, Motion performance rules (transform/opacity only)

### Community 83 - "Ship & Commit Workflow"
Cohesion: 0.33
Nodes (7): commit-staged / commit-message workflow, confirm-dangerous-git workflow, Workflow Index, ship-fq-task workflow, No AI signatures rule, terse mode (mujaz), mujaz-mode.js hook + .mujaz-off flag

### Community 84 - "Mark Model ADRs"
Cohesion: 0.33
Nodes (6): Mark model (Prisma), ADR 0022: Store word/verse comments as Mark.mark_type=note, mark_value widened to TEXT, ADR 0024: Color marks encode a semantic category, not a color, MARK_CATEGORIES config table, ADR 0025: A mark is one row - category plus optional comment, Mark model v2 (category + comment columns)

### Community 85 - "App Purpose"
Cohesion: 0.33
Nodes (6): Furqan (Quran Memorization Tool), Minimize Distraction During Reading (UX Principle), RTL as Primary Direction, Teacher-Student Collaborative Annotation, Future Two-Page Book Layout (Recto/Verso), Word/Verse-Level Highlighting and Annotation

### Community 86 - "Mushaf Sharing Components"
Cohesion: 0.33
Nodes (6): AccessibleMushafList, AccessRemovedBanner, GenerateCodeCard, GrantedViewersList, MushafHub, RedeemCodeCard

### Community 87 - "PWA Offline Support"
Cohesion: 0.40
Nodes (6): ADR 0014 — PWA offline architecture, app/manifest.ts PWA manifest, Middleware matcher fix (icons/* exclusion), PWA Conversion + Offline Quran Page Reading, app/sw.ts Serwist service worker, use-pwa-precache.ts hook

### Community 88 - "Font Size Constraints"
Cohesion: 0.33
Nodes (6): ADR 0006 — Quran font size minimum floor, FONT_V1 constants (app/constants/font.ts), Quran Font Size: Minimum Floor for Short Viewports, ADR 0004 — Quran safha viewport fit, Quran Safha: Fit Viewport With No Scroll, vh-derived vertical spacing formula (lineGapRatio 0.417)

### Community 89 - "Miscellaneous Nodes"
Cohesion: 0.40
Nodes (6): /cut-release skill, DB change flags in release notes, /promote-release skill, /promote-to-staging skill, /release orchestrator skill, /sync-main-from-prod skill

### Community 90 - "Miscellaneous Nodes"
Cohesion: 0.33
Nodes (6): ADR 0017 — Sentry error tracking, Sentry Error Tracking, instrumentation.ts onRequestError, ADR 0018 — Sentry Slack relay webhook, Sentry-to-Slack Alerting via Relay Webhook, app/api/webhooks/sentry/route.ts relay

### Community 91 - "Reader Hydration Fixes"
Cohesion: 0.40
Nodes (5): ADR 0020: Client component for inline style injection, FontFaceInjector.tsx, ReaderPage.tsx, Fix: Invalid Font MIME Type in Preload Hint, Fix Reader Hydration Mismatch (ReaderPage style injection)

### Community 92 - "AI Docs Workflow System"
Cohesion: 0.40
Nodes (5): AI-First Documentation & Workflow System, Documentation structure (docs/, DECISIONS.md living file, adr/ archive), Task workflow: plan → start → review → retrospect, /retrospect skill plan, Retrospect skill 3-phase workflow (infer, propose, save)

### Community 93 - "Dark Theme Handoff Session"
Cohesion: 0.40
Nodes (5): ADR 0031 gold vs emerald semantics (referenced/revised), ADR 0031 gold vs emerald semantics (referenced), ADR 0032 dark surface depth from light (referenced), Session Handoff — Dark Theme Mushaf Unification, Hard constraints — do NOT break (value-identical theme blocks, gold reader-only, etc.)

### Community 94 - "Mark Modal Motion & Delete"
Cohesion: 0.40
Nodes (5): DELETE mark handler scoped by to_user, Delete My Marks, Fix dead tailwindcss-animate classes in dialog.tsx (plugin not installed), Enhance MarkModal Motion & Polish, MarkerColorPicker radio card group redesign (Radix RadioGroup)

### Community 95 - "Arabic Search & Font Fixes"
Cohesion: 0.40
Nodes (5): ADR 0007 Arabic search query normalization (referenced), Fix: Hamza-Alif Mismatch in Verse Search, normalizeArabicQuery util (hamza-alif normalization), Fix: Ayah Font Not Rendering in Search Results and Mark Modal, Font-encoding contract table (per-page glyph vs UthmanicHafs1Ver18)

### Community 96 - "i18n Setup"
Cohesion: 0.40
Nodes (5): npm run extract-translations, Translation Key Naming convention, i18n/routing.ts locale-aware navigation, i18n Setup (next-intl, ar/en locales), messages/ar.json + messages/en.json

### Community 97 - "Font Constants"
Cohesion: 0.50
Nodes (3): FONT_V1, ADR-0004, ADR-0006

### Community 98 - "Prisma App Migrations"
Cohesion: 0.50
Nodes (4): ADR 0017 — Prisma migrations for App DB, docs/plans/adopt-prisma-migrations.md, furqan_app Prisma migrations workflow, compress-fq-docs workflow

### Community 99 - "Plan Engine Design"
Cohesion: 0.50
Nodes (4): الحصون الخمسة memorization program, ADR 0030: Plan engine - code-defined templates, typed scheduling rules, derived daily assignments, Five typed scheduling rule kinds (fixed_cycle, cursor_advance, trailing_window, completed_cycle, lookahead), UserPlan enrollment + ProgressEntry append-only log

### Community 100 - "Theme Token System"
Cohesion: 0.50
Nodes (4): ADR 0031 — Dark theme gold/emerald semantics, Adding a new theme workflow, Theme system (named CSS classes on html), Theme Token Contract

### Community 101 - "Notification Channel Registry"
Cohesion: 0.50
Nodes (4): ChannelRegistry (createPushChannel/createEmailChannel/createInAppChannel), app/api/cron/reminders/route.ts (claim-token lease cron poll), ADR 0037: Notification dispatch via a channel registry, no queue/worker infra, ADR TEMPLATE.md

### Community 102 - "Arrow Controls Desktop"
Cohesion: 0.50
Nodes (4): ADR 0013 isDouble pair stepping (referenced), ADR 0028 ReaderPager pager invariants (referenced), Arrow Controls on Desktop, Trello #157 panel placeholder reflow flicker bug

### Community 103 - "Mobile Nav UX"
Cohesion: 0.50
Nodes (4): AccountCard.tsx (extracted mobile account card), Mobile Navigation UX, SearchBar.tsx (mobile fullscreen overlay), SidebarContext

### Community 104 - "Miscellaneous Nodes"
Cohesion: 0.50
Nodes (4): docs/architecture/APP_PURPOSE.md, docs/architecture/COMPONENTS.md, UI Workflow Enhancements, /start-fq-task skill (updated)

### Community 105 - "Desktop Search Stacking Fix"
Cohesion: 0.67
Nodes (3): Nav.tsx, Fix Desktop Search Dropdown Hidden by Reader Stacking Context, CSS stacking-context paint-order bug (z:auto DOM-order collision)

### Community 106 - "ViewingChip i18n Fix"
Cohesion: 0.67
Nodes (3): ViewingChip.tsx, use-translations.ts, Fix ViewingChip IntlError: missing {name} interpolation variable

### Community 108 - "Marks Localhost Fix"
Cohesion: 0.67
Nodes (3): addPageMark.ts, getPageMarks.ts, Fix Marks Broken by Hardcoded localhost URL

### Community 109 - "Sentry Integration ADRs"
Cohesion: 1.00
Nodes (3): Sentry Error Tracking via DSN-Presence Gating, Sentry-to-Slack Alerting via Self-Hosted Relay Webhook, fq-logger Wraps Pino and Forwards Error Logs to Sentry

### Community 110 - "Reader Surface Depth"
Cohesion: 0.67
Nodes (3): ADR 0032 — Dark surface depth from light, Reader Surface Depth (Flat Page Face, Edge-Driven Depth), Reader depth token family (--mushaf-rim-*, --reader-chrome-*)

### Community 111 - "Design System Foundation"
Cohesion: 0.67
Nodes (3): ADR 0003 (referenced), Design System Foundation, Named theme classes (.theme-light, .theme-dark) replacing :root/.dark

### Community 112 - "Rub List Sidebar Enhancement"
Cohesion: 0.67
Nodes (3): Enhanced RubList Sidebar, Hizb-aware SVG circle badge arc logic, Sticky juz section headers grouping

### Community 113 - "PWA Fullscreen Focus Mode"
Cohesion: 0.67
Nodes (3): Browser Fullscreen & PWA Status-Bar Focus Mode, Fullscreen API desktop toggle (requestFullscreen/exitFullscreen), PR #155 wrongly hid app chrome instead of browser chrome

### Community 114 - "Prod Branch Protection"
Cohesion: 0.67
Nodes (3): ADR 0015 — prod release branch gating, Protect prod Branch: Enforce Merges from release/* Only, .github/workflows/protect-prod.yml check-source job

### Community 115 - "Miscellaneous Nodes"
Cohesion: 0.67
Nodes (3): ADR 0015 — release-branch workflow, ADR 0026 — staging environment, Release-Branch Deployment Workflow

### Community 116 - "Miscellaneous Nodes"
Cohesion: 0.67
Nodes (3): Store Static Page Metadata in Database, PageMetadata Prisma model, MushafPageMetadata model (per-edition)

## Ambiguous Edges - Review These
- `Static Generation Strategy (604 Quran Pages)` → `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)`  [AMBIGUOUS]
  docs/architecture/adr/0015-release-branch-workflow.md · relation: conceptually_related_to
- `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra` → `ADR TEMPLATE.md`  [AMBIGUOUS]
  docs/architecture/adr/TEMPLATE.md · relation: references
- `docs/plans/release-branch-workflow.md` → `Review dimensions (Bugs, Quality, Plan Consistency)`  [AMBIGUOUS]
  docs/workflow/review-work.md · relation: conceptually_related_to

## Knowledge Gaps
- **520 isolated node(s):** `Props`, `Sidebar`, `ADR-0012`, `MushafGrantPageProps`, `ADR-0012` (+515 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Static Generation Strategy (604 Quran Pages)` and `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra` and `ADR TEMPLATE.md`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `docs/plans/release-branch-workflow.md` and `Review dimensions (Bugs, Quality, Plan Consistency)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTranslations()` connect `Account & Nav Components` to `Mushaf Sharing & Notifications`, `Plans List & Progress`, `Auth Routes & Marks Prompt`, `Plan Enrollment UI`, `Sidebar & Rub List`, `Quran Safha Rendering`, `Theme Toggle`, `Marker Color & Accessibility`, `PWA & Language Toggle`, `Plan Assignment Widgets`, `My Marks List`, `Mark Modal`, `Recitation Settings`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `jsonResponse()` connect `Marks API Routes` to `Reminders Cron Route`, `Marks DB Route`, `Plan Engine & Streak`, `Plans API Routes`, `Sentry Slack Alert Route`, `Mushaf Share Code Route`, `Marks Access API`, `Plans DB Routes`, `Auth Middleware`, `Mushaf Editions API`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `appPrisma` connect `Marks DB Route` to `Auth Routes & Marks Prompt`, `Plan Engine & Streak`, `Marks API Routes`, `Plans API Routes`, `Mushaf Share Code Route`, `Reader Page & Words`, `Marks Access API`, `Email Transport`, `Plans DB Routes`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `Props`, `Sidebar`, `ADR-0012` to the rest of the system?**
  _520 weakly-connected nodes found - possible documentation gaps or missing edges._