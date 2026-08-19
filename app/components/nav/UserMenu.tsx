"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { User, LogOut, Bookmark, Target, ChevronDown, ChevronUp } from "lucide-react";
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

type Props = {
  // Renders as a full-width menu row (NavOverflowMenu's shared row template,
  // label always visible) instead of the compact desktop pill.
  menuRow?: boolean;
  // Portal target for DropdownMenuContent — only consumed by the non-menuRow
  // (dropdown pill) rendering below; the menuRow rendering is an inline
  // disclosure, not a portal, so it never needs one.
  container?: HTMLElement | null;
  // Closes NavOverflowMenu's enclosing Sheet — called on every submenu item
  // that navigates or ends the session, mirroring SharedMushafLink's own
  // onNavigate (docs/plans/home-page-design-fixes.md, Addendum — Universal
  // nav menu). Not called by the "Account" row's own expand/collapse toggle.
  onNavigate?: () => void;
};

export const UserMenu = ({ menuRow, container, onNavigate }: Props = {}) => {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  // Inline disclosure, not a DropdownMenu: NavOverflowMenu's sheet has plenty
  // of room, and Radix's Popper-positioned DropdownMenuContent — anchored to
  // a trigger inside a bottom Sheet that's still mid slide-in transform —
  // was landing detached from the row, floating near the sheet's own close
  // button instead of under "Account". An inline expand/collapse avoids
  // Popper positioning entirely (docs/plans/home-page-design-fixes.md,
  // Addendum — Universal nav menu).
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
          <span className="w-7 h-7 rounded-lg bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground flex-none">
            <User className="size-3.5" />
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
              <Target className="size-4 flex-none" />
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
                Sign out
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
                Sign in
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
          className={navPillClassName}
        >
          <span className="w-7 h-7 rounded-lg bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground flex-none">
            <User className="size-3.5" />
          </span>
          <span className="hidden md:inline">
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
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/marks" locale={locale}>
            <Bookmark className="size-4" />
            {t("marks.navLink", "My Marks")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/plans" locale={locale}>
            <Target className="size-4" />
            {t("plans.navLink", "My Plans")}
          </Link>
        </DropdownMenuItem>
        {session ? (
          <DropdownMenuItem className="cursor-pointer" onClick={() => signOut()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="cursor-pointer" onClick={() => signIn()}>
            Sign in
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
