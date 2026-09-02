# Plans Index

Generated from each plan's YAML frontmatter by `.claude/skills/scripts/gen-plans-index.sh` ([ADR 0059](../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)). Do not hand-edit — regenerate after adding or changing a plan.

159 plans.

| Area | Plan | Status | Type |
|---|---|---|---|
| a11y | [Fix Dialog Missing Title/Description A11y Warnings](fix-dialog-missing-description.md) | implemented | bug |
| api | [Base Notification System](base-notification-system.md) | implemented | feature |
| api | [Fix Homepage CDN Cache Poisoning (Hostinger Edge)](fix-homepage-cdn-cache-poisoning.md) | implemented | bug |
| api | [Fix NextAuth JWT/Session Corruption on Transient DB Error](fix-nextauth-jwt-session-corruption.md) | implemented | bug |
| api | [Fix RSC Cache Poisoning on Hostinger](fix-rsc-cache-poisoning.md) | implemented | bug |
| api | [Fix: Invalid Font MIME Type in Preload Hint](fix-preload-font-mime-type.md) | implemented | bug |
| awrad | [Daily Awrad & Learning Plans Engine (Foundation)](awrad-learning-plans.md) | implemented | feature |
| awrad | [Daily Awrad UI](daily-awrad-ui.md) | implemented | feature |
| awrad | [Verse & Fractional-Page Granularity for Awrad](awrad-verse-granularity.md) | implemented | feature |
| ci | [CI Quality Gate: PR Lint, Typecheck & Vitest Workflow](ci-quality-gate.md) | implemented | feature |
| ci | [CI: Bump actions/* off deprecated Node 20](bump-actions-node20.md) | implemented | chore |
| ci | [Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit](local-build-and-test-ergonomics.md) | implemented | feature |
| ci | [Fix Hostinger Auto-Deploy Build Failures](fix-hostinger-build.md) | implemented | bug |
| ci | [Functional E2E: Settings & Preferences Persistence](functional-e2e-settings-persistence.md) | implemented | feature |
| ci | [Skip visual e2e on config-only PRs](skip-e2e-config-changes.md) | implemented | feature |
| ci | [Visual E2E Testing in the Workflow](visual-e2e-testing.md) | implemented | feature |
| db | [Adopt Prisma Migrations for furqan_app](adopt-prisma-migrations.md) | implemented | feature |
| db | [Fix Prisma Connection Exhaustion on Next.js Dev Hot-Reload](fix-dev-hmr-prisma-connections.md) | implemented | bug |
| db | [Fix Stale connection_limit Documentation](fix-connection-limit-docs.md) | implemented | bug |
| db | [Split the Quran database from the application database](split-quran-app-databases.md) | implemented | feature |
| db | [Store Static Page Metadata in Database](store-page-metadata.md) | implemented | feature |
| marks | [Complex E2E & Fix: Shared Mushaf Access & Mid-Session Revocation Navigation](e2e-shared-mushaf-revocation.md) | implemented | feature |
| marks | [Complex E2E & Fix: Word Marking, Auth Gates & 'My Marks' Round-Trip Jumps](marking-auth-roundtrip-e2e.md) | implemented | feature |
| marks | [Copy and Share Verses from Mark Modal](copy-share-verses.md) | implemented | feature |
| marks | [Delete My Marks](delete-my-marks.md) | implemented | feature |
| marks | [Enhance MarkModal Motion & Polish](enhance-mark-modal-motion.md) | implemented | feature |
| marks | [Fix MarkModal Auth Gate — Allow Recitation Without Sign-in](fix-markmodal-auth-gate.md) | implemented | bug |
| marks | [Fix Marks Broken by Hardcoded localhost URL](fix-marks-hardcoded-localhost.md) | implemented | bug |
| marks | [Functional E2E: Word Marking & Memorization Flow](functional-e2e-word-marking.md) | implemented | feature |
| marks | [Mark Modal Redesign, Distinct Category Icons & Typography Polish](mark-modal-redesign.md) | implemented | feature |
| marks | [My Marks Page](my-marks-page.md) | implemented | feature |
| marks | [Paginate My Marks](paginate-my-marks.md) | implemented | feature |
| marks | [Shared Mushaf Access ("My teacher can access my mushaf")](shared-mushaf-access.md) | implemented | feature |
| marks | [Shrink MarkModal & Hide Radio Dot](shrink-mark-modal.md) | implemented | bug |
| marks | [Unify Marks: Category + Optional Comment](make-marks-meaningful.md) | implemented | feature |
| marks | [Verse/Word Comments](verse-word-comments.md) | implemented | feature |
| nav | [Close Overlays on Back-Swipe (Mobile/Tablet PWA)](close-overlays-on-back-swipe.md) | implemented | bug |
| nav | [Close Surah Sidebar on Link Click](sidebar-close-on-nav.md) | implemented | bug |
| nav | [Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation](desktop-navbar-font-bg.md) | implemented | feature |
| nav | [Enhanced RubList Sidebar](enhance-rub-list-sidebar.md) | implemented | feature |
| nav | [Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA)](fix-nav-overlay-link-navigation-race.md) | implemented | bug |
| nav | [Fix Navbar Icon Overflow on Mobile/Tablet](fix-nav-icon-overflow.md) | implemented | bug |
| nav | [Fix Navbar Logo Locale Link](fix-navbar-logo-locale-link.md) | implemented | bug |
| nav | [Fix Sidebar Bottom Clip](fix-sidebar-bottom-clip.md) | implemented | bug |
| nav | [Functional E2E: Sidebar Drawer & Navigation Tabs](functional-e2e-sidebar-navigation.md) | implemented | feature |
| nav | [Home Page Navigation Search (surah name, juz, page)](home-nav-search.md) | implemented | feature |
| nav | [Mobile Navigation UX](mobile-nav-ux.md) | implemented | feature |
| nav | [Nav: Dedupe NavPillLink classNames into Shared Component](dedupe-nav-pill-link.md) | implemented | bug |
| nav | [Reader Nav Overlay (mobile + tablet)](tablet-nav-overlay.md) | implemented | feature |
| nav | [Restructure Navigation for Clean UX](restructure-navigation.md) | implemented | feature |
| nav | [Save Last Read Page + Navbar Link to Resume](save-last-read-page.md) | implemented | feature |
| nav | [Sidebar Search Placeholder & Typography Compactness](sidebar-search-font-sizing.md) | implemented | feature |
| nav | [Sidebar Search Placeholders Alignment with Homepage Copy](sidebar-search-placeholder-alignment.md) | implemented | feature |
| nav | [Sidebar Surah Indicator & Active Scroll](sidebar-surah-indicator.md) | implemented | feature |
| nav | [Sidebar: Current-Surah Ayah Picker Tab](sidebar-ayah-picker.md) | implemented | feature |
| nav | [Sidebar: per-tab search filters (Surahs + Rubs tabs)](sidebar-tab-filters.md) | implemented | feature |
| observability | [fq-logger: Structured Logging & Observability](fq-logger.md) | implemented | feature |
| observability | [Sentry Error Tracking](sentry-error-tracking.md) | implemented | feature |
| observability | [Sentry-to-Slack Alerting via Relay Webhook](sentry-slack-alerts.md) | implemented | feature |
| pwa | [Feature: Browser Fullscreen Focus Mode (desktop)](feature-pwa-fullscreen-focus-mode.md) | implemented | feature |
| pwa | [Fix: Users See Stale App After Deployment (Service Worker Cache)](fix-sw-stale-cache.md) | implemented | bug |
| pwa | [Keep Mobile/Tablet Screen Active While App Is Open](keep-screen-awake.md) | implemented | feature |
| pwa | [PWA App-Launch Stickiness: Launch Into Last Page + Android Double-Back-to-Exit](pwa-app-stickiness.md) | implemented | feature |
| pwa | [PWA Conversion + Offline Quran Page Reading](pwa-offline-support.md) | implemented | feature |
| pwa | [PWA: Remove the Root Layout's Unconditional Reciters and Session Network Calls From the Launch Path](pwa-launch-network-calls.md) | implemented | bug |
| pwa | [Restore Continue Reading nav icon on installed PWA](restore-continue-reading-pwa-icon.md) | implemented | bug |
| reader | [Arrow Controls on Desktop](arrow-controls-desktop.md) | implemented | feature |
| reader | [Complex E2E & Fix: Deep Links, Highlight Parameter Lifecycle & View Mode Transitions](deep-links-highlight-view-modes.md) | implemented | feature |
| reader | [Consolidate Mobile Safha Sizing Docs](consolidate-mobile-safha-docs.md) | implemented | feature |
| reader | [Consolidate Suspense Boundaries in QuranLine / QuranSafha](consolidate-suspense-boundaries.md) | implemented | bug |
| reader | [Fix Desktop Search Dropdown Hidden by Reader Stacking Context](fix-desktop-search.md) | implemented | bug |
| reader | [Fix QuranSafha Swipe Flicker (font-ready flash + mark re-renders)](fix-safha-swipe-flicker.md) | implemented | bug |
| reader | [Fix Reader Hydration Mismatch (ReaderPage style injection)](fix-reader-hydration.md) | implemented | bug |
| reader | [Fix Reader Navigation Infinite Render Loop](fix-reader-nav-infinite-loop.md) | implemented | bug |
| reader | [Fix Reversed Mobile Swipe Navigation Direction](fix-mobile-swipe-direction.md) | implemented | bug |
| reader | [Fix Tajweed Mushaf Swipe Flicker](fix-tajweed-swipe-flicker.md) | implemented | bug |
| reader | [Functional E2E: Reader Navigation & Page Controls](functional-e2e-reader-navigation.md) | implemented | feature |
| reader | [Loading Placeholder Toggles the Scrollbar, Reflowing the Whole Document](fix-panel-placeholder-reflow.md) | implemented | bug |
| reader | [Mobile Safha: Full-Screen Sizing (Width-Driven Font + Flexbox Fill)](mobile-safha-sizing.md) | implemented | feature |
| reader | [Mobile Swipe Page Animation](mobile-swipe-animation.md) | implemented | feature |
| reader | [Mushaf Double-Page Spread Toggle](mushaf-double-page-view.md) | implemented | feature |
| reader | [Nocturnal Reader Lab — Desktop RTL](reader-lab-nocturnal-desktop.md) | implemented | feature |
| reader | [Page Turn Blanks the Reader on Slow Networks](fix-page-turn-blank-slow-network.md) | implemented | bug |
| reader | [Quran Safha: Fit Viewport With No Scroll (Default Font Scale)](quran-safha-viewport-fit.md) | implemented | bug |
| reader | [Reader Rhythm: Per-Band Size Contracts, Desktop Presets, Tablet Double View](reader-line-rhythm.md) | implemented | feature |
| reader | [Reader Swipe Performance: Persistent Client Pager](reader-persistent-pager.md) | implemented | feature |
| reader | [Remove Safha Card Background on Mobile](mobile-safha-remove-card-background.md) | implemented | feature |
| reader | [Stabilize Tajweed Stylesheet Injection and Extend Swipe Hover Suppression](tajweed-stylesheet-hover-suppression.md) | implemented | bug |
| recitation | [Add Quran Recitation Playback with Reciter Selection](recitation-playback.md) | implemented | feature |
| recitation | [Listening Wird Inline Playback — Review Fix Plan](listening-wird-inline-playback-fixes.md) | implemented | bug |
| recitation | [Listening Wird: Inline Playback on Assignment Rows](listening-wird-inline-playback.md) | implemented | feature |
| recitation | [Offline Recitation Audio Download](offline-recitation-download.md) | implemented | feature |
| recitation | [Play Audio for Individual Words](word-audio-playback.md) | implemented | feature |
| recitation | [Recitation Bar: Vertical Rail (Desktop)](recitation-bar-vertical-rail.md) | implemented | feature |
| release | [Consolidate the release workflow: 4 skills → 1, staging PR carries the changelog](consolidate-release-workflow.md) | implemented | feature |
| release | [Protect prod Branch: Enforce Merges from release/* Only](protect-prod-branch.md) | implemented | feature |
| release | [Release-Branch Deployment Workflow](release-branch-workflow.md) | implemented | feature |
| rendering | [Add Tajweed color-coded mushaf mode](tajweed-mushaf-mode.md) | implemented | feature |
| rendering | [Fix Tajweed Mushaf Font Size to Match Regular Mushaf](fix-tajweed-font-size.md) | implemented | bug |
| rendering | [Fix ViewingChip IntlError: missing {name} interpolation variable](fix-viewing-chip-intl-interpolation.md) | implemented | bug |
| rendering | [Fix: Ayah Font Not Rendering in Search Results and Mark Modal](fix-ayah-font-rendering.md) | implemented | bug |
| rendering | [Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle](fix-quran-page-font-loading.md) | implemented | bug |
| rendering | [Fix: Hamza-Alif Mismatch in Verse Search](fix-arabic-hamza-search-mismatch.md) | implemented | bug |
| rendering | [Fix: Verse Rendering Outside the Quran Page](fix-verse-rendering-outside-quran-page.md) | implemented | bug |
| rendering | [Homepage Surah Card: Direction-Based Name Display](homepage-surah-name-direction.md) | implemented | feature |
| rendering | [Quran Font Size: Minimum Floor for Short Viewports](quran-font-size-minimum-floor.md) | implemented | bug |
| rendering | [Quran Page Mushaf Design Enhancement](quran-page-mushaf-design.md) | implemented | feature |
| rendering | [QuranSafha Header — Surah Name Glyph Font](safha-header-surah-glyph-font.md) | implemented | feature |
| rendering | [Replace Dynamic Surah List with Static JSON at Build Time](static-surah-list-json.md) | implemented | feature |
| rendering | [Safha Ribbon Indicator](safha-ribbon-indicator.md) | implemented | feature |
| rendering | [System-wide Eastern Arabic Numerals for ar Locale](system-wide-eastern-arabic-numerals.md) | implemented | feature |
| rendering | [Unify Tajweed toggle + offline downloads into one Mushaf Layout setting](mushaf-layout-settings.md) | implemented | feature |
| search | [Fix Search Debounce Lag](fix-search-debounce-lag.md) | implemented | bug |
| search | [Functional E2E: Search & Discovery Flows](functional-e2e-search.md) | implemented | feature |
| seeder | [Reproducible Quran Database Seeder](reproducible-quran-seeder.md) | implemented | chore |
| surah-layout | [Fix: Surah Banner Placement and Standalone Line Sizing](fix-surah-banner-placement.md) | implemented | bug |
| tafsir | [Complex E2E & Fix: Tafsir Sheet Interplay with Page Boundaries & Recitation](e2e-tafsir-page-boundaries-recitation.md) | implemented | feature |
| tafsir | [Tafsir: Direct QDC Client Provider & Query Hook](tafsir-qdc-provider-and-query-hook.md) | implemented | feature |
| tafsir | [Tafsir: Responsive Sheet Component & Reader Integration (Issues #459 & #460)](tafsir-responsive-sheet-component.md) | implemented | feature |
| theming | [Design Migration — reader-lab language, app-wide](design-migration/INDEX.md) | in-progress | feature |
| theming | [0.1 — Light and gold variants in the lab](design-migration/0.1-lab-light-gold-variants.md) | implemented | feature |
| theming | [0.2 — The mushaf page face in the lab](design-migration/0.2-lab-page-face.md) | implemented | feature |
| theming | [0.3 — Small-screen composition in the lab](design-migration/0.3-lab-small-screen.md) | implemented | feature |
| theming | [0.4 — Write the design-language spec](design-migration/0.4-design-language-spec.md) | implemented | feature |
| theming | [1.1 — Rewrite the canon](design-migration/1.1-rewrite-design-principles.md) | implemented | feature |
| theming | [2.1 — Semantic tokens](design-migration/2.1-semantic-tokens.md) | implemented | feature |
| theming | [3.1 — UI primitives](design-migration/3.1-ui-primitives.md) | implemented | feature |
| theming | [3.2 — Shared chrome](design-migration/3.2-shared-chrome.md) | implemented | feature |
| theming | [4.1 — Marks and plans screens](design-migration/4.1-screens-marks-plans.md) | implemented | feature |
| theming | [4.2 — Home screen](design-migration/4.2-screens-home.md) | implemented | feature |
| theming | [4.3 — Search and settings surfaces](design-migration/4.3-screens-search-settings.md) | implemented | feature |
| theming | [4.4 — Mushaf hub and shared-grant surfaces](design-migration/4.4-screens-mushaf-hub.md) | implemented | feature |
| theming | [5.1 — Page face and reader](design-migration/5.1-page-face-and-reader.md) | implemented | feature |
| theming | [Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette](dark-theme-mushaf-unification.md) | implemented | feature |
| theming | [Design System Foundation](design-system-foundation.md) | implemented | feature |
| theming | [Home Page Design Fixes](home-page-design-fixes.md) | implemented | feature |
| theming | [Homepage Design & UX Elevation](design-migration/home-page-enhancement.md) | implemented | feature |
| theming | [Plan: Set `font-tajawal` globally on app root & Tailwind `sans`](global-ui-font-tajawal.md) | implemented | feature |
| theming | [Reading-desk depth for light & gold — and de-duplicating the reader CSS](theme-depth-unification.md) | implemented | feature |
| theming | [Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav)](brand-mark-icons.md) | implemented | feature |
| theming | [Three Theme Palette](three-theme-palette.md) | implemented | feature |
| theming | [Unify Accents: Replace Gold Accents and Ornaments with Emerald Green](unify-accents-gold-to-green.md) | implemented | feature |
| theming | [Handoff — Reading-Desk Depth for Light & Gold (and de-duplicating the reader CSS)](theme-depth-unification-HANDOFF.md) | superseded | feature |
| theming | [Session Handoff — Dark Theme Mushaf Unification](dark-theme-mushaf-unification-HANDOFF.md) | superseded | feature |
| workflow | [Agent-surface consolidation + graphify ignore-set](consolidate-agent-surfaces.md) | implemented | chore |
| workflow | [Configure Project-Local Trello MCP for Codex](configure-project-trello-mcp.md) | implemented | feature |
| workflow | [Domain-split DECISIONS.md into decisions/*.md + thin always-loaded index](split-decisions-by-domain.md) | implemented | feature |
| workflow | [Fold the 29 addendum-bearing plans into single coherent specs](fold-plan-addenda.md) | implemented | chore |
| workflow | [Git Workflow Skills (commit/push gating + confirm-dangerous-git)](git-workflow-skills.md) | implemented | feature |
| workflow | [Git Worktrees Workflow Integration](git-worktrees-workflow.md) | implemented | feature |
| workflow | [Plan lifecycle — YAML frontmatter, generated INDEX.md, fold-addenda-on-ship](plan-lifecycle-index.md) | implemented | chore |
| workflow | [PR Review Remediations for Feature 433](pr-review-remediations.md) | implemented | feature |
| workflow | [Remove 5 workflow skills (impeccable, visualize-fq-design, compress-fq-docs, mujaz, ui-motion)](remove-workflow-skills.md) | implemented | feature |
| workflow | [Trello → GitHub Issues Migration Plan](trello-to-github-issues-migration.md) | implemented | feature |
| workflow | [UI Workflow Enhancements](ui-workflow-enhancements.md) | implemented | feature |
| workflow | [AI-First Documentation & Workflow System](ai-docs-workflow-system.md) | superseded | feature |
| workflow | [Plan: /retrospect skill](PLAN-retrospect-skill-2026-06-29.md) | superseded | feature |
| workflow | [Retrospect: Confirm Before Saving File](retrospect-confirm-before-save.md) | superseded | bug |
| workflow | [Wire /impeccable into the plan/implement/review workflow](wire-impeccable-workflow.md) | superseded | feature |
