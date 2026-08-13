"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";

export const navPillClassName =
  "flex items-center gap-2 rounded-xl px-2 md:px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors";

type Props = {
  href: string;
  locale: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

export const NavPillLink = ({ href, locale, onClick, children }: Props) => (
  <Link href={href} locale={locale} onClick={onClick} className={navPillClassName}>
    {children}
  </Link>
);
