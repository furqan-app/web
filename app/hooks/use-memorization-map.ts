"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { MemorizationApiResponse } from "@/app/api/plans/memorization/route";
import type { BatchMemorizationUpdatePayload } from "@/app/api/plans/memorization/batch/route";
import {
  buildMemorizationMap,
  deriveGlobalMemorizationStats,
  type MemorizationMap,
  type UserMemorizationRecord,
} from "@/app/lib/plans/memorization-derivation";

const MEMORIZATION_QUERY_KEY = ["memorization-map"];

async function fetchMemorizationMap(): Promise<UserMemorizationRecord[]> {
  const res = await fetch("/api/plans/memorization");
  if (!res.ok) {
    throw new Error("Failed to fetch memorization map");
  }
  const json = (await res.json()) as {
    success?: boolean;
    code?: number;
    data?: MemorizationApiResponse;
    message?: string;
  };
  if (json.code === 401 || json.success === false) {
    throw new Error(json.message || "Failed to fetch memorization map");
  }
  return json.data?.records ?? [];
}

async function postBatchMemorization(payload: BatchMemorizationUpdatePayload): Promise<void> {
  const res = await fetch("/api/plans/memorization/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || "Failed to update memorization");
  }
}

export function useMemorizationMap() {
  const queryClient = useQueryClient();

  const {
    data: records = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: MEMORIZATION_QUERY_KEY,
    queryFn: fetchMemorizationMap,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: postBatchMemorization,
    onMutate: async (newUpdate: BatchMemorizationUpdatePayload) => {
      await queryClient.cancelQueries({ queryKey: MEMORIZATION_QUERY_KEY });
      const previousRecords = queryClient.getQueryData<UserMemorizationRecord[]>(MEMORIZATION_QUERY_KEY);

      queryClient.setQueryData<UserMemorizationRecord[]>(MEMORIZATION_QUERY_KEY, (old = []) => {
        const updateMap = new Map<number, "mastered" | "needs_review" | "unmemorized">();
        for (const u of newUpdate.updates) {
          updateMap.set(u.page_number, u.status);
        }

        const filtered = old.filter((r) => {
          if (r.chapter_id !== newUpdate.chapter_id) return true;
          const status = updateMap.get(r.page_number);
          if (status === undefined) return true;
          // Drop if unmemorized or being replaced
          return false;
        });

        for (const u of newUpdate.updates) {
          if (u.status === "mastered" || u.status === "needs_review") {
            filtered.push({
              chapter_id: newUpdate.chapter_id,
              page_number: u.page_number,
              status: u.status,
            });
          }
        }

        return filtered;
      });

      return { previousRecords };
    },
    onError: (_err, _newUpdate, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(MEMORIZATION_QUERY_KEY, context.previousRecords);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MEMORIZATION_QUERY_KEY });
    },
  });

  const memorizationMap: MemorizationMap = useMemo(
    () => buildMemorizationMap(records),
    [records]
  );

  const globalStats = useMemo(
    () => deriveGlobalMemorizationStats(memorizationMap),
    [memorizationMap]
  );

  return {
    records,
    memorizationMap,
    globalStats,
    isLoading,
    isError,
    error,
    refetch,
    updateBatch: mutation.mutate,
    updateBatchAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
