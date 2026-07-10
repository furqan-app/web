import * as Sentry from "@sentry/nextjs";

// dsn is unset in dev (.env.local) and only set in Hostinger's build/runtime
// env — the SDK no-ops without it, so this stays silent locally. See ADR 0017.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
