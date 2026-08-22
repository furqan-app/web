# Graph Report - furqan-design-migration  (2026-08-22)

## Corpus Check
- 1907 files · ~3,117,787 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 6389 nodes · 13345 edges · 376 communities (321 shown, 55 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 287 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9abfa1c1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SearchBar.tsx
- ADR 0028: Reader uses a persistent client pager over slim static content
- MyPlansList.tsx
- checks.mjs
- [locale]/layout.tsx
- constants/plans.ts
- stop-point/route.ts
- plans/route.ts
- Tablet Nav Overlay Effect
- RecitationContext.tsx
- ReaderPager.tsx
- useTranslations
- QuranSafha.tsx
- live-browser.js
- modern-screenshot.umd.js
- Shared Mushaf Access
- live-server.mjs
- design-system.mjs
- SettingsSidebar.tsx
- el
- dispatch.ts
- MyMarksList.tsx
- jsonResponse
- use-translations.ts
- RecitationSettingsSheet.tsx
- e2e-fixture/generate.js
- sw.ts
- MyMarksList.tsx client component
- auth-middleware.ts
- detect-antipatterns-browser.js
- context.mjs
- hook-lib.mjs
- notifications/types.ts
- QuranSafha
- Nav
- Daily Awrad UI
- Regression Classes
- Fix Reader Navigation Infinite Render Loop
- concept-seed.mjs
- Column-Font Contract
- setLiveState
- Split Quran Content and Application Data into Two Databases
- compilerOptions
- ReaderPager
- Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette
- Page Turn Blanks the Reader on Slow Networks
- initPageChat
- PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit
- start-task Load context gate
- Mobile Safha: Full-Screen Sizing
- Fix: Verse Rendering Outside the Quran Page
- Fix: Surah Banner Placement and Standalone Line Sizing
- Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle
- deps.ts
- live-commit-manual-edits.mjs
- Font System (Immutable FontFace Registry)
- release workflow (/release)
- PlanAssignmentRow component
- scripts
- detect-text.mjs
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
- impeccable-config.mjs
- Tailwind Safelist for Dynamic Quran Font-Size Classes
- quranPrisma / appPrisma clients
- ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision)
- docs/architecture/DECISIONS.md
- /ship-fq-task skill
- resumeSession
- live-accept.mjs
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
- css-cascade.mjs
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
- manifest.ts
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
- hook-before-edit.mjs
- devDependencies
- components.json
- hook-admin.mjs
- mujaz-stats.js
- AGENTS.md
- app/layout.tsx
- manual-apply.mjs
- Addendum — Wrong surah name on shared multi-surah pages (2026-08-16)
- visual.spec.ts
- live-wrap.mjs
- extract-translations.js
- /promote-to-staging
- /ui-motion
- Configure Project-Local Trello MCP for Codex
- Fix Navbar Icon Overflow on Mobile/Tablet
- Homepage Surah Card: Direction-Based Name Display
- Keep Mobile/Tablet Screen Active While App Is Open
- Save Last Read Page + Navbar Link to Resume
- detect-antipatterns.mjs
- dependencies
- /plan-fq-task
- Steps
- /review-fq-work
- /start-fq-task
- setup.js
- /ship-fq-task
- next.config.mjs
- detect-html.mjs
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
- doctor.mjs
- graphify-sync-rebuild.sh
- mujaz-statusline.sh
- commit-staged/SKILL.md
- svelte-component.mjs
- clsx
- rel
- live-poll.mjs
- generate-image.mjs
- applyEditing
- layout.md
- initGlobalBar
- next-auth
- next-intl
- impeccable/SKILL.md
- parseAnyColor
- live-copy-edit-agent.mjs
- @radix-ui/react-popover
- @radix-ui/react-radio-group
- @radix-ui/react-slider
- injected/index.mjs
- scanCssTextForPulsingDot
- @radix-ui/react-tabs
- Mushaf Page Frame — Designer Asset Spec
- showToast
- react-virtuoso
- roots.mjs
- critique-storage.mjs
- @serwist/next
- tailwind-merge
- @tanstack/react-query
- @types/nodemailer
- collectVisualContrastCandidates
- handleManualEditActivity
- live-manual-edit-evidence.mjs
- Responsive Design
- event-validation.mjs
- ReaderLabSettingsSidebar.tsx
- checkQuality
- live-status.mjs
- playwright.config.ts
- postcss.config.mjs
- sentry.client.config.ts
- tailwind.config.ts
- GET
- POST
- Bismillah calligraphy SVG (decorative Arabic glyph: "Bismillah ir-Rahman ir-Raheem")
- Decorative surah banner frame graphic (surah-frame.svg)
- Offline Recitation Audio Download
- Home Page Design Fixes
- insert-ui.mjs
- svelte-ast.mjs
- generate-mushaf-thumbnails.js
- live.md
- onboard.md
- accept-css.mjs
- runHook
- manual-edit-routes.mjs
- resolveLengthPx
- live-inject.mjs
- Design System: Furqan
- Changes
- The Toolkit
- collectBrowserFindings
- onAnnotDown
- 5.1 — Page face and reader
- Trello → GitHub Issues Migration Plan
- resolveLiveInjectionAnchor
- tanstack-adapter.mjs
- Furqan Design Language
- 4.3 — Search and settings surfaces
- quran-json/generate.js
- impeccable-paths.mjs
- live.mjs
- checkQuality
- session-store.mjs
- staleness-deep.mjs
- sveltekit-adapter.mjs
- edge.ts
- serve-question.mjs
- detect-utils.mjs
- Nocturnal Reader Lab — Desktop RTL
- animate.md
- Handle `generate`
- context-signals.mjs
- Wire /impeccable into the plan/implement/review workflow
- 4.1 — Marks and plans screens
- 4.4 — Mushaf hub and shared-grant surfaces
- Session handoff — design migration (#360)
- Generate Report
- tag-strategy.mjs
- 2.1 — Semantic tokens
- 4.2 — Home screen
- seed.js
- Impeccable Asset Producer
- optimize.md
- sampleCssBackground
- SAFE_TAGS
- sampleCssBackground
- template-extensions.mjs
- 3.2 — Shared chrome
- Scan mode (approach C: auto-extract, then confirm descriptive language)
- constants.mjs
- frameworks/index.mjs
- pin.mjs
- Design Migration — reader-lab language, app-wide
- Simplify the Design
- Hardening Dimensions
- scheduleLazyVisualContrast
- StaticElement
- ui-core.mjs
- journal.mjs
- generation-preflight.mjs
- Product
- clarify.md
- critique.md
- Nielsen's 10 Heuristics
- New visual work
- polish.md
- quieter.md
- checkTextOcclusionDOM
- collectNumberedSectionLabelCandidates
- renderGroupedTemplate
- palette.mjs
- 0042-pwa-launch-resolves-before-first-paint.md
- Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav)
- Plan: Set `font-tajawal` globally on app root & Tailwind `sans`
- Safha Ribbon Indicator
- api/marks/route.ts
- Generate Combined Critique Report
- Init flow
- collectVisualContrastCandidates
- applyDeferredSvelteComponentAccepts
- Addendum — 2026-08-15: `popstate` can't stop the browser's own hard reload; use the Navigation API where available
- Nav: Dedupe NavPillLink classNames into Shared Component
- 0.1 — Light and gold variants in the lab
- 0.2 — The mushaf page face in the lab
- 0.3 — Small-screen composition in the lab
- 1.1 — Rewrite the canon
- 3.1 — UI primitives
- Fix Tajweed Mushaf Swipe Flicker
- Unify Tajweed toggle + offline downloads into one Mushaf Layout setting
- Addendum — 2026-08-14: cold launch flashes the home page before redirecting
- Restructure Navigation for Clean UX
- Unify Accents: Replace Gold Accents and Ornaments with Emerald Green
- Common Cognitive Load Violations
- Operate mode depth (and Read notes)
- Shape
- ADR 0047: Adopt the reader-lab design language app-wide, canon first
- slice.py
- Close Overlays on Back-Swipe (Mobile/Tablet PWA)
- 0.4 — Write the design-language spec
- Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA)
- Fix Sidebar Bottom Clip
- Addendum — 2026-08-14: swipe after a language switch reverts to Arabic page 1
- Restore Continue Reading nav icon on installed PWA
- colorize.md
- Persona-Based Design Testing
- Extract Flow
- live-setup.md
- css
- checkRadialSpotlight
- scaffoldSvelteComponentSession
- Addendum — surah Sidebar was missed by the notifyNavigating fix (2026-08-16)
- Android platform
- Generate Report
- Cognitive Load Assessment
- Impeccable Finish Reviewer
- Impeccable Manual Edit Applier
- ADR 0043: Overlays close on back-gesture via a shared history guard, coordinated with AndroidBackExitGuard
- verses-words.js
- Diagnostic Scan
- /impeccable hooks
- normalizeGitHubEvent
- /visualize-fq-design
- ADR 0040: Double-push history guard for Android PWA back-to-exit
- 0042 — PWA Cold Launch Resolves Before First Paint
- PWA Testing (Browser Pane, No Device)
- Impeccable Documenter
- hook.mjs
- ADR 0043: Breakpoint-Dependent Positioning Must Be CSS-Gated, Not JS-Hook-Gated
- ADR 0045: Use the Navigation API to intercept the overlay-close back-gesture, with a popstate fallback
- Heuristics Scoring Guide
- detect.mjs
- measure.py
- preview.py
- tune-vars.js
- axios
- check-linefit.js
- @radix-ui/react-dropdown-menu

## God Nodes (most connected - your core abstractions)
1. `useTranslations()` - 112 edges
2. `cn()` - 86 edges
3. `el()` - 72 edges
4. `jsonResponse()` - 60 edges
5. `extractUser()` - 44 edges
6. `runHook()` - 40 edges
7. `collectBrowserFindings()` - 36 edges
8. `parseAnyColor()` - 36 edges
9. `toLocaleNumeral()` - 34 edges
10. `parseAnyColor()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `createPushChannel()` --indirect_call--> `payload()`  [INFERRED]
  app/lib/notifications/channels/push.ts → .claude/skills/impeccable/scripts/hook-lib.mjs
- `GET()` --indirect_call--> `v()`  [INFERRED]
  app/api/marks/route.ts → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `PlanEnrollForm()` --indirect_call--> `v()`  [INFERRED]
  app/components/plans/PlanEnrollForm.tsx → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `resolvePlanParams()` --indirect_call--> `v()`  [INFERRED]
  app/lib/plans/validate-params.ts → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `derivePageMetadata()` --indirect_call--> `v()`  [INFERRED]
  scripts/quran-seed/derive.js → .claude/skills/impeccable/scripts/modern-screenshot.umd.js

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

## Communities (376 total, 55 thin omitted)

### Community 0 - "SearchBar.tsx"
Cohesion: 0.12
Nodes (23): AccessibleMushafList(), Props, GenerateCodeCard(), GrantedViewersList(), Props, MushafHub(), PersonAvatar(), Props (+15 more)

### Community 1 - "ADR 0028: Reader uses a persistent client pager over slim static content"
Cohesion: 0.05
Nodes (41): QuranSwipeNav component (mobile swipe reader), ADR 0019: sessionStorage key for cross-page swipe direction, ADR 0020: Client Component required for inline <style> injection, FontFaceInjector.tsx (Client Component), ReaderPage Server Component, Cross-chapter stop-point chaining (Juz/Hizb/Rub stop points), data-fq-word attribute highlight mechanism (supersedes DOM ref registry), QDC runtime proxy (app/api/quran/recitations) (+33 more)

### Community 2 - "MyPlansList.tsx"
Cohesion: 0.08
Nodes (45): PlanProgressHistoryEntry, TodayPlanAssignments, OfflineProgressBar(), Props, OfflineRecitationSheet(), EDIT_VIEW_FOR_TEMPLATE, groupHistoryByDate(), PlanCard() (+37 more)

### Community 3 - "checks.mjs"
Cohesion: 0.04
Nodes (132): borderColorsFromStyle(), borderWidthsFromStyle(), checkBorders(), checkClippedOverflow(), checkColors(), checkEdgeFlushCardsDOM(), checkElementAIPaletteDOM(), checkElementBlinkingCursorDOM() (+124 more)

### Community 4 - "[locale]/layout.tsx"
Cohesion: 0.05
Nodes (43): handler, authOptions, UserPlanListItem, MarksSignedOutPrompt(), AccessRemovedBanner(), ADR-0012, SignedOutPrompt(), AddPlanButton() (+35 more)

### Community 5 - "constants/plans.ts"
Cohesion: 0.09
Nodes (39): DELETE(), POST(), ADR-0030, GET(), toDateString(), GET(), ADR-0030, getPlanTemplate() (+31 more)

### Community 6 - "stop-point/route.ts"
Cohesion: 0.38
Nodes (6): GET(), isTextScope(), resolvePageStop(), Scope, SCOPE_FIELD, ADR-0033

### Community 7 - "plans/route.ts"
Cohesion: 0.17
Nodes (15): PATCH(), ADR-0030, GET(), POST(), serializePlan(), toDateString(), withTargetJuz(), USER_PLAN_STATUSES (+7 more)

### Community 8 - "Tablet Nav Overlay Effect"
Cohesion: 0.07
Nodes (31): Seeder guard+reset+fetch+insert algorithm, scripts/quran-seed/seed.js orchestrator, ADR 0027 — tablet swipe carousel, 3-panel tablet swipe carousel, Tablet Nav Overlay Effect, Mobile reader UX addendum (nav overlay, long-press), --mushaf-* printed-mushaf CSS tokens, NavOverlayContext (+23 more)

### Community 9 - "RecitationContext.tsx"
Cohesion: 0.05
Nodes (66): Props, CustomRangePicker(), nextRepeatCount(), RANGE_TYPE_OPTIONS, ReciterTrigger, RepeatStepper(), STOP_POINT_OPTIONS, SurahCombobox() (+58 more)

### Community 10 - "ReaderPager.tsx"
Cohesion: 0.03
Nodes (91): QuranSafhaViewToggle(), FontFaceInjector(), nextKept(), Props, ADR-0023, ADR-0028, ADR-0029, useLruIds() (+83 more)

### Community 11 - "useTranslations"
Cohesion: 0.04
Nodes (56): MarkerColorPicker(), ContinueReadingLink(), Props, ADR-0042, Nav(), Sidebar(), SwUpdateBanner(), ADR-0014 (+48 more)

### Community 12 - "QuranSafha.tsx"
Cohesion: 0.03
Nodes (77): DesktopQuranFontSizeControls(), ScaleMarks(), SIZES, getTitle(), MarkedByLine(), MarkModal(), ModalProps, ADR-0012 (+69 more)

### Community 13 - "live-browser.js"
Cohesion: 0.03
Nodes (124): applyGlobalBarLabelState(), applyPlaceholderSizingStyles(), bindEditBadgeProxy(), bufferToBase64(), buildCollapsible(), buildColorModels(), buildDesignHeader(), buildListHtml() (+116 more)

### Community 14 - "modern-screenshot.umd.js"
Cohesion: 0.07
Nodes (64): cli(), COMMON_DEV_PORTS, devServerSignals(), gatherSignals(), gitSignals(), hasCode(), isVendoredPath(), latestCritique() (+56 more)

### Community 15 - "Shared Mushaf Access"
Cohesion: 0.08
Nodes (27): ADR 0009 — reproducible Quran seeder, Reproducible Quran Database Seeder, ADR 0012 — shared mushaf access, Shared Mushaf Access, Mark author attribution (Marked by X), MushafAccessGrant model, MushafShareCode model, ViewingChip component (+19 more)

### Community 16 - "live-server.mjs"
Cohesion: 0.08
Nodes (42): assembleLiveBrowserScript(), assertLiveBrowserScriptParts(), LIVE_BROWSER_SCRIPT_PARTS, readLiveBrowserScriptParts(), resolveLiveBrowserScriptParts(), activeSessionSummaries(), agentPollingConnected(), annotRoot (+34 more)

### Community 17 - "design-system.mjs"
Cohesion: 0.07
Nodes (66): addClampEndpoints(), addColorObject(), addDesignColor(), addFontSizeStep(), addRoundedScale(), addRoundedToken(), addSidecarColors(), addSidecarRadii() (+58 more)

### Community 18 - "SettingsSidebar.tsx"
Cohesion: 0.07
Nodes (40): OfflineRecitationSection(), ADR-0046, AndroidBackExitGuard(), guardState(), Props, ADR-0040, ADR-0043, ReaderLabSettingsSidebar() (+32 more)

### Community 19 - "el"
Cohesion: 0.08
Nodes (52): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+44 more)

### Community 20 - "dispatch.ts"
Cohesion: 0.33
Nodes (8): handle(), isAuthorized(), advanceOneDay(), getTimezoneOffsetMs(), isDue(), nextOccurrence(), scheduleReminder(), toSafeTimeZone()

### Community 21 - "MyMarksList.tsx"
Cohesion: 0.08
Nodes (29): MarkListItem, MarksPage, chipByCategory, commentPreview(), FilterDot(), FILTERS, groupBySurah(), MyMarksList() (+21 more)

### Community 22 - "jsonResponse"
Cohesion: 0.07
Nodes (56): buildVerseSnippet(), GET(), getSortKey(), ADR-0025, VALID_CATEGORIES, deleteMark(), getGrantForViewer(), MarkBody (+48 more)

### Community 23 - "use-translations.ts"
Cohesion: 0.12
Nodes (22): OfflineDownloadPanel(), PanelState, Props, OfflineInstallPrompt(), ADR-0014, OfflineSetupGate(), ADR-0014, precacheDismissedKey() (+14 more)

### Community 24 - "RecitationSettingsSheet.tsx"
Cohesion: 0.05
Nodes (54): NotificationListResponse, LANGUAGES, LanguageToggle(), MushafLayoutRow(), Props, MushafLayoutSection(), FurqanLogo(), Props (+46 more)

### Community 25 - "e2e-fixture/generate.js"
Cohesion: 0.14
Nodes (23): cliProgress, {
  deriveRubs,
  deriveRubVerseMappings,
  derivePageMetadata,
}, { fetchChapters }, {
  fetchMushafLayout,
  layoutFromSeededWords,
  LAYOUT_MUSHAF_IDS,
  DEFAULT_MUSHAF_ID,
}, { fetchVersesAndWords, TOTAL_PAGES }, fs, insertStatements(), ADR-0033 (+15 more)

### Community 26 - "sw.ts"
Cohesion: 0.07
Nodes (45): ClientToSwMessage, FALLBACK_LOCALES, fallbackDocumentUrl(), offlineFallbackUrl(), pageFontUrl(), pageJsonUrl(), precacheSentinelUrl(), SwToClientMessage (+37 more)

### Community 27 - "MyMarksList.tsx client component"
Cohesion: 0.12
Nodes (20): ADR 0017 — App DB uses migrations, not db push, ADR 0022 — verse/word comments as mark type (superseded), ADR 0024 — color marks encode category (amended), ADR 0025 — a mark is one row: category plus optional comment, Unify Marks: Category + Optional Comment, MarkModal.tsx (single picker+comment flow), Mark Prisma model (category + comment), MyMarksList.tsx (category tabs, follow-on responsive filter) (+12 more)

### Community 28 - "auth-middleware.ts"
Cohesion: 0.17
Nodes (14): isJSONRequest(), protectedRoutes, ADR-0012, ADR-0030, ADR-0037, withAuth(), withIntl(), CustomMiddleware (+6 more)

### Community 29 - "detect-antipatterns-browser.js"
Cohesion: 0.05
Nodes (58): browserColorsClose(), browserDesignSystemConfig(), browserHasDirectText(), browserPrimaryFont(), browserRadiusTokens(), browserSampleText(), buildSelectorSegment(), checkBrowserDesignSystemSources() (+50 more)

### Community 30 - "context.mjs"
Cohesion: 0.05
Nodes (94): appendAutonomyCounterDirective(), appendDetectorFallback(), appendImageGenDirective(), appendImageToolsDirective(), appendStalenessDirective(), appendSubagentAuthorizationDirective(), appendSurfaceBriefContext(), automaticHookMode() (+86 more)

### Community 31 - "hook-lib.mjs"
Cohesion: 0.06
Nodes (58): ACK_EXTS, ADVISORY_RULES, applyConfigSource(), applyDetectorConfigSource(), canonicalPath(), canonicalPathCache, clampByte(), cleanIgnoreValueDisplay() (+50 more)

### Community 32 - "notifications/types.ts"
Cohesion: 0.06
Nodes (49): GET(), NotificationListItem, getNotificationType(), NOTIFICATION_TYPES, NotificationChannelKey, NotificationContent, NotificationEmailContent, NotificationTypeDef (+41 more)

### Community 33 - "QuranSafha"
Cohesion: 0.13
Nodes (16): Mobile Safha Sizing: Width-Driven Font, Flexbox Height Fill, Surah Banner Positions as Denormalized Fields on PageMetadata, MarkerColorPicker, MarkModal, Panel, QuranLine, QuranMushafContext, QuranSafha (+8 more)

### Community 34 - "Nav"
Cohesion: 0.15
Nodes (16): FurqanLogo, MarksLink, Nav, NotificationBell, NotificationFeed, NotificationItem, PlansLink, RubList (+8 more)

### Community 35 - "Daily Awrad UI"
Cohesion: 0.13
Nodes (16): Design Principles, Manuscript-inspired reading app character, Circular navigation button style (52px, thin lucide icons), Ornamental elements (corner star ornaments, diamond separators), ADR 0008 no cross-domain FK (referenced), ADR 0014 offline write-queueing (referenced), ADR 0030 Plan engine derived assignments (referenced), Daily Awrad & Learning Plans Engine (Foundation) (+8 more)

### Community 36 - "Regression Classes"
Cohesion: 0.12
Nodes (15): /check-fq-standards, Claude-specific additions, API / auth / i18n, Check Furqan Standards, Database / schema, General Engineering Bar, Mushaf layout, Navigation / nav chrome (+7 more)

### Community 37 - "Fix Reader Navigation Infinite Render Loop"
Cohesion: 0.22
Nodes (8): Constraints, Decisions Made, Files to Change, Fix, Fix Reader Navigation Infinite Render Loop, Root Cause, Summary, What NOT to Do

### Community 38 - "concept-seed.mjs"
Cohesion: 0.08
Nodes (48): API_BASE, API_TIMEOUT_MS, apiBudgetMs(), dealCompositions(), driveSelection(), fetchRoll(), here, loadLocal() (+40 more)

### Community 39 - "Column-Font Contract"
Cohesion: 0.14
Nodes (15): ADR 0002 — Non-page Quran text rendering, ADR 0012 — Mark from_user/to_user ownership, ADR 0025 — Mark granularity, Mark model (verse/word granularity), No FK/relation across Quran/App domains rule, getDirection() helper (app/utils/i18n.ts), Column-Font Contract, Common Rendering Mistakes table (+7 more)

### Community 40 - "setLiveState"
Cohesion: 0.10
Nodes (61): abandonForeignSession(), abortSvelteComponentInjection(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup(), cleanupAcceptedSession(), clearAnnotations() (+53 more)

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

### Community 46 - "initPageChat"
Cohesion: 0.09
Nodes (47): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat(), expandPageChat(), finishVoiceSession() (+39 more)

### Community 47 - "PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit"
Cohesion: 0.22
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit, Summary, Verified Test Cases (+1 more)

### Community 48 - "start-task Load context gate"
Cohesion: 0.20
Nodes (10): docs/architecture/APP_PURPOSE.md, docs/architecture/COMPONENTS.md, API Input Validation rule (422 on failure), jsonResponse(), Legacy page words route (raw NextResponse.json), API Response Envelope, API Route Structure, Semantic Color Token Usage (+2 more)

### Community 49 - "Mobile Safha: Full-Screen Sizing"
Cohesion: 0.18
Nodes (11): Remove Safha Card Background on Mobile, QuranSafha.tsx (bg-card md:-only fix), ADR 0011 — mobile Quran font scale vw formula, --fq-mobile-font width-derived font formula, Mobile Safha: Full-Screen Sizing, QuranSwipeNav.tsx (renamed from QuranPageShell), Post-navigation compositor flicker (accepted platform limitation), Mobile Swipe Page Animation (+3 more)

### Community 50 - "Fix: Verse Rendering Outside the Quran Page"
Cohesion: 0.20
Nodes (10): ADR 0002: UthmanicHafs1Ver18 global font, app/api/search/chapters/route.ts, app/api/search/verses/route.ts, RubList.tsx, SearchQueryResults.tsx, app/constants/search.ts, app/hooks/use-search.ts, app/layout.tsx (+2 more)

### Community 51 - "Fix: Surah Banner Placement and Standalone Line Sizing"
Cohesion: 0.22
Nodes (10): ADR 0004: 15-slot page budget / font scale, ADR 0016: Surah banner (superseded by line_number-gap algorithm), QuranLine.tsx, app/constants/font.ts, app/globals.css, app/surah-frame.svg, KFGQPC glyph licence gate — unresolved blocking precondition (Addendum 8), Fix: Surah Banner Placement and Standalone Line Sizing (+2 more)

### Community 52 - "Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle"
Cohesion: 0.22
Nodes (10): ADR 0013: Mushaf double-page spread (partner font not preloaded), ADR 0014: PWA offline architecture, ADR 0027: QuranSwipeNav remount on navigation, QuranWord.tsx, app/hooks/use-is-tablet.ts, app/hooks/use-pwa-precache.ts, app/sw.ts, Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle (+2 more)

### Community 53 - "deps.ts"
Cohesion: 0.17
Nodes (15): RenderContext, createLogEmailTransport(), createSmtpEmailTransport(), EmailMessage, EmailTransport, getEmailTransport(), hasSmtpConfig(), buildRenderContext() (+7 more)

### Community 54 - "live-commit-manual-edits.mjs"
Cohesion: 0.10
Nodes (50): allEntryIds(), argVal(), buildRepairBatch(), candidatesForEntry(), changedFilesSinceSnapshot(), clearAppliedEntries(), collectApplyOwnedFiles(), collectRollbackFiles() (+42 more)

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

### Community 59 - "detect-text.mjs"
Cohesion: 0.08
Nodes (45): blankCssComments(), BLOCK_BRACE_PREFIX_KEYWORDS, CSS_IN_JS_EXTENSIONS, detectText(), extFromFilePath(), extractCSSinJS(), extractStyleBlocks(), findCSSinJSTemplates() (+37 more)

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

### Community 70 - "impeccable-config.mjs"
Cohesion: 0.10
Nodes (47): applyDetectionConfigSource(), clampByte(), cleanIgnoreValueDisplay(), cloneDetectionConfig(), cloneRawDetectionConfig(), colorIgnoreKey(), DEFAULT_DETECTION_CONFIG, DETECTOR_CONFIG_KEYS (+39 more)

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

### Community 76 - "resumeSession"
Cohesion: 0.06
Nodes (75): applyParamDefaults(), applyParamValue(), applySavedSessionMeta(), buildParamsPanel(), clampVariantIndex(), clearHandled(), clearSession(), closedClipPath() (+67 more)

### Community 77 - "live-accept.mjs"
Cohesion: 0.10
Nodes (45): matchesTemplateExtension(), resolveLiveTemplateExtensions(), acceptCli(), acceptReceiptPath(), argVal(), buildAcceptedWrappedSource(), buildCarbonizeReplacement(), decodeHtmlAttr() (+37 more)

### Community 78 - "MyPlansList"
Cohesion: 0.33
Nodes (7): AddPlanButton, JuzRangeSlider, MyPlansList, PlanAssignmentRow, PlanEnrollForm, PlansBrowseDialog, PlansTodayHero

### Community 79 - "fq-logger: Structured Logging & Observability"
Cohesion: 0.29
Nodes (7): ADR 0019 — fq-logger Sentry integration, Edge console-based logger shim, fq-logger: Structured Logging & Observability, pino (Node logging library), redact.ts sensitive key redaction, logger.error() Sentry bridge, withRequestId middleware

### Community 80 - "fq-reader-spread-container flex:1 + space-between fill"
Cohesion: 0.33
Nodes (7): ADR 0036 — reader fills height band, min-height:800px gate for rhythm fill, Reader Rhythm: Claim Unused Vertical Space Into Line Gaps, fq-reader-spread-container flex:1 + space-between fill, Recitation Bar: Vertical Rail (Desktop), RecitationPlayerBar.tsx (rail vs bar layout), RecitationPlayerBar.tsx (persistent bottom bar)

### Community 81 - "ReaderPager.tsx (client persistent pager)"
Cohesion: 0.33
Nodes (7): ADR 0028 — reader persistent pager, ADR 0029 — immutable page font registration, app/utils/page-font-registry.ts (immutable FontFace registry + LRU), ReaderPager.tsx (client persistent pager), Reader Swipe Performance: Persistent Client Pager, RecitationFollow leaf component (pager-owns-follow), Slim static content JSON pipeline (public/quran/pages/{n}.json)

### Community 82 - "ui-motion guidance"
Cohesion: 0.29
Nodes (8): docs/design/design-principles.md, Animation rule (tailwindcss-animate not installed), ui-motion guidance, Motion accessibility (prefers-reduced-motion, hover gating), Should this even animate? frequency table, Component states motion rules, Easing and duration rules, Motion performance rules (transform/opacity only)

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

### Community 97 - "css-cascade.mjs"
Cohesion: 0.08
Nodes (32): applyStaticDeclaration(), buildBorderOverrideMap(), buildStaticStyleMap(), buildStaticWindow(), collectStaticCssRules(), compareStaticPriority(), cssPropToCamel(), expandStaticBoxValues() (+24 more)

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

### Community 141 - "hook-before-edit.mjs"
Cohesion: 0.09
Nodes (59): allow(), bumpCursorDenial(), cursorBlockMessage(), deny(), detectProposedHtml(), done(), escapeRegExp(), findingSignature() (+51 more)

### Community 142 - "devDependencies"
Cohesion: 0.05
Nodes (39): @babel/parser, @babel/traverse, dotenv-cli, eslint, eslint-config-next, fs-extra, devDependencies, @babel/parser (+31 more)

### Community 143 - "components.json"
Cohesion: 0.18
Nodes (10): aliases, components, hooks, lib, ui, utils, rsc, $schema (+2 more)

### Community 144 - "hook-admin.mjs"
Cohesion: 0.12
Nodes (42): ACTIONS, addIgnoreFile(), addIgnoreRule(), addIgnoreValue(), DETECTOR_CONFIG_KEYS, detectorSection(), fileHasImpeccableHookMarker(), HOOK_MANIFEST_TARGETS (+34 more)

### Community 145 - "mujaz-stats.js"
Cohesion: 0.12
Nodes (9): path, ROOT, { FLAG_PATH }, fs, { FLAG_PATH, STATS_PATH }, fs, { FLAG_PATH }, fs (+1 more)

### Community 146 - "AGENTS.md"
Cohesion: 0.13
Nodes (10): Commands, Documentation, graphify, impeccable, MANDATORY WORKFLOW — NO EXCEPTIONS, Project, Task tracking, Claude Skills (+2 more)

### Community 147 - "app/layout.tsx"
Cohesion: 0.13
Nodes (39): assessCoverage(), buildColor(), CANONICAL_SECTIONS, collectBullets(), collectColorValues(), collectParagraphs(), detectFormat(), extractColors() (+31 more)

### Community 148 - "manual-apply.mjs"
Cohesion: 0.10
Nodes (36): addOpToManualApplyChunk(), APPLY_EVENT_HARD_TIMEOUT_MS, APPLY_EVENT_SOFT_DEADLINE_MS, buildManualApplyAgentAction(), clearManualApplyTransaction(), collectManualApplyFiles(), compactManualApplyBatch(), compactManualApplyCandidates() (+28 more)

### Community 149 - "Addendum — Wrong surah name on shared multi-surah pages (2026-08-16)"
Cohesion: 0.09
Nodes (22): 1. Extend SidebarContext with current surah, 2. Nav trigger, 3. Sidebar controlled tabs + active scroll, Addendum — Wrong surah name on shared multi-surah pages (2026-08-16), Approach, Approach, Bug, Constraints (+14 more)

### Community 150 - "visual.spec.ts"
Cohesion: 0.14
Nodes (11): ACCOUNT_LABEL, Locale, LOCALES, SEARCH_PLACEHOLDER, SEARCH_QUERY, SEARCH_RESULTS_HEADING, SETTINGS_LABEL, Theme (+3 more)

### Community 151 - "live-wrap.mjs"
Cohesion: 0.11
Nodes (42): hasGeneratedHeader(), HEADER_MARKERS, isGeneratedFile(), isGitIgnored(), resolveSourceTraits(), argVal(), buildInsertWrapperLines(), computeInsertLine() (+34 more)

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

### Community 160 - "detect-antipatterns.mjs"
Cohesion: 0.12
Nodes (36): confirm(), detectCli(), dim(), fileUrlToLocalPath(), formatAdvisorySection(), formatFindings(), formatFindingsBody(), formatFindingSummary() (+28 more)

### Community 161 - "dependencies"
Cohesion: 0.05
Nodes (39): class-variance-authority, cli-progress, cmdk, lucide-react, mysql2, next, nodemailer, dependencies (+31 more)

### Community 162 - "/plan-fq-task"
Cohesion: 0.22
Nodes (8): Anti-patterns to avoid, Plan file format, /plan-fq-task, Step 5 — Ensure a GitHub issue, Step 6 — Create the worktree, Step 7 — Write the plan (worktree path), Steps, What this skill does (legacy)

### Community 163 - "Steps"
Cohesion: 0.22
Nodes (8): 1 — Scan the session, 2 — Scan DECISIONS.md for stale entries, 3 — Propose changes one at a time (review-before-write), 4 — Confirm before saving, 5 — Save the retrospective file, Anti-patterns to avoid, /retrospect, Steps

### Community 164 - "/review-fq-work"
Cohesion: 0.20
Nodes (9): 1 — Get the diff, 2 — Spawn the review subagent, 3 — Print the report, Anti-patterns to avoid, Choosing the review model, Claude-specific: Dimension 4 (Design & UX), Claude-specific: spawning the reviewer, /review-fq-work (+1 more)

### Community 165 - "/start-fq-task"
Cohesion: 0.22
Nodes (8): Anti-patterns to avoid, Claude-specific additions, Context paths (step 2 in the workflow doc), /start-fq-task, Step 1 — GitHub issue integration, Step 1b — Worktree setup (runs before step 2 in the workflow doc), Steps, What this skill does (legacy)

### Community 166 - "setup.js"
Cohesion: 0.31
Nodes (8): { execSync }, fs, loadFixture(), main(), mysql, parseConnection(), path, requireEnv()

### Community 167 - "/ship-fq-task"
Cohesion: 0.25
Nodes (7): Claude-specific additions, No AI signatures — anywhere, /ship-fq-task, Step 6 — GitHub issue integration, Step 7 — Clean up the worktree (mandatory — always run, even if step 6 was skipped), Steps, What NOT to do

### Community 168 - "next.config.mjs"
Cohesion: 0.22
Nodes (8): ADR-0014, ADR-0017, ADR-0023, ADR-0029, ADR-0042, nextConfig, withNextIntl, withSerwist

### Community 169 - "detect-html.mjs"
Cohesion: 0.20
Nodes (20): createBrowserDetector(), detectUrl(), launchBrowser(), measureContentHiddenAfterReveal(), runVisualContrastFallback(), serializeDesignSystemForBrowser(), captureVisualContrastCandidate(), compareScreenshotContrast() (+12 more)

### Community 170 - "/cut-release <major|minor|patch>"
Cohesion: 0.29
Nodes (6): Claude-specific: GitHub issue integration (step 8), /cut-release <major|minor|patch>, No AI signatures, Precondition, Steps, What NOT to do

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

### Community 183 - "doctor.mjs"
Cohesion: 0.09
Nodes (53): applyFixes(), cli(), collect(), parseArgs(), readProjectRootPatterns(), rel(), renderText(), safeRead() (+45 more)

### Community 184 - "graphify-sync-rebuild.sh"
Cohesion: 0.50
Nodes (3): GRAPHIFY_CHANGED, PYTHONHASHSEED, graphify-sync-rebuild.sh script

### Community 187 - "svelte-component.mjs"
Cohesion: 0.08
Nodes (49): collectUnusedSelectors(), verifyAcceptedSource(), applyLegacyDeferredAcceptsOnStartup(), buildPropsScriptV2(), loadSvelteCompiler(), appendCssToSvelteStyle(), appendSanitizedCssRule(), applyDeferredSvelteComponentAccepts() (+41 more)

### Community 189 - "rel"
Cohesion: 0.14
Nodes (26): ANIMATION_VALUE_KEYWORDS, buildHtmlPatternCorpora(), checkHtmlPatterns(), collectCssCustomProps(), collectMarqueeKeyframes(), collectPulseKeyframes(), cssLengthToPx(), cssTextHasDarkRootBg() (+18 more)

### Community 190 - "live-poll.mjs"
Cohesion: 0.11
Nodes (36): completionAckForAcceptResult(), completionTypeForAcceptResult(), PREVIEW_MODES_WITHOUT_SOURCE_MARKERS, acceptInstructions(), bootInstructions(), deferredWrapperInstructions(), generateInstructions(), insertScaffoldInstructions() (+28 more)

### Community 191 - "generate-image.mjs"
Cohesion: 0.08
Nodes (30): detectCsp(), INLINE_HEADER_SIGNALS, LAYOUT_EXTS, MONOREPO_HELPER_SIGNALS, NUXT_ROUTE_RULES_SIGNALS, NUXT_SECURITY_SIGNALS, SCAN_EXTS, SKIP_DIRS (+22 more)

### Community 192 - "applyEditing"
Cohesion: 0.07
Nodes (44): addManualContextText(), applyEditing(), buildInsertPlaceholderSnapshotFromDom(), buildLocatorForLeaf(), buildPickedAnchorSnapshot(), canRestoreManualEditElement(), captureAndEmit(), checkpointPayload() (+36 more)

### Community 193 - "layout.md"
Cohesion: 0.05
Nodes (40): Adaptation Strategies, Assess Adaptation Challenge, Implement & Verify, Orientation & foldables, Phone → Tablet (iPad / large screens), Platform → platform (iOS ↔ Android), Web → native (porting a website or web app), Android platform (+32 more)

### Community 194 - "initGlobalBar"
Cohesion: 0.13
Nodes (28): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), buildSteerProcessingDots(), buildSteerQueueHint(), designPanelCss(), detectPageTheme() (+20 more)

### Community 197 - "impeccable/SKILL.md"
Cohesion: 0.09
Nodes (19): Craft (deprecated alias), Craft floor, Refuse, Verify, Pitfalls, Seed mode, Step 1: Route through new-work's workshop, Step 2: Write seed DESIGN.md (+11 more)

### Community 198 - "parseAnyColor"
Cohesion: 0.11
Nodes (42): checkColors(), checkElementAIPaletteDOM(), checkElementColors(), checkElementColorsDOM(), checkElementGlowDOM(), checkElementHoverContrast(), checkElementIconTile(), checkElementIconTileDOM() (+34 more)

### Community 199 - "live-copy-edit-agent.mjs"
Cohesion: 0.14
Nodes (31): applyMockWrites(), buildCopyEditBatchPrompt(), checkFrameworkSourceSyntax(), chooseCopyEditAgent(), COMMAND_AUTH_CACHE, commandAuthed(), commandExists(), compactBatchForPrompt() (+23 more)

### Community 203 - "injected/index.mjs"
Cohesion: 0.14
Nodes (21): browserColorsClose(), browserHasDirectText(), browserRadiusTokens(), browserSampleText(), checkElementDesignSystemDOM(), enableCycleMode(), getSpotlightBackdrop(), isBrowserDesignColorAllowed() (+13 more)

### Community 204 - "scanCssTextForPulsingDot"
Cohesion: 0.16
Nodes (16): buildHtmlPatternCorpora(), checkHtmlPatterns(), collectMarqueeKeyframes(), collectPulseKeyframes(), cssLengthToPx(), indexInSourceRanges(), infiniteAnimationNames(), isRoundDotRadius() (+8 more)

### Community 206 - "Mushaf Page Frame — Designer Asset Spec"
Cohesion: 0.07
Nodes (27): Deliver three tiles, not one frame, Implementation note (not for the designer), KFGQPC does not ship a page frame (searched 2026-08-17), Licence, Measured findings, Mushaf Page Frame — Designer Asset Spec, Nice to have, Public-domain scans: reference material, not a tile source (tested 2026-08-17) (+19 more)

### Community 207 - "showToast"
Cohesion: 0.29
Nodes (10): acceptedDomAlreadyClean(), applyOriginalAttrsToSvelteAnchor(), commitAcceptedSvelteComponentToDom(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), maybeCompleteAcceptedSession(), reloadAfterMissingAcceptedDom(), removeSvelteComponentVariantStyle() (+2 more)

### Community 209 - "roots.mjs"
Cohesion: 0.16
Nodes (27): CANDIDATE_SCAN_IGNORED, consumeTargetArg(), CONTEXT_FALLBACK_DIRS, DESIGN_NAMES, DEV_CONFIG_MARKERS, discoverAppCandidates(), enterLiveRoot(), exists() (+19 more)

### Community 210 - "critique-storage.mjs"
Cohesion: 0.18
Nodes (21): coerceSlug(), listSnapshotsForSlug(), main(), nowFilenameStamp(), parseFrontmatter(), readLatestSnapshot(), readTrend(), serializeFrontmatter() (+13 more)

### Community 215 - "collectVisualContrastCandidates"
Cohesion: 0.13
Nodes (20): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), clampByte(), clearOverlays() (+12 more)

### Community 216 - "handleManualEditActivity"
Cohesion: 0.17
Nodes (26): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+18 more)

### Community 217 - "live-manual-edit-evidence.mjs"
Cohesion: 0.16
Nodes (26): analyzeSourceHint(), buildCandidatesForOp(), buildContextHintsByRef(), buildManualEditEvidence(), collectSearchFiles(), countOps(), decodeBasicHtml(), escapeRegExp() (+18 more)

### Community 218 - "Responsive Design"
Cohesion: 0.08
Nodes (25): Assess Adaptation Challenge, Breakpoints: Content-Driven, Content Adaptation, Desktop Adaptation (Mobile → Desktop), Detect Input Method, Not Just Screen Size, Email Adaptation (Web → Email), Implement Adaptations, Layout Adaptation Patterns (+17 more)

### Community 219 - "event-validation.mjs"
Cohesion: 0.14
Nodes (24): AGENT_PHASE_SET, FORBIDDEN_MANUAL_EDIT_TEXT_CHARS, INSERT_POSITIONS, isValidId(), isValidMountVariant(), isValidVariantId(), validateAnnotationFields(), validateEvent() (+16 more)

### Community 220 - "ReaderLabSettingsSidebar.tsx"
Cohesion: 0.06
Nodes (47): GET(), GET(), KeepScreenAwakeSync(), Props, ADR-0044, EnablePushToggle(), bytesToMb(), RowState (+39 more)

### Community 221 - "checkQuality"
Cohesion: 0.14
Nodes (23): eventPriority(), selectAvailablePendingEvent(), acknowledgePendingEvent(), broadcast(), broadcastAgentPollingIfChanged(), cancelQueuedAnonymousExitEvents(), findAvailablePendingEvent(), findPendingEventById() (+15 more)

### Community 222 - "live-status.mjs"
Cohesion: 0.10
Nodes (34): getLegacyLiveSessionsDir(), getLiveSessionsDir(), readLiveServerInfo(), safeSessionId(), FORBIDDEN, verifyAcceptedFile(), completeCli(), completeThroughServer() (+26 more)

### Community 232 - "Offline Recitation Audio Download"
Cohesion: 0.08
Nodes (23): ADR 0046: Offline recitation audio via explicit per-surah/juz download, reusing the page cache and the wird override mechanism, Consequences, Context, Decision, Options Considered, Approach, Constraints, Decision Tree / Algorithm (+15 more)

### Community 233 - "Home Page Design Fixes"
Cohesion: 0.08
Nodes (24): Addendum — Restructure Navigation & Direct Settings Access, Addendum — Universal nav menu; sidebar toggle moves into Nav, Constraints, Constraints, Constraints, Decision Tree / Algorithm, Decision Tree / Algorithm, Decisions Made (+16 more)

### Community 234 - "insert-ui.mjs"
Cohesion: 0.11
Nodes (10): canCreateInsert(), clampPlaceholderSize(), computeInsertPosition(), groupSiblingRows(), hitSiblingInsertGap(), horizontalOverlap(), insertCreateDisabledReason(), insertLineCoords() (+2 more)

### Community 235 - "svelte-ast.mjs"
Cohesion: 0.22
Nodes (20): Analysis, analyzeAttributes(), analyzeFragment(), analyzeNode(), analyzeSvelteMarkup(), applyReplacements(), classifyEachKey(), classifyRoots() (+12 more)

### Community 236 - "generate-mushaf-thumbnails.js"
Cohesion: 0.15
Nodes (20): fs, main(), OUT_FILE, path, {
  requireQuranDatabaseUrl,
  targetLabel,
  createQuranClient,
}, fs, getPageWords(), groupBy() (+12 more)

### Community 237 - "live.md"
Cohesion: 0.06
Nodes (29): Apply at system scale, Audit before choosing, Choose a strategy, Contrast and perception, Live-mode signature params, Verify, Visitor mode, Cleanup (+21 more)

### Community 238 - "onboard.md"
Cohesion: 0.09
Nodes (22): Assess Onboarding Needs, Context Over Ceremony, Contextual Help, Design Onboarding Experiences, Documentation & Help, Empty State Design, Feature Discovery & Adoption, Guided Tours & Walkthroughs (+14 more)

### Community 239 - "accept-css.mjs"
Cohesion: 0.19
Nodes (23): bakeParamValues(), collectAllSelectors(), collectSelectorsFromNodes(), escapeRegExp(), formatBody(), isToggleOn(), normalizeSelector(), normalizeToggleForVar() (+15 more)

### Community 240 - "runHook"
Cohesion: 0.13
Nodes (20): averageRgb01(), captureChromeNodes(), captureElementFromRenderedAncestor(), captureElementToBlob(), compileShader(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor() (+12 more)

### Community 241 - "manual-edit-routes.mjs"
Cohesion: 0.19
Nodes (19): args, cwd, pageUrlFilter, remaining, compactManualLogText(), summarizeManualApplyFailures(), summarizeManualDiagnostics(), summarizeManualLogFile() (+11 more)

### Community 242 - "resolveLengthPx"
Cohesion: 0.14
Nodes (20): checkElementHeroEyebrow(), checkElementHeroEyebrowDOM(), checkHeroEyebrow(), checkKickerAboveHeading(), checkKickerAboveHeadingDOM(), checkKickerAboveHeadingFromDoc(), checkNumberedSectionLabels(), checkNumberedSectionLabelsDOM() (+12 more)

### Community 243 - "live-inject.mjs"
Cohesion: 0.16
Nodes (20): describeInjectArtifacts(), frameworkIgnorePatterns(), resolveFramework(), applyNuxtLiveAdapter(), buildNuxtPlugin(), detectNuxtProject(), nuxt, removeNuxtLiveAdapter() (+12 more)

### Community 244 - "Design System: Furqan"
Cohesion: 0.09
Nodes (22): Buttons, Cards / Containers, Colors, Components, Design System: Furqan, Do:, Do's and Don'ts, Don't: (+14 more)

### Community 245 - "Changes"
Cohesion: 0.09
Nodes (21): Addendum 2: Lab-Style Green CSS Ornament & Surah Font (2026-08-22), Addendum 3: Continue Reading Icon/Weight, Group Dividers, and Logo Size (2026-08-22), Addendum 4: Green 32px Logo with Navbar Background (2026-08-22), Changes, Decisions Made, Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation, Files Changed, `.fq-recitation-active-word` visibility (+13 more)

### Community 246 - "The Toolkit"
Cohesion: 0.10
Nodes (20): Animate complex properties, Assess What "Extraordinary" Means Here, For data-heavy interfaces, For functional UI, For performance-critical UI, For visual/marketing surfaces, Implement with Discipline, Interact with the device (+12 more)

### Community 247 - "collectBrowserFindings"
Cohesion: 0.18
Nodes (18): browserFindingsFromMap(), checkCreamPalette(), checkEdgeFlushCardsDOM(), checkElementBlinkingCursorDOM(), checkElementPseudoStripeDOM(), checkElementTextOverflowDOM(), checkFirstViewportColumnOverflowDOM(), checkHeadingRhythmDOM() (+10 more)

### Community 248 - "onAnnotDown"
Cohesion: 0.18
Nodes (19): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords() (+11 more)

### Community 249 - "5.1 — Page face and reader"
Cohesion: 0.10
Nodes (20): 5.1 — Page face and reader, A defect this subtask found in 4.1, (a) The stage, Addendum: Visual Feedback Round (Lighting & Mushaf Margins), Approach, (b) The page face, (c) The 768–1023 band is gone, Constraints (+12 more)

### Community 250 - "Trello → GitHub Issues Migration Plan"
Cohesion: 0.10
Nodes (19): Board audit (2026-08-13, live pull from Trello MCP), `.claude/skills/cut-release/SKILL.md`, `.claude/skills/plan-fq-task/SKILL.md`, `.claude/skills/promote-release/SKILL.md` and `promote-to-staging/SKILL.md`, `.claude/skills/ship-fq-task/SKILL.md`, `.claude/skills/start-fq-task/SKILL.md`, Not in scope, Open questions for the user (+11 more)

### Community 251 - "resolveLiveInjectionAnchor"
Cohesion: 0.16
Nodes (19): buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts(), cssEscapeIdent(), elementMatchesOriginalMarkup() (+11 more)

### Community 252 - "tanstack-adapter.mjs"
Cohesion: 0.23
Nodes (15): applyTanStackLiveAdapter(), buildTanStackLiveRootComponent(), detectTanStackStartProject(), escapeRegExp(), findRootRouteFile(), insertAfterLastImport(), isManagedComponent(), packageHasTanStackStart() (+7 more)

### Community 253 - "Furqan Design Language"
Cohesion: 0.11
Nodes (19): 10. Motion, 11. Per-band behaviour, 12. Rules that did not survive derivation, 1. Character, 2. Composition, 3. Atmosphere, 4. Depth, 5. Accent grammar (+11 more)

### Community 254 - "4.3 — Search and settings surfaces"
Cohesion: 0.10
Nodes (20): 4.3 — Search and settings surfaces, A probe lesson worth keeping, Accent-grammar corrections, Addendum 2: Senior Typography Calibration & UX Polish (Lab Scale Alignment), Addendum: Visual Feedback Round (Settings Redesign), Approach, Constraints, Decision Tree / Algorithm (+12 more)

### Community 255 - "quran-json/generate.js"
Cohesion: 0.33
Nodes (5): axios, fetchPage(), GLYPH_FIELD_BY_MUSHAF, ADR-0033, LAYOUT_MUSHAF_IDS

### Community 256 - "impeccable-paths.mjs"
Cohesion: 0.14
Nodes (19): resolveProjectRoot(), firstExisting(), getDesignSidecarCandidates(), getDesignSidecarPath(), getImpeccableDir(), getLegacyLiveAnnotationsDir(), getLegacyLiveConfigPath(), getLegacyLiveServerPath() (+11 more)

### Community 257 - "live.mjs"
Cohesion: 0.36
Nodes (10): resolveTargetSelection(), __dirname, ensureServerRunning(), globToRegex(), liveCli(), relOrNull(), runScript(), safeParse() (+2 more)

### Community 258 - "checkQuality"
Cohesion: 0.14
Nodes (16): checkElementOversizedH1(), checkElementOversizedH1DOM(), checkElementQuality(), checkElementQualityDOM(), checkOversizedH1(), checkQuality(), colorsNearlyMatch(), cssColorAlpha() (+8 more)

### Community 259 - "session-store.mjs"
Cohesion: 0.23
Nodes (11): getRubs(), ADR-0033, CHAPTERS_FILE, getSurahs(), isSurahResultArray(), MushafGrantLayout(), Sidebar, ADR-0012 (+3 more)

### Community 260 - "staleness-deep.mjs"
Cohesion: 0.20
Nodes (11): { chromium }, EDITIONS, fetchBasmalahGlyphs(), htmlFor(), ADR-0023, ADR-0033, main(), OUT_DIR (+3 more)

### Community 261 - "sveltekit-adapter.mjs"
Cohesion: 0.24
Nodes (16): applySvelteKitLiveAdapter(), buildSvelteLiveRootComponent(), defaultSvelteLayout(), detectSvelteKitProject(), ensureSvelteLiveRootComponent(), escapeRegExp(), fileIncludes(), findSvelteKitAppHtml() (+8 more)

### Community 262 - "edge.ts"
Cohesion: 0.24
Nodes (13): build(), CONSOLE_FOR_LEVEL, Level, LEVEL_VALUE, write(), wrap(), redact(), SENSITIVE_KEYS (+5 more)

### Community 263 - "serve-question.mjs"
Cohesion: 0.13
Nodes (8): esc(), localImages, page(), payloadPath, portArg, QUESTION_DIR, server, timeoutSec

### Community 264 - "detect-utils.mjs"
Cohesion: 0.28
Nodes (13): astro, detectAstroProject(), fileExists(), findConfigFile(), firstExistingFile(), hasAnyDependency(), literalConfigFiles(), readPackageDeps() (+5 more)

### Community 266 - "Nocturnal Reader Lab — Desktop RTL"
Cohesion: 0.12
Nodes (16): Confirmed Product Decisions, Constraints, Decision Tree, Decisions Made, Design Remediation, Design Revision — 2026-08-21, Files to Change, Implementation From the Ground Up (+8 more)

### Community 267 - "animate.md"
Cohesion: 0.12
Nodes (14): Accessibility and control, Choose material by meaning, Find the job, Implement to the runtime, Set the motion thesis, Timing and easing, Verify, Visitor mode (+6 more)

### Community 268 - "Handle `generate`"
Cohesion: 0.12
Nodes (16): 1. Read the screenshot (if present), 2. Wrap the element, 3. Load the action's reference, 4. Plan three variants: identity first, then mode, then axes, 5. Apply the freeform prompt (if present), 6. Deliver variants, 7. Parameters (composition-sized, 0-4 per variant), 8. Signal done (+8 more)

### Community 269 - "context-signals.mjs"
Cohesion: 0.33
Nodes (10): getLiveAnnotationsDir(), getLiveDir(), isLiveServerPidReachable(), sweepStaleAcceptReceiptsOnStartup(), clearStaleLock(), readLock(), releaseOwnLock(), sleepSync() (+2 more)

### Community 270 - "Wire /impeccable into the plan/implement/review workflow"
Cohesion: 0.12
Nodes (14): ADR 0041: Impeccable design commands wired into the plan/implement/review cycle, plan-driven not ad hoc, Consequences, Context, Decision, Options Considered, Approach, Constraints, Decision Tree / Algorithm (+6 more)

### Community 271 - "4.1 — Marks and plans screens"
Cohesion: 0.12
Nodes (16): 4.1 — Marks and plans screens, Accent-grammar corrections found on these screens, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Empty and loading states, Files to Change (+8 more)

### Community 272 - "4.4 — Mushaf hub and shared-grant surfaces"
Cohesion: 0.12
Nodes (16): 4.4 — Mushaf hub and shared-grant surfaces, A new token family: `--warning`, Accent-grammar corrections, Approach, Borrowed context is the grammar's clearest case, Constraints, Constraints honoured, Decision Tree / Algorithm (+8 more)

### Community 273 - "Session handoff — design migration (#360)"
Cohesion: 0.12
Nodes (15): 1. Where things stand, 2. Commit convention for feedback fixes, 3. Read these first, in this order, 4. What is left before merge, 5. What was never verified, 6. One flagged deviation, 7. Hard-won facts — these cost real time to find, 8. Standing constraints (+7 more)

### Community 274 - "Generate Report"
Cohesion: 0.13
Nodes (14): 1. Accessibility (A11y), 2. Performance, 3. Theming, 4. Responsive Design, 5. Implementation Integrity (CRITICAL), Audit Health Score, Detailed Findings by Severity, Diagnostic Scan (+6 more)

### Community 275 - "tag-strategy.mjs"
Cohesion: 0.21
Nodes (16): buildLiveScriptSrc(), appendOriginToDirective(), buildTagBlock(), commentClose(), commentOpen(), detectLineEnding(), findCspMetaTags(), getAttr() (+8 more)

### Community 276 - "2.1 — Semantic tokens"
Cohesion: 0.13
Nodes (15): 2.1 — Semantic tokens, Approach, Constraints, Contrast, before → after, Decision Tree / Algorithm, Decisions Made, Decisions Made — the two deferred questions, Files to Change (+7 more)

### Community 277 - "4.2 — Home screen"
Cohesion: 0.13
Nodes (15): 4.2 — Home screen, Accent-grammar corrections, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Implementation notes (2026-08-22) (+7 more)

### Community 278 - "seed.js"
Cohesion: 0.15
Nodes (13): axios, fetchChapters(), fetchChaptersOnce(), ADR-0009, cliProgress, {
  deriveRubs,
  deriveRubVerseMappings,
  derivePageMetadata,
}, { execSync }, { fetchChapters } (+5 more)

### Community 279 - "Impeccable Asset Producer"
Cohesion: 0.14
Nodes (12): Core Rule, Decision Sketches, Impeccable Asset Producer, Input Contract, Output Contract, Prompt Pattern, Workflow, Generate three compositional options (+4 more)

### Community 280 - "optimize.md"
Cohesion: 0.14
Nodes (13): Animation Performance, Assess Performance Issues, Core Web Vitals Optimization, Cumulative Layout Shift (CLS < 0.1), Interaction to Next Paint (INP < 200ms), Largest Contentful Paint (LCP < 2.5s), Loading Performance, Network Optimization (+5 more)

### Community 281 - "sampleCssBackground"
Cohesion: 0.22
Nodes (14): firstCssUrl(), getLayerValue(), loadVisualContrastImage(), parseObjectPosition(), parsePositionPair(), parsePositionToken(), pickWorstContrastColor(), pointToImageSource() (+6 more)

### Community 282 - "SAFE_TAGS"
Cohesion: 0.25
Nodes (8): Color & materials, Components & controls, iOS platform, Layout & structure, Motion, The iOS slop test, Touch targets, Typography

### Community 283 - "sampleCssBackground"
Cohesion: 0.22
Nodes (14): firstCssUrl(), getLayerValue(), loadVisualContrastImage(), parseObjectPosition(), parsePositionPair(), parsePositionToken(), pickWorstContrastColor(), pointToImageSource() (+6 more)

### Community 284 - "template-extensions.mjs"
Cohesion: 0.36
Nodes (6): extensionCache, LIVE_TEMPLATE_EXTENSIONS, mergeExtensions(), normalizeExtensionEntries(), readLiveTemplateExtensions(), safeReadJson()

### Community 285 - "3.2 — Shared chrome"
Cohesion: 0.14
Nodes (14): 3.2 — Shared chrome, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Implementation notes (2026-08-22), Measured (rendered pixels, `/en/pages/2`, 1440×900) (+6 more)

### Community 286 - "Scan mode (approach C: auto-extract, then confirm descriptive language)"
Cohesion: 0.15
Nodes (13): Component translation rules, Narrative mapping, Scan mode (approach C: auto-extract, then confirm descriptive language), Schema, Step 1: Find the design assets, Step 2: Auto-extract what can be auto-extracted, Step 2b: Stage the frontmatter, Step 3: Ask the user for qualitative language (+5 more)

### Community 287 - "constants.mjs"
Cohesion: 0.12
Nodes (17): checkPageTypography(), firstOverusedGoogleFont(), checkElementItalicSerif(), checkElementItalicSerifDOM(), checkItalicSerif(), checkPageTypography(), checkTypography(), resolveSerif() (+9 more)

### Community 288 - "frameworks/index.mjs"
Cohesion: 0.18
Nodes (10): COMMENT_SYNTAXES, FRAMEWORKS, INJECT_KINDS, PATCH_UNDOERS, PREVIEW_MODES, SOURCE_TRAIT_DEFAULTS, STYLE_MODES, staticHtml (+2 more)

### Community 289 - "pin.mjs"
Cohesion: 0.23
Nodes (11): CODEX_HARNESSES, commandPrefixForSkillsDir(), __dirname, findHarnessDirs(), generatePinnedSkill(), HARNESS_DIRS, loadCommandMetadata(), pin() (+3 more)

### Community 290 - "Design Migration — reader-lab language, app-wide"
Cohesion: 0.15
Nodes (13): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Design Migration — reader-lab language, app-wide, Files to Change, Phase 0 outcome, Phases (+5 more)

### Community 291 - "Simplify the Design"
Cohesion: 0.17
Nodes (11): Assess Current State, Code Simplification, Content Simplification, Document Removed Complexity, Information Architecture, Interaction Simplification, Layout Simplification, Plan Simplification (+3 more)

### Community 292 - "Hardening Dimensions"
Cohesion: 0.17
Nodes (11): Accessibility Resilience, Assess Hardening Needs, Edge Cases & Boundary Conditions, Error Handling, Hardening Dimensions, Input Validation & Sanitization, Internationalization (i18n), Performance Resilience (+3 more)

### Community 293 - "scheduleLazyVisualContrast"
Cohesion: 0.20
Nodes (12): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), clearOverlays(), detachOverlay(), disconnectLazyVisualContrastObserver(), postExtensionError(), rememberVisualContrastAnalysis() (+4 more)

### Community 295 - "ui-core.mjs"
Cohesion: 0.23
Nodes (10): createLiveBrowserDomHelpers(), activeElementDeep(), appendStyleToLiveUiRoot(), appendToLiveUiRoot(), escapeCssIdent(), getLiveUiElementById(), LIVE_CHROME_MOUNT_CONTRACT, LIVE_UI_COMPONENT_IDS (+2 more)

### Community 296 - "journal.mjs"
Cohesion: 0.36
Nodes (11): clearInjectJournal(), healArtifact(), healInjectJournal(), injectJournalPath(), insideProject(), normalizeRel(), pruneEmptyDirs(), readIfPresent() (+3 more)

### Community 297 - "generation-preflight.mjs"
Cohesion: 0.30
Nodes (10): buildGenerationPreflight(), compactError(), execFileAsync, insertTarget(), normalizeTarget(), replaceTarget(), runGenerationPreflight(), sourceResolutionCache (+2 more)

### Community 298 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 299 - "clarify.md"
Cohesion: 0.18
Nodes (10): Actions and navigation, Audit the language, Errors and permissions, Forms, Help and instructional text, Loading, empty, and success states, Rewrite by function, Set the message hierarchy (+2 more)

### Community 300 - "critique.md"
Cohesion: 0.18
Nodes (10): Action Summary, Ask the User, Assessment A: Design Review, Assessment B: Detector + Browser Evidence, Assessment Orchestration, Hard Invariants, Persist the Snapshot, Purpose (+2 more)

### Community 301 - "Nielsen's 10 Heuristics"
Cohesion: 0.18
Nodes (11): 10. Help and Documentation, 1. Visibility of System Status, 2. Match Between System and Real World, 3. User Control and Freedom, 4. Consistency and Standards, 5. Error Prevention, 6. Recognition Rather Than Recall, 7. Flexibility and Efficiency of Use (+3 more)

### Community 302 - "New visual work"
Cohesion: 0.18
Nodes (11): 1. Decide what is already true, 2. Ask what will change the work, 3. Choose the right amount of invention, 4. Commit the world, 5. Record the decision, 6. Build with full commitment, 7. Inspect and finish, Create a whole surface inside an established world (+3 more)

### Community 303 - "polish.md"
Cohesion: 0.18
Nodes (10): 1. Establish the system, 2. Gather the evidence, 3. Triage, 4. Polish the whole path, 5. Verify and finish, Color, imagery, and icons, Content and code, Flow and hierarchy (+2 more)

### Community 304 - "quieter.md"
Cohesion: 0.18
Nodes (10): Assess Current State, Color Refinement, Composition Refinement, Motion Reduction, Plan Refinement, Refine the Design, Simplification, Verify Quality (+2 more)

### Community 305 - "checkTextOcclusionDOM"
Cohesion: 0.22
Nodes (11): checkTextOcclusionDOM(), clippedByInset(), clippedByRect(), elementDirectText(), expandBoxShorthand(), firstMetricLengthPx(), isLayeredElement(), isOpaqueDecoratedBox() (+3 more)

### Community 306 - "collectNumberedSectionLabelCandidates"
Cohesion: 0.09
Nodes (31): mergeDesignSystemFindings(), runTextContentAnalyzers(), collectStaticCssText(), checkStaticPageTypography(), detectHtml(), STATIC_ELEMENT_RULES, checkCreamPalette(), checkElementOversizedH1() (+23 more)

### Community 307 - "renderGroupedTemplate"
Cohesion: 0.25
Nodes (11): clampGroupedToBudget(), clampToBudget(), directiveFooter(), formatFindingIgnoreCommand(), formatFindingLine(), quoteCommandArg(), relativize(), renderCleanAck() (+3 more)

### Community 308 - "palette.mjs"
Cohesion: 0.24
Nodes (7): args, buildWeights(), hashUnit(), pickSeed(), seed, SEEDS, weightedPick()

### Community 309 - "0042-pwa-launch-resolves-before-first-paint.md"
Cohesion: 0.22
Nodes (5): ADR 0044: Viewport Units Are Unreliable Across the Installed PWA's Fullscreen Transition, Consequences, Context, Decision, Options Considered

### Community 310 - "Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav)"
Cohesion: 0.18
Nodes (10): Approach, Constraints, Decision Tree — asset placement, Decisions Made, Files to Change, Open Item Before Implementation, Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav), Summary (+2 more)

### Community 311 - "Plan: Set `font-tajawal` globally on app root & Tailwind `sans`"
Cohesion: 0.18
Nodes (10): Automated Tests, Configuration & Root Layout, Goal Description, Manual Verification, [MODIFY] [layout.tsx](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/app/layout.tsx), [MODIFY] [tailwind.config.ts](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/tailwind.config.ts), Plan: Set `font-tajawal` globally on app root & Tailwind `sans`, Proposed Changes (+2 more)

### Community 312 - "Safha Ribbon Indicator"
Cohesion: 0.18
Nodes (10): Approach, Constraints, Decision Tree, Decisions Made, Files to Change, Safha Ribbon Indicator, Summary, Verified Test Cases (+2 more)

### Community 313 - "api/marks/route.ts"
Cohesion: 0.32
Nodes (8): browserDesignSystemConfig(), browserFindingsFromMap(), browserPrimaryFont(), checkBrowserDesignSystemSources(), collectBrowserFindings(), collectBrowserFindingsAsync(), decodeBrowserGoogleFamily(), normalizeBrowserFontName()

### Community 314 - "Generate Combined Critique Report"
Cohesion: 0.20
Nodes (10): Design Health Score, Design Specificity Verdict, Generate Combined Critique Report, Minor Observations, Overall Impression, Persona Red Flags, Priority Issues, Questions to Consider (+2 more)

### Community 315 - "Init flow"
Cohesion: 0.20
Nodes (10): Completion gate, Init flow, Step 1: Load current state, Step 2: Explore the project, Step 3: Interview for product truth, Step 4: Write PRODUCT.md, Step 5: Configure live mode when useful, Step 6: Wrap up or resume (+2 more)

### Community 316 - "collectVisualContrastCandidates"
Cohesion: 0.24
Nodes (10): analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), clampByte(), collectVisualContrastCandidates(), collectVisualContrastReasons(), getDirectText(), getDirectTextRect() (+2 more)

### Community 317 - "applyDeferredSvelteComponentAccepts"
Cohesion: 0.46
Nodes (7): cachePath(), filterFreshFindings(), pruneCache(), readCache(), readJson(), stalenessCheckDisabled(), writeCache()

### Community 318 - "Addendum — 2026-08-15: `popstate` can't stop the browser's own hard reload; use the Navigation API where available"
Cohesion: 0.20
Nodes (10): Addendum — 2026-08-15: `popstate` can't stop the browser's own hard reload; use the Navigation API where available, Constraints, Decision Tree, Decisions Made (new), Files to Change, Investigation, Root cause, Verified Test Cases (new) (+2 more)

### Community 319 - "Nav: Dedupe NavPillLink classNames into Shared Component"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Nav: Dedupe NavPillLink classNames into Shared Component, Root Cause / Approach, Summary, Verified Test Cases (+1 more)

### Community 320 - "0.1 — Light and gold variants in the lab"
Cohesion: 0.20
Nodes (10): 0.1 — Light and gold variants in the lab, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 321 - "0.2 — The mushaf page face in the lab"
Cohesion: 0.20
Nodes (10): 0.2 — The mushaf page face in the lab, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 322 - "0.3 — Small-screen composition in the lab"
Cohesion: 0.20
Nodes (10): 0.3 — Small-screen composition in the lab, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 323 - "1.1 — Rewrite the canon"
Cohesion: 0.20
Nodes (10): 1.1 — Rewrite the canon, Addendum — the regeneration step could not run as written (2026-08-21), Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary (+2 more)

### Community 324 - "3.1 — UI primitives"
Cohesion: 0.20
Nodes (10): 3.1 — UI primitives, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 325 - "Fix Tajweed Mushaf Swipe Flicker"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Fix Tajweed Mushaf Swipe Flicker, Root Cause, Summary, Verified Test Cases (+1 more)

### Community 326 - "Unify Tajweed toggle + offline downloads into one Mushaf Layout setting"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary, Unify Tajweed toggle + offline downloads into one Mushaf Layout setting, Verified Test Cases (+1 more)

### Community 327 - "Addendum — 2026-08-14: cold launch flashes the home page before redirecting"
Cohesion: 0.20
Nodes (10): Addendum — 2026-08-14: cold launch flashes the home page before redirecting, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause, Summary (+2 more)

### Community 328 - "Restructure Navigation for Clean UX"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Restructure Navigation for Clean UX, Root Cause / Approach, Summary, Verified Test Cases (+1 more)

### Community 329 - "Unify Accents: Replace Gold Accents and Ornaments with Emerald Green"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary, Unify Accents: Replace Gold Accents and Ornaments with Emerald Green, Verified Test Cases (+1 more)

### Community 330 - "Common Cognitive Load Violations"
Cohesion: 0.22
Nodes (9): 1. The Wall of Options, 2. The Memory Bridge, 3. The Hidden Navigation, 4. The Jargon Barrier, 5. The Visual Noise Floor, 6. The Inconsistent Pattern, 7. The Multi-Task Demand, 8. The Context Switch (+1 more)

### Community 331 - "Operate mode depth (and Read notes)"
Cohesion: 0.22
Nodes (9): Color, Components, Layout, Motion, Operate mode depth (and Read notes), Product constraints, Product permissions, The product slop test (+1 more)

### Community 332 - "Shape"
Cohesion: 0.22
Nodes (8): Cadence, Confirm and stop, Phase 1: Discovery interview, Phase 2: Resolve the design direction, Phase 3: Write the brief, Round 1: purpose, people, and outcome, Round 2: material, behavior, and boundaries, Shape

### Community 333 - "ADR 0047: Adopt the reader-lab design language app-wide, canon first"
Cohesion: 0.22
Nodes (9): Addendum — Phase 0.1 findings (2026-08-21), Addendum — Phase 0.2 findings (2026-08-21), Addendum — Phase 0.3 findings (2026-08-21), Addendum — Phases 3–5 (production), 2026-08-22, ADR 0047: Adopt the reader-lab design language app-wide, canon first, Consequences, Context, Decision (+1 more)

### Community 334 - "slice.py"
Cohesion: 0.28
Nodes (6): translate a path's numbers (pdftocairo emits absolute M/C/L only)., groups: list of (paths, punch_paths) rendered in order., all paths intersecting the rect, translated; viewBox does the clipping., shift(), svg(), tile()

### Community 335 - "Close Overlays on Back-Swipe (Mobile/Tablet PWA)"
Cohesion: 0.22
Nodes (9): Close Overlays on Back-Swipe (Mobile/Tablet PWA), Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause, Summary, Verified Test Cases (+1 more)

### Community 336 - "0.4 — Write the design-language spec"
Cohesion: 0.22
Nodes (9): 0.4 — Write the design-language spec, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary, Verified Test Cases (+1 more)

### Community 337 - "Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA)"
Cohesion: 0.22
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA), Root Cause, Summary, Verified Test Cases (+1 more)

### Community 338 - "Fix Sidebar Bottom Clip"
Cohesion: 0.22
Nodes (8): Constraints, Decisions Made, Files to Change, Fix, Fix Sidebar Bottom Clip, Root Cause, Summary, What NOT to Do

### Community 339 - "Addendum — 2026-08-14: swipe after a language switch reverts to Arabic page 1"
Cohesion: 0.22
Nodes (9): Addendum — 2026-08-14: swipe after a language switch reverts to Arabic page 1, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause, Summary, Verified Test Cases (+1 more)

### Community 340 - "Restore Continue Reading nav icon on installed PWA"
Cohesion: 0.22
Nodes (9): ADR Amendment, Approach, Constraints, Decisions Made, Files to Change, Restore Continue Reading nav icon on installed PWA, Root Cause, Summary (+1 more)

### Community 341 - "colorize.md"
Cohesion: 0.38
Nodes (7): borderColorsFromStyle(), borderWidthsFromStyle(), checkElementGptBorderShadow(), checkElementGptBorderShadowDOM(), checkGptThinBorderWideShadow(), shadowLayerAlpha(), shadowMaxBlurPx()

### Community 342 - "Persona-Based Design Testing"
Cohesion: 0.25
Nodes (8): 1. Impatient Power User: "Alex", 2. Confused First-Timer: "Jordan", 3. Accessibility-Dependent User: "Sam", 4. Deliberate Stress Tester: "Riley", 5. Distracted Mobile User: "Casey", Persona-Based Design Testing, Project-Specific Personas, Selecting Personas

### Community 343 - "Extract Flow"
Cohesion: 0.25
Nodes (7): Extract Flow, Step 1: Discover the Design System, Step 2: Identify Patterns, Step 3: Plan Extraction, Step 4: Extract & Enrich, Step 5: Migrate, Step 6: Document

### Community 344 - "live-setup.md"
Cohesion: 0.29
Nodes (7): checkLayout(), checkPageLayout(), isCardLike(), isCardLikeDOM(), isCardLikeFromProps(), parseRadiusToPx(), resolveBorderRadiusPx()

### Community 345 - "css"
Cohesion: 0.25
Nodes (9): buildSelectorSegment(), generateSelector(), isLikelyHashedClass(), tailwind, baseColor, config, css, cssVariables (+1 more)

### Community 346 - "checkRadialSpotlight"
Cohesion: 0.32
Nodes (8): checkElementRadialSpotlight(), checkElementRadialSpotlightDOM(), checkRadialSpotlight(), elementGradientValue(), parseColorMix(), parseRadialGradientStops(), splitTopLevelCommas(), spotlightLabel()

### Community 347 - "scaffoldSvelteComponentSession"
Cohesion: 0.33
Nodes (5): Before you finish, Scope is sovereign, The amplification, The skeleton test, Why it reads flat

### Community 348 - "Addendum — surah Sidebar was missed by the notifyNavigating fix (2026-08-16)"
Cohesion: 0.25
Nodes (8): Addendum — surah Sidebar was missed by the notifyNavigating fix (2026-08-16), Approach, Bug, Constraints, Decisions Made, Files to Change, Root cause, What NOT to Do

### Community 349 - "Android platform"
Cohesion: 0.47
Nodes (6): checkBorders(), checkElementBorders(), checkElementBordersDOM(), isNeutralColor(), isStatusContextElement(), isTabContextElement()

### Community 350 - "Generate Report"
Cohesion: 0.29
Nodes (7): Audit Health Score, Detailed Findings by Severity, Executive Summary, Generate Report, Patterns & Systemic Issues, Platform Conformance Verdict, Positive Findings

### Community 351 - "Cognitive Load Assessment"
Cohesion: 0.29
Nodes (7): Cognitive Load Assessment, Cognitive Load Checklist, Extraneous Load: Bad Design, Germane Load: Learning Effort, Intrinsic Load: The Task Itself, The Working Memory Rule, Three Types of Cognitive Load

### Community 352 - "Impeccable Finish Reviewer"
Cohesion: 0.29
Nodes (6): Checks, in order, Disposition, Impeccable Finish Reviewer, Input Contract, Output Contract, Verdict Pass

### Community 353 - "Impeccable Manual Edit Applier"
Cohesion: 0.29
Nodes (6): Checks, Entry Atomicity, Impeccable Manual Edit Applier, Input Contract, Output Contract, Workflow

### Community 354 - "ADR 0043: Overlays close on back-gesture via a shared history guard, coordinated with AndroidBackExitGuard"
Cohesion: 0.29
Nodes (7): Addendum — 2026-08-15: "is my entry still on top" must be deferred and identity-checked, Addendum — 2026-08-16: microtask defer is not enough for a Link's own navigation, ADR 0043: Overlays close on back-gesture via a shared history guard, coordinated with AndroidBackExitGuard, Consequences, Context, Decision, Options Considered

### Community 355 - "verses-words.js"
Cohesion: 0.38
Nodes (6): axios, correctAudioUrl(), fetchPage(), fetchVersesAndWords(), ADR-0009, PARAMS

### Community 356 - "Diagnostic Scan"
Cohesion: 0.40
Nodes (5): cloneDefaultConfig(), detectorSection(), hookSection(), readConfig(), safeReadJson()

### Community 357 - "/impeccable hooks"
Cohesion: 0.33
Nodes (6): Constraints, Failure modes, Flow, /impeccable hooks, Intentional findings, Routing

### Community 358 - "normalizeGitHubEvent"
Cohesion: 0.47
Nodes (6): applyPatchText(), envProjectDir(), looksLikeApplyPatch(), normalizeGitHubEvent(), normalizeHookEvent(), parseGitHubToolArgs()

### Community 359 - "/visualize-fq-design"
Cohesion: 0.33
Nodes (5): Execution, Next Steps, Screenshot source, Setup, /visualize-fq-design

### Community 360 - "ADR 0040: Double-push history guard for Android PWA back-to-exit"
Cohesion: 0.33
Nodes (6): Addendum — 2026-08-14: the pushed state object must be freshly allocated, ADR 0040: Double-push history guard for Android PWA back-to-exit, Consequences, Context, Decision, Options Considered

### Community 361 - "0042 — PWA Cold Launch Resolves Before First Paint"
Cohesion: 0.33
Nodes (6): 0042 — PWA Cold Launch Resolves Before First Paint, Addendum — 2026-08-18: un-hide ContinueReadingLink on standalone mobile/tablet, Alternatives Considered, Consequences, Context, Decision

### Community 362 - "PWA Testing (Browser Pane, No Device)"
Cohesion: 0.33
Nodes (5): PWA Testing (Browser Pane, No Device), Simulating a back-gesture / back button, Spoofing Android, Spoofing standalone/fullscreen mode, What this can't cover

### Community 363 - "Impeccable Documenter"
Cohesion: 0.40
Nodes (4): Impeccable Documenter, Input Contract, Output Contract, Workflow

### Community 364 - "hook.mjs"
Cohesion: 0.83
Nodes (3): isStopEvent(), main(), readStdin()

### Community 365 - "ADR 0043: Breakpoint-Dependent Positioning Must Be CSS-Gated, Not JS-Hook-Gated"
Cohesion: 0.40
Nodes (5): ADR 0043: Breakpoint-Dependent Positioning Must Be CSS-Gated, Not JS-Hook-Gated, Consequences, Context, Decision, Options Considered

### Community 366 - "ADR 0045: Use the Navigation API to intercept the overlay-close back-gesture, with a popstate fallback"
Cohesion: 0.40
Nodes (5): ADR 0045: Use the Navigation API to intercept the overlay-close back-gesture, with a popstate fallback, Consequences, Context, Decision, Options Considered

### Community 367 - "Heuristics Scoring Guide"
Cohesion: 0.50
Nodes (4): Heuristics Scoring Guide, Issue Severity (P0–P3), Reference Material, Score Summary

### Community 368 - "detect.mjs"
Cohesion: 0.50
Nodes (3): candidates, detectorPath, __dirname

## Ambiguous Edges - Review These
- `Static Generation Strategy (604 Quran Pages)` → `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)`  [AMBIGUOUS]
  docs/architecture/adr/0015-release-branch-workflow.md · relation: conceptually_related_to
- `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra` → `ADR TEMPLATE.md`  [AMBIGUOUS]
  docs/architecture/adr/TEMPLATE.md · relation: references
- `docs/plans/release-branch-workflow.md` → `Review dimensions (Bugs, Quality, Plan Consistency)`  [AMBIGUOUS]
  docs/workflow/review-work.md · relation: conceptually_related_to

## Knowledge Gaps
- **2065 isolated node(s):** `graphify-sync-rebuild.sh script`, `PYTHONHASHSEED`, `GRAPHIFY_CHANGED`, `path`, `ROOT` (+2060 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Static Generation Strategy (604 Quran Pages)` and `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra` and `ADR TEMPLATE.md`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `docs/plans/release-branch-workflow.md` and `Review dimensions (Bugs, Quality, Plan Consistency)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `v()` connect `modern-screenshot.umd.js` to `css-cascade.mjs`, `checks.mjs`, `[locale]/layout.tsx`, `parseAnyColor`, `plans/route.ts`, `resumeSession`, `live-browser.js`, `app/layout.tsx`, `jsonResponse`, `collectBrowserFindings`, `e2e-fixture/generate.js`, `rel`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `useTranslations()` connect `[locale]/layout.tsx` to `SearchBar.tsx`, `MyPlansList.tsx`, `RecitationContext.tsx`, `ReaderPager.tsx`, `useTranslations`, `QuranSafha.tsx`, `SettingsSidebar.tsx`, `MyMarksList.tsx`, `use-translations.ts`, `RecitationSettingsSheet.tsx`, `ReaderLabSettingsSidebar.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `PlanEnrollForm()` connect `[locale]/layout.tsx` to `modern-screenshot.umd.js`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 44 inferred relationships involving `el()` (e.g. with `browserFindingsFromMap()` and `collectVisualContrastCandidates()`) actually correct?**
  _`el()` has 44 INFERRED edges - model-reasoned connections that need verification._