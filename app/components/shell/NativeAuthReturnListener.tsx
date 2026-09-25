"use client";

import { useEffect } from "react";

import { isNativePlatform } from "@/app/utils/platform";
import {
  handleAppUrl,
  parseNativeBootstrapUrl,
} from "@/app/lib/shell/auth-return";

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
    // Audible failures (#702): this listener owns no UI, so a failed
    // exchange here must hand the URL to the bootstrap page (which owns the
    // retry UI) instead of stranding the user on a silent unsigned-in home.
    // URLs without a code stay silent — a plain deep link made no promise.
    const consumeReturnUrl = (href: string) => {
      const { code } = parseNativeBootstrapUrl(href);
      void handleAppUrl(href).then((ok) => {
        if (!ok && code && !cancelled) {
          window.location.assign(href);
        }
      });
    };
    void (async () => {
      const { App } = await import("@capacitor/app");
      if (cancelled) {
        return;
      }
      // Cold start (#687): the VIEW intent arrived before this subscription
      // existed, so no appUrlOpen will ever fire for it — consume the
      // launch URL the plugin holds for exactly this case first.
      try {
        const launch = await App.getLaunchUrl();
        if (!cancelled && launch?.url) {
          consumeReturnUrl(launch.url);
        }
      } catch {
        // Bridge without launch-URL support: the live subscription below
        // still covers warm returns, so never fail the mount over this.
      }
      if (cancelled) {
        return;
      }
      void App.addListener("appUrlOpen", (event) => {
        consumeReturnUrl(event.url);
      }).then((handle) => {
        if (cancelled) {
          void handle.remove();
        } else {
          remove = () => {
            void handle.remove();
          };
        }
      });
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
  return null;
}
