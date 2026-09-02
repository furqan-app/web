---
name: mujaz
description: Toggle mujaz (terse-response) mode on or off for this repo. Use when the user says "/mujaz", "stop mujaz mode", "turn mujaz mode back on", or asks to toggle it.
---

# mujaz

Read and follow [`docs/workflow/terse-mode.md`](../../../docs/workflow/terse-mode.md) for the concept.

## Toggle command

Toggle by running:
```bash
node .claude/hooks/mujaz-toggle.js        # flip current state
node .claude/hooks/mujaz-toggle.js on     # force on
node .claude/hooks/mujaz-toggle.js off    # force off
```
Report the one-line result the script prints (`mujaz mode: ON` or `mujaz mode: OFF`). Nothing else.
