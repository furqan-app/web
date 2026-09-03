---
title: Sentry-to-Slack Alerting via Relay Webhook
type: feature
date: 2026-07-08
status: implemented
area: observability
---

# Sentry-to-Slack Alerting via Relay Webhook

## Summary

Sentry's native Slack action requires Team-plan+. Instead: a relay endpoint receives Sentry's Internal Integration webhook when an alert rule fires, verifies the HMAC signature, and forwards a formatted message to a Slack Incoming Webhook (free on both sides). See [ADR 0018](../../architecture/adr/0018-sentry-slack-relay-webhook.md).

## Route: `app/api/webhooks/sentry/route.ts` (POST only)

1. Read raw body as text (must hash exact bytes Sentry signed — never re-serialize).
2. Read `sentry-hook-signature` and `sentry-hook-resource` headers.
3. Compute `HMAC-SHA256(SENTRY_WEBHOOK_SECRET, rawBody)` hex; timing-safe compare to signature. Missing or mismatch → `401`, stop.
4. If `sentry-hook-resource !== "event_alert"` → `200`, stop (silent ack for `installation` ping etc.).
5. `JSON.parse` body, extract `data.event.{title,culprit,level,web_url}` and `data.triggered_rule`.
6. Build Slack Block Kit payload (emoji + bold title + culprit/rule + `<!here>` link) and POST to `SLACK_WEBHOOK_URL`. Level→emoji: `error`→🔴, `warning`→⚠️, else→🔔.
7. Slack POST failure → throw (propagates to `instrumentation.ts`'s `onRequestError`, captured by Sentry, returns 500 — visible as failed delivery in Sentry's integration dashboard).
8. Success → `jsonResponse({ data: { relayed: true } })`.

Not added to `auth-middleware`'s `protectedRoutes` — its own HMAC check is the trust boundary. `withIntl` already bypasses `/api`.

## Decision Table

| Condition | Result |
|---|---|
| Missing signature | 401, no Slack |
| Invalid HMAC | 401, no Slack |
| Valid, resource ≠ `event_alert` | 200, no Slack |
| Valid, `event_alert`, Slack 2xx | 200, message sent |
| Valid, `event_alert`, Slack fails | throw → 500 → Sentry capture |

## Files Changed

- `app/api/webhooks/sentry/route.ts` — new relay route
- `.env.example` — placeholder entries: `SENTRY_WEBHOOK_SECRET`, `SLACK_WEBHOOK_URL`

## Environment Variables (Hostinger panel only — never commit)

| Var | Purpose |
|---|---|
| `SENTRY_WEBHOOK_SECRET` | HMAC signature verification |
| `SLACK_WEBHOOK_URL` | Slack POST target |

## One-Time Manual Setup

1. **Sentry:** Settings → Developer Settings → New Internal Integration. Enable Webhooks; URL = `https://<prod-domain>/api/webhooks/sentry`; enable Alert Rule Action toggle; leave blanket issue webhooks off. Copy generated Client Secret → Hostinger as `SENTRY_WEBHOOK_SECRET`.
2. **Slack:** Create Incoming Webhook for target channel → copy URL → Hostinger as `SLACK_WEBHOOK_URL`.
3. Add the Internal Integration as an action on relevant Sentry alert rules.

## Constraints

- Signature check must run on raw body bytes, not re-serialized JSON — key reordering silently breaks HMAC.
- Use `crypto.timingSafeEqual`, not `===`.
- Never enable the Internal Integration's blanket issue webhooks toggle — only `event_alert` should reach the relay.
- Do not swallow Slack POST failures — throw and let `instrumentation.ts` handle them.
- Single `SLACK_WEBHOOK_URL` — no multi-channel routing (only prod reports to Sentry today; revisit if staging is added).
