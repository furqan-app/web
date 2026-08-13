"use client";

import { Bell } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/app/hooks/use-notifications";
import { NotificationFeed } from "@/app/components/notifications/NotificationFeed";
import { menuRowClassName } from "@/app/components/nav/NavPillLink";

type Props = {
  // Renders as a full-width menu row (NavOverflowMenu's shared row template,
  // label always visible) instead of the icon-only desktop trigger.
  menuRow?: boolean;
  // Portal target for PopoverContent — pass NavOverflowMenu's SheetContent
  // node when menuRow is true (see PopoverContent's own comment).
  container?: HTMLElement | null;
};

/** Bell trigger — icon-only in Nav directly (desktop, and mobile before this
 * moved into NavOverflowMenu); full labeled row when rendered inside that menu. */
export const NotificationBell = ({ menuRow, container }: Props = {}) => {
  const t = useTranslations();
  const { data } = useNotifications();
  const unreadCount = data?.unread_count ?? 0;
  const label = t("notifications.bellLabel", "Notifications");

  return (
    <Popover>
      <PopoverTrigger asChild>
        {menuRow ? (
          <button aria-label={label} className={menuRowClassName}>
            <span className="relative flex-none">
              <Bell className="size-5" strokeWidth={1.7} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-primary" />
              )}
            </span>
            <span>{label}</span>
          </button>
        ) : (
          <Button variant="ghost" size="icon" aria-label={label} className="relative">
            <Bell className="size-5" strokeWidth={1.7} />
            {unreadCount > 0 && (
              <span className="absolute top-1 end-1 size-2 rounded-full bg-primary" />
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0" container={container}>
        <NotificationFeed />
      </PopoverContent>
    </Popover>
  );
};
