import {
  getSnapshot as getStoreSnapshot,
  getLocalMark,
  setLocalMark,
  removeLocalMark,
  applyServerPull,
  getOwnerStamp,
  subscribe as subscribeStore,
  type LocalMark,
  type OwnerStamp,
} from "./store";
import {
  addPageMark,
  type MarkActionResult,
} from "@/app/server/actions/addPageMark";
import { deletePageMark } from "@/app/server/actions/deletePageMark";
import { fetchAllMarks } from "@/app/server/actions/getPageMarks";

/**
 * Marks sync engine lifecycle (ADR 0061).
 *
 * Module singleton managing state-based, push-then-pull sync between the local
 * marks store and the server. Lives outside React so an in-flight sync run cannot
 * be double-started across re-renders or unmounts, and coordinates across tabs
 * via the native `storage` event.
 */

export type MarksSyncStatus =
  | "idle"
  | "syncing"
  | "error"
  | "session-expired";

export interface DroppedMarkInfo {
  key: string;
  message?: string | null;
  timestamp: number;
}

export interface MarksSyncSnapshot {
  status: MarksSyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  pendingCount: number;
  droppedMarks: DroppedMarkInfo[];
}

const SERVER_SNAPSHOT: MarksSyncSnapshot = Object.freeze({
  status: "idle",
  lastSyncedAt: null,
  error: null,
  pendingCount: 0,
  droppedMarks: [],
});

let currentStatus: MarksSyncStatus = "idle";
let lastSyncedAt: number | null = null;
let lastError: string | null = null;
let droppedMarks: DroppedMarkInfo[] = [];
let inFlightPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();
let snapshot: MarksSyncSnapshot = emptySnapshot();
let storeUnsubscribe: (() => void) | null = null;
let previousOwner: OwnerStamp = "guest";

function countPendingMarks(): number {
  if (typeof window === "undefined") return 0;
  const marks = getStoreSnapshot();
  let count = 0;
  for (const key in marks) {
    if (marks[key]?.sync === "pending") {
      count++;
    }
  }
  return count;
}

function emptySnapshot(): MarksSyncSnapshot {
  return {
    status: currentStatus,
    lastSyncedAt,
    error: lastError,
    pendingCount: countPendingMarks(),
    droppedMarks: [...droppedMarks],
  };
}

function rebuild() {
  snapshot = {
    status: currentStatus,
    lastSyncedAt,
    error: lastError,
    pendingCount: countPendingMarks(),
    droppedMarks: [...droppedMarks],
  };
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("Error in marks sync listener:", err);
    }
  });
}

/**
 * Returns a stable reference to the sync state snapshot until a mutation occurs.
 * Used with `useSyncExternalStore`.
 */
export function getSnapshot(): MarksSyncSnapshot {
  return snapshot;
}

/**
 * Server snapshot for SSR hydration.
 */
export function getServerSnapshot(): MarksSyncSnapshot {
  return SERVER_SNAPSHOT;
}

/**
 * Returns the number of marks currently pending synchronization.
 */
export function getPendingCount(): number {
  return countPendingMarks();
}

/**
 * Handles the result of an individual push action (upsert or delete).
 * Returns true if the loop can continue to the next pending mark, or false if the run must halt.
 */
function handlePushResult(
  key: string,
  res: MarkActionResult,
  mark: LocalMark
): boolean {
  if (res.status === 401 || res.code === 401) {
    // Invariant: A 401 is not a sign-out. Stop the run, keep records pending,
    // raise session-expired. Never move the stamp, never drop records.
    currentStatus = "session-expired";
    lastError = "session-expired";
    rebuild();
    return false;
  }

  if (res.status === 422 || res.code === 422) {
    // Invariant: A 422 is dropped and logged — retrying an invalid body forever
    // helps nobody — and surfaces in My Marks, never the reader.
    removeLocalMark(key);
    droppedMarks.push({
      key,
      message: res.message,
      timestamp: Date.now(),
    });
    console.warn(`[MarksSync] Dropped invalid mark (422) for ${key}:`, res.message);
    return true;
  }

  if (!res.success) {
    // Any other failure (network error status 0, 4xx, 5xx): stays pending, retried next trigger.
    currentStatus = "error";
    lastError = res.message ?? "Network error";
    rebuild();
    return false;
  }

  // 2xx success
  const current = getLocalMark(key);
  if (!current) return true;

  if (mark.deleted) {
    // Push delete 2xx: tombstone dropped if it wasn't modified while in flight
    if (current.deleted && current.updated_at === mark.updated_at) {
      removeLocalMark(key);
    }
  } else {
    // Push upsert 2xx: pending -> synced if it wasn't modified while in flight
    if (
      current.sync === "pending" &&
      !current.deleted &&
      current.updated_at === mark.updated_at
    ) {
      setLocalMark({
        ...current,
        sync: "synced",
      });
    }
  }

  return true;
}

/**
 * Execute the push-then-pull sync run (ADR 0061).
 * Invariant: push runs before pull so pull observes post-push state.
 */
async function executeSync(): Promise<void> {
  const owner = getOwnerStamp();
  // Gated on a signed-in owner stamp: guest marks are kept pending locally
  // until sign-in re-stamps to a user id (the ordinary push loop IS the migration).
  if (owner === "guest") {
    currentStatus = "idle";
    lastError = null;
    rebuild();
    return;
  }

  currentStatus = "syncing";
  lastError = null;
  rebuild();

  while (true) {
    // Phase 1: Push all pending records to the server
    const storeMap = getStoreSnapshot();
    const pendingEntries = Object.entries(storeMap).filter(
      ([, mark]) => mark.sync === "pending"
    );

    for (const [key, mark] of pendingEntries) {
      const res = mark.deleted
        ? await deletePageMark(
            {
              marked_type: mark.marked_type,
              marked_id: mark.marked_id,
              page_number: mark.page_number,
            },
            undefined,
            { detailed: true }
          )
        : await addPageMark(
            {
              marked_type: mark.marked_type,
              marked_id: mark.marked_id,
              page_number: mark.page_number,
              category: mark.category,
              comment: mark.comment,
              updated_at: mark.updated_at,
            },
            undefined,
            { detailed: true }
          );

      const canContinue = handlePushResult(key, res, mark);
      if (!canContinue) {
        return;
      }
    }

    // Phase 2: Pull all marks from the server
    const pullRes = await fetchAllMarks();

    if (pullRes.status === 401 || pullRes.code === 401) {
      currentStatus = "session-expired";
      lastError = "session-expired";
      rebuild();
      return;
    }

    if (!pullRes.success) {
      currentStatus = "error";
      lastError = "Network error during marks pull";
      rebuild();
      return;
    }

    const serverMarks: LocalMark[] = (pullRes.data ?? []).map((m) => ({
      marked_type: m.marked_type as "word" | "verse",
      marked_id: m.marked_id,
      page_number: m.page_number,
      category: m.category,
      comment: m.comment,
      snippet: m.snippet,
      chapter_name_simple: m.chapter_name_simple,
      chapter_name_arabic: m.chapter_name_arabic,
      verse_number: m.verse_number,
      deleted: false,
      updated_at: Date.now(),
      sync: "synced",
      from_user: m.from_user,
      author_name: m.author_name,
    }));

    applyServerPull(serverMarks);

    currentStatus = "idle";
    lastError = null;
    lastSyncedAt = Date.now();
    rebuild();

    // If more pending marks were created while this iteration was in-flight,
    // loop and push them before releasing the in-flight lock.
    if (countPendingMarks() === 0 || getOwnerStamp() === "guest") {
      break;
    }
  }
}

/**
 * Triggers a sync run with singleton in-flight deduplication.
 * If a sync run is already in progress, returns the in-flight promise.
 */
export function syncMarks(): Promise<void> {
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = executeSync().finally(() => {
    inFlightPromise = null;
  });

  return inFlightPromise;
}

function onOnline() {
  if (getOwnerStamp() !== "guest") {
    void syncMarks();
  }
}

function onVisibilityChange() {
  if (
    typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    getOwnerStamp() !== "guest"
  ) {
    void syncMarks();
  }
}

function onStorageEvent(event: StorageEvent) {
  if (
    event.key === "localMarks" ||
    event.key === "localMarksOwner" ||
    event.key === null
  ) {
    rebuild();
  }
}

function onStoreChange() {
  const currentOwner = getOwnerStamp();

  // Transition from guest (or switched owner) to a signed-in user id triggers sync (migration)
  if (previousOwner !== currentOwner) {
    previousOwner = currentOwner;
    if (currentOwner !== "guest") {
      void syncMarks();
      return;
    }
  }

  rebuild();

  // Best-effort immediate sync after local store mutation when online
  if (
    currentOwner !== "guest" &&
    currentStatus === "idle" &&
    countPendingMarks() > 0 &&
    typeof navigator !== "undefined" &&
    navigator.onLine !== false
  ) {
    void syncMarks();
  }
}

/**
 * Subscribes to changes in the marks sync state and attaches trigger listeners.
 */
export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    previousOwner = getOwnerStamp();
    storeUnsubscribe = subscribeStore(onStoreChange);

    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      window.addEventListener("storage", onStorageEvent);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    rebuild();
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (storeUnsubscribe) {
        storeUnsubscribe();
        storeUnsubscribe = null;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("storage", onStorageEvent);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    }
  };
}

// Deferred launch trigger off the critical path (idle after first paint),
// gated on a signed-in owner stamp (ADR 0049 Root-Layout Network Budget).
// Unconditional mount useEffects are strictly forbidden.
if (typeof window !== "undefined") {
  const runLaunchSync = () => {
    if (getOwnerStamp() !== "guest") {
      void syncMarks();
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runLaunchSync, { timeout: 5000 });
  } else {
    setTimeout(runLaunchSync, 2000);
  }
}

/**
 * Clears dropped marks from the sync engine snapshot.
 */
export function clearDroppedMarks(): void {
  droppedMarks = [];
  rebuild();
}

/**
 * Reset module state for deterministic unit testing.
 */
export function _resetSyncForTesting(): void {
  currentStatus = "idle";
  lastSyncedAt = null;
  lastError = null;
  droppedMarks = [];
  inFlightPromise = null;
  previousOwner = "guest";
  listeners.clear();
  if (storeUnsubscribe) {
    storeUnsubscribe();
    storeUnsubscribe = null;
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("storage", onStorageEvent);
  }
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
  snapshot = emptySnapshot();
}
