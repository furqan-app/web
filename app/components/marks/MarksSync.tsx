"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { setOwnerStamp } from "@/app/lib/marks/store";
import { useMarksSync } from "@/app/hooks/use-marks-sync";

/**
 * Null-rendering effect leaf that connects the local marks store to the app
 * lifecycle, mirroring LastReadPageSync / TafsirReaderSync / KeepScreenAwakeSync.
 *
 * It does the two things that make the store and the sync engine live at all:
 * subscribes to the engine (which attaches its triggers and evaluates its
 * deferred launch trigger) and stamps the store's owner.
 *
 * No network from here: the sync run itself stays on the engine's own
 * idle-after-first-paint trigger, gated on a signed-in stamp, and SessionProvider
 * is already mounted above so useSession() adds no request (ADR 0049
 * Root-Layout Network Budget).
 */
export function MarksSync() {
  // Called before the effect below so React registers the engine's subscription
  // first — the guest -> account transition the engine watches for is raised by
  // setOwnerStamp, and with nothing listening yet it would be missed.
  useMarksSync();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Evidence-based, never derived from live session state (ADR 0061): only an
    // observed authenticated session moves the stamp. `unauthenticated` is NOT
    // evidence of a signed-out user — `app/sw.ts` aborts /api/auth/session at 3s
    // (ADR 0049), so every offline launch reads that way. Re-stamping "guest"
    // here would trip the different-owner reset on reconnect and discard exactly
    // the offline marks this design exists to protect (umbrella test case 8).
    if (status !== "authenticated") return;

    // session.user carries the app User row but is not type-augmented — read the
    // id via a cast, per the Auth decision in decisions/api.md.
    const userId = (session?.user as { id?: number } | undefined)?.id;
    if (userId == null) return;

    try {
      setOwnerStamp(String(userId));
    } catch (err) {
      // The store rolls its own state back on a quota failure; the next
      // authenticated read retries. Never let it escape into the render.
      console.warn("Could not stamp the marks store owner:", err);
    }
  }, [status, session]);

  return null;
}
