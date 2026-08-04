"use client";

import useTranslations from "@hooks/use-translations";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/app/hooks/use-notifications";
import { NotificationItem } from "@/app/components/notifications/NotificationItem";

export const NotificationFeed = () => {
  const t = useTranslations();
  const { data, isLoading, markRead, markAllRead } = useNotifications();
  const items = data?.items ?? [];

  return (
    <div className="w-80 max-w-[90vw]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-sm font-semibold">
          {t("notifications.feed.title", "Notifications")}
        </span>
        {items.some((item) => !item.read_at) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2 text-xs"
            onClick={() => markAllRead.mutate()}
          >
            {t("notifications.feed.markAllRead", "Mark all read")}
          </Button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto p-1.5 space-y-0.5">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("notifications.feed.loading", "Loading…")}
          </p>
        )}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("notifications.feed.empty", "No notifications yet")}
          </p>
        )}
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onOpen={(id) => markRead.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
};
