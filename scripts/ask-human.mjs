#!/usr/bin/env node
/**
 * fq-ask-human — post a blocked decision to Slack and block on a threaded human answer.
 *
 * Why this exists: an unattended agent that cannot fully decide something must ask the
 * team instead of guessing. This runs entirely on the developer's machine — it never
 * touches the deployed app, adds no route, and uses no Slack Events API. See ADR 0064
 * and docs/workflow/ask-human.md for the caller contract.
 *
 * Usage:
 *   node scripts/ask-human.mjs <payload.json>
 *
 * Payload (see docs/workflow/ask-human.md for the canonical schema):
 *   { "background": "what I'm working on and why this decision came up",  // optional
 *     "question": "the specific thing I can't decide",
 *     "options": ["A", "B", "C"],        // >= 2
 *     "recommended": 1,                   // optional, 1-based
 *     "onTimeout": "default" | "halt",    // required
 *     "default": 1,                       // required if onTimeout="default" and no recommended
 *     "timeout": 900,                     // optional seconds, default 900
 *     "context": "feature/572 · codex" }  // optional short label
 *
 * The Slack message language (chrome + acks) follows the language of `question` /
 * `background` — Arabic content renders an Arabic message, everything else English.
 *
 * Prints exactly one JSON line to stdout:
 *   { "path": "answered" | "answered-freeform" | "timed-out" | "no-token" | "error",
 *     "choice": 1|null, "label": "A"|null, "text": "..."|null,
 *     "appliedDefault": 1|null, "replyBy": "U0..."|null, "threadTs": "170..."|null,
 *     "reason": "..."|null }
 *
 * Exit code: 0 for no-token / answered / timed-out; 1 for error. Callers key on `path`.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(REPO_ROOT, ".env.ask-human");
const POLL_START_MS = 5_000;
const POLL_CAP_MS = 30_000;
const POLL_BACKOFF = 1.5;
const DEFAULT_TIMEOUT_S = 900;
const CONSECUTIVE_FAILURE_BUDGET = 5;

/** Print the single result line and exit. */
function emit(result, code) {
  const full = {
    path: result.path,
    choice: result.choice ?? null,
    label: result.label ?? null,
    text: result.text ?? null,
    appliedDefault: result.appliedDefault ?? null,
    replyBy: result.replyBy ?? null,
    threadTs: result.threadTs ?? null,
    reason: result.reason ?? null,
  };
  console.log(JSON.stringify(full));
  process.exit(code);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal KEY=VALUE parser — ignores blanks and # comments, strips surrounding quotes. */
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Call a Slack Web API method. Returns { ok, status, body }. Never throws. */
async function slack(method, token, { httpMethod = "POST", body, query } = {}) {
  let url = `https://slack.com/api/${method}`;
  const init = { method: httpMethod, headers: { Authorization: `Bearer ${token}` } };
  if (query) url += `?${new URLSearchParams(query)}`;
  if (body) {
    init.headers["Content-Type"] = "application/json; charset=utf-8";
    init.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(url, init);
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 5;
      return { ok: false, status: 429, retryAfter, body: {} };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.ok === true, status: res.status, body: json };
  } catch (err) {
    return { ok: false, status: 0, body: {}, networkError: String(err?.message || err) };
  }
}

function validatePayload(raw) {
  if (typeof raw !== "object" || raw === null) return "payload is not an object";
  const { question, options, recommended, onTimeout, default: dflt, timeout } = raw;
  const isText = (v) => typeof v === "string" && v.trim().length > 0;
  if (!isText(question)) return "question must be a non-empty string";
  if (raw.background !== undefined && !isText(raw.background)) return "background must be a non-empty string when provided";
  if (!Array.isArray(options) || options.length < 2) return "options must have at least 2 entries";
  if (options.some((o) => !isText(o))) return "every option must be a non-empty string";
  if (onTimeout !== "default" && onTimeout !== "halt") return 'onTimeout must be "default" or "halt"';
  const inRange = (n) => Number.isInteger(n) && n >= 1 && n <= options.length;
  if (recommended !== undefined && !inRange(recommended)) return "recommended must be a 1-based index into options";
  if (dflt !== undefined && !inRange(dflt)) return "default must be a 1-based index into options";
  if (onTimeout === "default" && dflt === undefined && recommended === undefined)
    return 'onTimeout "default" requires either "default" or "recommended"';
  if (timeout !== undefined && (typeof timeout !== "number" || timeout <= 0)) return "timeout must be a positive number of seconds";
  if (raw.context !== undefined && typeof raw.context !== "string") return "context must be a string";
  return null;
}

const NUMBER_EMOJI = [
  ":one:", ":two:", ":three:", ":four:", ":five:",
  ":six:", ":seven:", ":eight:", ":nine:", ":keycap_ten:",
];
const optionBullet = (n) => NUMBER_EMOJI[n - 1] ?? `*${n}.*`;

/** Pick the message language from the content the human wrote (Arabic script → Arabic). */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const detectLang = (text) => (ARABIC_SCRIPT.test(text) ? "ar" : "en");

const STRINGS = {
  en: {
    header: "🤖 Agent needs a decision",
    workingOn: "*Working on*",
    decision: "*Decision needed*",
    recommended: "recommended",
    duration: (s) => (s < 90 ? `~${s}s` : `~${Math.round(s / 60)}m`),
    replyHint: "💬 Reply in this thread with a number (e.g. `1`) — or just tell me what to do instead.",
    timeoutFooterHalt: (d) => `⏱️ *No reply in ${d}* → I stop and wait for a human.`,
    timeoutFooterDefault: (d, k) => `⏱️ *No reply in ${d}* → I proceed with option ${k}.`,
    fallbackText: (q) => `Agent needs a decision: ${q}`,
    ackAnswered: (k, label) => `✅ Proceeding with *option ${k}* — _${label}_`,
    ackFreeform: "✅ Got it — taking that as guidance.",
    ackTimeoutHalt: (d) => `⏱️ No reply in ${d} — *halting* and waiting for a human.`,
    ackTimeoutDefault: (d, k, label) => `⏱️ No reply in ${d} — proceeding with *option ${k}* — _${label}_`,
  },
  ar: {
    header: "🤖 الوكيل بحاجة إلى قرار",
    workingOn: "*العمل الحالي*",
    decision: "*القرار المطلوب*",
    recommended: "موصى به",
    duration: (s) => (s < 90 ? `~${s} ث` : `~${Math.round(s / 60)} د`),
    replyHint: "💬 رُدّ في هذا الـ thread برقم (مثل `1`) — أو أخبرني بما تريد فعله بدلًا من ذلك.",
    timeoutFooterHalt: (d) => `⏱️ *لا رد خلال ${d}* ← سأتوقف وأنتظر قرارًا بشريًا.`,
    timeoutFooterDefault: (d, k) => `⏱️ *لا رد خلال ${d}* ← سأمضي بالخيار ${k}.`,
    fallbackText: (q) => `الوكيل بحاجة إلى قرار: ${q}`,
    ackAnswered: (k, label) => `✅ سأمضي بالخيار *${k}* — _${label}_`,
    ackFreeform: "✅ تمام — سآخذ بهذا التوجيه.",
    ackTimeoutHalt: (d) => `⏱️ لا رد خلال ${d} — *توقّف* بانتظار قرار بشري.`,
    ackTimeoutDefault: (d, k, label) => `⏱️ لا رد خلال ${d} — سأمضي بالخيار *${k}* — _${label}_`,
  },
};

/**
 * Build the Slack message as Block Kit blocks: a header, an optional short context line,
 * an optional "what I'm working on" section, the decision question, a divider, the numbered
 * options (recommended one marked), a divider, and a footer with the reply hint and the
 * timeout behaviour. Returns { text, blocks } — `text` is the notification fallback.
 */
function renderQuestion(p, timeoutS, s) {
  const question = p.question.trim();
  const optionLines = p.options
    .map((opt, i) => {
      const n = i + 1;
      const rec = p.recommended === n ? `  ⭐ *(${s.recommended})*` : "";
      return `${optionBullet(n)}  ${opt.trim()}${rec}`;
    })
    .join("\n");

  const dur = s.duration(timeoutS);
  const footer =
    p.onTimeout === "halt"
      ? s.timeoutFooterHalt(dur)
      : s.timeoutFooterDefault(dur, p.default ?? p.recommended);

  const blocks = [
    { type: "header", text: { type: "plain_text", text: s.header, emoji: true } },
    ...(p.context ? [{ type: "context", elements: [{ type: "mrkdwn", text: p.context }] }] : []),
    ...(p.background
      ? [{ type: "section", text: { type: "mrkdwn", text: `${s.workingOn}\n${p.background.trim()}` } }]
      : []),
    { type: "section", text: { type: "mrkdwn", text: `${s.decision}\n${question}` } },
    { type: "divider" },
    { type: "section", text: { type: "mrkdwn", text: optionLines } },
    { type: "divider" },
    { type: "context", elements: [{ type: "mrkdwn", text: `${s.replyHint}\n${footer}` }] },
  ];

  return { text: s.fallbackText(question), blocks };
}

async function ack(token, channel, threadTs, text) {
  await slack("chat.postMessage", token, {
    body: { channel, thread_ts: threadTs, text, unfurl_links: false },
  });
}

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) emit({ path: "error", reason: "invalid_payload: no payload file path given" }, 1);

  // Step 1 — token
  if (!fs.existsSync(ENV_FILE)) emit({ path: "no-token" }, 0);
  const env = parseEnvFile(fs.readFileSync(ENV_FILE, "utf8"));
  const token = env.FQ_ASK_HUMAN_SLACK_BOT_TOKEN;
  const channel = env.FQ_ASK_HUMAN_SLACK_CHANNEL;
  if (!token || !channel) emit({ path: "no-token" }, 0);

  // Step 2 — payload
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  } catch (err) {
    emit({ path: "error", reason: `invalid_payload: ${String(err?.message || err)}` }, 1);
  }
  const invalid = validatePayload(payload);
  if (invalid) emit({ path: "error", reason: `invalid_payload: ${invalid}` }, 1);
  const timeoutS = payload.timeout ?? DEFAULT_TIMEOUT_S;
  const s = STRINGS[detectLang(`${payload.question} ${payload.background ?? ""}`)];
  const dur = s.duration(timeoutS);

  // Step 3 — identify self, post the question
  const auth = await slack("auth.test", token);
  if (!auth.ok) {
    emit({ path: "error", reason: auth.body?.error || auth.networkError || "auth_test_failed" }, 1);
  }
  const selfUserId = auth.body.user_id;

  const message = renderQuestion(payload, timeoutS, s);
  const posted = await slack("chat.postMessage", token, {
    body: { channel, text: message.text, blocks: message.blocks, unfurl_links: false },
  });
  if (!posted.ok) {
    emit({ path: "error", reason: posted.body?.error || posted.networkError || "post_message_failed" }, 1);
  }
  const threadTs = posted.body.ts;

  // Step 4 — poll for a human reply
  const deadline = Date.now() + timeoutS * 1000;
  let waitMs = POLL_START_MS;
  let consecutiveFailures = 0;

  while (Date.now() < deadline) {
    await sleep(Math.min(waitMs, Math.max(0, deadline - Date.now())));

    const replies = await slack("conversations.replies", token, {
      httpMethod: "GET",
      query: { channel, ts: threadTs, limit: "200" },
    });

    if (replies.status === 429) {
      await sleep(replies.retryAfter * 1000);
      continue;
    }
    if (!replies.ok) {
      if (++consecutiveFailures >= CONSECUTIVE_FAILURE_BUDGET) {
        emit(
          { path: "error", reason: `poll_failed: ${replies.body?.error || replies.networkError || replies.status}`, threadTs },
          1,
        );
      }
      continue;
    }
    consecutiveFailures = 0;

    const human = (replies.body.messages || []).find(
      (m) => m.ts !== threadTs && !m.bot_id && !m.subtype && m.user && m.user !== selfUserId,
    );

    if (human) {
      const text = String(human.text ?? "").trim();
      const match = text.match(/^#?\s*(\d+)\b/);
      const n = match ? Number(match[1]) : NaN;
      if (Number.isInteger(n) && n >= 1 && n <= payload.options.length) {
        await ack(token, channel, threadTs, s.ackAnswered(n, payload.options[n - 1].trim()));
        emit(
          { path: "answered", choice: n, label: payload.options[n - 1].trim(), replyBy: human.user, threadTs },
          0,
        );
      }
      await ack(token, channel, threadTs, s.ackFreeform);
      emit({ path: "answered-freeform", text, replyBy: human.user, threadTs }, 0);
    }

    waitMs = Math.min(waitMs * POLL_BACKOFF, POLL_CAP_MS);
  }

  // Step 7 — timed out
  if (payload.onTimeout === "halt") {
    await ack(token, channel, threadTs, s.ackTimeoutHalt(dur));
    emit({ path: "timed-out", threadTs }, 0);
  }
  const applied = payload.default ?? payload.recommended;
  await ack(token, channel, threadTs, s.ackTimeoutDefault(dur, applied, payload.options[applied - 1].trim()));
  emit(
    { path: "timed-out", choice: applied, label: payload.options[applied - 1].trim(), appliedDefault: applied, threadTs },
    0,
  );
}

main();
