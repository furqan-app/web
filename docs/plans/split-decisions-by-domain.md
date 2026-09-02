---
title: Domain-split DECISIONS.md into decisions/*.md + thin always-loaded index
type: feature
date: 2026-09-02
status: implemented
area: workflow
supersedes: [ai-docs-workflow-system]
issue: 493
adr: [0057]
---

# Domain-split DECISIONS.md into decisions/*.md + thin always-loaded index

## Summary

`docs/architecture/DECISIONS.md` is 55 sections / ~1130 lines / ~58k tokens and is loaded **in full** on every `/plan-fq-task` and `/start-fq-task`. Split its sections verbatim into ~18 per-domain files under `docs/architecture/decisions/`, mirroring `docs/standards/`. `DECISIONS.md` stays at its path and becomes a thin always-loaded **index**: a Non-negotiable Invariants block + a routing table. Workflow docs switch from "read DECISIONS.md in full" to "read the index + the 1–3 domain files your task touches". Lands in one commit updating all ~17 reference sites. Full rationale + rejected options in ADR 0057.

## Approach

### 1. Target structure

```
docs/architecture/
  DECISIONS.md              # thin index: invariants block + routing table (~60 lines)
  decisions/
    api.md  db.md  i18n.md  marks.md  nav.md  observability.md  plans.md
    pwa.md  reader.md  recitation.md  release.md  rendering.md  search.md
    sharing.md  surah-layout.md  tafsir.md  testing.md  theming.md
  adr/                      # unchanged
  COMPONENTS.md             # unchanged (its own ticket if ever split)
```

### 2. Section → domain-file mapping (verified against the current 55 sections)

| # | DECISIONS.md section | → file |
|---|---|---|
| 1 | Static Generation Strategy | `rendering.md` |
| 2 | Font System | `rendering.md` |
| 3 | Database Connection | `db.md` |
| 4 | Database Split (Quran vs Application) | `db.md` |
| 5 | Local Development Databases (Docker & Seeding) | `db.md` |
| 6 | Middleware Chain | `api.md` |
| 7 | Root-Layout Network Budget | `pwa.md` |
| 8 | Auth | `api.md` |
| 9 | i18n | `i18n.md` |
| 10 | API Response Shape | `api.md` |
| 11 | UI Component Library | `theming.md` |
| 12 | Root-Layout Open Graph / Social Metadata | `sharing.md` |
| 13 | Sidebar Loading | `nav.md` |
| 14 | Sheet `top` Overrides Must Also Neutralize `h-full` | `nav.md` |
| 15 | Nav Z-Index Invariant | `nav.md` |
| 16 | Sidebar Trigger Architecture | `nav.md` |
| 17 | Nav-Mounted State Must Be Live, Not One-Shot | `nav.md` |
| 18 | Surah Banner Placement — IMPLEMENTED (gap-derived) | `surah-layout.md` |
| 19 | PageMetadata | `db.md` |
| 20 | Search | `search.md` |
| 21 | Theme Architecture | `theming.md` |
| 22 | Design Language (reader-lab migration, in progress) | `theming.md` |
| 23 | Reader Surface Depth | `reader.md` |
| 24 | Desktop Reading Group (≥1367px) | `reader.md` |
| 25 | Quran Safha Viewport Fit | `reader.md` |
| 26 | Shared Mushaf Access | `marks.md` |
| 27 | Mushaf Double-Page Spread | `reader.md` |
| 28 | PWA & Offline Quran Page Caching | `pwa.md` |
| 29 | App Launch & Back Navigation (Android PWA) | `pwa.md` |
| 30 | First-Paint-Critical Positioning Must Be CSS-Gated | `reader.md` |
| 31 | Full-Viewport Heights Anchor to the ICB, Not Viewport Units | `reader.md` |
| 32 | Release & Deployment Workflow | `release.md` |
| 33 | Error Tracking | `observability.md` |
| 34 | Reader Navigation — Persistent Client Pager | `reader.md` |
| 35 | Swipe Animation — Core Gesture Only | `reader.md` |
| 36 | Sentry-to-Slack Alerting | `observability.md` |
| 37 | Structured Logging (fq-logger) | `observability.md` |
| 38 | E2E Testing (Behavioral Playwright Suite) | `testing.md` |
| 39 | Documentation & Workflow System | → `docs/workflow/` (see step 4) |
| 40 | Impeccable Design Workflow Integration | → deleted by #494; if #493 lands first, → `docs/workflow/` |
| 41 | Verse/Word Comments | `marks.md` |
| 42 | Color Marks Are Semantic Categories | `marks.md` |
| 43 | A Mark Is a Category Plus an Optional Comment | `marks.md` |
| 44 | Recitation Playback | `recitation.md` |
| 45 | Offline Recitation Audio | `pwa.md` |
| 46 | Mushaf Editions & Word Placement | `rendering.md` |
| 47 | Tajweed Mushaf Mode | `rendering.md` |
| 48 | Awrad & Learning Plans Engine | `plans.md` |
| 49 | Notification System | `observability.md` |
| 50 | CI: E2E Skip on Config-Only PRs | `testing.md` |
| 51 | CI: Quality Gate (Lint, Type-Check & Unit Tests) | `testing.md` |
| 52 | Dark Theme Color Semantics: Gold vs Emerald | `theming.md` |
| 53 | Unified Accent System: Gold → Emerald | `theming.md` |
| 54 | Developer Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit | `testing.md` |
| 55 | Tafsir: Client-Side Direct QDC Provider & Quote Normalization | `tafsir.md` |

Single-section files (`i18n`, `search`, `recitation`, `plans`, `surah-layout`, `sharing`, `tafsir`, `release`) are intentional — small and focused, exactly like `docs/standards/pwa-testing.md`. A task opens 1–3.

### 3. The index (`DECISIONS.md` after the split)

```markdown
# Active Decisions — Index

Architectural decisions are split by domain under `decisions/`. Load this file
always; then load the 1–3 `decisions/*.md` files your task's domain touches.
The `adr/` directory is the historical audit trail (humans, not the hot path).

## Non-negotiable invariants  (full text in the linked domain file)

- Quran page routes never get server-side dynamic rendering. → `decisions/rendering.md`
- Never FK or Prisma-relate across `furqan_quran` ↔ `furqan_app`; scalar ids only. → `decisions/db.md`
- Never mutate a live `<style>` carrying `@font-face` rules; add immutable units only (ADR 0029). → `decisions/rendering.md`
- `commitTo` is the only in-reader navigation primitive — no `router.push` for swipe/arrows/recitation-follow, never read `usePathname()` for the current page (ADR 0028). → `decisions/reader.md`
- Breakpoint-dependent positioning is CSS-`@media`-gated, never JS-hook-gated (ADR 0043). → `decisions/reader.md`
- Any verse→page lookup resolves through the active mushaf edition (ADR 0033). → `decisions/rendering.md`

## Domains

| Domain | File | Covers |
|---|---|---|
| Quran text & fonts | `decisions/rendering.md` | static generation, per-page font registry, mushaf editions, tajweed |
| Reader surface | `decisions/reader.md` | persistent pager, swipe, double-page, reading-size contracts, first-paint positioning |
| … one row per file … |
```

### 4. Meta sections out of the decisions tree

- "Documentation & Workflow System" (§39) → fold into `docs/workflow/INDEX.md` (it already describes the same flow).
- "Impeccable Design Workflow Integration" (§40) → `docs/workflow/` if #493 lands before #494; otherwise #494 deletes it. Coordinate at implement time by re-checking whether the section still exists.

### 5. `**Status:**` field on every moved section

Each section gets `**Status:** active` or `**Status:** superseded by <x> (YYYY-MM-DD)` immediately under its `## ` heading. Fix the in-title markers while moving: "Surah Banner Placement — IMPLEMENTED" → "Surah Banner Placement" + `**Status:** active`; "Design Language (reader-lab migration, in progress)" → "Design Language" + `**Status:** active — migration in progress`.

## Files to Change

**New:** `docs/architecture/decisions/*.md` (18 files) · `docs/architecture/adr/0057-decisions-split-by-domain.md` (done, this branch).

**Rewritten:** `docs/architecture/DECISIONS.md` → the index.

**Reference updates (retarget "read DECISIONS.md in full" → "read the index + task-domain files"):**
- `.claude/skills/`: `plan-fq-task/SKILL.md`, `start-fq-task/SKILL.md`, `check-fq-standards/SKILL.md`, `retrospect/SKILL.md`, `review-fq-work/SKILL.md`, `compress-fq-docs/SKILL.md` *(compress-fq-docs is deleted by #494 — update only if it still exists)*
- `docs/workflow/`: `plan-task.md`, `start-task.md`, `check-fq-standards.md`, `review-work.md`, `retrospect.md`, `refine-task.md`, `INDEX.md`, `compress-docs.md` *(same #494 caveat)*
- root: `AGENTS.md`, `.cursorrules`, `.github/copilot-instructions.md`

**`check-fq-standards`** (skill + workflow doc): the pre/post grep step retargets from `docs/architecture/DECISIONS.md` to the `decisions/*.md` file(s) for the task's domain. The static "Regression Classes" list stays; update its "last reconciled" note and any `[Font System, ADR 0029]`-style section tags to name the new file.

**`start-task.md` / `plan-task.md`** gain a decisions-domain task-type table mirroring their existing `docs/standards/` one (e.g. "reader/pager/swipe work → `decisions/reader.md` + `decisions/rendering.md`").

## Constraints

- **Move prose verbatim.** No rewrites, no summarizing, no "while I'm here" edits to decision content. The only per-section change is adding the `**Status:**` line and de-titling status markers.
- **One commit.** The rewritten `DECISIONS.md`, all 18 new files, and every reference update land together. No intermediate commit leaves a dangling "read DECISIONS.md in full" pointing at the thin index with no routing.
- **Drain open worktrees first.** At implement time, `git worktree list` — if any worktree other than this one exists on a branch with app/docs work, flag it to the user before merging (a pre-split worktree's `check-fq-standards` greps the thin index, finds nothing, passes vacuously).
- **The index keeps a real routing table**, not just a "moved, see decisions/" stub — so a stale grep against it obviously returns nothing useful rather than silently "passing".
- Every ADR link that moves into a domain file keeps working — domain files are one level deeper (`decisions/`), so `adr/NNNN-…` links become `../adr/NNNN-…`.
- No content dedup between a domain file and its ADR in this task — that is a separate, per-section follow-up (ADR 0057 says collapse only once the ADR demonstrably carries the detail).

## What NOT to Do

- Do not collapse any section to a summary + ADR pointer. Rejected in ADR 0057 — the ADRs don't carry the detail.
- Do not introduce a separate `decisions/INDEX.md`. `DECISIONS.md` *is* the index, in place — one well-known path, most existing refs stay meaningful.
- Do not route workflow docs at graphify for decisions. Rejected in ADR 0057 (headings-only ingest; non-Claude agents can't run it).
- Do not split `COMPONENTS.md` in this task — separate concern, separate ticket if ever.
- Do not rename or renumber any ADR (that was #492).
- Do not change `docs/standards/` — it is already correctly split and is the model being copied.
- Do not merge while another worktree is mid-task on a pre-split `DECISIONS.md`.

## Decisions Made

- `DECISIONS.md` becomes the index in place; no separate `INDEX.md`. *(deferred to Claude by the user, 2026-09-02)*
- The index carries a ~6-line Non-negotiable Invariants block, not pure routing. *(same)*
- Every moved section gets an explicit `**Status:**` field. *(same)*
- ~18 domain files, single-section files allowed. Mirrors `docs/standards/` granularity.
- Meta sections leave the decisions tree for `docs/workflow/`.
- See ADR 0057 for the two rejected alternatives (collapse-to-summary, graphify-query).
