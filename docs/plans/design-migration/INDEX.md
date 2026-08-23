# Design Migration — reader-lab language, app-wide

**Type:** feature
**Date:** 2026-08-21
**Status:** complete — all phases landed. Remaining before merge: regenerate `DESIGN.md` via `/impeccable document` (and delete its banner), and regenerate visual baselines via the `workflow_dispatch` CI job.
**Issue:** https://github.com/furqan-app/web/issues/360
**ADR:** [0047](../../architecture/adr/0047-adopt-reader-lab-design-language.md)

## Summary

Adopt the visual language proven in the Nocturnal Reader Lab across every screen, all three themes (light, gold, dark) and the mushaf page face. This is an umbrella plan: each subtask below is its own plan file, worked **step by step in order**, all on the single branch `feature/360-design-migration`, shipping as **one PR** against issue #360.

## Working model

- **One branch, one PR.** Subtasks are not separately branched or separately merged.
- **One commit per subtask**, named for it (`0.1 lab light+gold variants`, …). This is the only thing that keeps a migration-sized PR reviewable and a bad subtask revertable, so do not squash subtasks together or interleave them.
- A subtask is finished when its own `Verified Test Cases` pass — not when the PR is ready.
- The app is expected to be visually mid-migration between subtasks. That is accepted here; coherence is a property of the finished PR, not of each commit.

## Approach

The lab's value is a set of **rules**, not fourteen hex values. Migrating screen-by-screen would make every screen re-derive those rules and leave light and gold as an afterthought. So the order is: derive the language completely (Phase 0) → rewrite the canon so the review gate agrees with it (Phase 1) → express it as tokens every screen inherits (Phase 2) → reshape the primitives most screens are built from (Phase 3) → then screens (Phase 4) → then the page face (Phase 5).

The rules the lab established and this migration carries:

- Folio-centred composition; the content object owns the optical centre, surplus becomes symmetric margin.
- Atmosphere over flat fill — a light source and a vignette, not a uniform background.
- Depth from a wide layered cast and a lit surround, never a tight drop shadow.
- **Two accents:** gold = identity/metadata/ornament, primary = live state only.
- Inert controls grouped in a dimmed well; the single live control sits outside it, brighter.
- Grouped sections with hairline rows, not stacks of identical cards.
- Drawn ornament (hairline tapering to a diamond), not glyph characters.

## Phase 0 outcome

Phase 0 is complete. The language is derived for all three themes, the mushaf page face, and all three device classes, and is written up in [`docs/design/design-language.md`](../../design/design-language.md) — the artifact every later phase implements against, and the input to 1.1. Findings are recorded in ADR 0047's three addenda.

Three things Phase 0 changed for later phases:

- **5.1 gains scope.** Production's `768–1023px` inset band is not a device class and the lab overrides it; production has to follow (5.1 part (c)).
- **2.1 has its token families named.** Phase 0 established chrome/well/scrim, medallion, lamp carrier + extent, page-pool and cast tokens as distinct families, and proved that every theme block must declare each family whole — an omitted token silently inherits the base block's value.
- **The accent test in the spec is what 3.x and 4.x apply.** It is stated once, in `design-language.md` §5, rather than re-derived per screen.

## Prerequisites

**1. The lab exists only as uncommitted changes in the main working tree.** ~~`codex/reader-lab-dark-concept` has no `reader-lab` directory.~~ **Resolved** — the lab is committed on `feature/360-design-migration`.

**2. Four in-flight issues are superseded by this one.** #340 (Restructure Navigation), #346 (Collapsible audio sidebar), #351 (Desktop reader layout redesign), #352 (Thinner settings sidebar) all redesign surfaces this migration covers, under the language being replaced. Their **intent** may be absorbed into 3.2 and 4.3 where it still makes sense; their **visual decisions do not constrain the new design** — the approved lab language wins every conflict, and no subtask should preserve an old-language treatment because one of these issues introduced it.

The uncommitted chrome edits in the main working tree (`Nav.tsx`, `UserMenu.tsx`, `NotificationBell.tsx`, `SearchBar.tsx`, `RecitationPlayerBar.tsx`, `marks/page.tsx`) are #351/#352 work-in-progress, not stray edits. Because those issues are superseded, the default disposition is **revert, not reconcile** — see 3.2.

## Phases

| # | Subtask | File | Depends on |
|---|---|---|---|
| 0.1 ✅ | Light + gold lab variants | [`0.1-lab-light-gold-variants.md`](0.1-lab-light-gold-variants.md) | prerequisite above |
| 0.2 ✅ | Page face in the lab | [`0.2-lab-page-face.md`](0.2-lab-page-face.md) | 0.1 |
| 0.3 ✅ | Small-screen lab composition | [`0.3-lab-small-screen.md`](0.3-lab-small-screen.md) | 0.1 |
| 0.4 ✅ | Write the design-language spec | [`0.4-design-language-spec.md`](0.4-design-language-spec.md) → [`design-language.md`](../../design/design-language.md) | 0.1, 0.2, 0.3 |
| 1.1 ✅ | Rewrite the canon | [`1.1-rewrite-design-principles.md`](1.1-rewrite-design-principles.md) | 0.4 |
| 2.1 ✅ | Semantic tokens | [`2.1-semantic-tokens.md`](2.1-semantic-tokens.md) | 1.1 |
| 3.1 ✅ | UI primitives | [`3.1-ui-primitives.md`](3.1-ui-primitives.md) | 2.1 |
| 3.2 ✅ | Shared chrome | [`3.2-shared-chrome.md`](3.2-shared-chrome.md) | 3.1 |
| 4.1 ✅ | Marks + plans | [`4.1-screens-marks-plans.md`](4.1-screens-marks-plans.md) | 3.2 |
| 4.2 ✅ | Home | [`4.2-screens-home.md`](4.2-screens-home.md) | 4.1 |
| 4.3 ✅ | Search + settings | [`4.3-screens-search-settings.md`](4.3-screens-search-settings.md) | 4.1 |
| 4.4 ✅ | Mushaf hub + shared grant | [`4.4-screens-mushaf-hub.md`](4.4-screens-mushaf-hub.md) | 4.1 |
| 5.1 ✅ | Page face and reader | [`5.1-page-face-and-reader.md`](5.1-page-face-and-reader.md) | 4.x complete |

Phase 4's four subtasks are independent of each other once 4.1 proves the token layer end-to-end; they can run in parallel.

## Decision Tree / Algorithm

Applied by every subtask when it meets an existing decision:

| Condition | Action |
|---|---|
| Existing decision is **aesthetic** (a look, a size, a glyph, a colour role) | Supersede it. Record the supersede in the subtask's `Decisions Made`, and in DECISIONS.md/an ADR if it was recorded there. |
| Existing decision is a **measurement of the medium** (dark's `(7,15,23)` headroom, pixel-sampled verification, WCAG pairs, mushaf no-overlap / rhythm / font-size contract) | Carry it forward unchanged. It is what makes the new design actually render and stay correct. |
| Depth or ambient-light change | Verify by **sampling rendered pixels** on a running dev server, in all three themes. Never by reading the declaration. |
| Rule would need a per-theme copy | Do not scope by theme. Add or retune that theme's **token values** instead (ADR 0032). |
| Snapshot diff appears | Read as evidence. It is not a gate during this programme. |
| Baselines need regenerating | **Only** via the `workflow_dispatch` CI job (`playwright test --update-snapshots` inside CI), targeting `feature/360-design-migration`. Never commit locally-generated PNGs — local vs CI font rendering and anti-aliasing drift. The job opens its own PR into the target branch. |
| Tablet-band pixels need checking | Use `scripts/dev/reader-shot.mjs` — the MCP browser clamps at 1600px and cannot reach the band. |

## Verified Test Cases

Agreed in the planning session:

| Case | Required outcome |
|---|---|
| A light-theme screen adopts the lab's lamp/vignette | Re-derived for a light desk in Phase 0.1, not ported by inverting dark's values. |
| A dark-theme surface needs to read as raised | Lighter face plus lifted surround, never a drop shadow — it would produce no pixels. |
| `/impeccable critique` runs on a migrated component | Returns no finding that contradicts the new language, because Phase 1.1 rewrote the canon it reads. |
| Gold theme regresses somewhere | Accepted risk: gold has no baseline coverage today. Caught by per-phase manual verification, not by snapshots. |
| A subtask wants to break a mushaf layout invariant | Not permitted. Aesthetic decisions supersede; correctness invariants do not. |
| A subtask turns out wrong | Its single commit is reverted without disturbing the others. This is why subtasks are never squashed together. |
| An in-flight issue's design conflicts with the language | The language wins. #340/#346/#351/#352 are superseded, not authorities. |

## Files to Change

Per subtask — see each plan. Programme-level totals for scope awareness: 8 routes under `app/[locale]/`, 81 components in `app/components/`, 12 primitives in `components/ui/`, `app/globals.css` (2186 lines), 4 theme blocks (`.theme-light`, `.theme-gold`, `.theme-dark`, `.theme-dark.dark`) at 51–66 tokens each, `docs/design/design-principles.md`, root `DESIGN.md`, `docs/standards/styling.md`, `e2e/tests/visual.spec.ts` + snapshots.

## Constraints

- Phase 1.1 must land before Phase 2.1. The `/impeccable` gate reads `DESIGN.md`; migrating code against a stale canon means every subsequent task is reviewed against the language being replaced.
- Light and gold are **re-derived**, never translated from dark by inversion.
- One branch, one PR, one commit per subtask. Never squash subtasks together.
- Baselines are regenerated only by the `workflow_dispatch` CI job, never by committing local PNGs.
- The reader lab stays unlinked and never ships.
- Depth rules stay shared across themes; only values differ.
- Mushaf correctness gets an explicit verification step in every phase that touches the reader, since snapshots are not gating.

## What NOT to Do

- Do not start with screens. Screen-first makes every screen re-derive the same rules and strands light and gold at the end.
- Do not promote the lab's `--rl-*` tokens into `:root`. That creates a fourth parallel token system alongside the three themes; the language belongs in the existing theme blocks under semantic names.
- Do not migrate code before the canon is rewritten.
- Do not add a drop shadow to a dark surface expecting lift.
- Do not scope a depth rule by theme to serve one theme.
- Do not treat a passing snapshot run as coverage during this programme.
- Do not commit locally-generated baseline PNGs.
- Do not squash subtask commits together, or the PR becomes unreviewable and no subtask can be reverted on its own.
- Do not preserve an old-language treatment because #340/#346/#351/#352 introduced it. They are superseded.
- Do not ship the lab route, link it from navigation, or let a Phase 0 subtask write user preferences.
- Do not break a mushaf layout invariant in service of the new look.

## Decisions Made

- All three themes migrate; gold survives and gets a full new-language token set. Not a fourth theme, not dark-only.
- The mushaf page face is in scope, and may be lit — ADR 0047 is the explicit decision ADR 0032 required.
- The two-accent grammar supersedes `design-principles.md`'s one-accent rule.
- Light, gold and small-screen are derived in the sandbox before any production file is touched.
- Visual baselines are regenerated wholesale and read as evidence, not enforced as a gate. Risk accepted by the user.
- Ships as one PR against #360, worked subtask by subtask on one branch. The reviewability cost of a migration-sized PR is paid for with disciplined per-subtask commits.
- #340, #346, #351 and #352 are superseded by this migration. Their intent may be absorbed; their visual decisions do not constrain the new design.
- The `globals.css` restructure question (2186 lines, heavy per-theme conditionals) is deferred to subtask 2.1, which must decide and record it rather than presume.
