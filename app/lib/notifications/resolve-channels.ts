import type { NotificationChannelKey, NotificationTypeDef } from "@/app/constants/notifications";

export type ResolveChannelsResult = {
  selected: NotificationChannelKey[];
  /** Channels chosen (explicitly or by default) but not in `available` — recorded as `skipped` deliveries, never silently dropped. */
  skipped: NotificationChannelKey[];
};

/**
 * Pure channel-selection logic — the seam for user preferences later (a
 * prefs lookup becomes one more input here; dispatch.ts never changes).
 * Precedence: explicit `requested` wins over the type's `defaultChannels`.
 */
export const resolveChannels = (
  typeDef: NotificationTypeDef,
  requested: NotificationChannelKey[] | undefined,
  available: NotificationChannelKey[]
): ResolveChannelsResult => {
  const wanted = requested && requested.length > 0 ? requested : typeDef.defaultChannels;
  const availableSet = new Set(available);

  const selected: NotificationChannelKey[] = [];
  const skipped: NotificationChannelKey[] = [];

  for (const channel of wanted) {
    if (availableSet.has(channel)) {
      selected.push(channel);
    } else {
      skipped.push(channel);
    }
  }

  return { selected, skipped };
};
