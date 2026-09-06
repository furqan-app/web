import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPageMarks, PageMark } from "../server/actions/getPageMarks";
import { getQueryClient } from "../utils/queryClient";
import {
  getOwnerSnapshot,
  getServerOwnerSnapshot,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/app/lib/marks/store";

export type UseMarksResult = {
  data: Record<string, PageMark> | undefined;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  reload: () => Promise<void>;
};

// A guest, and any record written before the author chain existed, has no
// server author id. PageMark requires the field, so it gets an explicit named
// sentinel rather than a bare 0 sitting unexplained at the use site. Such marks
// always read as the reader's own, so nothing renders an attribution for them.
const NO_SERVER_AUTHOR = 0;

// The grant reader must not observe the local store at all — subscribing it
// would re-render its panels on every unrelated self-mushaf mutation. Hooks
// still run unconditionally; only their arguments change.
const NEVER_SUBSCRIBE = () => () => {};

/**
 * Marks for one or more pages, keyed by `marked_id`.
 *
 * Takes a LIST of pages because `Mark.page_number` is always the DEFAULT
 * edition's page (a stable canonical key — marks must not move when the reader
 * switches edition), while the reader may be displaying another edition whose
 * page N spans two default-edition pages. On the 36 pages where the editions
 * disagree, reading only the displayed page number would hide some of the marks
 * actually on screen. See ADR 0033.
 *
 * Results are merged into one `marked_id` map, so extra marks from a neighbouring
 * page are harmless — lookups are by word location / verse key, never by page.
 *
 * Two sources, by design (ADR 0061):
 * - **Self mushaf** reads the LOCAL STORE, which is the read source of truth for
 *   the UI. No network, so marks render offline and for a guest.
 * - **`grantId` set** keeps the server fetch. Grant-scoped marks are never stored
 *   locally: ADR 0014's concurrent-viewer hazard under ADR 0012 last-author-wins
 *   is not superseded, so that reader stays online-only.
 */
export const useMarks = (
  pages: number[],
  grantId?: string,
): UseMarksResult => {
  const queryClient = getQueryClient();
  // Sorted so the key is stable regardless of the order pages were discovered.
  const pageKey = Array.from(new Set(pages)).sort((a, b) => a - b);
  // Memo key is the joined string, not the array: `MarkModal` passes a fresh
  // inline array every render, which would bust an identity-based memo and
  // rebuild the adapter output on every render for no reason.
  const pageKeyString = pageKey.join(",");

  // Subscribed unconditionally so hook order never depends on `grantId`. The
  // store's snapshots are reference-stable until a mutation, which is what keeps
  // this out of an infinite re-render loop.
  const localMarks = useSyncExternalStore(
    grantId ? NEVER_SUBSCRIBE : subscribe,
    grantId ? getServerSnapshot : getSnapshot,
    getServerSnapshot,
  );
  const owner = useSyncExternalStore(
    grantId ? NEVER_SUBSCRIBE : subscribe,
    grantId ? getServerOwnerSnapshot : getOwnerSnapshot,
    getServerOwnerSnapshot,
  );

  // Adapt LocalMark -> PageMark. Mapped here rather than inside `getSnapshot`,
  // which must keep returning one stable reference.
  const storeMarks = useMemo(() => {
    // Derived from the memo key itself, so the memo has no dependency the
    // linter can't see and cannot go stale against the page list.
    const pageSet = new Set(
      pageKeyString ? pageKeyString.split(",").map(Number) : [],
    );
    // A mark on your OWN mushaf is not necessarily yours: a grant holder can
    // write into it (ADR 0012), which is why the self marks endpoint always ran
    // `withAuthorNames`. So `is_own` is derived per mark by comparing the
    // record's author to the owner stamp — never hardcoded true, which silently
    // dropped "Marked by X" for a teacher's marks (caught by
    // `e2e/tests/shared-mushaf.spec.ts`).
    const viewerId = Number.parseInt(owner, 10);
    const marks: Record<string, PageMark> = {};

    for (const mark of Object.values(localMarks)) {
      // A tombstone is still pending its server ack, but it must already be gone
      // from the page — the delete has to look immediate.
      if (mark.deleted) continue;
      if (!pageSet.has(mark.page_number)) continue;

      // A record with no author predates the author chain, and a guest's own
      // marks have no server identity yet — both read as the reader's own.
      const isOwn =
        mark.from_user === undefined ||
        Number.isNaN(viewerId) ||
        mark.from_user === viewerId;

      marks[mark.marked_id] = {
        marked_id: mark.marked_id,
        category: mark.category,
        comment: mark.comment,
        from_user: mark.from_user ?? NO_SERVER_AUTHOR,
        // Only a foreign author has a name to show; QuranSafha gates on
        // `!is_own` anyway, so keep the two consistent.
        author_name: isOwn ? null : (mark.author_name ?? null),
        is_own: isOwn,
      };
    }

    return marks;
  }, [localMarks, owner, pageKeyString]);

  const queryKey = ["/marks", pageKeyString, grantId ?? "self"];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const results = await Promise.all(
        pageKey.map((page) => getPageMarks(page, grantId)),
      );
      return Object.assign({}, ...results) as Record<string, PageMark>;
    },
    // Self marks come from the store, so the fetch runs for the grant reader only.
    enabled: Boolean(grantId) && pageKey.length > 0,
    // Never go stale on its own — only an explicit reload()/invalidateQueries
    // call (elsewhere) should trigger a refetch. Combined with the default
    // refetchOnMount: true, this means mounting after an invalidation (e.g.
    // navigating here after adding a mark elsewhere) DOES refetch, while an
    // ordinary re-navigation with no mutation in between does not.
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });

  // Invalidate the whole "/marks" prefix, not just this page's key, so an
  // add/remove here also refreshes any other page's cache and the all-marks
  // list (/marks) — and vice versa, see useAllMarks. Meaningful for the grant
  // reader, which is still the one consumer backed by React Query; on the self
  // mushaf the store drives the reader and callers sync instead.
  const reload = () => queryClient.invalidateQueries({ queryKey: ["/marks"] });

  if (grantId) {
    return {
      data: query.data,
      isPending: query.isPending,
      isLoading: query.isLoading,
      isError: query.isError,
      isSuccess: query.isSuccess,
      error: query.error,
      reload,
    };
  }

  // The self path never runs the query, so its status flags are meaningless
  // here — spreading them would report `isPending: true` alongside real data.
  // Reading the store is synchronous, so the read is always already settled.
  return {
    data: storeMarks,
    isPending: false,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    reload,
  };
};
