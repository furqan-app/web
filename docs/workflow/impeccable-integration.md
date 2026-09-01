# Impeccable Design Workflow Integration

Moved here from `DECISIONS.md` by #493 (it is a workflow/process decision, not an architecture one).

**Decision:** `/impeccable`'s design/UX remediation commands are wired into the Furqan plan → implement → review cycle, invoked via direct Skill call (command + explicit target, never a subprocess or sub-agent) and always plan-driven — `/start-fq-task` never runs a design command the plan didn't name. See [ADR 0041](../architecture/adr/0041-wire-impeccable-into-fq-workflow.md) for the full mechanism, the eligible command set, and rejected alternatives (CLI shell-out, sub-agent delegation).

**Constraints:**
- `/start-fq-task` only invokes impeccable commands listed in the plan's `## Design Remediation` section — it must not decide mid-implementation to run one that wasn't planned.
- Eligible commands are every Evaluate/Refine/Enhance/Fix command (`critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`) — never Build/Iterate (`craft`, `shape`, `init`, `document`, `extract`, `live`).
- `check-fq-standards` stays unchanged — its checklist doesn't overlap impeccable's (invariants vs. a11y/aesthetic/UX), so no dedup step is needed between them.
- `/review-fq-work`'s Dimension 4 only runs when the diff touches UI-relevant files (components, pages, `.css`/`.scss`) — skip it entirely for backend-only diffs.
