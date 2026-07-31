# Session Handoff — Dark Theme Mushaf Unification

**Date:** 2026-07-28
**Branch:** `feature/148-dark-theme-mushaf-unification`
**Worktree:** `/home/tahamohamed/Desktop/cs/non-work/projects/furqan-dark-theme-mushaf-unification`
**Dev server:** http://localhost:7001 (port **7001** — see `~/.claude/furqan-worktrees.json`, key `dark-theme-mushaf-unification`). If down: `PORT=7001 npm run dev` in the worktree.
**Trello:** https://trello.com/c/EkT77YQR

## Status

Signed off by the user across dark desktop, tablet and mobile.

## Source of truth

`docs/plans/dark-theme-mushaf-unification.md`. **Later sections win** — the last three are
Reading-Desk Pass 1 (desktop depth), Pass 2 (light level, floating chrome, circular arrows) and
Pass 3 (tablet), each ending in a measured Implementation Result table.

This file deliberately does **not** restate token values or rule details. A second copy is a
second thing to keep in sync, and the previous version of this handoff went stale exactly that
way: it still described an ambient desk pool that Pass 2 deleted and a 36px separator that Pass 3
widened to 40px. Read the plan.

Also load: [ADR 0031](../architecture/adr/0031-dark-theme-gold-emerald-semantics.md) (gold vs
emerald), [ADR 0032](../architecture/adr/0032-dark-surface-depth-from-light.md) (depth from
light — including its addendum on why fixed ladder numbers were wrong and where to sample), and
the Theme Architecture / Dark Surface Depth / Desktop Reading Group entries in `DECISIONS.md`.

## Hard constraints — do NOT break

1. **`.theme-dark` and `.theme-dark.dark` must stay identical in VALUE.** They have drifted twice
   from manual edits. Verify with a value-only comparison, never a text diff — the two blocks are
   not textually identical and never were. Parse both blocks' `--token: value;` pairs and compare
   the sorted sets (the old line-number `awk` recipe here rotted as the file grew; derive the
   block bounds by brace matching instead).
2. **Gold is reader-page-only.** No gold in chrome — badges, pills, avatars stay emerald/`--accent`
   (ADR 0031).
3. **Emerald stays the original `162 88% 41%`** — never recalibrate to a muted olive.
4. **Depth on dark reader surfaces comes from light, never shadow**, and every change is verified
   by sampling rendered pixels. A shadow can be correct in the cascade and produce no pixels; that
   is what cost Correction Rounds 3, 7 and 8.
5. **Ramp amplitude is per-band.** Desktop's values live in the theme blocks; tablet overrides them
   inside its own media query. Copying a signed-off value into a different surround does not
   reproduce its effect — desktop's numbers on tablet measured correctly and looked unchanged.
6. **Apply user-supplied exact CSS values faithfully** — do not "improve" them.
7. **No hardcoded colors outside theme class blocks** in `globals.css`.
8. Do not touch Quran typography, verse positions, spacing, ornaments, or responsive layout
   (ADR 0004/0011 govern page sizing; ADR 0005 governs the safelist).

## Verification tooling

- **Tablet band is unreachable in the MCP browser** — it clamps its viewport at 1600px. Use a
  headless script driving system Chrome through the local `playwright` package
  (`chromium.launch({ executablePath: "/usr/bin/google-chrome-stable" })`); it accepts any
  viewport and writes a PNG to sample with PIL. Playwright's own browsers are not installed here,
  and installing them is a ~150MB change worth asking about first.
- **MCP screenshots need a path under** `/home/tahamohamed/Desktop/cs/non-work/projects/furqan/.playwright-mcp/`.
  Anywhere else, `browser_take_screenshot` reports success and writes nothing.
- **Sample from measured element rectangles, not guessed viewport fractions.** The pager mounts
  three panels side by side, so the visible one spans only part of the viewport; a fraction like
  0.955 lands on the desk, not the paper. A whole round of numbers was recorded wrong that way.

## Out of scope / deferred

- Page scale +5–8% (conflicts ADR 0004/0011).
- Nav redesign; extending the floating chrome below 1367px.
- Mockup perspective/geometry — ruled **out**, not deferred (ADR 0011).

## Known, tracked separately

Rapid swipes are silently dropped on tablet: a 300ms commit lock in `ReaderPager` swallows any
gesture that starts inside the commit window. Unrelated to this branch — proved by stashing every
uncommitted `app/` change and reproducing it identically. Trello
[#153](https://trello.com/c/qkKb5UFn).
