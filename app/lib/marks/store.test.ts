import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  getSnapshot,
  getServerSnapshot,
  getOwnerStamp,
  setOwnerStamp,
  getLocalMark,
  setLocalMark,
  removeLocalMark,
  tombstoneLocalMark,
  updateLocalMarks,
  clearLocalMarks,
  applyServerPull,
  persisted,
  requestPersistence,
  subscribe,
  _resetStoreForTesting,
  LocalMark,
} from "./store";
import { markKey } from "@/app/constants/marks";

class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

describe("Local marks store module (ADR 0061 / #546)", () => {
  let mockStorage: MockLocalStorage;
  let originalWindow: typeof globalThis.window;
  let originalNavigator: typeof globalThis.navigator;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    originalWindow = globalThis.window;
    originalNavigator = globalThis.navigator;

    // Provide browser-like window and storage globals in Node test environment
    const eventListeners = new Map<string, Set<(e: unknown) => void>>();

    const mockWindow = {
      localStorage: mockStorage,
      addEventListener: (type: string, listener: (e: unknown) => void) => {
        if (!eventListeners.has(type)) {
          eventListeners.set(type, new Set());
        }
        eventListeners.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: (e: unknown) => void) => {
        eventListeners.get(type)?.delete(listener);
      },
      dispatchEvent: (event: unknown) => {
        const type = (event as { type: string }).type;
        eventListeners.get(type)?.forEach((cb) => cb(event));
        return true;
      },
    };

    Object.defineProperty(globalThis, "window", {
      value: mockWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        storage: {
          persist: vi.fn().mockResolvedValue(true),
          persisted: vi.fn().mockResolvedValue(false),
        },
      },
      configurable: true,
      writable: true,
    });

    _resetStoreForTesting();
  });

  afterEach(() => {
    _resetStoreForTesting();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  const sampleMark: LocalMark = {
    marked_type: "word",
    marked_id: "2:255:1",
    page_number: 42,
    category: "forgetting",
    comment: "Review carefully",
    snippet: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
    chapter_name_simple: "Al-Baqarah",
    chapter_name_arabic: "البقرة",
    verse_number: 255,
    deleted: false,
    updated_at: 1700000000000,
    sync: "pending",
  };

  describe("Snapshot stability and SSR", () => {
    it("getSnapshot returns an identical object reference until a mutation occurs", () => {
      const snap1 = getSnapshot();
      const snap2 = getSnapshot();
      expect(snap1).toBe(snap2);

      setLocalMark(sampleMark);

      const snap3 = getSnapshot();
      expect(snap3).not.toBe(snap1);
      expect(snap3["word:2:255:1"]).toEqual(sampleMark);

      const snap4 = getSnapshot();
      expect(snap4).toBe(snap3);
    });

    it("getServerSnapshot returns an empty frozen map", () => {
      const serverSnap = getServerSnapshot();
      expect(serverSnap).toEqual({});
      expect(Object.isFrozen(serverSnap)).toBe(true);
    });
  });

  describe("Round-trip persistence and reload", () => {
    it("records round-trip through localStorage and survive a reload, tombstones included", () => {
      setLocalMark(sampleMark);
      tombstoneLocalMark("verse", "2:256", {
        page_number: 42,
        category: "similar",
        chapter_name_simple: "Al-Baqarah",
        chapter_name_arabic: "البقرة",
        verse_number: 256,
        snippet: "لَا إِكْرَاهَ فِي الدِّينِ",
      });

      // Verify records in local storage
      const rawStored = mockStorage.getItem("localMarks");
      expect(rawStored).toBeTruthy();
      const parsed = JSON.parse(rawStored!);
      expect(parsed["word:2:255:1"].category).toBe("forgetting");
      expect(parsed["verse:2:256"].deleted).toBe(true);
      expect(parsed["verse:2:256"].sync).toBe("pending");

      // Simulate a page reload by clearing in-memory store
      _resetStoreForTesting();

      // Read back
      const reloadedSnap = getSnapshot();
      expect(reloadedSnap["word:2:255:1"]).toEqual(sampleMark);
      expect(reloadedSnap["verse:2:256"].deleted).toBe(true);
      expect(reloadedSnap["verse:2:256"].sync).toBe("pending");

      expect(getLocalMark("word:2:255:1")).toEqual(sampleMark);
      expect(getLocalMark("word", "2:255:1")).toEqual(sampleMark);
      expect(getLocalMark("verse", "2:256")?.deleted).toBe(true);
    });
  });

  describe("Owner stamp handling", () => {
    it("defaults to guest owner stamp", () => {
      expect(getOwnerStamp()).toBe("guest");
    });

    it("an owner-stamp change to a different user id clears the map", () => {
      setOwnerStamp("user-1");
      setLocalMark(sampleMark);
      expect(Object.keys(getSnapshot()).length).toBe(1);

      // Change owner to a different user id
      setOwnerStamp("user-2");
      expect(getOwnerStamp()).toBe("user-2");
      expect(getSnapshot()).toEqual({});

      // Verify local storage is also cleared of marks and updated with new owner
      expect(mockStorage.getItem("localMarksOwner")).toBe(JSON.stringify("user-2"));
      expect(mockStorage.getItem("localMarks")).toBe(JSON.stringify({}));
    });

    it("an owner-stamp transition from guest to user does NOT clear the map (guest migration)", () => {
      expect(getOwnerStamp()).toBe("guest");
      setLocalMark(sampleMark);
      expect(Object.keys(getSnapshot()).length).toBe(1);

      // Sign in as user-1: re-stamps to user-1, preserves pending guest marks for push migration
      setOwnerStamp("user-1");
      expect(getOwnerStamp()).toBe("user-1");
      expect(getSnapshot()["word:2:255:1"]).toEqual(sampleMark);
      expect(mockStorage.getItem("localMarksOwner")).toBe(JSON.stringify("user-1"));
    });

    it("setting the same owner id is a no-op and does not clear marks", () => {
      setOwnerStamp("user-1");
      setLocalMark(sampleMark);
      setOwnerStamp("user-1");
      expect(getSnapshot()["word:2:255:1"]).toEqual(sampleMark);
    });

    it("transitioning from user to guest does NOT clear marks (sign-out rule)", () => {
      setOwnerStamp("user-1");
      setLocalMark(sampleMark);
      setOwnerStamp("guest");
      expect(getOwnerStamp()).toBe("guest");
      expect(getSnapshot()["word:2:255:1"]).toEqual(sampleMark);
    });

    it("rolls back owner stamp on QuotaExceededError", () => {
      setOwnerStamp("user-1");
      const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
      vi.spyOn(mockStorage, "setItem").mockImplementation(() => {
        throw quotaError;
      });

      expect(() => {
        setOwnerStamp("user-2");
      }).toThrow(quotaError);

      expect(getOwnerStamp()).toBe("user-1");
    });
  });

  describe("Storage persistence (navigator.storage.persist)", () => {
    it("requests persist() once and records persisted() state", async () => {
      expect(persisted()).toBe(false);

      const granted = await requestPersistence();
      expect(granted).toBe(true);
      expect(persisted()).toBe(true);
      expect(globalThis.navigator.storage.persist).toHaveBeenCalledTimes(1);

      // Calling again returns cached state without calling persist again
      const grantedAgain = await requestPersistence();
      expect(grantedAgain).toBe(true);
      expect(globalThis.navigator.storage.persist).toHaveBeenCalledTimes(1);
    });

    it("allows retrying requestPersistence if earlier attempt failed or returned false", async () => {
      vi.mocked(globalThis.navigator.storage.persist).mockResolvedValueOnce(false);

      const firstAttempt = await requestPersistence();
      expect(firstAttempt).toBe(false);
      expect(persisted()).toBe(false);

      // Second attempt succeeds
      vi.mocked(globalThis.navigator.storage.persist).mockResolvedValueOnce(true);
      const secondAttempt = await requestPersistence();
      expect(secondAttempt).toBe(true);
      expect(persisted()).toBe(true);
    });
  });

  describe("Sync transitions & pull rules", () => {
    it("pending survives a simulated pull; synced is overwritten", () => {
      // Local has a pending mark
      setLocalMark({
        ...sampleMark,
        category: "forgetting",
        sync: "pending",
      });

      // Local has a synced mark
      const syncedMark: LocalMark = {
        marked_type: "word",
        marked_id: "2:255:2",
        page_number: 42,
        category: "tajweed-error",
        comment: null,
        snippet: "اللَّهُ",
        chapter_name_simple: "Al-Baqarah",
        chapter_name_arabic: "البقرة",
        verse_number: 255,
        deleted: false,
        updated_at: 1690000000000,
        sync: "synced",
      };
      setLocalMark(syncedMark);

      // Server pull returns server data for both spots
      const serverMarks: LocalMark[] = [
        {
          ...sampleMark,
          category: "linking", // Server tries to overwrite pending spot
          sync: "synced",
        },
        {
          ...syncedMark,
          category: "other", // Server tries to overwrite synced spot
          sync: "synced",
        },
      ];

      applyServerPull(serverMarks);

      const snapshot = getSnapshot();

      // Invariant: pending spot is untouched (unpushed intent is never lost)
      expect(snapshot["word:2:255:1"].category).toBe("forgetting");
      expect(snapshot["word:2:255:1"].sync).toBe("pending");

      // Invariant: synced spot is overwritten by server pull
      expect(snapshot["word:2:255:2"].category).toBe("other");
      expect(snapshot["word:2:255:2"].sync).toBe("synced");
    });
  });

  describe("QuotaExceededError handling", () => {
    it("surfaces QuotaExceededError rather than silently dropping a write and reverts in-memory cache", () => {
      const snapBefore = getSnapshot();

      // Mock localStorage.setItem to throw QuotaExceededError
      const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
      vi.spyOn(mockStorage, "setItem").mockImplementation(() => {
        throw quotaError;
      });

      expect(() => {
        setLocalMark(sampleMark);
      }).toThrow(quotaError);

      // In-memory cache must not keep unpersisted mark
      expect(getSnapshot()).toEqual(snapBefore);
      expect(getLocalMark("word:2:255:1")).toBeUndefined();
    });
  });

  describe("Subscriptions and atomic operations", () => {
    it("notifies listeners on mutations and unsubscribes cleanly", () => {
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);

      setLocalMark(sampleMark);
      expect(listener).toHaveBeenCalledTimes(1);

      removeLocalMark(markKey({ marked_type: sampleMark.marked_type, marked_id: sampleMark.marked_id }));
      expect(listener).toHaveBeenCalledTimes(2);

      clearLocalMarks();
      expect(listener).toHaveBeenCalledTimes(3);

      unsubscribe();
      setLocalMark(sampleMark);
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("updateLocalMarks batches mutations and serializes once", () => {
      const spySetItem = vi.spyOn(mockStorage, "setItem");

      updateLocalMarks((prev) => ({
        ...prev,
        "word:1:1:1": { ...sampleMark, marked_id: "1:1:1" },
        "word:1:1:2": { ...sampleMark, marked_id: "1:1:2" },
      }));

      expect(spySetItem).toHaveBeenCalledTimes(1);
      expect(Object.keys(getSnapshot()).length).toBe(2);
    });

    it("handles cross-tab storage events and updates in-memory cache", () => {
      const listener = vi.fn();
      subscribe(listener);

      // Simulate external tab writing localMarks to storage
      const externalMarks = {
        "word:1:1:1": { ...sampleMark, marked_id: "1:1:1" },
      };
      mockStorage.setItem("localMarks", JSON.stringify(externalMarks));

      window.dispatchEvent({
        type: "storage",
        key: "localMarks",
      } as unknown as StorageEvent);

      expect(listener).toHaveBeenCalled();
      expect(getSnapshot()["word:1:1:1"]).toBeDefined();

      // Simulate external tab changing owner stamp
      mockStorage.setItem("localMarksOwner", JSON.stringify("external-user"));
      window.dispatchEvent({
        type: "storage",
        key: "localMarksOwner",
      } as unknown as StorageEvent);
      expect(getOwnerStamp()).toBe("external-user");

      // Simulate external tab clearing storage
      mockStorage.clear();
      window.dispatchEvent({
        type: "storage",
        key: null,
      } as unknown as StorageEvent);
      expect(getSnapshot()).toEqual({});
      expect(getOwnerStamp()).toBe("guest");
    });

    it("re-reads storage on first subscriber when storage was updated while unmounted", () => {
      // First subscriber unmounts
      const unsub = subscribe(() => {});
      unsub();

      // Another tab writes while Furqan has 0 active subscribers
      const externalMarks = {
        "word:2:2:2": { ...sampleMark, marked_id: "2:2:2" },
      };
      mockStorage.setItem("localMarks", JSON.stringify(externalMarks));
      mockStorage.setItem("localMarksOwner", JSON.stringify("new-user"));

      // New subscriber attaches
      subscribe(() => {});

      expect(getSnapshot()["word:2:2:2"]).toBeDefined();
      expect(getOwnerStamp()).toBe("new-user");
    });

    it("re-reads and clears storage on first subscriber when storage was cleared while unmounted", () => {
      setLocalMark(sampleMark);
      setOwnerStamp("user-1");

      const unsub = subscribe(() => {});
      unsub();

      mockStorage.clear();

      subscribe(() => {});

      expect(getSnapshot()).toEqual({});
      expect(getOwnerStamp()).toBe("guest");
    });
  });

  describe("storage.set options safety", () => {
    it("warns and does not throw on QuotaExceededError when throwOnQuota is omitted (protects existing callers)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
      vi.spyOn(mockStorage, "setItem").mockImplementation(() => {
        throw quotaError;
      });

      // storage.set without options does not throw
      const { storage } = await import("@/app/utils/storage");
      expect(() => {
        storage.set("theme", "dark");
      }).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
