---
name: promote-release
description: Promote the latest cut release branch into prod. Trigger via /promote-release.
---

# /promote-release

Read and follow the **Promote Release** section in [`docs/workflow/release.md`](../../../docs/workflow/release.md). This triggers the `promote-release.yml` GitHub Action, which auto-detects the version — do not ask the user for one, and do not run the underlying git/gh steps yourself.
