# ADR 0064: Agent Slack escalation runs locally on a bot token, never through the deployed app

**Date:** 2026-09-06
**Status:** Accepted

## Context

Epic #490 (Track 2: agent orchestrator) needs an escalation valve: when an unattended agent
cannot fully decide something, it must ask the team on Slack and block on a threaded human
answer rather than guess. The project already has one Slack integration — [ADR 0018](0018-sentry-slack-relay-webhook.md)'s
`app/api/webhooks/sentry/route.ts` relaying Sentry alerts to a Slack **Incoming Webhook**
(`SLACK_WEBHOOK_URL`, Hostinger-panel-only). That path is outbound-only and cannot carry a
reply back, and it exists as a public endpoint solely because Sentry is an external service
that must reach in. Agent-decision traffic has the opposite shape: it originates on a
developer's machine during an agent session, needs a two-way exchange, and must reach every
agent surface the team runs (Claude Code, OpenCode, Antigravity, …), not just the deployed
Next.js app.

## Options Considered

**Option A — reuse the Sentry relay path**
Add a Slack Events API route (or socket-mode listener) to the deployed app so Slack can POST
replies back, keyed to a pending-question store.

**Option B — a third-party Slack MCP server**
Register a community Slack MCP server in each agent tool's MCP config; the skill drives its
tools to post and read the thread.

**Option C — a local Node script on a dedicated bot token**
`scripts/ask-human.mjs` (repo-root `scripts/` convention, Node global `fetch`) reads a bot
token from a gitignored `.env.ask-human`, calls `chat.postMessage` then polls
`conversations.replies` with backoff until a human reply or a timeout, and prints one JSON
result line. Invoked identically from any agent surface as `node scripts/ask-human.mjs <payload.json>`.

## Decision

Option C. A dedicated Slack **bot token** (`FQ_ASK_HUMAN_SLACK_BOT_TOKEN`, scopes `chat:write`
+ `channels:history`/`groups:history`) stored in a gitignored **`.env.ask-human` at the repo
root** — never `SLACK_WEBHOOK_URL`, never `.env.local` (which Next.js loads), never Hostinger.
The polling loop runs in-process in the script, not as agent turns. No route is added to the
deployed app; no Slack Events API, socket mode, or inbound listener is introduced. Every
escalation carries an explicit terminal state — a caller-supplied default to apply on timeout,
or an explicit halt — so an agent can never block forever. A missing token or a hard Slack
failure returns a structured `no-token` / `error` result the caller handles the same way:
surface the question in the terminal and halt.

## Consequences

- **+** Agent-decision traffic never touches production runtime — the ADR 0018 endpoint and
  its secret stay single-purpose, and there is no new public attack surface.
- **+** One invocation (`node scripts/ask-human.mjs`) works identically from every agent tool;
  no per-tool MCP config to register and keep from drifting across seven surfaces.
- **+** Trust surface is ~150 lines of first-party code calling two documented Slack methods,
  not a third-party server process holding the bot token.
- **+** The token lives in a file the app's env loader never reads, so it cannot leak into a
  client bundle or a deployed environment.
- **-** The script re-implements a small amount of Slack glue (post, backoff poll, reply
  parse, thread acks) that an MCP server would otherwise provide.
- **-** Polling has inherent latency — a reply is picked up within the current backoff
  interval (≤30s), not instantly as an Events push would deliver.
- **-** Each developer who wants the escalation path must create/install the Slack app, invite
  the bot to the channel, and paste the token locally — there is no shared provisioning.
