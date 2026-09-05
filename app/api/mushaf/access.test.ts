import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertMark } from "./access";
import { appPrisma } from "@/app/utils/db";
import type { Mark } from "@/app/generated/app-client";

vi.mock("@/app/utils/db", () => {
  const mark = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };
  return {
    appPrisma: {
      mark,
      $transaction: vi.fn((callback: (tx: { mark: typeof mark }) => Promise<unknown>) =>
        callback({ mark })
      ),
    },
  };
});

describe("upsertMark stale-write guard (ADR 0061)", () => {
  const toUser = 1;
  const fromUser = 1;
  const page = 42;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when required fields are missing", async () => {
    const ok = await upsertMark(toUser, fromUser, page, {
      marked_type: "word",
      // missing marked_id and category
    });

    expect(ok).toBe(false);
    expect(appPrisma.mark.findUnique).not.toHaveBeenCalled();
    expect(appPrisma.mark.upsert).not.toHaveBeenCalled();
  });

  it("skips writing and returns true when existing client_updated_at is newer than incoming updated_at", async () => {
    const storedDate = new Date("2026-09-04T12:00:00.000Z");
    const incomingOlderDate = new Date("2026-09-04T10:00:00.000Z");

    vi.mocked(appPrisma.mark.findUnique).mockResolvedValueOnce({
      client_updated_at: storedDate,
    } as Pick<Mark, "client_updated_at"> as never);

    const ok = await upsertMark(toUser, fromUser, page, {
      marked_type: "word",
      marked_id: "2:255:1",
      category: "forgetting",
      updated_at: incomingOlderDate.getTime(),
    });

    expect(ok).toBe(true);
    expect(appPrisma.mark.findUnique).toHaveBeenCalledWith({
      where: {
        marked_type_marked_id_to_user: {
          to_user: toUser,
          marked_type: "word",
          marked_id: "2:255:1",
        },
      },
      select: { client_updated_at: true },
    });
    // Crucial: write is skipped
    expect(appPrisma.mark.upsert).not.toHaveBeenCalled();
  });

  it("skips writing and returns true when incoming updated_at is identical to stored client_updated_at (retry short-circuit)", async () => {
    const storedDate = new Date("2026-09-04T12:00:00.000Z");

    vi.mocked(appPrisma.mark.findUnique).mockResolvedValueOnce({
      client_updated_at: storedDate,
    } as Pick<Mark, "client_updated_at"> as never);

    const ok = await upsertMark(toUser, fromUser, page, {
      marked_type: "word",
      marked_id: "2:255:1",
      category: "forgetting",
      updated_at: storedDate.getTime(),
    });

    expect(ok).toBe(true);
    // Crucial: write is skipped on identical timestamp
    expect(appPrisma.mark.upsert).not.toHaveBeenCalled();
  });

  it("writes and returns true when incoming updated_at is newer than stored client_updated_at", async () => {
    const storedDate = new Date("2026-09-04T10:00:00.000Z");
    const incomingNewerDate = new Date("2026-09-04T12:00:00.000Z");

    vi.mocked(appPrisma.mark.findUnique).mockResolvedValueOnce({
      client_updated_at: storedDate,
    } as Pick<Mark, "client_updated_at"> as never);

    vi.mocked(appPrisma.mark.upsert).mockResolvedValueOnce({} as unknown as Mark);

    const ok = await upsertMark(toUser, fromUser, page, {
      marked_type: "word",
      marked_id: "2:255:1",
      category: "linking",
      comment: "Updated link",
      updated_at: incomingNewerDate.toISOString(),
    });

    expect(ok).toBe(true);
    expect(appPrisma.mark.upsert).toHaveBeenCalledWith({
      where: {
        marked_type_marked_id_to_user: {
          to_user: toUser,
          marked_type: "word",
          marked_id: "2:255:1",
        },
      },
      update: {
        from_user: fromUser,
        category: "linking",
        comment: "Updated link",
        client_updated_at: incomingNewerDate,
      },
      create: {
        page_number: page,
        marked_type: "word",
        marked_id: "2:255:1",
        category: "linking",
        comment: "Updated link",
        from_user: fromUser,
        to_user: toUser,
        client_updated_at: incomingNewerDate,
      },
    });
  });

  it("writes and returns true when stored client_updated_at is null (legacy row)", async () => {
    const incomingDate = new Date("2026-09-04T10:00:00.000Z");

    vi.mocked(appPrisma.mark.findUnique).mockResolvedValueOnce({
      client_updated_at: null,
    } as Pick<Mark, "client_updated_at"> as never);

    vi.mocked(appPrisma.mark.upsert).mockResolvedValueOnce({} as unknown as Mark);

    const ok = await upsertMark(toUser, fromUser, page, {
      marked_type: "verse",
      marked_id: "2:255",
      category: "similar",
      updated_at: incomingDate,
    });

    expect(ok).toBe(true);
    expect(appPrisma.mark.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          category: "similar",
          client_updated_at: incomingDate,
        }),
        create: expect.objectContaining({
          category: "similar",
          client_updated_at: incomingDate,
        }),
      })
    );
  });

  it("creates mark with client_updated_at when no existing row exists", async () => {
    const incomingDate = new Date("2026-09-04T15:00:00.000Z");

    vi.mocked(appPrisma.mark.findUnique).mockResolvedValueOnce(null);
    vi.mocked(appPrisma.mark.upsert).mockResolvedValueOnce({} as unknown as Mark);

    const ok = await upsertMark(toUser, fromUser, page, {
      marked_type: "word",
      marked_id: "1:1:1",
      category: "other",
      updated_at: incomingDate.getTime(),
    });

    expect(ok).toBe(true);
    expect(appPrisma.mark.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          page_number: page,
          marked_type: "word",
          marked_id: "1:1:1",
          category: "other",
          client_updated_at: incomingDate,
        }),
      })
    );
  });

  it("defaults to a fresh timestamp when updated_at is omitted (grant or web writes)", async () => {
    const pastDate = new Date("2020-01-01T00:00:00.000Z");

    vi.mocked(appPrisma.mark.findUnique).mockResolvedValueOnce({
      client_updated_at: pastDate,
    } as Pick<Mark, "client_updated_at"> as never);
    vi.mocked(appPrisma.mark.upsert).mockResolvedValueOnce({} as unknown as Mark);

    const beforeCall = Date.now();
    const ok = await upsertMark(toUser, fromUser, page, {
      marked_type: "word",
      marked_id: "1:1:1",
      category: "tajweed-error",
      // updated_at omitted
    });
    const afterCall = Date.now();

    expect(ok).toBe(true);
    expect(appPrisma.mark.upsert).toHaveBeenCalled();

    const callArg = vi.mocked(appPrisma.mark.upsert).mock.calls[0][0];
    const writtenDate = callArg.update.client_updated_at as Date;
    expect(writtenDate.getTime()).toBeGreaterThanOrEqual(beforeCall);
    expect(writtenDate.getTime()).toBeLessThanOrEqual(afterCall);
  });
});
