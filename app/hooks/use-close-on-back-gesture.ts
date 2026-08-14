"use client";

import { useEffect, useRef } from "react";
import { useIsStandaloneMobileOrTablet } from "@/app/hooks/use-is-standalone-mobile-or-tablet";
import {
  armOverlayBackGuard,
  disarmOverlayBackGuard,
} from "@/app/utils/overlay-back-guard";

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

/**
 * Mobile/tablet installed-PWA (Android and iOS, not desktop) "swipe back
 * closes this overlay first" guard (ADR 0043). Pushes one history entry
 * while `open`; a real back-gesture pops it and calls `onClose` instead of
 * letting the browser navigate past the overlay. Coordinates with
 * AndroidBackExitGuard via the shared overlay-back-guard armed flag, so the
 * two never race on the same popstate event.
 */
export const useCloseOnBackGesture = (open: boolean, onClose: () => void) => {
  const isStandaloneMobileOrTablet = useIsStandaloneMobileOrTablet();
  const armedRef = useRef(false);
  const selfClosingRef = useRef(false);
  const pushedIdRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const enabled =
    open && typeof window !== "undefined" && isStandaloneMobileOrTablet;

  useEffect(() => {
    if (!enabled) return;

    // No `url` argument, deliberately — Next only dispatches ACTION_RESTORE
    // when one is supplied (same reasoning as AndroidBackExitGuard).
    const state = overlayGuardState();
    history.pushState(state, "");
    pushedIdRef.current = state.fqOverlayGuardId;
    armedRef.current = true;
    armOverlayBackGuard();

    const onPopState = () => {
      window.removeEventListener("popstate", onPopState);
      armedRef.current = false;
      disarmOverlayBackGuard();

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
          armedRef.current = false;
          disarmOverlayBackGuard();
        }
      });
    };
  }, [enabled]);
};
