import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  syncMarks,
  getSnapshot,
  getServerSnapshot,
  getPendingCount,
  subscribe,
  _resetSyncForTesting,
} from "./sync";
import {
  setLocalMark,
  getLocalMark,
  setOwnerStamp,
  getOwnerStamp,
  tombstoneLocalMark,
  _resetStoreForTesting,
  type LocalMark,
} from "./store";
import * as addPageMarkModule from "@/app/server/actions/addPageMark";
import * as deletePageMarkModule from "@/app/server/actions/deletePageMark";
import * as getPageMarksModule from "@/app/server/actions/getPageMarks";

const sampleMark: LocalMark = {
  marked_type: "word",
  marked_id: "2:255:1",
  page_number: 42,
  category: "forgetting",
  comment: "Review",
  snippet: "اللَّهُ",
  chapter_name_simple: "Al-Baqarah",
  chapter_name_arabic: "البقرة",
  verse_number: 255,
  deleted: false,
  updated_at: 1700000000000,
  sync: "pending",
};

describe("Marks sync engine (app/lib/marks/sync.ts)", () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};

    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    vi.stubGlobal("localStorage", storageMock);
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible",
    });
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: {
        persist: vi.fn().mockResolvedValue(true),
        persisted: vi.fn().mockResolvedValue(true),
      },
    });

    _resetStoreForTesting();
    _resetSyncForTesting();

    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("Snapshots & SSR", () => {
    it("returns stable snapshot reference until a change occurs", () => {
      const snap1 = getSnapshot();
      const snap2 = getSnapshot();
      expect(snap1).toBe(snap2);
      expect(snap1.status).toBe("idle");
      expect(snap1.pendingCount).toBe(0);
      expect(snap1.droppedMarks).toEqual([]);
    });

    it("returns frozen server snapshot with idle state", () => {
      const serverSnap = getServerSnapshot();
      expect(serverSnap.status).toBe("idle");
      expect(serverSnap.pendingCount).toBe(0);
      expect(serverSnap.droppedMarks).toEqual([]);
      expect(Object.isFrozen(serverSnap)).toBe(true);
    });
  });

  describe("Owner stamp gate & guest behavior", () => {
    it("does not push to server while owner stamp is 'guest'", async () => {
      const addSpy = vi.spyOn(addPageMarkModule, "addPageMark");
      const pullSpy = vi.spyOn(getPageMarksModule, "fetchAllMarks");

      setLocalMark({ ...sampleMark, sync: "pending" });
      expect(getOwnerStamp()).toBe("guest");
      expect(getPendingCount()).toBe(1);

      await syncMarks();

      expect(addSpy).not.toHaveBeenCalled();
      expect(pullSpy).not.toHaveBeenCalled();
      expect(getLocalMark("word:2:255:1")?.sync).toBe("pending");
      expect(getSnapshot().status).toBe("idle");
    });

    it("guest -> sign in as U migrates marks via ordinary push loop with no migration-specific code", async () => {
      setLocalMark({ ...sampleMark, sync: "pending" });

      const addSpy = vi
        .spyOn(addPageMarkModule, "addPageMark")
        .mockResolvedValueOnce({
          success: true,
          status: 200,
        } as never);

      const pullSpy = vi
        .spyOn(getPageMarksModule, "fetchAllMarks")
        .mockResolvedValueOnce({
          success: true,
          status: 200,
          code: 200,
          data: [
            {
              marked_type: sampleMark.marked_type,
              marked_id: sampleMark.marked_id,
              page_number: sampleMark.page_number,
              category: sampleMark.category,
              comment: sampleMark.comment,
              snippet: sampleMark.snippet,
              chapter_name_simple: sampleMark.chapter_name_simple,
              chapter_name_arabic: sampleMark.chapter_name_arabic,
              verse_number: sampleMark.verse_number,
            },
          ],
        });

      // User signs in as user-1
      setOwnerStamp("user-1");

      await syncMarks();

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          marked_id: "2:255:1",
          category: "forgetting",
          updated_at: sampleMark.updated_at,
        }),
        undefined,
        { detailed: true }
      );
      expect(pullSpy).toHaveBeenCalled();
      expect(getLocalMark("word:2:255:1")?.sync).toBe("synced");
      expect(getSnapshot().status).toBe("idle");
    });
  });

  describe("In-flight guard (deduplication)", () => {
    it("concurrent calls do not double-push", async () => {
      setOwnerStamp("user-1");
      setLocalMark({ ...sampleMark, sync: "pending" });

      let resolveAdd: (val: unknown) => void;
      const addPromise = new Promise((resolve) => {
        resolveAdd = resolve;
      });

      const addSpy = vi
        .spyOn(addPageMarkModule, "addPageMark")
        .mockImplementationOnce(() => addPromise as never);

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: true,
        status: 200,
        data: [],
      });

      // Launch two syncs concurrently
      const sync1 = syncMarks();
      const sync2 = syncMarks();

      expect(addSpy).toHaveBeenCalledTimes(1);

      resolveAdd!({ success: true, status: 200 });
      await Promise.all([sync1, sync2]);

      expect(addSpy).toHaveBeenCalledTimes(1);
    });

    it("in-flight local edit race condition: mark remains pending if edited while push is in flight", async () => {
      setOwnerStamp("user-1");
      setLocalMark({ ...sampleMark, sync: "pending", updated_at: 1000 });

      vi.spyOn(addPageMarkModule, "addPageMark").mockImplementationOnce(async () => {
        // While the push for the old version (1000) is awaiting network:
        // User modifies the mark locally!
        setLocalMark({
          ...sampleMark,
          category: "linking",
          updated_at: 2000,
          sync: "pending",
        });
        return { success: true, status: 200 } as never;
      }).mockImplementationOnce(async (data) => {
        // Second iteration pushes the newer version (2000)!
        expect((data as addPageMarkModule.AddMarkData).updated_at).toBe(2000);
        return { success: true, status: 200 } as never;
      });

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValue({
        success: true,
        status: 200,
        data: [
          {
            marked_type: sampleMark.marked_type,
            marked_id: sampleMark.marked_id,
            page_number: sampleMark.page_number,
            category: "linking",
            comment: sampleMark.comment,
            snippet: sampleMark.snippet,
            chapter_name_simple: sampleMark.chapter_name_simple,
            chapter_name_arabic: sampleMark.chapter_name_arabic,
            verse_number: sampleMark.verse_number,
          },
        ],
      });

      await syncMarks();

      // The newer version should now be synced
      const finalMark = getLocalMark("word:2:255:1");
      expect(finalMark?.category).toBe("linking");
      expect(finalMark?.sync).toBe("synced");
    });
  });

  describe("Push upsert & delete", () => {
    it("push upsert 2xx updates pending to synced", async () => {
      setOwnerStamp("user-1");
      setLocalMark({ ...sampleMark, sync: "pending" });

      vi.spyOn(addPageMarkModule, "addPageMark").mockResolvedValueOnce({
        success: true,
        status: 200,
      } as never);

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: true,
        status: 200,
        data: [
          {
            marked_type: sampleMark.marked_type,
            marked_id: sampleMark.marked_id,
            page_number: sampleMark.page_number,
            category: sampleMark.category,
            comment: sampleMark.comment,
            snippet: sampleMark.snippet,
            chapter_name_simple: sampleMark.chapter_name_simple,
            chapter_name_arabic: sampleMark.chapter_name_arabic,
            verse_number: sampleMark.verse_number,
          },
        ],
      });

      await syncMarks();

      expect(getLocalMark("word:2:255:1")?.sync).toBe("synced");
      expect(getSnapshot().pendingCount).toBe(0);
      expect(getSnapshot().lastSyncedAt).toBeTypeOf("number");
    });

    it("push delete 2xx drops tombstone from local store", async () => {
      setOwnerStamp("user-1");
      tombstoneLocalMark("word", "2:255:1", { page_number: 42 });

      expect(getLocalMark("word:2:255:1")?.deleted).toBe(true);
      expect(getLocalMark("word:2:255:1")?.sync).toBe("pending");

      const deleteSpy = vi
        .spyOn(deletePageMarkModule, "deletePageMark")
        .mockResolvedValueOnce({
          success: true,
          status: 200,
        } as never);

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: true,
        status: 200,
        data: [],
      });

      await syncMarks();

      expect(deleteSpy).toHaveBeenCalledWith(
        {
          marked_type: "word",
          marked_id: "2:255:1",
          page_number: 42,
        },
        undefined,
        { detailed: true }
      );
      expect(getLocalMark("word:2:255:1")).toBeUndefined();
    });
  });

  describe("HTTP 401 Handling", () => {
    it("401 stops run, leaves records pending, raises session-expired, never alters stamp", async () => {
      setOwnerStamp("user-1");
      setLocalMark({ ...sampleMark, sync: "pending" });

      vi.spyOn(addPageMarkModule, "addPageMark").mockResolvedValueOnce({
        success: false,
        status: 401,
        code: 401,
      } as never);

      const pullSpy = vi.spyOn(getPageMarksModule, "fetchAllMarks");

      await syncMarks();

      expect(pullSpy).not.toHaveBeenCalled();
      expect(getLocalMark("word:2:255:1")?.sync).toBe("pending");
      expect(getOwnerStamp()).toBe("user-1");
      expect(getSnapshot().status).toBe("session-expired");
      expect(getSnapshot().error).toBe("session-expired");
    });

    it("401 during pull stops run and raises session-expired", async () => {
      setOwnerStamp("user-1");
      // No pending marks, so push phase is skipped, pull phase runs
      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: false,
        status: 401,
        code: 401,
      });

      await syncMarks();

      expect(getSnapshot().status).toBe("session-expired");
      expect(getSnapshot().error).toBe("session-expired");
    });
  });

  describe("HTTP 422 Handling", () => {
    it("422 drops the invalid record, records it in droppedMarks, and continues with remaining pending marks", async () => {
      setOwnerStamp("user-1");

      const invalidMark: LocalMark = {
        ...sampleMark,
        marked_id: "invalid-spot",
        sync: "pending",
      };
      const validMark: LocalMark = {
        ...sampleMark,
        marked_id: "2:255:2",
        sync: "pending",
      };

      setLocalMark(invalidMark);
      setLocalMark(validMark);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.spyOn(addPageMarkModule, "addPageMark")
        .mockResolvedValueOnce({
          success: false,
          status: 422,
          code: 422,
          message: "Missing fields",
        } as never)
        .mockResolvedValueOnce({
          success: true,
          status: 200,
        } as never);

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: true,
        status: 200,
        data: [
          {
            marked_type: validMark.marked_type,
            marked_id: validMark.marked_id,
            page_number: validMark.page_number,
            category: validMark.category,
            comment: validMark.comment,
            snippet: validMark.snippet,
            chapter_name_simple: validMark.chapter_name_simple,
            chapter_name_arabic: validMark.chapter_name_arabic,
            verse_number: validMark.verse_number,
          },
        ],
      });

      await syncMarks();

      // Invalid mark was dropped
      expect(getLocalMark("word:invalid-spot")).toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();

      // Dropped mark was captured in snapshot for My Marks to surface
      expect(getSnapshot().droppedMarks).toEqual([
        expect.objectContaining({
          key: "word:invalid-spot",
          message: "Missing fields",
        }),
      ]);

      // Valid mark was synced
      expect(getLocalMark("word:2:255:2")?.sync).toBe("synced");
      expect(getSnapshot().status).toBe("idle");
    });
  });

  describe("Non-401/Non-422 Error Handling", () => {
    it("push 403/500/network error leaves records pending and halts run", async () => {
      setOwnerStamp("user-1");
      setLocalMark({ ...sampleMark, sync: "pending" });

      vi.spyOn(addPageMarkModule, "addPageMark").mockResolvedValueOnce({
        success: false,
        status: 403,
        message: "Forbidden",
      } as never);

      const pullSpy = vi.spyOn(getPageMarksModule, "fetchAllMarks");

      await syncMarks();

      expect(pullSpy).not.toHaveBeenCalled();
      expect(getLocalMark("word:2:255:1")?.sync).toBe("pending");
      expect(getSnapshot().status).toBe("error");
      expect(getSnapshot().error).toBe("Forbidden");
    });

    it("pull network error raises error status while preserving local state", async () => {
      setOwnerStamp("user-1");

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: false,
        status: 0,
      });

      await syncMarks();

      expect(getSnapshot().status).toBe("error");
    });
  });

  describe("Pull Reconciliation Rules", () => {
    it("pull overwrites synced spots and strictly ignores pending spots", async () => {
      setOwnerStamp("user-1");

      // Local has an already-synced mark
      setLocalMark({
        ...sampleMark,
        marked_id: "2:255:2",
        category: "tajweed-error",
        sync: "synced",
        updated_at: 1000,
      });

      // When pull is in-flight, simulate user marking a spot locally (sync: "pending")
      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockImplementationOnce(async () => {
        setLocalMark({
          ...sampleMark,
          marked_id: "2:255:1",
          category: "forgetting",
          sync: "pending",
          updated_at: 1000,
        });

        return {
          success: true,
          status: 200,
          data: [
            {
              marked_type: "word",
              marked_id: "2:255:1", // server tries to overwrite pending mark with "server-val"
              page_number: 42,
              category: "server-val",
              comment: null,
              snippet: "اللَّهُ",
              chapter_name_simple: "Al-Baqarah",
              chapter_name_arabic: "البقرة",
              verse_number: 255,
            },
            {
              marked_type: "word",
              marked_id: "2:255:2", // server tries to overwrite synced mark with "other"
              page_number: 42,
              category: "other",
              comment: null,
              snippet: "اللَّهُ",
              chapter_name_simple: "Al-Baqarah",
              chapter_name_arabic: "البقرة",
              verse_number: 255,
            },
          ],
        };
      });

      // Follow-up push for the new pending mark fails with network error, keeping it pending
      vi.spyOn(addPageMarkModule, "addPageMark").mockResolvedValueOnce({
        success: false,
        status: 0,
      } as never);

      await syncMarks();

      // Invariant: pending spot was protected against the pull overwrite!
      expect(getLocalMark("word:2:255:1")?.category).toBe("forgetting");
      expect(getLocalMark("word:2:255:1")?.sync).toBe("pending");

      // Invariant: synced spot was overwritten by the pull!
      expect(getLocalMark("word:2:255:2")?.category).toBe("other");
      expect(getLocalMark("word:2:255:2")?.sync).toBe("synced");
    });

    it("pull removes synced mark that was deleted on another device (absent from server pull)", async () => {
      setOwnerStamp("user-1");

      setLocalMark({
        ...sampleMark,
        marked_id: "2:255:2",
        sync: "synced",
      });

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: true,
        status: 200,
        data: [], // empty server marks
      });

      await syncMarks();

      expect(getLocalMark("word:2:255:2")).toBeUndefined();
    });
  });

  describe("Subscriptions and coordination", () => {
    it("notifies listeners on sync status transitions", async () => {
      setOwnerStamp("user-1");
      const listener = vi.fn();
      const unsub = subscribe(listener);

      vi.spyOn(getPageMarksModule, "fetchAllMarks").mockResolvedValueOnce({
        success: true,
        status: 200,
        data: [],
      });

      await syncMarks();

      expect(listener).toHaveBeenCalled();
      unsub();
    });
  });
});
