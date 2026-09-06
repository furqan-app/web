"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type MarksSyncSnapshot,
} from "@/app/lib/marks/sync";

/**
 * Read binding for the marks sync engine (ADR 0061). All state lives in the
 * module singleton (`app/lib/marks/sync.ts`) so an in-flight run survives any
 * consumer unmounting — same shape as `useTafsirDownload` over the tafsir
 * download manager (ADR 0060).
 *
 * Subscribing is also what ARMS the engine: its `online`, `visibilitychange`,
 * cross-tab `storage` and store-mutation triggers are all attached on the first
 * listener, and importing the module is what evaluates its deferred launch
 * trigger. Without a subscriber the engine is inert.
 */
export const useMarksSync = (): MarksSyncSnapshot =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
