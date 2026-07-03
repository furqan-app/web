---
name: commit-staged
description: Generate a structured commit message from staged changes. Run before git commit.
---

# commit-staged

Analyze staged changes and produce a ready-to-use commit message.

## Instructions

1. Run `git diff --staged`. If nothing is staged, say so and stop.
2. Analyze what changed, why it matters, and what approach was taken.
3. Output **only** the commit message — no extra prose.

## Output Format

```
<type>(<scope>): <summary under 72 chars>

What: <what was added, changed, or removed>
Why: <motivation — requirement, bug, perf issue, UX gap, etc>
How: <approach taken and why over alternatives, if non-obvious>
Backwards-compatible: <yes | no — one-line reason>
```

## Field Reference

| Field | Guidance |
|---|---|
| `type` | `feat` · `fix` · `perf` · `refactor` · `chore` · `docs` |
| `scope` | module, package, or layer (e.g. `auth`, `api`, `db`) |
| `Why` | for bugs: failure mode; for features: requirement or gap; for perf: measured impact |
| `How` | omit if the approach is obvious from the diff |
| `Backwards-compatible` | omit entirely if yes and nothing interesting to say |

**One commit message per invocation. No text outside the format.**
