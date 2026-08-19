"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export const navPillClassName =
  "fq-nav-tab flex items-center gap-2 px-2 md:px-3 py-1.5 text-xs text-muted-foreground";

// Shared row template for NavOverflowMenu — every item inside that menu (a
// link, a Popover trigger, a DropdownMenu trigger, a Sheet trigger) renders
// through this same shape so the menu reads as one surface instead of four
// components' own trigger styling stacked together (2026-08-13,
// docs/plans/home-page-design-fixes.md — the "unprofessional" critique's
// root cause was exactly this: no shared row shape).
export const menuRowClassName =
  "flex items-center gap-3 w-full h-11 px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer";

type Props = {
  href: string;
  locale: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
  menuRow?: boolean;
  className?: string;
};

export const NavPillLink = ({ href, locale, onClick, children, menuRow, className }: Props) => (
  <Link href={href} locale={locale} onClick={onClick} className={cn(menuRow ? menuRowClassName : navPillClassName, className)}>
    {children}
  </Link>
);
