"use client";

import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { isStandaloneDisplayMode } from "@/app/utils/platform";

// Shared by AndroidBackExitGuard and useCloseOnBackGesture — the common half
// of both platform gates (mobile/tablet, installed standalone/fullscreen).
// AndroidBackExitGuard additionally requires isAndroid(); useCloseOnBackGesture
// does not (it also guards on iOS). Recomputed every render, matching the
// inline expressions this replaces.
export const useIsStandaloneMobileOrTablet = () => {
  const isDesktopUp = useIsDesktopUp();
  return (
    typeof window !== "undefined" && !isDesktopUp && isStandaloneDisplayMode()
  );
};
