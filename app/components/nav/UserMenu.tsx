"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { User, LogOut, Bookmark, Target } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";
import { navPillClassName } from "./NavPillLink";

export const UserMenu = () => {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("account", "Account")}
          className={cn(navPillClassName, "md:border md:border-border")}
        >
          <span className="w-7 h-7 rounded-lg bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground flex-none">
            <User className="size-3.5" />
          </span>
          <span className="hidden md:inline">{t("account", "Account")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {session ? (
          <DropdownMenuItem className="font-medium">
            {session.user?.name}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/marks" locale={locale}>
            <Bookmark className="size-4" />
            {t("marks.navLink", "My Marks")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/plans" locale={locale}>
            <Target className="size-4" />
            {t("plans.navLink", "My Plans")}
          </Link>
        </DropdownMenuItem>
        {session ? (
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => signIn()}>
            Sign in
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
