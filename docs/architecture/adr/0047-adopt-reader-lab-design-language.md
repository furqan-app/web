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

## Addendum — Phase 0.1 findings (2026-08-21)

Deriving the light and gold variants in the lab produced three results the rest of the migration depends on. All are pixel-sampled at 1920×1080 on `/ar/reader-lab/3`.

**1. The lamp's carrier channel is a property of the medium, not a constant.** "A warm pool of light over the folio" is one rule, but the channel that can express it differs per theme, and the choice follows from measuring the headroom that theme actually has:

| Theme | Desk L | Headroom | Lamp is carried by | Measured |
|---|---|---|---|---|
| dark | 5 | ~95 up | lightness (hot, tight core) | +1 L — invisible, as ADR 0032 predicts; the rim does the work (+19 L) |
| light | 89 | ~10 up, but the desk is **cool** | **temperature** | +28 R−B centre vs edge, ~0 L |
| gold | 88 | ~12 up, desk already warm | lightness | +15 L centre vs edge |

The first light and gold values were built as tight pools like dark's and measured **exactly zero** — the pool's centre sits under the folio, so on a wide desk the only visible pixels fall past the falloff. The pool's *extent* is therefore a per-theme token too, not a shared constant.

**2. Gold-as-identity survives on parchment — but as bronze, not as metal.** This was the language's most likely failure. On `.theme-gold` the identity accent reaches 6.30:1 on chrome and 6.42:1 on the group surface, and sits 134° from the live accent. The mechanism changes: on dark, gold separates from its surround by hue *and* brightness; on parchment it can only separate by **lightness**, so "gold" there means a deep bronze roughly 50 points below the surface. A bright gold on a gold desk does collapse — the failure predicted was real, and the fix is the value, not the rule.

**3. The gold theme's live accent is emerald, not its own `--primary`.** `.theme-gold`'s `--primary` is warm gold (`41 57% 43%`). Keeping it would make identity and live state the same colour, which is the one thing the two-accent grammar cannot survive. The live accent is therefore emerald in all three themes; only identity is theme-warm.

A corollary: the identity medallion keeps a dark face in every theme. It is a struck seal — a material, not a tint — and inverting it on light would both erase that reading and leave the white logo mark invisible.
