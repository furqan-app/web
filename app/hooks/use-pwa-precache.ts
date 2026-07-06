import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

const TOTAL_PAGES = 604;

type PrecacheProgressMessage = {
  type: "PRECACHE_PROGRESS";
  cached: number;
  total: number;
};

const isStandaloneDisplayMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari has no `display-mode: standalone` media query support.
  (navigator as unknown as { standalone?: boolean }).standalone === true;

// Triggers the service worker's bulk pre-cache of all 604 Quran pages (see
// ADR 0013) only when running as the installed PWA, resuming on every
// launch until complete. Never fires for a regular browser tab.
export const usePwaPrecache = () => {
  const locale = useLocale();
  const [isStandalone, setIsStandalone] = useState(false);
  const [cached, setCached] = useState(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!isStandaloneDisplayMode()) return;

    setIsStandalone(true);

    const onMessage = (event: MessageEvent<PrecacheProgressMessage>) => {
      if (event.data?.type === "PRECACHE_PROGRESS") {
        setCached(event.data.cached);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "START_PRECACHE",
        locale,
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [locale]);

  return { isStandalone, cached, total: TOTAL_PAGES };
};
