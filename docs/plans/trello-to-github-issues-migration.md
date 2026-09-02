---
title: Trello → GitHub Issues Migration Plan
type: feature
date: 2026-08-13
status: implemented
area: workflow
---

# Trello → GitHub Issues Migration Plan

## Status
Draft — not started. No Trello card yet (would be created by `/plan-fq-task` if this proceeds).

## Board audit (2026-08-13, live pull from Trello MCP)
Board "Furqan" (`https://trello.com/b/KEHDH9zH`), 7 lists:

| List | Cards | Attachments | Checklists | Comments |
|---|---|---|---|---|
| Backlog | 25 | 0 | 0 | 2 cards |
| Todo | 13 | 0 | 0 | 0 |
| In Progress | 1 | 0 | 0 | 0 |
| In Review | 2 | 0 | 0 | 0 |
| Testing | 6 | 0 | 0 | 5 cards |
| To Be Released | 4 | 0 | 0 | 0 |
| **Open total** | **51** | | | |
| Done (not migrated) | 43 | 3 cards | 0 | 22 cards |

**Note:** a **Testing** list exists between "In Review" and "To Be Released" that the skill audit below didn't originally account for — maps to a `status:testing` label.

Labels in use: `Feature` (32 uses), `Bug` (29), version labels `v1.0.0`–`v1.7.2` (mostly on Done cards), plus one-off `Qiraat` and `Investigation`. All map 1:1 to GitHub labels.

Migration scope is light — no attachments, no checklists on any open card, and only ~7 of 51 open cards carry comments worth preserving in the issue body.

## Why
Consolidate onto GitHub Issues since gh-axi is already wired in, repo currently has 0 open issues, and it removes a second external service + its MCP tool-schema overhead. See conversation 2026-08-13 for the comparison and coupling audit.

## Part 1 — Data migration (Trello cards → GitHub Issues)

**Is it easy?** Mechanically yes — GitHub's API/CLI makes bulk-creating issues trivial. The friction is entirely in *mapping Trello's model onto GitHub's*, which has no 1:1 equivalents for lists, checklists-as-workflow, or per-board labels-as-status.

### Step 0 — Prerequisite (blocking)
Trello MCP (`.mcp.json` → `mcpServers.trello.env`) has no `TRELLO_API_KEY`/`TRELLO_TOKEN` set and wasn't connected this session — cannot inspect live board state (card count, lists, labels) until these are filled in. Get key/token per `CLAUDE.md` MCP setup instructions first.

### Step 1 — Audit the board
Once connected: `mcp__trello__get_active_board_info`, then `get_cards_by_list_id` per list. Record:
- Card count per list (Todo, In Progress, In Review, To Be Released, Done)
- All label names in use (bug/feature + `v<version>` release labels)
- Any cards with attachments, comments, or checklists — these need manual review, not scripted migration

### Step 2 — Map Trello concepts to GitHub
| Trello | GitHub |
|---|---|
| Card | Issue |
| Card title/description | Issue title/body |
| List (Backlog/Todo/In Progress/In Review/Testing/Done) | Label (`status:backlog`, `status:todo`, `status:in-progress`, `status:in-review`, `status:testing`) — GitHub has no native "list"; closing the issue covers "Done" |
| `v<version>` release label | GitHub Milestone named `v<version>` (cleaner than a label for "what shipped in this release" queries used by `/cut-release` step 8-11) |
| Bug/Feature label | GitHub label, same names |
| Card assignee | Issue assignee |
| Card URL reference (in plans, PRs) | Issue URL |
| "To Be Released" list | Open issues with milestone set but unreleased — or a `release:pending` label |

Decision needed: **milestone vs label for release tracking.** Milestone is the better fit (native "close out a milestone" semantics, GitHub Release can link commits to milestone) — recommend milestone unless you have a reason to prefer labels.

### Step 3 — Script the migration
- Only migrate **open** cards (Todo, In Progress, In Review, To Be Released). Skip **Done** — those are historical, closing the loop by archiving/exporting a Trello JSON backup is enough; don't create hundreds of closed issues for no benefit.
- For each open card: `gh issue create --title "<title>" --body "<description>\n\n_Migrated from Trello: <card-url>_" --label "<mapped-labels>"`
- Preserve original Trello card URL in the issue body for traceability — don't try to preserve comments/history, not worth the scripting cost for what's likely a handful of cards.
- Run via gh-axi/gh CLI in a loop (bash script over the audited card list from Step 1), not one-by-one by hand.

### Step 4 — Verify and archive
- Spot-check a few migrated issues against source cards.
- Archive the Trello board (don't delete) — keep as historical reference for X weeks, then remove `mcp__trello` from `.mcp.json` and delete `.mcp.json.example`'s Trello section.

**Effort estimate:** 1-2 hours, dominated by Step 0 (credential setup, if not already had) and Step 1 (manual audit) — the scripted creation itself is fast regardless of card count (tens, not thousands, expected on a single small-team board).

## Part 2 — Skill rewiring (the bigger cost)

Six skills reference Trello directly (see audit below). Each `mcp__trello__*` call becomes a `gh-axi issue` equivalent. This is mechanical per-call but touches every workflow skill, so test each skill end-to-end after editing, not just at the end.

### `.claude/skills/plan-fq-task/SKILL.md`
- Step 5 "Ensure a Trello ticket": `get_active_board_info` + `get_cards_by_list_id` → `gh-axi issue list` (search open issues for matching title/keywords)
- Card creation → `gh-axi issue create` with mapped labels, into implicit "Todo" state (no label needed, or `status:todo`)
- Branch naming (`<type>/<card-short-id>-<slug>`) → `<type>/<issue-number>-<slug>`, same shape

### `.claude/skills/start-fq-task/SKILL.md`
- Step 1 "move card to In Progress" → swap label `status:todo` → `status:in-progress` via `gh-axi issue edit`
- Member assignment: currently resolves Trello identity via raw HTTP call to `/members/me` — GitHub assignment is simpler, `gh-axi issue edit --add-assignee @me`, no raw API call needed (net token savings here)
- Worktree/branch naming from card ID → from issue number

### `.claude/skills/ship-fq-task/SKILL.md`
- Precondition "there must be a Trello ticket" → "there must be a GitHub issue," same stop-if-missing logic
- Step 6 "update ticket, move to In Review" → `gh-axi issue comment` with PR URL + summary, swap label to `status:in-review`
- PR title/body sourcing from card title/URL → from issue title/URL (gh-axi/GitHub natively links via `Fixes #N` in PR body — arguably simpler than the current manual link)

### `.claude/skills/cut-release/SKILL.md`
- Step 8 "get cards on To Be Released list, label + move to Done" → query issues with a `release:pending` label (or open issues assigned to no milestone yet — needs Step 2 decision), set milestone `v<new-version>`, close each issue
- Step 10 GitHub Release notes currently built from fetched Trello cards → build from milestone's issue list (`gh-axi issue list --milestone v<new-version>`) — this is a **net improvement**, GitHub Release ↔ Milestone linking is native, no manual "keep fetched list in memory across steps" needed
- Rewrite explicit "Do not reuse Trello label" constraint → "Do not reuse milestone name," same intent

### `.claude/skills/promote-release/SKILL.md` and `promote-to-staging/SKILL.md`
- Step 2 "look up Trello cards with v<version> label" → `gh-axi issue list --milestone v<version>` (closed issues from cut-release), same "Do not touch Trello" constraint becomes "Do not touch issues — already closed in cut-release"

### Not in scope
- `docs/plans/*.md` and `docs/architecture/*.md` mentions of Trello are historical references inside existing plan/ADR docs — leave as-is, don't retroactively edit merged history.

**Effort estimate:** half a day — mostly careful editing + testing each skill's happy path once (create a test issue, run through plan→start→ship on a throwaway task).

## Part 3 — Rollout order
1. Part 1 (data migration) first, so issues exist before skills expect them.
2. Rewire `plan-fq-task` and `start-fq-task` together (they're the entry points), test on one real small task.
3. Rewire `ship-fq-task`, test same task through to PR.
4. Rewire `cut-release`/`promote-release`/`promote-to-staging` together — test on next actual release cut (don't fake a release for this).
5. Remove Trello MCP server from `.mcp.json`/`.mcp.json.example`, update `CLAUDE.md` MCP setup section.
6. Update this repo's `MEMORY.md`/memory files if any reference Trello workflow specifics (none currently do, per audit).

## Open questions for the user
- Milestone vs label for release-queue tracking (Part 1, Step 2) — recommend milestone.
- How far back to migrate: open cards only (recommended), or also want closed/Done cards imported as closed issues for history?
- Timeline: do this as one sitting, or spread across the rollout order above (safer — validates each skill before moving on)?
