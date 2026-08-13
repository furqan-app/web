"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { storage } from "@/app/utils/storage";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";

// Module-level, not component state: must survive across every mount of the
// home page within one browser session (real navigation away and back), so a
// manual tap on the nav's Home icon later in the session renders the surah
// list normally instead of bouncing straight back to the reader. A fresh page
// load (cold launch, hard refresh) always resets it, which is exactly what
// "once per session" means here.
let hasCheckedColdLaunch = false;

/**
 * Rendered only on the home page. On a cold launch of the installed
 * mobile/tablet PWA, redirects straight to the last-read reader page instead
 * of showing the surah list — the online counterpart to the offline
 * fallback-document self-correction already handled by ReaderPager (ADR 0014
 * Addendum 3). No-op in a browser tab, on desktop, or after the first check
 * this session. See docs/plans/pwa-app-stickiness.md.
 */
export const AppLaunchRedirect = () => {
  const router = useRouter();
  const isDesktopUp = useIsDesktopUp();

  useEffect(() => {
    if (hasCheckedColdLaunch) return;
    hasCheckedColdLaunch = true;
    if (isDesktopUp) return;
    if (!isStandaloneDisplayMode()) return;
    const lastReadPage = storage.get("lastReadPage") ?? 1;
    router.replace(`/pages/${lastReadPage}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
