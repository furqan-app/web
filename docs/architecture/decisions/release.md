# Release — Decisions

Active decisions for release & deployment workflow. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Release & Deployment Workflow

**Status:** active

**Decision:** Prod deploys go through a required `release/x.y.z` stabilization branch, never directly from `main`. Staging (`stg`) is decoupled from the release-branch flow and only accepts PRs from `main`. Release mechanics run as GitHub Actions (`workflow_dispatch`), not agent-executed git/gh steps — the agent triggers, polls, and relays. See [ADR 0015](../adr/0015-release-branch-workflow.md) (+ its 2026-08-21 addendum), [ADR 0026](../adr/0026-staging-environment.md), [ADR 0039](../adr/0039-stg-tracks-main-directly.md), and [ADR 0058](../adr/0058-release-manifest-and-single-skill.md).

```
main → /release cut → release/x.y.z          (same run also opens+merges the main → stg PR)
     → /release promote → release/x.y.z → prod
     → /release sync → prod → main
```

- **One `/release` skill, subcommands:** `/release <major|minor|patch>` runs the full flow; `/release cut <bump>` triggers `cut-release.yml` only; `/release promote` triggers `promote-release.yml` only; `/release sync` triggers `sync-main-from-prod.yml` only. The three former slash commands (`/cut-release`, `/promote-release`, `/sync-main-from-prod`) are gone.
- **`cut-release.yml`** branches `release/x.y.z` off `main`, bumps `package.json` + tags `vX.Y.Z`, milestones the open `status:to-be-released` issues to `vX.Y.Z`, creates a GitHub Release whose notes list those issues (title + URL — not `--generate-notes`), and opens + auto-merges the `main → stg` PR **with the same issue list in its body**. It also diffs the previous release tag against the new branch for Quran/App DB changes and appends a `## Manual Action Required` section to both the Release notes and the stg PR body when any are found — non-blocking, reminder-only.
- **`promote-release.yml`** picks the highest-semver `release/*` branch not yet merged into `prod`, re-queries `--milestone vX.Y.Z`, opens + auto-merges the `release/x.y.z → prod` PR with that list in its body, then marks those issues `status:done` and closes them.
- **`sync-main-from-prod.yml`** opens the `prod → main` PR — deliberately **not** auto-merged; conflicts here need a human.

**The `vX.Y.Z` milestone + GitHub Release is the single release manifest.** The stg PR body and the prod PR body both render it. This is only correct while **one release is in flight at a time** (cut → promote → sync completes before the next cut) — the `status:to-be-released` open-issue query at cut time assumes it, and `promote-release.yml`'s branch selection already does. See ADR 0058.

**Constraints:**
- `protect-prod.yml` only accepts PRs into `prod` whose source branch starts with `release/` — no direct `main → prod`, including hotfixes (cut a release branch for those too).
- `protect-stg.yml` only accepts PRs into `stg` whose source branch is exactly `main` (ADR 0039). A release cut can therefore include `main` commits merged after the last staging check; the exact `release/x.y.z` artifact is never separately staged.
- Staging has its own fresh `furqan_quran`/`furqan_app` databases, never a snapshot of prod data.
- Do not cut a second release before the in-flight one reaches `prod` — the stg changelog and `promote-release.yml`'s selection both break. Not enforced; the `/release` orchestration never does it.
- Do not skip `/release sync` after a release — without it, fixes made on the release branch during stabilization silently disappear from `main`.
- The `main → stg` and `release → prod` PR-body steps must stay in sync by hand if either is edited — the coupling lives in `cut-release.yml` comments and here, not in code.
- `/release`'s two checkpoints (staging looks right; final `prod → main` sync PR merged) must be verified via `gh` where possible; only the "staging looks right" judgment has no programmatic check.
- `cut-release.yml`'s DB-change detection is file-path-based only (`prisma/quran/schema.prisma`, `scripts/quran-seed/**`, `prisma/app/migrations/**`) and never blocks — the Quran DB has no automatic migration path (re-sync is the destructive `npm run seed:quran -- --force`). It does not detect generic application-level breaking changes; that's PR review's job.
