---
title: Plan-archive sweep + trim plan-reading in workflow docs
type: chore
date: 2026-09-03
status: implemented
area: workflow
issue: 519
adr: [0059]
---

# Plan-archive sweep + trim plan-reading in workflow docs

## Summary

Follow-up to #497 / [ADR 0059](../../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md),
which chose Option A (frontmatter + generated `INDEX.md` + fold-on-ship) and explicitly
deferred **Option B — the archive sweep** as "tracked separately". This is that task, plus a
matching trim of the plan-reading instructions in the workflow docs. Part of epic #491
(cut the per-task context tax).

Two parts:

1. **Archive sweep** — move the 101 `implemented`/`superseded` plans that no authoritative
   doc references into `docs/plans/archive/`, leaving `docs/plans/` as the 58 live +
   still-cited plans. `INDEX.md` then lists only those; a separate `archive/INDEX.md` covers
   the rest.
2. **Workflow-doc trim** — drop the obsolete "read every addendum / newest addendum is the
   source of truth" language (addenda were folded away in #510), and add an explicit rule:
   never read an archived or already-`implemented` plan for background context.

## Root Cause / Approach

### Why the archive sweep is safe now (ADR 0059 feared the ADR 0057 failure mode)

ADR 0059 deferred Option B because "`DECISIONS.md` cites several plan files as live
authority — archiving by status alone moves cited docs out of the scan path." Measured, the
citation web does **not** cross into archivable territory:

- **Authoritative doc → archivable plan: 0.** The predicate *is* "not cited by an
  authoritative doc", so by construction nothing authoritative links into `archive/`.
- **Keep plan → archivable plan (markdown link): 0.**
- **Archived → keep plan: 2** — `close-overlays-on-back-swipe.md`-class links; rewrite the
  `](x.md)` targets to `](../x.md)`.
- **Archived → archived: 2** — unchanged, they stay in the same relative directory.
- ~18 bare-filename *prose* mentions from keep plans (e.g. the string `reader-line-rhythm.md`
  mid-sentence) — not links, resolve to nothing in either location, left as-is.

### Predicate

For each `docs/plans/**/*.md` except `INDEX.md` and anything already under `archive/`:

```
archive  ⟺  status ∈ {implemented, superseded}
            AND the plan's basename is not linked or path-referenced from any file under:
                docs/architecture/**  docs/standards/**  docs/workflow/**
                docs/design/**  docs/deployment/**
                AGENTS.md  CLAUDE.md  PRODUCT.md  DESIGN.md
                .claude/**  .github/**
```

- **Plan → plan links never protect a plan** (there are 100+ cross-links; counting them
  would make the sweep a no-op).
- `status` is read from YAML frontmatter. Every tracked plan has it (verified — the #497
  migration was complete for tracked files).

### Execution

1. `git mv docs/plans/<p> docs/plans/archive/<p>` for each of the 101, **preserving subdirs**
   (`design-migration/*` → `archive/design-migration/*` — all 14 of that subdir archive, so
   `docs/plans/design-migration/` disappears, including its own `INDEX.md`).
2. Rewrite the 2 archived→keep links (`](x.md)` → `](../x.md)`).
3. `gen-plans-index.sh`: exclude `docs/plans/archive/**` from the active index; append a line
   `"N plans archived — see [archive/INDEX.md](INDEX.md)"`. Emit
   `docs/plans/archive/INDEX.md` in the same table format for the archived set.
4. Commit **`.claude/skills/scripts/sweep-archived-plans.sh`** — computes the predicate, does
   the `git mv`s and link rewrites, then calls `gen-plans-index.sh`. **Explicitly invoked
   only** — never called from `gen-plans-index.sh`, so a routine index regen never silently
   relocates files. Run it once in this task.

### `.gitignore` fix (folded in on request)

`.gitignore` line 8 was a bare `app*` (with `!app`). No leading slash → it matched **any**
path segment starting with `app` at any depth, silently ignoring
`docs/plans/app-wide-user-select-none.md` (the plan doc for shipped issue #482, never
committed as a result) and any future `app*`-named file. Verified `app*` protected nothing
useful (`app/` is the only match and `!app` re-includes it; `app/generated` has its own
`/app/generated` rule). Fixed: `app*` → `/app*`, `!app` → `!/app/` (anchored to root). The
recovered plan doc gets YAML frontmatter and is archived by the sweep like any other
finished, uncited plan.

### Part 2 — workflow-doc trim

| File | Change |
|---|---|
| `docs/workflow/plan-task.md` | Step 1 / step 26: remove "read that plan in full — every addendum … the newest addendum is the current source of truth". Replace with: "read that plan's `Constraints` and `What NOT to Do`". Step 0 (read `INDEX.md`) unchanged. |
| `docs/workflow/start-task.md` | Step 1: keep "read the plan in full" (it is the spec being implemented) but drop "Read every addendum … the newest addendum is the source of truth. Approaches that a later addendum revised or reverted are dead". |
| `docs/workflow/ship-task.md` | Keep the fold-addenda-on-ship rule (still a valid safety net) but note addenda are now expected to be rare / a returning-to-merged-work artifact only. |
| `AGENTS.md` Documentation section + `plan-task.md` + `start-task.md` | Add: "Never read an archived (`docs/plans/archive/`) or already-`implemented` plan for background context — its durable content lives in `docs/architecture/decisions/*.md` + ADRs. Only read the plan you are actively planning-from or implementing." |
| `docs/architecture/adr/0059-...md` | Add an `## Update — 2026-09-03: archive sweep implemented` section: predicate, `archive/` is outside the agent plan-scan path, sweep script is explicitly-invoked. |
| `docs/workflow/INDEX.md` | Plan-lifecycle bullet: mention `docs/plans/archive/` + `archive/INDEX.md`. |

### Step-0 note (why a new plan file, not an addendum to `plan-lifecycle-index.md`)

`plan-lifecycle-index.md` is the related plan. The workflow's step 0 says extend it with a
`## Addendum`. Not done here because: (a) ADR 0059 itself earmarked the archive sweep as
"tracked separately"; (b) #519 is its own issue; (c) #510 just removed every `## Addendum`
from `docs/plans/` and `ship-task.md` now folds any new one on ship — adding one back to the
very plan that introduced that rule, only to fold it again, is pure churn. `plan-lifecycle-index.md`
itself archives in this sweep.

## Decision Tree / Algorithm

```
load authoritative-citation set C =
    { basename(x) : x matches /plans\/([^)]+\.md)/ in any file under the authoritative roots }

for P in docs/plans/**/*.md, excluding INDEX.md and archive/**:
    st = frontmatter.status(P)  or  legacy **Status:** line
    if st in {implemented, superseded} and basename(P) not in C:
        target = docs/plans/archive/ + path(P) relative to docs/plans/
        git mv P target
    else:
        keep P in place

after all moves:
    for each archived file:
        rewrite  ](<name>.md[#…])  ->  ](../<name>.md[#…])   when <name> is a KEEP plan
    regenerate docs/plans/INDEX.md         (active plans only)
    generate  docs/plans/archive/INDEX.md  (archived plans)
```

## Verified Test Cases

Predicate run on the clean tracked set @ `8ac6f3a`: **101 archive**, **58 keep**.

**Keep (58)** — 57 cited by an authoritative doc + the new `plan-archive-sweep.md` itself.
Includes every plan linked from an ADR / `decisions/*.md` / standards / workflow doc:
`mobile-nav-ux.md`, `recitation-playback.md`, `tajweed-mushaf-mode.md`,
`reader-persistent-pager.md`, `fix-surah-banner-placement.md`, `pwa-offline-support.md`,
`split-decisions-by-domain.md`, `visual-e2e-testing.md`, `release-branch-workflow.md`,
`awrad-learning-plans.md`, … (full list = `INDEX.md` after the sweep).

**Archive (101)** — full list:

```
PLAN-retrospect-skill-2026-06-29.md            [superseded]
base-notification-system.md                    [implemented]
bump-actions-node20.md                         [implemented]
configure-project-trello-mcp.md                [implemented]
consolidate-agent-surfaces.md                  [implemented]
consolidate-mobile-safha-docs.md               [implemented]
consolidate-release-workflow.md                [implemented]
consolidate-suspense-boundaries.md             [implemented]
dark-theme-mushaf-unification-HANDOFF.md        [superseded]
dedupe-nav-pill-link.md                        [implemented]
deep-links-highlight-view-modes.md             [implemented]
delete-my-marks.md                             [implemented]
design-migration/0.1-lab-light-gold-variants.md [implemented]
design-migration/0.2-lab-page-face.md          [implemented]
design-migration/0.3-lab-small-screen.md       [implemented]
design-migration/0.4-design-language-spec.md   [implemented]
design-migration/1.1-rewrite-design-principles.md [implemented]
design-migration/2.1-semantic-tokens.md        [implemented]
design-migration/3.1-ui-primitives.md          [implemented]
design-migration/3.2-shared-chrome.md          [implemented]
design-migration/4.1-screens-marks-plans.md    [implemented]
design-migration/4.2-screens-home.md           [implemented]
design-migration/4.3-screens-search-settings.md [implemented]
design-migration/4.4-screens-mushaf-hub.md     [implemented]
design-migration/5.1-page-face-and-reader.md   [implemented]
design-migration/home-page-enhancement.md      [implemented]
design-system-foundation.md                    [implemented]
e2e-shared-mushaf-revocation.md                [implemented]
e2e-tafsir-page-boundaries-recitation.md       [implemented]
enhance-mark-modal-motion.md                   [implemented]
enhance-rub-list-sidebar.md                    [implemented]
fix-arabic-hamza-search-mismatch.md            [implemented]
fix-ayah-font-rendering.md                     [implemented]
fix-connection-limit-docs.md                   [implemented]
fix-desktop-search.md                          [implemented]
fix-homepage-cdn-cache-poisoning.md            [implemented]
fix-hostinger-build.md                         [implemented]
fix-markmodal-auth-gate.md                     [implemented]
fix-marks-hardcoded-localhost.md               [implemented]
fix-nav-icon-overflow.md                       [implemented]
fix-nav-overlay-link-navigation-race.md        [implemented]
fix-navbar-logo-locale-link.md                 [implemented]
fix-nextauth-jwt-session-corruption.md         [implemented]
fix-preload-font-mime-type.md                  [implemented]
fix-reader-hydration.md                        [implemented]
fix-reader-nav-infinite-loop.md                [implemented]
fix-verse-rendering-outside-quran-page.md      [implemented]
fold-plan-addenda.md                           [implemented]
fq-logger.md                                   [implemented]
functional-e2e-reader-navigation.md            [implemented]
functional-e2e-search.md                       [implemented]
functional-e2e-settings-persistence.md         [implemented]
functional-e2e-sidebar-navigation.md           [implemented]
functional-e2e-word-marking.md                 [implemented]
git-workflow-skills.md                         [implemented]
git-worktrees-workflow.md                      [implemented]
global-ui-font-tajawal.md                      [implemented]
home-nav-search.md                             [implemented]
homepage-surah-name-direction.md               [implemented]
keep-screen-awake.md                           [implemented]
listening-wird-inline-playback-fixes.md        [implemented]
make-marks-meaningful.md                       [implemented]
mark-modal-redesign.md                         [implemented]
marking-auth-roundtrip-e2e.md                  [implemented]
mobile-safha-remove-card-background.md         [implemented]
mobile-safha-sizing.md                         [implemented]
mobile-swipe-animation.md                      [implemented]
mushaf-layout-settings.md                      [implemented]
my-marks-page.md                               [implemented]
offline-recitation-download.md                 [implemented]
paginate-my-marks.md                           [implemented]
plan-lifecycle-index.md                        [implemented]
pr-review-remediations.md                      [implemented]
pwa-app-stickiness.md                          [implemented]
pwa-launch-network-calls.md                    [implemented]
quran-font-size-minimum-floor.md               [implemented]
quran-page-mushaf-design.md                    [implemented]
quran-safha-viewport-fit.md                    [implemented]
reader-line-rhythm.md                          [implemented]
retrospect-confirm-before-save.md              [superseded]
safha-header-surah-glyph-font.md               [implemented]
sentry-error-tracking.md                       [implemented]
sentry-slack-alerts.md                         [implemented]
shared-mushaf-access.md                        [implemented]
shrink-mark-modal.md                           [implemented]
sidebar-ayah-picker.md                         [implemented]
sidebar-close-on-nav.md                        [implemented]
sidebar-search-font-sizing.md                  [implemented]
sidebar-search-placeholder-alignment.md        [implemented]
sidebar-tab-filters.md                         [implemented]
split-quran-app-databases.md                   [implemented]
static-surah-list-json.md                      [implemented]
store-page-metadata.md                         [implemented]
system-wide-eastern-arabic-numerals.md         [implemented]
tafsir-qdc-provider-and-query-hook.md          [implemented]
tafsir-responsive-sheet-component.md           [implemented]
theme-depth-unification-HANDOFF.md              [superseded]
three-theme-palette.md                         [implemented]
trello-to-github-issues-migration.md           [implemented]
ui-workflow-enhancements.md                    [implemented]
wire-impeccable-workflow.md                     [superseded]
```

The **sweep script recomputes this set at run time** — the list above is the expected result
for review, not a hard-coded input.

**Link rewrites (exactly 2), archived → keep:** verified by scanning every `](….md)` in the
101; both point at a keep-plan basename and become `](../<name>.md)`.

## Files to Change

- `.claude/skills/scripts/sweep-archived-plans.sh` — **new.** Predicate + `git mv` + link
  rewrite + calls `gen-plans-index.sh`. Explicitly invoked only.
- `.claude/skills/scripts/gen-plans-index.sh` — exclude `docs/plans/archive/**` from the
  active index; append the archived-count pointer line; emit `docs/plans/archive/INDEX.md`.
- `docs/plans/` → `docs/plans/archive/` — 101 files moved via the script (preserving
  `design-migration/`).
- `docs/plans/INDEX.md`, `docs/plans/archive/INDEX.md` — regenerated.
- ~2 archived plan files — link target rewrites.
- `docs/workflow/plan-task.md`, `docs/workflow/start-task.md`, `docs/workflow/ship-task.md` —
  drop obsolete addendum-reading language; add the "don't read archived/implemented plans"
  rule.
- `AGENTS.md` — Documentation section: same rule + mention `docs/plans/archive/`.
- `docs/workflow/INDEX.md` — plan-lifecycle bullet mentions `archive/`.
- `docs/architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md` — `## Update` section
  recording the sweep is done, the predicate, and that `archive/` is outside the agent
  plan-scan path.
- `.claude/skills/plan-fq-task/SKILL.md`, `.claude/skills/start-fq-task/SKILL.md` — mirror the
  workflow-doc wording changes if they restate it.

## Constraints

- The sweep script **must not** be invoked from `gen-plans-index.sh` or any hook — a routine
  index regeneration must never `git mv` files as a side effect.
- Predicate authoritative-root list is closed and explicit — do not add `docs/plans/**` to it
  (plan→plan links are not protection) and do not add `graphify-out/**` or `node_modules/**`.
- Preserve subdirectory structure under `archive/` so archived→archived relative links keep
  resolving with no rewrite.
- `docs/plans/INDEX.md` stays generated — never hand-edited. Same for `archive/INDEX.md`.
- Keep `start-task.md`'s "read the plan in full" for the plan being implemented — that is a
  real need, not background reading.
- Do not change any plan's `status` value as part of the sweep — the move is orthogonal to
  status.
- ADR 0059 is `Accepted`; this is an additive update to it, not a supersession.

## What NOT to Do

- Do **not** use the virtual-archive / `status: archived` approaches — rejected in planning;
  the physical move was chosen and the link risk was measured to be 2 links.
- Do **not** hard-code the 101-file list into the sweep script — it recomputes the predicate.
- Do **not** archive plans cited by an authoritative doc even if `implemented` (e.g.
  `visual-e2e-testing.md`, `mobile-nav-ux.md`) — they stay in `docs/plans/`.
- Do **not** rewrite the ~18 bare-filename prose mentions in keep plans — they are not links.
- Do **not** add a `## Addendum` to `plan-lifecycle-index.md` — new plan file instead (see
  the step-0 note); and that plan archives in this sweep anyway.
- Do **not** delete any plan file — archive, never remove.
- Do **not** touch `start-task.md`'s core "read the plan you are implementing" instruction.

## Decisions Made

- **Archive predicate** = `status ∈ {implemented, superseded}` AND no citation from a closed
  set of authoritative doc roots; plan→plan links do not count. Recorded as an ADR 0059
  update.
- **Physical move** to `docs/plans/archive/` (structure preserved), not a virtual filter —
  measured link-rewrite cost is 2.
- **Sweep is a committed, explicitly-invoked script**, never auto-run — protects against
  surprise `git mv`s on index regen.
- **`gen-plans-index.sh` emits two indexes** — active (`INDEX.md`) and archived
  (`archive/INDEX.md`); step 0 of the plan workflow reads only the active one.
- **Workflow docs**: `plan-task` step 0 (read `INDEX.md`) and `start-task` step 1 (read the
  implementing plan) stay; the "read every addendum / newest wins" language goes; a "never
  read archived/implemented plans for context" rule is added.
- **`.gitignore` `app*` → `/app*` + `!/app/`** (folded in on request) — the bare rule
  silently ignored `docs/plans/app-wide-user-select-none.md` and any future `app*`-named
  file. The recovered plan doc is committed with frontmatter and archived by the sweep.
- No new ADR — ADR 0059 update + `docs/workflow/INDEX.md` (workflow decisions live there).

## Revision History

- **2026-09-03** — implemented. Sweep moved 101 plans (+ the recovered
  `app-wide-user-select-none.md` = 102 archived); `gen-plans-index.sh` split into
  active + `archive/INDEX.md`; ~50 relative doc links recomputed by the sweep script;
  `.gitignore` `app*` footgun fixed; workflow docs + `AGENTS.md` + ADR 0059 + both SKILL.md
  trimmed of stale addendum-reading language and given the "never read an archived/implemented
  plan for context" rule.
