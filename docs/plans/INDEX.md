# Plans Index

Generated from each plan's YAML frontmatter by `.claude/skills/scripts/gen-plans-index.sh` ([ADR 0059](../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)). Do not hand-edit — regenerate after adding or changing a plan.

76 active plans.

104 finished plans are archived — see [archive/INDEX.md](archive/INDEX.md). Never load an archived plan for background context; its durable content lives in `docs/architecture/decisions/*.md` + ADRs.

| Area | Plan | Status | Type |
|---|---|---|---|
| a11y | [Fix Dialog Missing Title/Description A11y Warnings](fix-dialog-missing-description.md) | implemented | bug |
| api | [Fix RSC Cache Poisoning on Hostinger](fix-rsc-cache-poisoning.md) | implemented | bug |
| awrad | [Daily Awrad & Learning Plans Engine (Foundation)](awrad-learning-plans.md) | implemented | feature |
| awrad | [Daily Awrad UI](daily-awrad-ui.md) | implemented | feature |
| awrad | [Verse & Fractional-Page Granularity for Awrad](awrad-verse-granularity.md) | implemented | feature |
| ci | [CI Quality Gate: PR Lint, Typecheck & Vitest Workflow](ci-quality-gate.md) | implemented | feature |
| ci | [Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit](local-build-and-test-ergonomics.md) | implemented | feature |
| ci | [Local E2E runs against a production build, like CI](local-e2e-build-path.md) | implemented | chore |
| ci | [Skip visual e2e on config-only PRs](skip-e2e-config-changes.md) | implemented | feature |
| ci | [Visual E2E Testing in the Workflow](visual-e2e-testing.md) | implemented | feature |
| db | [Adopt Prisma Migrations for furqan_app](adopt-prisma-migrations.md) | implemented | feature |
| db | [Fix Prisma Connection Exhaustion on Next.js Dev Hot-Reload](fix-dev-hmr-prisma-connections.md) | implemented | bug |
| marks | [E2E: offline and guest marking coverage](offline-first-marks/552-e2e-coverage.md) | ready-to-implement | chore |
| marks | [My Marks reads the local store; ungate the page in the PWA](offline-first-marks/551-my-marks-store.md) | ready-to-implement | feature |
| marks | [Offline-First Marks — umbrella](offline-first-marks/INDEX.md) | ready-to-implement | feature |
| marks | [Copy and Share Verses from Mark Modal](copy-share-verses.md) | implemented | feature |
| marks | [Local marks store module](offline-first-marks/546-local-store.md) | implemented | feature |
| marks | [MarkModal: offline marking + guest marking in the installed PWA](offline-first-marks/550-markmodal-gates.md) | implemented | feature |
| marks | [Marks API: full-sync mode + share getSortKey](offline-first-marks/545-api-full-sync.md) | implemented | chore |
| marks | [Marks sync engine (push-then-pull)](offline-first-marks/547-sync-engine.md) | implemented | feature |
| marks | [Marks: stale-write guard via client_updated_at](offline-first-marks/544-stale-write-guard.md) | implemented | chore |
| marks | [Reader renders marks from the local store](offline-first-marks/548-reader-store-reads.md) | implemented | feature |
| marks | [Service worker: marks GET must be NetworkOnly](offline-first-marks/549-sw-networkonly.md) | implemented | chore |
| marks | [Verse/Word Comments](verse-word-comments.md) | implemented | feature |
| marks | [Wire the marks store + sync engine into the app lifecycle](offline-first-marks/560-sync-wiring.md) | implemented | fix |
| nav | [Close Overlays on Back-Swipe (Mobile/Tablet PWA)](close-overlays-on-back-swipe.md) | implemented | bug |
| nav | [Complex E2E & Fix — Locale Switching & Bi-Directional Reader Navigation](e2e-locale-switching.md) | implemented | feature |
| nav | [Complex E2E & Fix: Multi-Layer Overlay Stacks, Gesture Interrupts & History Traversal](e2e-overlay-stacks-history.md) | implemented | feature |
| nav | [Desktop Navbar Redesign: Icon-Chip Theming, Spacing, Search Consolidation](desktop-navbar-font-bg.md) | implemented | feature |
| nav | [Fix Sidebar Bottom Clip](fix-sidebar-bottom-clip.md) | implemented | bug |
| nav | [Mobile Navigation UX](mobile-nav-ux.md) | implemented | feature |
| nav | [Reader Nav Overlay (mobile + tablet)](tablet-nav-overlay.md) | implemented | feature |
| nav | [Restructure Navigation for Clean UX](restructure-navigation.md) | implemented | feature |
| nav | [Save Last Read Page + Navbar Link to Resume](save-last-read-page.md) | implemented | feature |
| nav | [Sidebar Surah Indicator & Active Scroll](sidebar-surah-indicator.md) | implemented | feature |
| pwa | [Feature: Browser Fullscreen Focus Mode (desktop)](feature-pwa-fullscreen-focus-mode.md) | implemented | feature |
| pwa | [Fix: Users See Stale App After Deployment (Service Worker Cache)](fix-sw-stale-cache.md) | implemented | bug |
| pwa | [PWA Conversion + Offline Quran Page Reading](pwa-offline-support.md) | implemented | feature |
| pwa | [Restore Continue Reading nav icon on installed PWA](restore-continue-reading-pwa-icon.md) | implemented | bug |
| reader | [Arrow Controls on Desktop](arrow-controls-desktop.md) | implemented | feature |
| reader | [Complex E2E & Fix: Boundary Wrap-Arounds & Error Route Recovery Navigation](e2e-boundary-wraparound-recovery.md) | implemented | feature |
| reader | [Fix QuranSafha Swipe Flicker (font-ready flash + mark re-renders)](fix-safha-swipe-flicker.md) | implemented | bug |
| reader | [Fix Reversed Mobile Swipe Navigation Direction](fix-mobile-swipe-direction.md) | implemented | bug |
| reader | [Fix Tajweed Mushaf Swipe Flicker](fix-tajweed-swipe-flicker.md) | implemented | bug |
| reader | [Loading Placeholder Toggles the Scrollbar, Reflowing the Whole Document](fix-panel-placeholder-reflow.md) | implemented | bug |
| reader | [Mushaf Double-Page Spread Toggle](mushaf-double-page-view.md) | implemented | feature |
| reader | [Nocturnal Reader Lab — Desktop RTL](reader-lab-nocturnal-desktop.md) | implemented | feature |
| reader | [Page Turn Blanks the Reader on Slow Networks](fix-page-turn-blank-slow-network.md) | implemented | bug |
| reader | [Reader Swipe Performance: Persistent Client Pager](reader-persistent-pager.md) | implemented | feature |
| reader | [Stabilize Tajweed Stylesheet Injection and Extend Swipe Hover Suppression](tajweed-stylesheet-hover-suppression.md) | implemented | bug |
| recitation | [Add Quran Recitation Playback with Reciter Selection](recitation-playback.md) | implemented | feature |
| recitation | [Listening Wird: Inline Playback on Assignment Rows](listening-wird-inline-playback.md) | implemented | feature |
| recitation | [Play Audio for Individual Words](word-audio-playback.md) | implemented | feature |
| recitation | [Recitation Bar: Vertical Rail (Desktop)](recitation-bar-vertical-rail.md) | implemented | feature |
| release | [Protect prod Branch: Enforce Merges from release/* Only](protect-prod-branch.md) | implemented | feature |
| release | [Release-Branch Deployment Workflow](release-branch-workflow.md) | implemented | feature |
| rendering | [Add Tajweed color-coded mushaf mode](tajweed-mushaf-mode.md) | implemented | feature |
| rendering | [Fix Tajweed Mushaf Font Size to Match Regular Mushaf](fix-tajweed-font-size.md) | implemented | bug |
| rendering | [Fix ViewingChip IntlError: missing {name} interpolation variable](fix-viewing-chip-intl-interpolation.md) | implemented | bug |
| rendering | [Fix: Garbled Quran Text on Page Navigation + PWA Precache Bandwidth Throttle](fix-quran-page-font-loading.md) | implemented | bug |
| rendering | [Safha Ribbon Indicator](safha-ribbon-indicator.md) | implemented | feature |
| search | [Dedicated Search Results Page with Infinite Scroll](search-results-page.md) | implemented | feature |
| search | [Fix Search Debounce Lag](fix-search-debounce-lag.md) | implemented | bug |
| search | [Offline Quran Search Foundation (Index, Offline Engine, Paginated API)](search-foundation.md) | implemented | feature |
| seeder | [Reproducible Quran Database Seeder](reproducible-quran-seeder.md) | implemented | chore |
| surah-layout | [Fix: Surah Banner Placement and Standalone Line Sizing](fix-surah-banner-placement.md) | implemented | bug |
| tafsir | [Tafsir: Offline Download & Cache Management for PWA](tafsir-offline-download.md) | implemented | feature |
| theming | [Design Migration — reader-lab language, app-wide](design-migration/INDEX.md) | in-progress | feature |
| theming | [Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette](dark-theme-mushaf-unification.md) | implemented | feature |
| theming | [Home Page Design Fixes](home-page-design-fixes.md) | implemented | feature |
| theming | [Reading-desk depth for light & gold — and de-duplicating the reader CSS](theme-depth-unification.md) | implemented | feature |
| theming | [Replace placeholder logo with the Furqan brand mark (favicon, PWA icons, nav)](brand-mark-icons.md) | implemented | feature |
| theming | [Unify Accents: Replace Gold Accents and Ornaments with Emerald Green](unify-accents-gold-to-green.md) | implemented | feature |
| workflow | [Domain-split DECISIONS.md into decisions/*.md + thin always-loaded index](split-decisions-by-domain.md) | implemented | feature |
| workflow | [Remove 5 workflow skills (impeccable, visualize-fq-design, compress-fq-docs, mujaz, ui-motion)](remove-workflow-skills.md) | implemented | feature |
| workflow | [AI-First Documentation & Workflow System](ai-docs-workflow-system.md) | superseded | feature |
