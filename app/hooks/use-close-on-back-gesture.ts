"use client";

import { useEffect, useRef } from "react";
import { useIsStandaloneMobileOrTablet } from "@/app/hooks/use-is-standalone-mobile-or-tablet";
import {
  armOverlayBackGuard,
  disarmOverlayBackGuard,
} from "@/app/utils/overlay-back-guard";

interface FQNavigateEvent extends Event {
  navigationType: "push" | "replace" | "reload" | "traverse";
  userInitiated: boolean;
  intercept: () => void;
}

// A FRESH object per push, never a shared constant — same reasoning as
// AndroidBackExitGuard's guardState() (ADR 0040's 2026-08-14 addendum). Also
// carries a unique `id`: every guarded overlay pushes the same `fqOverlayGuard`
// shape, so a plain truthiness check can't tell "my own entry is on top" from
// "some OTHER overlay's entry happens to be on top" — see the cleanup below.
let nextOverlayGuardId = 0;
const overlayGuardState = () => ({
  fqOverlayGuard: true,
  fqOverlayGuardId: ++nextOverlayGuardId,
});

// True on browsers where the Navigation API's `navigate` event + `intercept()`
// can be used to preempt the browser's default navigation instead of only
// reacting to it after the fact via `popstate` — see ADR 0045.
const supportsNavigationApi = () =>
  typeof window !== "undefined" &&
  "navigation" in window &&
  typeof (window as any).navigation?.addEventListener === "function";

// How long to keep listening, after intercepting the closing `traverse`, for
// a follow-up `reload` navigation the same gesture can trigger (observed
// ~6ms later on-device — ADR 0045). Generous safety margin over that.
const RELOAD_WATCH_MS = 200;

/**
 * Mobile/tablet installed-PWA (Android and iOS, not desktop) "swipe back
 * closes this overlay first" guard (ADR 0043). Pushes one history entry
 * while `open`; a real back-gesture pops it and calls `onClose` instead of
 * letting the browser navigate past the overlay. Coordinates with
 * AndroidBackExitGuard via the shared overlay-back-guard armed flag, so the
 * two never race on the same popstate event.
 *
 * Where the Navigation API is available, the closing gesture is handled via
 * `navigate` + `event.intercept()` instead of `popstate` (ADR 0045):
 * `popstate` only fires after the browser has already committed to its
 * default navigation, which on-device testing found includes a real,
 * separate hard-reload `navigate` event the gesture can trigger alongside
 * the traversal — `intercept()` can suppress both. Falls back to the
 * `popstate`/`pushState` guard below wherever the Navigation API isn't
 * supported (notably iOS < 26.2).
 */
export const useCloseOnBackGesture = (open: boolean, onClose: () => void) => {
  const isStandaloneMobileOrTablet = useIsStandaloneMobileOrTablet();
  const armedRef = useRef(false);
  const selfClosingRef = useRef(false);
  const navigatingRef = useRef(false);
  const pushedIdRef = useRef(0);
  const pushedKeyRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const enabled =
    open && typeof window !== "undefined" && isStandaloneMobileOrTablet;

  useEffect(() => {
    if (!enabled) return;

    navigatingRef.current = false;

    // No `url` argument, deliberately — Next only dispatches ACTION_RESTORE
    // when one is supplied (same reasoning as AndroidBackExitGuard).
    const state = overlayGuardState();
    history.pushState(state, "");
    pushedIdRef.current = state.fqOverlayGuardId;
    armedRef.current = true;
    armOverlayBackGuard();

    // Deferred past the current event dispatch (never inside a synchronous
    // `navigate`/`popstate` handler): `navigate` fires BEFORE `popstate` for
    // the same traversal, confirmed on-device. Disarming synchronously
    // inside the `navigate` handler would risk AndroidBackExitGuard's own
    // popstate listener seeing `armed === 0` for a `popstate` that still
    // fires for this same gesture, wrongly showing its exit toast on an
    // overlay close. Idempotent — safe to call more than once.
    const disarm = () => {
      if (!armedRef.current) return;
      armedRef.current = false;
      setTimeout(disarmOverlayBackGuard, 0);
    };

    if (supportsNavigationApi()) {
      const nav = (window as any).navigation;
      // Read immediately after the push above — at this point
      // `nav.currentEntry` is synchronously the entry we just pushed. Used
      // instead of `fqOverlayGuardId`/`getState()` because on-device testing
      // found `NavigationHistoryEntry.getState()` did not reliably return the
      // state object passed to `history.pushState`, even though the legacy
      // `history.state` carried it through correctly — `key` is a
      // platform-guaranteed-unique identifier that doesn't depend on that.
      pushedKeyRef.current = nav.currentEntry?.key ?? null;

      let awaitingReload = false;
      let reloadWatchTimer: ReturnType<typeof setTimeout> | null = null;

      const onNavigate = (e: FQNavigateEvent) => {
        if (e.navigationType === "traverse") {
          // `currentEntry` at fire time is still the entry being LEFT (the
          // destination is where the traversal is going, not this entry) —
          // confirmed on-device. Not our entry: something navigated past us
          // (e.g. a link tapped inside the overlay) or this is an unrelated
          // traversal — let it proceed untouched (harmless-orphan behavior,
          // same as the popstate branch below).
          if (nav.currentEntry?.key !== pushedKeyRef.current) return;

          e.intercept();
          disarm();

          if (selfClosingRef.current) {
            // Echo from our own history.back() in cleanup below — the
            // overlay is already closing via whatever path triggered it.
            selfClosingRef.current = false;
            nav.removeEventListener("navigate", onNavigate);
            return;
          }

          // Real back-gesture. Close the overlay, but keep listening briefly
          // for the follow-up programmatic `reload` navigation this same
          // gesture can trigger — that reload, not the traversal itself, is
          // what produces the hard-refresh flash (ADR 0045).
          awaitingReload = true;
          reloadWatchTimer = setTimeout(() => {
            awaitingReload = false;
            nav.removeEventListener("navigate", onNavigate);
          }, RELOAD_WATCH_MS);
          onCloseRef.current();
          return;
        }

        if (e.navigationType === "reload" && !e.userInitiated && awaitingReload) {
          awaitingReload = false;
          if (reloadWatchTimer) clearTimeout(reloadWatchTimer);
          e.intercept();
          nav.removeEventListener("navigate", onNavigate);
        }
      };

      nav.addEventListener("navigate", onNavigate);

      return () => {
        // A real gesture-close just intercepted the traversal and is
        // watching for a follow-up hard-reload navigation (ADR 0045) — that
        // watch must outlive this effect's own cleanup, which React runs
        // essentially immediately once `onClose()` (called above) flips
        // `open` to false, well within the watch window. Leave the timer and
        // listener alone; the timer's own callback (or the reload arriving)
        // removes the listener when it's done.
        if (awaitingReload) return;

        if (reloadWatchTimer) clearTimeout(reloadWatchTimer);
        if (!armedRef.current) return; // already consumed by a real back press

        // Same microtask-deferral reasoning as the popstate branch below —
        // lets a sibling overlay's `pushState` in the same React commit
        // settle before checking what's actually on top.
        queueMicrotask(() => {
          if (!armedRef.current) return;

          if (navigatingRef.current) {
            // Same reasoning as the popstate branch's identical check below
            // (ADR 0043's 2026-08-16 addendum) — a `<Link>` navigated us
            // closed, so don't infer from `nav.currentEntry` at all; Next's
            // own history write for the target route isn't guaranteed to
            // land before this microtask runs.
            nav.removeEventListener("navigate", onNavigate);
            disarm();
            return;
          }

          if (nav.currentEntry?.key === pushedKeyRef.current) {
            selfClosingRef.current = true;
            window.history.back(); // triggers a `traverse` navigate event, handled above
          } else {
            nav.removeEventListener("navigate", onNavigate);
            disarm();
          }
        });
      };
    }

    const onPopState = () => {
      window.removeEventListener("popstate", onPopState);
      disarm();

      if (selfClosingRef.current) {
        // Echo from our own history.back() below — the overlay is already
        // closing via whatever path triggered it, don't call onClose again.
        selfClosingRef.current = false;
        return;
      }
      onCloseRef.current();
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      if (!armedRef.current) return; // already consumed by a real back press

      // Deferred to a microtask: when this overlay closes in the same React
      // commit that opens another guarded overlay (e.g. NavOverflowMenu's
      // "Settings" row calling closeMenu() and setSettingsOpen(true)
      // together), React runs every cleanup in the commit before any new
      // effect setup — checking history.state synchronously here would run
      // before the incoming overlay's own effect has pushed its entry.
      // Deferring lets every effect in the commit finish first, so the check
      // below reflects the real, settled history stack.
      queueMicrotask(() => {
        if (!armedRef.current) return; // consumed by a real back press meanwhile

        if (navigatingRef.current) {
          // A `<Link>` inside the overlay navigated and its onClick told us
          // so via notifyNavigating() — don't infer from history.state at
          // all. Next's own pushState for the target route isn't guaranteed
          // to land before this microtask runs, so the shape/id check below
          // can't be trusted to distinguish "a navigation is landing shortly"
          // from "closed via backdrop/Escape/a non-navigating button" (ADR
          // 0043, 2026-08-16 addendum). Disarm and leave our entry as a
          // harmless orphan unconditionally, same outcome as the "entry no
          // longer on top" branch below.
          window.removeEventListener("popstate", onPopState);
          armedRef.current = false;
          disarmOverlayBackGuard();
          return;
        }

        // Compare by id, not just the `fqOverlayGuard` shape: every guarded
        // overlay pushes that same shape, so a shape-only check can't tell
        // "my own entry is on top" from "a sibling overlay's entry — pushed
        // after mine, in the same commit — is on top instead." Popping in
        // that second case would remove the SIBLING's entry once the
        // programmatic back() resolves (its target is resolved against
        // whatever is on top when the browser actually processes it, not
        // when it was called), and the sibling's own popstate listener has
        // no way to attribute that echo to us — it would misread it as a
        // real back press and close itself immediately.
        const state = window.history.state as
          | { fqOverlayGuard?: boolean; fqOverlayGuardId?: number }
          | null;

        if (state?.fqOverlayGuard && state.fqOverlayGuardId === pushedIdRef.current) {
          // Overlay closed some other way (X button, backdrop, Escape, a
          // link navigated inside it) while our own entry is still the
          // current top of history. Pop it so the back-stack returns to
          // what it was before opening; onPopState (still attached)
          // swallows the resulting echo.
          selfClosingRef.current = true;
          window.history.back();
        } else {
          // Our entry is no longer on top — either something navigated past
          // it (e.g. a link tapped inside the overlay), or a sibling overlay
          // opened in the same commit and pushed over it. Popping now would
          // remove the WRONG entry — leave our own as a harmless orphan.
          window.removeEventListener("popstate", onPopState);
          disarm();
        }
      });
    };
  }, [enabled]);

  return {
    // Call synchronously, before the state update that closes the overlay,
    // when the close is caused by a `<Link>` navigating inside it — see the
    // cleanup effect above for why this must be a caller-supplied signal
    // rather than something inferred from history.state timing.
    notifyNavigating: () => {
      navigatingRef.current = true;
    },
  };
};
