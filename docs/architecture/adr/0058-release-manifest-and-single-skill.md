# ADR 0058: The version milestone is the release manifest, rendered into both the stg and prod PR bodies

**Date:** 2026-09-02
**Status:** Accepted

## Context

The release flow spans three GitHub Actions (`cut-release.yml`, `promote-release.yml`, `sync-main-from-prod.yml`) fronted by four thin skills (`/cut-release`, `/promote-release`, `/sync-main-from-prod`, `/release`). "What is in this release" was recorded only in the GitHub Release notes at cut time; the `main → stg` PR body was a fixed one-liner, so staging carried no record of what it had just received. `promote-release.yml` already assumes exactly one release branch is unpromoted at any time (it picks the highest-semver `release/*` not yet an ancestor of `prod`), but that assumption was implicit and undocumented, and `decisions/release.md` still described the pre-GitHub-Actions, Trello-era flow.

## Options Considered

**Option A — Milestone as the single manifest, rendered into both PR bodies**
`status:to-be-released` open issues at cut time are milestoned `vX.Y.Z`; that list is written verbatim into the GitHub Release notes, the `main → stg` PR body, and (re-queried by milestone) the `release/x.y.z → prod` PR body. Document "one release in flight at a time" as the invariant the issue-label query depends on.

**Option B — Changelog only in the Release notes (status quo)**
Leave the stg PR body as a fixed string; anyone wanting the staging changelog reads the Release object.

**Option C — Commit-range diff instead of the label query**
Compute the stg changelog from `git log stg..main` rather than open `status:to-be-released` issues, which would survive cutting a second release before the first promotes.

**Option D — Keep four release skills**
Leave `/cut-release`, `/promote-release`, `/sync-main-from-prod`, `/release` as separate slash commands.

## Decision

Option A, plus collapsing the four skills into one `/release` skill with subcommands (`/release <bump>`, `/release cut <bump>`, `/release promote`, `/release sync`). Option C is rejected because the one-release-in-flight invariant already holds by construction and a label query is simpler to read; Option D is rejected because the three phase skills were 8-line pointers into the same `docs/workflow/release.md`.

## Consequences

- **+** Staging carries a readable record of what each refresh added; the stg and prod PR bodies now show the same manifest.
- **+** One documented source of truth (the `vX.Y.Z` milestone + GitHub Release) instead of three drifting copies.
- **+** One release skill, one INDEX row, one reference doc section per phase.
- **-** The stg changelog is only correct while one release is in flight at a time — cutting a second release before promoting the first would list the first release's issues again. Accepted: the `/release` orchestration never does this, and a manual double-cut is already unsupported by `promote-release.yml`'s selection logic.
- **-** A future edit to either PR-body step must keep both in sync by hand; the coupling is stated in `cut-release.yml` comments and `decisions/release.md`, not enforced.
