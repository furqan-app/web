"use client";

import { useEffect, useState } from "react";

/**
 * True once an `appinstalled` event fires in this browser tab.
 *
 * Chromium only — iOS Safari fires neither `appinstalled` nor
 * `beforeinstallprompt`, so Add to Home Screen is completely silent to JS and
 * there is no way to react to it. iOS is served by the first-run gate instead
 * (ADR 0014 Addendum 2).
 */
export const useAppInstalled = () => {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return installed;
};
