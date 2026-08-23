"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { useRouter, usePathname } from "@/i18n/routing";

/**
 * Shown on the shared-mushaf hub when a viewer was redirected here after losing
 * access (grant revoked, or grant no longer theirs) — the grant layout sends them
 * to `/{locale}/mushaf?removed=1`. Copy is generic (no owner name): a revoked
 * grant row is already deleted, and naming the owner would leak identity (ADR 0012).
 */
export const AccessRemovedBanner = () => {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    // Drop `?removed` so a reload or back-navigation doesn't re-show the banner.
    router.replace(pathname);
  };

  // Warning style. This used raw `amber-*` utilities plus a `dark:` variant
  // because the token set had no `--warning` — a per-theme fork of one rule,
  // which is precisely what the language forbids. Subtask 4.4 added the
  // `--warning` / `--warning-foreground` pair to all three theme blocks, so
  // the rule is now theme-agnostic and only the values differ.
  //
  // The banner stays deliberately generic — no owner name (ADR 0012) — and
  // takes neither accent: "something is wrong" is never identity or state.
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
    >
      <AlertTriangle className="size-4 flex-none text-warning" strokeWidth={1.9} />
      <p className="flex-1 text-xs font-medium text-foreground">
        {t("mushaf.accessRemoved", "You no longer have access to this mushaf.")}
      </p>
      <button
        onClick={dismiss}
        aria-label={t("mushaf.dismiss", "Dismiss")}
        className="fq-focus-ring flex-none rounded-lg p-1 text-warning transition-[background-color,transform] duration-150 hover:bg-warning/15 active:scale-95"
      >
        <X className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  );
};
