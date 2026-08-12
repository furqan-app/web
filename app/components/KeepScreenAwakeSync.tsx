"use client";

import { useEffect, useRef } from "react";
import { useKeepScreenAwake } from "@/app/contexts/KeepScreenAwakeContext";
import { useIsMobile } from "@/app/hooks/use-is-mobile";
import { useIsTablet } from "@/app/hooks/use-is-tablet";

// Null-rendering effect leaf, mirroring LastReadPageSync: holds the
// WakeLockSentinel and keeps it in sync with the enabled toggle, device
// breakpoint, and tab visibility. The browser force-releases the sentinel
// whenever the tab is hidden, so it must be re-requested on the next
// visibilitychange back to "visible" — the sentinel's own "release" event is
// what clears our ref in that case.
export function KeepScreenAwakeSync() {
  const { enabled } = useKeepScreenAwake();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const shouldHold = enabled && (isMobile || isTablet);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    const release = () => {
      sentinelRef.current = null;
    };

    const request = async () => {
      if (sentinelRef.current || document.visibilityState !== "visible") return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        sentinel.addEventListener("release", release);
        sentinelRef.current = sentinel;
      } catch {
        // Silent no-op — e.g. OS low-power mode blocked the request.
      }
    };

    if (shouldHold) {
      request();
    } else if (sentinelRef.current) {
      sentinelRef.current.release();
      sentinelRef.current = null;
    }

    const onVisibilityChange = () => {
      if (shouldHold && document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (sentinelRef.current) {
        sentinelRef.current.release();
        sentinelRef.current = null;
      }
    };
  }, [shouldHold]);

  return null;
}
