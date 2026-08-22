# ADR 0038: Plan engine — per-track verse unit, no global page→verse cutover

**Date:** 2026-08-02 (widened 2026-08-19: per-track, not enrollment-wide)
**Status:** Accepted
**Supersedes (partially):** ADR 0030's "Progress is page-canonical" decision line and the matching DECISIONS.md constraint.

## Context

ADR 0030 shipped the plan engine as page-canonical: every track's `unit` is `"page"`, ranges are mushaf page numbers 1–604, and `PlanProgressEntry.unit` exists as a string column defaulting to `"page"` specifically to allow verse-key granularity later "without reshaping" (foundation plan, `docs/plans/awrad-learning-plans.md`). That widening is now needed: users want to track a wird in verses (e.g. "3 ayah/day") or fractional pages (e.g. "half a page/day").

Two shapes were considered for the widening itself.

## Options Considered

**Option A — Global verse-ordinal canonical**
Convert the whole engine to operate in global verse ordinals (1–6236) everywhere; pages become a derived display value. Requires a one-time data migration of every existing `PlanProgressEntry` row (page range → verse-ordinal range) so a track's history doesn't mix units mid-cursor. Rejected: the migration is the riskiest, least necessary part of the change — nothing about the feature ask requires touching data that already works.

**Option B — Per-track unit, dual native math (chosen, widened 2026-08-19 from an initial enrollment-wide cut)**
`PlanProgressEntry.unit` (already `"page"` | will add `"verse"`) is fixed per **track** at creation time, not migrated. The engine branches on a track's actual unit and does native math in it: page-unit tracks run byte-for-byte the same page arithmetic as today; verse-unit tracks run the same rule-kind algorithms over verse ordinals instead. No track ever mixes units in its own history, so no cursor-continuity risk, and existing enrollments/data are untouched.

## Decision

Option B. Concretely:

- `PlanUnit` widens to `"page" | "verse"`. Unit is chosen **per independent track** — a `fixed_cycle` or `cursor_advance` track — not enrollment-wide: `UserPlanParams.trackUnits` (a `Record<trackKey, PlanUnit>`, defaulting to `"page"` for any track absent from it) drives that track's own range math, and every `PlanProgressEntry` row it produces is written with the matching `unit` column value. A **dependent** track (`trailing_window`/`completed_cycle`/`lookahead`) never gets its own entry in `trackUnits` — its range math slices its `sourceTrack`'s own logged numbers directly (`source.minStart`/`source.lastEnd`), so it always inherits that source's resolved unit (`resolveTrackUnit`); it structurally cannot disagree with the numbers it's reading. The same template (`daily-wird`, `listening-wird`, `husun`) now supports any independent track choosing its own unit — e.g. husun's `tilawa` in pages while `hifz` (and its dependents `tahdeer`/`qareeb`/`baeed`) run in verses, in one enrollment.
  - **Widening note (2026-08-19):** the original shipped cut (PR 195) made unit a single enrollment-wide `UserPlanParams.unit` field, on the reasoning that no verified test case required disagreement between tracks. That was revisited before the PR merged (no production enrollments existed yet, so no migration was needed) once "max flexibility" surfaced husun's real use case: a user wanting a verse-precision hifz pace without forcing tilawa's reading pace into verses too. `params.unit` was replaced outright by `params.trackUnits` — see the plan doc's "Storage shape" decision for why replacement (not an enrollment-default-plus-override field) was chosen.
- New pure module `app/lib/plans/verse-index.ts` provides verse-ordinal ↔ page-number resolution, built from the **already-committed static Quran assets** (`public/quran/chapters.json` for cumulative verse-ordinal math, `public/quran/verse-pages/2.json` — mushaf 2, `DEFAULT_MUSHAF_ID` — for verse→page). No new generator script, no DB calls: same module-scope-cached-file-read convention as `app/hooks/get-surahs.ts`.
- Conversion between units happens only at the few points where it's structurally unavoidable, never as a bulk data pass:
  1. `fixed_cycle`'s "whole mushaf" bound resolves to `1–604` (page-unit track) or `1–6236` (verse-unit track).
  2. `cursor_advance`'s juz-picked target range is resolved to pages via the existing `getJuzPageRange`, then converted to a verse-ordinal range at enroll/edit time if that track (only `hifz`, today) is verse-unit.
  3. A `{ unit: "pages"; amount }` fractional quantity override (e.g. "0.5") is recomputed live, per day, from the verse count of whatever page the day's cursor starts on — this is inherent to the fractional-page feature itself, not an artifact of the unit design. Reserved for the three pace tracks (`reading`/`listening`/`tilawa`/`hifz`/`baeed`); `tahdeer`'s repetitions and `qareeb`'s windowSize are plain-integer-only overrides even on a verse-unit `hifz`.
  4. husun's page-based rule constants (`qareeb.windowSize`, `baeed.excludeTrailingWindow`, `tilawa`/`hifz`/`baeed` defaults) get verse-equivalent counterparts when the relevant track resolves to verse-unit, using the same "documented best-effort, editable per-enrollment" framing ADR 0030 already established for husun's page defaults.
- No migration of existing `PlanProgressEntry` rows. They keep `unit: "page"` and keep working exactly as before.

## Consequences

- **+** Zero migration risk; existing enrollments and their history are provably unaffected — the change is additive, not a rewrite.
- **+** Page-unit code paths are untouched, so existing engine tests keep passing without modification; new tests only need to cover the new verse-unit branches.
- **+** Static-file-only verse resolution keeps the engine's zero-DB-calls purity (ADR 0030's derive-at-read-time model) intact.
- **+** Per-track (not enrollment-wide) unit gives husun real mixed-granularity flexibility — verse-precision memorization alongside page-paced reading — without any extra unit choice for the review/lookahead tracks, since they're structurally locked to their source's unit.
- **-** The engine now has two parallel math paths (page and verse) per rule kind instead of one — slightly more branching in `engine.ts`, accepted as the cost of avoiding migration risk.
- **-** A track's unit is fixed for the life of its enrollment (no switching mid-plan); changing units means starting a new enrollment. Acceptable — quantities are already enrollment-scoped, not retroactive (ADR 0030).
- **-** husun's verse-equivalent rule constants are a second layer of unsourced approximation (page defaults were already unsourced) — flagged, not resolved, same as the original husun sign-off.
