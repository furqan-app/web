"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/app/utils/platform";
import { isSafeLocalePath } from "@/app/lib/shell/app-links";
import { getNativePushPlugin } from "@/app/lib/shell/native-push";

/** Native push tap → deep link (ADR 0076): validates the notification's
 *  `data.url` against the D4 locale-path rules (same guard family as the App
 *  Links listener) and navigates. Every performed tap is fresh — never
 *  session-guarded — mirroring the warm `appUrlOpen` rule. */
export function NativePushTapListener() {
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }
    let cancelled = false;
    let remove: (() => void) | undefined;

    void (async () => {
      const plugin = await getNativePushPlugin();
      if (!plugin || cancelled) {
        return;
      }

      const navigateTo = (path: string) => {
        if (
          `${window.location.pathname}${window.location.search}${window.location.hash}` !==
          path
        ) {
          window.location.assign(path);
        }
      };

      void plugin
        .addListener("pushNotificationActionPerformed", (event) => {
          const url = event?.notification?.data?.url;
          if (typeof url !== "string" || !url) return;
          // D4 targets are always same-origin `/<locale>/...` paths; anything
          // else (absolute, foreign host, non-locale path) is not navigation.
          if (!isSafeLocalePath(url)) return;
          navigateTo(url);
        })
        .then((handle) => {
          if (cancelled) {
            void handle.remove();
          } else {
            remove = () => {
              void handle.remove();
            };
          }
        })
        // Registration failure only loses tap navigation; never crash the layout.
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  return null;
}
