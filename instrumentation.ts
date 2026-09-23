import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    if (process.env.NODE_ENV === "development" && process.env.CRON_SECRET) {
      const cronSecret = process.env.CRON_SECRET;
      const ports = process.env.PORT ? [process.env.PORT] : ["7000", "3000"];

      const pollReminders = async () => {
        for (const port of ports) {
          try {
            const res = await fetch(`http://localhost:${port}/api/cron/reminders`, {
              method: "GET",
              headers: {
                "x-cron-secret": cronSecret,
              },
            });
            if (res.ok) {
              const json = await res.json().catch(() => null);
              if (json?.data?.claimed > 0) {
                console.log("[dev-cron] Processed reminders:", json.data);
              }
              break;
            }
          } catch {
            // Ignore connection errors (e.g. server still booting or alternative port)
          }
        }
      };

      const timer = setInterval(pollReminders, 60_000);
      timer.unref();
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors from Server Components, Route Handlers, and middleware.
export const onRequestError = Sentry.captureRequestError;
