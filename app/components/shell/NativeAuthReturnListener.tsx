"use client";

import { useEffect } from "react";

import { isNativePlatform } from "@/app/utils/platform";
import { handleAppUrl } from "@/app/lib/shell/auth-return";

// Mounted app-wide in app/[locale]/layout.tsx alongside the other null-leaf
// syncs. Subscribes to App Link opens only inside the Capacitor shell —
// plain browser tabs and the installed PWA return before touching the
// bridge, so this is a no-op everywhere except the app.
export function NativeAuthReturnListener() {
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }
    let cancelled = false;
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => {
      if (cancelled) {
        return;
      }
      void App.addListener("appUrlOpen", (event) => {
        void handleAppUrl(event.url);
      }).then((handle) => {
        if (cancelled) {
          void handle.remove();
        } else {
          remove = () => {
            void handle.remove();
          };
        }
      });
    });
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
  return null;
}
