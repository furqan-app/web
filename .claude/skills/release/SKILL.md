---
name: release
description: Run the release process — full via /release <major|minor|patch>, or a single phase via /release cut <bump> | /release promote | /release sync. Triggers GitHub Actions; the agent triggers, polls, and relays.
---

# /release

One entry point for the release flow. Route on the first argument:

| `/release …` | Section in [`docs/workflow/release.md`](../../../docs/workflow/release.md) |
|---|---|
| `major` \| `minor` \| `patch` | **Full Release Orchestration** — cut → staging checkpoint → promote → sync → final-merge checkpoint |
| `cut major` \| `cut minor` \| `cut patch` | **Cut Release** — trigger `cut-release.yml` only |
| `promote` | **Promote Release** — trigger `promote-release.yml` only |
| `sync` | **Sync Main from Prod** — trigger `sync-main-from-prod.yml` only |
| empty, or first arg not one of the above | Ask which subcommand (and the bump, for `cut` or the full flow) — never guess |

Read and follow the matching section. These trigger GitHub Action workflows (`cut-release.yml`, `promote-release.yml`, `sync-main-from-prod.yml`) — do not run the underlying git/gh steps yourself.
