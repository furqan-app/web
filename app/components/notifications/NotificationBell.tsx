"use client";

import { Bell } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/app/hooks/use-notifications";
import { NotificationFeed } from "@/app/components/notifications/NotificationFeed";
import { menuRowClassName } from "@/app/components/nav/NavPillLink";

import { cn } from "@/lib/utils";

type Props = {
  // Renders as a full-width menu row
  menuRow?: boolean;
  // Renders as a DropdownMenuItem (for use inside UserMenu on mobile)
  asDropdownItem?: boolean;
  // Portal target for PopoverContent
  container?: HTMLElement | null;
  className?: string;
};

/** Bell trigger — icon-only in Nav directly; full labeled row when rendered inside overflow menu. */
export const NotificationBell = ({ menuRow, asDropdownItem, container, className }: Props = {}) => {
  const t = useTranslations();
  const { data } = useNotifications();
  const unreadCount = data?.unread_count ?? 0;
  const label = t("notifications.bellLabel", "Notifications");

  return (
    <Popover>
      <PopoverTrigger asChild>
        {asDropdownItem ? (
          <DropdownMenuItem
            className={cn("cursor-pointer", className)}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="relative flex-none">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 size-1.5 rounded-full bg-primary" />
              )}
            </span>
            <span>{label}</span>
          </DropdownMenuItem>
        ) : menuRow ? (
          <button aria-label={label} className={cn(menuRowClassName, className)}>
            <span className="relative flex-none">
              <Bell className="size-5" strokeWidth={1.7} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-primary" />
              )}
            </span>
            <span>{label}</span>
          </button>
        ) : (
          <Button variant="ghost" size="icon" aria-label={label} className={cn("relative", className)}>
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
