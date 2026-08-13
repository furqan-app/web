# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Muslims building a personal, sustained relationship with the Quran through daily reading — two overlapping jobs:

- **Habit-building readers**: want to read consistently, track progress, and stay accountable (plans, streaks, notifications).
- **Memorization (hifz) students**: use word-level marking and page-accurate mushaf layouts to memorize.

Both are served by the same core surfaces (mushaf, marks, plans); the app does not fork into separate hifz vs. reading-only modes.

## Product Purpose

A word-focused Quran reading app. Users read from print-accurate mushaf page layouts, mark their progress and memorization at word level, follow reading/memorization plans (awrad) that build a habit, and can share their mushaf progress with others (e.g. a teacher or family member reviewing a learner's progress).

## Positioning

Three things together, not any one alone:

1. **Word-level marking** — granularity below the verse, unlike most Quran apps that track at ayah or page level.
2. **Print-accurate mushaf layouts** — real mushaf page renderings (not a reflowed generic text stream), with multiple national print editions planned (Madani, Azhar, etc.) beyond the current one.
3. **Mushaf sharing** — an owner can grant another user viewer access to their marked-up mushaf (`app/api/mushaf/grants`), so plans/progress can be reviewed by a teacher, parent, or study partner.

Plans (awrad) exist to build and sustain the habit of working through the mushaf, not as a generic todo/reminder system.

## Operating Context

- Two-database split: `furqan_quran` (read-only Quran content) and `furqan_app` (user/interaction data) — never joined by FK (ADR 0008).
- Core surfaces: mushaf reader (`/mushaf`), shared mushaf view (`/mushaf/[grant]`), page reader (`/pages/[id]`, `/pages/vertical`), marks (`/marks`), plans (`/plans`).
- Locale-scoped routing (`/[locale]/...`), Arabic (RTL) and English (LTR) via next-intl.
- Notifications (push + in-app) nudge users back into their reading habit.
- Recitation/audio accompanies reading.

## Capabilities and Constraints

- **Static-first architecture**: all 604 mushaf pages are statically pre-generated; client-side hydration is reserved for user interaction (marking, navigation, plans), not for content rendering. Design work must not silently reintroduce client-rendered page content.
- **i18n**: Arabic (RTL) and English (LTR) are both first-class; UI must work correctly mirrored, not just translated.
- **Offline/PWA**: offline reliability is a hard product requirement (`@serwist/next`), not incidental infra — a user mid-reading should not lose their place or lose the ability to read on connectivity loss.
- **Accessibility**: a formal accessibility bar applies to this product; the specific standard (e.g. WCAG level) has not yet been pinned down and should be confirmed before being treated as a hard gate.
- Terminology: "surah" (not chapter), "verse" (not ayah), "word-level" for word-granularity marking, "mushaf" for the page/layout view.

## Brand Commitments

- Manuscript-inspired reading identity — UI should evoke the physical act of holding and reading a book, not a generic SaaS dashboard. Full detail in `docs/design/design-principles.md` (canonical source for UI/visual decisions — treat as durable identity, not a proposal to revisit here).

## Evidence on Hand

- `docs/architecture/adr/` — architectural decision history, including the database split (ADR 0008), reproducible Quran seeder (ADR 0009), and mushaf grant/revoke behavior (ADR 0012).
- `docs/standards/` — API, component, database, i18n, and styling standards.
- No user testimonials, case studies, or external press on hand; do not fabricate any.

## Product Principles

1. The mushaf page is sacred to the reading experience — layouts must stay print-accurate; content is never reflowed for convenience.
2. Progress tracking is granular (word-level) and durable — marks and plan progress are what the habit is built on.
3. Static-first, always — precomputed content over client computation wherever the two compete.
4. One reading experience, two audiences — habit-builders and memorizers share surfaces rather than forking the product.
5. Sharing is trust-scoped — a mushaf grant exposes one owner's progress to one viewer, revocable by either side (ADR 0012), not open/broadcast.

## Accessibility & Inclusion

Formal accessibility bar applies; exact standard undetermined — confirm before treating any specific WCAG level as a hard requirement.
