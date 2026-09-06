---
name: setup-fq-fleet
description: On-demand, human-confirmed setup for this project's coding-CLI fleet — installs missing delegate skills only for CLIs the human actually assigns a lane to, then hands off entirely to the upstream delegate-setup skill's interactive discover/propose/approve/write flow (steered toward fq's three lane names: implementation, planning, second-opinion). Never installs a CLI itself or touches credentials — prints those commands for the human to run. Trigger via /setup-fq-fleet, or when detect-fleet reports gaps the human wants to close.
---

# /setup-fq-fleet

Read and follow [`docs/workflow/fleet-setup.md`](../../../docs/workflow/fleet-setup.md) — the "`setup-fq-fleet`" section specifically. See [ADR 0063](../../../docs/architecture/adr/0063-fleet-detection-wraps-delegate-setup.md) for the full rationale, the `cost_tier` table, and why config lands at project scope (`.delegate/config.json`, gitignored) rather than global.

Confirm with the human before installing anything — `delegate-setup` itself, and later each `*-delegate` skill a lane actually uses. Never install a CLI or run a login command; print it instead.
