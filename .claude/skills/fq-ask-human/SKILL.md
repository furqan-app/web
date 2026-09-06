---
name: fq-ask-human
description: Escalation valve for a blocked agent — post a numbered decision to Slack and block on a threaded human answer, then continue with the chosen option (or a caller-supplied default / halt on timeout). Runs locally on a dedicated Slack bot token; never touches the deployed app. Invoke it mid-task when you cannot fully decide something, or as /fq-ask-human when a human wants to put a decision to the team and wait. See ADR 0064.
---

# /fq-ask-human

Read and follow [`docs/workflow/ask-human.md`](../../../docs/workflow/ask-human.md) — it has the
full caller contract (payload + result schema, what a well-formed escalation looks like) and the
one-time Slack app setup. See [ADR 0064](../../../docs/architecture/adr/0064-agent-slack-escalation.md)
for why this runs locally on a bot token instead of a route in the deployed app or a Slack MCP server.

## Two entry paths, one mechanism

Both write a payload JSON file and run `node scripts/ask-human.mjs <payload.json>`, then act on
the single JSON result line it prints (`path` is `answered` / `answered-freeform` / `timed-out` /
`no-token` / `error`).

- **Agent-invoked (you are blocked mid-task):** compose `background` (what you're working on),
  a clear `question`, 2+ numbered `options`, the option you would pick as `recommended`, and an
  explicit `onTimeout` (`"default"` with a `default` index, or `"halt"`). Write it to a temp
  file, run the script, read the result. Write in the language the team uses — Arabic content
  produces an Arabic message automatically.
- **`/fq-ask-human` (a human wants to ask the team):** gather the question, options,
  recommendation, and timeout from the user in conversation first, then do the same.

## Rules

- Never proceed as if the question were answered when `path` is `no-token`, `error`, or
  `timed-out` with `onTimeout:"halt"` — surface the question and options in the terminal and stop.
- A `path:"answered-freeform"` result is a real instruction from the human ("do X instead") — act
  on it, do not re-ask.
- Never read, print, or commit the bot token. It lives only in the gitignored `.env.ask-human`.
