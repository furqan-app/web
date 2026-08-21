# ADR 0047: Adopt the reader-lab design language app-wide, canon first

**Date:** 2026-08-21
**Status:** Accepted

## Context

The Nocturnal Reader Lab (`docs/plans/reader-lab-nocturnal-desktop.md`) was built as a sandbox to generate a new visual direction, and its language was approved. Migrating it is not a styling pass: the language contradicts `docs/design/design-principles.md`, which is the canonical design doc and generates root `DESIGN.md`, which in turn feeds `/impeccable` — wired into plan → implement → review by [ADR 0041](./0041-wire-impeccable-into-fq-workflow.md). The lab also derived every atmospheric move against dark's `(7,15,23)` background, and covers neither light, gold, small screens, nor live control states.

## Options Considered

**Option A — Migrate code first, update the design docs afterwards**
Start with tokens and components; rewrite `design-principles.md` once the new look has settled.

**Option B — Rewrite the canon first, then migrate code**
Rewrite `design-principles.md` and regenerate `DESIGN.md` before any component or token work, so the review gate is aligned with the target from the first commit.

**Option C — Ship the new language as a fourth theme**
Leave the three existing themes untouched and let users opt in.

## Decision

**Option B.** The canon is rewritten before code, and the migration is a phased programme rather than a single change.

**1. The one-accent rule is superseded.** `design-principles.md`'s "Never reach for a second accent colour; one is enough" is replaced by a **two-accent grammar**: gold carries identity, metadata and ornament; the primary accent carries live state only. This is what makes an interface legible at a glance — in the lab it is why the settings gear reads as live while three inert icons beside it do not. Single-accent forced state and identity to share one signal.

**2. The page face is in scope, and may be lit.** ADR 0031's "the Mushaf page is deliberately NOT the brightest surface" and ADR 0032's "Do not light the page face" are superseded **by this ADR as the explicit decision that rule required**. The lab's lamp is precisely a page-lighting move, and the approved composition depends on it.

**3. Aesthetic decisions supersede freely; measurements of the medium carry forward.** These are different categories and must not be conflated:

| Carry forward — not taste | Why |
|---|---|
| Dark `--background` is `(7,15,23)`, ~7 points from black | A shadow declared there produces **no pixels**. Ignoring it yields a design that silently does not render, which is why the lab carried depth with a wide layered cast and a lit surround. |
| Depth changes verified by **sampling rendered pixels** | A shadow can be mathematically present and visually absent. This has happened repeatedly (ADR 0032). |
| WCAG AA contrast pairs | Accessibility floor, not a style preference. |
| Mushaf no-overlap, line rhythm, font-size contract | A word overlapping another word is a defect at any aesthetic. |
| Depth **rules** shared across themes; only **values** differ | Theme-scoping a depth rule produced six copies of one idea and two regressions (ADR 0032). |

**4. During the migration, visual snapshots are a diff-review artifact, not a pass/fail gate.** Every baseline fails by design once the page face changes, so `e2e/tests/visual.spec.ts` snapshots are regenerated per phase and read as before/after evidence. Mushaf correctness therefore moves to an **explicit per-phase verification step** — pixel sampling plus a hard-page spot-check — rather than being assumed covered by snapshots.

**5. All three themes migrate.** Not a fourth theme (Option C rejected: it means maintaining four token sets while the existing three never improve), and not dark-only (which would leave the app carrying two visual languages between phases).

## Consequences

- `design-principles.md` and root `DESIGN.md` must be rewritten and regenerated **before** Phase 2 opens, or the `/impeccable` gate reports every new-language change as a finding and pushes work back toward the old language.
- Light and gold need the language **re-derived**, not translated — every atmospheric value in the lab is a function of a near-black desk. This happens in the sandbox before production files are touched.
- Gold currently has **zero** visual regression coverage (`visual.spec.ts` covers light and dark only), and tablet and four routes have none either. Accepted as a known risk; baselines are regenerated wholesale rather than extended first.
- The lab remains a sandbox and still never ships (`/ar/reader-lab` stays unlinked). It gains light, gold and small-screen variants purely as a derivation surface.
