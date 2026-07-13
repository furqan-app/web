---
name: compress-fq-docs
description: >
  Compresses Furqan project documentation in docs/standards/ and docs/plans/ to be shorter and
  more direct — cutting blocks, rewriting verbose sentences, and replacing long phrases with
  simpler words. Use whenever the user says the docs are long, bloated, or verbose, or asks to
  clean up, compress, trim, or simplify standards or plan files. Also use when a plan has
  accumulated addenda that should be folded back into the body. Invoke proactively when adding to
  a doc would push it past ~80 lines, or when a doc contains code blocks that merely illustrate a
  prose rule.
---

# compress-fq-docs

Furqan docs drift toward verbosity — code blocks that illustrate rules already in prose, hedging
language, long phrases where short ones work. Compress them to tight, direct rules without losing
any constraint.

## The core heuristic

Two passes per file:

**Pass 1 — cut blocks and bullets:**
- Code blocks only if they are genuinely trivial: the example could be reconstructed from the prose in under 5 seconds with no domain knowledge (e.g. a bare `console.log` or a single-line string operation that the prose already spells out). If there is any doubt, keep the block.
- Preamble sentences that describe what the section will say → cut, just say it
- "Do not X" bullets that restate "always do Y" already above → cut
- Inline repetition — same constraint twice in different words → cut one

**Pass 2 — compress sentences:**
- Replace long phrases with shorter equivalents: "in order to" → "to", "it is important that" → omit, "you should make sure to" → "always"
- Rewrite hedging: "in general", "typically", "you might want to" → state the rule directly
- Collapse multi-sentence explanations into one when the second sentence just restates the first

Things to always keep:
- Code examples that show real project patterns, exact field/function names, or non-obvious API shapes — even if the prose covers the rule, the code shows how it looks in practice
- Non-obvious gotchas prose can't convey concisely
- Negative examples that prevent a real past mistake

## Scope

Default: `docs/standards/` and `docs/plans/` — all `.md` files.

For plan files, also **collapse addenda back into the plan body**: merge each addendum's
corrections into the relevant section, then remove the addendum heading. The result should read
as a single coherent document, not a changelog.

## Steps

1. **Identify target files** — list what you'll compress and confirm if scope is ambiguous.

2. **Read each file** — apply both passes section by section.

3. **Rewrite in place** — edit the file. Do not leave a summary of what you cut; just cut it.
   Preserve headings where they carry real weight. Merge a section into its parent when it has
   1–3 bullets or sentences that naturally belong there.

4. **Report** — for each file: original line count → new line count, one-line note on what was
   trimmed most. Nothing more.

## Anti-patterns to avoid

- Do not cut a code example just because it's code — the heuristic is whether prose alone captures the constraint.
- Do not rewrite the meaning of a rule, only the length. If compression changes what the rule says, stop and flag it.
- Do not trim `docs/architecture/DECISIONS.md` or ADR files — those are records, not guidance.
- Do not add new content or improve the rules — this skill only compresses.
