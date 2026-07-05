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

  // Warning style. The theme token set has no `--warning` (only `destructive`),
  // so this uses amber utilities directly: light + gold themes get the light amber
  // (no `.dark` class), the dark theme gets the `dark:` amber — a clear, noticeable
  // warning in all three.
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-amber-400 bg-amber-100 px-4 py-3 dark:border-amber-800/70 dark:bg-amber-950/40"
    >
      <AlertTriangle
        className="size-4 flex-none text-amber-600 dark:text-amber-400"
        strokeWidth={1.9}
      />
      <p className="flex-1 text-xs font-medium text-amber-900 dark:text-amber-100">
        {t("mushaf.accessRemoved", "You no longer have access to this mushaf.")}
      </p>
      <button
        onClick={dismiss}
        aria-label={t("mushaf.dismiss", "Dismiss")}
        className="flex-none rounded-lg p-1 text-amber-700 hover:bg-amber-200/70 active:scale-95 transition-[background-color,transform] duration-150 dark:text-amber-300 dark:hover:bg-amber-900/50"
      >
        <X className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  );
};
