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
import { navPillClassName, menuRowClassName } from "./NavPillLink";

type Props = {
  // Renders as a full-width menu row (NavOverflowMenu's shared row template,
  // label always visible) instead of the compact desktop pill.
  menuRow?: boolean;
  // Portal target for DropdownMenuContent — pass NavOverflowMenu's SheetContent
  // node when menuRow is true, so the dropdown isn't a DOM sibling of the
  // enclosing Sheet's modal FocusScope (see DropdownMenuContent's own comment).
  container?: HTMLElement | null;
};

export const UserMenu = ({ menuRow, container }: Props = {}) => {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("account", "Account")}
          className={cn(menuRow ? menuRowClassName : navPillClassName, !menuRow && "md:border md:border-border")}
        >
          <span className="w-7 h-7 rounded-lg bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground flex-none">
            <User className="size-3.5" />
          </span>
          <span className={cn(!menuRow && "hidden md:inline")}>
            {t("account", "Account")}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" container={container}>
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
