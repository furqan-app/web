---
name: check-fq-standards
description: Pre/post-implementation guardrail for Furqan tasks — checks a change against the docs/architecture/decisions/*.md invariants (swipe/flicker, performance, navigation, mushaf layout, DB schema, PWA, theming), a general Next.js/TypeScript/PWA/DB-schema/clean-code bar, and design/UX basics (contrast, hierarchy, spacing, RTL parity, touch targets, reduced-motion). Invoked automatically by /start-fq-task before and after implementation; also invocable standalone as /check-fq-standards.
---

# /check-fq-standards

Read and follow [`docs/workflow/check-fq-standards.md`](../../../docs/workflow/check-fq-standards.md).

## Context resolution

- When invoked from inside a `/start-fq-task` worktree, grep the worktree's own `<abs>/docs/architecture/decisions/*.md` (and the `DECISIONS.md` index), not the main repo's — they may carry in-flight edits from the same task.
- When invoked standalone (not from within `/start-fq-task`) — including by the orchestrator on a
  delegated implementer's diff — **default to the uncommitted working tree**, not `main...HEAD`.
  A pre-ship branch has no commits, so a base-branch diff inspects nothing and reports clean.
  Diff against `main` (or the branch's actual base) only once the branch actually carries
  commits and the working tree is clean. Use the current repo's `docs/architecture/decisions/*.md`.
