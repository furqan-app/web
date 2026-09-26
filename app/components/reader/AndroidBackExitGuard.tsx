"use client";

import { useEffect, useRef, useState } from "react";
import { isAndroid, isNativePlatform } from "@/app/utils/platform";
import { useIsStandaloneMobileOrTablet } from "@/app/hooks/use-is-standalone-mobile-or-tablet";
import { isOverlayBackGuardArmed } from "@/app/utils/overlay-back-guard";
import { exitNativeApp } from "@/app/lib/shell/back-button";
import {
  type FQNavigateEvent,
  getNavigation,
  supportsNavigationApi,
} from "@/app/utils/navigation-api";
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
 * Android-only, installed-app-only "press back again to exit" guard (ADR 0040, ADR 0074).
 * Uses the modern Navigation API (`navigate` + `event.intercept()`) where supported
 * to preempt back traversal before URL or router state can change, falling back to
 * the double-push popstate guard elsewhere.
 *
 * Intercepted back press while unarmed shows ExitToast and arms for 2s.
 * Second press within ARM_WINDOW_MS exits the app:
 * - Capacitor: calls exitNativeApp() (App.exitApp())
 * - PWA: calls window.close()
 */
export const AndroidBackExitGuard = ({ active }: Props) => {
  const isStandaloneMobileOrTablet = useIsStandaloneMobileOrTablet();
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandledTimeRef = useRef(0);

  const enabled =
    active &&
    typeof window !== "undefined" &&
    isAndroid() &&
    isStandaloneMobileOrTablet;

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

    const handleBackAction = (interceptFn?: () => void) => {
      // An overlay's own close-on-back guard (ADR 0043, ADR 0055) is currently armed —
      // defer to it entirely.
      if (isOverlayBackGuardArmed()) return;

      const now = Date.now();
      if (now - lastHandledTimeRef.current < 50) {
        return;
      }
      lastHandledTimeRef.current = now;

      // Preempt traversal synchronously via Navigation API where available
      interceptFn?.();

      if (!armedRef.current) {
        // Re-arm the guard state. In both Navigation API and popstate, the back action
        // has traversed back to the preceding entry (the Quran page itself); pushing a
        // new guardState here replaces any forward history and restores the guard on top
        // without accumulating orphan entries.
        history.pushState(guardState(), "");
        armedRef.current = true;
        setArmed(true);
        timerRef.current = setTimeout(disarm, ARM_WINDOW_MS);
        return;
      }

      // Second press within ARM_WINDOW_MS: exit app
      disarm();
      if (isNativePlatform() && isAndroid()) {
        exitNativeApp().catch(() => {
          window.close();
        });
      } else {
        window.close();
      }
    };

    const onPopState = () => {
      handleBackAction();
    };

    const nav = getNavigation();
    const hasNavApi = supportsNavigationApi();

    let onNavigate: ((e: FQNavigateEvent) => void) | undefined;
    if (nav && hasNavApi) {
      onNavigate = (e: FQNavigateEvent) => {
        if (e.navigationType === "traverse") {
          handleBackAction(() => e.intercept());
        }
      };
      nav.addEventListener("navigate", onNavigate);
    }

    window.addEventListener("popstate", onPopState);

    return () => {
      if (nav && onNavigate) {
        nav.removeEventListener("navigate", onNavigate);
      }
      window.removeEventListener("popstate", onPopState);
      disarm();
    };
  }, [enabled]);

  return <ExitToast show={armed} />;
};
