"use client";

import { useEffect } from "react";
import { isAndroid, isNativePlatform } from "@/app/utils/platform";
import { handleNativeBackButton } from "@/app/lib/shell/back-button";

/**
 * App-wide hardware/gesture back-button listener for Capacitor Android.
 * Mounted in app/[locale]/layout.tsx.
 *
 * Gated strictly on isNativePlatform() && isAndroid():
 * - Non-native browsers and installed PWA never touch this listener (Capacitor
 *   bridge is absent; browser native history handling is untouched).
 * - iOS is excluded (no hardware back button).
 *
 * Intercepts the native backButton event and delegates to handleNativeBackButton:
 * - Closes armed overlays via window.history.back() without moving the page.
 * - In the reader, delegates to AndroidBackExitGuard's 2-second arm window.
 * - Outside the reader, traverses web history or exits at the history root.
 */
export const NativeBackButtonListener = () => {
  useEffect(() => {
    if (!isNativePlatform() || !isAndroid()) {
      return;
    }

    let cancelled = false;
    let remove: (() => void) | undefined;

    void import("@capacitor/app")
      .then(({ App }) => {
        if (cancelled) {
          return;
        }
        return App.addListener("backButton", ({ canGoBack }) => {
          handleNativeBackButton(canGoBack);
        }).then((handle) => {
          if (cancelled) {
            void handle.remove();
          } else {
            remove = () => {
              void handle.remove();
            };
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  return null;
};
