# Release — Decisions

Active decisions for release & deployment workflow. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Release & Deployment Workflow

**Status:** active

**Decision:** Prod deploys go through a required `release/x.y.z` stabilization branch, not directly from `main`. Staging (`stg`) is decoupled from the release flow and tracks `main` directly. See [ADR 0015](../adr/0015-release-branch-workflow.md), [ADR 0026](../adr/0026-staging-environment.md), and [ADR 0039](../adr/0039-stg-tracks-main-directly.md).

```
main → PR → stg   (direct, no release cut required)
main → /cut-release → release/x.y.z → /promote-release → prod → /sync-main-from-prod → main
```

- `/cut-release <major|minor|patch>` — branches `release/x.y.z` off `main`, bumps `package.json` version + tags `vX.Y.Z`, labels every card in **"To Be Released"** with the version and moves them to **Done**, then creates a GitHub Release whose notes are built from those same cards (title + URL) — not `--generate-notes`, since Trello is the curated "what's included" source, not raw commit/PR history. It also diffs the previous release tag against the new release branch for Quran/App DB changes and, if any are found, appends a `## Manual Action Required` section to the release notes and calls it out in its chat report — non-blocking, reminder-only (see below).
- `/promote-to-staging` — opens the PR `main` → `stg`. Hostinger's staging site auto-deploys on any push to `stg`, so merging the PR is sufficient. No longer tied to a release version.
- `/promote-release <version>` — opens the PR `release/x.y.z` → `prod`. Hostinger auto-deploys on any push to `prod`, so merging the PR is sufficient — no manual hPanel redeploy click needed.
- `/sync-main-from-prod` — opens the PR `prod` → `main` afterward, to capture any fixes made on the release branch back into `main`.
- `/release <major|minor|patch>` — orchestrator that runs `/promote-to-staging`, `/promote-release`, and `/sync-main-from-prod` in one continuous flow around `/cut-release`, pausing only at genuine human checkpoints (confirm the `stg` PR merged and staging looks right, confirm the prod PR merged, confirm the `main`-sync PR merged). Verifies PR merges via `gh pr view` rather than trusting the user's word where that's possible.

**Constraints:**
- `protect-prod.yml` only accepts PRs into `prod` whose source branch starts with `release/` — direct `main → prod` PRs are no longer permitted, including for hotfixes (cut a release branch for those too).
- `protect-stg.yml` only accepts PRs into `stg` whose source branch is exactly `main` — `release/*` and any other branch are rejected (ADR 0039). This means a release cut after a `main → stg` staging check can include additional `main` commits merged after that check ran; the exact `release/x.y.z` artifact is never separately staged.
- Staging (`stg`) has its own fresh `furqan_quran`/`furqan_app` databases, independent of prod's — never a snapshot of prod data, to avoid copying real user data into a lower-security environment.
- Cards move into "To Be Released" manually when their PR merges to `main`; `/cut-release` is what stamps the version label and moves them to `Done`, not the merge itself.
- Do not skip `/sync-main-from-prod` after a release — without it, fixes made directly on a release branch during stabilization silently disappear from `main`'s history.
- `/release` must not skip its checkpoints — PR merges must always be verified via `gh`, never assumed; only the "staging looks right" judgment at Checkpoint 1 has no programmatic check and is taken on the user's word.
- `/cut-release`'s DB-change detection is file-path-based only (`prisma/quran/schema.prisma`, `scripts/quran-seed/**`, `prisma/app/migrations/**`) and never blocks the flow — it exists because the Quran DB has no automatic migration path (`prisma/migrations` is explicitly unused for it; re-sync is the destructive `npm run seed:quran -- --force`), so a schema/seed change merged to `main` silently doesn't reach prod without a manual re-seed. It does not attempt to detect generic application-level breaking changes — that's left to PR review.
