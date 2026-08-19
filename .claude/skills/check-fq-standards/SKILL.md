---
name: check-fq-standards
description: Pre/post-implementation guardrail for Furqan tasks — checks a change against docs/architecture/DECISIONS.md's invariants (swipe/flicker, performance, navigation, mushaf layout, DB schema, PWA, theming) plus a general Next.js/TypeScript/PWA/DB-schema/clean-code bar. Invoked automatically by /start-fq-task before and after implementation; also invocable standalone as /check-fq-standards.
---

# /check-fq-standards

Read and follow [`docs/workflow/check-fq-standards.md`](../../../docs/workflow/check-fq-standards.md).

## Claude-specific additions

- When invoked from inside a `/start-fq-task` worktree, grep the worktree's own `<abs>/docs/architecture/DECISIONS.md`, not the main repo's — it may carry in-flight edits from the same task.
- When invoked standalone (not from within `/start-fq-task`), diff against `main` (or the branch's actual base if not `main`) and use the current repo's `docs/architecture/DECISIONS.md`.
