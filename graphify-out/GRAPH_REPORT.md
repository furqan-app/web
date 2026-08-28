# Graph Report - furqan  (2026-08-28)

## Corpus Check
- 1933 files · ~2,978,065 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 6773 nodes · 13810 edges · 386 communities (330 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 199 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5bfee538`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AccessibleMushafList.tsx
- ADR 0028: Reader uses a persistent client pager over slim static content
- cn
- live-browser.js
- css-cascade.mjs
- jsonResponse
- streak/route.ts
- checks.mjs
- Tablet Nav Overlay Effect
- RecitationSettingsSheet.tsx
- ReaderPager.tsx
- context.mjs
- QuranSafha.tsx
- connectSSE
- design-system.mjs
- Shared Mushaf Access
- 5.1 — Page face and reader
- detect-antipatterns-browser.js
- setLiveState
- doctor.mjs
- edge.ts
- [locale]/layout.tsx
- parseAnyColor
- hook-lib.mjs
- Furqan Design Language
- e2e-fixture/generate.js
- sw.ts
- MyMarksList.tsx client component
- Addendum 3 (2026-08-24): the self-close echo path must arm the same reload-watch as the gesture path
- svelte-component.mjs
- actions/plans.ts
- live-accept.mjs
- DesktopQuranFontSizeContext.tsx
- QuranSafha
- Nav
- Daily Awrad UI
- Regression Classes
- Fix Reader Navigation Infinite Render Loop
- initPageChat
- Column-Font Contract
- concept-seed.mjs
- Split Quran Content and Application Data into Two Databases
- compilerOptions
- ReaderPager
- Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette
- Page Turn Blanks the Reader on Slow Networks
- modern-screenshot.umd.js
- PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit
- Steps
- Mobile Safha: Full-Screen Sizing
- Fix: Verse Rendering Outside the Quran Page
- Fix: Surah Banner Placement and Standalone Line Sizing
- Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle
- live-commit-manual-edits.mjs
- layout.md
- Font System (Immutable FontFace Registry)
- release workflow (/release)
- PlanAssignmentRow component
- scripts
- resolveLengthPx
- SettingsSidebar
- Adopt Prisma Migrations for furqan_app
- Base Notification System
- Mushaf Double-Page Spread Toggle
- RecitationContext.tsx
- Fix Hostinger Auto-Deploy Build Failures
- Fix Homepage CDN Cache Poisoning (Hostinger Edge)
- captureElementToBlob
- QuranSafha.tsx
- impeccable-config.mjs
- Tailwind Safelist for Dynamic Quran Font-Size Classes
- start-task Load context gate
- ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision)
- compress-fq-docs
- /ship-fq-task skill
- Functional E2E: Sidebar Drawer & Navigation Tabs
- utils.ts
- MyPlansList
- fq-logger: Structured Logging & Observability
- fq-reader-spread-container flex:1 + space-between fill
- ReaderPager.tsx (client persistent pager)
- live-status.mjs
- plan-fq-task workflow
- ADR 0025: A mark is one row - category plus optional comment
- Furqan (Quran Memorization Tool)
- MushafHub
- PWA Conversion + Offline Quran Page Reading
- vh-derived vertical spacing formula (lineGapRatio 0.417)
- /release orchestrator skill
- Sentry Error Tracking
- ReaderPage.tsx
- AI-First Documentation & Workflow System
- detect-url.mjs
- Fix dead tailwindcss-animate classes in dialog.tsx (plugin not installed)
- Fix: Hamza-Alif Mismatch in Verse Search
- createLiveBrowserSessionState
- hook-admin.mjs
- parseAnyColor
- ADR 0030: Plan engine - code-defined templates, typed scheduling rules, derived daily assignments
- Verse & Fractional-Page Granularity for Awrad
- ADR 0037: Notification dispatch via a channel registry, no queue/worker infra
- Arrow Controls on Desktop
- Mobile Navigation UX
- UI Workflow Enhancements
- Fix Desktop Search Dropdown Hidden by Reader Stacking Context
- Fix ViewingChip IntlError: missing {name} interpolation variable
- global-error.tsx
- Fix Marks Broken by Hardcoded localhost URL
- Sentry Error Tracking via DSN-Presence Gating
- checkHeadingRhythmDOM
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
- mountSvelteComponentVariant
- devDependencies
- components.json
- live-wrap.mjs
- .claude/hooks/mujaz-stats.js
- handlePollPost
- detect-html.mjs
- hook-before-edit.mjs
- Addendum — Wrong surah name on shared multi-surah pages (2026-08-16)
- useTranslations
- live-server.mjs
- extract-translations.js
- ADR 0039: `stg` tracks `main` directly, decoupled from release branches
- ui-motion guidance
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
- 4.1 — Marks and plans screens
- next.config.mjs
- manual-apply.mjs
- Scan mode (approach C: auto-extract, then confirm descriptive language)
- db.ts
- createLiveBrowserDomHelpers
- ADR 0038: Reader size contracts are per-band, and tablet is always double-page
- extends
- instrumentation.ts
- Furqan
- Workflow Index
- auth-middleware.ts
- filterFindings
- accept-css.mjs
- detect-csp.mjs
- reader-shot.mjs
- detect-text.mjs
- .claude/hooks/graphify-sync-rebuild.sh
- .claude/hooks/mujaz-statusline.sh
- embed-prompt.mjs
- design-parser.mjs
- readLiveServerInfo
- svelte-ast.mjs
- reader.ts
- live-poll.mjs
- SettingsSidebar.tsx
- generate-image.mjs
- scanCssTextForPulsingDot
- Nielsen's 10 Heuristics
- journal.mjs
- 1.1 — Rewrite the canon
- impeccable/SKILL.md
- live.md
- engine.ts
- api/marks/route.ts
- filterFindings
- el
- live-copy-edit-agent.mjs
- Changes
- initGlobalBar
- runHook
- bolder.md
- Mushaf Page Frame — Designer Asset Spec
- resolveLengthPx
- Stabilize Tajweed Stylesheet Injection and Extend Swipe Hover Suppression
- tailwind-merge
- doctor.md
- collectBrowserFindings
- impeccable-paths.mjs
- roots.mjs
- terse mode (mujaz)
- live-manual-edit-evidence.mjs
- Responsive Design
- handleManualEditActivity
- event-validation.mjs
- injected/index.mjs
- playwright.config.ts
- postcss.config.mjs
- sentry.client.config.ts
- tailwind.config.ts
- checkHeadingRhythmDOM
- tag-strategy.mjs
- DESIGN.md
- Homepage Design & UX Elevation
- syncEditBadgeHitProxies
- source-lock.mjs
- Offline Recitation Audio Download
- template-extensions.mjs
- next-env.d.ts
- generate-mushaf-thumbnails.js
- The Toolkit
- manual-edit-routes.mjs
- Design System: Furqan
- /ship-fq-task
- instructions.mjs
- Nocturnal Reader Lab — Desktop RTL
- Trello → GitHub Issues Migration Plan
- Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation
- onAnnotDown
- frameworks/index.mjs
- tanstack-adapter.mjs
- Home Page Design Fixes
- quran-json/generate.js
- live.mjs
- .codex/hooks/mujaz-stats.js
- sveltekit-adapter.mjs
- 4.3 — Search and settings surfaces
- serve-question.mjs
- expandScanTargets
- detect-utils.mjs
- analyzeVisualContrastCandidate
- animate.md
- Handle `generate`
- context-signals.mjs
- session-store.mjs
- Wire /impeccable into the plan/implement/review workflow
- sentry/route.ts
- resolveLiveInjectionAnchor
- Generate Report
- parseRgb
- deps.ts
- critique-storage.mjs
- reminders/route.ts
- seed.js
- 4.4 — Mushaf hub and shared-grant surfaces
- Impeccable Asset Producer
- optimize.md
- graphify.js
- 2.1 — Semantic tokens
- 4.2 — Home screen
- sampleCssBackground
- pin.mjs
- Simplify the Design
- Hardening Dimensions
- CI Quality Gate: PR Lint, Typecheck & Vitest Workflow
- StaticElement
- ui-core.mjs
- 3.2 — Shared chrome
- generation-preflight.mjs
- Product
- clarify.md
- critique.md
- Design Migration — reader-lab language, app-wide
- New visual work
- polish.md
- quieter.md
- Restructure Navigation for Clean UX
- palette.mjs
- 0042-pwa-launch-resolves-before-first-paint.md
- Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav)
- Safha Ribbon Indicator
- Generate Combined Critique Report
- Init flow
- Plan: Set `font-tajawal` globally on app root & Tailwind `sans`
- Addendum 5: Translucent Capsule Surah Toggler UX & Affordance (2026-08-26)
- Addendum — 2026-08-15: `popstate` can't stop the browser's own hard reload; use the Navigation API where available
- Nav: Dedupe NavPillLink classNames into Shared Component
- Fix Tajweed Mushaf Swipe Flicker
- Unify Tajweed toggle + offline downloads into one Mushaf Layout setting
- Addendum — 2026-08-14: cold launch flashes the home page before redirecting
- Common Cognitive Load Violations
- Operate mode depth (and Read notes)
- Shape
- 20260724200427_add_plan_engine_tables/migration.sql
- slice.py
- Close Overlays on Back-Swipe (Mobile/Tablet PWA)
- Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA)
- Fix Sidebar Bottom Clip
- Addendum — 2026-08-14: swipe after a language switch reverts to Arabic page 1
- Restore Continue Reading nav icon on installed PWA
- Persona-Based Design Testing
- Extract Flow
- 0.1 — Light and gold variants in the lab
- 0.2 — The mushaf page face in the lab
- 0.3 — Small-screen composition in the lab
- staleness-notice.mjs
- 3.1 — UI primitives
- checkElementGptBorderShadowDOM
- Functional E2E: Settings & Preferences Persistence
- Generate Report
- Cognitive Load Assessment
- Unify Accents: Replace Gold Accents and Ornaments with Emerald Green
- Impeccable Manual Edit Applier
- selectAvailablePendingEvent
- ADR 0043: Overlays close on back-gesture via a shared history guard, coordinated with AndroidBackExitGuard
- ADR 0047: Adopt the reader-lab design language app-wide, canon first
- axios
- AGENTS.md
- 0.4 — Write the design-language spec
- ADR 0040: Double-push history guard for Android PWA back-to-exit
- 0042 — PWA Cold Launch Resolves Before First Paint
- PWA Testing (Browser Pane, No Device)
- ADR 0043: Breakpoint-Dependent Positioning Must Be CSS-Gated, Not JS-Hook-Gated
- ADR 0045: Use the Navigation API to intercept the overlay-close back-gesture, with a popstate fallback
- Heuristics Scoring Guide
- detect.mjs
- hook.mjs
- measure.py
- preview.py
- tune-vars.js
- check-linefit.js
- @radix-ui/react-dropdown-menu
- /visualize-fq-design
- @radix-ui/react-slot
- doctor.md
- render-context.ts
- Session Handoff — Dark Theme Mushaf Unification
- Addendum — surah Sidebar was missed by the notifyNavigating fix (2026-08-16)
- Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit
- Elevation & Depth
- i18n Setup (next-intl, ar/en locales)
- isSearchQueryValid
- .codex/hooks/graphify-sync-rebuild.sh
- .codex/hooks/mujaz-statusline.sh
- cmdk
- vertical/page.tsx
- verses-words.js
- checkTextOcclusionDOM
- Components
- 20260708033111_init/migration.sql
- 20260803193743_add_notification_tables/migration.sql
- checkElementRadialSpotlightDOM
- rules/graphify.md
- workflows/graphify.md
- sync-issue-board-status.sh
- cmdk
- live-inject.mjs
- opencode.json
- next-intl
- @radix-ui/react-dialog
- @radix-ui/react-slider
- @radix-ui/react-tabs
- react-virtuoso
- @types/web-push

## God Nodes (most connected - your core abstractions)
1. `cn()` - 121 edges
2. `useTranslations()` - 106 edges
3. `jsonResponse()` - 60 edges
4. `extractUser()` - 44 edges
5. `toLocaleNumeral()` - 39 edges
6. `parseAnyColor()` - 37 edges
7. `runHook()` - 37 edges
8. `collectBrowserFindings()` - 36 edges
9. `parseAnyColor()` - 34 edges
10. `setLiveState()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `ScaleMarks()` --calls--> `cn()`  [EXTRACTED]
  app/components/DesktopQuranFontSizeControls.tsx → lib/utils.ts
- `FilterDot()` --calls--> `cn()`  [EXTRACTED]
  app/components/marks/MyMarksList.tsx → lib/utils.ts
- `Fix RSC Cache Poisoning on Hostinger` --semantically_similar_to--> `Fix Homepage CDN Cache Poisoning (Hostinger Edge)`  [INFERRED] [semantically similar]
  docs/plans/fix-rsc-cache-poisoning.md → docs/plans/fix-homepage-cdn-cache-poisoning.md
- `Mushaf Double-Page Spread (Pairing, Data-Fetch, Decoration)` --semantically_similar_to--> `Future Two-Page Book Layout (Recto/Verso)`  [INFERRED] [semantically similar]
  docs/architecture/adr/0013-mushaf-double-page-spread.md → docs/architecture/APP_PURPOSE.md
- `POST()` --calls--> `getLogger()`  [EXTRACTED]
  app/api/webhooks/sentry/route.ts → lib/fq-logger/index.ts

## Import Cycles
- None detected.

## Communities (386 total, 56 thin omitted)

### Community 0 - "AccessibleMushafList.tsx"
Cohesion: 0.12
Nodes (23): AccessibleMushafList(), Props, GenerateCodeCard(), GrantedViewersList(), Props, MushafHub(), PersonAvatar(), Props (+15 more)

### Community 1 - "ADR 0028: Reader uses a persistent client pager over slim static content"
Cohesion: 0.05
Nodes (41): QuranSwipeNav component (mobile swipe reader), ADR 0019: sessionStorage key for cross-page swipe direction, ADR 0020: Client Component required for inline <style> injection, FontFaceInjector.tsx (Client Component), ReaderPage Server Component, Cross-chapter stop-point chaining (Juz/Hizb/Rub stop points), data-fq-word attribute highlight mechanism (supersedes DOM ref registry), QDC runtime proxy (app/api/quran/recitations) (+33 more)

### Community 2 - "cn"
Cohesion: 0.05
Nodes (65): NotificationListResponse, MarkerColorPicker(), Props, getTitle(), MarkedByLine(), MarkModal(), ModalProps, ADR-0012 (+57 more)

### Community 3 - "live-browser.js"
Cohesion: 0.03
Nodes (126): addManualContextText(), applyEditing(), applyGlobalBarLabelState(), applyPlaceholderSizingStyles(), bufferToBase64(), buildCollapsible(), buildColorModels(), buildListHtml() (+118 more)

### Community 4 - "css-cascade.mjs"
Cohesion: 0.11
Nodes (29): applyStaticDeclaration(), buildBorderOverrideMap(), parseShorthand(), resolveVar(), collectStaticCssRules(), compareStaticPriority(), cssPropToCamel(), expandStaticBoxValues() (+21 more)

### Community 5 - "jsonResponse"
Cohesion: 0.08
Nodes (52): deleteMark(), getGrantForViewer(), MarkBody, MarkWithAuthor, ADR-0012, ADR-0025, upsertMark(), withAuthorNames() (+44 more)

### Community 6 - "streak/route.ts"
Cohesion: 0.25
Nodes (10): GET(), toDateString(), addDays(), ProgressLogEntry, continuesStreak(), DayStatus, deriveStreak(), StreakPlanInput (+2 more)

### Community 7 - "checks.mjs"
Cohesion: 0.03
Nodes (121): ANIMATION_VALUE_KEYWORDS, borderColorsFromStyle(), borderWidthsFromStyle(), checkBorders(), checkClippedOverflow(), checkEdgeFlushCardsDOM(), checkElementBlinkingCursorDOM(), checkElementBorders() (+113 more)

### Community 8 - "Tablet Nav Overlay Effect"
Cohesion: 0.07
Nodes (31): Seeder guard+reset+fetch+insert algorithm, scripts/quran-seed/seed.js orchestrator, ADR 0027 — tablet swipe carousel, 3-panel tablet swipe carousel, Tablet Nav Overlay Effect, Mobile reader UX addendum (nav overlay, long-press), --mushaf-* printed-mushaf CSS tokens, NavOverlayContext (+23 more)

### Community 9 - "RecitationSettingsSheet.tsx"
Cohesion: 0.04
Nodes (79): Props, ReciterCombobox(), compareVerseKeys(), CustomRangePicker(), LAST_VERSE_POINT_CACHE, nextRepeatCount(), NumberCombobox(), pageSurahRange() (+71 more)

### Community 10 - "ReaderPager.tsx"
Cohesion: 0.04
Nodes (85): KeepScreenAwakeSync(), Props, QuranPage, buildTajweedRules(), FontFaceInjector(), nextKept(), Props, ADR-0023 (+77 more)

### Community 11 - "context.mjs"
Cohesion: 0.05
Nodes (89): appendAutonomyCounterDirective(), appendDetectorFallback(), appendImageGenDirective(), appendImageToolsDirective(), appendSubagentAuthorizationDirective(), appendSurfaceBriefContext(), automaticHookMode(), buildMissingTargetDirective() (+81 more)

### Community 12 - "QuranSafha.tsx"
Cohesion: 0.03
Nodes (64): Bismillah calligraphy SVG (decorative Arabic glyph: "Bismillah ir-Rahman ir-Raheem"), MarksSignedOutPrompt(), chipByCategory, commentPreview(), FilterDot(), FILTERS, groupBySurah(), MyMarksList() (+56 more)

### Community 13 - "connectSSE"
Cohesion: 0.07
Nodes (71): abortSvelteComponentInjection(), applyParamDefaults(), applyParamValue(), applySavedSessionMeta(), clampVariantIndex(), clearSession(), closedClipPath(), completeParameterPublication() (+63 more)

### Community 14 - "design-system.mjs"
Cohesion: 0.07
Nodes (67): addClampEndpoints(), addColorObject(), addDesignColor(), addFontSizeStep(), addRoundedScale(), addRoundedToken(), addSidecarColors(), addSidecarRadii() (+59 more)

### Community 15 - "Shared Mushaf Access"
Cohesion: 0.08
Nodes (27): ADR 0009 — reproducible Quran seeder, Reproducible Quran Database Seeder, ADR 0012 — shared mushaf access, Shared Mushaf Access, Mark author attribution (Marked by X), MushafAccessGrant model, MushafShareCode model, ViewingChip component (+19 more)

### Community 16 - "5.1 — Page face and reader"
Cohesion: 0.09
Nodes (22): 5.1 — Page face and reader, A defect this subtask found in 4.1, (a) The stage, Addendum: Mobile Navbar Settings Icon & Global Light Effect Removal, Addendum: Mobile/Tablet Safha Header and Footer Text Color Fix, Addendum: Visual Feedback Round (Lighting & Mushaf Margins), Approach, (b) The page face (+14 more)

### Community 17 - "detect-antipatterns-browser.js"
Cohesion: 0.06
Nodes (54): browserColorsClose(), browserDesignSystemConfig(), browserHasDirectText(), browserPrimaryFont(), browserRadiusTokens(), browserSampleText(), buildSelectorSegment(), checkBrowserDesignSystemSources() (+46 more)

### Community 18 - "setLiveState"
Cohesion: 0.08
Nodes (69): abandonForeignSession(), buildInsertPlaceholderSnapshotFromDom(), buildPickedAnchorSnapshot(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), captureAndEmit(), checkpointPayload() (+61 more)

### Community 19 - "doctor.mjs"
Cohesion: 0.08
Nodes (55): applyFixes(), cli(), collect(), parseArgs(), readProjectRootPatterns(), rel(), renderText(), safeRead() (+47 more)

### Community 20 - "edge.ts"
Cohesion: 0.23
Nodes (13): build(), CONSOLE_FOR_LEVEL, Level, LEVEL_VALUE, write(), wrap(), redact(), SENSITIVE_KEYS (+5 more)

### Community 21 - "[locale]/layout.tsx"
Cohesion: 0.05
Nodes (45): LastReadPageSync(), ReaderPage(), ReaderPageProps, ADR-0012, ADR-0013, ADR-0028, Props, ReaderPageSync() (+37 more)

### Community 22 - "parseAnyColor"
Cohesion: 0.07
Nodes (62): buildHtmlPatternCorpora(), checkColors(), checkElementAIPaletteDOM(), checkElementColors(), checkElementColorsDOM(), checkElementGlowDOM(), checkElementHoverContrast(), checkElementIconTile() (+54 more)

### Community 23 - "hook-lib.mjs"
Cohesion: 0.07
Nodes (48): ACK_EXTS, ADVISORY_RULES, applyConfigSource(), applyDetectorConfigSource(), applyPatchText(), canonicalPathCache, clampByte(), cloneDefaultConfig() (+40 more)

### Community 24 - "Furqan Design Language"
Cohesion: 0.11
Nodes (19): 10. Motion, 11. Per-band behaviour, 12. Rules that did not survive derivation, 1. Character, 2. Composition, 3. Atmosphere, 4. Depth, 5. Accent grammar (+11 more)

### Community 25 - "e2e-fixture/generate.js"
Cohesion: 0.13
Nodes (15): cliProgress, {
  deriveRubs,
  deriveRubVerseMappings,
  derivePageMetadata,
}, { fetchChapters }, {
  fetchMushafLayout,
  layoutFromSeededWords,
  LAYOUT_MUSHAF_IDS,
  DEFAULT_MUSHAF_ID,
}, { fetchVersesAndWords, TOTAL_PAGES }, fs, insertStatements(), ADR-0033 (+7 more)

### Community 26 - "sw.ts"
Cohesion: 0.04
Nodes (97): Props, PanelState, Props, OfflineInstallPrompt(), ADR-0014, OfflineProgressBar(), Props, OfflineSetupGate() (+89 more)

### Community 27 - "MyMarksList.tsx client component"
Cohesion: 0.12
Nodes (20): ADR 0017 — App DB uses migrations, not db push, ADR 0022 — verse/word comments as mark type (superseded), ADR 0024 — color marks encode category (amended), ADR 0025 — a mark is one row: category plus optional comment, Unify Marks: Category + Optional Comment, MarkModal.tsx (single picker+comment flow), Mark Prisma model (category + comment), MyMarksList.tsx (category tabs, follow-on responsive filter) (+12 more)

### Community 28 - "Addendum 3 (2026-08-24): the self-close echo path must arm the same reload-watch as the gesture path"
Cohesion: 0.22
Nodes (9): Addendum 3 (2026-08-24): the self-close echo path must arm the same reload-watch as the gesture path, Bug, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root cause, Verified Test Cases (+1 more)

### Community 29 - "svelte-component.mjs"
Cohesion: 0.07
Nodes (59): collectUnusedSelectors(), verifyAcceptedSource(), buildPropsScriptV2(), loadSvelteCompiler(), appendCssToSvelteStyle(), appendSanitizedCssRule(), applyDeferredSvelteComponentAccepts(), bakeParamValuesInCss() (+51 more)

### Community 30 - "actions/plans.ts"
Cohesion: 0.08
Nodes (34): PlanProgressHistoryEntry, FRACTION_ELIGIBLE_TRACKS, isRepetitionsField(), modeForGroup(), PlanEnrollForm(), Props, QuantityMode, ADR-0038 (+26 more)

### Community 31 - "live-accept.mjs"
Cohesion: 0.11
Nodes (40): safeSessionId(), resolveLiveTemplateExtensions(), acceptCli(), acceptReceiptPath(), argVal(), buildAcceptedWrappedSource(), buildCarbonizeReplacement(), decodeHtmlAttr() (+32 more)

### Community 32 - "DesktopQuranFontSizeContext.tsx"
Cohesion: 0.15
Nodes (15): DesktopQuranFontSizeControls(), ScaleMarks(), SIZES, DEFAULT_DESKTOP_QURAN_FONT_SIZE, DESKTOP_QURAN_FONT_SIZES, QURAN_LINE_GAP_RATIO, QURAN_TAJWEED_FONT_RATIO, QURAN_TAJWEED_LINE_GAP_RATIO (+7 more)

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

### Community 38 - "initPageChat"
Cohesion: 0.08
Nodes (53): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+45 more)

### Community 39 - "Column-Font Contract"
Cohesion: 0.14
Nodes (15): ADR 0002 — Non-page Quran text rendering, ADR 0012 — Mark from_user/to_user ownership, ADR 0025 — Mark granularity, Mark model (verse/word granularity), No FK/relation across Quran/App domains rule, getDirection() helper (app/utils/i18n.ts), Column-Font Contract, Common Rendering Mistakes table (+7 more)

### Community 40 - "concept-seed.mjs"
Cohesion: 0.07
Nodes (50): API_BASE, API_TIMEOUT_MS, apiBudgetMs(), dealCompositions(), driveSelection(), fetchRoll(), here, loadLocal() (+42 more)

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

### Community 46 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (55): ae(), be(), bt(), Ce(), s(), Ct(), de(), dt() (+47 more)

### Community 47 - "PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit"
Cohesion: 0.22
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit, Summary, Verified Test Cases (+1 more)

### Community 48 - "Steps"
Cohesion: 0.12
Nodes (15): Claude-specific additions — Step 5, creating the issues, One child per workable point, Parent epic (create first), /refine-fq-task, What NOT to do (Claude-specific), 0. Check for existing coverage — before anything else, 1. Load context — mandatory gate, before investigating or writing anything, 2. Investigate the boundary (+7 more)

### Community 49 - "Mobile Safha: Full-Screen Sizing"
Cohesion: 0.18
Nodes (11): Remove Safha Card Background on Mobile, QuranSafha.tsx (bg-card md:-only fix), ADR 0011 — mobile Quran font scale vw formula, --fq-mobile-font width-derived font formula, Mobile Safha: Full-Screen Sizing, QuranSwipeNav.tsx (renamed from QuranPageShell), Post-navigation compositor flicker (accepted platform limitation), Mobile Swipe Page Animation (+3 more)

### Community 50 - "Fix: Verse Rendering Outside the Quran Page"
Cohesion: 0.18
Nodes (11): ADR 0002: UthmanicHafs1Ver18 global font, app/api/search/chapters/route.ts, app/api/search/verses/route.ts, RubList.tsx, SearchBar.tsx, SearchQueryResults.tsx, app/constants/search.ts, app/hooks/use-search.ts (+3 more)

### Community 51 - "Fix: Surah Banner Placement and Standalone Line Sizing"
Cohesion: 0.22
Nodes (10): ADR 0004: 15-slot page budget / font scale, ADR 0016: Surah banner (superseded by line_number-gap algorithm), QuranLine.tsx, app/constants/font.ts, app/globals.css, app/surah-frame.svg, KFGQPC glyph licence gate — unresolved blocking precondition (Addendum 8), Fix: Surah Banner Placement and Standalone Line Sizing (+2 more)

### Community 52 - "Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle"
Cohesion: 0.22
Nodes (10): ADR 0013: Mushaf double-page spread (partner font not preloaded), ADR 0014: PWA offline architecture, ADR 0027: QuranSwipeNav remount on navigation, QuranWord.tsx, app/hooks/use-is-tablet.ts, app/hooks/use-pwa-precache.ts, app/sw.ts, Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle (+2 more)

### Community 53 - "live-commit-manual-edits.mjs"
Cohesion: 0.10
Nodes (49): allEntryIds(), argVal(), buildRepairBatch(), candidatesForEntry(), changedFilesSinceSnapshot(), clearAppliedEntries(), collectApplyOwnedFiles(), collectRollbackFiles() (+41 more)

### Community 54 - "layout.md"
Cohesion: 0.05
Nodes (41): Adaptation Strategies, Assess Adaptation Challenge, Implement & Verify, Orientation & foldables, Phone → Tablet (iPad / large screens), Platform → platform (iOS ↔ Android), Web → native (porting a website or web app), Android platform (+33 more)

### Community 55 - "Font System (Immutable FontFace Registry)"
Cohesion: 0.22
Nodes (10): Encoding for Quran Text Rendered Outside the Page Route, Normalize Hamza-Alif Forms in Incoming Search Query, FontFaceInjector, page-font-registry.ts (ensurePageFonts), QuranFontScaleContext, QuranFontScaleControls, SearchBar, SearchQueryResults (+2 more)

### Community 56 - "release workflow (/release)"
Cohesion: 0.16
Nodes (11): /cut-release <major|minor|patch>, /promote-release, /release <major|minor|patch>, /sync-main-from-prod, ADR 0015, ADR 0026, release workflow (/release), Cut Release (/cut-release) (+3 more)

### Community 57 - "PlanAssignmentRow component"
Cohesion: 0.20
Nodes (10): activeOverride state ({id,label}), ADR 0033 — mushaf editions (page numbers edition-relative), app/lib/plans/assignment-range.ts (isPageInAssignmentRange, planPlaybackSessionId), GET /api/quran/pages/[pageId]/bounds route (extended with firstVerseKey), decideChapterEnd() (isRepeatableRange param), Addendum — Disable Stop-at/Repeat During an Override, Listening Wird: Inline Playback on Assignment Rows, PlanAssignmentRow component (+2 more)

### Community 58 - "scripts"
Cohesion: 0.06
Nodes (32): name, private, scripts, app-generate, app-migrate-dev, app-studio, build, build:local (+24 more)

### Community 59 - "resolveLengthPx"
Cohesion: 0.10
Nodes (20): Animate complex properties, Assess What "Extraordinary" Means Here, For data-heavy interfaces, For functional UI, For performance-critical UI, For visual/marketing surfaces, Implement with Discipline, Interact with the device (+12 more)

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
Cohesion: 0.24
Nodes (10): ADR 0021 — recitation playback (QDC proxy, audio-driven navigation), chainToNextChapter cross-chapter chaining logic, Addendum 9 — Custom stop-at point (page or verse), QDC audio API (api.qurancdn.com) proxied via RecitationProvider adapter, Addendum 7 — whole-range repeat never looping (currentVerseKeyRef stale bug), RecitationContext.tsx, Add Quran Recitation Playback with Reciter Selection, RecitationPlayerBar.tsx (persistent bottom bar) (+2 more)

### Community 66 - "Fix Hostinger Auto-Deploy Build Failures"
Cohesion: 0.29
Nodes (8): ADR 0010: Prisma no explicit datasource URL, app/api/auth/options.ts, app/utils/db.ts, Fix Prisma Connection Exhaustion on Next.js Dev Hot-Reload, Fix Hostinger Auto-Deploy Build Failures, Fix NextAuth JWT/Session Corruption on Transient DB Error, Fix RSC Cache Poisoning on Hostinger, next.config.mjs

### Community 67 - "Fix Homepage CDN Cache Poisoning (Hostinger Edge)"
Cohesion: 0.25
Nodes (8): ADR 0011: Mobile Quran font scale vw formula, ADR 0035: Bounded revalidate on static document routes, QuranSwipeNav.tsx (renamed from QuranPageShell), app/[locale]/page.tsx, app/[locale]/pages/[id]/page.tsx, app/[locale]/pages/vertical/page.tsx, Fix Homepage CDN Cache Poisoning (Hostinger Edge), Fix Reversed Mobile Swipe Navigation Direction

### Community 68 - "captureElementToBlob"
Cohesion: 0.12
Nodes (20): averageRgb01(), captureChromeNodes(), captureElementFromRenderedAncestor(), captureElementToBlob(), compileShader(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor() (+12 more)

### Community 69 - "QuranSafha.tsx"
Cohesion: 0.33
Nodes (7): MarkModal.tsx, Sidebar.tsx, QuranSafha.tsx, SettingsSidebar.tsx, SignInModal.tsx, Fix Dialog Missing Title/Description A11y Warnings, Fix MarkModal Auth Gate — Allow Recitation Without Sign-in

### Community 70 - "impeccable-config.mjs"
Cohesion: 0.10
Nodes (47): applyDetectionConfigSource(), clampByte(), cleanIgnoreValueDisplay(), cloneDetectionConfig(), cloneRawDetectionConfig(), colorIgnoreKey(), DEFAULT_DETECTION_CONFIG, DETECTOR_CONFIG_KEYS (+39 more)

### Community 71 - "Tailwind Safelist for Dynamic Quran Font-Size Classes"
Cohesion: 0.39
Nodes (8): Viewport-Fit Sizing for the Mushaf Page, FONT_V1 (vh-Derived Font Scale Model), Tailwind Safelist for Dynamic Quran Font-Size Classes, Minimum Floor for vh-Derived Quran Font Size and Spacing, Mushaf Double-Page Spread (Pairing, Data-Fetch, Decoration), RecitationPlayerBar, Desktop Reading Group (>=1367px Vertical Rail), Nav Z-Index Invariant (relative z-10)

### Community 72 - "start-task Load context gate"
Cohesion: 0.09
Nodes (23): docs/architecture/APP_PURPOSE.md, docs/architecture/COMPONENTS.md, docs/design/design-principles.md, API Input Validation rule (422 on failure), jsonResponse(), Legacy page words route (raw NextResponse.json), API Response Envelope, API Route Structure (+15 more)

### Community 73 - "ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision)"
Cohesion: 0.29
Nodes (8): ADR 0031: Dark theme - gold marks Mushaf identity, emerald marks interaction, Emerald tokens (--primary, --accent, --ring), Gold tokens (--gold, --mushaf-ornament, --surah-frame-gold), Monotonic brightness ladder verification method (sampled pixels), ADR 0032: Depth on near-black surfaces from light, not shadow (superseded by flat page decision), Flat --mushaf-paper page fill (graded-light ramp removed, all themes), fq-spread-col align-items stretch chain + space-between line rhythm, ADR 0036: The desktop reader fills its height band, leftover height becomes line rhythm

### Community 74 - "compress-fq-docs"
Cohesion: 0.20
Nodes (9): Anti-patterns to avoid, compress-fq-docs, Scope, Steps, The core heuristic, ADR 0017 — Prisma migrations for App DB, docs/plans/adopt-prisma-migrations.md, furqan_app Prisma migrations workflow (+1 more)

### Community 75 - "/ship-fq-task skill"
Cohesion: 0.29
Nodes (8): ~/.claude/hooks/block-dangerous-git.sh (removed global hook), commit-staged skill, /confirm-dangerous-git skill, Git Workflow Skills (commit/push gating), /ship-fq-task skill, ~/.claude/furqan-worktrees.json state file, Git Worktrees Workflow Integration, /start-fq-task skill (worktree creation)

### Community 76 - "Functional E2E: Sidebar Drawer & Navigation Tabs"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Test Matrix, Decisions Made, Files to Change, Functional E2E: Search & Discovery Flows, Root Cause / Approach, Summary, Verified Test Cases (+1 more)

### Community 77 - "utils.ts"
Cohesion: 0.05
Nodes (69): HomeContinueReadingCard(), Props, HomeHero(), Props, HomeRecommendedSurahs(), Props, RECOMMENDED_SURAH_IDS, ContinueReadingLink() (+61 more)

### Community 78 - "MyPlansList"
Cohesion: 0.33
Nodes (7): AddPlanButton, JuzRangeSlider, MyPlansList, PlanAssignmentRow, PlanEnrollForm, PlansBrowseDialog, PlansTodayHero

### Community 79 - "fq-logger: Structured Logging & Observability"
Cohesion: 0.29
Nodes (7): ADR 0019 — fq-logger Sentry integration, Edge console-based logger shim, fq-logger: Structured Logging & Observability, pino (Node logging library), redact.ts sensitive key redaction, logger.error() Sentry bridge, withRequestId middleware

### Community 80 - "fq-reader-spread-container flex:1 + space-between fill"
Cohesion: 0.40
Nodes (6): ADR 0036 — reader fills height band, min-height:800px gate for rhythm fill, Reader Rhythm: Claim Unused Vertical Space Into Line Gaps, fq-reader-spread-container flex:1 + space-between fill, Recitation Bar: Vertical Rail (Desktop), RecitationPlayerBar.tsx (rail vs bar layout)

### Community 81 - "ReaderPager.tsx (client persistent pager)"
Cohesion: 0.33
Nodes (7): ADR 0028 — reader persistent pager, ADR 0029 — immutable page font registration, app/utils/page-font-registry.ts (immutable FontFace registry + LRU), ReaderPager.tsx (client persistent pager), Reader Swipe Performance: Persistent Client Pager, RecitationFollow leaf component (pager-owns-follow), Slim static content JSON pipeline (public/quran/pages/{n}.json)

### Community 82 - "live-status.mjs"
Cohesion: 0.30
Nodes (13): collectManualApplyFiles(), manualApplyReplyCommand(), manualApplyResumeHint(), mountFailureAction(), parseArgs(), renderSummary(), resumeCli(), summarizeManualApplyEvent() (+5 more)

### Community 83 - "plan-fq-task workflow"
Cohesion: 0.12
Nodes (12): graphify, Hooks, plan-fq-task workflow, Existing plan/addendum check (step 0), ADR check step, Plan file format (docs/plans/<slug>.md), Task ticket requirement before implementation, Verify the solution together (decision tree + test cases) (+4 more)

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

### Community 93 - "detect-url.mjs"
Cohesion: 0.21
Nodes (18): detectUrl(), launchBrowser(), measureContentHiddenAfterReveal(), runVisualContrastFallback(), serializeDesignSystemForBrowser(), captureVisualContrastCandidate(), compareScreenshotContrast(), sanitizeScreenshotClip() (+10 more)

### Community 94 - "Fix dead tailwindcss-animate classes in dialog.tsx (plugin not installed)"
Cohesion: 0.40
Nodes (5): DELETE mark handler scoped by to_user, Delete My Marks, Fix dead tailwindcss-animate classes in dialog.tsx (plugin not installed), Enhance MarkModal Motion & Polish, MarkerColorPicker radio card group redesign (Radix RadioGroup)

### Community 95 - "Fix: Hamza-Alif Mismatch in Verse Search"
Cohesion: 0.40
Nodes (5): ADR 0007 Arabic search query normalization (referenced), Fix: Hamza-Alif Mismatch in Verse Search, normalizeArabicQuery util (hamza-alif normalization), Fix: Ayah Font Not Rendering in Search Results and Mark Modal, Font-encoding contract table (per-page glyph vs UthmanicHafs1Ver18)

### Community 96 - "createLiveBrowserSessionState"
Cohesion: 0.20
Nodes (14): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+6 more)

### Community 97 - "hook-admin.mjs"
Cohesion: 0.13
Nodes (41): ACTIONS, addIgnoreFile(), addIgnoreRule(), addIgnoreValue(), DETECTOR_CONFIG_KEYS, detectorSection(), fileHasImpeccableHookMarker(), HOOK_MANIFEST_TARGETS (+33 more)

### Community 98 - "parseAnyColor"
Cohesion: 0.13
Nodes (22): checkCreamPalette(), checkElementQualityDOM(), checkQuality(), colorsNearlyMatch(), creamFromClassList(), cssColorAlpha(), cssColorIsTransparent(), getComputedStyleFor() (+14 more)

### Community 99 - "ADR 0030: Plan engine - code-defined templates, typed scheduling rules, derived daily assignments"
Cohesion: 0.50
Nodes (4): الحصون الخمسة memorization program, ADR 0030: Plan engine - code-defined templates, typed scheduling rules, derived daily assignments, Five typed scheduling rule kinds (fixed_cycle, cursor_advance, trailing_window, completed_cycle, lookahead), UserPlan enrollment + ProgressEntry append-only log

### Community 100 - "Verse & Fractional-Page Granularity for Awrad"
Cohesion: 0.12
Nodes (14): ADR 0038: Plan engine — per-track verse unit, no global page→verse cutover, Consequences, Context, Decision, Options Considered, Approach, Constraints, Decision Tree / Algorithm (+6 more)

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

### Community 110 - "checkHeadingRhythmDOM"
Cohesion: 0.18
Nodes (16): checkHeadingRhythmDOM(), clusterTop(), edgeAbove(), edgeBelow(), hasOwnTopBoundary(), insideSmallCard(), isVisibleFlow(), overlapsX() (+8 more)

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

### Community 141 - "mountSvelteComponentVariant"
Cohesion: 0.14
Nodes (21): acceptedDomAlreadyClean(), applyOriginalAttrsToSvelteAnchor(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers() (+13 more)

### Community 142 - "devDependencies"
Cohesion: 0.05
Nodes (39): @babel/parser, @babel/traverse, dotenv-cli, eslint, eslint-config-next, fs-extra, devDependencies, @babel/parser (+31 more)

### Community 143 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 144 - "live-wrap.mjs"
Cohesion: 0.13
Nodes (38): hasGeneratedHeader(), HEADER_MARKERS, isGeneratedFile(), isGitIgnored(), resolveSourceTraits(), argVal(), buildInsertWrapperLines(), computeInsertLine() (+30 more)

### Community 145 - ".claude/hooks/mujaz-stats.js"
Cohesion: 0.12
Nodes (9): path, ROOT, { FLAG_PATH }, fs, { FLAG_PATH, STATS_PATH }, fs, { FLAG_PATH }, fs (+1 more)

### Community 146 - "handlePollPost"
Cohesion: 0.22
Nodes (17): acknowledgePendingEvent(), broadcast(), broadcastAgentPollingIfChanged(), cancelQueuedAnonymousExitEvents(), findAvailablePendingEvent(), findPendingEventById(), flushPendingPolls(), handlePollGet() (+9 more)

### Community 147 - "detect-html.mjs"
Cohesion: 0.08
Nodes (25): buildStaticStyleMap(), buildStaticWindow(), collectStaticCssText(), makeStaticStyle(), style, parseStaticStyleAttribute(), StaticDocument, checkStaticPageTypography() (+17 more)

### Community 148 - "hook-before-edit.mjs"
Cohesion: 0.09
Nodes (45): allow(), bumpCursorDenial(), cursorBlockMessage(), deny(), detectProposedHtml(), done(), escapeRegExp(), findingSignature() (+37 more)

### Community 149 - "Addendum — Wrong surah name on shared multi-surah pages (2026-08-16)"
Cohesion: 0.09
Nodes (22): 1. Extend SidebarContext with current surah, 2. Nav trigger, 3. Sidebar controlled tabs + active scroll, Addendum — Wrong surah name on shared multi-surah pages (2026-08-16), Approach, Approach, Bug, Constraints (+14 more)

### Community 150 - "useTranslations"
Cohesion: 0.05
Nodes (63): handler, authOptions, UserPlanListItem, AccessRemovedBanner(), ADR-0012, MushafLayoutRow(), MushafLayoutSection(), SignedOutPrompt() (+55 more)

### Community 151 - "live-server.mjs"
Cohesion: 0.07
Nodes (48): assembleLiveBrowserScript(), assertLiveBrowserScriptParts(), LIVE_BROWSER_SCRIPT_PARTS, readLiveBrowserScriptParts(), resolveLiveBrowserScriptParts(), activeSessionSummaries(), agentPollingConnected(), annotRoot (+40 more)

### Community 152 - "extract-translations.js"
Cohesion: 0.23
Nodes (11): extractKeysFromFile(), findAllFiles(), fs, languages, localesDir, main(), parser, path (+3 more)

### Community 153 - "ADR 0039: `stg` tracks `main` directly, decoupled from release branches"
Cohesion: 0.40
Nodes (4): ADR 0039: `stg` tracks `main` directly, decoupled from release branches, Consequences, Context, Decision

### Community 154 - "ui-motion guidance"
Cohesion: 0.12
Nodes (16): 1. Should this even animate?, 2. Easing and duration, 3. Component states, 4. Performance, 5. Accessibility, 6. Reference techniques (use only when the task calls for it), Review checklist (use for `/review-fq-work` UI findings and self-review), /ui-motion (+8 more)

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
Cohesion: 0.08
Nodes (42): confirm(), detectCli(), dim(), fileUrlToLocalPath(), formatAdvisorySection(), formatFindings(), formatFindingsBody(), formatFindingSummary() (+34 more)

### Community 161 - "dependencies"
Cohesion: 0.05
Nodes (41): class-variance-authority, cli-progress, clsx, lucide-react, mysql2, next-auth, dependencies, class-variance-authority (+33 more)

### Community 162 - "/plan-fq-task"
Cohesion: 0.22
Nodes (8): Anti-patterns to avoid, Plan file format, /plan-fq-task, Step 5 — Ensure a GitHub issue, Step 6 — Create the worktree or branch, Step 7 — Write the plan, Steps, What this skill does (legacy)

### Community 163 - "Steps"
Cohesion: 0.33
Nodes (6): 1 — Scan the session, 2 — Scan DECISIONS.md for stale entries, 3 — Propose changes one at a time (review-before-write), 4 — Confirm before saving, 5 — Save the retrospective file, Steps

### Community 164 - "/review-fq-work"
Cohesion: 0.11
Nodes (16): 1 — Get the diff, 2 — Spawn the review subagent, 3 — Print the report, Anti-patterns to avoid, Choosing the review model, Claude-specific: Dimension 4 (Design & UX), Claude-specific: spawning the reviewer, /review-fq-work (+8 more)

### Community 165 - "/start-fq-task"
Cohesion: 0.25
Nodes (8): Anti-patterns to avoid, Claude-specific additions, Context paths (step 2 in the workflow doc), /start-fq-task, Step 1 — GitHub issue integration, Step 1b — Worktree / Branch setup (runs before step 2 in the workflow doc), Steps, What this skill does (legacy)

### Community 166 - "setup.js"
Cohesion: 0.31
Nodes (8): { execSync }, fs, loadFixture(), main(), mysql, parseConnection(), path, requireEnv()

### Community 167 - "4.1 — Marks and plans screens"
Cohesion: 0.12
Nodes (16): 4.1 — Marks and plans screens, Accent-grammar corrections found on these screens, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Empty and loading states, Files to Change (+8 more)

### Community 168 - "next.config.mjs"
Cohesion: 0.17
Nodes (9): ADR-0014, ADR-0017, ADR-0023, ADR-0029, ADR-0042, nextConfig, READER_FALLBACK_SHELL_LOCALES, withNextIntl (+1 more)

### Community 169 - "manual-apply.mjs"
Cohesion: 0.09
Nodes (49): addOpToManualApplyChunk(), APPLY_EVENT_HARD_TIMEOUT_MS, APPLY_EVENT_SOFT_DEADLINE_MS, buildManualApplyAgentAction(), clearManualApplyTransaction(), collectManualApplyFiles(), compactManualApplyBatch(), compactManualApplyCandidates() (+41 more)

### Community 170 - "Scan mode (approach C: auto-extract, then confirm descriptive language)"
Cohesion: 0.15
Nodes (13): Component translation rules, Narrative mapping, Scan mode (approach C: auto-extract, then confirm descriptive language), Schema, Step 1: Find the design assets, Step 2: Auto-extract what can be auto-extracted, Step 2b: Stage the frontmatter, Step 3: Ask the user for qualitative language (+5 more)

### Community 171 - "db.ts"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Test Matrix, Decisions Made, Files to Change, Functional E2E: Reader Navigation & Page Controls, Summary, Verified Test Cases (+1 more)

### Community 172 - "createLiveBrowserDomHelpers"
Cohesion: 0.19
Nodes (10): createLiveBrowserDomHelpers(), cssId(), liveUiRoot(), makeFrozenAnchor(), own(), pickable(), rectIsUsableAnchor(), uiAppend() (+2 more)

### Community 173 - "ADR 0038: Reader size contracts are per-band, and tablet is always double-page"
Cohesion: 0.33
Nodes (5): ADR 0038: Reader size contracts are per-band, and tablet is always double-page, Consequences, Context, Decision, Options Considered

### Community 174 - "extends"
Cohesion: 0.33
Nodes (5): extends, ignorePatterns, app/generated/, next/core-web-vitals, next/typescript

### Community 175 - "instrumentation.ts"
Cohesion: 0.38
Nodes (4): onRequestError, register(), ADR-0017, ADR-0017

### Community 176 - "Furqan"
Cohesion: 0.20
Nodes (9): ADR 0008 — Quran/App Database Split, ADR 0009 — Reproducible Quran seeder, furqan_quran seeder (db push --force-reset), npm run seed:quran -- --force, Architecture at a glance, Commands, Documentation, Furqan (+1 more)

### Community 177 - "Workflow Index"
Cohesion: 0.12
Nodes (14): commit-staged, /confirm-dangerous-git, Dangerous commands covered, Non-goals, Rule, Anti-patterns to avoid, /retrospect, commit-staged / commit-message workflow (+6 more)

### Community 178 - "auth-middleware.ts"
Cohesion: 0.17
Nodes (15): isJSONRequest(), protectedRoutes, ADR-0012, ADR-0030, ADR-0037, withAuth(), withIntl(), CustomMiddleware (+7 more)

### Community 179 - "filterFindings"
Cohesion: 0.09
Nodes (13): canCreateInsert(), clampPlaceholderSize(), computeInsertPosition(), groupSiblingRows(), hitSiblingInsertGap(), horizontalOverlap(), insertCreateDisabledReason(), insertLineCoords() (+5 more)

### Community 180 - "accept-css.mjs"
Cohesion: 0.24
Nodes (20): bakeParamValues(), collectAllSelectors(), collectSelectorsFromNodes(), escapeRegExp(), formatBody(), isToggleOn(), normalizeSelector(), normalizeToggleForVar() (+12 more)

### Community 181 - "detect-csp.mjs"
Cohesion: 0.20
Nodes (10): detectCsp(), INLINE_HEADER_SIGNALS, LAYOUT_EXTS, MONOREPO_HELPER_SIGNALS, NUXT_ROUTE_RULES_SIGNALS, NUXT_SECURITY_SIGNALS, SCAN_EXTS, SKIP_DIRS (+2 more)

### Community 183 - "detect-text.mjs"
Cohesion: 0.07
Nodes (43): blankCssComments(), BLOCK_BRACE_PREFIX_KEYWORDS, CSS_IN_JS_EXTENSIONS, detectText(), extFromFilePath(), extractCSSinJS(), extractStyleBlocks(), findCSSinJSTemplates() (+35 more)

### Community 184 - ".claude/hooks/graphify-sync-rebuild.sh"
Cohesion: 0.50
Nodes (3): GRAPHIFY_CHANGED, PYTHONHASHSEED, graphify-sync-rebuild.sh script

### Community 186 - "embed-prompt.mjs"
Cohesion: 0.20
Nodes (7): args, buf, crc32(), crcTable, file, pngChunk(), readMode

### Community 187 - "design-parser.mjs"
Cohesion: 0.13
Nodes (39): assessCoverage(), buildColor(), CANONICAL_SECTIONS, collectBullets(), collectColorValues(), collectParagraphs(), detectFormat(), extractColors() (+31 more)

### Community 188 - "readLiveServerInfo"
Cohesion: 0.39
Nodes (7): readLiveServerInfo(), FORBIDDEN, verifyAcceptedFile(), completeCli(), completeThroughServer(), parseArgs(), readServerInfo()

### Community 189 - "svelte-ast.mjs"
Cohesion: 0.21
Nodes (20): Analysis, analyzeAttributes(), analyzeFragment(), analyzeNode(), analyzeSvelteMarkup(), applyReplacements(), classifyEachKey(), classifyRoots() (+12 more)

### Community 190 - "reader.ts"
Cohesion: 0.17
Nodes (11): getActivePanel(), getStorageItem(), openSettings(), revealNavOverlay(), setStoredSafhaView(), skipNonDesktop(), skipNonMobile(), swipeReader() (+3 more)

### Community 191 - "live-poll.mjs"
Cohesion: 0.14
Nodes (29): completionAckForAcceptResult(), completionTypeForAcceptResult(), PREVIEW_MODES_WITHOUT_SOURCE_MARKERS, augmentEventWithAcceptHandling(), buildAcceptScriptArgs(), buildPollReplyPayload(), completeAcceptHandling(), DEFAULT_EVENT_LEASE_MS (+21 more)

### Community 192 - "SettingsSidebar.tsx"
Cohesion: 0.05
Nodes (58): LANGUAGES, LanguageToggle(), EnablePushToggle(), OfflineRecitationSection(), ADR-0046, bytesToMb(), RowState, ADR-0046 (+50 more)

### Community 193 - "generate-image.mjs"
Cohesion: 0.18
Nodes (12): crc32(), hash32(), hslToRgb(), out, palette(), pngChunk(), pngFake(), promptFile (+4 more)

### Community 194 - "scanCssTextForPulsingDot"
Cohesion: 0.14
Nodes (26): buildHtmlPatternCorpora(), checkHtmlPatterns(), collectCssCustomProps(), collectMarqueeKeyframes(), collectPulseKeyframes(), cssLengthToPx(), cssTextHasDarkRootBg(), extractShadowLengths() (+18 more)

### Community 195 - "Nielsen's 10 Heuristics"
Cohesion: 0.18
Nodes (11): 10. Help and Documentation, 1. Visibility of System Status, 2. Match Between System and Real World, 3. User Control and Freedom, 4. Consistency and Standards, 5. Error Prevention, 6. Recognition Rather Than Recall, 7. Flexibility and Efficiency of Use (+3 more)

### Community 196 - "journal.mjs"
Cohesion: 0.26
Nodes (14): PATCH_UNDOERS, clearInjectJournal(), healArtifact(), healInjectJournal(), INJECT_JOURNAL_RELPATH, INJECT_JOURNAL_VERSION, injectJournalPath(), insideProject() (+6 more)

### Community 197 - "1.1 — Rewrite the canon"
Cohesion: 0.20
Nodes (10): 1.1 — Rewrite the canon, Addendum — the regeneration step could not run as written (2026-08-21), Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary (+2 more)

### Community 198 - "impeccable/SKILL.md"
Cohesion: 0.07
Nodes (26): Craft (deprecated alias), Impeccable Documenter, Input Contract, Output Contract, Workflow, Checks, in order, Disposition, Impeccable Finish Reviewer (+18 more)

### Community 199 - "live.md"
Cohesion: 0.06
Nodes (29): Apply at system scale, Audit before choosing, Choose a strategy, Contrast and perception, Live-mode signature params, Verify, Visitor mode, Cleanup (+21 more)

### Community 200 - "engine.ts"
Cohesion: 0.05
Nodes (77): DELETE(), GET(), POST(), ADR-0030, ADR-0038, PATCH(), ADR-0030, GET() (+69 more)

### Community 201 - "api/marks/route.ts"
Cohesion: 0.13
Nodes (17): buildVerseSnippet(), GET(), getSortKey(), MarkListItem, MarksPage, ADR-0025, VALID_CATEGORIES, GET() (+9 more)

### Community 202 - "filterFindings"
Cohesion: 0.26
Nodes (13): cleanIgnoreValueDisplay(), extractFindingIgnoreValue(), extractFindingIgnoreValueRaw(), extractMotionIgnoreValue(), filterFindings(), findingMatchesScopedIgnoreFile(), formatFindingIgnoreCommand(), isAdvisoryFinding() (+5 more)

### Community 203 - "el"
Cohesion: 0.07
Nodes (55): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+47 more)

### Community 204 - "live-copy-edit-agent.mjs"
Cohesion: 0.14
Nodes (31): applyMockWrites(), buildCopyEditBatchPrompt(), checkFrameworkSourceSyntax(), chooseCopyEditAgent(), COMMAND_AUTH_CACHE, commandAuthed(), commandExists(), compactBatchForPrompt() (+23 more)

### Community 205 - "Changes"
Cohesion: 0.20
Nodes (10): Changes, `.fq-recitation-active-word` visibility, Ghost/icon button hover, deduplicated, Menu row hover regression, fixed, Minor, Mobile nav spacing fix, Nav bar layout, Search bar simplification (+2 more)

### Community 206 - "initGlobalBar"
Cohesion: 0.09
Nodes (39): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), buildDesignHeader(), buildParamsPanel(), designPanelCss(), detectPageTheme() (+31 more)

### Community 207 - "runHook"
Cohesion: 0.12
Nodes (32): bumpEditCount(), clampGroupedToBudget(), clampToBudget(), dedupeAgainstCache(), depthIsSet(), designSystemOptions(), directiveFooter(), ensureFile() (+24 more)

### Community 208 - "bolder.md"
Cohesion: 0.33
Nodes (5): Before you finish, Scope is sovereign, The amplification, The skeleton test, Why it reads flat

### Community 209 - "Mushaf Page Frame — Designer Asset Spec"
Cohesion: 0.07
Nodes (27): Deliver three tiles, not one frame, Implementation note (not for the designer), KFGQPC does not ship a page frame (searched 2026-08-17), Licence, Measured findings, Mushaf Page Frame — Designer Asset Spec, Nice to have, Public-domain scans: reference material, not a tile source (tested 2026-08-17) (+19 more)

### Community 210 - "resolveLengthPx"
Cohesion: 0.13
Nodes (21): checkElementHeroEyebrow(), checkElementHeroEyebrowDOM(), checkHeroEyebrow(), checkKickerAboveHeading(), checkKickerAboveHeadingDOM(), checkKickerAboveHeadingFromDoc(), checkNumberedSectionLabels(), checkNumberedSectionLabelsDOM() (+13 more)

### Community 211 - "Stabilize Tajweed Stylesheet Injection and Extend Swipe Hover Suppression"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause / Approach, Stabilize Tajweed Stylesheet Injection and Extend Swipe Hover Suppression, Summary, Verified Test Cases (+1 more)

### Community 213 - "doctor.md"
Cohesion: 0.25
Nodes (7): Monorepo notes, Opting out of the boot check, Step 1: Run the pass, Step 2: Act by severity, Step 3: Deprecated fields are binding, Step 4: Do not overclaim on truth drift, What this owns, and what it does not

### Community 214 - "collectBrowserFindings"
Cohesion: 0.11
Nodes (26): browserFindingsFromMap(), checkBorders(), checkEdgeFlushCardsDOM(), checkElementBlinkingCursorDOM(), checkElementBorders(), checkElementBordersDOM(), checkElementPseudoStripeDOM(), checkElementTextOverflowDOM() (+18 more)

### Community 215 - "impeccable-paths.mjs"
Cohesion: 0.10
Nodes (30): resolveProjectRoot(), CRITIQUE_DIR, firstExisting(), getDesignSidecarCandidates(), getDesignSidecarPath(), getImpeccableDir(), getLegacyLiveAnnotationsDir(), getLegacyLiveConfigPath() (+22 more)

### Community 216 - "roots.mjs"
Cohesion: 0.15
Nodes (27): CANDIDATE_SCAN_IGNORED, consumeTargetArg(), CONTEXT_FALLBACK_DIRS, DESIGN_NAMES, DEV_CONFIG_MARKERS, discoverAppCandidates(), enterLiveRoot(), exists() (+19 more)

### Community 217 - "terse mode (mujaz)"
Cohesion: 0.40
Nodes (4): Claude implementation, mujaz, terse mode (mujaz), mujaz-mode.js hook + .mujaz-off flag

### Community 218 - "live-manual-edit-evidence.mjs"
Cohesion: 0.15
Nodes (26): analyzeSourceHint(), buildCandidatesForOp(), buildContextHintsByRef(), buildManualEditEvidence(), collectSearchFiles(), countOps(), decodeBasicHtml(), escapeRegExp() (+18 more)

### Community 219 - "Responsive Design"
Cohesion: 0.08
Nodes (25): Assess Adaptation Challenge, Breakpoints: Content-Driven, Content Adaptation, Desktop Adaptation (Mobile → Desktop), Detect Input Method, Not Just Screen Size, Email Adaptation (Web → Email), Implement Adaptations, Layout Adaptation Patterns (+17 more)

### Community 220 - "handleManualEditActivity"
Cohesion: 0.18
Nodes (25): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+17 more)

### Community 221 - "event-validation.mjs"
Cohesion: 0.13
Nodes (24): AGENT_PHASE_SET, FORBIDDEN_MANUAL_EDIT_TEXT_CHARS, INSERT_POSITIONS, isValidId(), isValidMountVariant(), isValidVariantId(), MOUNT_ERROR_MAX_LENGTH, MOUNT_URL_MAX_LENGTH (+16 more)

### Community 222 - "injected/index.mjs"
Cohesion: 0.06
Nodes (68): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), browserColorsClose(), browserDesignSystemConfig() (+60 more)

### Community 227 - "checkHeadingRhythmDOM"
Cohesion: 0.62
Nodes (7): checkHeadingRhythmDOM(), clusterTop(), edgeAbove(), edgeBelow(), hasOwnTopBoundary(), isVisibleFlow(), overlapsX()

### Community 228 - "tag-strategy.mjs"
Cohesion: 0.20
Nodes (17): appendOriginToDirective(), buildTagBlock(), commentClose(), commentOpen(), detectLineEnding(), findCspMetaTags(), getAttr(), insertTag() (+9 more)

### Community 229 - "DESIGN.md"
Cohesion: 0.22
Nodes (7): ADR 0031 — Dark theme gold/emerald semantics, ADR 0032 — Dark surface depth from light, Reader Surface Depth (Flat Page Face, Edge-Driven Depth), Adding a new theme workflow, Reader depth token family (--mushaf-rim-*, --reader-chrome-*), Theme system (named CSS classes on html), Theme Token Contract

### Community 230 - "Homepage Design & UX Elevation"
Cohesion: 0.22
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Homepage Design & UX Elevation, Summary, Verified Test Cases (+1 more)

### Community 232 - "syncEditBadgeHitProxies"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 233 - "source-lock.mjs"
Cohesion: 0.50
Nodes (7): isLiveServerPidReachable(), clearStaleLock(), readLock(), releaseOwnLock(), sleepSync(), sourceLockPath(), withSourceLockSync()

### Community 234 - "Offline Recitation Audio Download"
Cohesion: 0.08
Nodes (23): ADR 0046: Offline recitation audio via explicit per-surah/juz download, reusing the page cache and the wird override mechanism, Consequences, Context, Decision, Options Considered, Approach, Constraints, Decision Tree / Algorithm (+15 more)

### Community 235 - "template-extensions.mjs"
Cohesion: 0.19
Nodes (12): IMPECCABLE_DIR, extensionCache, LIVE_TEMPLATE_EXTENSIONS, matchesTemplateExtension(), mergeExtensions(), normalizeExtensionEntries(), readLiveTemplateExtensions(), safeReadJson() (+4 more)

### Community 237 - "generate-mushaf-thumbnails.js"
Cohesion: 0.13
Nodes (22): { chromium }, EDITIONS, fetchBasmalahGlyphs(), htmlFor(), ADR-0023, ADR-0033, main(), OUT_DIR (+14 more)

### Community 238 - "The Toolkit"
Cohesion: 0.09
Nodes (22): Assess Onboarding Needs, Context Over Ceremony, Contextual Help, Design Onboarding Experiences, Documentation & Help, Empty State Design, Feature Discovery & Adoption, Guided Tours & Walkthroughs (+14 more)

### Community 239 - "manual-edit-routes.mjs"
Cohesion: 0.16
Nodes (23): scrubManualEditsAgainstFile(), scrubManualEditsAgainstOriginalBlock(), args, buffer, cwd, pageUrlFilter, remaining, compactManualLogText() (+15 more)

### Community 240 - "Design System: Furqan"
Cohesion: 0.15
Nodes (13): Colors, Design System: Furqan, Do:, Do's and Don'ts, Don't:, Layout, Named Rules, Named Rules (+5 more)

### Community 241 - "/ship-fq-task"
Cohesion: 0.29
Nodes (7): Claude-specific additions, No AI signatures — anywhere, /ship-fq-task, Step 6 — GitHub issue integration, Step 7 — Clean up the worktree (mandatory — always run, even if step 6 was skipped), Steps, What NOT to do

### Community 242 - "instructions.mjs"
Cohesion: 0.40
Nodes (9): acceptInstructions(), bootInstructions(), deferredWrapperInstructions(), generateInstructions(), insertScaffoldInstructions(), instructionsForEvent(), pollCmd(), replyCmd() (+1 more)

### Community 243 - "Nocturnal Reader Lab — Desktop RTL"
Cohesion: 0.12
Nodes (16): Confirmed Product Decisions, Constraints, Decision Tree, Decisions Made, Design Remediation, Design Revision — 2026-08-21, Files to Change, Implementation From the Ground Up (+8 more)

### Community 244 - "Trello → GitHub Issues Migration Plan"
Cohesion: 0.10
Nodes (19): Board audit (2026-08-13, live pull from Trello MCP), `.claude/skills/cut-release/SKILL.md`, `.claude/skills/plan-fq-task/SKILL.md`, `.claude/skills/promote-release/SKILL.md` and `promote-to-staging/SKILL.md`, `.claude/skills/ship-fq-task/SKILL.md`, `.claude/skills/start-fq-task/SKILL.md`, Not in scope, Open questions for the user (+11 more)

### Community 245 - "Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation"
Cohesion: 0.18
Nodes (11): Addendum 2: Lab-Style Green CSS Ornament & Surah Font (2026-08-22), Addendum 3: Continue Reading Icon/Weight, Group Dividers, and Logo Size (2026-08-22), Addendum 4: Green 32px Logo with Navbar Background (2026-08-22), Decisions Made, Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation, Files Changed, Summary, Summary (+3 more)

### Community 246 - "onAnnotDown"
Cohesion: 0.15
Nodes (21): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay() (+13 more)

### Community 247 - "frameworks/index.mjs"
Cohesion: 0.18
Nodes (10): COMMENT_SYNTAXES, FRAMEWORKS, INJECT_KINDS, PREVIEW_MODES, SOURCE_TRAIT_DEFAULTS, STYLE_MODES, TAG_PATCH_KIND, nuxt (+2 more)

### Community 248 - "tanstack-adapter.mjs"
Cohesion: 0.16
Nodes (20): tanstackStart, applyTanStackLiveAdapter(), buildTanStackLiveRootComponent(), detectTanStackStartProject(), escapeRegExp(), findRootRouteFile(), insertAfterLastImport(), isManagedComponent() (+12 more)

### Community 249 - "Home Page Design Fixes"
Cohesion: 0.08
Nodes (24): Addendum — Restructure Navigation & Direct Settings Access, Addendum — Universal nav menu; sidebar toggle moves into Nav, Constraints, Constraints, Constraints, Decision Tree / Algorithm, Decision Tree / Algorithm, Decisions Made (+16 more)

### Community 250 - "quran-json/generate.js"
Cohesion: 0.15
Nodes (14): fs, getPageWords(), groupBy(), ADR-0028, ADR-0033, {
  LAYOUT_MUSHAF_IDS,
  GLYPH_FIELD_BY_MUSHAF,
}, OUT_ROOT, path (+6 more)

### Community 251 - "live.mjs"
Cohesion: 0.29
Nodes (12): resolveTargetSelection(), __dirname, ensureServerRunning(), globToRegex(), globToRegex(), resolveFiles(), liveCli(), relOrNull() (+4 more)

### Community 252 - ".codex/hooks/mujaz-stats.js"
Cohesion: 0.12
Nodes (9): path, ROOT, { FLAG_PATH }, fs, { FLAG_PATH, STATS_PATH }, fs, { FLAG_PATH }, fs (+1 more)

### Community 253 - "sveltekit-adapter.mjs"
Cohesion: 0.18
Nodes (20): applySvelteKitLiveAdapter(), buildSvelteLiveRootComponent(), defaultSvelteLayout(), detectSvelteKitProject(), ensureSvelteLiveRootComponent(), escapeRegExp(), fileIncludes(), findSvelteKitAppHtml() (+12 more)

### Community 254 - "4.3 — Search and settings surfaces"
Cohesion: 0.10
Nodes (21): 4.3 — Search and settings surfaces, A probe lesson worth keeping, Accent-grammar corrections, Addendum 2: Senior Typography Calibration & UX Polish (Lab Scale Alignment), Addendum 3: Recitation Settings Sheet UX & Visual Unification, Addendum: Visual Feedback Round (Settings Redesign), Approach, Constraints (+13 more)

### Community 255 - "serve-question.mjs"
Cohesion: 0.18
Nodes (13): answerFile(), esc(), loadRound(), localImages, nextFile(), page(), payloadPath, portArg (+5 more)

### Community 256 - "expandScanTargets"
Cohesion: 0.53
Nodes (6): coLocatedStylesheets(), expandScanTargets(), hasPathTraversal(), isInsideProject(), normalizeScanTargets(), parseStaticStyleImports()

### Community 257 - "detect-utils.mjs"
Cohesion: 0.27
Nodes (13): astro, detectAstroProject(), fileExists(), findConfigFile(), firstExistingFile(), hasAnyDependency(), literalConfigFiles(), readPackageDeps() (+5 more)

### Community 258 - "analyzeVisualContrastCandidate"
Cohesion: 0.14
Nodes (18): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), clampByte(), clearOverlays() (+10 more)

### Community 259 - "animate.md"
Cohesion: 0.12
Nodes (14): Accessibility and control, Choose material by meaning, Find the job, Implement to the runtime, Set the motion thesis, Timing and easing, Verify, Visitor mode (+6 more)

### Community 260 - "Handle `generate`"
Cohesion: 0.12
Nodes (16): 1. Read the screenshot (if present), 2. Wrap the element, 3. Load the action's reference, 4. Plan three variants: identity first, then mode, then axes, 5. Apply the freeform prompt (if present), 6. Deliver variants, 7. Parameters (composition-sized, 0-4 per variant), 8. Signal done (+8 more)

### Community 261 - "context-signals.mjs"
Cohesion: 0.21
Nodes (15): extractPlatform(), hasVisualImplementation(), loadContext(), cli(), COMMON_DEV_PORTS, devServerSignals(), gatherSignals(), gitSignals() (+7 more)

### Community 262 - "session-store.mjs"
Cohesion: 0.17
Nodes (19): applyEvent(), baseSnapshot(), COMPLETED_PHASES, createLiveSessionStore(), getReadableJournalPath(), persist(), readState(), deriveRenderState() (+11 more)

### Community 263 - "Wire /impeccable into the plan/implement/review workflow"
Cohesion: 0.12
Nodes (14): ADR 0041: Impeccable design commands wired into the plan/implement/review cycle, plan-driven not ad hoc, Consequences, Context, Decision, Options Considered, Approach, Constraints, Decision Tree / Algorithm (+6 more)

### Community 264 - "sentry/route.ts"
Cohesion: 0.32
Nodes (7): buildSlackMessage(), isValidSignature(), LEVEL_EMOJI, POST(), SentryAlertPayload, ADR-0019, ADR-0018

### Community 265 - "resolveLiveInjectionAnchor"
Cohesion: 0.16
Nodes (19): buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts(), cssEscapeIdent(), elementMatchesOriginalMarkup() (+11 more)

### Community 266 - "Generate Report"
Cohesion: 0.13
Nodes (14): 1. Accessibility (A11y), 2. Performance, 3. Theming, 4. Responsive Design, 5. Implementation Integrity (CRITICAL), Audit Health Score, Detailed Findings by Severity, Diagnostic Scan (+6 more)

### Community 267 - "parseRgb"
Cohesion: 0.13
Nodes (32): checkColors(), checkElementAIPaletteDOM(), checkElementColors(), checkElementColorsDOM(), checkElementGlow(), checkElementGlowDOM(), checkElementHoverContrast(), checkElementIconTile() (+24 more)

### Community 268 - "deps.ts"
Cohesion: 0.06
Nodes (55): getNotificationType(), NOTIFICATION_TYPES, NotificationChannelKey, NotificationContent, NotificationEmailContent, NotificationTypeDef, PlanDailyReminderPayload, SystemTestPayload (+47 more)

### Community 269 - "critique-storage.mjs"
Cohesion: 0.17
Nodes (22): coerceSlug(), listSnapshotsForSlug(), main(), nowFilenameStamp(), parseFrontmatter(), readLatestSnapshot(), readTrend(), serializeFrontmatter() (+14 more)

### Community 270 - "reminders/route.ts"
Cohesion: 0.23
Nodes (10): dynamic, GET, handle(), isAuthorized(), POST, advanceOneDay(), getTimezoneOffsetMs(), isDue() (+2 more)

### Community 271 - "seed.js"
Cohesion: 0.15
Nodes (21): main(), byId(), derivePageMetadata(), deriveRubs(), deriveRubVerseMappings(), HIZB_POSITION_MAP, ADR-0009, ADR-0033 (+13 more)

### Community 272 - "4.4 — Mushaf hub and shared-grant surfaces"
Cohesion: 0.12
Nodes (16): 4.4 — Mushaf hub and shared-grant surfaces, A new token family: `--warning`, Accent-grammar corrections, Approach, Borrowed context is the grammar's clearest case, Constraints, Constraints honoured, Decision Tree / Algorithm (+8 more)

### Community 273 - "Impeccable Asset Producer"
Cohesion: 0.14
Nodes (12): Core Rule, Decision Sketches, Impeccable Asset Producer, Input Contract, Output Contract, Prompt Pattern, Workflow, Generate three compositional options (+4 more)

### Community 274 - "optimize.md"
Cohesion: 0.14
Nodes (13): Animation Performance, Assess Performance Issues, Core Web Vitals Optimization, Cumulative Layout Shift (CLS < 0.1), Interaction to Next Paint (INP < 200ms), Largest Contentful Paint (LCP < 2.5s), Loading Performance, Network Optimization (+5 more)

### Community 276 - "2.1 — Semantic tokens"
Cohesion: 0.13
Nodes (15): 2.1 — Semantic tokens, Approach, Constraints, Contrast, before → after, Decision Tree / Algorithm, Decisions Made, Decisions Made — the two deferred questions, Files to Change (+7 more)

### Community 277 - "4.2 — Home screen"
Cohesion: 0.13
Nodes (15): 4.2 — Home screen, Accent-grammar corrections, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Implementation notes (2026-08-22) (+7 more)

### Community 278 - "sampleCssBackground"
Cohesion: 0.22
Nodes (14): firstCssUrl(), getLayerValue(), loadVisualContrastImage(), parseObjectPosition(), parsePositionPair(), parsePositionToken(), pickWorstContrastColor(), pointToImageSource() (+6 more)

### Community 279 - "pin.mjs"
Cohesion: 0.22
Nodes (11): CODEX_HARNESSES, commandPrefixForSkillsDir(), __dirname, findHarnessDirs(), generatePinnedSkill(), HARNESS_DIRS, loadCommandMetadata(), pin() (+3 more)

### Community 280 - "Simplify the Design"
Cohesion: 0.17
Nodes (11): Assess Current State, Code Simplification, Content Simplification, Document Removed Complexity, Information Architecture, Interaction Simplification, Layout Simplification, Plan Simplification (+3 more)

### Community 281 - "Hardening Dimensions"
Cohesion: 0.17
Nodes (11): Accessibility Resilience, Assess Hardening Needs, Edge Cases & Boundary Conditions, Error Handling, Hardening Dimensions, Input Validation & Sanitization, Internationalization (i18n), Performance Resilience (+3 more)

### Community 282 - "CI Quality Gate: PR Lint, Typecheck & Vitest Workflow"
Cohesion: 0.20
Nodes (9): CI Quality Gate: PR Lint, Typecheck & Vitest Workflow, Constraints, Decision Tree / Path Filtering, Decisions Made, Files to Change, Root Cause / Approach, Summary, Verified Test Cases (+1 more)

### Community 284 - "ui-core.mjs"
Cohesion: 0.29
Nodes (8): appendStyleToLiveUiRoot(), appendToLiveUiRoot(), escapeCssIdent(), getLiveUiElementById(), LIVE_CHROME_MOUNT_CONTRACT, LIVE_UI_COMPONENT_IDS, LIVE_UI_SURFACES, resolveLiveUiRoot()

### Community 285 - "3.2 — Shared chrome"
Cohesion: 0.14
Nodes (14): 3.2 — Shared chrome, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Implementation notes (2026-08-22), Measured (rendered pixels, `/en/pages/2`, 1440×900) (+6 more)

### Community 286 - "generation-preflight.mjs"
Cohesion: 0.30
Nodes (10): buildGenerationPreflight(), compactError(), execFileAsync, insertTarget(), normalizeTarget(), replaceTarget(), runGenerationPreflight(), sourceResolutionCache (+2 more)

### Community 287 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 288 - "clarify.md"
Cohesion: 0.18
Nodes (10): Actions and navigation, Audit the language, Errors and permissions, Forms, Help and instructional text, Loading, empty, and success states, Rewrite by function, Set the message hierarchy (+2 more)

### Community 289 - "critique.md"
Cohesion: 0.18
Nodes (10): Action Summary, Ask the User, Assessment A: Design Review, Assessment B: Detector + Browser Evidence, Assessment Orchestration, Hard Invariants, Persist the Snapshot, Purpose (+2 more)

### Community 290 - "Design Migration — reader-lab language, app-wide"
Cohesion: 0.15
Nodes (13): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Design Migration — reader-lab language, app-wide, Files to Change, Phase 0 outcome, Phases (+5 more)

### Community 291 - "New visual work"
Cohesion: 0.18
Nodes (11): 1. Decide what is already true, 2. Ask what will change the work, 3. Choose the right amount of invention, 4. Commit the world, 5. Record the decision, 6. Build with full commitment, 7. Inspect and finish, Create a whole surface inside an established world (+3 more)

### Community 292 - "polish.md"
Cohesion: 0.18
Nodes (10): 1. Establish the system, 2. Gather the evidence, 3. Triage, 4. Polish the whole path, 5. Verify and finish, Color, imagery, and icons, Content and code, Flow and hierarchy (+2 more)

### Community 293 - "quieter.md"
Cohesion: 0.18
Nodes (10): Assess Current State, Color Refinement, Composition Refinement, Motion Reduction, Plan Refinement, Refine the Design, Simplification, Verify Quality (+2 more)

### Community 294 - "Restructure Navigation for Clean UX"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Restructure Navigation for Clean UX, Root Cause / Approach, Summary, Verified Test Cases (+1 more)

### Community 295 - "palette.mjs"
Cohesion: 0.24
Nodes (7): args, buildWeights(), hashUnit(), pickSeed(), seed, SEEDS, weightedPick()

### Community 296 - "0042-pwa-launch-resolves-before-first-paint.md"
Cohesion: 0.22
Nodes (5): ADR 0044: Viewport Units Are Unreliable Across the Installed PWA's Fullscreen Transition, Consequences, Context, Decision, Options Considered

### Community 297 - "Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav)"
Cohesion: 0.18
Nodes (10): Approach, Constraints, Decision Tree — asset placement, Decisions Made, Files to Change, Open Item Before Implementation, Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav), Summary (+2 more)

### Community 298 - "Safha Ribbon Indicator"
Cohesion: 0.18
Nodes (10): Approach, Constraints, Decision Tree, Decisions Made, Files to Change, Safha Ribbon Indicator, Summary, Verified Test Cases (+2 more)

### Community 299 - "Generate Combined Critique Report"
Cohesion: 0.20
Nodes (10): Design Health Score, Design Specificity Verdict, Generate Combined Critique Report, Minor Observations, Overall Impression, Persona Red Flags, Priority Issues, Questions to Consider (+2 more)

### Community 300 - "Init flow"
Cohesion: 0.20
Nodes (10): Completion gate, Init flow, Step 1: Load current state, Step 2: Explore the project, Step 3: Interview for product truth, Step 4: Write PRODUCT.md, Step 5: Configure live mode when useful, Step 6: Wrap up or resume (+2 more)

### Community 301 - "Plan: Set `font-tajawal` globally on app root & Tailwind `sans`"
Cohesion: 0.18
Nodes (10): Automated Tests, Configuration & Root Layout, Goal Description, Manual Verification, [MODIFY] [layout.tsx](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/app/layout.tsx), [MODIFY] [tailwind.config.ts](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/tailwind.config.ts), Plan: Set `font-tajawal` globally on app root & Tailwind `sans`, Proposed Changes (+2 more)

### Community 302 - "Addendum 5: Translucent Capsule Surah Toggler UX & Affordance (2026-08-26)"
Cohesion: 0.40
Nodes (5): Addendum 5: Translucent Capsule Surah Toggler UX & Affordance (2026-08-26), Approach & Changes, Files Changed, Summary, Verification Plan

### Community 303 - "Addendum — 2026-08-15: `popstate` can't stop the browser's own hard reload; use the Navigation API where available"
Cohesion: 0.20
Nodes (10): Addendum — 2026-08-15: `popstate` can't stop the browser's own hard reload; use the Navigation API where available, Constraints, Decision Tree, Decisions Made (new), Files to Change, Investigation, Root cause, Verified Test Cases (new) (+2 more)

### Community 304 - "Nav: Dedupe NavPillLink classNames into Shared Component"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Nav: Dedupe NavPillLink classNames into Shared Component, Root Cause / Approach, Summary, Verified Test Cases (+1 more)

### Community 305 - "Fix Tajweed Mushaf Swipe Flicker"
Cohesion: 0.20
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Fix Tajweed Mushaf Swipe Flicker, Root Cause, Summary, Verified Test Cases (+1 more)

### Community 306 - "Unify Tajweed toggle + offline downloads into one Mushaf Layout setting"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary, Unify Tajweed toggle + offline downloads into one Mushaf Layout setting, Verified Test Cases (+1 more)

### Community 307 - "Addendum — 2026-08-14: cold launch flashes the home page before redirecting"
Cohesion: 0.20
Nodes (10): Addendum — 2026-08-14: cold launch flashes the home page before redirecting, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause, Summary (+2 more)

### Community 308 - "Common Cognitive Load Violations"
Cohesion: 0.22
Nodes (9): 1. The Wall of Options, 2. The Memory Bridge, 3. The Hidden Navigation, 4. The Jargon Barrier, 5. The Visual Noise Floor, 6. The Inconsistent Pattern, 7. The Multi-Task Demand, 8. The Context Switch (+1 more)

### Community 309 - "Operate mode depth (and Read notes)"
Cohesion: 0.10
Nodes (18): Craft floor, Refuse, Verify, Constraints, Failure modes, Flow, /impeccable hooks, Intentional findings (+10 more)

### Community 310 - "Shape"
Cohesion: 0.22
Nodes (8): Cadence, Confirm and stop, Phase 1: Discovery interview, Phase 2: Resolve the design direction, Phase 3: Write the brief, Round 1: purpose, people, and outcome, Round 2: material, behavior, and boundaries, Shape

### Community 312 - "slice.py"
Cohesion: 0.28
Nodes (6): translate a path's numbers (pdftocairo emits absolute M/C/L only)., groups: list of (paths, punch_paths) rendered in order., all paths intersecting the rect, translated; viewBox does the clipping., shift(), svg(), tile()

### Community 313 - "Close Overlays on Back-Swipe (Mobile/Tablet PWA)"
Cohesion: 0.22
Nodes (9): Close Overlays on Back-Swipe (Mobile/Tablet PWA), Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause, Summary, Verified Test Cases (+1 more)

### Community 314 - "Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA)"
Cohesion: 0.22
Nodes (9): Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA), Root Cause, Summary, Verified Test Cases (+1 more)

### Community 315 - "Fix Sidebar Bottom Clip"
Cohesion: 0.22
Nodes (8): Constraints, Decisions Made, Files to Change, Fix, Fix Sidebar Bottom Clip, Root Cause, Summary, What NOT to Do

### Community 316 - "Addendum — 2026-08-14: swipe after a language switch reverts to Arabic page 1"
Cohesion: 0.22
Nodes (9): Addendum — 2026-08-14: swipe after a language switch reverts to Arabic page 1, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Root Cause, Summary, Verified Test Cases (+1 more)

### Community 317 - "Restore Continue Reading nav icon on installed PWA"
Cohesion: 0.22
Nodes (9): ADR Amendment, Approach, Constraints, Decisions Made, Files to Change, Restore Continue Reading nav icon on installed PWA, Root Cause, Summary (+1 more)

### Community 318 - "Persona-Based Design Testing"
Cohesion: 0.25
Nodes (8): 1. Impatient Power User: "Alex", 2. Confused First-Timer: "Jordan", 3. Accessibility-Dependent User: "Sam", 4. Deliberate Stress Tester: "Riley", 5. Distracted Mobile User: "Casey", Persona-Based Design Testing, Project-Specific Personas, Selecting Personas

### Community 319 - "Extract Flow"
Cohesion: 0.25
Nodes (7): Extract Flow, Step 1: Discover the Design System, Step 2: Identify Patterns, Step 3: Plan Extraction, Step 4: Extract & Enrich, Step 5: Migrate, Step 6: Document

### Community 320 - "0.1 — Light and gold variants in the lab"
Cohesion: 0.20
Nodes (10): 0.1 — Light and gold variants in the lab, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 321 - "0.2 — The mushaf page face in the lab"
Cohesion: 0.20
Nodes (10): 0.2 — The mushaf page face in the lab, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 322 - "0.3 — Small-screen composition in the lab"
Cohesion: 0.20
Nodes (10): 0.3 — Small-screen composition in the lab, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 323 - "staleness-notice.mjs"
Cohesion: 0.38
Nodes (9): appendStalenessDirective(), buildStalenessDirective(), cachePath(), filterFreshFindings(), pruneCache(), readCache(), readJson(), stalenessCheckDisabled() (+1 more)

### Community 324 - "3.1 — UI primitives"
Cohesion: 0.20
Nodes (10): 3.1 — UI primitives, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Findings, Summary (+2 more)

### Community 325 - "checkElementGptBorderShadowDOM"
Cohesion: 0.38
Nodes (7): borderColorsFromStyle(), borderWidthsFromStyle(), checkElementGptBorderShadow(), checkElementGptBorderShadowDOM(), checkGptThinBorderWideShadow(), shadowLayerAlpha(), shadowMaxBlurPx()

### Community 326 - "Functional E2E: Settings & Preferences Persistence"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Test Matrix, Decisions Made, Files to Change, Functional E2E: Settings & Preferences Persistence, Summary, Verified Test Cases (+1 more)

### Community 327 - "Generate Report"
Cohesion: 0.29
Nodes (7): Audit Health Score, Detailed Findings by Severity, Executive Summary, Generate Report, Patterns & Systemic Issues, Platform Conformance Verdict, Positive Findings

### Community 328 - "Cognitive Load Assessment"
Cohesion: 0.29
Nodes (7): Cognitive Load Assessment, Cognitive Load Checklist, Extraneous Load: Bad Design, Germane Load: Learning Effort, Intrinsic Load: The Task Itself, The Working Memory Rule, Three Types of Cognitive Load

### Community 329 - "Unify Accents: Replace Gold Accents and Ornaments with Emerald Green"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary, Unify Accents: Replace Gold Accents and Ornaments with Emerald Green, Verified Test Cases (+1 more)

### Community 330 - "Impeccable Manual Edit Applier"
Cohesion: 0.29
Nodes (6): Checks, Entry Atomicity, Impeccable Manual Edit Applier, Input Contract, Output Contract, Workflow

### Community 332 - "ADR 0043: Overlays close on back-gesture via a shared history guard, coordinated with AndroidBackExitGuard"
Cohesion: 0.29
Nodes (7): Addendum — 2026-08-15: "is my entry still on top" must be deferred and identity-checked, Addendum — 2026-08-16: microtask defer is not enough for a Link's own navigation, ADR 0043: Overlays close on back-gesture via a shared history guard, coordinated with AndroidBackExitGuard, Consequences, Context, Decision, Options Considered

### Community 333 - "ADR 0047: Adopt the reader-lab design language app-wide, canon first"
Cohesion: 0.22
Nodes (9): Addendum — Phase 0.1 findings (2026-08-21), Addendum — Phase 0.2 findings (2026-08-21), Addendum — Phase 0.3 findings (2026-08-21), Addendum — Phases 3–5 (production), 2026-08-22, ADR 0047: Adopt the reader-lab design language app-wide, canon first, Consequences, Context, Decision (+1 more)

### Community 335 - "AGENTS.md"
Cohesion: 0.22
Nodes (8): Commands, Documentation, graphify, impeccable, MANDATORY WORKFLOW — NO EXCEPTIONS (ALL AGENTS), Project, Releases, Task tracking

### Community 336 - "0.4 — Write the design-language spec"
Cohesion: 0.22
Nodes (9): 0.4 — Write the design-language spec, Approach, Constraints, Decision Tree / Algorithm, Decisions Made, Files to Change, Summary, Verified Test Cases (+1 more)

### Community 337 - "ADR 0040: Double-push history guard for Android PWA back-to-exit"
Cohesion: 0.33
Nodes (6): Addendum — 2026-08-14: the pushed state object must be freshly allocated, ADR 0040: Double-push history guard for Android PWA back-to-exit, Consequences, Context, Decision, Options Considered

### Community 338 - "0042 — PWA Cold Launch Resolves Before First Paint"
Cohesion: 0.33
Nodes (6): 0042 — PWA Cold Launch Resolves Before First Paint, Addendum — 2026-08-18: un-hide ContinueReadingLink on standalone mobile/tablet, Alternatives Considered, Consequences, Context, Decision

### Community 339 - "PWA Testing (Browser Pane, No Device)"
Cohesion: 0.33
Nodes (5): PWA Testing (Browser Pane, No Device), Simulating a back-gesture / back button, Spoofing Android, Spoofing standalone/fullscreen mode, What this can't cover

### Community 340 - "ADR 0043: Breakpoint-Dependent Positioning Must Be CSS-Gated, Not JS-Hook-Gated"
Cohesion: 0.40
Nodes (5): ADR 0043: Breakpoint-Dependent Positioning Must Be CSS-Gated, Not JS-Hook-Gated, Consequences, Context, Decision, Options Considered

### Community 341 - "ADR 0045: Use the Navigation API to intercept the overlay-close back-gesture, with a popstate fallback"
Cohesion: 0.33
Nodes (6): Addendum (2026-08-24, issue #418): the self-close echo path must arm the same reload-watch, ADR 0045: Use the Navigation API to intercept the overlay-close back-gesture, with a popstate fallback, Consequences, Context, Decision, Options Considered

### Community 342 - "Heuristics Scoring Guide"
Cohesion: 0.50
Nodes (4): Heuristics Scoring Guide, Issue Severity (P0–P3), Reference Material, Score Summary

### Community 343 - "detect.mjs"
Cohesion: 0.50
Nodes (3): candidates, detectorPath, __dirname

### Community 344 - "hook.mjs"
Cohesion: 0.83
Nodes (3): isStopEvent(), main(), readStdin()

### Community 351 - "/visualize-fq-design"
Cohesion: 0.29
Nodes (6): Method A: User-Provided Image, Method B: Live In-Browser Screenshot, Step 1 — Acquire Reference Screenshot(s), Step 2 — Generate Concept Mockup, Step 3 — Review & Transition to Implementation, /visualize-fq-design

### Community 353 - "doctor.md"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Test Matrix, Decisions Made, Files to Change, Functional E2E: Sidebar Drawer & Navigation Tabs, Summary, Verified Test Cases (+1 more)

### Community 355 - "render-context.ts"
Cohesion: 0.39
Nodes (7): RenderContext, buildRenderContext(), interpolate(), loadMessages(), lookup(), messagesCache, toSafeLocale()

### Community 356 - "Session Handoff — Dark Theme Mushaf Unification"
Cohesion: 0.40
Nodes (5): ADR 0031 gold vs emerald semantics (referenced/revised), ADR 0031 gold vs emerald semantics (referenced), ADR 0032 dark surface depth from light (referenced), Session Handoff — Dark Theme Mushaf Unification, Hard constraints — do NOT break (value-identical theme blocks, gold reader-only, etc.)

### Community 357 - "Addendum — surah Sidebar was missed by the notifyNavigating fix (2026-08-16)"
Cohesion: 0.25
Nodes (8): Addendum — surah Sidebar was missed by the notifyNavigating fix (2026-08-16), Approach, Bug, Constraints, Decisions Made, Files to Change, Root cause, What NOT to Do

### Community 358 - "Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit"
Cohesion: 0.20
Nodes (9): Approach, Constraints, Decision Tree / Execution Matrix, Decisions Made, Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit, Files to Change, Summary, Verified Test Cases (+1 more)

### Community 359 - "Elevation & Depth"
Cohesion: 0.67
Nodes (3): Elevation & Depth, Named Rules, Shadow Vocabulary

### Community 361 - "isSearchQueryValid"
Cohesion: 0.29
Nodes (9): GET(), GET(), isSearchQueryValid(), MIN_SEARCH_QUERY_LENGTH, searchChapters(), searchVerses(), useSearch(), normalizeArabicQuery() (+1 more)

### Community 362 - ".codex/hooks/graphify-sync-rebuild.sh"
Cohesion: 0.50
Nodes (3): GRAPHIFY_CHANGED, PYTHONHASHSEED, graphify-sync-rebuild.sh script

### Community 365 - "vertical/page.tsx"
Cohesion: 0.40
Nodes (3): VerticalQuranPages(), revalidate, ADR-0035

### Community 368 - "verses-words.js"
Cohesion: 0.38
Nodes (6): axios, correctAudioUrl(), fetchPage(), fetchVersesAndWords(), ADR-0009, PARAMS

### Community 369 - "checkTextOcclusionDOM"
Cohesion: 0.22
Nodes (11): checkTextOcclusionDOM(), clippedByInset(), clippedByRect(), elementDirectText(), expandBoxShorthand(), firstMetricLengthPx(), isLayeredElement(), isOpaqueDecoratedBox() (+3 more)

### Community 370 - "Components"
Cohesion: 0.33
Nodes (6): Buttons, Cards / Containers, Components, Icons, Reader Nav Arrow (signature component), Reading Surface Ornaments (signature)

### Community 371 - "20260708033111_init/migration.sql"
Cohesion: 0.40
Nodes (4): `marks`, `mushaf_access_grants`, `mushaf_share_codes`, `users`

### Community 372 - "20260803193743_add_notification_tables/migration.sql"
Cohesion: 0.50
Nodes (4): `notification_deliveries`, `notifications`, `push_subscriptions`, `scheduled_notifications`

### Community 373 - "checkElementRadialSpotlightDOM"
Cohesion: 0.67
Nodes (4): checkElementRadialSpotlight(), checkElementRadialSpotlightDOM(), elementGradientValue(), spotlightLabel()

### Community 381 - "live-inject.mjs"
Cohesion: 0.16
Nodes (19): describeInjectArtifacts(), frameworkIgnorePatterns(), resolveFramework(), applyNuxtLiveAdapter(), buildNuxtPlugin(), detectNuxtProject(), NUXT_PLUGIN_MARKER, NUXT_PLUGIN_NAME (+11 more)

### Community 386 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Ambiguous Edges - Review These
- `ADR TEMPLATE.md` → `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra`  [AMBIGUOUS]
  docs/architecture/adr/TEMPLATE.md · relation: references
- `Review dimensions (Bugs, Quality, Plan Consistency)` → `docs/plans/release-branch-workflow.md`  [AMBIGUOUS]
  docs/workflow/review-work.md · relation: conceptually_related_to
- `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)` → `Static Generation Strategy (604 Quran Pages)`  [AMBIGUOUS]
  docs/architecture/adr/0015-release-branch-workflow.md · relation: conceptually_related_to

## Knowledge Gaps
- **2271 isolated node(s):** `graphify-sync-rebuild.sh script`, `PYTHONHASHSEED`, `GRAPHIFY_CHANGED`, `path`, `ROOT` (+2266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ADR TEMPLATE.md` and `ADR 0037: Notification dispatch via a channel registry, no queue/worker infra`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Review dimensions (Bugs, Quality, Plan Consistency)` and `docs/plans/release-branch-workflow.md`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Release-Branch Deployment Workflow (main -> release/x.y.z -> prod -> main)` and `Static Generation Strategy (604 Quran Pages)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `FqLogger` connect `deps.ts` to `concept-seed.mjs`, `edge.ts`, `jsonResponse`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `DesktopQuranFontSizeContext.tsx`, `SettingsSidebar.tsx`, `AccessibleMushafList.tsx`, `RecitationSettingsSheet.tsx`, `QuranSafha.tsx`, `utils.ts`, `useTranslations`, `sw.ts`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `appPrisma` connect `jsonResponse` to `streak/route.ts`, `engine.ts`, `api/marks/route.ts`, `deps.ts`, `utils.ts`, `[locale]/layout.tsx`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `graphify-sync-rebuild.sh script`, `PYTHONHASHSEED`, `GRAPHIFY_CHANGED` to the rest of the system?**
  _2271 weakly-connected nodes found - possible documentation gaps or missing edges._