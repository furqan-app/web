"use client";

import { useCallback, useEffect, useRef } from "react";
import { useIsStandaloneMobileOrTablet } from "@/app/hooks/use-is-standalone-mobile-or-tablet";
import { pageFontsReady } from "@/app/utils/page-font-registry";
import type { MushafEdition } from "@/app/utils/mushaf-editions";

// Bounded reveal for the splash-continuity cover (issue #586, ADR 0065): long
// enough to outlast the service worker's 3s navigation race plus hydration on a
// slow link, short enough that a failed readiness signal never strands the
// reader behind a splash-coloured blank. Tunable with on-device measurement.
const SAFETY_MS = 5000;
// Matches the CSS fade (opacity 200ms ease-out) with a frame of headroom.
const FADE_MS = 220;

type Props = {
  // React Query data is present for every currently-visible page under the
  // active mushafId (offline-safe via `networkMode: "always"`).
  dataReady: boolean;
  // Font ids of the currently-visible pages (single view: anchor only; double
  // view: both pair members). Keyed per active edition inside pageFontsReady —
  // never another edition's signals (ADR 0033).
  visibleIds: number[];
  edition: MushafEdition;
  // QuranMushafContext's `hydrated`: false until the persisted edition has been
  // read from localStorage. The ready path must wait for it — pre-hydration
  // signals belong to the SSR default edition, and lifting on them would spend
  // the mount-once cover before a stored Tajweed load even starts (the same
  // first-flip rule ADR 0033 states for edition changes).
  mushafHydrated: boolean;
};

/**
 * Null leaf (the RecitationFollow pattern): the cover layer itself is static
 * SSR markup in `ReaderPage`, so this component renders nothing and only lifts
 * the `<html>` classes — the same mechanism as `fq-pending-jump`. Mounted in
 * `ReaderPager` AFTER `<FontFaceInjector />` so this effect runs after the
 * registry's faces for the visible window exist (`pageFontsReady` settles
 * instantly for unregistered ids, so awaiting it earlier would lift the cover
 * before the font even starts downloading).
 *
 * Mount-once semantics: once lifted, it never re-arms for the pager's
 * lifetime — mid-session edition switches and swipes keep QuranSafha's own
 * skeleton behaviour, unchanged.
 */
export function LaunchSplashCover({ dataReady, visibleIds, edition, mushafHydrated }: Props) {
  const inScope = useIsStandaloneMobileOrTablet();
  const liftedRef = useRef(false);
  // The pending safety timeout, if any. Nullable (not boolean) so the unmount
  // cleanup can clear + null it and a StrictMode dev remount re-arms — a plain
  // flag would survive the remount with its timeout already cleared.
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
      safetyTimerRef.current = null;
    };
  }, []);

  const lift = useCallback((instant: boolean) => {
    if (liftedRef.current) return;
    liftedRef.current = true;
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (instant || reduceMotion) {
      root.classList.remove("fq-launch-cover", "fq-launch-cover-hide");
      return;
    }
    root.classList.add("fq-launch-cover-hide");
    timersRef.current.push(
      setTimeout(() => root.classList.remove("fq-launch-cover", "fq-launch-cover-hide"), FADE_MS),
    );
  }, []);

  const idsKey = visibleIds.join(",");
  const editionId = edition.id;

  const armSafety = useCallback(() => {
    if (liftedRef.current || safetyTimerRef.current !== null) return;
    const id = setTimeout(() => {
      safetyTimerRef.current = null;
      lift(true);
    }, SAFETY_MS);
    safetyTimerRef.current = id;
    timersRef.current.push(id);
  }, [lift]);

  useEffect(() => {
    if (liftedRef.current) return;
    // Outside standalone mobile/tablet the parse-time script never revealed the
    // cover — defensively ensure the classes are absent and stand down. (On the
    // very first client render `useIsDesktopUp` still holds its `false`
    // default, so a real standalone phone reads in-scope here, matching the
    // script's own media check.)
    if (!inScope) {
      liftedRef.current = true;
      document.documentElement.classList.remove("fq-launch-cover", "fq-launch-cover-hide");
      return;
    }
    armSafety();
    // Pre-hydration readiness belongs to the SSR default edition, not to the
    // user's stored edition — wait for the flip before trusting any ready
    // signal. The safety timer above still bounds this wait.
    if (!mushafHydrated || !dataReady) return;
    let cancelled = false;
    // Read-only: registers nothing, so this never becomes a second font
    // download path (page-font-registry contract).
    pageFontsReady(visibleIds, edition).then(() => {
      if (!cancelled) lift(false);
    });
    return () => {
      cancelled = true;
    };
    // visibleIds is a fresh array each render; the joined key is the real dep —
    // same pattern as ReaderPager's baseFontIdsKey. editionId (not the object)
    // keeps mushaf switches from re-firing on identical content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inScope, mushafHydrated, dataReady, idsKey, editionId, armSafety, lift]);

  return null;
}
