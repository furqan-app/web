"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { precacheDismissedKey } from "@constants/offline";
import type { ClientToSwMessage, SwToClientMessage } from "@constants/offline";
import { useOnlineStatus } from "@hooks/use-online-status";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { getMushafEdition } from "@utils/mushaf-editions";

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

const postToServiceWorker = (message: ClientToSwMessage) => {
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage(message))
    // An unhandled rejection here (insecure context, no registration) would
    // strand the surface in `unknown` with no trace.
    .catch(() => undefined);
};

const readDismissed = (mushafId: number) => {
  try {
    return window.localStorage.getItem(precacheDismissedKey(mushafId)) === "1";
  } catch {
    return false;
  }
};

// The gate, the in-tab prompt and the Settings row each call this hook, so the
// dismissed flag cannot live in one instance's state: dismissing on one surface
// left the others believing it was still undismissed until they remounted.
// localStorage is the source of truth; this event fans the change out in-tab
// (the native `storage` event only fires in OTHER tabs). The event itself
// carries no edition — every instance re-reads its own key and no-ops if
// unchanged, simpler than threading mushafId through a CustomEvent detail.
const DISMISS_EVENT = "fq-offline-dismissed";

const broadcastDismissed = (mushafId: number) => {
  try {
    window.localStorage.setItem(precacheDismissedKey(mushafId), "1");
  } catch {
    // Private mode / storage disabled — the surface still closes for this
    // session, it just reappears next launch.
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
};

/**
 * Drives the bulk offline download for one edition, across all of its
 * surfaces — the in-tab prompt after `appinstalled`, the first-run gate (both
 * always called with the default edition, ADR 0014 Addendum 2), and a
 * Settings "Mushaf Layout" row (called once per registered edition, ADR 0014
 * Addendum 5). Two editions download fully independently: separate sentinel,
 * separate dismissed flag, separate SW run — this hook only ever tracks the
 * one `mushafId` it was called with, filtering out every other edition's
 * broadcast progress/status message.
 *
 * Never starts a download on its own: every surface requires an explicit tap
 * (ADR 0014 Addendum 2). `dismissed` starts `true` so a surface can never flash
 * before localStorage has been read.
 *
 * `deferStatusWhileDismissed` (ADR 0014 Addendum 9, #440): the gate and the
 * install prompt render nothing while dismissed, yet both mount app-wide on
 * every launch — their unconditional REQUEST_PRECACHE_STATUS was what made the
 * worker walk `cache.keys()` twice at cold launch for users who long ago
 * finished (and thereby auto-dismissed) the download. With the option set, the
 * status request and its focus/visibility resync fire only while `dismissed`
 * is false — re-firing if it ever flips false while mounted. Default `false`
 * keeps always-on requests for surfaces that display status regardless of
 * dismissal (the Settings Mushaf Layout rows, which are also where a stale
 * sentinel gets healed on demand — do not defer them). The broadcast message
 * listener stays attached either way, so an in-flight run's progress reaches
 * every mounted instance.
 */
export const usePwaPrecache = (
  mushafId: number,
  { deferStatusWhileDismissed = false }: { deferStatusWhileDismissed?: boolean } = {},
) => {
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
  const total = getMushafEdition(mushafId).pagesCount;

  const dismiss = useCallback(() => {
    broadcastDismissed(mushafId);
    setDismissed(true);
  }, [mushafId]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    setIsStandalone(isStandaloneDisplayMode());
    setDismissed(readDismissed(mushafId));

    const syncDismissed = () => setDismissed(readDismissed(mushafId));
    window.addEventListener(DISMISS_EVENT, syncDismissed);
    window.addEventListener("storage", syncDismissed);

    const onMessage = (event: MessageEvent<SwToClientMessage>) => {
      const data = event.data;
      if (data?.mushafId !== mushafId) return;
      if (data.type === "PRECACHE_STATUS") {
        runIdRef.current = data.runId;
        setCached(data.cached);
        if (data.complete) setState("done");
        else setState(data.running ? "running" : "idle");
        return;
      }
      if (data.type === "PRECACHE_PROGRESS") {
        runIdRef.current = data.done ? null : data.runId;
        setCached(data.cached);
        setFailed(data.failed);
        if (!data.done) setState("running");
        else setState(data.complete ? "done" : "partial");
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener(DISMISS_EVENT, syncDismissed);
      window.removeEventListener("storage", syncDismissed);
    };
  }, [mushafId]);

  // The status request lives in its own effect so it can key off `dismissed`:
  // a deferring surface that is dismissed never wakes the worker (it renders
  // nothing from the answer), and one whose flag flips false while mounted
  // requests then. For non-deferring callers `statusEligible` is constant
  // `true`, so the effect runs once per mushafId — exactly as before.
  const statusEligible = !deferStatusWhileDismissed || !dismissed;
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !statusEligible) return;

    postToServiceWorker({ type: "REQUEST_PRECACHE_STATUS", mushafId });

    // A run lives inside the worker's `event.waitUntil`, and the browser can kill
    // the worker (a closed tab, a long run on a slow link). Nothing would then
    // arrive to move the client off `running`, leaving a frozen progress bar. Any
    // return to the foreground re-reads the real state from the cache.
    const resync = () => {
      if (document.visibilityState === "visible") {
        postToServiceWorker({ type: "REQUEST_PRECACHE_STATUS", mushafId });
      }
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);

    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, [mushafId, statusEligible]);

  // A completed cache needs no further prompting on any surface.
  useEffect(() => {
    if (state === "done" && !dismissed) dismiss();
  }, [state, dismissed, dismiss]);

  const start = useCallback(() => {
    setFailed(0);
    setState("running");
    postToServiceWorker({ type: "START_PRECACHE", mushafId });
  }, [mushafId]);

  const cancel = useCallback(() => {
    const runId = runIdRef.current;
    if (runId !== null) postToServiceWorker({ type: "CANCEL_PRECACHE", mushafId, runId });
    dismiss();
  }, [dismiss, mushafId]);

  // Offline covers every state that would otherwise offer a network action —
  // `partial`'s Retry fails just as instantly as `idle`'s Download would.
  const offlineBlocks = state === "idle" || state === "partial";

  return {
    isStandalone,
    state: offlineBlocks && !isOnline ? ("offline" as const) : state,
    cached,
    failed,
    total,
    dismissed,
    isOnline,
    start,
    cancel,
    dismiss,
  };
};
