---
name: release
description: Drive the full release process from cut to prod to main-sync in one continuous run, pausing only where human action is genuinely required. Trigger via /release <major|minor|patch>.
---

# /release <major|minor|patch>

Read and follow the **Full Release Orchestration** section in [`docs/workflow/release.md`](../../../docs/workflow/release.md). This triggers GitHub Action workflows (`cut-release.yml`, `promote-release.yml`, `sync-main-from-prod.yml`) rather than running git/gh steps directly.
