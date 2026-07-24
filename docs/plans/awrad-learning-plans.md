# Daily Awrad & Learning Plans Engine (Foundation)

**Type:** feature
**Date:** 2026-07-24
**Status:** implemented
**Trello:** #140 — https://trello.com/c/AVbdOJPq

## Summary

One engine powers both the simple ask ("read N pages/day, track progress") and structured multi-track programs like الحصون الخمسة. A simple daily wird is a degenerate learning plan with one track. Templates are typed TS constants; a track = unit + quantity + scheduling rule kind + activity. Only enrollments and an append-only progress log are stored (`furqan_app`); daily assignments are derived at read time, never persisted. See [ADR 0028](../architecture/adr/0028-plan-engine-derived-assignments.md). This plan covers the **foundation** (model, engine, storage, API); the plans hub UI / reader widget get their own follow-up plan.

## Approach

الحصون الخمسة (Dr. Saeed Hamza) is the forcing case — five daily tracks:
القراءة المستمرة (continuous reading), التحضير (prepare tomorrow's new portion), مراجعة البعيد (distant review), مراجعة القريب (near review), الحفظ الجديد (new memorization). Three of the five are functions of another track's state, so static per-track schedules can't express the program. Instead, tracks declare one of five typed scheduling rule kinds; the engine computes today's assignment from the template + enrollment params + progress log + date.

## Decision Tree / Algorithm

### Scheduling rule kinds

| Rule kind | Meaning | Params | Used by |
|---|---|---|---|
| `fixed_cycle` | Cycle through a fixed range at N units/day, wrap on completion (khatma counter) | range, units/day | simple wird · القراءة المستمرة · listening wird |
| `cursor_advance` | Move cursor N units/day through a target range; stops at end | target range, units/day | الحفظ الجديد · "memorize Juz Amma" |
| `trailing_window` | Re-visit the last W units completed by a source track | source track, window size | مراجعة القريب |
| `completed_cycle` | Cycle N units/day through everything the source track completed (minus the trailing window) | source track, units/day | مراجعة البعيد |
| `lookahead` | Preview tomorrow's assignment of the source track (× repetitions) | source track, repetitions | التحضير |

### Track shape

`Track = { key, activity, unit, ruleKind, ruleParams }` where `activity: read | listen | memorize | review` is **per-track** and orthogonal to scheduling — it drives the UI verb, reader/playback integration, and per-activity stats, never the schedule computation.

### Daily assignment derivation

```
assignment(track, date) =
  if rule has source track → resolve source track's state from progress log first
  cursor = last logged position for this track (or enrollment start)
  range  = ruleKind(cursor, params, source state)
```

Pure function; no stored schedule rows. Missed days: per-template policy — `cursor` (default: resume where you stopped; streak breaks but assignment stays constant) or `calendar` (fixed end date: remaining quantity ÷ remaining days recomputed).

### Storage (furqan_app — versioned Prisma migration)

- `UserPlan`: `id`, `user_id` (scalar), `template_key`, `params` (JSON: level, quantities, target range, start position), `start_date`, `status` (`active | paused | completed | abandoned`), timestamps.
- `PlanProgressEntry`: `id`, `user_plan_id` (FK within app DB is fine), `track_key`, `date`, `range_start`, `range_end` (page numbers as strings — wide enough for verse keys later), `completed_at`. Append-only.
- Templates: `app/constants/plans.ts` (or `app/lib/plans/templates.ts`) — typed constants, names via i18n message keys.

## Verified Test Cases

Walked through with the user via the Lavish planning artifact (session 2026-07-24; all six decisions queued explicitly):

1. **Simple daily wird** — one-track template `fixed_cycle(whole mushaf, N pages/day)`, N chosen at enrollment; juz/hizb/rub targets resolve to page counts. ✓ user confirmed (D1–D6 answers).
2. **الحصون الخمسة** — five tracks composing all five rule kinds (tilawa/fixed_cycle, hifz/cursor_advance, tahdeer/lookahead(hifz), qareeb/trailing_window(hifz), baeed/completed_cycle(hifz)). ✓ model expresses cross-track dependencies.
3. **السماع المستمر (listening wird)** — user-raised case: `fixed_cycle` + `activity: listen`; deep-links into existing recitation playback (ADR 0021); playback crossing today's range end offers check-off. ✓ user confirmed activity is per-track ("yes definitely per track").
4. **Missed day** — cursor policy: tomorrow's assignment = same range resumed, no debt pileup; calendar policy (future Ramadan khatma): quantity recomputed. ✓ D4 = per-template.
5. **Mid-plan level change** — cursor keeps position; history reads log, never retro-applies new quantities. ✓ user agreed.

Decisions from the artifact: D1 hybrid (code now, DB overlay later) · D2 derived · D3 page-canonical · D4 per-template · D5 manual + reader-aware hint · D6 multiple concurrent enrollments.

## Files to Change

Foundation implementation (order matters):

- `prisma/app/schema.prisma` — add `UserPlan`, `PlanProgressEntry` (+ `app-migrate-dev` migration).
- `app/constants/plans.ts` — template/track/rule-kind types + `daily-wird` template (husun template ships later once level quantities are sourced).
- `app/lib/plans/engine.ts` — pure assignment-derivation functions per rule kind + unit resolution (juz/hizb/rub → page ranges via `PageMetadata`/`Rub` lookups).
- `app/api/plans/...` — enrollments CRUD, today's assignments (GET), check-off (POST progress). `jsonResponse()` envelope, `extractUser`, added to auth-middleware matcher.
- `app/server/actions/` + React Query hooks — client fetching, mirroring marks.
- `messages/ar.json` / `messages/en.json` — template/track/activity strings.
- `docs/architecture/DECISIONS.md` + ADR 0028 — already in this branch.

UI surfaces (hub page, reader widget, streaks) → follow-up plan.

Unit tests (added during implementation, first unit-test infra in the repo):
- `package.json` — `vitest` devDependency + `"test": "vitest run"` script.
- `vitest.config.ts` — minimal config: `@/` path alias only; tests are colocated `*.test.ts` with explicit `vitest` imports (no globals).
- `app/lib/plans/engine.test.ts` — exhaustive coverage of `deriveAssignments` across all five rule kinds, both missed-day policies, wrap/clamp/completion edges, and a full الحصون الخمسة-shaped template snapshot. Engine only — API routes/hooks are fetch/Prisma wiring, left to future integration tests.

## Constraints

- No cross-domain FK; Quran locations as scalar page numbers (ADR 0008).
- Reader routes stay statically generated; plan data client-fetched post-hydration (React Query), like marks.
- `range_start`/`range_end` stored as strings with a `unit` discriminator, so verse-key granularity can be added without reshaping.
- Check-offs online-only v1 (mirrors marks / ADR 0014); disabled with notice offline.
- Rule kinds live in code; adding one is a reviewed change, not data.

## What NOT to Do

- Do not materialize per-day schedule rows — derivation is the load-bearing choice (ADR 0028 Option A rejected).
- Do not put templates in DB tables now (Option B rejected); the hybrid DB overlay only becomes real if user-authored plans do.
- Do not encode activity into rule kinds or per-template — it is a per-track attribute.
- Do not auto-write completions from reading/playback telemetry — shortcuts may offer check-off only (D5).
- Do not retro-apply changed quantities to history — history reads the progress log verbatim.
- Do not block the engine on الحصون الخمسة level quantities — ship `daily-wird` first; husun template lands when quantities are sourced from the book's tables.
- Do not add offline write-queueing without re-opening ADR 0014.

## Decisions Made

- D1 hybrid template storage · D2 derived assignments · D3 page-canonical · D4 per-template missed-day policy · D5 manual check-off + reader-aware shortcut · D6 multiple concurrent enrollments.
- `activity` (`read | listen | memorize | review`) is per-track (user: "yes definitely per track") — enables السماع المستمر and listen-mode تحضير.
- Plan-progress sharing (teacher/student over ADR 0012 grants) acknowledged as plausible later; nothing in this design precludes it.
- Day boundary: local-midnight (device timezone) pragmatic default for v1; Fajr-to-Fajr needs prayer-time data we don't have — revisit if requested.
- Implementation nuance: `PlanProgressEntry` is unique per `(user_plan_id, track_key, date)` — the "append-only" log appends across days, but re-checking the *same* track on the *same* day upserts the range in place rather than adding a second row. Client sends its local date string; the API stores it as a UTC-midnight `@db.Date`.
- Rule kinds with a `sourceTrack` may only reference source-free kinds (`fixed_cycle`/`cursor_advance`) — the engine resolves dependencies in two passes, not a general topological sort. Enforce this shape when authoring new templates.
