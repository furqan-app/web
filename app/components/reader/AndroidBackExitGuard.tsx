"use client";

import { useEffect, useRef, useState } from "react";
import { isAndroid, isStandaloneDisplayMode } from "@/app/utils/platform";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { ExitToast } from "./ExitToast";

const ARM_WINDOW_MS = 2000;
const GUARD_STATE = { fqExitGuard: true };

type Props = {
  // false for the shared-mushaf grant reader — mirrors LastReadPageSync's
  // /mushaf/ exclusion; that route isn't the user's own reading session.
  active: boolean;
};

/**
 * Android-only, installed-app-only "press back again to exit" guard (ADR
 * 0040). Pushes one history entry and, on every intercepted back press while
 * unarmed, re-pushes it — the guard never lets a real back navigation reach
 * whatever is genuinely behind it (e.g. Home) while mounted. Only a second
 * press within ARM_WINDOW_MS skips the re-push and attempts `window.close()`.
 * See the ADR for why a single pushed entry isn't sufficient.
 */
export const AndroidBackExitGuard = ({ active }: Props) => {
  const isDesktopUp = useIsDesktopUp();
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabled =
    active &&
    !isDesktopUp &&
    typeof window !== "undefined" &&
    isAndroid() &&
    isStandaloneDisplayMode();

  useEffect(() => {
    if (!enabled) return;

    history.pushState(GUARD_STATE, "");

    const disarm = () => {
      armedRef.current = false;
      setArmed(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onPopState = () => {
      if (!armedRef.current) {
        history.pushState(GUARD_STATE, "");
        armedRef.current = true;
        setArmed(true);
        timerRef.current = setTimeout(disarm, ARM_WINDOW_MS);
        return;
      }
      // Second press within the window: best-effort exit, no re-push — see
      // ADR 0040 for why `window.close()` is the only viable mechanism and
      // why it's a no-op outside installed standalone/fullscreen Android.
      disarm();
      window.close();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      disarm();
    };
  }, [enabled]);

  return <ExitToast show={armed} />;
};
