---
name: refine-fq-task
description: Refines a big or vague task into separate workable points and creates GitHub issues (parent epic + linked children, status:backlog) — no implementation, no plans. Checks the codebase, docs/plans, and ADRs to ground scope boundaries. Trigger via /refine-fq-task, or from "refine this", "break this down", "create issues for this".
---

# /refine-fq-task

Read and follow [`docs/workflow/refine-task.md`](../../../docs/workflow/refine-task.md).

## Step 5 — Creating the issues

### Parent epic (create first)

```bash
gh issue create --repo furqan-app/web --title "<big task title>" \
  --body "<context + overall scope boundary>\n\n## Workable points\n- [ ] <point 1>\n- [ ] <point 2>" \
  --label "status:backlog"
```

Set the native Issue Type to Feature via GraphQL — Task `IT_kwDOCyJLuM4BcAGi`, Bug `IT_kwDOCyJLuM4BcAGj`, Feature `IT_kwDOCyJLuM4BcAGk` (see `/plan-fq-task` step 5 for the exact mutation).

### One child per workable point

```bash
gh issue create --repo furqan-app/web --title "<point title>" \
  --body "## Summary\n...\n\n## In scope\n...\n\n## Out of scope\n...\n\n## Codebase pointers\n...\n\n## Constraints\n...\n\nPart of #<epic-number>" \
  --label "status:backlog"
```

- Set each child's native Issue Type via GraphQL (Task/Bug/Feature matching the point).
- When a point depends on another, add `Blocked by #<sibling-number>` to its body.
- After all children exist, edit the parent body so the checklist references the real issue numbers (`- [ ] #123 <title>`).

## What NOT to do

- Do not create worktrees or branches — no implementation happens here.
- Do not label children `status:todo` — they move forward when each is planned.
- Do not merge several workable points into one issue to save time — the split is the point.
