# Session handoff — design migration (#360)

**Written:** 2026-08-22
**Status of the work:** all 13 subtasks implemented and committed. Nothing is half-finished.
**This file is untracked on purpose.** It is session continuity, not project canon. Delete it before the PR, or `git add` it if you'd rather keep it. Everything durable is already in the plans, `DECISIONS.md`, and ADR 0047.

---

## 1. Where things stand

| | |
|---|---|
| Worktree | `/home/tahamohamed/Desktop/cs/non-work/projects/furqan-design-migration` |
| Branch | `feature/360-design-migration` (13 commits ahead of `main`) |
| Issue | https://github.com/furqan-app/web/issues/360 |
| Dev server | port **3006**, currently **running** (`next-server`, pid 858351) → http://localhost:3006 |
| Working tree | clean except `?? .claude/launch.json` |
| PR | **not opened yet** |

Commits, newest first — one per subtask, deliberately not squashed:

```
e3dc9e2 5.1d recitation rail: full-height icons-only column
140e9c2 docs(design): close out the migration — canon, ADR 0047 addendum, DESIGN.md banner
e144d46 5.1c collapse production's 768-1023 in-between band
407a37f 5.1b page face: mushaf token values, spread pool, ornament as identity
e6e7aab 5.1a reader stage: desk atmosphere, folio cap, quiet arrows
5799332 4.4 mushaf hub and shared-grant surfaces
6d457a4 4.3 search and settings surfaces
f9e0c2f 4.2 home screen
86ebf6d 4.1 marks and plans screens
0b51baa 3.2 shared chrome
8b93d6f docs(design): mark Phase 0-3.1 complete in the migration index
949726f 3.1 UI primitives
b070184 2.1 semantic tokens
3bc2f82 1.1 rewrite the canon
```

The working model is fixed and should not be changed mid-flight: **one branch, one PR, one commit per subtask.** That is the only thing keeping a migration-sized PR reviewable and a bad subtask revertable.

---

## 2. Commit convention for feedback fixes

The one-commit-per-subtask rule covers the **13 subtasks**. Fixes made in response to the user's review feedback are **not** subtasks and do not get folded into them.

**Append a new commit per fix. Never amend, never rebase, never squash.**

```
fix(<subtask>): <what changed>
```

where `<subtask>` is the number that owns the surface — e.g. `fix(5.1d): rail transport drifts when stop button mounts`, `fix(4.2): lattice hairline invisible on gold`.

Why append rather than amend the owning commit:

- The owning commits are up to 12 deep. Amending one means an interactive rebase, and **`git rebase -i` is not available in this environment.**
- Rewriting history invalidates any review already done against those SHAs.
- Revertability is the entire reason the working model bans squashing. A `fix:` commit that turns out wrong reverts cleanly; a silently amended subtask does not.

If one piece of feedback spans several subtasks, prefer one commit per subtask over one sprawling commit — same reason.

Commit with **explicit paths**, never `git add -A` (see §7 — that mistake already happened once on this branch). And no AI signature / `Co-Authored-By` trailer.

---

## 3. Read these first, in this order

1. `docs/plans/design-migration/INDEX.md` — the umbrella plan, the phase table, and the working model.
2. `docs/design/design-language.md` — the spec every phase implements against. The lab's value is a set of **rules**, not fourteen hex values.
3. `docs/architecture/adr/0047-adopt-reader-lab-design-language.md` — including the **"Phases 3–5" addendum**, which holds five findings that only surfaced during implementation.
4. `docs/architecture/DECISIONS.md` — gained ~12 entries on this branch.
5. The individual subtask plan whose area you're touching. Each is marked `implemented` and carries a long implementation-notes section describing what actually happened, which is often not what the plan predicted.

---

## 4. What is left before merge

None of it is blocked by code. All four items are user-triggered or deliberately deferred — **do not start any of them without the user saying so.**

1. **Regenerate root `DESIGN.md`** via `/impeccable document`, then delete the migration banner at its top. ADR 0041 excludes `document` from what a task may execute, so it could not be done from inside the migration work. Its `colors:` frontmatter block was hand-corrected in the meantime so the review gate isn't reading stale values.
2. **Regenerate visual baselines** via the `workflow_dispatch` CI job, targeting `feature/360-design-migration`. **Never commit locally generated PNGs.**
3. **Add snapshot coverage for `/mushaf`** — 4.4's plan asked for it. Deferred on purpose: adding a spec before the baseline run lands a failing test. Do it after item 2.
4. **Decide `.claude/launch.json`** — untracked, never discussed. Commit or delete.

---

## 5. What was never verified

Headless probes have no session, and some surfaces have no probe at all. Nothing below is known broken — it is simply unobserved, and the migration touched shared tokens that reach all of it.

- Tajweed rendering
- The vertical-pages route
- The shared-grant reader
- Slow-network page turns
- The installed-PWA fullscreen transition
- The **signed-in** bodies of marks, plans, and the mushaf hub (only the signed-out prompts were seen)

---

## 6. One flagged deviation

Reading size in the `768–1023px` band moves **26px → 28px**. That band now uses compact's font-from-width cap instead of the desktop card clamp, because 5.1c collapsed the band into compact. The result stays within ADR 0038's presets and moves upward, but 5.1's plan literally required reading size unchanged. It is called out in 5.1's notes; the user has not ruled on it.

---

## 7. Hard-won facts — these cost real time to find

**Verify by sampling rendered pixels, never by reading declarations.** This is the single most important line in this file. The folio cap, the ornament specificity loss, the rail's background, the warning-token contrast, and the theme-forcing failure were *all* invisible in the source and *all* correct-looking in the CSS. Every one was caught by measuring.

### CSS

- `app/globals.css` is one `@layer base` block, so it loses to Tailwind's utility layer at equal specificity by source order. Hence the heavy `!important`. **`!important` ties at equal specificity still resolve by source order.**
- **`.fq-chrome-bar` is declared late (~line 2400+) at `(0,1,0)`.** Anything else at `(0,1,0)` that tries to override it *loses the tie* even though it reads correctly in the file. This bit the recitation rail: `background` and `box-shadow: none` sat there looking applied while the computed style was opaque chrome. Fix by doubling the selector (`.fq-chrome-bar.fq-recitation-bar-rail`), not by moving the block. There's a `DECISIONS.md` entry on this.
- **Theme-scoped blocks outrank theme-agnostic ones.** `:root.theme-dark .fq-spread .x` is `(0,4,0)`; a new theme-agnostic rule at `(0,3,0)` silently does nothing in that theme. Two such blocks had to be deleted in 5.1b.
- `tailwindcss-animate` is **not installed**. `animate-in`, `fade-in-*`, `slide-in-from-*` are inert no-ops. Use Radix `data-[state=…]` with `transition-*`.
- **ADR 0032:** dark `--background` is RGB `(7,15,23)` — about 7 points of headroom. A declared shadow produces *no pixels*. Depth **rules** are shared across themes; only **values** differ.
- **ADR 0036:** `height: 100%` inside a flex-grown box resolves to `auto`. Height travels by `align-items: stretch`. The folio cap failed three times on this — `min(100%, …)` on the grown column gave 654px, and so did `max-height` + `margin-block: auto` (an auto cross-axis margin cancels `stretch`). It worked only by capping the child *inside* the already-stretched column.
- **ADR 0043:** band selection must be CSS-gated. Never a JS breakpoint in the display path.
- **ADR 0044:** viewport units are unreliable in the installed PWA. Use ICB-anchored `position: fixed; inset: 0`.
- `position: sticky` is trapped by an ancestor `overflow: hidden` — that ancestor becomes the scroll container. `.fq-section-group` clips to its radius, so `.fq-section-group-open { overflow: visible }` exists for headings that must stick to the viewport.
- A bare `<span>` used as a decorative box measures **0px** — inline elements ignore width/height. `.fq-rule-mark` needs `display: inline-block`.
- Before naming a new utility class, **grep for it**. `.fq-ornament` collided with an existing `QuranSafha.tsx` usage and turned every footer marker into a 58×10 hairline box; invisible on the four screens that introduced it. Renamed `.fq-rule-mark`.

### Device classes (three, after 5.1c)

- **compact `<1024`** — one page, full-bleed
- **spread `1024–1366`** — facing pages, full-bleed
- **desk `≥1367×800`** — facing pages, the desk (atmosphere, folio cap, vertical rail)

`app/hooks/use-is-mobile.ts` `MOBILE_QUERY` is `(max-width: 1023px)` and is tied to this. The old `768–1023` in-between band no longer exists.

### JSX / React

- **A `//` comment between `<XTrigger asChild>` and its child is a text child**, so Radix `Slot` throws `React.Children.only expected to receive a single React element child` and the route dies — at one viewport only, which is how it got missed. Use `{/* … */}` above the trigger, or put the comment inside the opening tag between attributes.

### Probing / tooling

- **Throwaway Playwright scripts must live at the main repo root** or `@playwright/test` won't resolve (`ERR_MODULE_NOT_FOUND`). `/tmp` does not work.
- **Screenshots must be written under the main repo's `.playwright-mcp/`** — outside the MCP allowed roots they silently write nothing.
- **Forcing a theme by assigning `document.documentElement.className` does not hold** — `useTheme`'s effect reverts it, so any screenshot taken after an interaction silently shows the stored theme instead. Either click the real theme control, or `localStorage.setItem("theme", JSON.stringify(t))` before reload. `storage.set` JSON-stringifies; writing a raw string fails `JSON.parse` and leaves the page with **no theme class at all** (all-white screenshots).
- **Scope DOM probes to one card.** A flat `querySelectorAll(".fq-spread .fq-safha-row")` picks up rows from the pager's off-screen neighbouring panels and compares them against the *first* card's rect — this reported 374 phantom overlaps on a page that was actually perfect.
- **Sample a strip, not a point.** Point sampling the page face landed on the surah frame and read backwards. Use the brightest pixel down a column, at 12%/88% width, to stay clear of the binding crease (which legitimately darkens the gutter).
- PIL 10.4.0 is available for pixel sampling.
- Commit with **explicit paths**. `git add -A` swept `.claude/launch.json` into the 3.2 commit and needed a `git rm --cached` + `--amend`.

---

## 8. Standing constraints

- **Never** add an AI signature / `Co-Authored-By` trailer to commit messages.
- Terminology: **surah**, **verse**, **word-level**, **mushaf**.
- Mujaz (terse) mode is active.
- Never write code directly — go through `/start-fq-task`.
- Plans live in `docs/plans/`, never `.claude/plans/`.
- Use remote URLs, not local filesystem paths, in shared/committed files.
- Never suggest restarting Claude as a troubleshooting step.
- **Ask before using browser/preview tools** to verify a change.
- Superseded issues #340, #346, #351, #352 redesign surfaces this migration covers under the old language. Their **intent** may be absorbed; their **visual decisions do not constrain** anything here. Default disposition is revert, not reconcile. Note this is why `ReciterCombobox` still exists — 3.2 kept the feature while dropping the treatment.

---

## 9. The immediate next step

The user's last three directives ("finish 3 and 4", "finish the remaining", "recitation bar full height with icons only like the reader lab") are all done, committed, and verified.

The user then said they would **start giving feedback**. So: **wait for that feedback.** Do not open the PR, do not start section 4's items, do not begin new work.

## Visual Feedback Fix Commits (Landed)

1. `aaacdc8` `fix(4.3): settings sidebar adopts reader lab grouped swatch rows and structure`
2. `3f09746` `fix(4.3): reading settings use unified collapsible disclosure rows and font size labels`
3. `df7968a` `fix(4.3): align settings typographic hierarchy, radio indicators, and empty guards`
4. `19fc5e2` `fix(4.4): auto-collapse mushaf layout accordion on edition selection`
5. `a980010` `fix(5.1): remove desk lamp, vignette, and page face lighting gradients for eye comfort`
6. `659a74c` `fix(5.1): redistribute header and footer margins around mushaf page`
7. `32cd143` `fix(5.1): fine-tune mushaf card vertical paddings`
