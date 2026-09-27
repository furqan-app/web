"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { hardNavigateIfOffline } from "@/app/utils/platform";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export const FurqanLogo = ({ className }: Props = {}) => {
  const locale = useLocale();
  return (
  <Link
    href="/"
    aria-label="Home"
    onClick={(e) => {
      // Offline route coverage (#720): this tap is an RSC soft-nav, which
      // fails for a never-visited home with no connection. Offline,
      // hard-navigate so the service worker serves the precached shell
      // instead of error.tsx + a Sentry report. Online keeps soft nav.
      hardNavigateIfOffline(e, `/${locale}`);
    }}
    className={cn(
      "group relative overflow-hidden fq-focus-ring flex-none rounded border border-primary/70 hover:border-primary active:scale-[0.95] size-[35px] flex items-center justify-center bg-transparent transition-all duration-200",
      className,
    )}
  >
    {/* Glass reflection / shine sweep from bottom to top */}
    <span
      className="pointer-events-none absolute -inset-[100%] z-20 bg-gradient-to-tr from-transparent via-white/35 dark:via-white/25 to-transparent -translate-x-full translate-y-full rotate-12 transition-transform duration-700 ease-out group-hover:translate-x-full group-hover:-translate-y-full"
      aria-hidden="true"
    />
    <span className="fq-logo-mark size-[40px] flex-none relative z-10 transition-transform duration-200 group-hover:scale-[1.04]" aria-hidden="true" />
  </Link>
  );
};
