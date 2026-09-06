---
name: detect-fleet
description: Read-only report of which coding CLIs (claude, codex, agy, opencode, and any other CLI in the amElnagdy/delegate-skills catalog) are installed, authenticated, and what models each currently offers — plus fq-only cost_tier and delegate-skill-installed enrichment. Wraps the upstream delegate-setup skill's discover.mjs rather than probing CLIs directly. Caches to .claude/fleet.json (gitignored, describes one machine). Side-effect free. Trigger via /detect-fleet, or when setup-fq-fleet or the future orchestrator need a fresh capability report.
---

# /detect-fleet

Read and follow [`docs/workflow/fleet-setup.md`](../../../docs/workflow/fleet-setup.md) — the "`detect-fleet`" section specifically. See [ADR 0063](../../../docs/architecture/adr/0063-fleet-detection-wraps-delegate-setup.md) for why this wraps `delegate-setup` instead of probing CLIs directly, and for the `cost_tier` derivation table.

`--refresh` forces a re-probe instead of reusing `.claude/fleet.json`.
