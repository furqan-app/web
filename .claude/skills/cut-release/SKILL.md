---
name: cut-release
description: Cut a new release branch from main — bump the version, tag it, and advance the Trello release queue. Trigger via /cut-release <major|minor|patch>.
---

# /cut-release <major|minor|patch>

Branches a new `release/x.y.z` off `main`, bumps and tags the version, stamps the Trello release queue, and flags any Quran/App DB changes that may need manual action. See `docs/plans/release-branch-workflow.md` (Addendum 2) and [ADR 0015](../../../docs/architecture/adr/0015-release-branch-workflow.md).

## Precondition

- A bump type (`major`, `minor`, or `patch`) must be given. If missing, ask for it — do not guess or default.
- `git status` must be clean. If not, stop and tell the user to commit/stash first.

## Steps

1. `git fetch origin`.
2. `git checkout main && git pull` (fast-forward only).
3. Read `"version"` from `package.json`. Compute the new version by applying the given bump type (semver: major resets minor+patch to 0, minor resets patch to 0, patch increments only the patch number).
4. `git checkout -b release/<new-version>`.
5. Edit `package.json`'s `"version"` field to `<new-version>`. Run `npm install --package-lock-only` so `package-lock.json`'s top-level `version` field stays in sync (do not run a full `npm install` — this must not touch `node_modules` or resolved dependency versions). Stage both files and commit directly (no need to route through `commit-staged` — this is a single mechanical field change): `chore(release): bump version to <new-version>`. No AI signature (see "No AI signatures" below).
6. `git tag v<new-version>`.
7. `git push -u origin release/<new-version>` then `git push origin v<new-version>`.
8. Trello: `mcp__trello__get_cards_by_list_id` on the **"To Be Released"** list (board "Furqan"). Keep the fetched card list — it's reused in step 10 for the GitHub Release body. For each card there:
   - Create a new label named `v<new-version>` if one doesn't already exist with that exact name (one label per version — never reuse or rename an existing release label).
   - Apply the label to the card.
   - `mcp__trello__move_card` the card to **Done**.
   - If the list is empty, say so and continue anyway — an empty release is still valid (e.g. infra-only changes).
9. **Detect DB changes needing manual action** (non-blocking — this only builds content for steps 10 and 11, it never pauses):
   - Find the previous release tag: run `git tag --list 'v*' --sort=-v:refname` on `origin` and take the first entry that isn't `v<new-version>`. Sort by semver, not by reachability from `main` — `main` only gains a release's tag once that release's `/sync-main-from-prod` PR has merged, which is often still pending for the immediately-preceding release, so anchoring on `main` would silently skip back to an older tag and over-flag already-released files. If the list has no entry besides `v<new-version>` (first-ever release), skip the rest of this step entirely — no error, no output.
   - `git diff --name-only <previous-tag>..release/<new-version>` and check the returned paths against:
     | Path touched | Flag | Notes wording |
     |---|---|---|
     | `prisma/quran/schema.prisma` | Quran DB | "Quran DB schema changed — re-seed prod manually (`npm run seed:quran -- --force`) if this release should reflect it." |
     | `scripts/quran-seed/**` (any file) | Quran DB | "Quran seed logic/data changed — re-seed prod manually if you want this release's data live." |
     | `prisma/app/migrations/**` (new or changed files) | App DB | "New Prisma migration(s) — will auto-apply via `prisma migrate deploy` on deploy. No action needed; consider backing up the App DB first." |
   - If any flags fire, build a `## Manual Action Required` section: one bullet per flag, using the wording above, listing the specific files that triggered it. Keep this in memory for steps 10 and 11 — if nothing fired, there is no section and nothing extra to report.
10. Create the GitHub Release: `gh release create v<new-version> --title "v<new-version>" --notes "<body>"`, where `<body>` is a "What's included in v<new-version>" heading followed by one bullet per card fetched in step 8 (card title + its Trello card URL), followed by the `## Manual Action Required` section from step 9 if one was built. If the card list was empty, use a short "No tracked changes — infra/release-process only" line instead of a bullet list.
11. Report: the new version, the release branch name, the tag, the GitHub Release URL, and which Trello cards were labeled/moved. If step 9 built a `## Manual Action Required` section, restate it explicitly and prominently here — this is the "don't let me forget" callout. If nothing was flagged, say nothing extra.

## No AI signatures

Never add AI attribution anywhere in this flow: no `Co-Authored-By: Claude`, no "Generated with Claude Code," no footer/trailer of any kind, in the commit or anywhere else.

## What NOT to do

- Do not infer the bump type from commit history — it must be given explicitly.
- Do not cut from any branch other than `main`.
- Do not reuse or recolor an existing Trello label for a new version — always create a new one.
- Do not push to `prod` or open any PR — that's `/promote-release`'s job.
- Do not use `gh release create --generate-notes` or otherwise pull notes from commit/PR history — the release body is built from the Trello cards labeled with this version, the curated source of "what's included."
- Do not pause or require acknowledgment for a flagged DB change (step 9) — it's reminder-only, surfaced in the release notes and the chat report, never a checkpoint.
- Do not attempt to detect generic/non-DB breaking changes (API contract changes, removed routes, etc.) — out of scope; only the specific Quran/App DB paths in step 9's table are checked.
