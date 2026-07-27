---
name: mujaz
description: Toggle mujaz (terse-response) mode on or off for this repo. Use when the user says "/mujaz", "stop mujaz mode", "turn mujaz mode back on", or asks to toggle it.
---

# mujaz

Toggles the repo's mujaz-mode hooks (see `.claude/hooks/mujaz-mode.js`).
"Mujaz" (موجز) is Arabic for concise/succinct.

## Instructions

1. Run `node .claude/hooks/mujaz-toggle.js` with no argument to flip the
   current state, or pass `on` / `off` explicitly if the user said which
   one they want.
2. Report the one-line result the script prints (`mujaz mode: ON` or
   `mujaz mode: OFF`). Nothing else.
