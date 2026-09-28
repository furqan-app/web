"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/app/utils/platform";
import {
  appLinkTarget,
  readHandledAppLinks,
  markAppLinkHandled,
} from "@/app/lib/shell/app-links";

export function NativeAppLinkListener() {
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }
    let cancelled = false;
    let remove: (() => void) | undefined;

    const navigateTo = (path: string) => {
      if (
        `${window.location.pathname}${window.location.search}${window.location.hash}` !==
        path
      ) {
        window.location.assign(path);
      }
    };

    void (async () => {
      const { App } = await import("@capacitor/app");
      if (cancelled) {
        return;
      }
      try {
        const launch = await App.getLaunchUrl();
        if (!cancelled && launch?.url) {
          const path = appLinkTarget(launch.url, readHandledAppLinks());
          if (path) {
            markAppLinkHandled(launch.url);
            navigateTo(path);
          }
        }
      } catch {
        // Bridge without launch-URL support
      }
      if (cancelled) {
        return;
      }
      void App.addListener("appUrlOpen", (event) => {
        const path = appLinkTarget(event.url);
        if (path) {
          navigateTo(path);
        }
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
        // Registration failure only loses warm link opens; never crash the layout.
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  return null;
}
