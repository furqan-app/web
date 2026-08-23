"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { User, LogOut, Bookmark, CalendarDays, ChevronDown, ChevronUp, Users, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import useTranslations from "@hooks/use-translations";
import { navPillClassName, menuRowClassName } from "./NavPillLink";
import { useNotifications } from "@/app/hooks/use-notifications";
import { NotificationBell } from "@components/notifications/NotificationBell";

type Props = {
  // Renders as a full-width menu row
  menuRow?: boolean;
  // Portal target for DropdownMenuContent
  container?: HTMLElement | null;
  // Closes menu
  onNavigate?: () => void;
  // Opens Settings Sidebar
  onOpenSettings?: () => void;
};

export const UserMenu = ({ menuRow, container, onNavigate, onOpenSettings }: Props = {}) => {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const { data: notifData } = useNotifications();
  const unreadCount = notifData?.unread_count ?? 0;

  if (menuRow) {
    return (
      <div>
        <button
          type="button"
          aria-label={t("account", "Account")}
          aria-expanded={expanded}
          className={menuRowClassName}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="relative w-7 h-7 rounded-lg bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground flex-none">
            <User className="size-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 size-2.5 rounded-full bg-primary border-2 border-background" />
            )}
          </span>
          <span>{t("account", "Account")}</span>
          {expanded ? (
            <ChevronUp className="size-4 ms-auto text-muted-foreground flex-none" />
          ) : (
            <ChevronDown className="size-4 ms-auto text-muted-foreground flex-none" />
          )}
        </button>
        {expanded && (
          <div className="flex flex-col ps-11">
            {session ? (
              <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground truncate">
                {session.user?.name}
              </div>
            ) : null}
            <Link href="/marks" locale={locale} className={menuRowClassName} onClick={onNavigate}>
              <Bookmark className="size-4 flex-none" />
              {t("marks.navLink", "My Marks")}
            </Link>
            <Link href="/plans" locale={locale} className={menuRowClassName} onClick={onNavigate}>
              <CalendarDays className="size-4 flex-none" />
              {t("plans.navLink", "My Plans")}
            </Link>
            {session ? (
              <button
                type="button"
                className={menuRowClassName}
                onClick={() => {
                  onNavigate?.();
                  signOut();
                }}
              >
                <LogOut className="size-4 flex-none" />
                {t("signOut", "Sign out")}
              </button>
            ) : (
              <button
                type="button"
                className={menuRowClassName}
                onClick={() => {
                  onNavigate?.();
                  signIn();
                }}
              >
                {t("signIn", "Sign in")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("account", "Account")}
          className="relative size-9 rounded-full bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground flex-none hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <User className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 size-3 rounded-full bg-primary border-[2px] border-background" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" container={container}>
        {session ? (
          <DropdownMenuItem className="font-medium">
            {session.user?.name}
          </DropdownMenuItem>
        ) : null}
        
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/mushaf" locale={locale}>
            <Users className="size-4" />
            {t("mushaf.navLink", "Shared mushaf")}
          </Link>
        </DropdownMenuItem>
        <NotificationBell className="md:hidden" asDropdownItem container={container} />
        <DropdownMenuItem className="md:hidden cursor-pointer" onClick={() => onOpenSettings?.()}>
          <Settings className="size-4" />
          {t("settings", "Settings")}
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/marks" locale={locale}>
            <Bookmark className="size-4" />
            {t("marks.navLink", "My Marks")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/plans" locale={locale}>
            <CalendarDays className="size-4" />
            {t("plans.navLink", "My Plans")}
          </Link>
        </DropdownMenuItem>
        {session ? (
          <DropdownMenuItem className="cursor-pointer" onClick={() => signOut()}>
            <LogOut className="size-4" />
            {t("signOut", "Sign out")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="cursor-pointer" onClick={() => signIn()}>
            {t("signIn", "Sign in")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
