---
name: trim-fq-docs
description: >
  Trims and compresses Furqan project documentation in docs/standards/ and docs/plans/ to be more
  direct and concise. Use this skill whenever the user says the docs are getting long, bloated, or
  verbose — or asks to clean up, compress, trim, or simplify standards or plan files. Also use it
  when a plan has accumulated addenda that should be folded back into the body, or when the user
  mentions old/messy plans. Invoke proactively when adding to a doc would push it past ~80 lines,
  or when a doc contains code blocks that merely illustrate a prose rule.
---

# trim-fq-docs

Furqan docs drift toward verbosity over time — code blocks that just illustrate a rule already
stated in prose, hedging language, redundant preambles. This skill trims them back to tight,
direct rules without losing any constraint.

## The core heuristic

**One tight sentence beats a code block.** Keep a code example only when the constraint literally
cannot be stated without it — an exact field name, a non-obvious API shape, a gotcha a reader
would miss from prose alone. If the prose rule fully captures it, cut the code.

Things to cut:
- Code blocks that illustrate a rule already stated clearly in prose
- Preamble sentences that describe what the section is about to say (just say it)
- Hedging phrases ("in general", "typically", "you might want to")
- Inline repetition — the same constraint stated twice in slightly different words
- "Do not X" bullets that restate "always do Y" already said above

Things to keep:
- Code examples where the exact syntax or shape matters (API envelope, Prisma field name, import path)
- Non-obvious gotchas that prose can't convey concisely
- Negative examples that prevent a real past mistake (only if the prose doesn't already cover it)

## Scope

Default: `docs/standards/` — all `.md` files.

Also applies to `docs/plans/` — either when the user names a specific plan, says "plans too", or
when a plan has accumulated multiple addenda. For plan files, the primary job is **collapsing
addenda back into the plan body**: merge each addendum's corrections into the relevant section,
then remove the addendum heading. The result should read as a single coherent document, not a
changelog. Do this for both implemented and active plans — the goal is a clean record, not just
a working spec.

## Steps

1. **Identify target files** — list what you'll trim and confirm with the user if the scope is
   ambiguous (e.g. they said "the docs" without specifying which).

2. **Read each file** — go through it section by section and apply the heuristic:
   - Does this code block illustrate a rule already captured in prose? → cut it
   - Does this sentence hedge, repeat, or describe rather than state? → rewrite or cut
   - Does this paragraph have a one-sentence core surrounded by filler? → keep the core

3. **Rewrite in place** — edit the file. Do not leave a summary of what you cut; just cut it.
   Preserve headings where they carry real weight. Merge a section into its parent when it has
   1–3 bullets or sentences that naturally belong there — a standalone heading for that much
   content adds navigation cost without benefit.

4. **Report** — for each file: original line count → new line count, and a one-line note on what
   category of content was trimmed most. Nothing more.

## Anti-patterns to avoid

- Do not cut a code example just because it's code — the heuristic is whether prose alone captures
  the constraint, not whether a code block exists.
- Do not rewrite the meaning of a rule, only the length. If trimming changes what the rule says,
  stop and flag it to the user.
- Do not trim `docs/architecture/DECISIONS.md` or ADR files — those are records, not guidance.
- Do not trim plan files unless the user explicitly includes them.
- Do not add new content or improve the rules — this skill only compresses, it does not redesign.
