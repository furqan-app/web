"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";

export const navPillClassName =
  "flex items-center gap-2 rounded-xl px-2 md:px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors";

// Shared row template for NavOverflowMenu — every item inside that menu (a
// link, a Popover trigger, a DropdownMenu trigger, a Sheet trigger) renders
// through this same shape so the menu reads as one surface instead of four
// components' own trigger styling stacked together (2026-08-13,
// docs/plans/home-page-design-fixes.md — the "unprofessional" critique's
// root cause was exactly this: no shared row shape).
export const menuRowClassName =
  "flex items-center gap-3 w-full h-11 px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors";

type Props = {
  href: string;
  locale: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
  menuRow?: boolean;
};

export const NavPillLink = ({ href, locale, onClick, children, menuRow }: Props) => (
  <Link href={href} locale={locale} onClick={onClick} className={menuRow ? menuRowClassName : navPillClassName}>
    {children}
  </Link>
);
