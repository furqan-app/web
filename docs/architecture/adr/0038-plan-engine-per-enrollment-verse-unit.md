# ADR 0038: Plan engine — per-enrollment verse unit, no global page→verse cutover

**Date:** 2026-08-02
**Status:** Accepted
**Supersedes (partially):** ADR 0030's "Progress is page-canonical" decision line and the matching DECISIONS.md constraint.

## Context

ADR 0030 shipped the plan engine as page-canonical: every track's `unit` is `"page"`, ranges are mushaf page numbers 1–604, and `PlanProgressEntry.unit` exists as a string column defaulting to `"page"` specifically to allow verse-key granularity later "without reshaping" (foundation plan, `docs/plans/awrad-learning-plans.md`). That widening is now needed: users want to track a wird in verses (e.g. "3 ayah/day") or fractional pages (e.g. "half a page/day").

Two shapes were considered for the widening itself.

## Options Considered

**Option A — Global verse-ordinal canonical**
Convert the whole engine to operate in global verse ordinals (1–6236) everywhere; pages become a derived display value. Requires a one-time data migration of every existing `PlanProgressEntry` row (page range → verse-ordinal range) so a track's history doesn't mix units mid-cursor. Rejected: the migration is the riskiest, least necessary part of the change — nothing about the feature ask requires touching data that already works.

**Option B — Per-enrollment unit, dual native math (chosen)**
`PlanProgressEntry.unit` (already `"page"` | will add `"verse"`) is fixed per enrollment at creation time, not migrated. The engine branches on a track's actual unit and does native math in it: page-unit tracks run byte-for-byte the same page arithmetic as today; verse-unit tracks run the same rule-kind algorithms over verse ordinals instead. No enrollment ever mixes units in one track's history, so no cursor-continuity risk, and existing enrollments/data are untouched.

## Decision

Option B. Concretely:

- `PlanUnit` widens to `"page" | "verse"`. Unit is a single **enrollment-wide** choice, not a template-fixed or per-track property — `UserPlanParams.unit` (defaulting to `"page"` when absent) drives every track's range math for that enrollment, and every `PlanProgressEntry` row it produces is written with the matching `unit` column value. The same template (`daily-wird`, `listening-wird`, `husun`) now supports either unit per enrollment.
- New pure module `app/lib/plans/verse-index.ts` provides verse-ordinal ↔ page-number resolution, built from the **already-committed static Quran assets** (`public/quran/chapters.json` for cumulative verse-ordinal math, `public/quran/verse-pages/2.json` — mushaf 2, `DEFAULT_MUSHAF_ID` — for verse→page). No new generator script, no DB calls: same module-scope-cached-file-read convention as `app/hooks/get-surahs.ts`.
- Conversion between units happens only at the few points where it's structurally unavoidable, never as a bulk data pass:
  1. `fixed_cycle`'s "whole mushaf" bound resolves to `1–604` (page-unit enrollment) or `1–6236` (verse-unit enrollment).
  2. `cursor_advance`'s juz-picked target range is resolved to pages via the existing `getJuzPageRange`, then converted to a verse-ordinal range at enroll/edit time if the enrollment is verse-unit.
  3. A `{ unit: "pages"; amount }` fractional quantity override (e.g. "0.5") is recomputed live, per day, from the verse count of whatever page the day's cursor starts on — this is inherent to the fractional-page feature itself, not an artifact of the unit design.
  4. husun's page-based rule constants (`qareeb.windowSize`, `baeed.excludeTrailingWindow`, `tilawa`/`hifz`/`baeed` defaults) get verse-equivalent counterparts for verse-unit enrollments, using the same "documented best-effort, editable per-enrollment" framing ADR 0030 already established for husun's page defaults.
- No migration of existing `PlanProgressEntry` rows. They keep `unit: "page"` and keep working exactly as before.

## Consequences

- **+** Zero migration risk; existing enrollments and their history are provably unaffected — the change is additive, not a rewrite.
- **+** Page-unit code paths are untouched, so existing engine tests keep passing without modification; new tests only need to cover the new verse-unit branches.
- **+** Static-file-only verse resolution keeps the engine's zero-DB-calls purity (ADR 0030's derive-at-read-time model) intact.
- **-** The engine now has two parallel math paths (page and verse) per rule kind instead of one — slightly more branching in `engine.ts`, accepted as the cost of avoiding migration risk.
- **-** A track's unit is fixed for the life of its enrollment (no switching mid-plan); changing units means starting a new enrollment. Acceptable — quantities are already enrollment-scoped, not retroactive (ADR 0030).
- **-** husun's verse-equivalent rule constants are a second layer of unsourced approximation (page defaults were already unsourced) — flagged, not resolved, same as the original husun sign-off.
