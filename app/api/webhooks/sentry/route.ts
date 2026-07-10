import { createHmac, timingSafeEqual } from "crypto";
import { jsonResponse } from "@/app/api/response";
import { getLogger } from "@/lib/fq-logger";

type SentryAlertPayload = {
  data: {
    event: {
      title: string;
      culprit?: string | null;
      level?: string | null;
      web_url: string;
    };
    triggered_rule: string;
  };
};

const LEVEL_EMOJI: Record<string, string> = {
  error: "\u{1F534}",
  warning: "⚠️",
};

const isValidSignature = (rawBody: string, signature: string | null) => {
  if (!signature) return false;

  const secret = process.env.SENTRY_WEBHOOK_SECRET as string;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
};

const buildSlackMessage = ({ data }: SentryAlertPayload) => {
  const emoji = LEVEL_EMOJI[data.event.level ?? ""] ?? "\u{1F514}";
  const contextParts = [data.event.culprit, data.triggered_rule].filter(Boolean);

  return {
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `${emoji} *${data.event.title}*` },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: contextParts.join(" · ") }],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<!here> <${data.event.web_url}|View in Sentry>`,
        },
      },
    ],
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("sentry-hook-signature");
  const resource = request.headers.get("sentry-hook-resource");

  if (!isValidSignature(rawBody, signature)) {
    getLogger().warn("webhooks.sentry.invalid_signature");
    return jsonResponse({ code: 401, message: "Invalid signature" });
  }

  if (resource !== "event_alert") {
    getLogger().info("webhooks.sentry.dropped", { resource });
    return jsonResponse({ data: { relayed: false } });
  }

  const payload = JSON.parse(rawBody) as SentryAlertPayload;

  const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSlackMessage(payload)),
  });

  // Deliberately not logged via getLogger().error() here — this throw
  // propagates to instrumentation.ts's onRequestError, which already reports
  // it to Sentry (ADR 0018). A second logger.error() call would double-report
  // the same failure (ADR 0019's correction, see fq-logger plan).
  if (!slackResponse.ok) {
    throw new Error(`Slack webhook post failed with status ${slackResponse.status}`);
  }

  getLogger().info("webhooks.sentry.relayed", { triggeredRule: payload.data.triggered_rule });
  return jsonResponse({ data: { relayed: true } });
}
