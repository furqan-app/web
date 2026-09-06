# Ask a Human (fq-ask-human)

The escalation valve for Epic #490 (Track 2: agent orchestrator). When an agent cannot fully
decide something, it posts a numbered question to Slack and **blocks on a threaded human
answer** instead of guessing. Independent of the rest of the epic — useful on its own, including
to a team member with a single subscription and no orchestrator, and to a human who invokes
`/fq-ask-human` to put a decision to the team.

The mechanism is `scripts/ask-human.mjs`: it reads a dedicated Slack bot token from a gitignored
`.env.ask-human`, calls `chat.postMessage`, polls `conversations.replies` (backoff 5s → 30s cap)
until a human reply or the timeout, and prints one JSON result line. It runs entirely on the
caller's machine — no route in the deployed app, no Slack Events API. See
[ADR 0064](../architecture/adr/0064-agent-slack-escalation.md).

## Caller contract

Write the payload to a temp JSON file and run `node scripts/ask-human.mjs <payload.json>`. Read
the single JSON line it prints on stdout. Key on `path`, never the exit code.

### Payload

| Field | Type | Required | Meaning |
|---|---|---|---|
| `background` | string | no | What you're working on and why this decision came up. Rendered as a *Working on* section above the question. |
| `question` | string | yes | The specific thing you can't decide. May be a short paragraph. |
| `options` | string[] | yes | The numbered choices. At least 2. |
| `recommended` | integer | no | 1-based index of the option you would pick. Marked `⭐ (recommended)`. |
| `onTimeout` | `"default"` \| `"halt"` | yes | What happens if no human replies before `timeout`. |
| `default` | integer | conditionally | 1-based index to apply on timeout. Required when `onTimeout:"default"` and `recommended` is absent; otherwise falls back to `recommended`. |
| `timeout` | integer seconds | no | Defaults to 900 (15 min). Raise it for unattended runs. |
| `context` | string | no | A short label shown muted under the header — branch, task, CLI name. |

A well-formed escalation is a **decision you genuinely cannot make**, phrased as a clear
question with mutually-exclusive numbered options, a recommendation, and an explicit terminal
state. Use `background` to give the human enough context to decide without opening the repo.
If you can decide it from the plan, the code, or a sensible default, do that instead.

The message language follows your content: Arabic-script `question` / `background` produces
an Arabic RTL message and Arabic thread acks; anything else is English. There is no `lang`
field.

### Result

| Field | Meaning |
|---|---|
| `path` | `answered` · `answered-freeform` · `timed-out` · `no-token` · `error` |
| `choice` | 1-based option index, or `null` |
| `label` | the chosen option's text, or `null` |
| `text` | the human's raw reply — set only for `answered-freeform` |
| `appliedDefault` | the index applied — set only for `timed-out` with `onTimeout:"default"` |
| `replyBy` | Slack user id of the replier, or `null` |
| `threadTs` | root message ts, so a human can find the thread |
| `reason` | error detail — set only for `error` |

### How to handle each `path`

- **`answered`** — proceed with `choice`.
- **`answered-freeform`** — the human replied with something other than a bare number (e.g. "do
  X instead", or an out-of-range number). This is a real instruction. Act on `text`; do not
  re-ask.
- **`timed-out`** with `onTimeout:"default"` — proceed with `appliedDefault`.
- **`timed-out`** with `onTimeout:"halt"` — stop. Surface the question and report to your
  operator.
- **`no-token`** — no `.env.ask-human` configured. Surface the question and options in the
  terminal and halt (or apply your `default` locally if `onTimeout:"default"`).
- **`error`** — a hard Slack failure (bad token, channel not found, bot not in channel, repeated
  network errors). Handle it exactly like `no-token`.

## One-time Slack app setup

1. Create a Slack app at <https://api.slack.com/apps> → **From scratch**, pick the workspace.
2. **OAuth & Permissions** → Bot Token Scopes: add `chat:write` and `channels:history` (use
   `groups:history` instead if the target channel is private).
3. **Install to Workspace**. Copy the **Bot User OAuth Token** (`xoxb-…`).
4. In Slack, create or pick a channel for agent escalations and **invite the bot** to it
   (`/invite @your-app`).
5. Get the channel id: open the channel → channel name → **About** → copy the id at the bottom
   (`C0…`), or right-click the channel → Copy link and take the trailing id.
6. Create `.env.ask-human` at the repo root (already covered by the `.env*` gitignore rule):
   ```
   FQ_ASK_HUMAN_SLACK_BOT_TOKEN="xoxb-..."
   FQ_ASK_HUMAN_SLACK_CHANNEL="C0..."
   ```

The script never fetches, generates, logs, or echoes the token. With no `.env.ask-human`, every
call returns `path:"no-token"` and the caller degrades to the terminal — nothing breaks.

## Constraints

- No route in the deployed Next.js app, no Slack Events API, no socket mode. Agent-decision
  traffic never passes through production runtime.
- The token is separate from `SLACK_WEBHOOK_URL` (ADR 0018's Sentry relay) and never goes in
  `.env.local` or Hostinger's env panel.
- Every escalation carries an explicit terminal state — a `default` or a `halt`. An agent that
  blocks forever on a Slack reply is worse than one that guesses.
