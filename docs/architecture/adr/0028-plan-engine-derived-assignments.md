# ADR 0028: Plan engine — code-defined templates, typed scheduling rules, derived daily assignments

**Date:** 2026-07-24
**Status:** Accepted

## Context

Daily awrad ("read N pages/day") and structured memorization programs like الحصون الخمسة must run on one engine. الحصون الخمسة is the forcing case: five parallel daily tracks where three are functions of another track's state (near review = trailing window of memorized pages; distant review = cycle over everything memorized; preparation = tomorrow's new portion). Any design that stores each track as an independent static schedule cannot express these dependencies. All user state must live in `furqan_app` with scalar Quran refs only (ADR 0008), and reader pages stay statically generated (user data is client-fetched).

## Options Considered

**Option A — Materialized schedule rows**
Enrollment generates a calendar of per-day, per-track assignment rows; reads are trivial, but every pause/skip/level-change/rule-kind addition requires regenerating or migrating future rows, and cross-track dependencies must be re-materialized in cascade.

**Option B — DB-defined templates**
Plan structures live in template/track tables editable without deploys; but track rules reference code semantics (rule-kind algorithms), so rows are config pointing at code anyway, and an admin surface is needed on day one.

**Option C — Code-defined templates + derived assignments (chosen, hybrid path)**
Templates are typed TS constants (like `MARK_CATEGORIES`); each track = unit + quantity + one of five typed scheduling rule kinds + an `activity`. Only enrollments (`UserPlan`) and an append-only progress log (`ProgressEntry`) are stored; the daily assignment is a pure function `f(template, enrollment params, progress log, date)` computed at read time and never persisted. If user-authored plans become real later, a DB overlay instantiates the same track/rule shapes (hybrid — decided with the user).

## Decision

Option C. Five scheduling rule kinds — `fixed_cycle`, `cursor_advance`, `trailing_window`, `completed_cycle`, `lookahead` — compose into any template shape; `activity` (`read | listen | memorize | review`) is a **per-track** attribute orthogonal to scheduling (a listening wird is `fixed_cycle` + `activity: listen`; a hifz program's تحضير track may be `lookahead` + `listen`). Progress is page-canonical (juz/hizb/rub resolve to page ranges from seeded `PageMetadata`/`Rub` data); missed-day policy is per-template (cursor-shift default, calendar-bound templates recompute daily quantity); completion is manual check-off with optional reader-aware shortcuts; multiple concurrent enrollments are allowed.

## Consequences

- **+** الحصون الخمسة's cross-track dependencies fall out of the rule kinds naturally; new program shapes are new compositions, not schema changes.
- **+** No schedule rows to generate, repair, or migrate — pause/skip/level-change are safe by construction; the assignment function is unit-testable.
- **+** Templates are reviewed, versioned, i18n-ready code; no admin UI required.
- **-** "What was I assigned on day X" is reconstructable only through the progress log, not queryable as stored rows — history views read the log (what was actually done), never recompute.
- **-** Every read of "today" computes the assignment (needs the enrollment + log slice); acceptable at this scale, cacheable client-side via React Query.
- **-** Shipping a new template or rule kind requires a deploy (accepted; hybrid DB overlay is the future escape hatch).
- **-** Exact per-level quantities for الحصون الخمسة still need a sourced decision before that template ships; the engine does not block on it.
