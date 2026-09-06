import { markKey } from "@/app/constants/marks";
import { storage } from "@/app/utils/storage";

export type LocalMark = {
  marked_type: "word" | "verse";
  marked_id: string; // location "s:v:w" | verse_key "s:v"
  page_number: number;
  category: string;
  comment: string | null;
  // Denormalized for offline / guest My Marks — /api/marks builds these from quranPrisma.
  snippet: string;
  chapter_name_simple: string;
  chapter_name_arabic: string;
  verse_number: number;
  deleted: boolean; // tombstone
  updated_at: number; // client ms
  sync: "synced" | "pending";
  // Author attribution. A grant holder can write marks INTO your mushaf
  // (ADR 0012), so a mark on your own mushaf is not necessarily yours and the
  // reader must be able to render "Marked by X" without a network call.
  // Optional: records written before #548 have neither field, and a guest's
  // own marks have no server identity yet — both read as "mine" (#548).
  from_user?: number;
  author_name?: string | null;
};

export type LocalMarksMap = Record<string, LocalMark>;
export type OwnerStamp = "guest" | string;

let marksSnapshot: LocalMarksMap = {};
let ownerSnapshot: OwnerStamp = "guest";
let initialized = false;
const listeners = new Set<() => void>();

let isPersisted = false;

function isValidMarksMap(val: unknown): val is LocalMarksMap {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isValidOwnerStamp(val: unknown): val is OwnerStamp {
  return typeof val === "string" && val.trim().length > 0;
}

function ensureInitialized() {
  if (initialized) return;
  if (typeof window === "undefined") return;

  initialized = true;
  const storedMarks = storage.get("localMarks");
  marksSnapshot = isValidMarksMap(storedMarks) ? storedMarks : {};

  const storedOwner = storage.get("localMarksOwner");
  ownerSnapshot = isValidOwnerStamp(storedOwner) ? storedOwner : "guest";

  void requestPersistence();
}

/**
 * Returns whether storage persistence has been granted.
 * Synchronously readable for UI gates (ADR 0061).
 */
export function persisted(): boolean {
  return isPersisted;
}

/**
 * Requests `navigator.storage.persist()` and caches granted state.
 * Transient failures are not latched permanently so they can be retried.
 */
export async function requestPersistence(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !navigator.storage?.persist
  ) {
    return false;
  }
  if (isPersisted) {
    return true;
  }
  try {
    const granted = await navigator.storage.persist();
    isPersisted = Boolean(granted);
    return isPersisted;
  } catch (err) {
    console.warn("Error requesting storage persistence:", err);
    return false;
  }
}

// In browser environments, check initial persisted status if available
if (
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  navigator.storage?.persisted
) {
  navigator.storage
    .persisted()
    .then((granted) => {
      if (granted) isPersisted = true;
    })
    .catch(() => {});
}

/**
 * Returns a stable reference to the in-memory marks map until a mutation occurs.
 * Used with `useSyncExternalStore`.
 */
export function getSnapshot(): LocalMarksMap {
  ensureInitialized();
  return marksSnapshot;
}

const SERVER_SNAPSHOT: LocalMarksMap = Object.freeze({});

/**
 * Server snapshot for SSR hydration (empty map).
 */
export function getServerSnapshot(): LocalMarksMap {
  return SERVER_SNAPSHOT;
}

/**
 * Returns the current owner stamp ("guest" or user id).
 * Serves as the stable snapshot for useSyncExternalStore.
 */
export function getOwnerStamp(): OwnerStamp {
  ensureInitialized();
  return ownerSnapshot;
}

/**
 * Snapshot accessor for useSyncExternalStore (alias of getOwnerStamp).
 */
export const getOwnerSnapshot = getOwnerStamp;

export function getServerOwnerSnapshot(): OwnerStamp {
  return "guest";
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("Error in marks store listener:", err);
    }
  });
}

function onStorageEvent(event: StorageEvent) {
  if (event.key === "localMarks") {
    const raw = storage.get("localMarks");
    marksSnapshot = isValidMarksMap(raw) ? raw : {};
    notifyListeners();
  } else if (event.key === "localMarksOwner") {
    const raw = storage.get("localMarksOwner");
    ownerSnapshot = isValidOwnerStamp(raw) ? raw : "guest";
    notifyListeners();
  } else if (event.key === null) {
    marksSnapshot = {};
    ownerSnapshot = "guest";
    notifyListeners();
  }
}

/**
 * Subscribes to changes in the marks store or cross-tab storage events.
 */
export function subscribe(listener: () => void): () => void {
  ensureInitialized();
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorageEvent);
    // Re-read storage on first subscriber in case cross-tab writes or clears happened while no listeners were active
    const storedMarks = storage.get("localMarks");
    marksSnapshot = isValidMarksMap(storedMarks) ? storedMarks : {};
    const storedOwner = storage.get("localMarksOwner");
    ownerSnapshot = isValidOwnerStamp(storedOwner) ? storedOwner : "guest";
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

function persistMarks(nextMarks: LocalMarksMap) {
  if (typeof window === "undefined") {
    marksSnapshot = nextMarks;
    return;
  }
  const previousMarks = marksSnapshot;
  marksSnapshot = nextMarks;

  try {
    storage.set("localMarks", nextMarks, { throwOnQuota: true });
  } catch (err) {
    // Roll back in-memory state on write failure so memory does not diverge from disk
    marksSnapshot = previousMarks;
    throw err;
  }

  notifyListeners();
}

/**
 * Lookup a mark by key `${marked_type}:${marked_id}` or by `(marked_type, marked_id)`.
 */
export function getLocalMark(
  markedTypeOrKey: string,
  markedId?: string
): LocalMark | undefined {
  ensureInitialized();
  const key = markedId
    ? markKey({ marked_type: markedTypeOrKey, marked_id: markedId })
    : markedTypeOrKey;
  return marksSnapshot[key];
}

/**
 * Upsert a single mark in the local store and persist to localStorage.
 */
export function setLocalMark(mark: LocalMark): void {
  ensureInitialized();
  const key = markKey({
    marked_type: mark.marked_type,
    marked_id: mark.marked_id,
  });
  persistMarks({
    ...marksSnapshot,
    [key]: mark,
  });
}

/**
 * Remove a mark completely from the local map (used after server delete ack or dropping invalid 422).
 */
export function removeLocalMark(key: string): void {
  ensureInitialized();
  if (!(key in marksSnapshot)) return;
  const next = { ...marksSnapshot };
  delete next[key];
  persistMarks(next);
}

/**
 * Tombstone a mark for deletion (`deleted: true`, `sync: "pending"`).
 * Survives reloads so the next sync run pushes the delete.
 */
export function tombstoneLocalMark(
  marked_type: "word" | "verse",
  marked_id: string,
  metadata?: Partial<
    Omit<
      LocalMark,
      "marked_type" | "marked_id" | "deleted" | "sync" | "updated_at"
    >
  >
): void {
  ensureInitialized();
  const key = markKey({ marked_type, marked_id });
  const existing = marksSnapshot[key];

  const tombstone: LocalMark = {
    marked_type,
    marked_id,
    page_number: metadata?.page_number ?? existing?.page_number ?? 0,
    category: metadata?.category ?? existing?.category ?? "",
    comment: metadata?.comment ?? existing?.comment ?? null,
    snippet: metadata?.snippet ?? existing?.snippet ?? "",
    chapter_name_simple:
      metadata?.chapter_name_simple ?? existing?.chapter_name_simple ?? "",
    chapter_name_arabic:
      metadata?.chapter_name_arabic ?? existing?.chapter_name_arabic ?? "",
    verse_number: metadata?.verse_number ?? existing?.verse_number ?? 0,
    deleted: true,
    updated_at: Date.now(),
    sync: "pending",
  };

  setLocalMark(tombstone);
}

/**
 * Atomically update the marks map and serialize once to localStorage.
 */
export function updateLocalMarks(
  updater: (prev: LocalMarksMap) => LocalMarksMap
): void {
  ensureInitialized();
  const next = updater(marksSnapshot);
  persistMarks(next);
}

/**
 * Clear all local marks from the store.
 */
export function clearLocalMarks(): void {
  ensureInitialized();
  persistMarks({});
}

/**
 * Reconciles marks received from a server pull.
 * Invariants (ADR 0061):
 * - Pull returns a spot held pending -> ignored (unpushed intent is never lost).
 * - Pull returns a spot held synced -> overwritten with server truth.
 * - Spot held synced locally but absent from server full-sync -> removed (deleted remotely).
 */
export function applyServerPull(serverMarks: LocalMark[]): void {
  ensureInitialized();
  const next: LocalMarksMap = { ...marksSnapshot };
  let changed = false;
  const serverKeys = new Set<string>();

  for (const serverMark of serverMarks) {
    const key = markKey({
      marked_type: serverMark.marked_type,
      marked_id: serverMark.marked_id,
    });
    serverKeys.add(key);
    const local = next[key];

    // Invariant: Pull returns a spot held pending -> ignored
    if (local && local.sync === "pending") {
      continue;
    }

    next[key] = {
      ...serverMark,
      sync: "synced",
      deleted: false,
    };
    changed = true;
  }

  // Synced marks not returned by the server full-sync have been deleted remotely
  for (const [key, local] of Object.entries(next)) {
    if (local.sync === "synced" && !serverKeys.has(key)) {
      delete next[key];
      changed = true;
    }
  }

  if (changed) {
    persistMarks(next);
  }
}

/**
 * Set the owner stamp ("guest" | user id).
 * Invariant (ADR 0061):
 * - Changing from "guest" to a user id migrates marks via the sync push loop (does NOT clear).
 * - Changing between two different user IDs resets the store and clears all marks.
 */
export function setOwnerStamp(newOwner: OwnerStamp): void {
  ensureInitialized();
  if (ownerSnapshot === newOwner) return;

  const previousOwner = ownerSnapshot;
  ownerSnapshot = newOwner;

  try {
    storage.set("localMarksOwner", newOwner, { throwOnQuota: true });
  } catch (err) {
    ownerSnapshot = previousOwner;
    throw err;
  }

  // Invariant (ADR 0061):
  // - Moving from "guest" to a user ID migrates marks via the sync push loop (does NOT clear).
  // - Switching between two different registered user IDs resets the store and clears all marks.
  // - Sign-out preserves the store and never clears marks.
  if (previousOwner !== "guest" && newOwner !== "guest") {
    persistMarks({});
  } else {
    notifyListeners();
  }
}

/**
 * Reset module state for deterministic testing.
 */
export function _resetStoreForTesting(): void {
  marksSnapshot = {};
  ownerSnapshot = "guest";
  initialized = false;
  isPersisted = false;
  listeners.clear();
  if (typeof window !== "undefined") {
    window.removeEventListener("storage", onStorageEvent);
  }
}
