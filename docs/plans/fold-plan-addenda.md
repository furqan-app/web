---
title: Fold the 29 addendum-bearing plans into single coherent specs
type: chore
date: 2026-09-02
status: in-progress
area: workflow
issue: 510
supersedes: []
---

# Fold the 29 addendum-bearing plans into single coherent specs

**Epic:** furqan-app/web#491 · **Follows:** [`plan-lifecycle-index.md`](plan-lifecycle-index.md) ([ADR 0059](../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)) — the deferred half of #497.

## Summary

#497 added the fold-addenda-on-ship rule but did not apply it to the 29 plans in `docs/plans/` that already carry `## Addendum` sections. This task clears that backlog: each of the 29 plans is rewritten so its core sections (Summary, Approach, Decision Tree, Files to Change, Constraints, What NOT to Do, Decisions Made) state the feature's **current** truth, every `## Addendum` heading is removed, and a dated `## Revision History` list at the file bottom records each folded addendum and any supersession. Done in 8 PRs, easiest tier first, so the method and the fidelity check are proven before the deep stacks (`recitation-playback` 13, `fix-surah-banner-placement` 11, `tablet-nav-overlay` 6). PR 1 also writes the fidelity checklist into `docs/workflow/ship-task.md` so every future organic fold meets the same bar.

## Approach

### The fold, per plan

1. **Read the whole stack** — body + every addendum, newest first. The newest addendum wins; anything a later addendum revised or reverted is dead.
2. **Rewrite the core sections in place** so they describe the current implemented behaviour:
   - `## Summary`, `## Approach` / `## Root Cause`, `## Decision Tree / Algorithm`, `## Files to Change`, `## Verified Test Cases` — reconcile to the end state. Delete superseded rows/bullets outright (git history + Revision History keep them).
   - `## Constraints`, `## What NOT to Do`, `## Decisions Made` — these are the load-bearing sections. Every still-active item from **every** addendum must land here. An item is "still active" unless a later addendum explicitly supersedes it.
3. **Delete every `## Addendum N …` heading and its body.** Merge the content up per step 2; do not leave an `## Addendum` heading anywhere (the ship-rule greps for it).
4. **`## Implementation Notes (date)` sub-sections** inside addenda — fold their still-true substance into the reconstructed sections; otherwise drop them (their record is the Revision History line + git).
5. **Add `## Revision History`** at the file bottom — one line per former addendum (see format below).
6. **Re-derive frontmatter** `status` / `date` only if the stack shows the feature is not actually done (all 29 are currently `implemented`; expected to stay so). Leave `area` / `issue` / `adr` unless an addendum added an ADR not yet listed.
7. **Regenerate** `docs/plans/INDEX.md` (`.claude/skills/scripts/gen-plans-index.sh`) and stage it.

### `## Revision History` format

```markdown
## Revision History

- 2026-07-05 — folded Addendum 5 (review fixes: cron claim-race guard, render-context locale fallback).
- 2026-07-30 — folded Addendum 10 (stop recitation on leaving the reader).
- 2026-09-01 — folded Addendum 13 (global playback + detachable follow); **supersedes Addendum 10** — playback is app-wide again, the hard-stop contract is gone (ADR 0056).
```

One line per former addendum, dated with the addendum's own date. State supersessions explicitly and in bold so a reader can see what was reverted without diffing git.

### `docs/workflow/ship-task.md` — expand the fold rule (PR 1)

The step-3 fold bullet currently says "merge the addendum's content into the body sections it revises". Extend it with the fidelity bar:

> When folding, every still-active `Constraints`, `What NOT to Do`, and `Decisions Made` item from every addendum must survive into the corresponding section of the folded plan. An item is superseded only where a later addendum says so explicitly — record that in `## Revision History`, in bold, and remove it from the active sections. Nothing else may be dropped.

### Batches (one PR each, `Refs #510`)

| PR | Plans | Addenda | Notes |
|---|---|---|---|
| 1 | `mobile-nav-ux`, `word-audio-playback`, `sidebar-surah-indicator`, `home-nav-search` | 1 each | Also updates `ship-task.md` with the fidelity bar. Worked examples for the method. |
| 2 | `arrow-controls-desktop`, `copy-share-verses`, `feature-pwa-fullscreen-focus-mode`, `fix-page-turn-blank-slow-network`, `fix-safha-swipe-flicker`, `listening-wird-inline-playback`, `reader-line-rhythm`, `design-migration/1.1-rewrite-design-principles` | 1 each | Remaining single-addendum plans. |
| 3 | `home-page-design-fixes`, `pwa-app-stickiness`, `recitation-bar-vertical-rail`, `verse-word-comments`, `design-migration/4.3-screens-search-settings` | 2 each | |
| 4 | `close-overlays-on-back-swipe`, `release-branch-workflow`, `design-migration/5.1-page-face-and-reader`, `desktop-navbar-font-bg`, `my-marks-page`, `shared-mushaf-access` | 3–4 each | |
| 5 | `fix-tajweed-font-size`, `tajweed-mushaf-mode`, `visual-e2e-testing` | 5 each | First deep-stack PR — later addenda begin superseding earlier ones. |
| 6 | `tablet-nav-overlay` | 6 | Solo. |
| 7 | `fix-surah-banner-placement` | 11 | Solo. |
| 8 | `recitation-playback` | 13 | Solo. Addendum 12 carries an "Explicit supersessions" list; Addendum 13 supersedes Addendum 10. Reconstruct from those, do not merge blindly. |

`#510` stays open until PR 8 merges. No child issues — the PRs are the tracking unit.

## Decision Tree / Algorithm

### Classifying each addendum while folding

| Addendum kind | Tell | Fold action |
|---|---|---|
| Additive enhancement | adds a feature/polish, contradicts nothing (e.g. `mobile-nav-ux` Addendum 1 — surah-pill restyle) | merge its Files-to-Change / Decision-Tree content into the matching body section; Revision History line |
| Corrective (bug fix / review fix) | "review findings", "fix", "Root Cause" (e.g. `shared-mushaf-access` Addendum 5–7) | apply the correction to the body; move any new Constraint / What-NOT bullet into those sections; Revision History line |
| Superseding | later addendum says "supersedes", "no longer applies", "revert", "removed" (e.g. `recitation-playback` Addendum 13 vs 10) | the later decision replaces the earlier text in place; delete the superseded text; **bold** supersession note in Revision History |
| Scope-note / follow-up | "not this task", "known follow-ups" (e.g. `recitation-playback` Addendum 13 tail) | collect into a `## Known Follow-ups` section if any remain open; else drop |

### Fidelity check (run before staging each plan)

1. List every bullet under `Constraints`, `What NOT to Do`, `Decisions Made` across the pre-fold body **and every addendum**.
2. Remove the ones a later addendum explicitly supersedes (those become Revision History lines).
3. The remaining set must equal the folded plan's combined `Constraints` + `What NOT to Do` + `Decisions Made`. Missing item → not done.

## Verified Test Cases

**`mobile-nav-ux.md` (1 addendum, additive).** Addendum 1 restyles the mobile surah toggle into a `rounded-full` calligraphic pill. Fold: the pill markup/classes merge into `## Files to Change → app/components/nav/Nav.tsx` (replacing the older "Sidebar trigger Button" description with the pill spec); `font-surahnames` + numeral-prefix note joins `## Edge Cases and Decisions`. Delete `## Addendum 1`. Revision History: `2026-08-26 — folded Addendum 1 (mobile surah toggle → calligraphic pill).` Frontmatter unchanged. No Constraints/What-NOT items in the addendum, so the fidelity check is trivially satisfied.

**`recitation-playback.md` (13 addenda, deep).** Addendum 10 added a "hard stop when leaving the reader" contract with a matching What-NOT ("Do not call `togglePlayPause()` instead of `stop()`"). Addendum 13 reverts it — playback is app-wide, `RecitationReturnStrip` replaces the stop. Fold: the base Decision Tree row for "leaving the reader" is rewritten to the Addendum-13 behaviour; Addendum 10's What-NOT bullet is **removed** from `## What NOT to Do`; Revision History carries `2026-07-30 — folded Addendum 10 (stop on leaving reader).` then `2026-09-01 — folded Addendum 13 (global playback + detachable follow); **supersedes Addendum 10** — hard-stop contract removed (ADR 0056).` Addendum 12's "Explicit supersessions" list is applied the same way. `## Known Follow-ups` keeps whatever Addendum 13's tail still lists as open.

**`shared-mushaf-access.md` (4 addenda, corrective).** Addenda 5–7 are review fixes + two 404 bugs (logout on a grant page, revoked-access unstyled 404). Fold: each fix folds into `## Files to Change` / `## Constraints (discovered)`; the "revoked access → styled redirect to `/{locale}/mushaf?removed=1`" behaviour (later hardened by #469's e2e work) is stated once in the Decision Tree. Addendum 1's "single always-visible navbar entry + ViewingChip" merges into `## Design → Navbar link`. Revision History gets 4 lines. Fidelity check: the "never disclose owner identity on the removed banner" decision (ADR 0012) must appear in `## What NOT to do`.

## Files to Change

- `docs/plans/<the 29 plans>.md` — fold per the Approach; delete `## Addendum` headings; add `## Revision History`
- `docs/plans/INDEX.md` — regenerated each PR (titles unchanged, so likely no diff; regenerate anyway)
- `docs/workflow/ship-task.md` — PR 1 only: add the fidelity-bar paragraph to the step-3 fold bullet
- `.claude/skills/ship-fq-task/SKILL.md` — PR 1 only: mirror the one-line pointer if the wording changed

## Constraints

- **Fidelity bar is absolute.** No `Constraints` / `What NOT to Do` / `Decisions Made` item is lost. Superseded items move to `## Revision History` (bold), never silently vanish.
- **One deep stack (5+ addenda) per PR** — PRs 6/7/8 are solo. PR 5 is the only multi-plan deep PR (3× 5-addendum) and is the smaller-risk end of "deep".
- **Body prose only where folding requires it.** This is not a licence to rewrite plans wholesale — reconcile to current truth, keep the plan's voice, don't re-argue settled decisions.
- **Do not touch a plan with an open feature branch editing it.** Before folding a plan in a batch, `git branch -r --contains` / check open PRs for edits to that file; if one exists, move the plan to a later batch and note it.
- **Regenerate `INDEX.md` every PR**, even when no diff results — proves the frontmatter still parses.
- Frontmatter `status` stays `implemented` unless the stack proves otherwise; never downgrade a shipped feature's plan to `ready-to-implement` just because it's being folded.
- `## Revision History` dates are the **addendum's own date**, not the fold date.

## What NOT to Do

- Do not merge addenda blindly in date order — later addenda supersede earlier ones (`recitation-playback` 13↔10, Addendum 12's supersession list). Read the whole stack first, establish current truth, then write.
- Do not fold all 29 in one PR, or bundle a deep stack (5+) with unrelated plans beyond PR 5's grouping — unreviewable, and a dropped decision hides in the noise (the ADR 0057 failure mode this whole split exists to avoid).
- Do not keep any `## Addendum` heading, or invent a `## Addendum`-like heading the ship-rule grep would miss but a reader would still read as pending.
- Do not delete a superseded decision without a `## Revision History` line explaining what replaced it.
- Do not start the archive sweep (moving `implemented` plans to `archive/`) — still deferred, out of scope here.
- Do not convert this plan into an addendum on `plan-lifecycle-index.md` — it is a separate programme (decided during planning).
- Do not create child issues per PR — `#510` is the umbrella, PRs `Refs #510`.

## Decisions Made

- **New plan file, not an addendum to `plan-lifecycle-index.md`** — this is an 8-PR reconstruction programme with its own method and fidelity bar, not a near-duplicate of the frontmatter work (precedent: `design-migration/` is its own plan).
- **Full reconstruction for all 29, including the 6 deep stacks** — not a verbatim "history appendix" half-measure and not leaving the monsters unfolded. Cleanest result: every plan is one coherent current spec. Risk controlled by one-deep-stack-per-PR + the mandatory fidelity check + `## Revision History` + git as backstop.
- **Fidelity bar written into `ship-task.md` in PR 1** — every future organic fold meets the same standard, not just this backlog pass. No new ADR (workflow convention; ADR 0059 already covers "why fold").
- **8 PRs, easiest tier first** — method and checklist proven on trivial single-addendum plans before `recitation-playback`.
- **`## Revision History` uses the addendum's own date and bolds supersessions** — a reader sees what was reverted without diffing git.

## Revision History

None yet — this plan is folded on its own ship per the `ship-task.md` rule.
