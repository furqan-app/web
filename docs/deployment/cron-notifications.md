# Deployment Runbook: Scheduled Reminders Cron & Web Push

This document describes how to configure environment variables, VAPID credentials, and the Hostinger hPanel cron job for scheduled wird reminders and push notifications.

## 1. Generate VAPID Keypair

Run in the repository root:
```bash
npx web-push generate-vapid-keys --json
```

Save `publicKey` as both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Save `privateKey` as `VAPID_PRIVATE_KEY`.
Set `VAPID_SUBJECT="mailto:support@furqan.app"`.

## 2. Generate Cron Secret

```bash
openssl rand -hex 32
```

Save as `CRON_SECRET` in Hostinger's environment variable panel.

## 3. Configure Hostinger hPanel Cron Job

1. Log in to Hostinger hPanel → **Advanced** → **Cron Jobs**.
2. Select **Custom**.
3. Schedule: `*/5 * * * *` (every 5 minutes, matching ADR 0037).
4. Command:
   ```bash
   curl -s -X POST -H "x-cron-secret: <CRON_SECRET>" https://furqan.app/api/cron/reminders > /dev/null 2>&1
   ```

## 4. SMTP Email Delivery (Optional)

If email delivery is desired, configure:
- `SMTP_HOST`: SMTP host (e.g. `smtp.hostinger.com`)
- `SMTP_PORT`: `587`
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `EMAIL_FROM`: `Furqan <no-reply@furqan.app>`

If unset, email delivery safely falls back to structured logger output without throwing.
