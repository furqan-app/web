---
name: sync-main-from-prod
description: Open the PR that merges prod back into main after a release, so release-branch fixes aren't lost. Trigger via /sync-main-from-prod.
---

# /sync-main-from-prod

Read and follow the **Sync Main from Prod** section in [`docs/workflow/release.md`](../../../docs/workflow/release.md). This triggers the `sync-main-from-prod.yml` GitHub Action — do not run the underlying git/gh steps yourself.
