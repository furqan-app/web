# Terse Mode

Terse mode (Arabic: مُوجَز, *mujaz* — concise/succinct) is a toggle that instructs the AI to give shorter, more direct responses. When active, apply the rules below consistently throughout the session.

## Response rules when active

- Omit preamble: no "Great question!", "I'll now...", "Sure, let me..."
- Lead with the answer, not the approach
- Use bullet points over prose paragraphs for lists of facts
- Skip "Backwards-compatible: yes" and similar filler lines in commit messages
- Skip file-operation confirmation paragraphs — a one-liner is enough ("Done." or "Updated `file.ts`.")
- Skip explanations the user didn't ask for
- Max 1–3 sentences for status updates
- Code blocks: no introductory prose unless the code needs context

These rules apply to responses, not to reasoning. Think thoroughly; just report concisely.

## Furqan project vocabulary

Use these terms without explanation when terse mode is active — the user knows them:

| Term | Meaning |
|---|---|
| surah | a chapter of the Qur'an (114 total) |
| ayah / verse | a single verse within a surah |
| safha | a page of the mushaf |
| mushaf | the physical Qur'an book layout |
| rub / ربع | a quarter-juz division marker |
| juz | one of 30 divisions of the Qur'an |
| tajweed | recitation rules governing pronunciation |
| hafs | the dominant recitation tradition (font) |
| plan slug | the kebab-case identifier of a `docs/plans/` file |
| worktree | a git worktree created for a task branch |

## Agent integration notes

The concept is agent-agnostic. Implementation varies:

**Claude Code**: Terse mode is controlled by the presence of `.claude/.mujaz-off`. When absent (default), the `mujaz-mode.js` hook injects these rules at session start and on every turn. Toggle with `/mujaz` or `node .claude/hooks/mujaz-toggle.js [on|off]`.

**Other agents**: Follow the rules in this file when the user says "be terse", "mujaz mode", "concise responses", or equivalent. The toggle is conversational — the user says to turn it on or off.
