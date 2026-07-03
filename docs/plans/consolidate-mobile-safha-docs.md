# Consolidate Mobile Safha Sizing Docs

**Type:** docs
**Date:** 2026-07-03
**Status:** implemented

## Summary

Today's mobile-safha sizing work went through three iterations (vw scale-aware → dvh budget formula → width-driven flex-fill), each producing its own plan file and ADR, per the mandatory-workflow rule of never editing without a plan. That was correct per-change, but it leaves four plan files and three ADRs describing what is now a single, superseded-in-place feature. Consolidate them: one plan file documenting the as-built state (with prior approaches summarized as history, not repeated in full), and one merged ADR (the user opted to merge rather than keep the audit trail separate).

This does not touch `mobile-safha-remove-card-background.md` or `fix-mobile-swipe-direction.md` — confirmed out of scope (distinct concerns: background color, swipe gesture, not sizing-formula iterations).

## Approach

### Plans — merge 4 into 1

Delete:
- `docs/plans/fix-mobile-font-scale.md`
- `docs/plans/mobile-safha-dvh-font.md`
- `docs/plans/mobile-safha-fullscreen.md`
- `docs/plans/mobile-safha-width-driven-fill.md`

Create `docs/plans/mobile-safha-sizing.md` containing:
- Summary of the final as-built mobile safha behavior (full-screen card, width-driven font via `14.7` divisor, flexbox `space-between` height fill, swipe nav, hidden chrome/arrows/font-scale-controls on mobile) — pulled from `mobile-safha-width-driven-fill.md`'s Summary/Approach/Files/Constraints/Edge-Cases/As-Built-Refinements sections (the final, correct state) plus the layout/navigation/settings pieces from `mobile-safha-fullscreen.md` that are still true (swipe extraction into `QuranPageShell`, arrows hidden on mobile, card chrome removed, font-scale controls hidden in Settings) — these were not superseded, only the font-sizing math was.
- A brief "History" section (a few sentences, not full reproductions) noting the vw-scale-aware attempt (font-scale-mobile-a11y idea) and the dvh-budget-formula attempt were tried and superseded, and why, linking to the merged ADR for full rationale rather than repeating it.
- Status: `implemented`.

### ADRs — merge 3 into 1

Delete:
- `docs/architecture/adr/0012-mobile-fullscreen-safha.md`
- `docs/architecture/adr/0013-mobile-safha-width-driven-flex-fill.md`

Rewrite `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md` in place (keep the number — it's the earliest slot allocated to this feature) as a single merged ADR:
- **Title:** "Mobile Safha sizing: width-driven font, flexbox height fill, no user scaling"
- **Status:** Accepted
- **Context:** the mushaf full-screen mobile goal, and that two earlier options (vw-per-scale; dvh budget formula) were tried and abandoned — condense each into a short "Option" entry (reuse the existing Options Considered structure) rather than dropping them.
- **Options Considered:** three entries — vw-per-scale (original 0011 Option A), dvh-budget (0012's Option A), width-driven-flex-fill (0013's Option A, the winner) — each 2-3 sentences, not the full original prose.
- **Decision:** width-driven-flex-fill, same content as 0013's Decision section (never-wrap backstop, breathing-room padding, pages 1-2 centering) — this is the load-bearing content, keep it close to verbatim.
- **Consequences:** merge 0013's Consequences (the ones still true) — drop 0011/0012 consequences that no longer apply (e.g., "two parallel formulas must stay in sync" — no longer true, there's no vw-scale formula anymore).

### Cross-references to update

- `docs/architecture/DECISIONS.md` line 225: change `[ADR 0013](adr/0013-mobile-safha-width-driven-flex-fill.md); supersedes 0012, which superseded 0011` to `[ADR 0011](adr/0011-mobile-quran-font-scale-vw-formula.md)` (drop the supersession chain language — it's now one document, not a chain).
- `docs/plans/mobile-safha-remove-card-background.md` line 9: change `ADR 0012/0013` to `ADR 0011`.

## Files to Change

- `docs/plans/mobile-safha-sizing.md` — new, consolidated
- `docs/plans/fix-mobile-font-scale.md` — deleted
- `docs/plans/mobile-safha-dvh-font.md` — deleted
- `docs/plans/mobile-safha-fullscreen.md` — deleted
- `docs/plans/mobile-safha-width-driven-fill.md` — deleted
- `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md` — rewritten (merged content)
- `docs/architecture/adr/0012-mobile-fullscreen-safha.md` — deleted
- `docs/architecture/adr/0013-mobile-safha-width-driven-flex-fill.md` — deleted
- `docs/architecture/DECISIONS.md` — reference updated
- `docs/plans/mobile-safha-remove-card-background.md` — reference updated

## Constraints

- Do not touch `mobile-safha-remove-card-background.md` or `fix-mobile-swipe-direction.md` beyond the one reference fix in the former — confirmed separate concerns.
- Do not lose the load-bearing technical content (the `14.7` divisor rationale, the never-wrap backstop, the pages 1-2 centering, the breathing-room padding) — this is what a future developer needs; the abandoned-option summaries can be short.
- Keep ADR number 0011 for the merged file — do not renumber to 0013 or leave gaps.
- No code changes — docs only.

## Decisions Made

- Scope is the mobile-safha sizing cluster only (4 plans + 3 ADRs), confirmed with user — not a project-wide docs/plans/ audit.
- ADRs get merged (not just plans) — user explicitly chose this over preserving the 3-ADR audit trail.
