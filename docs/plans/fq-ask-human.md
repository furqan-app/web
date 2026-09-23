---
title: "fq-ask-human: Slack escalation — post a question, await a threaded human decision"
type: feature
date: 2026-09-06
status: implemented
area: workflow
issue: 572
adr: [0064]
---

# fq-ask-human: Slack escalation — post a question, await a threaded human decision

## Summary

A skill an agent invokes **mid-task when it is blocked on a decision it cannot fully make**.
It posts a numbered question to a configured Slack channel, polls the thread for a human
reply, and returns the chosen option — or applies a caller-supplied default / halts on
timeout. Bot token + `conversations.replies` polling; no production route, no Slack Events
API, no webhook. Useful standalone (a single-subscription teammate with no orchestrator),
and it is the escalation valve for the T2.4 orchestrator. Also usable as a human-typed
`/fq-ask-human` slash command when a person wants to put a decision to the team and block on
the answer.

Part of epic #490 (Track 2 — agent orchestrator). Independent of #571/#573/#574.

## Approach

`scripts/ask-human.mjs` (repo-root `scripts/` convention, Node 24 global `fetch`, `.mjs`
ESM) does all the work in one process:

1. Read `.env.ask-human` from the repo root. If absent or `FQ_ASK_HUMAN_SLACK_BOT_TOKEN`
   empty → print `{ "path": "no-token" }`, exit 0.
2. Read and validate the payload JSON (path passed as `argv[2]`).
3. `auth.test` once to learn our own bot user id (for reply filtering).
4. `chat.postMessage` the formatted question to `FQ_ASK_HUMAN_SLACK_CHANNEL`; capture `ts`.
5. Poll `conversations.replies` for that `ts` with backoff (5s, then ×1.5, capped at 30s)
   until a qualifying human reply arrives or `timeout` seconds elapse.
6. Parse the first qualifying reply; post a one-line ack into the thread; print the result
   JSON; exit 0.
7. On timeout with no reply: post a one-line "no reply — proceeding with #N / halting" into
   the thread; print the result; exit 0.
8. On any hard Slack failure → print `{ "path": "error", "reason": "<slack_err>" }`, exit 1.

The `SKILL.md` stays thin (like `detect-fleet` / `setup-fq-fleet`): it points at
`docs/workflow/ask-human.md` and covers the two entry paths (agent writes the payload file
and runs the script; or `/fq-ask-human` where the model gathers question/options/
recommendation/timeout from the human first, then does the same).

The OpenCode plugin (`.opencode/plugins/fq-commands.js`) picks the skill up automatically —
no wrapper needed.

## Decision Tree / Algorithm

See [ADR 0064](../architecture/adr/0064-agent-slack-escalation.md) for the boundary rationale.
The script's branch logic:

| Step | Condition | Outcome (all print one JSON line to stdout) |
|---|---|---|
| 1 | `.env.ask-human` missing, or `FQ_ASK_HUMAN_SLACK_BOT_TOKEN` empty | `{path:"no-token"}`, exit 0 |
| 2 | payload invalid — not readable JSON, missing `question`, `options` has < 2 entries, `onTimeout` not `"default"`/`"halt"`, or `onTimeout:"default"` with neither `default` nor `recommended` | `{path:"error", reason:"invalid_payload: <detail>"}`, exit 1 |
| 3 | `auth.test` or `chat.postMessage` returns `ok:false` (`invalid_auth`, `token_revoked`, `channel_not_found`, `not_in_channel`, …) or a network error | `{path:"error", reason:"<slack_err>"}`, exit 1 |
| 4 | polling `conversations.replies`, backoff 5s → ×1.5 → 30s cap, loop until `Date.now() - start >= timeout*1000` | → steps 5–7 |
| 5 | first thread message that is **not** the root `ts`, has no `bot_id`, `user` ≠ our bot user id, no `subtype`; **and** `text.trim()` matches `/^#?\s*(\d+)\b/` with the captured integer in `1..options.length` | `{path:"answered", choice:N, label:options[N-1], text:null, replyBy:<user>, threadTs:<ts>}`; post `"→ proceeding with option #N"` in thread; exit 0 |
| 6 | that first qualifying message is anything else (prose, out-of-range number, "do X instead") | `{path:"answered-freeform", choice:null, label:null, text:<full message text>, replyBy:<user>, threadTs:<ts>}`; post `"→ got it, taking that as guidance"` in thread; exit 0 |
| 7 | `timeout` elapsed, no qualifying reply, `onTimeout:"halt"` | `{path:"timed-out", choice:null, appliedDefault:null, threadTs:<ts>}`; post `"⏱ no reply in <t> — halting"` in thread; exit 0 |
| 7b | `timeout` elapsed, no qualifying reply, `onTimeout:"default"` | `applied = default ?? recommended`; `{path:"timed-out", choice:applied, label:options[applied-1], appliedDefault:applied, threadTs:<ts>}`; post `"⏱ no reply in <t> — proceeding with option #applied"` in thread; exit 0 |
| — | HTTP 429 during any poll | honor `Retry-After` header, sleep, retry — not counted as a failure |
| — | 5xx / network error during poll, past a retry budget of 5 consecutive failures | `{path:"error", reason:"poll_failed: <detail>"}`, exit 1 |

The caller keys on `path`, never the exit code. `no-token` and `error` are handled the same
way by the caller: surface the question + options in the terminal, then halt — or apply
`default` locally if the payload had `onTimeout:"default"`.

### Payload schema (`docs/workflow/ask-human.md` is the canonical copy)

```
background  string, optional — what the agent is working on and why the decision came up;
            rendered as a "Working on" section above the question
question    string, required — the specific thing that can't be decided (may be a short paragraph)
options     string[], required, length ≥ 2
recommended integer, optional — 1-based index into options
onTimeout   "default" | "halt", required
default     integer, 1-based — required when onTimeout="default" AND recommended absent;
            otherwise falls back to recommended
timeout     integer seconds, optional, default 900
context     string, optional — short branch / task / CLI label, shown muted under the header
```

The Slack message language (header, labels, footer, thread acks) follows the language of
`question` / `background`: Arabic-script content → an Arabic RTL message, anything else →
English. No `lang` field — it is detected from the content the human wrote.

### Result schema

```
path          "answered" | "answered-freeform" | "timed-out" | "no-token" | "error"
choice        integer (1-based) | null
label         string | null
text          string | null      — set only for "answered-freeform"
appliedDefault integer | null    — set only for "timed-out" with onTimeout="default"
replyBy       string | null      — Slack user id of the replier
threadTs      string | null      — the root message ts (for a human to find the thread)
reason        string | null      — set only for "error"
```

### Slack message format

Block Kit blocks (not a plain-text blob), so it renders as a structured card. Chrome strings
come from a per-language table (`STRINGS.en` / `STRINGS.ar`):

- `header` — "🤖 Agent needs a decision" / "🤖 الوكيل بحاجة إلى قرار"
- `context` — the `context` label, muted (omitted if not supplied)
- `section` — "*Working on*" + `background` (omitted if no `background`)
- `section` — "*Decision needed*" + `question`
- `divider`
- `section` — the options, one per line: `:one: <option>` … with `  ⭐ *(recommended)*` /
  `  ⭐ *(موصى به)*` appended to the `recommended` option only. `:one:`…`:keycap_ten:` for
  1–10, `*N.*` beyond.
- `divider`
- `context` — reply hint (reply with a number, or say what to do) + `⏱️ No reply in ~<t> → I
  <stop and wait | proceed with option k>`

`text` (the notification fallback) is "Agent needs a decision: <question>" (localized).

Thread acks the script posts when it resolves (localized the same way):
- answered → `✅ Proceeding with *option N* — _<label>_`
- answered-freeform → `✅ Got it — taking that as guidance.`
- timed-out / halt → `⏱️ No reply in ~<t> — *halting* and waiting for a human.`
- timed-out / default → `⏱️ No reply in ~<t> — proceeding with *option k* — _<label>_`

## Verified Test Cases

Walked through with the issue author (2026-09-06):

1. **Human replies `2` ~30s in** → step 5 → `{path:"answered", choice:2, label:"<B>"}`.
   Thread shows "→ proceeding with option #2".
2. **Human replies `"neither — rebase onto main first"`** → step 6 →
   `{path:"answered-freeform", text:"neither — rebase onto main first"}`. The agent must act
   on the instruction; it does not reprompt.
3. **Human replies `#1 looks right`** → `/^#?\s*(\d+)\b/` captures `1`, in range → step 5 →
   `{path:"answered", choice:1}`.
4. **Nobody replies; `onTimeout:"default"`, `default:1`** → step 7b →
   `{path:"timed-out", choice:1, appliedDefault:1}`.
5. **Nobody replies; `onTimeout:"halt"`** → step 7 → `{path:"timed-out", choice:null}`. The
   agent stops and reports to its operator.
6. **Bot not invited to the channel** → `chat.postMessage` → `not_in_channel` → step 3 →
   `{path:"error", reason:"not_in_channel"}`. Agent falls back to the terminal.
7. **Two agents escalate in the same channel concurrently** → each has its own root `ts` and
   polls only its own thread → no collision.
8. **Human reacts with an emoji instead of replying** → reactions are not messages in
   `conversations.replies` → ignored; polling continues.
9. **Human's first reply is `"5"` but there are only 3 options** → out of range → step 6 →
   `answered-freeform` with `text:"5"` (caller decides; not treated as a valid pick).
10. **No `.env.ask-human` at all** (the standalone/first-run case) → step 1 →
    `{path:"no-token"}` → identical caller handling to `error`.

## Files to Change

- `scripts/ask-human.mjs` — **new.** The whole mechanism (steps 1–8 above). ~250 lines, no
  dependencies beyond Node built-ins + global `fetch`. The Slack message is Block Kit blocks
  (see Slack message format above).
- `.claude/skills/fq-ask-human/SKILL.md` — **new.** Thin frontmatter (`name`, `description`)
  + body pointing at `docs/workflow/ask-human.md`; documents the agent-invoked path and the
  `/fq-ask-human` human-gathers-then-runs path.
- `docs/workflow/ask-human.md` — **new.** Canonical caller contract: payload schema, result
  schema, what a well-formed escalation looks like (one-line question, ≥2 numbered options,
  a recommendation, an explicit `onTimeout`), and Slack app setup — create app, bot scopes
  `chat:write` + `channels:history` (or `groups:history` for a private channel), install to
  workspace, invite the bot to the channel, copy the channel id, paste the bot token +
  channel id into `.env.ask-human`.
- `docs/workflow/INDEX.md` — register `ask-human.md` (new row under the Fleet / Orchestrator
  section, or a sibling "Escalation" row).
- `docs/architecture/adr/0064-agent-slack-escalation.md` — **new** (already written in this
  plan phase).
- `docs/architecture/decisions/observability.md` — **new** `## Agent Slack Escalation
  (fq-ask-human)` section (already written in this plan phase).
- `.env.example` — commented pointer block explaining the two vars live in a **separate**
  `.env.ask-human` file (never `.env.local`), with ADR 0064 reference. No real values.
- `docs/plans/INDEX.md` — regenerated by `gen-plans-index.sh`.

No `.gitignore` change: `.env*` (line 39) already matches `.env.ask-human`, and
`.env.example` stays tracked because it already is.

## Constraints

- **No route in the deployed Next.js app. No Slack Events API, socket mode, or inbound
  listener.** Agent-decision traffic never passes through production runtime. (ADR 0064)
- **Do not touch `app/api/webhooks/sentry/route.ts`, `SLACK_WEBHOOK_URL`, or
  `SENTRY_WEBHOOK_SECRET`.** That relay is inbound-from-Sentry only and exists because Sentry
  is external; nothing here needs a public endpoint. (ADR 0018)
- **Token only in `.env.ask-human` at the repo root**, read only by `scripts/ask-human.mjs`.
  Never `.env.local` (Next.js loads it), never Hostinger, never committed. The script never
  fetches, generates, logs, or echoes the token value.
- **Every escalation has a defined terminal state** — a `default` to apply or an explicit
  `halt`. The script must never return in a way that lets the caller proceed as if the
  question were answered when it was not.
- **Do not reuse `app/lib/notifications/`** — that is user-facing product infrastructure with
  DB-backed delivery rows, the wrong layer for agent tooling.
- Keep the script dependency-free (Node built-ins + global `fetch` only) so it runs from any
  agent surface without an install step.
- `SKILL.md` frontmatter must satisfy `.opencode/plugins/fq-commands.js`'s parser: kebab-case
  `name` matching `^[a-z0-9]+(-[a-z0-9]+)*$`, a non-empty `description`, a non-empty body.

## What NOT to Do

- Do not add a Slack MCP server or route the skill through one — per-tool MCP config drifts
  across the team's agent surfaces and adds a third-party process holding the bot token.
  (Evaluated and rejected — ADR 0064 Option B.)
- Do not add a Slack Events API route to the app to receive replies (ADR 0064 Option A,
  rejected).
- Do not make the agent drive the polling loop turn-by-turn — the loop runs in-process in
  the Node script.
- Do not reprompt on a non-numeric reply — free-form text is a first-class `answered-freeform`
  outcome the caller handles.
- Do not block forever — the timeout must always resolve to `default` or `halt`.
- Do not overload `SLACK_WEBHOOK_URL` or any existing Sentry env var.
- Do not implement the #496 delegate 4→1 consolidation or anything else from epic #490's
  other children here.
- Do not add a `port` entry for this worktree in `~/.claude/furqan-worktrees.json` — there is
  no dev server; the deliverable is a script + docs.

## Decisions Made

- **Transport: direct Slack Web API in a Node script, not MCP.** Tool-agnostic distribution
  (one `node` invocation vs per-tool MCP config), the poll-with-backoff loop belongs
  in-process, smaller trust surface, and the need is exactly two Slack methods. (ADR 0064)
- **Token storage: `.env.ask-human` at the repo root.** Matches the existing `.env*` ignore
  rule automatically; kept out of `.env.local` so Next.js's env loader never sees it.
- **Reply parsing: bare leading number → option; anything else → `answered-freeform`.** A
  human saying "actually do X" is the point of an escalation valve. Out-of-range numbers fall
  through to `answered-freeform` too. Confirmed strict (not "number anywhere in the reply")
  with the issue author during live testing on 2026-09-06 — the Slack message tells repliers
  to send a number, and a looser match risks picking a digit out of prose that wasn't a vote.
- **Recommendation is a display hint separate from `default`.** `recommended` speeds the
  human's decision (rendered with `← recommendation`); `default` is what to apply on timeout.
  `default` falls back to `recommended` when omitted under `onTimeout:"default"`.
- **Default timeout 900s (15 min); backoff 5s → 30s cap.** Assumes a roughly-attended human
  within a work session; caller overrides for unattended runs.
- **Hard failures return `path:"error"` and exit non-zero, distinct from `no-token`.** Caller
  handles both the same way but the two states are observably different for debugging.
- **`/fq-ask-human` is also a human-typed slash command** — same script, with the model
  gathering question/options/recommendation/timeout conversationally first.
- **Optional `background` field + auto language detection** (added during implementation, at
  the issue author's request). The message shows a *Working on* section from `background`
  above a *Decision needed* section from `question`. Chrome + thread acks render in Arabic
  when `question`/`background` contain Arabic script, English otherwise — detected from
  content, no `lang` field. Verified live in the furqan Slack workspace on 2026-09-06 (both
  an English and an Arabic escalation).
- **Recommended marker is `⭐ (recommended)` / `⭐ (موصى به)`** — star plus the word, per the
  issue author's live-test feedback.
- **Sweep (step 3b):** no existing test asserts this behavior (all-new files); nothing here
  reads or writes through the service worker (no app route, no `/api/*`); no state derives
  from an offline-sensitive signal; the "no `.gitignore` change needed" and "OpenCode picks
  it up automatically" claims were both verified against `.gitignore` line 39 and
  `.opencode/plugins/fq-commands.js`'s `collectSkills`.
