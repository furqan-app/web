# Sentry-to-Slack Alerting via Relay Webhook

**Type:** feature
**Date:** 2026-07-08
**Status:** implemented

## Summary

Sentry's native Slack alert-rule action requires a Team-plan-or-above Sentry subscription, which this app doesn't have. Instead, build a small relay endpoint that receives Sentry's Internal Integration webhook when an alert rule fires, verifies it's genuinely from Sentry, and forwards a formatted message to a Slack Incoming Webhook (free, plan-independent on both sides). See [ADR 0018](../architecture/adr/0018-sentry-slack-relay-webhook.md) for the full option comparison and rationale.

## Approach

New route `app/api/webhooks/sentry/route.ts` (`POST` only) does:

1. Read the raw request body as text (needed for HMAC — must hash the exact bytes Sentry signed, not a re-serialized `JSON.parse`'d object).
2. Read headers `sentry-hook-signature` and `sentry-hook-resource`.
3. Compute `HMAC-SHA256(SENTRY_WEBHOOK_SECRET, rawBody)` as a hex digest and timing-safe compare it to `sentry-hook-signature`. Missing header or mismatch → `401`, stop.
4. If `sentry-hook-resource !== "event_alert"` → `200`, stop (no Slack post). Covers the one-time `installation` ping and any other resource type Sentry might add later.
5. Otherwise `JSON.parse` the body, extract `data.event.title`, `data.event.culprit`, `data.event.level`, `data.event.web_url`, and `data.triggered_rule`.
6. Build a Slack Block Kit payload (see Verified Test Cases) and `POST` it to `SLACK_WEBHOOK_URL`.
7. If the Slack `fetch` response is not `ok`, `throw new Error(...)` — this propagates to `instrumentation.ts`'s existing `onRequestError` hook (ADR 0017), gets captured by Sentry automatically, and Next.js's resulting `500` shows as a failed delivery in Sentry's own integration dashboard (built-in visibility/retry, no new code).
8. On success, return `jsonResponse({ data: { relayed: true } })` (`200`).

This route is intentionally **not** added to `auth-middleware`'s `protectedRoutes` — it's called by Sentry's servers, not an authenticated app user, and its own signature check is the auth boundary. It doesn't need any `intl-middleware` changes either, since `withIntl` already bypasses everything under `/api`.

## Decision Tree / Algorithm

| Step | Condition | Result |
|---|---|---|
| 1 | `sentry-hook-signature` header missing | `401`, no Slack post |
| 2 | Computed HMAC-SHA256(secret, rawBody) ≠ header value | `401`, no Slack post |
| 3 | Signature valid, `sentry-hook-resource` ≠ `"event_alert"` (e.g. `"installation"`) | `200`, no Slack post (silent ack) |
| 4 | Signature valid, `sentry-hook-resource === "event_alert"`, Slack POST succeeds (2xx) | `200`, Slack message sent |
| 5 | Signature valid, `sentry-hook-resource === "event_alert"`, Slack POST fails (non-2xx or network error) | `throw` → Next.js `500` → auto-captured by `instrumentation.ts`'s `onRequestError` → visible as failed delivery in Sentry |

## Verified Test Cases

**Case: a triggered "new issue" alert**

Input payload (Sentry → our route):
```json
{
  "action": "triggered",
  "data": {
    "event": {
      "title": "ReferenceError: heck is not defined",
      "culprit": "app/api/quran/pages/[pageId]/route.ts",
      "level": "error",
      "web_url": "https://sentry.io/organizations/furqan/issues/12345/"
    },
    "triggered_rule": "A new issue is created"
  },
  "installation": { "uuid": "..." }
}
```
Headers: `sentry-hook-resource: event_alert`, `sentry-hook-signature: <valid HMAC>`.

Expected Slack message (Block Kit):
- Header/section: `🔴 *ReferenceError: heck is not defined*`
- Context line: `app/api/quran/pages/[pageId]/route.ts · A new issue is created`
- Section: `<!here> <https://sentry.io/organizations/furqan/issues/12345/|View in Sentry>`

Level → emoji mapping: `error` → 🔴, `warning` → ⚠️, anything else (fatal, info, debug) → fall back to a plain 🔔 so an unmapped level never breaks message construction.

**Case: installation ping**

Headers: `sentry-hook-resource: installation`. Route returns `200` immediately, no Slack POST, no message content to verify (nothing sent).

**Case: forged/missing signature**

Any request without a valid `sentry-hook-signature` → `401`. No Slack POST regardless of `sentry-hook-resource` or body content — signature check happens first, before resource-type branching.

**Case: Slack webhook unreachable**

Valid signature, `event_alert` resource, `fetch` to `SLACK_WEBHOOK_URL` returns a non-2xx or throws → route throws → `500` → captured by existing Sentry instrumentation, no custom logging added.

## Files to Change

- **`app/api/webhooks/sentry/route.ts`** (new) — the relay route implementing the algorithm above. Uses `jsonResponse()` for its own `200`/`401` responses per `docs/standards/api-conventions.md`; Sentry doesn't parse the body, so the envelope shape is for our own consistency, not a contract Sentry depends on.
- **`.env.example`** — add commented placeholder entries: `SENTRY_WEBHOOK_SECRET`, `SLACK_WEBHOOK_URL` (documentation only, no real values), alongside the existing Sentry entries from ADR 0017.

## Environment Variables (set in Hostinger's build/runtime env panel, not in any committed file)

| Var | Used by | Scope |
|---|---|---|
| `SENTRY_WEBHOOK_SECRET` | `app/api/webhooks/sentry/route.ts` | runtime only, signature verification |
| `SLACK_WEBHOOK_URL` | `app/api/webhooks/sentry/route.ts` | runtime only, Slack POST target |

## Manual Setup (outside the codebase, done once)

1. In Sentry: **Settings → Developer Settings → New Internal Integration**. Enable **Webhooks**, set the webhook URL to `https://<prod-domain>/api/webhooks/sentry`, enable the **Alert Rule Action** toggle, leave the blanket **issue webhooks** toggle off. Save — Sentry generates the Client Secret; copy it into Hostinger as `SENTRY_WEBHOOK_SECRET`.
2. In Slack: create an **Incoming Webhook** for the target channel (api.slack.com/apps → Incoming Webhooks) and copy the URL into Hostinger as `SLACK_WEBHOOK_URL`.
3. On the Sentry alert rule(s) that should notify Slack, add the Internal Integration as an action (same alert-rule UI as any other action, e.g. "A new issue is created").

## Constraints

- The signature check must run on the **raw body bytes**, not a re-`JSON.stringify`'d object — re-serializing can reorder keys or alter whitespace and silently break the HMAC comparison.
- Use a timing-safe comparison (`crypto.timingSafeEqual`) for the signature check, not `===`, to avoid a timing side-channel.
- Do not add this route to `auth-middleware`'s `protectedRoutes` — it is not a user-authenticated route; its own HMAC check is the trust boundary.
- Do not swallow Slack POST failures — throwing and letting `instrumentation.ts` capture them is the chosen failure-visibility mechanism (see Decision Tree row 5).
- Never commit real values for `SENTRY_WEBHOOK_SECRET` or `SLACK_WEBHOOK_URL` — Hostinger panel only, same pattern as the existing Sentry env vars.

## What NOT to Do

- Do not attempt to use Sentry's native Slack alert-rule action — confirmed to require a paid Team+ plan; this plan's whole premise is avoiding that cost. Revisit only if the org upgrades (see ADR 0018 Consequences).
- Do not enable the Internal Integration's blanket "issue webhooks" toggle — only alert-rule-triggered `event_alert` events should reach the relay; the resource-type branch (Decision Tree row 3) depends on this staying off.
- Do not build multi-channel/multi-environment routing logic — confirmed out of scope; only prod reports to Sentry today (ADR 0017), so one `SLACK_WEBHOOK_URL` is sufficient. Revisit if a staging Sentry project is ever added.
- Do not skip signature verification "since it's simpler" — this is a public endpoint and the explicit constraint from the ADR.

## Decisions Made

- **Webhook scope:** Alert Rule webhooks only (`event_alert`), not the blanket issue-lifecycle webhooks — confirmed with user.
- **Signature verification:** required (HMAC-SHA256 via `SENTRY_WEBHOOK_SECRET`) — confirmed with user.
- **Non-alert resource types** (e.g. `installation`): acknowledge with `200`, do nothing — confirmed with user.
- **Slack post failure handling:** throw and let it propagate to existing Sentry error capture — confirmed with user.
- **Message format:** rich Slack Block Kit (emoji + bold title + culprit/rule context + link), with an `<!here>` mention — confirmed with user.
- **Channel routing:** single channel via one `SLACK_WEBHOOK_URL`, no multi-channel design — confirmed with user.
