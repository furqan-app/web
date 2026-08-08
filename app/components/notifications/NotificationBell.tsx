"use client";

import { Bell } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/app/hooks/use-notifications";
import { NotificationFeed } from "@/app/components/notifications/NotificationFeed";

/** Always-visible navbar bell — mounted alongside SharedMushafLink. */
export const NotificationBell = () => {
  const t = useTranslations();
  const { data } = useNotifications();
  const unreadCount = data?.unread_count ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("notifications.bellLabel", "Notifications")}
          className="relative"
        >
          <Bell className="size-5" strokeWidth={1.7} />
          {unreadCount > 0 && (
            <span className="absolute top-1 end-1 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0">
        <NotificationFeed />
      </PopoverContent>
    </Popover>
  );
};
