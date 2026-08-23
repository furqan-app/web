---
name: cut-release
description: Cut a new release branch from main — bump the version, tag it, milestone/close queued issues, and promote main to staging. Trigger via /cut-release <major|minor|patch>.
---

# /cut-release <major|minor|patch>

Read and follow the **Cut Release** section in [`docs/workflow/release.md`](../../../docs/workflow/release.md). This triggers the `cut-release.yml` GitHub Action — do not run the underlying git/gh steps yourself.
