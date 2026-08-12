"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PRECACHE_DISMISSED_KEY,
  TOTAL_PAGES,
} from "@constants/offline";
import type { ClientToSwMessage, SwToClientMessage } from "@constants/offline";
import { useOnlineStatus } from "@hooks/use-online-status";

/**
 * `unknown` — the service worker has not reported yet; surfaces show a wait state.
 * `idle` — nothing (or only part) is cached and no run is in flight.
 * `running` — a download is in flight.
 * `done` — the full base mushaf is cached (sentinel + page count agree).
 * `partial` — a run finished with failures; the sentinel was NOT written.
 * `offline` — derived: no network, so a download cannot be offered or retried.
 */
export type PrecacheState =
  | "unknown"
  | "idle"
  | "running"
  | "done"
  | "partial"
  | "offline";

const isStandaloneDisplayMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // The manifest's `display` is "fullscreen" (status-bar hiding, see
  // feature-pwa-fullscreen-focus-mode.md) — platforms that honor it report
  // this mode instead of "standalone", so both must be checked (ADR 0014
  // Addendum 3).
  window.matchMedia("(display-mode: fullscreen)").matches ||
  // iOS Safari has no `display-mode: standalone` media query support.
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const postToServiceWorker = (message: ClientToSwMessage) => {
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage(message))
    // An unhandled rejection here (insecure context, no registration) would
    // strand the surface in `unknown` with no trace.
    .catch(() => undefined);
};

const readDismissed = () => {
  try {
    return window.localStorage.getItem(PRECACHE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

// The gate, the in-tab prompt and the Settings row each call this hook, so the
// dismissed flag cannot live in one instance's state: dismissing on one surface
// left the others believing it was still undismissed until they remounted.
// localStorage is the source of truth; this event fans the change out in-tab
// (the native `storage` event only fires in OTHER tabs).
const DISMISS_EVENT = "fq-offline-dismissed";

const broadcastDismissed = () => {
  try {
    window.localStorage.setItem(PRECACHE_DISMISSED_KEY, "1");
  } catch {
    // Private mode / storage disabled — the surface still closes for this
    // session, it just reappears next launch.
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
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
  // The run this client is currently showing, so a cancel stops that run rather
  // than whatever the shared service worker happens to be running for another
  // surface (Chromium shares one worker between the tab and the installed PWA).
  const runIdRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    broadcastDismissed();
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    setIsStandalone(isStandaloneDisplayMode());
    setDismissed(readDismissed());

    const syncDismissed = () => setDismissed(readDismissed());
    window.addEventListener(DISMISS_EVENT, syncDismissed);
    window.addEventListener("storage", syncDismissed);

    const onMessage = (event: MessageEvent<SwToClientMessage>) => {
      const data = event.data;
      if (data?.type === "PRECACHE_STATUS") {
        runIdRef.current = data.runId;
        setCached(data.cached);
        if (data.complete) setState("done");
        else setState(data.running ? "running" : "idle");
        return;
      }
      if (data?.type === "PRECACHE_PROGRESS") {
        runIdRef.current = data.done ? null : data.runId;
        setCached(data.cached);
        setFailed(data.failed);
        if (!data.done) setState("running");
        else setState(data.complete ? "done" : "partial");
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    postToServiceWorker({ type: "REQUEST_PRECACHE_STATUS" });

    // A run lives inside the worker's `event.waitUntil`, and the browser can kill
    // the worker (a closed tab, a long run on a slow link). Nothing would then
    // arrive to move the client off `running`, leaving a frozen progress bar. Any
    // return to the foreground re-reads the real state from the cache.
    const resync = () => {
      if (document.visibilityState === "visible") {
        postToServiceWorker({ type: "REQUEST_PRECACHE_STATUS" });
      }
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener(DISMISS_EVENT, syncDismissed);
      window.removeEventListener("storage", syncDismissed);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, []);

  // A completed cache needs no further prompting on any surface.
  useEffect(() => {
    if (state === "done" && !dismissed) dismiss();
  }, [state, dismissed, dismiss]);

  const start = useCallback(() => {
    setFailed(0);
    setState("running");
    postToServiceWorker({ type: "START_PRECACHE" });
  }, []);

  const cancel = useCallback(() => {
    const runId = runIdRef.current;
    if (runId !== null) postToServiceWorker({ type: "CANCEL_PRECACHE", runId });
    dismiss();
  }, [dismiss]);

  // Offline covers every state that would otherwise offer a network action —
  // `partial`'s Retry fails just as instantly as `idle`'s Download would.
  const offlineBlocks = state === "idle" || state === "partial";

  return {
    isStandalone,
    state: offlineBlocks && !isOnline ? ("offline" as const) : state,
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
