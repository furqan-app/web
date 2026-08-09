"use client";

import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { NotificationListResponse } from "@/app/api/notifications/route";

type Props = {
  notification: NotificationListResponse["items"][number];
  onOpen: (id: number) => void;
};

export const NotificationItem = ({ notification, onOpen }: Props) => {
  const locale = useLocale();
  const isUnread = !notification.read_at;

  return (
    <Link
      href={notification.content.url ?? "/"}
      locale={locale}
      onClick={() => onOpen(notification.id)}
      className={cn(
        "block px-3 py-2.5 rounded-lg transition-colors hover:bg-accent/50",
        isUnread && "bg-accent/30"
      )}
    >
      <div className="flex items-start gap-2">
        {isUnread && <span className="mt-1.5 size-1.5 rounded-full bg-primary flex-none" />}
        <div className="min-w-0">
          <p className={cn("text-sm", isUnread ? "font-semibold" : "font-normal")}>
            {notification.content.title}
          </p>
          {notification.content.body && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.content.body}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};
