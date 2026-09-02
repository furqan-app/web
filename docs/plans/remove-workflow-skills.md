# Remove 5 workflow skills (impeccable, visualize-fq-design, compress-fq-docs, mujaz, ui-motion)

**Type:** feature (tooling/meta)
**Date:** 2026-09-02
**Status:** implemented
**Issue:** [furqan-app/web#494](https://github.com/furqan-app/web/issues/494) — T1.3 of epic #491

## Summary

Cut the per-task context tax from five agent skills that are heavier than the value they
return: `impeccable` (3.3 MB), `visualize-fq-design`, `compress-fq-docs`, `mujaz` +
its per-turn hook injection, and `ui-motion`. Delete the skill directories and every hook,
config block, workflow-doc step, decision entry, and ADR wiring that references them. What
each was doing that still matters is preserved in a lighter form: `mujaz`'s terse-output +
project-terminology rules become static lines in `AGENTS.md`; `ui-motion`'s core rules fold
into `docs/standards/styling.md`; design/UX scrutiny becomes a 6-item checklist in
`check-fq-standards` instead of an `/impeccable` subprocess and a 4th review dimension.
One branch, one PR — the workflow docs must never land half-wired (e.g. `start-task.md`
referencing a deleted step).

## Approach

Mechanical unwire in dependency order: `compress-fq-docs` (no coupling) → `ui-motion`
(fold then cut) → `mujaz` (hooks + config) → `impeccable` + `visualize-fq-design`
(largest, most wiring). Then `graphify update .` and the verification grep.

This is a tooling/meta change (`.claude/`, `.codex/`, `docs/workflow/`, `AGENTS.md`,
`GEMINI.md`, `.cursorrules`, `.github/`) — per `AGENTS.md`'s own scope note it is exempt
from the plan→implement gate, but this plan was produced at the user's explicit request via
`/plan-fq-task` because of the coupling risk.

### Drift reconciled against the issue body (post-#493 / #495)

The issue body was written before #493 (DECISIONS.md split) and #495 (retrospect
reposition) merged. Corrections folded into this plan:

| Issue body says | Reality now | This plan does |
|---|---|---|
| Edit `DECISIONS.md` `## Impeccable Design Workflow Integration` | #493 moved it to `docs/workflow/impeccable-integration.md` | Delete that file whole |
| Edit `DECISIONS.md` `## Documentation & Workflow System` | #493 folded it into `docs/workflow/INDEX.md`; nothing impeccable-specific remains | No action |
| Fix `DECISIONS.md` `## Design Language :355` | #493 moved it to `docs/architecture/decisions/theming.md` (`## Design Language`, :36–56) | Edit `theming.md:47` |
| `docs/architecture/DECISIONS.md` edits (`## Impeccable…`, `## Documentation…`, `:355`) | The thin index has zero impeccable / DESIGN.md / ui-motion refs | No `DECISIONS.md` edit at all |
| Repoint `docs/architecture/DECISIONS.md:694` (ui-motion) | Not in the index; the ref is `docs/architecture/decisions/reader.md:174` | Edit `reader.md:174` |
| `.claude/settings.json` — keep `retro-nag.js` in `Stop` | #495 never added it; `Stop` holds only `mujaz-stats.js` | Remove the `Stop` key entirely |
| `.claude/skills/start-fq-task/SKILL.md:204` impeccable line | The legacy body has no Design-Remediation step; only :183 (`ui-motion`) needs a repoint | Edit :183 only |
| Delete `.agents/skills/{…}` copies | `.agents/skills` is a symlink → `../.claude/skills` | Deleting the `.claude/skills/` dirs covers it; no separate action |
| `.codex/hooks.json` — drop 3 mujaz entries | Confirmed: `SessionStart`, `UserPromptSubmit`, `Stop` are all mujaz; `PreToolUse` graphify stays | Remove those 3 keys |
| `docs/workflow/impeccable-integration.md` "created by #493" — delete | Confirmed present | Delete |

## Decision Tree / Algorithm — what to do with each reference class

| Reference class | Action |
|---|---|
| The 5 skill directories under `.claude/skills/` | **Delete** (symlink `.agents/skills` follows) |
| `mujaz` hook scripts (`.claude/hooks/mujaz-*` ×5, `.codex/hooks/mujaz-*` ×5) | **Delete**; `.claude/.mujaz-stats.json` too |
| Hook wiring in `.claude/settings.json` / `.codex/hooks.json` | **Delete** the `SessionStart` / `UserPromptSubmit` / `Stop` / `statusLine` blocks; **keep** `PreToolUse` (graphify) verbatim |
| `docs/workflow/` docs that ARE one of these skills (`compress-docs.md`, `ui-motion.md`, `terse-mode.md`, `impeccable-integration.md`) | **Delete** the file |
| Workflow-doc *steps / sections* that invoke a deleted skill (`plan-task.md`, `start-task.md`, `review-work.md`) | **Excise** the step, renumber siblings, remove matching anti-pattern lines |
| Skill `SKILL.md` files that describe a deleted integration (`review-fq-work`, `start-fq-task`) | **Edit** description + body to drop the 4th-dimension / ui-motion mention |
| `AGENTS.md` `## impeccable` section | **Delete** the section |
| Terse-mode pointers in `.cursorrules` / `.github/copilot-instructions.md` | **Replace** with one inline conciseness line |
| Rules the deleted skills carried that still matter (terse output, project terminology, ui-motion core, design/UX scrutiny) | **Relocate** — see "Preservation" below |
| ADR 0041 (the wiring ADR) | **Status → Superseded by #494**; keep the file (audit trail) |
| ADR 0047, ADR 0057, `docs/plans/design-migration/*`, historical `docs/plans/*` with `## Design Remediation` | **Breadcrumb only** — one note that the `/impeccable` gate was removed by #494; leave historical bodies intact |
| `DESIGN.md` (repo root) | **Keep, hand-maintained** — drop all "generated via `/impeccable document`" language; add a one-line "hand-maintained token summary" note |

## Preservation — what the deleted skills did that must survive

1. **Terse output + project terminology** (was: `mujaz-mode.js` per-turn injection). Add to
   `AGENTS.md` a short `## Response style` section:
   - one conciseness line: "Keep responses concise — no filler, no preamble, no tool-call narration."
   - the PROJECT TERMINOLOGY rule: use "surah" (not "chapter"), "verse" (not "ayah"),
     "word-level" for word-granularity marking, "mushaf" for the page/layout view; match the
     casing/terms in `docs/standards/` and the Prisma schema (Chapter/Verse/Word models,
     but "surah"/"verse" in prose).
2. **ui-motion core** (was: `docs/workflow/ui-motion.md`, ~130 lines). Fold a **condensed
   ~25–30 line "Motion" subsection** into `docs/standards/styling.md`, replacing/expanding
   the existing Animation paragraph (:40–44): the animate-or-not frequency table, easing +
   duration rules (curves as CSS vars; entering→`ease-out`, in-place→`ease-in-out`, never
   `ease-in`; duration ceilings), press/enter component states (`active:scale-[0.97]`,
   never enter from `scale(0)`, Radix transform-origin), `prefers-reduced-motion` handling,
   and the `@media (hover:hover) and (pointer:fine)` hover gate. **Drop** the "reference
   techniques" grab-bag and the Before/After review-checklist table.
3. **Design/UX scrutiny** (was: `/impeccable critique` in plan/implement + review Dimension 4).
   Add a **`### Design & UX` subsection to `docs/workflow/check-fq-standards.md`'s
   Regression Classes**, 6 items: a11y contrast (WCAG AA), visual hierarchy, spacing scale
   adherence, RTL/LTR parity, touch-target size, reduced-motion honored. No subagent, no
   separate gate. Also add the one-liner to `.claude/skills/check-fq-standards/SKILL.md`'s
   description so it advertises the new coverage.
4. **compress-fq-docs** — intent already replaced by epic child #497 (a `docs/plans/INDEX.md`
   + a "fold addenda on ship" rule). Nothing to preserve here.
5. **visualize-fq-design** — mockup brainstorming; no durable rule to preserve.

## Files to Change

### Delete (directories / files)
- `.claude/skills/impeccable/` · `.claude/skills/visualize-fq-design/` · `.claude/skills/compress-fq-docs/` · `.claude/skills/mujaz/` · `.claude/skills/ui-motion/`
- `.claude/hooks/mujaz-config.js` · `mujaz-mode.js` · `mujaz-stats.js` · `mujaz-statusline.sh` · `mujaz-toggle.js`
- `.codex/hooks/mujaz-config.js` · `mujaz-mode.js` · `mujaz-stats.js` · `mujaz-statusline.sh` · `mujaz-toggle.js`
- `.claude/.mujaz-stats.json` (and `.claude/.mujaz-off` if present)
- `docs/workflow/compress-docs.md` · `docs/workflow/ui-motion.md` · `docs/workflow/terse-mode.md` · `docs/workflow/impeccable-integration.md`

### `.claude/settings.json`
- Remove `hooks.SessionStart`, `hooks.UserPromptSubmit`, `hooks.Stop`, and the top-level `statusLine` block.
- Keep `hooks.PreToolUse` (both `Bash|Grep` and `Read|Glob` graphify entries) exactly as-is.
- Result: `{ "hooks": { "PreToolUse": [ … ] } }`.

### `.codex/hooks.json`
- Remove `hooks.SessionStart`, `hooks.UserPromptSubmit`, `hooks.Stop`.
- Keep `hooks.PreToolUse` (graphify `Bash`) as-is.

### `CLAUDE.md`
- Delete the `## Hooks` section (:6–10). Leave `## graphify`.

### `AGENTS.md`
- Delete `## impeccable` section (:112–124).
- Add a `## Response style` section (near the top, after the agent-pointer block or before `## Project`) with the two preserved rules from Preservation #1.
- `:42` and `:78` — keep the `DESIGN.md` mentions but ensure no "generated" wording is introduced; DESIGN.md stays listed as a design doc.
- `:6` "Antigravity (AGY): see `GEMINI.md` and `.agents/skills/`" — unchanged (symlink still valid).

### `.cursorrules`
- Item 4 (:24–25): replace the `terse-mode.md` pointer with one inline line — "Keep responses concise and direct — no conversational filler, no preamble."

### `.github/copilot-instructions.md`
- Item 3 (:17–18): same inline replacement for the `terse-mode.md` pointer.

### `GEMINI.md`
- No change — line 6 lists only kept skills; `.agents/skills/` symlink still resolves.

### `docs/workflow/INDEX.md`
- Remove the three rows in the "Doc & UI Utilities" table (:66 compress-fq-docs, :67 ui-motion, :68 Terse mode). The table is then empty → remove the `### Doc & UI Utilities` heading and the table.
- Core Cycle diagram / list unchanged (still `Refine → Plan → Implement → Review → Retrospect → Ship`).

### `docs/workflow/plan-task.md`
- Delete the "UI-mode design pass" paragraph (:45).
- Delete `## Design Remediation` from the plan-file-format template (:108–109).
- Replace both with one prose line in Step 2: "UI tasks — consult `docs/design/design-principles.md` + `docs/standards/styling.md`, and list any UI/UX concerns directly in the plan."
- Remove the two impeccable anti-pattern lines at the bottom if present (the `## Design Remediation` / ADR 0041 ones).

### `docs/workflow/start-task.md`
- Delete Step 5 "Design remediation (if planned)" (:45–49). Renumber: 6→5 (post-impl guardrail), 7→6 (record decisions), 8→7 (report).
- Step 2 (:30): replace "load `docs/workflow/ui-motion.md` for motion and polish guidance" with "see the Motion subsection of `docs/standards/styling.md`". Keep the `design-principles.md` / `APP_PURPOSE.md` reads.
- Step 8/now-7 (report): delete the "Which `## Design Remediation` commands ran, if any" bullet (:66).
- Delete the impeccable anti-pattern line (:80).

### `docs/workflow/review-work.md`
- Intro (:3): "across three dimensions, plus a fourth design/UX dimension when the diff touches UI files" → "across three dimensions".
- Step 1 (:44): delete the "this review gets a 4th dimension (Design & UX)" paragraph.
- Delete Step 3 "Design & UX dimension" (:78–80). Renumber Step 4 "Next step" → Step 3.
- The review-prompt already says "three dimensions" — no change there.

### `.claude/skills/review-fq-work/SKILL.md`
- Description (:4): drop "Adds a 4th dimension, design and UX via /impeccable critique, when the diff touches UI files."
- Delete the `## Dimension 4 (Design & UX)` section (:18–20).
- Legacy body already says "three dimensions" — leave it.

### `.claude/skills/start-fq-task/SKILL.md`
- `:183`: replace "invoke the `ui-motion` skill for motion and polish guidance" with "see the Motion subsection of `docs/standards/styling.md`".

### `docs/standards/styling.md`
- Expand `## Animation` (:40–44) into a `## Motion` section per Preservation #2. Keep the existing `tailwindcss-animate` not-installed fact; drop the trailing "see the `ui-motion` skill" clause.

### `docs/workflow/check-fq-standards.md`
- Add `### Design & UX` to Regression Classes per Preservation #3 (6 items).

### `.claude/skills/check-fq-standards/SKILL.md`
- Description: add "design/UX basics (contrast, hierarchy, spacing, RTL parity, touch targets, reduced-motion)" to the checked-domains list.

### `docs/architecture/decisions/theming.md`
- `## Design Language`, bullet at :47: "`design-principles.md` is canonical and generates root `DESIGN.md` via `/impeccable document`. Changing one without regenerating the other leaves the ADR 0041 review gate enforcing the superseded language." → "`design-principles.md` is canonical. `DESIGN.md` (repo root) is a hand-maintained token summary — keep it in sync when tokens change here."

### `docs/architecture/decisions/reader.md`
- `:174`: "the `ui-motion` skill rules out animating keyboard-initiated and high-frequency actions outright" → "`docs/standards/styling.md`'s Motion section rules out animating keyboard-initiated and high-frequency actions outright".

### `docs/design/design-principles.md`
- `:5`: "`DESIGN.md` at repo root is a generated token extraction for the impeccable skill — regenerate it via `/impeccable document` after changing this file, don't hand-edit it." → "`DESIGN.md` at repo root is a hand-maintained token summary — update it when you change tokens here."

### `DESIGN.md` (repo root)
- Add a one-line note under the frontmatter: hand-maintained token summary derived from `docs/design/design-principles.md`; no generator. No token-value changes.

### `docs/architecture/adr/0041-wire-impeccable-into-fq-workflow.md`
- `**Status:** Accepted` → `**Status:** Superseded by #494 (2026-09-02)`.
- Add one line under Status: "The `/impeccable` skill and its plan/implement/review wiring were removed; design/UX scrutiny is now a manual checklist in `docs/workflow/check-fq-standards.md`. See `docs/plans/remove-workflow-skills.md`."
- Leave the body (Context/Options/Decision/Consequences) intact as the audit trail.

### `docs/architecture/adr/0047-adopt-reader-lab-design-language.md`
- Add a `> Note (2026-09-02, #494):` line near the top: the `/impeccable` review gate referenced in Context and in point 4 no longer exists; design-language alignment during the migration is a manual review concern. Leave the decision body intact.

### `docs/architecture/adr/0057-decisions-split-by-domain.md`
- `:30` mentions moving "Impeccable Design Workflow Integration" to `docs/workflow/`. Add a trailing clause: "(that file, `docs/workflow/impeccable-integration.md`, was later deleted by #494)". Accurate record, minimal touch.

### `docs/plans/design-migration/INDEX.md` and `1.1-rewrite-design-principles.md`
- One `> Note (#494):` banner at the top of each: the `/impeccable` gate / `DESIGN.md` regeneration steps described below are obsolete — `DESIGN.md` is hand-maintained and there is no `/impeccable` review gate. Leave the phase records intact (programme is complete).

### `docs/plans/wire-impeccable-workflow.md`
- `**Status:** implemented` → `**Status:** superseded by #494 (2026-09-02)`. Add a one-line pointer to `docs/plans/remove-workflow-skills.md`.

### `docs/plans/split-decisions-by-domain.md`
- `:121`, `:72`, `:134` already anticipate #494 ("deleted by #494", "update only if it still exists"). Leave as-is — they are accurate historical notes.

### Historical plans with `## Design Remediation` sections
- `home-nav-search.md`, `home-page-design-fixes.md`, `shared-mushaf-access.md`, `tajweed-stylesheet-hover-suppression.md`, `copy-share-verses.md`, `reader-lab-nocturnal-desktop.md`, `arrow-controls-desktop.md`, `sidebar-tab-filters.md`, `brand-mark-icons.md` — **leave as-is** (records of past work).

### After all edits
- `graphify update .` (drops the deleted skills' nodes, including the `live-browser.js` graph pollution noted in epic child #497/T1.7).

## Verified Test Cases — "Done when"

1. `grep -rniE 'impeccable|ui-motion|mujaz|compress-fq-docs|visualize-fq-design|terse-mode' docs/ .claude/ .codex/ AGENTS.md CLAUDE.md GEMINI.md .cursorrules .github/`
   returns **only**: the superseded ADR 0041, the ADR 0047 / 0057 notes, the design-migration
   banners, `wire-impeccable-workflow.md`, `split-decisions-by-domain.md`, and the ~9
   historical `docs/plans/*` records. No hits in any live skill, hook, config, or active
   workflow doc.
2. `npm run lint` passes.
3. Read-through of `plan-task.md`, `start-task.md`, `review-work.md` end to end: every step
   number is contiguous, no step references a deleted step, no dangling `## Design
   Remediation` / "Dimension 4" / `ui-motion` link.
4. `.claude/settings.json` and `.codex/hooks.json` parse as valid JSON and contain only the
   `PreToolUse` graphify entries under `hooks`.
5. `node -e "require('./.claude/settings.json')"` — no reference to a deleted hook script.
6. `.agents/skills/` symlink still resolves (`ls .agents/skills/` lists the remaining skills).
7. `git grep -n 'Design Remediation' -- 'docs/workflow/*'` → no hits.

## Constraints

- **One PR.** No intermediate commit may leave a workflow doc referencing a deleted step or skill.
- **Keep `PreToolUse` graphify hooks** in both `.claude/settings.json` and `.codex/hooks.json` — untouched.
- **Do not touch** `retro-nag` (it does not exist in `Stop`; if a later branch added it, leave it).
- **Do not delete or rewrite** ADR 0041's body, the design-migration phase records, or the
  historical `docs/plans/*` — breadcrumb annotations only.
- `DESIGN.md` token values are not edited — only its "how it's maintained" note.
- No app code (`app/`, `components/`, `lib/`, `prisma/`) is touched. Docs, skills, hooks, agent config only.
- Terminology/style rules moved to `AGENTS.md` must be shorter than the hook injection they replace — a few lines, not a section.

## What NOT to Do

- Do not edit `docs/architecture/DECISIONS.md` — the thin index has no impeccable / ui-motion / DESIGN.md content (that all moved in #493). Editing it per the stale issue-body instructions would touch the wrong file.
- Do not create `.agents/skills/` deletions — it is a symlink to `.claude/skills/`.
- Do not add `retro-nag.js` to any `Stop` array — #495 deliberately dropped that hook; `/retrospect` stays manual.
- Do not port `ui-motion.md` wholesale into `styling.md` — condensed core only (user decision); the reference-techniques grab-bag and the Before/After table are dropped.
- Do not delete `DESIGN.md` — it is kept and hand-maintained (user decision).
- Do not rewrite ADR 0047 / 0057 prose — breadcrumb notes only (user decision).
- Do not build a design/UX subagent or a separate review gate — the replacement is a plain checklist in `check-fq-standards` (user decision).
- Do not keep `docs/workflow/impeccable-integration.md` "because #493 just created it" — it is explicitly in scope to delete.
- Do not compress or reflow unrelated parts of the workflow docs while editing — excise the named steps and nothing more (that was `compress-fq-docs`'s job and it is being removed).

## Decisions Made

- New plan file (not an addendum to `wire-impeccable-workflow.md`): #494 is a dedicated epic child with its own issue and PR, and its scope is 5 skills, not just impeccable. `wire-impeccable-workflow.md` gets a superseded breadcrumb pointing here.
- ADR 0041 → Superseded (kept as audit trail); no new ADR — the plan + the superseded marker + the `docs/workflow/INDEX.md` table updates are the record. Workflow/process decisions live in `docs/workflow/`, not `decisions/` (per the INDEX).
- `DESIGN.md`: keep, hand-maintained.
- `ui-motion.md`: condensed ~25–30 line Motion section in `styling.md`.
- Design/UX gate replacement: 6-item checklist in `check-fq-standards`, no subagent.
- ADR 0047 / 0057 / design-migration: breadcrumb annotations only.
- `mujaz` preservation target: a short `## Response style` section in `AGENTS.md` (terminology + one conciseness line).
