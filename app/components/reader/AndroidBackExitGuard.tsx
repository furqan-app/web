"use client";

import { useEffect, useRef, useState } from "react";
import { isAndroid, isStandaloneDisplayMode } from "@/app/utils/platform";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { ExitToast } from "./ExitToast";

const ARM_WINDOW_MS = 2000;

// A FRESH object per push, never a shared constant. Next's history patch
// mutates whatever object it is handed, stamping `__NA` and the current router
// tree onto it — so a reused one both freezes the tree captured at the first
// push and, via the patch's `__NA` early-out, bypasses the router sync on every
// push after that. The pager navigates by `replaceState`, which Next turns into
// an `ACTION_RESTORE` that reads that tree back, so a stale one re-renders the
// app at the wrong locale and page from cache (#288, ADR 0040 addendum).
const guardState = () => ({ fqExitGuard: true });

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

    // No `url` argument, deliberately: Next only dispatches ACTION_RESTORE when
    // one is supplied, so omitting it keeps the guard's push from moving the
    // pager's anchor.
    history.pushState(guardState(), "");

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
        history.pushState(guardState(), "");
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
