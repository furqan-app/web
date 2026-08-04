import type { NotificationChannel } from "@/app/lib/notifications/types";

/** The Notification row itself IS the in-app item — send is a no-op that always succeeds (LSP: no special-casing in dispatch). */
export const createInAppChannel = (): NotificationChannel => ({
  key: "in_app",
  send: async () => ({ status: "sent" }),
});
