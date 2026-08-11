"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PRECACHE_DISMISSED_KEY,
  TOTAL_PAGES,
} from "@constants/offline";
import { useOnlineStatus } from "@hooks/use-online-status";

/**
 * `unknown` — the service worker has not reported yet; render nothing.
 * `idle` — nothing (or only part) is cached and no run is in flight.
 * `running` — a download is in flight.
 * `done` — the full base mushaf is cached (sentinel present).
 * `partial` — a run finished with failures; the sentinel was NOT written.
 * `offline` — derived: `idle` with no network, so Download cannot be offered.
 */
export type PrecacheState =
  | "unknown"
  | "idle"
  | "running"
  | "done"
  | "partial"
  | "offline";

type PrecacheProgressMessage = {
  type: "PRECACHE_PROGRESS";
  cached: number;
  failed: number;
  total: number;
  complete: boolean;
  done: boolean;
};

type PrecacheStatusMessage = {
  type: "PRECACHE_STATUS";
  cached: number;
  total: number;
  complete: boolean;
  running: boolean;
};

type PrecacheMessage = PrecacheProgressMessage | PrecacheStatusMessage;

const isStandaloneDisplayMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari has no `display-mode: standalone` media query support.
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const postToServiceWorker = (type: string) => {
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type });
  });
};

/**
 * Drives the bulk offline download for all three of its surfaces — the in-tab
 * prompt after `appinstalled`, the first-run gate, and the Settings row.
 *
 * Never starts a download on its own: every surface requires an explicit tap
 * (ADR 0014 Addendum 2). `dismissed` starts `true` so a surface can never flash
 * before localStorage has been read.
 */
export const usePwaPrecache = () => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [state, setState] = useState<PrecacheState>("unknown");
  const [cached, setCached] = useState(0);
  const [failed, setFailed] = useState(0);
  const [dismissed, setDismissed] = useState(true);
  const isOnline = useOnlineStatus();

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(PRECACHE_DISMISSED_KEY, "1");
    } catch {
      // Private mode / storage disabled — the surface still closes for this
      // session, it just reappears next launch.
    }
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    setIsStandalone(isStandaloneDisplayMode());
    try {
      setDismissed(
        window.localStorage.getItem(PRECACHE_DISMISSED_KEY) === "1",
      );
    } catch {
      setDismissed(false);
    }

    const onMessage = (event: MessageEvent<PrecacheMessage>) => {
      const data = event.data;
      if (data?.type === "PRECACHE_STATUS") {
        setCached(data.cached);
        if (data.complete) setState("done");
        else setState(data.running ? "running" : "idle");
        return;
      }
      if (data?.type === "PRECACHE_PROGRESS") {
        setCached(data.cached);
        setFailed(data.failed);
        if (!data.done) {
          setState("running");
        } else {
          setState(data.complete ? "done" : "partial");
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    postToServiceWorker("REQUEST_PRECACHE_STATUS");

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  // A completed cache needs no further prompting on any surface.
  useEffect(() => {
    if (state === "done" && !dismissed) dismiss();
  }, [state, dismissed, dismiss]);

  const start = useCallback(() => {
    setFailed(0);
    setState("running");
    postToServiceWorker("START_PRECACHE");
  }, []);

  const cancel = useCallback(() => {
    postToServiceWorker("CANCEL_PRECACHE");
    dismiss();
  }, [dismiss]);

  return {
    isStandalone,
    state: state === "idle" && !isOnline ? ("offline" as const) : state,
    cached,
    failed,
    total: TOTAL_PAGES,
    dismissed,
    isOnline,
    start,
    cancel,
    dismiss,
  };
};
