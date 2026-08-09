import type { FqLogger } from "@/lib/fq-logger";
import { getNotificationType } from "@/app/constants/notifications";
import type { NotificationChannelKey, RenderContext } from "@/app/constants/notifications";
import { resolveChannels } from "@/app/lib/notifications/resolve-channels";
import type {
  ChannelRegistry,
  Clock,
  DeliveryResult,
  NotificationStore,
  Recipient,
} from "@/app/lib/notifications/types";

export type DispatchDeps = {
  store: NotificationStore;
  registry: ChannelRegistry;
  clock: Clock;
  logger: FqLogger;
  renderContext: (locale: string) => RenderContext;
};

export type DispatchInput = {
  recipient: Recipient;
  type: string;
  payload: unknown;
  channels?: NotificationChannelKey[];
};

export type DispatchOutcome = {
  notificationId: number | null;
  results: Record<string, DeliveryResult>;
};

/**
 * Orchestration only — no DB/clock imports of its own, everything via `deps`
 * (mirrors app/lib/plans/engine.ts's "no DB, no clock" style). Never throws:
 * an unknown type, a rendering/persistence failure, or a failing channel is
 * recorded/logged, never propagated to the caller.
 */
export const dispatchNotification = async (
  input: DispatchInput,
  deps: DispatchDeps
): Promise<DispatchOutcome> => {
  const typeDef = getNotificationType(input.type);
  if (!typeDef) {
    deps.logger.warn("notifications.dispatch.unknown_type", { type: input.type });
    return { notificationId: null, results: {} };
  }

  const available = Object.keys(deps.registry) as NotificationChannelKey[];
  const { selected, skipped } = resolveChannels(typeDef, input.channels, available);

  let notificationId: number;
  let content: ReturnType<typeof typeDef.render>;
  let emailContent: ReturnType<NonNullable<typeof typeDef.renderEmail>> | undefined;

  try {
    const ctx = deps.renderContext(input.recipient.locale);
    content = typeDef.render(input.payload, ctx);
    emailContent = typeDef.renderEmail?.(input.payload, ctx);

    const created = await deps.store.createNotification({
      userId: input.recipient.userId,
      type: input.type,
      payload: input.payload,
      channels: selected,
    });
    notificationId = created.id;
  } catch (error) {
    deps.logger.error("notifications.dispatch.persist_failed", {
      type: input.type,
      userId: input.recipient.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { notificationId: null, results: {} };
  }

  const results: Record<string, DeliveryResult> = {};

  for (const channel of skipped) {
    const result: DeliveryResult = { status: "skipped", reason: "channel_unavailable" };
    results[channel] = result;
    await deps.store.recordDelivery(notificationId, channel, result);
  }

  await Promise.allSettled(
    selected.map(async (channel) => {
      const sender = deps.registry[channel];
      if (!sender) return;

      let result: DeliveryResult;
      try {
        result = await sender.send({
          notificationId,
          type: input.type,
          payload: input.payload,
          content,
          emailContent,
          typeDef,
          recipient: input.recipient,
        });
      } catch (error) {
        // Channels are contracted to never throw, but a boundary this wide
        // (arbitrary third-party SDKs) enforces that contract rather than
        // trusting every implementation — an uncaught throw here would
        // otherwise leave this channel's delivery row stuck "pending" forever.
        const message = error instanceof Error ? error.message : String(error);
        deps.logger.error("notifications.dispatch.channel_threw", { channel, error: message });
        result = { status: "failed", error: message };
      }

      results[channel] = result;
      await deps.store.recordDelivery(notificationId, channel, result);
    })
  );

  return { notificationId, results };
};

export const dispatchToUsers = (
  recipients: Recipient[],
  input: Omit<DispatchInput, "recipient">,
  deps: DispatchDeps
): Promise<DispatchOutcome[]> =>
  Promise.all(recipients.map((recipient) => dispatchNotification({ ...input, recipient }, deps)));
