# ADR 0018: Sentry-to-Slack Alerting via a Self-Hosted Relay Webhook

**Date:** 2026-07-08
**Status:** Accepted

## Context

Sentry's native Slack alert-rule action (`app/[locale]/../sentry.*.config.ts` already captures errors per [ADR 0017](0017-sentry-error-tracking.md)) requires a Team-plan-or-above Sentry subscription. The app currently runs on Sentry's free Developer plan and there's no budget approved for an upgrade. We still want triggered issue alerts to land in a Slack channel.

## Options Considered

**Option A — Email-to-Slack**
Point a Sentry alert rule's email action at a Slack channel's email-in address. Zero code, but plain-text formatting and depends on the Slack workspace having channel-email enabled.

**Option B — Third-party automation (Zapier/Make/n8n)**
Wire Sentry's own webhook trigger through a no-code automation tool into a Slack action. No code to maintain, but free tiers cap monthly task volume and adds a third external account to operate.

**Option C — Self-hosted relay: Sentry Internal Integration webhook → Next.js API route → Slack Incoming Webhook**
Sentry's Integration Platform lets any org (regardless of plan) create an Internal Integration with a webhook URL and enable it as an "Alert Rule Action." Sentry POSTs a signed payload to that URL when a configured alert rule fires. A new `app/api/webhooks/sentry/route.ts` verifies the signature, reshapes the payload, and POSTs a Slack Block Kit message to a Slack Incoming Webhook (also free, independent of Sentry's plan). Full control over formatting and no third-party quota, at the cost of a small amount of code to maintain.

## Decision

Option C. The relay route lives at `app/api/webhooks/sentry/route.ts`. It:

1. Reads the raw request body and the `sentry-hook-signature` / `sentry-hook-resource` headers.
2. Verifies the signature as HMAC-SHA256 of the raw body using `SENTRY_WEBHOOK_SECRET` (the Internal Integration's Client Secret), timing-safe compared against the header. Missing or mismatched signature → `401`, no Slack post.
3. If `sentry-hook-resource` isn't `event_alert` (e.g. the one-time `installation` ping Sentry sends when the integration is installed/uninstalled), returns `200` immediately with no Slack post — this keeps Sentry's own delivery log clean without emitting noise.
4. Otherwise parses the JSON body, extracts `data.event.{title,culprit,level,web_url}` and `data.triggered_rule`, and posts a Slack Block Kit message (level emoji, bold title, culprit/rule context line, "View in Sentry" link, `<!here>` mention) to `SLACK_WEBHOOK_URL`.
5. If the Slack POST fails (non-2xx), throws — the error propagates to `instrumentation.ts`'s existing `onRequestError` hook and is captured by Sentry itself (no new error-handling code), and Next.js's `500` response shows up as a failed delivery in Sentry's own integration dashboard, giving a built-in retry/visibility mechanism for free.

Sentry's "Alert Rule Action" toggle is enabled on the Internal Integration but its blanket "issue webhooks" toggle (which fires on every issue state change regardless of alert rules) is left off — only alert-rule-triggered events reach the relay.

## Consequences

- **+** No Sentry plan upgrade required — Internal Integrations and their webhook mechanism are part of Sentry's Integration Platform, available on every plan tier.
- **+** No new third-party account or quota to manage (unlike Option B).
- **+** Slack message formatting is fully controlled by us and can evolve independently of what Sentry's native integration would show.
- **+** Failure handling reuses the existing Sentry error-capture pipeline (ADR 0017) instead of adding bespoke logging.
- **-** This is a public, unauthenticated-by-user endpoint (Sentry can't authenticate as an app user) — its only protection is HMAC signature verification. `SENTRY_WEBHOOK_SECRET` must never leak, and the route must reject any request that fails verification before doing any other work.
- **-** Two new secrets (`SENTRY_WEBHOOK_SECRET`, `SLACK_WEBHOOK_URL`) must be provisioned in Hostinger's env panel, mirroring the existing Sentry env vars from ADR 0017 — another manual deploy-environment step, not something `next build` can verify locally without them set.
- **-** We now own a small amount of integration-glue code (payload parsing, Slack message formatting) that Sentry's native integration would otherwise maintain for us; if the org ever upgrades to Sentry Team+, this relay could be retired in favor of the native action.
