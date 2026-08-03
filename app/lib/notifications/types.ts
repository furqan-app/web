import type {
  NotificationChannelKey,
  NotificationContent,
  NotificationEmailContent,
  NotificationTypeDef,
} from "@/app/constants/notifications";

export type Recipient = {
  userId: number;
  email: string | null;
  locale: string;
};

export type DeliveryResult =
  | { status: "sent" }
  | { status: "skipped"; reason?: string }
  | { status: "failed"; error: string };

export type ChannelSendInput = {
  notificationId: number;
  type: string;
  payload: unknown;
  /** Rendered once by dispatch.ts (render-context built from the recipient's locale) — used by in_app + push. */
  content: NotificationContent;
  /** Rendered once by dispatch.ts via `typeDef.renderEmail`, when present — used by email. */
  emailContent?: NotificationEmailContent;
  typeDef: NotificationTypeDef;
  recipient: Recipient;
};

/** Every channel implements this same shape — dispatch never branches on which channel it is (LSP). */
export type NotificationChannel = {
  key: NotificationChannelKey;
  /** Never throws — failures are returned as `{ status: "failed" }`. */
  send: (input: ChannelSendInput) => Promise<DeliveryResult>;
};

export type ChannelRegistry = Partial<Record<NotificationChannelKey, NotificationChannel>>;

export type NotificationRow = {
  id: number;
  user_id: number;
  type: string;
  payload: unknown;
  channels: string[];
  read_at: Date | null;
  created_at: Date;
};

export type CreateNotificationInput = {
  userId: number;
  type: string;
  payload: unknown;
  channels: NotificationChannelKey[];
};

export type NotificationStore = {
  createNotification: (input: CreateNotificationInput) => Promise<{ id: number }>;
  recordDelivery: (
    notificationId: number,
    channel: NotificationChannelKey,
    result: DeliveryResult
  ) => Promise<void>;
  listNotifications: (args: {
    userId: number;
    cursor?: number;
    limit: number;
    unreadOnly?: boolean;
  }) => Promise<{ items: NotificationRow[]; nextCursor: number | null }>;
  countUnread: (userId: number) => Promise<number>;
  markRead: (userId: number, id: number) => Promise<boolean>;
  markAllRead: (userId: number) => Promise<number>;
  getPushSubscriptions: (userId: number) => Promise<
    { id: number; endpoint: string; endpointHash: string; p256dh: string; auth: string }[]
  >;
  savePushSubscription: (input: {
    userId: number;
    endpoint: string;
    endpointHash: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }) => Promise<void>;
  deletePushSubscriptionByHash: (userId: number, endpointHash: string) => Promise<void>;
  touchPushSubscription: (endpointHash: string) => Promise<void>;
  getRecipient: (userId: number) => Promise<{ email: string | null } | null>;
  upsertScheduledReminder: (input: {
    userId: number;
    type: string;
    payload: unknown;
    channels?: NotificationChannelKey[];
    scheduledFor: Date;
    recurrence?: string | null;
    timezone?: string | null;
    dedupeKey?: string;
  }) => Promise<{ id: number }>;
  claimDueReminders: (args: {
    now: Date;
    limit: number;
    claimId: string;
  }) => Promise<ScheduledReminderRow[]>;
  completeReminder: (id: number, dispatchedAt: Date) => Promise<void>;
  rescheduleReminder: (id: number, nextScheduledFor: Date) => Promise<void>;
  failReminder: (id: number, error: string) => Promise<void>;
};

export type ScheduledReminderRow = {
  id: number;
  user_id: number;
  type: string;
  payload: unknown;
  channels: NotificationChannelKey[] | null;
  scheduled_for: Date;
  recurrence: string | null;
  timezone: string | null;
};

export type Clock = () => Date;
